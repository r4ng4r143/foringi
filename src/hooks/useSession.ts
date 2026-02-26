import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/store';
import { getSession } from '../api/client';

const POLL_INTERVAL = 5000;

export function useSessionPolling() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const { sessionCode, hostToken, loadPlayers, loadGroups, setSessionName, setTableCount } = useStore.getState();
    if (!sessionCode || !hostToken) return;

    try {
      const data = await getSession(sessionCode, hostToken);
      loadPlayers(data.players, data.nextPlayerId);
      loadGroups(data.groups, data.nextGroupId);
      setSessionName(data.name);
      setTableCount(data.tableCount);
      if (data.solution) {
        useStore.getState().setSolution(data.solution);
      }
    } catch (err) {
      console.error('Poll failed:', err);
    }
  }, []);

  useEffect(() => {
    const { sessionCode, hostToken } = useStore.getState();
    if (!sessionCode || !hostToken) return;

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  return { poll };
}
