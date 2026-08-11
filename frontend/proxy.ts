import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy-Report-Only': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api и /uploads проксируются на Strapi: передаём реальный IP клиента,
  // чтобы rate-limit работал по IP, а не по одному IP прокси.
  if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!ip) return NextResponse.next();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-forwarded-for', ip);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const res = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    res.headers.set(name, value);
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
