import { describe, it, expect } from 'vitest';
import { runSearch } from '../agent';
import type { PlayerData, GroupData } from '../types';

function makePlayerData(id: number, powers: number[], blacklist: number[] = []): PlayerData {
  return { id, name: `P${id}`, powers, blacklist };
}

describe('runSearch', () => {
  describe('A* agent', () => {
    it('seats 8 players into pods', () => {
      const players = Array.from({ length: 8 }, (_, i) => makePlayerData(i, [3]));
      const solutions = runSearch(players, 'astar');
      expect(solutions.length).toBeGreaterThan(0);
      const seated = solutions[0].seatings.flat();
      // ceil(8*0.1)=1 max unseated, so at least 7 seated
      expect(seated.length).toBeGreaterThanOrEqual(7);
    });

    it('seats 12 players with most seated', () => {
      const players = Array.from({ length: 12 }, (_, i) => makePlayerData(i, [3]));
      const solutions = runSearch(players, 'astar');
      expect(solutions.length).toBeGreaterThan(0);
      const seated = solutions[0].seatings.flat();
      // ceil(12*0.1)=2 max unseated, so at least 10 seated
      expect(seated.length).toBeGreaterThanOrEqual(10);
    });

    it('groups same-power players together', () => {
      const players = [
        makePlayerData(0, [1]),
        makePlayerData(1, [1]),
        makePlayerData(2, [1]),
        makePlayerData(3, [1]),
        makePlayerData(4, [5]),
        makePlayerData(5, [5]),
        makePlayerData(6, [5]),
        makePlayerData(7, [5]),
      ];
      const solutions = runSearch(players, 'astar');
      expect(solutions.length).toBeGreaterThan(0);
      const s = solutions[0].seatings;
      // Each pod should have players of the same power level
      for (const pod of s) {
        if (pod.length === 0) continue;
        const powers = pod.map(id => players[id].powers[0]);
        const allSame = powers.every(p => p === powers[0]);
        expect(allSame).toBe(true);
      }
    });

    it('respects blacklists when possible', () => {
      const players = [
        makePlayerData(0, [3], [1]),
        makePlayerData(1, [3], [0]),
        makePlayerData(2, [3]),
        makePlayerData(3, [3]),
        makePlayerData(4, [3]),
        makePlayerData(5, [3]),
        makePlayerData(6, [3]),
        makePlayerData(7, [3]),
      ];
      const solutions = runSearch(players, 'astar');
      expect(solutions.length).toBeGreaterThan(0);
      const s = solutions[0].seatings;
      // Players 0 and 1 should not be in the same pod
      for (const pod of s) {
        expect(pod.includes(0) && pod.includes(1)).toBe(false);
      }
    });

    it('handles groups: locked pod of 4', () => {
      const players = Array.from({ length: 8 }, (_, i) => makePlayerData(i, [3]));
      const groups: GroupData[] = [{ id: 0, name: 'G1', memberIds: [0, 1, 2, 3] }];
      const solutions = runSearch(players, 'astar', {}, {}, groups);
      expect(solutions.length).toBeGreaterThan(0);
      // The locked group should appear as a pod
      const hasPod = solutions[0].seatings.some(pod =>
        [0, 1, 2, 3].every(id => pod.includes(id))
      );
      expect(hasPod).toBe(true);
    });

    it('handles groups: partial group of 2', () => {
      const players = Array.from({ length: 6 }, (_, i) => makePlayerData(i, [3]));
      const groups: GroupData[] = [{ id: 0, name: 'G1', memberIds: [0, 1] }];
      const solutions = runSearch(players, 'astar', {}, {}, groups);
      expect(solutions.length).toBeGreaterThan(0);
      // Players 0 and 1 should be in the same pod
      const samePod = solutions[0].seatings.some(pod =>
        pod.includes(0) && pod.includes(1)
      );
      expect(samePod).toBe(true);
    });

    it('returns a score with each solution', () => {
      const players = Array.from({ length: 4 }, (_, i) => makePlayerData(i, [3]));
      const solutions = runSearch(players, 'astar');
      expect(solutions.length).toBeGreaterThan(0);
      expect(typeof solutions[0].score).toBe('number');
      expect(solutions[0].score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Random agent', () => {
    it('produces at least one solution', () => {
      const players = Array.from({ length: 8 }, (_, i) => makePlayerData(i, [3]));
      const solutions = runSearch(players, 'random');
      expect(solutions.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('0 players returns empty solution', () => {
      const solutions = runSearch([], 'astar');
      // With 0 players, agent may return nothing or an empty solution
      if (solutions.length > 0) {
        expect(solutions[0].seatings.flat().length).toBe(0);
      }
    });

    it('1 player produces a solution via fallback', () => {
      const solutions = runSearch([makePlayerData(0, [3])], 'astar');
      expect(solutions.length).toBeGreaterThan(0);
    });

    it('all players blacklist each other still produces output', () => {
      const players = [
        makePlayerData(0, [3], [1, 2, 3]),
        makePlayerData(1, [3], [0, 2, 3]),
        makePlayerData(2, [3], [0, 1, 3]),
        makePlayerData(3, [3], [0, 1, 2]),
      ];
      const solutions = runSearch(players, 'astar');
      expect(solutions.length).toBeGreaterThan(0);
    });

    it('multi-bracket players are handled', () => {
      const players = Array.from({ length: 8 }, (_, i) =>
        makePlayerData(i, i % 2 === 0 ? [2, 3] : [3, 4])
      );
      const solutions = runSearch(players, 'astar');
      expect(solutions.length).toBeGreaterThan(0);
      const seated = solutions[0].seatings.flat();
      expect(seated.length).toBeGreaterThanOrEqual(7);
    });
  });
});
