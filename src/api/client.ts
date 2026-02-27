import type {
  CreateSessionRequest,
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  HostSessionResponse,
  ClientSessionResponse,
} from './types';

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
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

export async function createSession(data: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSession(code: string, hostToken: string): Promise<HostSessionResponse>;
export async function getSession(code: string): Promise<ClientSessionResponse>;
export async function getSession(code: string, hostToken?: string): Promise<HostSessionResponse | ClientSessionResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hostToken) headers['X-Host-Token'] = hostToken;
  return request(`${API_BASE}/${code}`, { headers });
}

export async function joinSession(code: string, data: JoinSessionRequest): Promise<JoinSessionResponse> {
  return request<JoinSessionResponse>(`${API_BASE}/${code}/join`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSession(code: string, hostToken: string): Promise<void> {
  await request<void>(`${API_BASE}/${code}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken },
  });
}
