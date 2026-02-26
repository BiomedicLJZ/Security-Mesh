import { Router, Request, Response } from 'express';
import { alerts } from '../store';
import { broadcast } from '../websocket';

const router = Router();

// GET /api/alerts – list all alerts (newest first)
router.get('/', (_req: Request, res: Response) => {
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

// POST /api/alerts/:id/acknowledge – acknowledge a first-responder alert
router.post('/:id/acknowledge', (req: Request, res: Response) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  if (alert.status !== 'active') {
    res.status(400).json({ error: 'Alert is already acknowledged or resolved' });
    return;
  }

  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date().toISOString();

  broadcast({ event: 'alert_acknowledged', data: alert });
  res.json(alert);
});

export default router;
