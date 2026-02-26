/**
 * WebSocket server for real-time event broadcasting.
 * All connected clients receive incident and alert updates instantly.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { WsMessage } from './models';

let wss: WebSocketServer;

/** Initialize the WebSocket server attached to an existing HTTP server */
export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
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
export function broadcast(message: WsMessage): void {
  if (!wss) return;
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
