import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  clearAllTokens,
  clearTokens,
  setTokens,
  type AuthPortal,
} from '@/lib/auth-tokens';
import { API_URL } from '@/lib/api-client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string | null;
  workspaceName?: string | null;
  workspaceSlug?: string | null;
  portal: AuthPortal;
}

interface AuthState {
  user: AuthUser | null;
  // refreshToken kept in the signature for backward-compatible call sites; it is
  // ignored here because the refresh token is stored in an httpOnly cookie.
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setAuth: (user, accessToken) => {
        setTokens(user.portal, accessToken);
        set({ user });
      },
      logout: () => {
        const portal = get().user?.portal;
        // Best-effort: clear the httpOnly refresh cookie server-side.
        void fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => undefined);
        if (portal) clearTokens(portal);
        else clearAllTokens();
        set({ user: null });
      },
    }),
    { name: 'auth-user', partialize: (s) => ({ user: s.user }) },
  ),
);
