import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  clearAllTokens,
  clearTokens,
  setTokens,
  type AuthPortal,
} from '@/lib/auth-tokens';

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
  setAuth: (
    user: AuthUser,
    accessToken: string,
    refreshToken: string,
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setAuth: (user, accessToken, refreshToken) => {
        setTokens(user.portal, accessToken, refreshToken);
        set({ user });
      },
      logout: () => {
        const portal = get().user?.portal;
        if (portal) clearTokens(portal);
        else clearAllTokens();
        set({ user: null });
      },
    }),
    { name: 'auth-user', partialize: (s) => ({ user: s.user }) },
  ),
);
