interface Env { SESSIONS: KVNamespace }

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  const code = String(params.code).toUpperCase();
  const playerId = Number(params.playerId);
  if (isNaN(playerId)) return new Response('Invalid player ID', { status: 400 });

  const raw = await env.SESSIONS.get(code);
  if (!raw) return new Response('Session not found', { status: 404 });

  const session = JSON.parse(raw);
  const hostToken = request.headers.get('X-Host-Token');
  if (hostToken !== session.hostToken) {
    return new Response('Unauthorized', { status: 403 });
  }

  if (!(playerId in session.players)) {
    return new Response('Player not found', { status: 404 });
  }

  delete session.players[playerId];

  for (const p of Object.values(session.players) as any[]) {
    p.blacklist = p.blacklist.filter((x: number) => x !== playerId);
  }
  for (const g of Object.values(session.groups) as any[]) {
    g.memberIds = g.memberIds.filter((x: number) => x !== playerId);
  }

  await env.SESSIONS.put(code, JSON.stringify(session), { expirationTtl: 86400 });
  return new Response(null, { status: 204 });
};
