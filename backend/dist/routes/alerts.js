"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const websocket_1 = require("../websocket");
const router = (0, express_1.Router)();
// GET /api/alerts – list all alerts (newest first)
router.get('/', (_req, res) => {
    const sorted = [...store_1.alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
});
// POST /api/alerts/:id/acknowledge – acknowledge a first-responder alert
router.post('/:id/acknowledge', (req, res) => {
    const alert = store_1.alerts.find(a => a.id === req.params.id);
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
    (0, websocket_1.broadcast)({ event: 'alert_acknowledged', data: alert });
    res.json(alert);
});
exports.default = router;
