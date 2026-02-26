interface Env { SESSIONS: KVNamespace }

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const code = String(params.code).toUpperCase();
    const playerId = Number(params.playerId);
    if (isNaN(playerId)) return Response.json({ error: 'Invalid player ID' }, { status: 400 });

    const raw = await env.SESSIONS.get(code);
    if (!raw) return Response.json({ error: 'Session not found' }, { status: 404 });

    const session = JSON.parse(raw);
    const hostToken = request.headers.get('X-Host-Token');
    if (hostToken !== session.hostToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!(playerId in session.players)) {
      return Response.json({ error: 'Player not found' }, { status: 404 });
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
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
