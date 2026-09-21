import {
  clearTokens,
  getTokens,
  setTokens,
  type AuthPortal,
} from '@/lib/auth-tokens';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Guard against shipping a production build that silently points at localhost.
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXT_PUBLIC_API_URL &&
  typeof window !== 'undefined'
) {
  // eslint-disable-next-line no-console
  console.error(
    'NEXT_PUBLIC_API_URL is not set — API calls will target localhost:4000 and fail in production.',
  );
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  portal?: AuthPortal;
};

function detectPortal(path: string, explicit?: AuthPortal): AuthPortal {
  if (explicit) return explicit;
  return path.startsWith('/platform') ? 'platform' : 'client';
}

async function refreshAccessToken(portal: AuthPortal): Promise<string | null> {
  // Refresh token is sent automatically via the httpOnly cookie.
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: '{}',
  });

  if (!res.ok) return null;
  const data = await res.json();
  setTokens(portal, data.accessToken);
  return data.accessToken;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const portal = detectPortal(path, options.portal);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (!options.skipAuth && typeof window !== 'undefined') {
    const { access } = getTokens(portal);
    if (access) headers.Authorization = `Bearer ${access}`;
    // Multi-business: send the active workspace so the API scopes to it.
    const activeWs = localStorage.getItem('activeWorkspaceId');
    if (activeWs) headers['X-Workspace-Id'] = activeWs;
  }

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !options.skipAuth) {
    const newToken = await refreshAccessToken(portal);
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      // Refresh failed (expired/missing session). Clear the dead session and
      // send the user back to the right login screen instead of looping on 401.
      // clearTokens also expires the hasSession marker cookie the middleware reads.
      clearTokens(portal);
      if (typeof window !== 'undefined') {
        const loginPath = portal === 'platform' ? '/admin/login' : '/login';
        if (!window.location.pathname.startsWith(loginPath)) {
          window.location.assign(loginPath);
        }
      }
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Upload with auth for campaigns CSV (client portal). */
export async function apiUpload(
  path: string,
  form: FormData,
  portal: AuthPortal = 'client',
) {
  const { access } = getTokens(portal);
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: access ? { Authorization: `Bearer ${access}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Upload failed');
  }
  return res.json();
}

/** Download CSV or other file with auth (client portal). */
export async function apiDownload(path: string, filename: string) {
  const { access } = getTokens('client');
  const res = await fetch(`${API_URL}${path}`, {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { API_URL, clearTokens };
