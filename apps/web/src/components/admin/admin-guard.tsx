'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { getTokens } from '@/lib/auth-tokens';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const token = getTokens('platform').access;
    if (user?.portal === 'platform' && user.role === 'SUPER_ADMIN') return;
    if (!user && token) return;
    router.replace('/admin/login');
  }, [user, router]);

  if (
    user?.portal !== 'platform' ||
    user.role !== 'SUPER_ADMIN'
  ) {
    if (typeof window !== 'undefined' && getTokens('platform').access) {
      return null;
    }
    return null;
  }

  return <>{children}</>;
}
