import type { PlayerData, GroupData } from '../engine/types';

const STORAGE_KEY = 'foringi_state';

interface SavedState {
  players: Record<number, PlayerData>;
  nextPlayerId: number;
  groups: Record<number, GroupData>;
  nextGroupId: number;
}

export function saveState(
  players: Record<number, PlayerData>,
  nextPlayerId: number,
  groups: Record<number, GroupData>,
  nextGroupId: number,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, nextPlayerId, groups, nextGroupId }));
  } catch {
    console.error('Failed to save state to localStorage');
  }
}

export function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.players) {
      for (const p of Object.values(data.players) as PlayerData[]) {
        if (!p.blacklist) p.blacklist = [];
        if ('whitelist' in p) delete (p as Record<string, unknown>)['whitelist'];
      }
    }
    return {
      players: data.players ?? {},
      nextPlayerId: data.nextPlayerId ?? 0,
      groups: data.groups ?? {},
      nextGroupId: data.nextGroupId ?? 0,
    };
  } catch {
    return null;
  }
}

export function exportToFile(
  players: Record<number, PlayerData>,
  nextPlayerId: number,
  groups: Record<number, GroupData>,
  nextGroupId: number,
): void {
  const data = JSON.stringify({ players, nextPlayerId, groups, nextGroupId }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'foringi_players.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromFile(file: File): Promise<SavedState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.players || typeof data.nextPlayerId !== 'number') {
          throw new Error('Invalid file format');
        }
        for (const p of Object.values(data.players) as PlayerData[]) {
          if (!p.blacklist) p.blacklist = [];
          if ('whitelist' in p) delete (p as Record<string, unknown>)['whitelist'];
        }
        resolve({
          players: data.players,
          nextPlayerId: data.nextPlayerId,
          groups: data.groups ?? {},
          nextGroupId: data.nextGroupId ?? 0,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
