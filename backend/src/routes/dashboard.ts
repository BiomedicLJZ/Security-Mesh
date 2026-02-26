import { Router, Request, Response } from 'express';
import { incidents, alerts, nodes } from '../store';

const router = Router();

// GET /api/dashboard/stats – aggregated summary for the dashboard
router.get('/stats', (_req: Request, res: Response) => {
  const totalIncidents = incidents.length;
  const activeAlerts   = alerts.filter(a => a.status === 'active').length;
  const nodesOnline    = nodes.filter(n => n.status === 'ONLINE').length;
  const avgRiskScore   = incidents.length > 0
    ? Math.round(incidents.reduce((sum, i) => sum + i.riskScore, 0) / incidents.length)
    : 0;

  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL').length;
  const highCount     = incidents.filter(i => i.severity === 'HIGH').length;
  const openCount     = incidents.filter(i => i.status === 'open').length;

  // Recent activity: last 5 incidents
  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  res.json({
    totalIncidents,
    activeAlerts,
    nodesOnline,
    totalNodes: nodes.length,
    avgRiskScore,
    criticalCount,
    highCount,
    openCount,
    recentIncidents,
  });
});

export default router;
