import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, suppressSync } from '../store/store';
import type { SessionEvent } from '../api/types';
import { getSession } from '../api/client';

const RECONNECT_DELAYS = [1000, 2000, 4000, 10000];
const SYNC_DEBOUNCE_MS = 200;
const FALLBACK_POLL_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

let _ws: WebSocket | null = null;

export function sendWsMessage(msg: object): void {
  if (_ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify(msg));
  }
}

export function useWebSocket(code: string, hostToken: string | null) {
  const [connected, setConnected] = useState(false);
  const [eventLog, setEventLog] = useState<SessionEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenCountRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suppressWsSyncRef = useRef(false);

  const isHost = hostToken !== null;

  const markRead = useCallback(() => {
    seenCountRef.current = eventLog.length;
    setUnreadCount(0);
  }, [eventLog.length]);

  const leave = useCallback((playerIds: number[]) => {
    sendWsMessage({ type: 'leave', playerIds });
  }, []);

  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;

      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const tokenParam = hostToken ? `?token=${encodeURIComponent(hostToken)}` : '';
      const url = `${proto}//${location.host}/api/session/${code}/ws${tokenParam}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;
      _ws = ws;

      ws.onopen = () => {
        if (disposed) { ws.close(); return; }
        setConnected(true);
        attemptRef.current = 0;
        stopFallbackPolling();
      };

      ws.onmessage = (ev) => {
        if (disposed) return;
        let msg: { type: string; [key: string]: unknown };
        try { msg = JSON.parse(ev.data); } catch { return; }

        if (msg.type === 'state') {
          applyState(msg, isHost);
          if (msg.eventLog && Array.isArray(msg.eventLog)) {
            const log = msg.eventLog as SessionEvent[];
            setEventLog(log);
            setUnreadCount(Math.max(0, log.length - seenCountRef.current));
          }
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setConnected(false);
        wsRef.current = null;
        if (_ws === ws) _ws = null;

        if (attemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAYS[Math.min(attemptRef.current, RECONNECT_DELAYS.length - 1)];
          attemptRef.current++;
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          startFallbackPolling();
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function applyState(msg: Record<string, unknown>, host: boolean) {
      suppressWsSyncRef.current = true;
      suppressSync(() => {
        const store = useStore.getState();
        if (host) {
          if (msg.players && msg.nextPlayerId != null) {
            store.loadPlayers(
              msg.players as Record<number, import('../engine/types').PlayerData>,
              msg.nextPlayerId as number,
            );
          }
          if (msg.groups && msg.nextGroupId != null) {
            store.loadGroups(
              msg.groups as Record<number, import('../engine/types').GroupData>,
              msg.nextGroupId as number,
            );
          }
          if (msg.solution !== undefined) {
            if (msg.solution) {
              store.setSolution(msg.solution as import('../engine/types').SolutionData);
            } else {
              store.clearSolution();
            }
          }
          if (typeof msg.name === 'string') store.setSessionName(msg.name);
          if (typeof msg.tableCount === 'number') store.setTableCount(msg.tableCount);
        } else {
          if (msg.players) {
            useStore.setState({ players: msg.players as Record<number, import('../engine/types').PlayerData> });
          }
          if (msg.solution !== undefined) {
            useStore.setState({
              solution: msg.solution as import('../engine/types').SolutionData | null,
            });
          }
        }
      });
      queueMicrotask(() => { suppressWsSyncRef.current = false; });
    }

    function startFallbackPolling() {
      if (fallbackRef.current) return;
      fallbackRef.current = setInterval(async () => {
        try {
          if (isHost && hostToken) {
            const data = await getSession(code, hostToken);
            applyState(data as unknown as Record<string, unknown>, true);
            if (data.eventLog) {
              setEventLog(data.eventLog);
              setUnreadCount(Math.max(0, data.eventLog.length - seenCountRef.current));
            }
          } else {
            const data = await getSession(code);
            applyState(data as unknown as Record<string, unknown>, false);
          }
        } catch { /* network error, retry next interval */ }
      }, FALLBACK_POLL_MS);
    }

    function stopFallbackPolling() {
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current);
        fallbackRef.current = null;
      }
    }

    connect();

    let hostUnsub: (() => void) | undefined;
    if (isHost) {
      hostUnsub = useStore.subscribe((state, prev) => {
        const changed =
          state.players !== prev.players ||
          state.groups !== prev.groups ||
          state.solution !== prev.solution;
        if (!changed || suppressWsSyncRef.current) return;

        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          const s = useStore.getState();
          sendWsMessage({
            type: 'sync',
            players: s.players,
            nextPlayerId: s.nextPlayerId,
            groups: s.groups,
            nextGroupId: s.nextGroupId,
            solution: s.solution,
          });
        }, SYNC_DEBOUNCE_MS);
      });
    }

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      stopFallbackPolling();
      hostUnsub?.();
      if (wsRef.current) {
        wsRef.current.close();
        if (_ws === wsRef.current) _ws = null;
        wsRef.current = null;
      }
    };
  }, [code, hostToken, isHost]);

  return { connected, eventLog, unreadCount, markRead, leave };
}
