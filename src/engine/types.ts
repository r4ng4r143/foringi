import { MinHeap } from './heap';
import { hashString } from './hash';

export const MAXSEATS = 4;
export const MAXTABLES = 15;
export const TIMEOUT = 20000;
export const MAXSOLUTIONS = 10;

export enum Bracket {
  EXHIBITION = 1,
  CORE = 2,
  UPGRADED = 3,
  OPTIMIZED = 4,
  CEDH = 5,
}

export const BRACKET_LABELS: Record<number, string> = {
  [Bracket.EXHIBITION]: 'Exhibition',
  [Bracket.CORE]: 'Core',
  [Bracket.UPGRADED]: 'Upgraded',
  [Bracket.OPTIMIZED]: 'Optimized',
  [Bracket.CEDH]: 'cEDH',
};

export interface HeuristicWeights {
  powerImbalance: number;
  powerDiff: number;
  blacklist: number;
  emptySeat: number;
  unseated: number;
  playHistory: number;
  powerDiversity: number;
}

export const DEFAULT_WEIGHTS: HeuristicWeights = {
  powerImbalance: 50,
  powerDiff: 1.5,
  blacklist: 100,
  emptySeat: 10,
  unseated: 1,
  playHistory: 3,
  powerDiversity: 40,
};

export interface PlayHistory {
  [playerId: number]: { [otherPlayerId: number]: number };
}

export interface SearchProgress {
  nodesExpanded: number;
  nodesGenerated: number;
  nodesSkipped: number;
  goalsFound: number;
  bestScore: number;
  progressPercent: number;
}

export interface PlayerData {
  id: number;
  name: string;
  powers: number[];
  blacklist: number[];
}

export interface GroupData {
  id: number;
  name: string;
  memberIds: number[];
}

export interface SolutionData {
  seatings: number[][];
  score: number;
}

// --- Engine classes (used inside the search algorithm) ---

export class Player {
  id: number;
  name: string;
  power: Set<number>;
  blacklist: Set<number>;
  hashValue: number;
  lowestPower: number;

  constructor(id: number, name: string, power: Set<number>) {
    this.id = id;
    this.name = name;
    this.power = power;
    this.blacklist = new Set();
    this.hashValue = hashString(this.name);
    this.lowestPower = Math.min(...Array.from(this.power));
  }

  static fromData(d: PlayerData): Player {
    const p = new Player(d.id, d.name, new Set(d.powers));
    p.blacklist = new Set(d.blacklist);
    return p;
  }

  hasBlacklist(): boolean { return this.blacklist.size > 0; }
  hash(): number { return this.hashValue; }
}

export class Table {
  id: number;
  seats: MinHeap<number>;

  constructor(id: number) {
    this.id = id;
    this.seats = new MinHeap<number>((a) => a);
  }

  copy(): Table {
    const t = new Table(this.id);
    t.seats = this.seats.copy();
    return t;
  }

  seatPlayer(playerId: number): void {
    this.seats.add(playerId);
  }

  canSeat(): boolean {
    return this.seats.size() < MAXSEATS;
  }

  containsBlackList(player: Player): boolean {
    for (const pid of player.blacklist) {
      for (const seated of this.seats.getOrderedArray()) {
        if (pid === Number(seated)) return true;
      }
    }
    return false;
  }

  seatedPlayers(): number { return this.seats.size(); }
}

export class State {
  tables: Table[];
  playersLeft: Set<number>;
  hashValue: number;

  constructor(tables: Table[], playersLeft: Set<number> | number[]) {
    this.playersLeft = new Set(playersLeft);
    this.hashValue = 0;
    this.tables = tables.map(t => t.copy());
  }

  copy(): State {
    return new State(this.tables, this.playersLeft);
  }

  nextState(playerId: number, toTable: number): State {
    const s = this.copy();
    s.tables[toTable].seatPlayer(playerId);
    s.playersLeft.delete(playerId);
    return s;
  }

  hash(): number {
    if (this.hashValue !== 0) return this.hashValue;
    const parts: string[] = [];
    for (const table of this.tables) {
      if (table.seats.heap.length > 0) {
        const sorted = table.seats.getOrderedArray();
        parts.push('(' + sorted.join(',') + ')');
      }
    }
    const str = parts.sort().join('-');
    this.hashValue = hashString(str);
    return this.hashValue;
  }

  getSeats(): number[][] {
    return this.tables.map(t => t.seats.getOrderedArray());
  }
}
