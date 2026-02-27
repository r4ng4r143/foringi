import type { Env } from './worker';

interface PlayerData {
  id: number;
  name: string;
  powers: number[];
  blacklist: number[];
}

interface GroupData {
  id: number;
  name: string;
  memberIds: number[];
  strict?: boolean;
}

interface SolutionData {
  seatings: number[][];
  score: number;
  podScores?: number[];
}

interface SessionEvent {
  type: 'join' | 'leave' | 'cooked';
  names?: string[];
  ts: number;
}

interface SessionData {
  code: string;
  hostToken: string;
  name: string;
  tableCount: number;
  players: Record<string, PlayerData>;
  nextPlayerId: number;
  groups: Record<string, GroupData>;
  nextGroupId: number;
  solution: SolutionData | null;
  eventLog: SessionEvent[];
  createdAt: number;
}

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const HOST_TAG = 'role:host';
const CLIENT_TAG = 'role:client';

export class SessionDO implements DurableObject {
  private state: DurableObjectState;
  private data: SessionData | null = null;
  private loaded = false;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  private async load(): Promise<SessionData | null> {
    if (this.loaded) return this.data;
    this.data = await this.state.storage.get<SessionData>('session') ?? null;
    this.loaded = true;
    return this.data;
  }

  private async save(): Promise<void> {
    if (!this.data) return;
    await this.state.storage.put('session', this.data);
  }

  private json(body: unknown, status = 200): Response {
    return Response.json(body, { status });
  }

  private error(message: string, status: number): Response {
    return this.json({ error: message }, status);
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;

      if (path.endsWith('/ws') && request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocketUpgrade(url);
      }

      if (path.endsWith('/create') && method === 'POST') {
        return this.handleCreate(request);
      }

      const data = await this.load();
      if (!data) return this.error('Session not found', 404);

      if (path.endsWith('/join') && method === 'POST') return this.handleJoin(request, data);
      if (path.endsWith('/leave') && method === 'POST') return this.handleLeave(request, data);
      if (path.endsWith('/solution') && method === 'POST') return this.handleSolution(request, data);

      const playerMatch = path.match(/\/player\/(\d+)$/);
      if (playerMatch && method === 'DELETE') {
        return this.handleRemovePlayer(request, data, Number(playerMatch[1]));
      }

      if (method === 'GET') return this.handleGet(request, data);
      if (method === 'PATCH') return this.handlePatch(request, data);
      if (method === 'DELETE') return this.handleDelete(request, data);

      return this.error('Not found', 404);
    } catch {
      return this.error('Internal server error', 500);
    }
  }

  // --- WebSocket Hibernation API ---

  private async handleWebSocketUpgrade(url: URL): Promise<Response> {
    const data = await this.load();
    if (!data) return this.error('Session not found', 404);

    const token = url.searchParams.get('token');
    const isHost = token === data.hostToken;
    const tag = isHost ? HOST_TAG : CLIENT_TAG;

    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1], [tag]);

    pair[1].send(JSON.stringify(
      isHost ? this.hostPayload(data) : this.clientPayload(data),
    ));

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;

    const data = await this.load();
    if (!data) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      return;
    }

    let msg: WsMessage;
    try { msg = JSON.parse(message); } catch { return; }

    switch (msg.type) {
      case 'sync':
        if (!this.isHost(ws)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          return;
        }
        if (msg.players !== undefined) data.players = msg.players as Record<string, PlayerData>;
        if (typeof msg.nextPlayerId === 'number') data.nextPlayerId = msg.nextPlayerId;
        if (msg.groups !== undefined) data.groups = msg.groups as Record<string, GroupData>;
        if (typeof msg.nextGroupId === 'number') data.nextGroupId = msg.nextGroupId;
        if (msg.solution !== undefined) data.solution = msg.solution as SolutionData | null;
        await this.save();
        this.broadcast(data, ws);
        break;

      case 'solution': {
        if (!this.isHost(ws)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          return;
        }
        const seatings = msg.seatings as number[][] | undefined;
        if (!Array.isArray(seatings)) return;
        data.solution = { seatings, score: (msg.score as number) ?? 0 };
        data.eventLog.push({ type: 'cooked', ts: Date.now() });
        await this.save();
        this.broadcast(data, ws);
        break;
      }

      case 'leave': {
        const playerIds = msg.playerIds as number[] | undefined;
        if (!Array.isArray(playerIds) || playerIds.length === 0) return;
        const leftNames: string[] = [];
        for (const pid of playerIds) {
          if (!(pid in data.players)) continue;
          leftNames.push(data.players[pid].name);
          delete data.players[pid];
          for (const p of Object.values(data.players)) {
            p.blacklist = p.blacklist.filter(x => x !== pid);
          }
          for (const g of Object.values(data.groups)) {
            g.memberIds = g.memberIds.filter(x => x !== pid);
          }
        }
        if (leftNames.length > 0) {
          data.eventLog.push({ type: 'leave', names: leftNames, ts: Date.now() });
        }
        await this.save();
        this.broadcast(data);
        break;
      }

      default:
        break;
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    ws.close();
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    ws.close();
  }

  private isHost(ws: WebSocket): boolean {
    return this.state.getTags(ws).includes(HOST_TAG);
  }

  private hostPayload(data: SessionData): object {
    return {
      type: 'state',
      name: data.name,
      tableCount: data.tableCount,
      players: data.players,
      nextPlayerId: data.nextPlayerId,
      groups: data.groups,
      nextGroupId: data.nextGroupId,
      solution: data.solution,
      playerCount: Object.keys(data.players).length,
      eventLog: data.eventLog,
    };
  }

  private clientPayload(data: SessionData): object {
    const strippedPlayers: Record<string, { id: number; name: string }> = {};
    for (const [id, p] of Object.entries(data.players)) {
      strippedPlayers[id] = { id: p.id, name: p.name };
    }
    return {
      type: 'state',
      name: data.name,
      playerCount: Object.keys(data.players).length,
      players: strippedPlayers,
      solution: data.solution ? { seatings: data.solution.seatings } : null,
    };
  }

  private broadcast(data: SessionData, exclude?: WebSocket): void {
    const hostMsg = JSON.stringify(this.hostPayload(data));
    const clientMsg = JSON.stringify(this.clientPayload(data));

    for (const ws of this.state.getWebSockets()) {
      if (ws === exclude) continue;
      const tags = this.state.getTags(ws);
      try {
        ws.send(tags.includes(HOST_TAG) ? hostMsg : clientMsg);
      } catch { /* socket may have closed */ }
    }
  }

  async alarm(): Promise<void> {
    await this.state.storage.deleteAll();
    this.data = null;
    this.loaded = true;
  }

  private async handleCreate(request: Request): Promise<Response> {
    const existing = await this.load();
    if (existing) return this.error('Code already in use', 409);

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;

    const data: SessionData = {
      code: (body._code as string) ?? '',
      hostToken: (body._hostToken as string) ?? '',
      name: typeof body.name === 'string' ? body.name.slice(0, 100) : 'Commander Night',
      tableCount: typeof body.tableCount === 'number' ? Math.min(Math.max(1, body.tableCount), 30) : 15,
      players: {},
      nextPlayerId: 0,
      groups: {},
      nextGroupId: 0,
      solution: null,
      eventLog: [],
      createdAt: Date.now(),
    };

    this.data = data;
    this.loaded = true;
    await this.save();
    await this.state.storage.setAlarm(Date.now() + TTL_MS);

    return this.json({ code: data.code, hostToken: data.hostToken });
  }

  private handleGet(request: Request, data: SessionData): Response {
    const hostToken = request.headers.get('X-Host-Token');
    const isHost = hostToken === data.hostToken;

    if (isHost) {
      return this.json({
        name: data.name,
        tableCount: data.tableCount,
        players: data.players,
        nextPlayerId: data.nextPlayerId,
        groups: data.groups,
        nextGroupId: data.nextGroupId,
        solution: data.solution,
        playerCount: Object.keys(data.players).length,
        eventLog: data.eventLog,
      });
    }

    const strippedPlayers: Record<string, { id: number; name: string }> = {};
    for (const [id, p] of Object.entries(data.players)) {
      strippedPlayers[id] = { id: p.id, name: p.name };
    }

    return this.json({
      name: data.name,
      playerCount: Object.keys(data.players).length,
      players: strippedPlayers,
      solution: data.solution ? { seatings: data.solution.seatings } : null,
    });
  }

  private async handlePatch(request: Request, data: SessionData): Promise<Response> {
    const hostToken = request.headers.get('X-Host-Token');
    if (hostToken !== data.hostToken) return this.error('Unauthorized', 403);

    const body = await request.json() as Record<string, unknown>;

    if (body.players !== undefined) {
      if (typeof body.players !== 'object' || body.players === null || Array.isArray(body.players)) {
        return this.error('Invalid players', 400);
      }
      data.players = body.players as Record<string, PlayerData>;
    }
    if (typeof body.nextPlayerId === 'number') {
      if (body.nextPlayerId < 0 || !Number.isInteger(body.nextPlayerId)) {
        return this.error('Invalid nextPlayerId', 400);
      }
      data.nextPlayerId = body.nextPlayerId;
    }
    if (body.groups !== undefined) {
      if (typeof body.groups !== 'object' || body.groups === null || Array.isArray(body.groups)) {
        return this.error('Invalid groups', 400);
      }
      data.groups = body.groups as Record<string, GroupData>;
    }
    if (typeof body.nextGroupId === 'number') {
      if (body.nextGroupId < 0 || !Number.isInteger(body.nextGroupId)) {
        return this.error('Invalid nextGroupId', 400);
      }
      data.nextGroupId = body.nextGroupId;
    }
    if (body.solution !== undefined) {
      if (body.solution !== null && (typeof body.solution !== 'object' || !Array.isArray((body.solution as any).seatings))) {
        return this.error('Invalid solution', 400);
      }
      data.solution = body.solution as SolutionData | null;
    }

    await this.save();
    this.broadcast(data);
    return new Response(null, { status: 204 });
  }

  private async handleDelete(request: Request, data: SessionData): Promise<Response> {
    const hostToken = request.headers.get('X-Host-Token');
    if (hostToken !== data.hostToken) return this.error('Unauthorized', 403);

    await this.state.storage.deleteAll();
    this.data = null;
    return new Response(null, { status: 204 });
  }

  private async handleJoin(request: Request, data: SessionData): Promise<Response> {
    const body = await request.json() as { players?: { name: string; powers: number[] }[]; strictGroup?: boolean };

    if (!body.players || !Array.isArray(body.players) || body.players.length === 0) {
      return this.error('At least one player required', 400);
    }
    if (body.players.length > 4) {
      return this.error('Maximum 4 players per join', 400);
    }

    const playerIds: number[] = [];

    for (const p of body.players) {
      const name = typeof p.name === 'string' ? p.name.trim().slice(0, 50) : '';
      if (!name) continue;

      let powers = Array.isArray(p.powers)
        ? p.powers.filter((v: unknown) => typeof v === 'number' && v >= 1 && v <= 5)
        : [2];
      if (powers.length === 0) powers = [2];

      const id = data.nextPlayerId++;
      data.players[id] = { id, name, powers, blacklist: [] };
      playerIds.push(id);
    }

    if (playerIds.length === 0) return this.error('No valid players provided', 400);

    if (playerIds.length >= 2) {
      const groupId = data.nextGroupId++;
      data.groups[groupId] = {
        id: groupId,
        name: `Group ${groupId + 1}`,
        memberIds: playerIds,
        strict: body.strictGroup ?? false,
      };
    }

    const names = playerIds.map(id => data.players[id].name);
    data.eventLog.push({ type: 'join', names, ts: Date.now() });

    await this.save();
    this.broadcast(data);
    return this.json({ playerIds });
  }

  private async handleLeave(request: Request, data: SessionData): Promise<Response> {
    const body = await request.json() as { playerIds?: number[] };
    if (!Array.isArray(body.playerIds) || body.playerIds.length === 0) {
      return this.error('playerIds required', 400);
    }

    const leftNames: string[] = [];
    for (const pid of body.playerIds) {
      if (!(pid in data.players)) continue;
      leftNames.push(data.players[pid].name);
      delete data.players[pid];

      for (const p of Object.values(data.players)) {
        p.blacklist = p.blacklist.filter(x => x !== pid);
      }
      for (const g of Object.values(data.groups)) {
        g.memberIds = g.memberIds.filter(x => x !== pid);
      }
    }

    if (leftNames.length > 0) {
      data.eventLog.push({ type: 'leave', names: leftNames, ts: Date.now() });
    }

    await this.save();
    this.broadcast(data);
    return new Response(null, { status: 204 });
  }

  private async handleSolution(request: Request, data: SessionData): Promise<Response> {
    const hostToken = request.headers.get('X-Host-Token');
    if (hostToken !== data.hostToken) return this.error('Unauthorized', 403);

    const solution = await request.json() as { seatings: number[][]; score: number };
    if (!solution.seatings || !Array.isArray(solution.seatings)) {
      return this.error('Invalid solution format', 400);
    }

    data.solution = { seatings: solution.seatings, score: solution.score ?? 0 };
    data.eventLog.push({ type: 'cooked', ts: Date.now() });

    await this.save();
    this.broadcast(data);
    return new Response(null, { status: 204 });
  }

  private async handleRemovePlayer(request: Request, data: SessionData, playerId: number): Promise<Response> {
    const hostToken = request.headers.get('X-Host-Token');
    if (hostToken !== data.hostToken) return this.error('Unauthorized', 403);

    if (!(playerId in data.players)) return this.error('Player not found', 404);

    delete data.players[playerId];

    for (const p of Object.values(data.players)) {
      p.blacklist = p.blacklist.filter(x => x !== playerId);
    }
    for (const g of Object.values(data.groups)) {
      g.memberIds = g.memberIds.filter(x => x !== playerId);
    }

    await this.save();
    this.broadcast(data);
    return new Response(null, { status: 204 });
  }
}
