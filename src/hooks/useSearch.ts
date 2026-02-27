import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/store';
import type { SearchMessage, SearchRequest } from '../workers/search.worker';
import type { SearchProgress } from '../engine/types';
import { sendWsMessage } from './useWebSocket';

const emptyProgress: SearchProgress = {
  nodesExpanded: 0, nodesGenerated: 0, nodesSkipped: 0,
  goalsFound: 0, bestScore: Infinity, progressPercent: 0,
};

export function useSearch() {
  const workerRef = useRef<Worker | null>(null);

  const startSearch = useCallback((agentType: 'astar' | 'random') => {
    const { players, groups, tableCount, setSearching, setSearchProgress, setSolution } = useStore.getState();

    const playerList = Object.values(players);
    if (playerList.length === 0) return;

    workerRef.current?.terminate();

    setSearching(true);
    setSearchProgress(emptyProgress);

    const worker = new Worker(
      new URL('../workers/search.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    const request: SearchRequest = {
      players: playerList,
      agentType,
      groups: Object.values(groups),
      maxTables: tableCount,
    };

    worker.onmessage = (e: MessageEvent<SearchMessage>) => {
      const msg = e.data;
      if (msg.type === 'progress' && msg.progress) {
        setSearchProgress(msg.progress);
      } else if (msg.type === 'complete') {
        setSearching(false);
        setSearchProgress({ ...emptyProgress, progressPercent: 100 });
        if (msg.solutions && msg.solutions.length > 0) {
          const best = msg.solutions[0];
          setSolution(best);
          sendWsMessage({ type: 'solution', seatings: best.seatings, score: best.score ?? 0 });
        }
        worker.terminate();
      } else if (msg.type === 'error') {
        console.error('Search worker error:', msg.error);
        setSearching(false);
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      setSearching(false);
      worker.terminate();
    };

    worker.postMessage(request);
  }, []);

  const cancelSearch = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    useStore.getState().setSearching(false);
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return { startSearch, cancelSearch };
}
