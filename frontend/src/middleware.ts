import { NextResponse, type NextRequest } from 'next/server';

const realIp = (req: NextRequest): string => {
  const fromForward = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fromForward || '';
};

export function middleware(request: NextRequest) {
  const ip = realIp(request);
  if (!ip) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-forwarded-for', ip);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/:path*', '/uploads/:path*'],
};