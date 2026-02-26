"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const store_1 = require("../store");
const aiService_1 = require("../aiService");
const websocket_1 = require("../websocket");
const router = (0, express_1.Router)();
// Rate limiter: max 30 incident submissions per minute per IP
const incidentLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many incident reports submitted. Please wait before trying again.' },
});
// GET /api/incidents – list all incidents (newest first)
router.get('/', (_req, res) => {
    const sorted = [...store_1.incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
});
// GET /api/incidents/:id – single incident
router.get('/:id', (req, res) => {
    const incident = store_1.incidents.find(i => i.id === req.params.id);
    if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
    }
    res.json(incident);
});
// POST /api/incidents – ingest a new incident (rate-limited)
router.post('/', incidentLimiter, (req, res) => {
    const body = req.body;
    if (!body.title || !body.description || !body.location || !body.reporterName) {
        res.status(400).json({ error: 'Missing required fields: title, description, location, reporterName' });
        return;
    }
    // Run AI cataloging
    const { type, severity, riskScore, aiSummary } = (0, aiService_1.catalogIncident)(body.title, body.description, body.type);
    const now = new Date().toISOString();
    const newIncident = {
        id: (0, uuid_1.v4)(),
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
    store_1.incidents.push(newIncident);
    // Broadcast real-time event
    (0, websocket_1.broadcast)({ event: 'new_incident', data: newIncident });
    // AUTO-ALERT: create first-responder alert for HIGH/CRITICAL incidents
    if (severity === 'HIGH' || severity === 'CRITICAL') {
        const alert = {
            id: (0, uuid_1.v4)(),
            incidentId: newIncident.id,
            incidentTitle: newIncident.title,
            type,
            severity,
            message: `${severity} ${type.toUpperCase()} incident reported: ${newIncident.title}. Location: ${newIncident.location}. Immediate response required.`,
            location: newIncident.location,
            status: 'active',
            createdAt: now,
        };
        store_1.alerts.push(alert);
        (0, websocket_1.broadcast)({ event: 'new_alert', data: alert });
    }
    res.status(201).json(newIncident);
});
// PUT /api/incidents/:id/status – update incident status
router.put('/:id/status', (req, res) => {
    const incident = store_1.incidents.find(i => i.id === req.params.id);
    if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
    }
    const { status } = req.body;
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        return;
    }
    incident.status = status;
    incident.updatedAt = new Date().toISOString();
    (0, websocket_1.broadcast)({ event: 'incident_updated', data: incident });
    res.json(incident);
});
exports.default = router;
