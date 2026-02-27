export { SessionDO } from './session-do';

export interface Env {
  SESSION: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(len = 6): string {
  let code = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) code += CHARS[b % CHARS.length];
  return code;
}

function getStub(env: Env, code: string): DurableObjectStub {
  const id = env.SESSION.idFromName(code.toUpperCase());
  return env.SESSION.get(id);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const segments = url.pathname.replace(/^\/api\/session\/?/, '').split('/').filter(Boolean);

    if (segments.length === 0 && request.method === 'POST') {
      return handleCreate(request, env);
    }

    if (segments.length === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const code = segments[0].toUpperCase();
    const stub = getStub(env, code);
    const subpath = segments.slice(1).join('/');
    const doUrl = new URL(request.url);
    doUrl.pathname = subpath ? `/${subpath}` : '/';

    return stub.fetch(new Request(doUrl.toString(), request));
  },
} satisfies ExportedHandler<Env>;

async function handleCreate(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const hostToken = crypto.randomUUID();
    const stub = getStub(env, code);

    const createUrl = new URL(request.url);
    createUrl.pathname = '/create';

    const res = await stub.fetch(new Request(createUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, _code: code, _hostToken: hostToken }),
    }));

    if (res.status === 409) continue;
    return res;
  }

  return Response.json({ error: 'Failed to generate unique code' }, { status: 500 });
}
