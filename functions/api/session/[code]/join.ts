interface Env { SESSIONS: KVNamespace }

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const code = String(params.code).toUpperCase();
  const raw = await env.SESSIONS.get(code);
  if (!raw) return new Response('Session not found', { status: 404 });

  const session = JSON.parse(raw);
  const body = await request.json() as { players?: { name: string; powers: number[] }[]; strictGroup?: boolean };

  if (!body.players || !Array.isArray(body.players) || body.players.length === 0) {
    return new Response('At least one player required', { status: 400 });
  }

  if (body.players.length > 4) {
    return new Response('Maximum 4 players per join', { status: 400 });
  }

  const playerIds: number[] = [];

  for (const p of body.players) {
    const name = typeof p.name === 'string' ? p.name.trim().slice(0, 50) : '';
    if (!name) continue;

    const powers = Array.isArray(p.powers)
      ? p.powers.filter((v: unknown) => typeof v === 'number' && v >= 1 && v <= 5)
      : [2];

    if (powers.length === 0) powers.push(2);

    const id = session.nextPlayerId++;
    session.players[id] = { id, name, powers, blacklist: [] };
    playerIds.push(id);
  }

  if (playerIds.length === 0) {
    return new Response('No valid players provided', { status: 400 });
  }

  if (playerIds.length >= 2) {
    const groupId = session.nextGroupId++;
    session.groups[groupId] = {
      id: groupId,
      name: `Group ${groupId + 1}`,
      memberIds: playerIds,
      strict: body.strictGroup ?? false,
    };
  }

  const names = playerIds.map(id => session.players[id].name);
  if (!session.eventLog) session.eventLog = [];
  session.eventLog.push({ type: 'join', names, ts: Date.now() });

  await env.SESSIONS.put(code, JSON.stringify(session), { expirationTtl: 86400 });

  return Response.json({ playerIds });
};
