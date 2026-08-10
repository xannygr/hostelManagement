import type { NextRequest } from 'next/server';

const API_TARGET = process.env.API_TARGET || 'http://localhost:1337';
const FORWARD_HEADERS = ['content-type', 'authorization', 'accept', 'x-forwarded-for', 'user-agent'];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function proxy(req: NextRequest, path: string[]) {
  const url = new URL(req.url);
  const target = `${API_TARGET}/api/${path.join('/')}${url.search}`;

  const headers: Record<string, string> = {};
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      ...(body !== undefined ? { body } : {}),
    });
    return new Response(res.body, { status: res.status });
  } catch (err) {
    console.warn(`[proxy] API ${target} недоступен:`, (err as { code?: string })?.code || (err as Error).message);
    return new Response(
      JSON.stringify({ error: { status: 502, name: 'ServiceUnavailableError', message: 'API недоступен — проверьте, что backend запущен' } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxy(req, path));
}

export function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxy(req, path));
}

export function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxy(req, path));
}

export function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxy(req, path));
}

export function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxy(req, path));
}

export function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxy(req, path));
}

export function HEAD(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return params.then(({ path }) => proxy(req, path));
}