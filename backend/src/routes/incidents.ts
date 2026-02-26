import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { incidents, alerts } from '../store';
import { catalogIncident } from '../aiService';
import { broadcast } from '../websocket';
import { Incident, Alert, CreateIncidentPayload } from '../models';

const router = Router();

// Rate limiter: max 30 incident submissions per minute per IP
const incidentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many incident reports submitted. Please wait before trying again.' },
});

// GET /api/incidents – list all incidents (newest first)
router.get('/', (_req: Request, res: Response) => {
  const sorted = [...incidents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

// GET /api/incidents/:id – single incident
router.get('/:id', (req: Request, res: Response) => {
  const incident = incidents.find(i => i.id === req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  res.json(incident);
});

// POST /api/incidents – ingest a new incident (rate-limited)
router.post('/', incidentLimiter, (req: Request, res: Response) => {
  const body = req.body as CreateIncidentPayload;

  if (!body.title || !body.description || !body.location || !body.reporterName) {
    res.status(400).json({ error: 'Missing required fields: title, description, location, reporterName' });
    return;
  }

  // Run AI cataloging
  const { type, severity, riskScore, aiSummary } = catalogIncident(
    body.title,
    body.description,
    body.type
  );

  const now = new Date().toISOString();
  const newIncident: Incident = {
    id: uuidv4(),
    title: body.title,
    description: body.description,
    location: body.location,
    reporterName: body.reporterName,
    type,
    severity,
    status: 'open',
    aiSummary,
    riskScore,
    createdAt: now,
    updatedAt: now,
  };

  incidents.push(newIncident);

  // Broadcast real-time event
  broadcast({ event: 'new_incident', data: newIncident });

  // AUTO-ALERT: create first-responder alert for HIGH/CRITICAL incidents
  if (severity === 'HIGH' || severity === 'CRITICAL') {
    const alert: Alert = {
      id: uuidv4(),
      incidentId: newIncident.id,
      incidentTitle: newIncident.title,
      type,
      severity,
      message: `${severity} ${type.toUpperCase()} incident reported: ${newIncident.title}. Location: ${newIncident.location}. Immediate response required.`,
      location: newIncident.location,
      status: 'active',
      createdAt: now,
    };
    alerts.push(alert);
    broadcast({ event: 'new_alert', data: alert });
  }

  res.status(201).json(newIncident);
});

// PUT /api/incidents/:id/status – update incident status
router.put('/:id/status', (req: Request, res: Response) => {
  const incident = incidents.find(i => i.id === req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }

  const { status } = req.body as { status: string };
  const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  incident.status = status as Incident['status'];
  incident.updatedAt = new Date().toISOString();

  broadcast({ event: 'incident_updated', data: incident });
  res.json(incident);
});

export default router;
