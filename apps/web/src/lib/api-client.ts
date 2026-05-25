import {
  clearTokens,
  getTokens,
  setTokens,
  type AuthPortal,
} from '@/lib/auth-tokens';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  portal?: AuthPortal;
};

function detectPortal(path: string, explicit?: AuthPortal): AuthPortal {
  if (explicit) return explicit;
  return path.startsWith('/platform') ? 'platform' : 'client';
}

async function refreshAccessToken(portal: AuthPortal): Promise<string | null> {
  const { refresh } = getTokens(portal);
  if (!refresh) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  setTokens(portal, data.accessToken, data.refreshToken);
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
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !options.skipAuth) {
    const newToken = await refreshAccessToken(portal);
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
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
