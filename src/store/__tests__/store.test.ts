import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

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
    isSearching: false,
    searchProgress: {
      nodesExpanded: 0, nodesGenerated: 0, nodesSkipped: 0,
      goalsFound: 0, bestScore: Infinity, progressPercent: 0,
    },
  });
}

describe('ForingiStore', () => {
  beforeEach(resetStore);

  describe('player management', () => {
    it('addPlayer creates a player with incrementing ID', () => {
      useStore.getState().addPlayer('Alice', [3]);
      useStore.getState().addPlayer('Bob', [2, 4]);

      const { players, nextPlayerId } = useStore.getState();
      expect(nextPlayerId).toBe(2);
      expect(players[0]).toEqual({ id: 0, name: 'Alice', powers: [3], blacklist: [] });
      expect(players[1]).toEqual({ id: 1, name: 'Bob', powers: [2, 4], blacklist: [] });
    });

    it('removePlayer deletes player and cleans blacklists', () => {
      useStore.getState().addPlayer('Alice', [3]);
      useStore.getState().addPlayer('Bob', [3]);
      useStore.getState().addBlacklist(0, 1);

      useStore.getState().removePlayer(0);
      const { players } = useStore.getState();
      expect(players[0]).toBeUndefined();
      expect(players[1].blacklist).toEqual([]);
    });

    it('removePlayer cleans group memberships', () => {
      useStore.getState().addPlayer('Alice', [3]);
      useStore.getState().addPlayer('Bob', [3]);
      useStore.getState().createGroup('G1');
      useStore.getState().addPlayerToGroup(0, 0);
      useStore.getState().addPlayerToGroup(0, 1);

      useStore.getState().removePlayer(0);
      expect(useStore.getState().groups[0].memberIds).toEqual([1]);
    });

    it('updatePlayerPowers changes powers', () => {
      useStore.getState().addPlayer('Alice', [3]);
      useStore.getState().updatePlayerPowers(0, [1, 5]);
      expect(useStore.getState().players[0].powers).toEqual([1, 5]);
    });

    it('updatePlayerPowers ignores non-existent player', () => {
      useStore.getState().updatePlayerPowers(99, [1]);
      expect(Object.keys(useStore.getState().players)).toHaveLength(0);
    });

    it('loadPlayers replaces all players', () => {
      useStore.getState().addPlayer('Old', [1]);
      useStore.getState().loadPlayers(
        { 5: { id: 5, name: 'New', powers: [3], blacklist: [] } },
        6,
      );
      const { players, nextPlayerId } = useStore.getState();
      expect(players[0]).toBeUndefined();
      expect(players[5].name).toBe('New');
      expect(nextPlayerId).toBe(6);
    });
  });

  describe('blacklists', () => {
    it('addBlacklist is bidirectional', () => {
      useStore.getState().addPlayer('A', [3]);
      useStore.getState().addPlayer('B', [3]);
      useStore.getState().addBlacklist(0, 1);

      const { players } = useStore.getState();
      expect(players[0].blacklist).toContain(1);
      expect(players[1].blacklist).toContain(0);
    });

    it('addBlacklist is idempotent', () => {
      useStore.getState().addPlayer('A', [3]);
      useStore.getState().addPlayer('B', [3]);
      useStore.getState().addBlacklist(0, 1);
      useStore.getState().addBlacklist(0, 1);

      expect(useStore.getState().players[0].blacklist).toEqual([1]);
    });

    it('addBlacklist blocked between same-group members', () => {
      useStore.getState().addPlayer('A', [3]);
      useStore.getState().addPlayer('B', [3]);
      useStore.getState().createGroup('G');
      useStore.getState().addPlayerToGroup(0, 0);
      useStore.getState().addPlayerToGroup(0, 1);
      useStore.getState().addBlacklist(0, 1);

      expect(useStore.getState().players[0].blacklist).toEqual([]);
    });

    it('removeBlacklist is bidirectional', () => {
      useStore.getState().addPlayer('A', [3]);
      useStore.getState().addPlayer('B', [3]);
      useStore.getState().addBlacklist(0, 1);
      useStore.getState().removeBlacklist(0, 1);

      const { players } = useStore.getState();
      expect(players[0].blacklist).toEqual([]);
      expect(players[1].blacklist).toEqual([]);
    });
  });

  describe('groups', () => {
    it('createGroup with incrementing ID', () => {
      useStore.getState().createGroup('Team A');
      useStore.getState().createGroup();

      const { groups, nextGroupId } = useStore.getState();
      expect(nextGroupId).toBe(2);
      expect(groups[0].name).toBe('Team A');
      expect(groups[1].name).toBe('Group 2');
      expect(groups[0].memberIds).toEqual([]);
    });

    it('deleteGroup removes group', () => {
      useStore.getState().createGroup('G');
      useStore.getState().deleteGroup(0);
      expect(useStore.getState().groups[0]).toBeUndefined();
    });

    it('addPlayerToGroup respects max 4 members', () => {
      useStore.getState().createGroup('G');
      for (let i = 0; i < 5; i++) useStore.getState().addPlayer(`P${i}`, [3]);
      for (let i = 0; i < 5; i++) useStore.getState().addPlayerToGroup(0, i);

      expect(useStore.getState().groups[0].memberIds).toHaveLength(4);
    });

    it('addPlayerToGroup moves player from other group', () => {
      useStore.getState().createGroup('G1');
      useStore.getState().createGroup('G2');
      useStore.getState().addPlayer('A', [3]);
      useStore.getState().addPlayerToGroup(0, 0);
      useStore.getState().addPlayerToGroup(1, 0);

      const { groups } = useStore.getState();
      expect(groups[0].memberIds).toEqual([]);
      expect(groups[1].memberIds).toEqual([0]);
    });

    it('removePlayerFromGroup removes player', () => {
      useStore.getState().createGroup('G');
      useStore.getState().addPlayer('A', [3]);
      useStore.getState().addPlayerToGroup(0, 0);
      useStore.getState().removePlayerFromGroup(0, 0);
      expect(useStore.getState().groups[0].memberIds).toEqual([]);
    });
  });

  describe('solution', () => {
    it('setSolution and clearSolution', () => {
      const sol = { seatings: [[0, 1], [2, 3]], score: 42 };
      useStore.getState().setSolution(sol);
      expect(useStore.getState().solution).toEqual(sol);

      useStore.getState().clearSolution();
      expect(useStore.getState().solution).toBeNull();
    });

    it('movePlayer between pods', () => {
      useStore.getState().setSolution({ seatings: [[0, 1], [2, 3]], score: 10 });
      useStore.getState().movePlayer(1, 0, 1);

      const s = useStore.getState().solution!;
      expect(s.seatings[0]).toEqual([0]);
      expect(s.seatings[1]).toEqual([2, 3, 1]);
    });

    it('swapPlayers between pods', () => {
      useStore.getState().setSolution({ seatings: [[0, 1], [2, 3]], score: 10 });
      useStore.getState().swapPlayers(1, 2);

      const s = useStore.getState().solution!;
      expect(s.seatings[0]).toContain(2);
      expect(s.seatings[1]).toContain(1);
    });

    it('swapPlayers within same pod', () => {
      useStore.getState().setSolution({ seatings: [[0, 1, 2, 3]], score: 10 });
      useStore.getState().swapPlayers(0, 3);

      const s = useStore.getState().solution!;
      expect(s.seatings[0]).toContain(0);
      expect(s.seatings[0]).toContain(3);
    });
  });

  describe('session lifecycle', () => {
    it('setSession stores code and token', () => {
      useStore.getState().setSession('ABC123', 'token-uuid');
      const s = useStore.getState();
      expect(s.sessionCode).toBe('ABC123');
      expect(s.hostToken).toBe('token-uuid');
    });

    it('clearSession resets everything', () => {
      useStore.getState().setSession('ABC', 'tok');
      useStore.getState().addPlayer('X', [3]);
      useStore.getState().clearSession();

      const s = useStore.getState();
      expect(s.view).toBe('landing');
      expect(s.sessionCode).toBeNull();
      expect(s.hostToken).toBeNull();
      expect(Object.keys(s.players)).toHaveLength(0);
    });
  });
});
