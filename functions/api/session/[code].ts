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
