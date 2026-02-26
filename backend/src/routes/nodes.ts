import { Router, Request, Response } from 'express';
import { nodes } from '../store';

const router = Router();

// GET /api/nodes – list all mesh nodes
router.get('/', (_req: Request, res: Response) => {
  // Refresh "lastSeen" for ONLINE nodes to simulate live network
  nodes.forEach(node => {
    if (node.status === 'ONLINE') {
      node.lastSeen = new Date().toISOString();
    }
  });
  res.json(nodes);
});

export default router;
