import { Player, State, MAXSEATS, type HeuristicWeights, type PlayHistory, DEFAULT_WEIGHTS } from './types';

export class Heuristic {
  weights: HeuristicWeights;
  private players: Record<number, Player>;
  private playHistory: PlayHistory;
  private hashmap: Record<number, number> = {};

  constructor(
    players: Record<number, Player>,
    playHistory: PlayHistory = {},
    weights: Partial<HeuristicWeights> = {},
  ) {
    this.players = players;
    this.playHistory = playHistory;
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  evalPlayer(playersSet: Set<number>): Player | null {
    if (playersSet.size === 0) return null;

    const scored = Array.from(playersSet).map(pid => {
      const player = this.players[pid];
      let score = 0;
      if (player.hasBlacklist()) score += 20;
      score += 10 - player.power.size * 2;
      score += Math.random() * 2;
      return { pid, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return this.players[scored[0].pid];
  }

  evalState(state: State): number {
    const h = state.hash();
    if (this.hashmap[h] !== undefined) return this.hashmap[h];

    let score = state.playersLeft.size * this.weights.unseated;
    let emptySeatCount = 0;
    let powerImbalanceCount = 0;
    let powerDiffCount = 0;
    let blacklistCount = 0;
    let historyPenalty = 0;
    let powerDiversityPenalty = 0;

    for (const table of state.tables) {
      emptySeatCount += MAXSEATS - table.seats.size();
      const pids = Array.from(table.seats.heap);

      for (let j = 0; j < pids.length; j++) {
        for (let k = j + 1; k < pids.length; k++) {
          const h1 = this.playHistory[pids[j]];
          if (h1 && h1[pids[k]]) historyPenalty += h1[pids[k]];
        }
      }

      if (pids.length === 0) continue;

      const levelsAtTable = new Set<number>();
      const playerPowers = new Map<number, number>();
      for (const pid of pids) {
        const p = this.players[pid];
        if (!p) continue;
        let highest = 0;
        for (const pw of p.power) {
          if (pw > highest) highest = pw;
          levelsAtTable.add(pw);
        }
        playerPowers.set(pid, highest);
      }
      if (levelsAtTable.size > 1) {
        powerDiversityPenalty += (levelsAtTable.size - 1) * this.weights.powerDiversity;
      }
      if (playerPowers.size > 1) {
        const vals = Array.from(playerPowers.values());
        const diff = Math.max(...vals) - Math.min(...vals);
        if (diff > 0) powerDiversityPenalty += diff * this.weights.powerDiversity;
      }

      for (let j = 0; j < pids.length; j++) {
        const pj = this.players[pids[j]];
        if (table.containsBlackList(pj)) blacklistCount++;
        for (let k = 0; k < pids.length; k++) {
          if (j === k) continue;
          const pk = this.players[pids[k]];
          if (pj.lowestPower < pk.lowestPower) powerImbalanceCount++;
          for (const pw of pk.power) {
            if (!pj.power.has(pw)) powerDiffCount++;
          }
        }
      }
    }

    score += emptySeatCount * this.weights.emptySeat;
    score += powerImbalanceCount * this.weights.powerImbalance;
    score += powerDiffCount * this.weights.powerDiff;
    score += blacklistCount * this.weights.blacklist;
    score += historyPenalty * this.weights.playHistory;
    score += powerDiversityPenalty;

    this.hashmap[h] = score;
    return score;
  }

  evalPod(pids: number[]): number {
    if (pids.length === 0) return 0;

    let score = (MAXSEATS - pids.length) * this.weights.emptySeat;
    let powerImbalanceCount = 0;
    let powerDiffCount = 0;
    let blacklistCount = 0;
    let historyPenalty = 0;
    let powerDiversityPenalty = 0;

    for (let j = 0; j < pids.length; j++) {
      for (let k = j + 1; k < pids.length; k++) {
        const h1 = this.playHistory[pids[j]];
        if (h1 && h1[pids[k]]) historyPenalty += h1[pids[k]];
      }
    }

    const levelsAtTable = new Set<number>();
    const playerPowers = new Map<number, number>();
    for (const pid of pids) {
      const p = this.players[pid];
      if (!p) continue;
      let highest = 0;
      for (const pw of p.power) {
        if (pw > highest) highest = pw;
        levelsAtTable.add(pw);
      }
      playerPowers.set(pid, highest);
    }
    if (levelsAtTable.size > 1) {
      powerDiversityPenalty += (levelsAtTable.size - 1) * this.weights.powerDiversity;
    }
    if (playerPowers.size > 1) {
      const vals = Array.from(playerPowers.values());
      const diff = Math.max(...vals) - Math.min(...vals);
      if (diff > 0) powerDiversityPenalty += diff * this.weights.powerDiversity;
    }

    for (let j = 0; j < pids.length; j++) {
      const pj = this.players[pids[j]];
      if (!pj) continue;
      for (const blId of pj.blacklist) {
        if (pids.includes(blId)) { blacklistCount++; break; }
      }
      for (let k = 0; k < pids.length; k++) {
        if (j === k) continue;
        const pk = this.players[pids[k]];
        if (!pk) continue;
        if (pj.lowestPower < pk.lowestPower) powerImbalanceCount++;
        for (const pw of pk.power) {
          if (!pj.power.has(pw)) powerDiffCount++;
        }
      }
    }

    score += powerImbalanceCount * this.weights.powerImbalance;
    score += powerDiffCount * this.weights.powerDiff;
    score += blacklistCount * this.weights.blacklist;
    score += historyPenalty * this.weights.playHistory;
    score += powerDiversityPenalty;

    return score;
  }

  getPlayCount(pid1: number, pid2: number): number {
    return this.playHistory[pid1]?.[pid2] ?? this.playHistory[pid2]?.[pid1] ?? 0;
  }

  clearCache(): void {
    this.hashmap = {};
  }
}
