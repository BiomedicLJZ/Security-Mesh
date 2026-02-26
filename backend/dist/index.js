"use strict";
/**
 * Security Mesh AI Backend
 * Entry point – sets up Express REST API + WebSocket server.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const websocket_1 = require("./websocket");
// Route handlers
const incidents_1 = __importDefault(require("./routes/incidents"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const nodes_1 = __importDefault(require("./routes/nodes"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ─── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request logger (handy for students to see API calls)
app.use((req, _res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
});
// ─── REST Routes ───────────────────────────────────────────────────────────────
app.use('/api/incidents', incidents_1.default);
app.use('/api/alerts', alerts_1.default);
app.use('/api/nodes', nodes_1.default);
app.use('/api/dashboard', dashboard_1.default);
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'security-mesh-backend', timestamp: new Date().toISOString() });
});
// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────
const server = http_1.default.createServer(app);
(0, websocket_1.initWebSocket)(server);
server.listen(PORT, () => {
    console.log(`\n🛡️  Security Mesh Backend running on http://localhost:${PORT}`);
    console.log(`🔌  WebSocket available at ws://localhost:${PORT}`);
    console.log(`📡  API docs: GET /api/incidents | /api/alerts | /api/nodes | /api/dashboard/stats\n`);
});
