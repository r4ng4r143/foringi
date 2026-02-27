import type { PlayerData, GroupData, SolutionData } from '../engine/types';

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

export interface HostSessionResponse {
  name: string;
  tableCount: number;
  players: Record<number, PlayerData>;
  nextPlayerId: number;
  groups: Record<number, GroupData>;
  nextGroupId: number;
  solution: SolutionData | null;
  playerCount: number;
  eventLog: SessionEvent[];
}

export interface ClientPlayerData {
  id: number;
  name: string;
}

export interface ClientSessionResponse {
  name: string;
  playerCount: number;
  players: Record<number, ClientPlayerData>;
  solution: { seatings: number[][] } | null;
}

export type SessionStateResponse = HostSessionResponse | ClientSessionResponse;
