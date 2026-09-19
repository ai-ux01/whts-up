export type AuthPortal = 'client' | 'platform';

// Only the SHORT-LIVED access token is kept client-side (in localStorage).
// The refresh token now lives in an httpOnly cookie set by the API and is
// never accessible to JavaScript (mitigates XSS token theft).
const KEYS = {
  client: { access: 'accessToken' },
  platform: { access: 'adminAccessToken' },
} as const;

// Legacy refresh-token keys to clean up from older sessions.
const LEGACY_REFRESH_KEYS = ['refreshToken', 'adminRefreshToken'] as const;

export function getTokens(portal: AuthPortal) {
  if (typeof window === 'undefined') return { access: null };
  return { access: localStorage.getItem(KEYS[portal].access) };
}

/**
 * Store the access token. `refreshToken` is accepted for backward-compatible
 * call sites but is intentionally ignored — it is managed via httpOnly cookie.
 */
export function setTokens(
  portal: AuthPortal,
  accessToken: string,
  _refreshToken?: string,
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS[portal].access, accessToken);
  // Clear the other portal so sessions do not mix.
  const other = portal === 'client' ? KEYS.platform : KEYS.client;
  localStorage.removeItem(other.access);
  // Remove any stale refresh tokens from before the cookie migration.
  for (const k of LEGACY_REFRESH_KEYS) localStorage.removeItem(k);
  // Set the route-gating marker on the FRONTEND'S OWN domain so Next.js
  // middleware can read it. The API's cross-domain cookie never reaches the
  // web domain (Vercel), so the frontend owns this marker.
  setSessionMarker(portal);
}

export function clearTokens(portal: AuthPortal) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS[portal].access);
  clearSessionMarker();
}

export function clearAllTokens() {
  clearTokens('client');
  clearTokens('platform');
  for (const k of LEGACY_REFRESH_KEYS) localStorage.removeItem(k);
  clearSessionMarker();
}

/** Non-sensitive marker cookie (portal name only) read by Next.js middleware. */
export function setSessionMarker(portal: AuthPortal) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `hasSession=${portal}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearSessionMarker() {
  if (typeof document === 'undefined') return;
  document.cookie = 'hasSession=; Path=/; Max-Age=0; SameSite=Lax';
}
