import { runSearch } from '../engine/agent';
import type { PlayerData, GroupData, PlayHistory, HeuristicWeights, SearchProgress, SolutionData } from '../engine/types';

export interface SearchRequest {
  players: PlayerData[];
  agentType: 'astar' | 'random';
  playHistory?: PlayHistory;
  weights?: Partial<HeuristicWeights>;
  groups?: GroupData[];
}

export interface SearchMessage {
  type: 'progress' | 'complete' | 'error';
  progress?: SearchProgress;
  solutions?: SolutionData[];
  error?: string;
}

self.onmessage = (e: MessageEvent<SearchRequest>) => {
  try {
    const { players, agentType, playHistory, weights, groups } = e.data;

    const onProgress = (progress: SearchProgress) => {
      try {
        (self as unknown as Worker).postMessage({ type: 'progress', progress } satisfies SearchMessage);
      } catch { /* worker terminated mid-search */ }
    };

    const solutions = runSearch(players, agentType, playHistory ?? {}, weights ?? {}, groups ?? [], onProgress);

    (self as unknown as Worker).postMessage({ type: 'complete', solutions } satisfies SearchMessage);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    } satisfies SearchMessage);
  }
};
