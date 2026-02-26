import type { PlayerData, GroupData, SolutionData } from '../engine/types';

export interface SessionData {
  code: string;
  hostToken: string;
  name: string;
  tableCount: number;
  players: Record<number, PlayerData>;
  nextPlayerId: number;
  groups: Record<number, GroupData>;
  nextGroupId: number;
  solution: SolutionData | null;
  createdAt: number;
}

export interface CreateSessionRequest {
  name?: string;
  tableCount?: number;
}

export interface CreateSessionResponse {
  code: string;
  hostToken: string;
}

export interface JoinSessionRequest {
  players: { name: string; powers: number[] }[];
  strictGroup?: boolean;
}

export interface JoinSessionResponse {
  playerIds: number[];
}

export interface SessionEvent {
  type: 'join' | 'leave' | 'cooked';
  names?: string[];
  ts: number;
}

export interface SessionStateResponse {
  name: string;
  tableCount?: number;
  players: Record<number, PlayerData>;
  nextPlayerId?: number;
  groups?: Record<number, GroupData>;
  nextGroupId?: number;
  solution: SolutionData | null;
  playerCount: number;
  eventLog?: SessionEvent[];
}
