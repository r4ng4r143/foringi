interface Env { SESSIONS: KVNamespace }

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const code = String(params.code).toUpperCase();
  const raw = await env.SESSIONS.get(code);
  if (!raw) return new Response('Session not found', { status: 404 });

  const session = JSON.parse(raw);
  const body = await request.json() as { playerIds?: number[] };

  if (!Array.isArray(body.playerIds) || body.playerIds.length === 0) {
    return new Response('playerIds required', { status: 400 });
  }

  for (const pid of body.playerIds) {
    if (!(pid in session.players)) continue;
    delete session.players[pid];

    for (const p of Object.values(session.players) as any[]) {
      p.blacklist = p.blacklist.filter((x: number) => x !== pid);
    }
    for (const g of Object.values(session.groups) as any[]) {
      g.memberIds = g.memberIds.filter((x: number) => x !== pid);
    }
  }

  await env.SESSIONS.put(code, JSON.stringify(session), { expirationTtl: 86400 });
  return new Response(null, { status: 204 });
};
