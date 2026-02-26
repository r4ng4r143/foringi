interface Env { SESSIONS: KVNamespace }

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const code = String(params.code).toUpperCase();
    const raw = await env.SESSIONS.get(code);
    if (!raw) return Response.json({ error: 'Session not found' }, { status: 404 });

    const session = JSON.parse(raw);
    const body = await request.json() as { playerIds?: number[] };

    if (!Array.isArray(body.playerIds) || body.playerIds.length === 0) {
      return Response.json({ error: 'playerIds required' }, { status: 400 });
    }

    const leftNames: string[] = [];
    for (const pid of body.playerIds) {
      if (!(pid in session.players)) continue;
      leftNames.push(session.players[pid].name);
      delete session.players[pid];

      for (const p of Object.values(session.players) as any[]) {
        p.blacklist = p.blacklist.filter((x: number) => x !== pid);
      }
      for (const g of Object.values(session.groups) as any[]) {
        g.memberIds = g.memberIds.filter((x: number) => x !== pid);
      }
    }

    if (leftNames.length > 0) {
      if (!session.eventLog) session.eventLog = [];
      session.eventLog.push({ type: 'leave', names: leftNames, ts: Date.now() });
    }

    await env.SESSIONS.put(code, JSON.stringify(session), { expirationTtl: 86400 });
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
