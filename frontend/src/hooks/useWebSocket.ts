import { useEffect, useRef, useCallback } from 'react';
import { WsMessage } from '../types';

type MessageHandler = (msg: WsMessage) => void;

/**
 * Custom hook that maintains a WebSocket connection to the backend.
 * Automatically reconnects on disconnect with exponential backoff.
 */
export function useWebSocket(onMessage: MessageHandler): void {
  const wsRef        = useRef<WebSocket | null>(null);
  const handlerRef   = useRef<MessageHandler>(onMessage);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay   = useRef(1000);

  // Keep handler ref fresh without re-connecting
  handlerRef.current = onMessage;

  const connect = useCallback(() => {
    const wsUrl = `ws://${window.location.hostname}:3001`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to Security Mesh backend');
      retryDelay.current = 1000; // reset backoff on success
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        handlerRef.current(msg);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log(`[WS] Disconnected. Retrying in ${retryDelay.current}ms`);
      retryTimeout.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000);
        connect();
      }, retryDelay.current);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
