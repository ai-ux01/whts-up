'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { connectSocket } from '@/lib/socket';
import { getTokens } from '@/lib/auth-tokens';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const token = getTokens('client').access;
    if (user?.portal === 'platform') {
      router.replace('/admin');
      return;
    }
    if (!user && !token) {
      router.replace('/login');
      return;
    }
    if (token && user?.portal === 'client') connectSocket(token);
  }, [user, router]);

  if (
    !user &&
    typeof window !== 'undefined' &&
    !getTokens('client').access
  ) {
    return null;
  }

  if (user?.portal === 'platform') return null;

  return <>{children}</>;
}
