interface Env { SESSIONS: KVNamespace }

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const code = String(params.code).toUpperCase();
    const raw = await env.SESSIONS.get(code);
    if (!raw) return Response.json({ error: 'Session not found' }, { status: 404 });

    const session = JSON.parse(raw);
    const hostToken = request.headers.get('X-Host-Token');
    if (hostToken !== session.hostToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const solution = await request.json() as { seatings: number[][]; score: number };

    if (!solution.seatings || !Array.isArray(solution.seatings)) {
      return Response.json({ error: 'Invalid solution format' }, { status: 400 });
    }

    session.solution = { seatings: solution.seatings, score: solution.score ?? 0 };

    if (!session.eventLog) session.eventLog = [];
    session.eventLog.push({ type: 'cooked', ts: Date.now() });

    await env.SESSIONS.put(code, JSON.stringify(session), { expirationTtl: 86400 });

    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
