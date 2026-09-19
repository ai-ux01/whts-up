import type { Request, Response } from 'express';

export const REFRESH_COOKIE = 'refreshToken';
// Non-sensitive marker cookie (readable by Next.js middleware for route gating).
// Contains only the portal name — NO token. httpOnly is intentionally false.
export const SESSION_MARKER_COOKIE = 'hasSession';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — matches refresh token expiry

/**
 * Set the refresh token as an httpOnly cookie. httpOnly blocks JS/XSS access;
 * Secure + SameSite reduce CSRF/leak risk. In production the API and frontend
 * are on different domains (Render vs Vercel), so cross-site cookies require
 * SameSite=None + Secure.
 */
export function setRefreshCookie(
  res: Response,
  token: string,
  isProd: boolean,
  portal: 'client' | 'platform' = 'client',
) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: MAX_AGE_MS,
    path: '/api/v1/auth',
  });
  // Readable marker for the frontend middleware (no token, safe to expose).
  res.cookie(SESSION_MARKER_COOKIE, portal, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearRefreshCookie(res: Response, isProd: boolean) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
  res.clearCookie(SESSION_MARKER_COOKIE, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

/** Parse a single cookie value from the raw Cookie header (no extra dependency). */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers?.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}
