interface Env { SESSIONS: KVNamespace }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const code = String(params.code).toUpperCase();
  const raw = await env.SESSIONS.get(code);
  if (!raw) return new Response('Session not found', { status: 404 });

  const session = JSON.parse(raw);

  return Response.json({
    name: session.name,
    tableCount: session.tableCount,
    players: session.players,
    nextPlayerId: session.nextPlayerId,
    groups: session.groups,
    nextGroupId: session.nextGroupId,
    solution: session.solution,
    playerCount: Object.keys(session.players).length,
  });
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, params, request }) => {
  const code = String(params.code).toUpperCase();
  const raw = await env.SESSIONS.get(code);
  if (!raw) return new Response('Session not found', { status: 404 });

  const session = JSON.parse(raw);
  const hostToken = request.headers.get('X-Host-Token');
  if (hostToken !== session.hostToken) {
    return new Response('Unauthorized', { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;

  if (body.players !== undefined) session.players = body.players;
  if (typeof body.nextPlayerId === 'number') session.nextPlayerId = body.nextPlayerId;
  if (body.groups !== undefined) session.groups = body.groups;
  if (typeof body.nextGroupId === 'number') session.nextGroupId = body.nextGroupId;

  await env.SESSIONS.put(code, JSON.stringify(session), { expirationTtl: 86400 });
  return new Response(null, { status: 204 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  const code = String(params.code).toUpperCase();
  const raw = await env.SESSIONS.get(code);
  if (!raw) return new Response('Session not found', { status: 404 });

  const session = JSON.parse(raw);
  const hostToken = request.headers.get('X-Host-Token');
  if (hostToken !== session.hostToken) {
    return new Response('Unauthorized', { status: 403 });
  }

  await env.SESSIONS.delete(code);
  return new Response(null, { status: 204 });
};
