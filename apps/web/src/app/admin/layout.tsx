'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LogOut, Plus, Shield } from 'lucide-react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { disconnectSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  function handleLogout() {
    logout();
    disconnectSocket();
    router.replace('/admin/login');
  }

  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <p className="font-semibold">Platform Admin</p>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                {user?.name}
              </p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                pathname === '/admin'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Building2 className="h-4 w-4" />
              Clients
            </Link>
            <Link
              href="/admin/workspaces/new"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                pathname === '/admin/workspaces/new'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Plus className="h-4 w-4" />
              New client
            </Link>
          </nav>
          <div className="border-t border-border p-4">
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </Button>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
