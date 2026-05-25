'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { connectSocket } from '@/lib/socket';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          email: string;
          name: string;
          role: string;
          workspaceId: string;
          workspaceName?: string;
          portal: 'client' | 'platform';
        };
      }>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      setAuth(
        { ...data.user, portal: 'client' },
        data.accessToken,
        data.refreshToken,
      );
      connectSocket(data.accessToken);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Client sign in</CardTitle>
          <CardDescription>Your workspace inbox, leads & campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required defaultValue="admin@demo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required defaultValue="password123" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Platform admin?{' '}
            <Link href="/admin/login" className="text-primary hover:underline">
              Admin login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
