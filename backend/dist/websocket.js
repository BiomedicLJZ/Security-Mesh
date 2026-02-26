"use strict";
/**
 * WebSocket server for real-time event broadcasting.
 * All connected clients receive incident and alert updates instantly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.broadcast = broadcast;
const ws_1 = require("ws");
let wss;
/** Initialize the WebSocket server attached to an existing HTTP server */
function initWebSocket(server) {
    wss = new ws_1.WebSocketServer({ server });
    wss.on('connection', (ws) => {
        console.log('[WS] Client connected. Total:', wss.clients.size);
        // Send a welcome ping
        ws.send(JSON.stringify({ event: 'connected', data: { message: 'Security Mesh WebSocket active' } }));
        ws.on('close', () => {
            console.log('[WS] Client disconnected. Total:', wss.clients.size);
        });
        ws.on('error', (err) => {
            console.error('[WS] Error:', err.message);
        });
    });
    console.log('[WS] WebSocket server initialized');
}
/** Broadcast a message to all connected WebSocket clients */
function broadcast(message) {
    if (!wss)
        return;
    const payload = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(payload);
        }
    });
}
