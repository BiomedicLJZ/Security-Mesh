"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const router = (0, express_1.Router)();
// GET /api/dashboard/stats – aggregated summary for the dashboard
router.get('/stats', (_req, res) => {
    const totalIncidents = store_1.incidents.length;
    const activeAlerts = store_1.alerts.filter(a => a.status === 'active').length;
    const nodesOnline = store_1.nodes.filter(n => n.status === 'ONLINE').length;
    const avgRiskScore = store_1.incidents.length > 0
        ? Math.round(store_1.incidents.reduce((sum, i) => sum + i.riskScore, 0) / store_1.incidents.length)
        : 0;
    const criticalCount = store_1.incidents.filter(i => i.severity === 'CRITICAL').length;
    const highCount = store_1.incidents.filter(i => i.severity === 'HIGH').length;
    const openCount = store_1.incidents.filter(i => i.status === 'open').length;
    // Recent activity: last 5 incidents
    const recentIncidents = [...store_1.incidents]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    res.json({
        totalIncidents,
        activeAlerts,
        nodesOnline,
        totalNodes: store_1.nodes.length,
        avgRiskScore,
        criticalCount,
        highCount,
        openCount,
        recentIncidents,
    });
});
exports.default = router;
