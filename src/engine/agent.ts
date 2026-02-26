import { MinHeap } from './heap';
import { Heuristic } from './heuristic';
import { Environment } from './environment';
import {
  Player, Table, State, MAXSEATS, TIMEOUT,
  type GroupData, type SolutionData, type SearchProgress, type PlayHistory, type HeuristicWeights, DEFAULT_WEIGHTS,
} from './types';

type Solution = State | SolutionData;

export type ProgressCallback = (progress: SearchProgress) => void;

export class Agent {
  heuristic: Heuristic;
  env: Environment;
  protected players: Record<number, Player>;
  protected unsortedPlayers: Set<number>;
  frontier!: MinHeap<State>;
  maxSolutions: number;
  solutions: Solution[] = [];
  private timeoutAt: number;
  nodesExpanded = 0;
  nodesGenerated = 0;
  nodesSkipped = 0;
  goalsFound = 0;

  constructor(heuristic: Heuristic, env: Environment, players: Record<number, Player>, maxSolutions: number) {
    this.heuristic = heuristic;
    this.env = env;
    this.players = players;
    this.maxSolutions = maxSolutions;
    this.timeoutAt = Date.now() + TIMEOUT;
    this.unsortedPlayers = new Set(env.playersList.map(p => p.id));
  }

  addSolution(state: State): void {
    if (this.solutions.length >= this.maxSolutions) return;
    this.solutions.push(state);
  }

  search(_onProgress?: ProgressCallback): void {
    throw new Error('Base Agent does not implement search()');
  }

  initializeFrontier(initial: State): void {
    this.frontier = new MinHeap<State>(s => this.heuristic.evalState(s));
    this.frontier.add(initial);
  }

  start(onProgress?: ProgressCallback): SolutionData[] {
    this.initializeFrontier(this.env.getInitialState());
    this.search(onProgress);
    return this.solutions.map(s => {
      if ('getSeats' in s) {
        return { seatings: (s as State).getSeats(), score: this.heuristic.evalState(s as State) };
      }
      return s as SolutionData;
    });
  }

  protected checkTimeout(): boolean {
    return Date.now() > this.timeoutAt;
  }
}

export class RandomAgent extends Agent {
  search(): void {
    const playersLeft = new Set(this.unsortedPlayers);
    let state = this.frontier.remove();

    if (playersLeft.size === 0 || !state) {
      const all = Object.values(this.players);
      if (all.length > 0) {
        this.solutions = [generateFallbackSolution(all, this.players, this.env.maxTables)];
        this.goalsFound = 1;
      }
      return;
    }

    while (playersLeft.size > 0) {
      const player = this.heuristic.evalPlayer(playersLeft);
      if (!state || !player) break;
      const actions = this.env.legalActions(state, player);
      if (actions.length === 0) break;
      const action = actions[Math.floor(Math.random() * actions.length)];
      state = state.nextState(player.id, action.id);
      playersLeft.delete(player.id);
    }

    if (state) this.addSolution(state);

    if (this.solutions.length === 0) {
      const all = Object.values(this.players);
      if (all.length > 0) {
        this.solutions = [generateFallbackSolution(all, this.players, this.env.maxTables)];
        this.goalsFound = 1;
      }
    }
  }
}

export class AStarAgent extends Agent {
  search(onProgress?: ProgressCallback): void {
    let bestScore = Infinity;
    let tick = 0;
    const totalPlayers = this.unsortedPlayers.size;

    const progress: SearchProgress = {
      nodesExpanded: 0, nodesGenerated: 0, nodesSkipped: 0,
      goalsFound: 0, bestScore: Infinity, progressPercent: 0,
    };

    if (totalPlayers === 0) return;

    const estimatedTotal = Math.pow(totalPlayers, 1.5) * this.env.maxTables;
    const maxNodes = Math.min(
      1000000,
      totalPlayers <= 8 ? 50000 :
      totalPlayers <= 12 ? 150000 :
      totalPlayers <= 16 ? 300000 : 500000,
    );

    while (true) {
      if (tick % 250 === 0) {
        if (this.checkTimeout() || this.nodesExpanded >= maxNodes) break;
        progress.progressPercent = Math.min(100, Math.round((this.nodesExpanded / estimatedTotal) * 100));
        progress.nodesExpanded = this.nodesExpanded;
        progress.nodesGenerated = this.nodesGenerated;
        progress.nodesSkipped = this.nodesSkipped;
        progress.goalsFound = this.goalsFound;
        progress.bestScore = bestScore;
        onProgress?.(progress);
      }
      tick++;

      const top = this.frontier.remove();
      if (!top) break;
      this.nodesExpanded++;

      if (this.env.isGoalState(top)) {
        const sc = this.heuristic.evalState(top);
        if (sc < 5000) {
          this.goalsFound++;
          this.addSolution(top);
          if (sc < bestScore) bestScore = sc;
          if ((totalPlayers <= 8 && this.solutions.length >= 3) ||
              this.solutions.length >= this.maxSolutions ||
              bestScore < 10) break;
        }
        continue;
      }

      const currentScore = this.heuristic.evalState(top);
      const basePrune = totalPlayers <= 8 ? 1.3 : 1.5;
      const solBonus = Math.min(0.5, this.solutions.length * 0.1);
      const ratio = top.playersLeft.size / totalPlayers;
      const pruneFactor = basePrune + ratio * 0.8 - solBonus;

      if (this.solutions.length > 0 && currentScore > bestScore * pruneFactor) {
        this.nodesSkipped++;
        continue;
      }

      const extremeThreshold = totalPlayers <= 8 ? 200 : totalPlayers <= 12 ? 400 : 800;
      if (currentScore > extremeThreshold && top.playersLeft.size < totalPlayers / 2) {
        this.nodesSkipped++;
        continue;
      }

      const player = this.heuristic.evalPlayer(top.playersLeft);
      if (!player) continue;

      const legal = this.env.legalActions(top, player);

      const ranked = legal.map(table => {
        let actionScore = 0;
        const seated = table.seatedPlayers();
        if (seated > 0) {
          const empty = MAXSEATS - seated;
          actionScore -= empty === 1 ? 15 : empty === 2 ? 8 : 3;
        }
        if (table.containsBlackList(player)) actionScore += 40;

        const tablePlayers = Array.from(table.seats.heap).map(id => this.players[id]);
        let powerMatch = 0, powerMismatch = 0;
        for (const tp of tablePlayers) {
          let exact = 0, notMatch = 0;
          for (const pw of tp.power) { player.power.has(pw) ? exact++ : notMatch++; }
          powerMatch += exact;
          powerMismatch += notMatch;
          const ph = Math.max(...Array.from(player.power));
          const th = Math.max(...Array.from(tp.power));
          if (ph !== th) powerMismatch += Math.abs(ph - th) * 3;
        }
        actionScore -= powerMatch * 5;
        actionScore += powerMismatch * 4;

        let hist = 0;
        for (const tp of tablePlayers) {
          hist += this.heuristic.getPlayCount(player.id, tp.id) * 2;
        }
        actionScore += hist;

        return { table, score: actionScore };
      });

      ranked.sort((a, b) => a.score - b.score);

      const maxActions = Math.min(
        legal.length,
        totalPlayers <= 8 ? legal.length :
        totalPlayers <= 12 ? Math.max(5, Math.ceil(legal.length * 0.6)) :
        Math.max(3, Math.ceil(legal.length * 0.4)),
      );

      for (let i = 0; i < maxActions && i < ranked.length; i++) {
        const next = top.nextState(player.id, ranked[i].table.id);
        this.nodesGenerated++;
        this.frontier.add(next);
      }
    }

    progress.nodesExpanded = this.nodesExpanded;
    progress.nodesGenerated = this.nodesGenerated;
    progress.nodesSkipped = this.nodesSkipped;
    progress.goalsFound = this.goalsFound;
    progress.bestScore = bestScore;
    progress.progressPercent = 100;
    onProgress?.(progress);

    if (this.solutions.length === 0) {
      const all = Object.values(this.players);
      if (all.length > 0) {
        this.solutions = [generateFallbackSolution(all, this.players, this.env.maxTables)];
        this.goalsFound = 1;
      }
    }
  }
}

function generateFallbackSolution(
  playerList: Player[],
  players: Record<number, Player>,
  maxTablesCount: number,
): SolutionData {
  if (playerList.length === 0) return { seatings: [], score: 0 };
  if (maxTablesCount <= 0) maxTablesCount = 1;

  const valid = playerList.filter(p => p && typeof p.id === 'number' && p.power.size > 0);
  const byPower: Record<string, Player[]> = {};
  for (let pw = 5; pw >= 1; pw--) byPower[pw] = [];
  for (const p of valid) {
    const highest = Math.max(...Array.from(p.power));
    byPower[highest].push(p);
  }

  const tables: number[][] = Array.from({ length: maxTablesCount }, () => []);
  const assigned = new Set<number>();
  let tIdx = 0;

  for (let pw = 5; pw >= 1; pw--) {
    const group = byPower[pw];
    if (!group || group.length === 0) continue;
    group.sort((a, b) => b.blacklist.size - a.blacklist.size);
    const needed = Math.min(Math.ceil(group.length / MAXSEATS), maxTablesCount - tIdx);
    if (needed <= 0) continue;

    let pIdx = 0;
    for (let i = 0; i < needed; i++) {
      const ti = tIdx + i;
      if (ti >= tables.length) break;
      for (let j = 0; j < MAXSEATS && pIdx < group.length; j++) {
        const p = group[pIdx];
        if (assigned.has(p.id)) { pIdx++; j--; continue; }
        const blocked = tables[ti].some(id =>
          p.blacklist.has(id) || (players[id] && players[id].blacklist.has(p.id))
        );
        if (!blocked) {
          tables[ti].push(p.id);
          assigned.add(p.id);
          pIdx++;
        } else {
          let found = false;
          for (let alt = pIdx + 1; alt < group.length; alt++) {
            const ap = group[alt];
            if (assigned.has(ap.id)) continue;
            const altBlocked = tables[ti].some(id =>
              ap.blacklist.has(id) || (players[id] && players[id].blacklist.has(ap.id))
            );
            if (!altBlocked) {
              tables[ti].push(ap.id);
              assigned.add(ap.id);
              found = true;
              pIdx++;
              break;
            }
          }
          if (!found) {
            if (tables[ti].length === 0) {
              tables[ti].push(p.id);
              assigned.add(p.id);
            }
            pIdx++;
          }
        }
      }
    }
    tIdx += needed;
  }

  for (const p of valid) {
    if (assigned.has(p.id)) continue;
    const ph = Math.max(...Array.from(p.power));
    let bestT = -1, bestS = Infinity;
    for (let i = 0; i < tables.length; i++) {
      if (tables[i].length >= MAXSEATS) continue;
      if (tables[i].some(id => p.blacklist.has(id) || (players[id]?.blacklist.has(p.id)))) continue;
      if (tables[i].length === 0) { bestT = i; bestS = 1; continue; }
      const avg = tables[i].reduce((s, id) => s + Math.max(...Array.from(players[id].power)), 0) / tables[i].length;
      let s = Math.abs(ph - avg) * 10;
      if (Math.abs(ph - avg) < 0.1) s = 0;
      s -= tables[i].length;
      if (s < bestS) { bestS = s; bestT = i; }
    }
    if (bestT >= 0) {
      tables[bestT].push(p.id);
      assigned.add(p.id);
    } else {
      for (let i = 0; i < tables.length; i++) {
        if (tables[i].length < MAXSEATS) {
          tables[i].push(p.id);
          assigned.add(p.id);
          break;
        }
      }
    }
  }

  const nonEmpty = tables.filter(t => t.length > 0);

  const h = new Heuristic(players);
  const tblObjs = nonEmpty.map((ids, idx) => {
    const t = new Table(idx);
    ids.forEach(id => t.seatPlayer(id));
    return t;
  });
  const st = new State(tblObjs, []);
  const score = h.evalState(st);

  return { seatings: nonEmpty, score };
}

// --- Top-level search entry point ---

export function runSearch(
  playerDataList: import('./types').PlayerData[],
  agentType: 'astar' | 'random',
  playHistory: PlayHistory = {},
  weights: Partial<HeuristicWeights> = {},
  groups: GroupData[] = [],
  onProgress?: ProgressCallback,
): SolutionData[] {
  const players: Record<number, Player> = {};
  const playerArr: Player[] = [];

  for (const d of playerDataList) {
    const p = Player.fromData(d);
    players[p.id] = p;
    playerArr.push(p);
  }

  // Bidirectional blacklist
  for (const p of playerArr) {
    for (const tid of p.blacklist) {
      if (players[tid]) players[tid].blacklist.add(p.id);
    }
  }

  // Separate groups into locked (4) and partial (2-3)
  const lockedPods: number[][] = [];
  const preSeatTables: Table[] = [];
  const groupedIds = new Set<number>();

  for (const g of groups) {
    const validMembers = g.memberIds.filter(id => players[id]);
    if (validMembers.length === 0) continue;

    for (const id of validMembers) groupedIds.add(id);

    if (validMembers.length === MAXSEATS) {
      lockedPods.push(validMembers);
    } else {
      const t = new Table(preSeatTables.length);
      for (const id of validMembers) t.seatPlayer(id);
      preSeatTables.push(t);
    }
  }

  // Ungrouped players go to the engine
  const ungrouped = playerArr.filter(p => !groupedIds.has(p.id));

  const env = new Environment(ungrouped, preSeatTables.length > 0 ? preSeatTables : undefined);
  const heuristic = new Heuristic(players, playHistory, { ...DEFAULT_WEIGHTS, ...weights });

  let agent: Agent;
  if (agentType === 'random') {
    agent = new RandomAgent(heuristic, env, players, 10);
  } else {
    agent = new AStarAgent(heuristic, env, players, 10);
  }

  const engineSolutions = agent.start(onProgress);

  // Prepend locked pods to every solution
  if (lockedPods.length > 0) {
    for (const sol of engineSolutions) {
      sol.seatings = [...lockedPods, ...sol.seatings];
    }
  }

  return engineSolutions;
}
