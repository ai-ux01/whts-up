export type AuthPortal = 'client' | 'platform';

const KEYS = {
  client: { access: 'accessToken', refresh: 'refreshToken' },
  platform: { access: 'adminAccessToken', refresh: 'adminRefreshToken' },
} as const;

export function getTokens(portal: AuthPortal) {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  const k = KEYS[portal];
  return {
    access: localStorage.getItem(k.access),
    refresh: localStorage.getItem(k.refresh),
  };
}

export function setTokens(
  portal: AuthPortal,
  accessToken: string,
  refreshToken: string,
) {
  if (typeof window === 'undefined') return;
  const k = KEYS[portal];
  localStorage.setItem(k.access, accessToken);
  localStorage.setItem(k.refresh, refreshToken);
  // Clear the other portal so sessions do not mix
  const other = portal === 'client' ? KEYS.platform : KEYS.client;
  localStorage.removeItem(other.access);
  localStorage.removeItem(other.refresh);
}

export function clearTokens(portal: AuthPortal) {
  if (typeof window === 'undefined') return;
  const k = KEYS[portal];
  localStorage.removeItem(k.access);
  localStorage.removeItem(k.refresh);
}

export function clearAllTokens() {
  clearTokens('client');
  clearTokens('platform');
}
