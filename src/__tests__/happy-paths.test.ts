/**
 * Happy Path Tests — Foringi Success Criteria
 *
 * These tests define the critical user flows that must always succeed.
 * If any of these fail, it indicates a regression in core functionality.
 *
 * Organized by user-facing scenario, not implementation detail.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/store';
import { runSearch } from '../engine/agent';
import type { PlayerData, GroupData, SolutionData } from '../engine/types';
import { MAXSEATS } from '../engine/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  useStore.setState({
    view: 'landing',
    sessionCode: null,
    hostToken: null,
    sessionName: 'Commander Night',
    tableCount: 15,
    players: {},
    nextPlayerId: 0,
    groups: {},
    nextGroupId: 0,
    solution: null,
    joinedPlayerIds: [],
    isSearching: false,
    searchProgress: {
      nodesExpanded: 0, nodesGenerated: 0, nodesSkipped: 0,
      goalsFound: 0, bestScore: Infinity, progressPercent: 0,
    },
  });
}

function pd(id: number, powers: number[], blacklist: number[] = []): PlayerData {
  return { id, name: `P${id}`, powers, blacklist };
}

function addTestPlayers(specs: Array<[string, number[]]>) {
  const s = useStore.getState;
  for (const [name, powers] of specs) s().addPlayer(name, powers);
}

function storePlayersAsData(): PlayerData[] {
  return Object.values(useStore.getState().players);
}

function storeGroupsAsData(): GroupData[] {
  return Object.values(useStore.getState().groups);
}

function allSeatedIds(sol: SolutionData): number[] {
  return sol.seatings.flat();
}

// ---------------------------------------------------------------------------
// Invariant helpers — reusable checks applied across many tests
// ---------------------------------------------------------------------------

function assertSolutionInvariants(sol: SolutionData, playerCount: number) {
  const seated = allSeatedIds(sol);
  const unique = new Set(seated);

  // No player appears more than once
  expect(unique.size).toBe(seated.length);

  // At least 90% of players seated (ceil(n*0.1) max unseated)
  const maxUnseated = Math.ceil(playerCount * 0.1);
  expect(seated.length).toBeGreaterThanOrEqual(playerCount - maxUnseated);

  // No pod exceeds MAXSEATS
  for (const pod of sol.seatings) {
    expect(pod.length).toBeLessThanOrEqual(MAXSEATS);
  }

  // Score is a finite non-negative number
  expect(sol.score).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(sol.score)).toBe(true);
}

function assertBlacklistRespected(sol: SolutionData, players: PlayerData[]) {
  const blMap = new Map<number, Set<number>>();
  for (const p of players) {
    blMap.set(p.id, new Set(p.blacklist));
  }
  for (const pod of sol.seatings) {
    for (let i = 0; i < pod.length; i++) {
      for (let j = i + 1; j < pod.length; j++) {
        const abl = blMap.get(pod[i]);
        const bbl = blMap.get(pod[j]);
        expect(
          abl?.has(pod[j]) || bbl?.has(pod[i]),
          `Players ${pod[i]} and ${pod[j]} are blacklisted but share a pod`,
        ).toBe(false);
      }
    }
  }
}

function assertGroupTogether(sol: SolutionData, memberIds: number[]) {
  if (memberIds.length === 0) return;
  const seated = sol.seatings;
  const podOf = new Map<number, number>();
  for (let i = 0; i < seated.length; i++) {
    for (const id of seated[i]) podOf.set(id, i);
  }
  const pods = memberIds.map(id => podOf.get(id));
  const allSame = pods.every(p => p !== undefined && p === pods[0]);
  expect(allSame, `Group members ${memberIds} should share a pod`).toBe(true);
}

function assertPlayerCountPreserved(before: SolutionData, after: SolutionData) {
  const idsBefore = new Set(allSeatedIds(before));
  const idsAfter = new Set(allSeatedIds(after));
  expect(idsAfter).toEqual(idsBefore);
}

// ===========================================================================
// HP-1: Host adds players with varied brackets
// ===========================================================================
describe('HP-1: Host adds players', () => {
  beforeEach(resetStore);

  it('creates players with incrementing IDs and correct data', () => {
    addTestPlayers([
      ['Alice', [1]],
      ['Bob', [2, 3]],
      ['Charlie', [4, 5]],
    ]);
    const { players, nextPlayerId } = useStore.getState();
    expect(nextPlayerId).toBe(3);
    expect(players[0]).toEqual({ id: 0, name: 'Alice', powers: [1], blacklist: [] });
    expect(players[1]).toEqual({ id: 1, name: 'Bob', powers: [2, 3], blacklist: [] });
    expect(players[2]).toEqual({ id: 2, name: 'Charlie', powers: [4, 5], blacklist: [] });
  });

  it('supports the full bracket spectrum (1-5)', () => {
    addTestPlayers([
      ['Exhibition', [1]],
      ['Core', [2]],
      ['Upgraded', [3]],
      ['Optimized', [4]],
      ['cEDH', [5]],
      ['Range', [2, 4]],
    ]);
    const players = storePlayersAsData();
    expect(players).toHaveLength(6);
    expect(players.find(p => p.name === 'Range')!.powers).toEqual([2, 4]);
  });
});

// ===========================================================================
// HP-2: Cook (A*) generates valid pods
// ===========================================================================
describe('HP-2: Cook generates valid pods', () => {
  it('4 players → 1 pod, at least 3 seated (10% threshold)', () => {
    const players = Array.from({ length: 4 }, (_, i) => pd(i, [3]));
    const solutions = runSearch(players, 'astar');

    expect(solutions.length).toBeGreaterThan(0);
    assertSolutionInvariants(solutions[0], 4);
  });

  it('8 players → 2 pods, valid seating', () => {
    const players = Array.from({ length: 8 }, (_, i) => pd(i, [3]));
    const solutions = runSearch(players, 'astar');

    expect(solutions.length).toBeGreaterThan(0);
    assertSolutionInvariants(solutions[0], 8);
  });

  it('10 players with mixed brackets → valid seating', () => {
    const players = [
      pd(0, [1]), pd(1, [1, 2]), pd(2, [2]),
      pd(3, [3]), pd(4, [3]), pd(5, [2, 4]),
      pd(6, [4]), pd(7, [4, 5]), pd(8, [5]),
      pd(9, [3]),
    ];
    const solutions = runSearch(players, 'astar');

    expect(solutions.length).toBeGreaterThan(0);
    assertSolutionInvariants(solutions[0], 10);
  });

  it('same-power players cluster into pods', () => {
    const players = [
      pd(0, [1]), pd(1, [1]), pd(2, [1]), pd(3, [1]),
      pd(4, [5]), pd(5, [5]), pd(6, [5]), pd(7, [5]),
    ];
    const solutions = runSearch(players, 'astar');
    expect(solutions.length).toBeGreaterThan(0);

    for (const pod of solutions[0].seatings) {
      if (pod.length === 0) continue;
      const powers = pod.map(id => players[id].powers[0]);
      expect(powers.every(p => p === powers[0])).toBe(true);
    }
  });
});

// ===========================================================================
// HP-3: Shuffle (Random) generates valid pods
// ===========================================================================
describe('HP-3: Shuffle generates valid pods', () => {
  it('produces at least one solution with standard invariants', () => {
    const players = Array.from({ length: 8 }, (_, i) => pd(i, [3]));
    const solutions = runSearch(players, 'random');

    expect(solutions.length).toBeGreaterThan(0);
    assertSolutionInvariants(solutions[0], 8);
  });

  it('handles odd player count (9 players)', () => {
    const players = Array.from({ length: 9 }, (_, i) => pd(i, [3]));
    const solutions = runSearch(players, 'random');

    expect(solutions.length).toBeGreaterThan(0);
    assertSolutionInvariants(solutions[0], 9);
  });
});

// ===========================================================================
// HP-4: Blacklists are enforced
// ===========================================================================
describe('HP-4: Blacklists are enforced in solutions', () => {
  it('blacklisted pair never shares a pod', () => {
    const players = [
      pd(0, [3], [1]),
      pd(1, [3], [0]),
      pd(2, [3]), pd(3, [3]),
      pd(4, [3]), pd(5, [3]),
      pd(6, [3]), pd(7, [3]),
    ];
    const solutions = runSearch(players, 'astar');

    expect(solutions.length).toBeGreaterThan(0);
    assertBlacklistRespected(solutions[0], players);
  });

  it('multiple blacklist pairs are all respected', () => {
    const players = [
      pd(0, [3], [1, 2]),
      pd(1, [3], [0]),
      pd(2, [3], [0]),
      pd(3, [3]), pd(4, [3]),
      pd(5, [3]), pd(6, [3]), pd(7, [3]),
    ];
    const solutions = runSearch(players, 'astar');

    expect(solutions.length).toBeGreaterThan(0);
    assertBlacklistRespected(solutions[0], players);
  });

  it('store blacklists are bidirectional', () => {
    resetStore();
    addTestPlayers([['A', [3]], ['B', [3]]]);
    useStore.getState().addBlacklist(0, 1);

    const { players } = useStore.getState();
    expect(players[0].blacklist).toContain(1);
    expect(players[1].blacklist).toContain(0);
  });

  it('removing a player cleans all their blacklist references', () => {
    resetStore();
    addTestPlayers([['A', [3]], ['B', [3]], ['C', [3]]]);
    useStore.getState().addBlacklist(0, 1);
    useStore.getState().addBlacklist(0, 2);
    useStore.getState().removePlayer(0);

    const { players } = useStore.getState();
    expect(players[1].blacklist).toEqual([]);
    expect(players[2].blacklist).toEqual([]);
  });
});

// ===========================================================================
// HP-5: Groups are respected
// ===========================================================================
describe('HP-5: Groups are respected in solutions', () => {
  it('locked group of 4 → all in one pod', () => {
    const players = Array.from({ length: 8 }, (_, i) => pd(i, [3]));
    const groups: GroupData[] = [{ id: 0, name: 'Friends', memberIds: [0, 1, 2, 3] }];
    const solutions = runSearch(players, 'astar', {}, {}, groups);

    expect(solutions.length).toBeGreaterThan(0);
    assertGroupTogether(solutions[0], [0, 1, 2, 3]);
    assertSolutionInvariants(solutions[0], 8);
  });

  it('partial group of 2 → seated together', () => {
    const players = Array.from({ length: 8 }, (_, i) => pd(i, [3]));
    const groups: GroupData[] = [{ id: 0, name: 'Pair', memberIds: [0, 1] }];
    const solutions = runSearch(players, 'astar', {}, {}, groups);

    expect(solutions.length).toBeGreaterThan(0);
    assertGroupTogether(solutions[0], [0, 1]);
  });

  it('partial group of 3 → seated together', () => {
    const players = Array.from({ length: 8 }, (_, i) => pd(i, [3]));
    const groups: GroupData[] = [{ id: 0, name: 'Trio', memberIds: [0, 1, 2] }];
    const solutions = runSearch(players, 'astar', {}, {}, groups);

    expect(solutions.length).toBeGreaterThan(0);
    assertGroupTogether(solutions[0], [0, 1, 2]);
  });

  it('store enforces max 4 members per group', () => {
    resetStore();
    for (let i = 0; i < 5; i++) useStore.getState().addPlayer(`P${i}`, [3]);
    useStore.getState().createGroup('G');
    for (let i = 0; i < 5; i++) useStore.getState().addPlayerToGroup(0, i);

    expect(useStore.getState().groups[0].memberIds).toHaveLength(4);
  });

  it('store prevents blacklisting between same-group members', () => {
    resetStore();
    addTestPlayers([['A', [3]], ['B', [3]]]);
    useStore.getState().createGroup('G');
    useStore.getState().addPlayerToGroup(0, 0);
    useStore.getState().addPlayerToGroup(0, 1);
    useStore.getState().addBlacklist(0, 1);

    expect(useStore.getState().players[0].blacklist).toEqual([]);
    expect(useStore.getState().players[1].blacklist).toEqual([]);
  });
});

// ===========================================================================
// HP-6: Manual pod adjustments preserve integrity
// ===========================================================================
describe('HP-6: Manual pod adjustments', () => {
  beforeEach(() => {
    resetStore();
    useStore.getState().setSolution({
      seatings: [[0, 1, 2, 3], [4, 5, 6, 7]],
      score: 10,
    });
  });

  it('movePlayer transfers a player between pods', () => {
    useStore.getState().movePlayer(0, 0, 1);
    const sol = useStore.getState().solution!;

    expect(sol.seatings[0]).not.toContain(0);
    expect(sol.seatings[1]).toContain(0);
  });

  it('movePlayer preserves total player count', () => {
    const before = useStore.getState().solution!;
    useStore.getState().movePlayer(0, 0, 1);
    const after = useStore.getState().solution!;

    assertPlayerCountPreserved(before, after);
  });

  it('swapPlayers exchanges two players across pods', () => {
    useStore.getState().swapPlayers(0, 4);
    const sol = useStore.getState().solution!;

    expect(sol.seatings[0]).toContain(4);
    expect(sol.seatings[0]).not.toContain(0);
    expect(sol.seatings[1]).toContain(0);
    expect(sol.seatings[1]).not.toContain(4);
  });

  it('swapPlayers preserves total player count', () => {
    const before = useStore.getState().solution!;
    useStore.getState().swapPlayers(0, 4);
    const after = useStore.getState().solution!;

    assertPlayerCountPreserved(before, after);
  });

  it('same-pod swap does not corrupt pod', () => {
    useStore.getState().swapPlayers(0, 3);
    const pod = useStore.getState().solution!.seatings[0];

    expect(pod).toContain(0);
    expect(pod).toContain(3);
    expect(pod).toHaveLength(4);
  });
});

// ===========================================================================
// HP-7: Full session workflow (store → engine → store)
// ===========================================================================
describe('HP-7: Full host session workflow', () => {
  beforeEach(resetStore);

  it('add players → blacklist → group → cook → adjust → shuffle', () => {
    const s = useStore.getState;

    // 1. Create session context
    s().setSession('TEST01', 'host-token-123');
    s().setView('host');
    expect(s().view).toBe('host');

    // 2. Add 8 players with varied brackets
    addTestPlayers([
      ['Alice', [1]], ['Bob', [1, 2]],
      ['Charlie', [2]], ['Diana', [3]],
      ['Eve', [3]], ['Frank', [4]],
      ['Greg', [4, 5]], ['Hannah', [5]],
    ]);
    expect(Object.keys(s().players)).toHaveLength(8);

    // 3. Set a blacklist
    s().addBlacklist(0, 7);
    expect(s().players[0].blacklist).toContain(7);

    // 4. Create a group
    s().createGroup('Friends');
    s().addPlayerToGroup(0, 0);
    s().addPlayerToGroup(0, 1);
    expect(s().groups[0].memberIds).toEqual([0, 1]);

    // 5. Cook — A* search from store data
    const players = storePlayersAsData();
    const groups = storeGroupsAsData();
    const solutions = runSearch(players, 'astar', {}, {}, groups);

    expect(solutions.length).toBeGreaterThan(0);
    const sol = solutions[0];
    assertSolutionInvariants(sol, 8);
    assertBlacklistRespected(sol, players);
    assertGroupTogether(sol, [0, 1]);

    // 6. Store the solution
    s().setSolution(sol);
    expect(s().solution).not.toBeNull();

    // 7. Manual adjustment — move player
    const beforeMove = { ...s().solution! };
    const playerToMove = sol.seatings[0].find(id => id !== 0 && id !== 1);
    if (playerToMove !== undefined) {
      s().movePlayer(playerToMove, 0, 1);
      expect(s().solution!.seatings[0]).not.toContain(playerToMove);
      expect(s().solution!.seatings[1]).toContain(playerToMove);
    }

    // 8. Shuffle — random re-roll
    const shuffled = runSearch(players, 'random', {}, {}, groups);
    expect(shuffled.length).toBeGreaterThan(0);
    assertSolutionInvariants(shuffled[0], 8);

    // 9. Clear and verify clean state
    s().clearSession();
    expect(s().view).toBe('landing');
    expect(s().sessionCode).toBeNull();
    expect(Object.keys(s().players)).toHaveLength(0);
    expect(s().solution).toBeNull();
  });
});

// ===========================================================================
// HP-8: Player removal cascade
// ===========================================================================
describe('HP-8: Player removal cascade', () => {
  beforeEach(resetStore);

  it('removing a player cleans all references', () => {
    addTestPlayers([['A', [3]], ['B', [3]], ['C', [3]]]);
    const s = useStore.getState;

    // Player 0 is blacklisted and grouped
    s().addBlacklist(0, 1);
    s().createGroup('G');
    s().addPlayerToGroup(0, 0);
    s().addPlayerToGroup(0, 2);

    s().removePlayer(0);

    expect(s().players[0]).toBeUndefined();
    expect(s().players[1].blacklist).toEqual([]);
    expect(s().groups[0].memberIds).toEqual([2]);
  });
});

// ===========================================================================
// HP-9: Solution player set is immutable under adjustments
// ===========================================================================
describe('HP-9: Solution player set immutability', () => {
  it('sequence of moves and swaps never gains or loses players', () => {
    resetStore();
    useStore.getState().setSolution({
      seatings: [[0, 1, 2, 3], [4, 5, 6, 7]],
      score: 10,
    });

    const originalIds = new Set(allSeatedIds(useStore.getState().solution!));
    const s = useStore.getState;

    // Move player 0 from pod 0 to pod 1
    s().movePlayer(0, 0, 1);
    expect(new Set(allSeatedIds(s().solution!))).toEqual(originalIds);

    // Swap two players across pods
    s().swapPlayers(1, 4);
    expect(new Set(allSeatedIds(s().solution!))).toEqual(originalIds);

    // Move another player
    s().movePlayer(2, 0, 1);
    expect(new Set(allSeatedIds(s().solution!))).toEqual(originalIds);

    // Swap within same pod
    s().swapPlayers(5, 6);
    expect(new Set(allSeatedIds(s().solution!))).toEqual(originalIds);
  });
});

// ===========================================================================
// HP-10: Edge cases that must always produce output
// ===========================================================================
describe('HP-10: Edge cases always produce output', () => {
  it('0 players → empty or no solution (no crash)', () => {
    const solutions = runSearch([], 'astar');
    if (solutions.length > 0) {
      expect(allSeatedIds(solutions[0])).toHaveLength(0);
    }
  });

  it('1 player → fallback solution', () => {
    const solutions = runSearch([pd(0, [3])], 'astar');
    expect(solutions.length).toBeGreaterThan(0);
  });

  it('5 players (one bye) → at least 4 seated', () => {
    const players = Array.from({ length: 5 }, (_, i) => pd(i, [3]));
    const solutions = runSearch(players, 'astar');

    expect(solutions.length).toBeGreaterThan(0);
    assertSolutionInvariants(solutions[0], 5);
  });

  it('all players blacklist each other → still produces output', () => {
    const players = [
      pd(0, [3], [1, 2, 3]),
      pd(1, [3], [0, 2, 3]),
      pd(2, [3], [0, 1, 3]),
      pd(3, [3], [0, 1, 2]),
    ];
    const solutions = runSearch(players, 'astar');
    expect(solutions.length).toBeGreaterThan(0);
  });

  it('multi-bracket players are handled without error', () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      pd(i, i % 2 === 0 ? [2, 3] : [3, 4]),
    );
    const solutions = runSearch(players, 'astar');

    expect(solutions.length).toBeGreaterThan(0);
    assertSolutionInvariants(solutions[0], 8);
  });
});
