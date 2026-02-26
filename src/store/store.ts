import { create } from 'zustand';
import type { PlayerData, GroupData, SolutionData, SearchProgress } from '../engine/types';
import { removePlayerFromSession, patchSession } from '../api/client';

export type AppView = 'landing' | 'host' | 'join' | 'joined';

interface ForingiStore {
  // --- Routing / session ---
  view: AppView;
  sessionCode: string | null;
  hostToken: string | null;
  sessionName: string;
  tableCount: number;

  setView: (view: AppView) => void;
  setSession: (code: string, hostToken: string | null) => void;
  clearSession: () => void;
  setSessionName: (name: string) => void;
  setTableCount: (count: number) => void;

  // --- Player data ---
  players: Record<number, PlayerData>;
  nextPlayerId: number;
  addPlayer: (name: string, powers: number[]) => void;
  removePlayer: (id: number) => void;
  updatePlayerPowers: (id: number, powers: number[]) => void;
  loadPlayers: (players: Record<number, PlayerData>, nextId: number) => void;

  addBlacklist: (playerId: number, targetId: number) => void;
  removeBlacklist: (playerId: number, targetId: number) => void;

  // --- Groups ---
  groups: Record<number, GroupData>;
  nextGroupId: number;
  createGroup: (name?: string) => void;
  deleteGroup: (id: number) => void;
  toggleGroupStrict: (id: number) => void;
  addPlayerToGroup: (groupId: number, playerId: number) => void;
  removePlayerFromGroup: (groupId: number, playerId: number) => void;
  loadGroups: (groups: Record<number, GroupData>, nextId: number) => void;

  // --- Solution ---
  solution: SolutionData | null;
  setSolution: (solution: SolutionData) => void;
  clearSolution: () => void;
  movePlayer: (playerId: number, fromPod: number, toPod: number) => void;
  unseatPlayer: (playerId: number, fromPod: number) => void;
  swapPlayers: (aId: number, bId: number) => void;
  focusPodIndex: number | null;
  setFocusPod: (index: number | null) => void;

  // --- Player join (client-side) ---
  joinedPlayerIds: number[];
  setJoinedPlayerIds: (ids: number[]) => void;

  // --- Search ---
  isSearching: boolean;
  searchProgress: SearchProgress;
  setSearching: (v: boolean) => void;
  setSearchProgress: (p: SearchProgress) => void;
}

export const useStore = create<ForingiStore>((set) => ({
  view: 'landing',
  sessionCode: null,
  hostToken: null,
  sessionName: 'Commander Night',
  tableCount: 15,

  setView: (view) => set({ view }),
  setSession: (code, hostToken) => set({ sessionCode: code, hostToken }),
  clearSession: () => set({
    view: 'landing', sessionCode: null, hostToken: null,
    players: {}, nextPlayerId: 0, groups: {}, nextGroupId: 0,
    solution: null, sessionName: 'Commander Night', tableCount: 15,
    joinedPlayerIds: [],
  }),
  setSessionName: (name) => set({ sessionName: name }),
  setTableCount: (count) => set({ tableCount: count }),

  players: {},
  nextPlayerId: 0,

  addPlayer: (name, powers) => set(s => {
    const id = s.nextPlayerId;
    return {
      nextPlayerId: id + 1,
      players: { ...s.players, [id]: { id, name, powers, blacklist: [] } },
    };
  }),

  removePlayer: (id) => {
    const { sessionCode, hostToken } = useStore.getState();
    if (sessionCode && hostToken) {
      removePlayerFromSession(sessionCode, hostToken, id).catch(console.error);
    }
    set(s => {
      const { [id]: _, ...rest } = s.players;
      const players: typeof rest = {};
      for (const [pid, p] of Object.entries(rest)) {
        players[Number(pid)] = { ...p, blacklist: p.blacklist.filter(x => x !== id) };
      }
      const groups = { ...s.groups };
      for (const g of Object.values(groups)) {
        if (g.memberIds.includes(id)) {
          groups[g.id] = { ...g, memberIds: g.memberIds.filter(x => x !== id) };
        }
      }
      return { players, groups };
    });
  },

  updatePlayerPowers: (id, powers) => set(s => {
    const p = s.players[id];
    if (!p) return s;
    return { players: { ...s.players, [id]: { ...p, powers } } };
  }),

  loadPlayers: (players, nextId) => set({ players, nextPlayerId: nextId }),

  addBlacklist: (playerId, targetId) => set(s => {
    const p = s.players[playerId];
    const t = s.players[targetId];
    if (!p || !t || p.blacklist.includes(targetId)) return s;
    const sameGroup = Object.values(s.groups).some(
      g => g.memberIds.includes(playerId) && g.memberIds.includes(targetId),
    );
    if (sameGroup) return s;
    return {
      players: {
        ...s.players,
        [playerId]: { ...p, blacklist: [...p.blacklist, targetId] },
        [targetId]: { ...t, blacklist: [...t.blacklist, playerId] },
      },
    };
  }),

  removeBlacklist: (playerId, targetId) => set(s => {
    const p = s.players[playerId];
    const t = s.players[targetId];
    if (!p || !t) return s;
    return {
      players: {
        ...s.players,
        [playerId]: { ...p, blacklist: p.blacklist.filter(x => x !== targetId) },
        [targetId]: { ...t, blacklist: t.blacklist.filter(x => x !== playerId) },
      },
    };
  }),

  groups: {},
  nextGroupId: 0,

  createGroup: (name) => set(s => {
    const id = s.nextGroupId;
    return {
      nextGroupId: id + 1,
      groups: { ...s.groups, [id]: { id, name: name ?? `Group ${id + 1}`, memberIds: [], strict: true } },
    };
  }),

  deleteGroup: (id) => set(s => {
    const { [id]: _, ...rest } = s.groups;
    return { groups: rest };
  }),

  toggleGroupStrict: (id) => set(s => {
    const g = s.groups[id];
    if (!g) return s;
    return { groups: { ...s.groups, [id]: { ...g, strict: !(g.strict !== false) } } };
  }),

  addPlayerToGroup: (groupId, playerId) => set(s => {
    const g = s.groups[groupId];
    if (!g || g.memberIds.length >= 4 || g.memberIds.includes(playerId)) return s;
    const groups = { ...s.groups };
    for (const og of Object.values(groups)) {
      if (og.id !== groupId && og.memberIds.includes(playerId)) {
        groups[og.id] = { ...og, memberIds: og.memberIds.filter(x => x !== playerId) };
      }
    }
    groups[groupId] = { ...g, memberIds: [...g.memberIds, playerId] };
    return { groups };
  }),

  removePlayerFromGroup: (groupId, playerId) => set(s => {
    const g = s.groups[groupId];
    if (!g) return s;
    return {
      groups: { ...s.groups, [groupId]: { ...g, memberIds: g.memberIds.filter(x => x !== playerId) } },
    };
  }),

  loadGroups: (groups, nextId) => set({ groups, nextGroupId: nextId }),

  solution: null,
  setSolution: (solution) => set({ solution }),
  clearSolution: () => set({ solution: null }),

  movePlayer: (playerId, fromPod, toPod) => set(s => {
    if (!s.solution) return s;
    const seatings = s.solution.seatings.map(pod => [...pod]);
    seatings[fromPod] = seatings[fromPod].filter(id => id !== playerId);
    seatings[toPod].push(playerId);
    return { solution: { ...s.solution, seatings, podScores: undefined } };
  }),

  unseatPlayer: (playerId, fromPod) => set(s => {
    if (!s.solution) return s;
    const seatings = s.solution.seatings.map(pod => [...pod]);
    seatings[fromPod] = seatings[fromPod].filter(id => id !== playerId);
    return { solution: { ...s.solution, seatings, podScores: undefined } };
  }),

  swapPlayers: (aId, bId) => set(s => {
    if (!s.solution) return s;
    const seatings = s.solution.seatings.map(pod => [...pod]);
    let aPod = -1, bPod = -1;
    for (let i = 0; i < seatings.length; i++) {
      if (seatings[i].includes(aId)) aPod = i;
      if (seatings[i].includes(bId)) bPod = i;
    }
    if (aPod === -1 || bPod === -1) return s;
    if (aPod === bPod) {
      seatings[aPod] = seatings[aPod].map(id => id === aId ? bId : id === bId ? aId : id);
    } else {
      seatings[aPod] = seatings[aPod].map(id => id === aId ? bId : id);
      seatings[bPod] = seatings[bPod].map(id => id === bId ? aId : id);
    }
    return { solution: { ...s.solution, seatings, podScores: undefined } };
  }),

  focusPodIndex: null,
  setFocusPod: (index) => set({ focusPodIndex: index }),

  joinedPlayerIds: [],
  setJoinedPlayerIds: (ids) => set({ joinedPlayerIds: ids }),

  isSearching: false,
  searchProgress: {
    nodesExpanded: 0, nodesGenerated: 0, nodesSkipped: 0,
    goalsFound: 0, bestScore: Infinity, progressPercent: 0,
  },
  setSearching: (v) => set({ isSearching: v }),
  setSearchProgress: (p) => set({ searchProgress: p }),
}));

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let skipNextSync = false;

function scheduleSyncToKV() {
  if (skipNextSync) return;
  const { sessionCode, hostToken } = useStore.getState();
  if (!sessionCode || !hostToken) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const { players, nextPlayerId, groups, nextGroupId, solution, sessionCode: code, hostToken: token } = useStore.getState();
    if (!code || !token) return;
    patchSession(code, token, { players, nextPlayerId, groups, nextGroupId, solution }).catch(console.error);
  }, 500);
}

export function suppressSync(fn: () => void) {
  skipNextSync = true;
  fn();
  skipNextSync = false;
}

useStore.subscribe(
  (state, prev) => {
    if (state.players !== prev.players || state.groups !== prev.groups || state.solution !== prev.solution) {
      scheduleSyncToKV();
    }
  },
);
