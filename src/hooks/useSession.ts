import { useCallback, useRef, useEffect, useState } from 'react';
import { useStore, suppressSync } from '../store/store';
import { getSession } from '../api/client';
import type { SessionEvent } from '../api/types';

const POLL_INTERVAL = 5000;

export function useSessionPolling() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [eventLog, setEventLog] = useState<SessionEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenCountRef = useRef(0);

  const poll = useCallback(async () => {
    const { sessionCode, hostToken, loadPlayers, loadGroups, setSessionName, setTableCount } = useStore.getState();
    if (!sessionCode || !hostToken) return;

    try {
      const data = await getSession(sessionCode, hostToken);
      suppressSync(() => {
        if (data.nextPlayerId != null) loadPlayers(data.players, data.nextPlayerId);
        if (data.groups && data.nextGroupId != null) loadGroups(data.groups, data.nextGroupId);
        if (data.solution) {
          useStore.getState().setSolution(data.solution);
        }
        setSessionName(data.name);
        if (data.tableCount != null) setTableCount(data.tableCount);
      });

      if (data.eventLog) {
        setEventLog(data.eventLog);
        setUnreadCount(Math.max(0, data.eventLog.length - seenCountRef.current));
      }
    } catch (err) {
      console.error('Poll failed:', err);
    }
  }, []);

  const markRead = useCallback(() => {
    seenCountRef.current = eventLog.length;
    setUnreadCount(0);
  }, [eventLog.length]);

  useEffect(() => {
    const { sessionCode, hostToken } = useStore.getState();
    if (!sessionCode || !hostToken) return;

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  return { poll, eventLog, unreadCount, markRead };
}
