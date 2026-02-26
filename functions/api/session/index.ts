interface Env { SESSIONS: KVNamespace }

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(len = 6): string {
  let code = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) code += CHARS[b % CHARS.length];
  return code;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    const existing = await env.SESSIONS.get(code);
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  const hostToken = crypto.randomUUID();

  const session = {
    code,
    hostToken,
    name: typeof body.name === 'string' ? body.name.slice(0, 100) : 'Commander Night',
    tableCount: typeof body.tableCount === 'number' ? Math.min(Math.max(1, body.tableCount), 30) : 15,
    players: {},
    nextPlayerId: 0,
    groups: {},
    nextGroupId: 0,
    solution: null,
    createdAt: Date.now(),
  };

  await env.SESSIONS.put(code, JSON.stringify(session), { expirationTtl: 86400 });

  return Response.json({ code, hostToken });
};
