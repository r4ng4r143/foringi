import { describe, it, expect } from 'vitest';
import { Environment } from '../environment';
import { Player, Table, State, MAXTABLES } from '../types';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) =>
    new Player(i, `P${i}`, new Set([2]))
  );
}

describe('Environment', () => {
  describe('table count calculation', () => {
    it('1 player gets 1 table', () => {
      expect(new Environment(makePlayers(1)).maxTables).toBe(1);
    });

    it('4 players get 1 table', () => {
      expect(new Environment(makePlayers(4)).maxTables).toBe(1);
    });

    it('5 players get 2 tables', () => {
      expect(new Environment(makePlayers(5)).maxTables).toBe(2);
    });

    it('8 players get 2 tables', () => {
      expect(new Environment(makePlayers(8)).maxTables).toBe(2);
    });

    it('caps at MAXTABLES', () => {
      expect(new Environment(makePlayers(100)).maxTables).toBeLessThanOrEqual(MAXTABLES);
    });

    it('includes pre-seated players in count', () => {
      const t = new Table(0);
      t.seatPlayer(100);
      t.seatPlayer(101);
      const env = new Environment(makePlayers(2), [t]);
      expect(env.maxTables).toBeGreaterThanOrEqual(1);
    });

    it('0 players still creates 1 table', () => {
      expect(new Environment([]).maxTables).toBe(1);
    });
  });

  describe('isGoalState', () => {
    it('0 players left is always goal', () => {
      const env = new Environment(makePlayers(8));
      const state = new State(env.tables, []);
      expect(env.isGoalState(state)).toBe(true);
    });

    it('allows up to 10% unseated for large groups', () => {
      const env = new Environment(makePlayers(20));
      // ceil(20*0.1) = 2 allowed unseated
      expect(env.isGoalState(new State(env.tables, [0, 1]))).toBe(true);
    });

    it('8 players: allows at most 1 unseated', () => {
      const env = new Environment(makePlayers(8));
      // ceil(8*0.1) = 1
      expect(env.isGoalState(new State(env.tables, [0]))).toBe(true);
      expect(env.isGoalState(new State(env.tables, [0, 1]))).toBe(false);
    });

    it('rejects too many unseated', () => {
      const env = new Environment(makePlayers(8));
      expect(env.isGoalState(new State(env.tables, [0, 1, 2, 3]))).toBe(false);
    });

    it('3 players: allows 1 unseated', () => {
      const env = new Environment(makePlayers(3));
      // ceil(3*0.1) = 1
      expect(env.isGoalState(new State(env.tables, [0]))).toBe(true);
      expect(env.isGoalState(new State(env.tables, [0, 1]))).toBe(false);
    });
  });

  describe('legalActions', () => {
    it('returns tables with available seats', () => {
      const env = new Environment(makePlayers(4));
      const state = env.getInitialState();
      const player = new Player(99, 'Test', new Set([3]));
      const actions = env.legalActions(state, player);
      expect(actions.length).toBeGreaterThan(0);
      actions.forEach(t => expect(t.canSeat()).toBe(true));
    });

    it('excludes full tables', () => {
      const env = new Environment(makePlayers(4));
      const state = env.getInitialState();
      for (let i = 0; i < 4; i++) state.tables[0].seatPlayer(i + 100);
      const actions = env.legalActions(state, new Player(99, 'T', new Set([3])));
      expect(actions.some(t => t.id === 0)).toBe(false);
    });
  });

  describe('getInitialState', () => {
    it('contains all player IDs', () => {
      const players = makePlayers(5);
      const env = new Environment(players);
      const state = env.getInitialState();
      expect(state.playersLeft.size).toBe(5);
      players.forEach(p => expect(state.playersLeft.has(p.id)).toBe(true));
    });
  });
});
