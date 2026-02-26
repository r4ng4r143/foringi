import { describe, it, expect } from 'vitest';
import { Heuristic } from '../heuristic';
import { Player, Table, State, DEFAULT_WEIGHTS } from '../types';

function makePlayer(id: number, powers: number[], blacklist: number[] = []): Player {
  const p = new Player(id, `P${id}`, new Set(powers));
  p.blacklist = new Set(blacklist);
  return p;
}

function makeState(tables: { players: number[] }[]): State {
  const tblObjs = tables.map((t, i) => {
    const tbl = new Table(i);
    t.players.forEach(id => tbl.seatPlayer(id));
    return tbl;
  });
  return new State(tblObjs, []);
}

function playersMap(...players: Player[]): Record<number, Player> {
  const m: Record<number, Player> = {};
  for (const p of players) m[p.id] = p;
  return m;
}

describe('Heuristic', () => {
  describe('evalState', () => {
    it('empty state scores 0 (no penalties)', () => {
      const h = new Heuristic({});
      const state = makeState([]);
      expect(h.evalState(state)).toBe(0);
    });

    it('blacklisted players at same table incur penalty', () => {
      const p1 = makePlayer(1, [3], [2]);
      const p2 = makePlayer(2, [3], [1]);
      const players = playersMap(p1, p2);

      const hNoBlacklist = new Heuristic(players);
      const hWithBlacklist = new Heuristic(players);

      const clean = makeState([{ players: [1] }, { players: [2] }]);
      const conflict = makeState([{ players: [1, 2] }]);

      const cleanScore = hNoBlacklist.evalState(clean);
      const conflictScore = hWithBlacklist.evalState(conflict);
      expect(conflictScore).toBeGreaterThan(cleanScore);
    });

    it('power imbalance increases score', () => {
      const p1 = makePlayer(1, [1]);
      const p2 = makePlayer(2, [5]);
      const p3 = makePlayer(3, [3]);
      const p4 = makePlayer(4, [3]);
      const players = playersMap(p1, p2, p3, p4);

      const h = new Heuristic(players);

      const mixed = makeState([{ players: [1, 2] }]);
      const matched = makeState([{ players: [3, 4] }]);

      expect(h.evalState(mixed)).toBeGreaterThan(h.evalState(matched));
    });

    it('unseated players add penalty', () => {
      const p1 = makePlayer(1, [3]);
      const p2 = makePlayer(2, [3]);
      const players = playersMap(p1, p2);
      const h = new Heuristic(players);

      const allSeated = makeState([{ players: [1, 2] }]);
      const oneLeft = new State([new Table(0)], [1]);
      // Manually seat p2
      oneLeft.tables[0].seatPlayer(2);

      expect(h.evalState(oneLeft)).toBeGreaterThan(h.evalState(allSeated));
    });

    it('play history adds penalty', () => {
      const p1 = makePlayer(1, [3]);
      const p2 = makePlayer(2, [3]);
      const players = playersMap(p1, p2);

      const noHistory = new Heuristic(players, {});
      const withHistory = new Heuristic(players, { 1: { 2: 5 } });

      const state = makeState([{ players: [1, 2] }]);

      expect(withHistory.evalState(state)).toBeGreaterThan(noHistory.evalState(state));
    });

    it('power diversity penalizes mixed levels at a table', () => {
      const p1 = makePlayer(1, [1]);
      const p2 = makePlayer(2, [3]);
      const p3 = makePlayer(3, [3]);
      const p4 = makePlayer(4, [3]);
      const players = playersMap(p1, p2, p3, p4);
      const h = new Heuristic(players);

      const diverse = makeState([{ players: [1, 2] }]);
      const uniform = makeState([{ players: [3, 4] }]);

      expect(h.evalState(diverse)).toBeGreaterThan(h.evalState(uniform));
    });

    it('caches scores by state hash', () => {
      const p1 = makePlayer(1, [3]);
      const players = playersMap(p1);
      const h = new Heuristic(players);
      const state = makeState([{ players: [1] }]);

      const score1 = h.evalState(state);
      const score2 = h.evalState(state);
      expect(score1).toBe(score2);
    });
  });

  describe('evalPlayer', () => {
    it('returns null for empty set', () => {
      const h = new Heuristic({});
      expect(h.evalPlayer(new Set())).toBeNull();
    });

    it('prefers players with blacklists', () => {
      const p1 = makePlayer(1, [3]);
      const p2 = makePlayer(2, [3], [1]);
      const players = playersMap(p1, p2);
      const h = new Heuristic(players);

      const results = new Map<number, number>();
      for (let i = 0; i < 200; i++) {
        const picked = h.evalPlayer(new Set([1, 2]))!;
        results.set(picked.id, (results.get(picked.id) ?? 0) + 1);
      }
      // Player 2 (has blacklist) should be picked more often
      expect(results.get(2) ?? 0).toBeGreaterThan(results.get(1) ?? 0);
    });
  });

  describe('getPlayCount', () => {
    it('returns count from history', () => {
      const h = new Heuristic({}, { 1: { 2: 3 } });
      expect(h.getPlayCount(1, 2)).toBe(3);
    });

    it('checks both directions', () => {
      const h = new Heuristic({}, { 2: { 1: 7 } });
      expect(h.getPlayCount(1, 2)).toBe(7);
    });

    it('returns 0 for no history', () => {
      const h = new Heuristic({}, {});
      expect(h.getPlayCount(1, 2)).toBe(0);
    });
  });
});
