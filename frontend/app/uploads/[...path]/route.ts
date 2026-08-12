import type { NextRequest } from 'next/server';

const API_TARGET = process.env.API_TARGET || 'http://localhost:1337';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function proxyFile(req: NextRequest, path: string[]) {
  const url = new URL(req.url);
  const target = `${API_TARGET}/uploads/${path.join('/')}${url.search}`;

  const headers: Record<string, string> = {};
  const ip = req.headers.get('x-forwarded-for');
  if (ip) headers['x-forwarded-for'] = ip;

  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      ...(req.method === 'HEAD' ? {} : {}),
    });
    const responseHeaders = new Headers();
    for (const name of ['content-type', 'content-disposition', 'cache-control', 'etag', 'content-length']) {
      const value = res.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(res.body, { status: res.status, headers: responseHeaders });
  } catch (err) {
    console.warn(`[proxy] uploads ${target} недоступен:`, (err as { code?: string })?.code || (err as Error).message);
    return new Response('Not Found', { status: 404 });
  }
}

export function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxyFile(req, path));
}

export function HEAD(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxyFile(req, path));
}
