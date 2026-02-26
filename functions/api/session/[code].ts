interface Env { SESSIONS: KVNamespace }

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const code = String(params.code).toUpperCase();
    const raw = await env.SESSIONS.get(code);
    if (!raw) return Response.json({ error: 'Session not found' }, { status: 404 });

    const session = JSON.parse(raw);
    const hostToken = request.headers.get('X-Host-Token');
    const isHost = hostToken === session.hostToken;

    if (isHost) {
      return Response.json({
        name: session.name,
        tableCount: session.tableCount,
        players: session.players,
        nextPlayerId: session.nextPlayerId,
        groups: session.groups,
        nextGroupId: session.nextGroupId,
        solution: session.solution,
        playerCount: Object.keys(session.players).length,
        eventLog: session.eventLog ?? [],
      });
    }

    const strippedPlayers: Record<string, { id: number; name: string }> = {};
    for (const [id, p] of Object.entries(session.players) as [string, any][]) {
      strippedPlayers[id] = { id: p.id, name: p.name };
    }

    return Response.json({
      name: session.name,
      playerCount: Object.keys(session.players).length,
      players: strippedPlayers,
      solution: session.solution ? { seatings: session.solution.seatings } : null,
    });
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const code = String(params.code).toUpperCase();
    const raw = await env.SESSIONS.get(code);
    if (!raw) return Response.json({ error: 'Session not found' }, { status: 404 });

    const session = JSON.parse(raw);
    const hostToken = request.headers.get('X-Host-Token');
    if (hostToken !== session.hostToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;

    if (body.players !== undefined) session.players = body.players;
    if (typeof body.nextPlayerId === 'number') session.nextPlayerId = body.nextPlayerId;
    if (body.groups !== undefined) session.groups = body.groups;
    if (typeof body.nextGroupId === 'number') session.nextGroupId = body.nextGroupId;
    if (body.solution !== undefined) session.solution = body.solution;

    await env.SESSIONS.put(code, JSON.stringify(session), { expirationTtl: 86400 });
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const code = String(params.code).toUpperCase();
    const raw = await env.SESSIONS.get(code);
    if (!raw) return Response.json({ error: 'Session not found' }, { status: 404 });

    const session = JSON.parse(raw);
    const hostToken = request.headers.get('X-Host-Token');
    if (hostToken !== session.hostToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await env.SESSIONS.delete(code);
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
