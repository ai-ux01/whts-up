import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that never require a session.
const publicPaths = [
  '/login',
  '/signup',
  '/admin/login',
  '/feedback',
  '/mock',
  '/privacy',
  '/terms',
  '/data-deletion',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic) return NextResponse.next();

  // Server-side gate: the API sets a non-sensitive `hasSession` marker cookie
  // (value = portal) alongside the httpOnly refresh cookie on login. The actual
  // access token is still validated by the API on every request; this just
  // prevents unauthenticated users from loading protected app shells.
  const marker = request.cookies.get('hasSession')?.value;

  if (!marker) {
    const isAdminArea = pathname.startsWith('/admin');
    const loginUrl = new URL(isAdminArea ? '/admin/login' : '/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Keep platform admins in /admin and client users out of it.
  if (pathname.startsWith('/admin') && marker !== 'platform') {
    return NextResponse.redirect(new URL('/command-center', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
