import { Player, Table, State, MAXSEATS, MAXTABLES } from './types';

export class Environment {
  playersList: Player[];
  maxTables: number;
  tables: Table[];

  constructor(players: Player[], preSeatTables?: Table[]) {
    this.playersList = players;
    const count = players.length + (preSeatTables?.reduce((s, t) => s + t.seatedPlayers(), 0) ?? 0);
    const ideal = Math.ceil(count / MAXSEATS);
    const max = Math.max(1, Math.ceil(count / 2));
    this.maxTables = Math.min(Math.max(1, Math.min(ideal, max)), MAXTABLES);

    this.tables = [];
    if (preSeatTables) {
      for (const t of preSeatTables) {
        this.tables.push(t);
      }
    }
    for (let i = this.tables.length; i < this.maxTables; i++) {
      this.tables.push(new Table(i));
    }
  }

  isGoalState(state: State): boolean {
    const total = this.playersList.length;
    const maxUnsorted = Math.ceil(total * 0.1);
    return state.playersLeft.size <= maxUnsorted;
  }

  legalActions(state: State, player: Player): Table[] {
    return state.tables.filter(t => t.canSeat());
  }

  getInitialState(): State {
    const ids = new Set(this.playersList.map(p => p.id));
    return new State(this.tables, ids);
  }
}
