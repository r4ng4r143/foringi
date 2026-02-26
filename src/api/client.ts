import type {
  CreateSessionRequest,
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  SessionStateResponse,
} from './types';
import type { SolutionData } from '../engine/types';

const API_BASE = '/api/session';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createSession(data: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSession(code: string, hostToken?: string): Promise<SessionStateResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hostToken) headers['X-Host-Token'] = hostToken;
  return request<SessionStateResponse>(`${API_BASE}/${code}`, { headers });
}

export async function joinSession(code: string, data: JoinSessionRequest): Promise<JoinSessionResponse> {
  return request<JoinSessionResponse>(`${API_BASE}/${code}/join`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function postSolution(code: string, hostToken: string, solution: SolutionData): Promise<void> {
  await request<void>(`${API_BASE}/${code}/solution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken },
    body: JSON.stringify(solution),
  });
}

export async function deleteSession(code: string, hostToken: string): Promise<void> {
  await request<void>(`${API_BASE}/${code}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken },
  });
}
