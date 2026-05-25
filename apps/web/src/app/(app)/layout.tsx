'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SocketProvider } from '@/components/socket-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthGuard>
      <SocketProvider>
        <div className="flex min-h-screen">
          <AppSidebar />
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-card transition-transform md:hidden ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <AppSidebar />
          </div>
          <div className="flex flex-1 flex-col">
            <AppHeader onMenuClick={() => setMobileOpen(true)} />
            <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      </SocketProvider>
    </AuthGuard>
  );
}
