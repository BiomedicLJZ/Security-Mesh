/**
 * Security Mesh AI Backend
 * Entry point – sets up Express REST API + WebSocket server.
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { initWebSocket } from './websocket';

// Route handlers
import incidentRoutes  from './routes/incidents';
import alertRoutes     from './routes/alerts';
import nodeRoutes      from './routes/nodes';
import dashboardRoutes from './routes/dashboard';

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logger (handy for students to see API calls)
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// ─── REST Routes ───────────────────────────────────────────────────────────────
app.use('/api/incidents',  incidentRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/nodes',      nodeRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'security-mesh-backend', timestamp: new Date().toISOString() });
});

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────
const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`\n🛡️  Security Mesh Backend running on http://localhost:${PORT}`);
  console.log(`🔌  WebSocket available at ws://localhost:${PORT}`);
  console.log(`📡  API docs: GET /api/incidents | /api/alerts | /api/nodes | /api/dashboard/stats\n`);
});
