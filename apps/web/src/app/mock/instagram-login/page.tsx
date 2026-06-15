'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { connectSocket } from '@/lib/socket';

function InstagramLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const action = searchParams.get('action'); // 'login' or empty
  const oauth = searchParams.get('oauth'); // 'true' or empty
  const state = searchParams.get('state') || '';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate the credentials provided by the user
    if (email.trim().toLowerCase() !== 'sales@avisoft.in' || password !== 'Sales@Avi1') {
      setError('The username or password you entered is incorrect. Please use your credentials (sales@avisoft.in).');
      setLoading(false);
      return;
    }

    try {
      if (action === 'login') {
        // Logging into the application itself via mock Instagram login
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
          body: JSON.stringify({ email, password }),
        });

        setAuth(
          { ...data.user, portal: 'client' },
          data.accessToken,
          data.refreshToken,
        );
        connectSocket(data.accessToken);
        toast.success('Logged in successfully via Instagram!');
        router.push('/dashboard');
      } else if (oauth === 'true') {
        // Performing OAuth connection/integration (via Meta callback)
        toast.success('Authorized Instagram account successfully!');
        const callbackUrl = `http://localhost:4000/api/v1/integrations/meta/callback?code=mock_avisoft_code&state=${state}`;
        window.location.href = callbackUrl;
      } else {
        toast.success('Authenticated successfully.');
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 font-sans text-sm">
      <Card className="w-full max-w-[350px] border border-gray-200 shadow-none rounded-sm bg-white p-5">
        <CardHeader className="flex flex-col items-center pb-6 pt-4">
          <h1 className="text-3xl font-serif italic text-zinc-800 select-none tracking-wide">Instagram</h1>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleLogin} className="space-y-3">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 text-center">
                {error}
              </div>
            )}

            <div>
              <Input
                type="text"
                placeholder="Phone number, username or email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[38px] text-xs bg-zinc-50 border-gray-200 rounded-sm focus:border-gray-400 focus:bg-white focus:ring-0"
                required
              />
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[38px] text-xs bg-zinc-50 border-gray-200 rounded-sm focus:border-gray-400 focus:bg-white focus:ring-0"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-[32px] bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold rounded-sm text-xs transition-colors"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400 font-semibold uppercase">or</span>
            </div>
          </div>

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={() => {
                setEmail('sales@avisoft.in');
                setPassword('Sales@Avi1');
              }}
              className="text-xs font-semibold text-[#385185] hover:underline"
            >
              Auto-fill demo credentials
            </button>
            <div>
              <a href="#" className="text-xs text-[#385185] hover:underline">Forgot password?</a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-[350px] border border-gray-200 shadow-none rounded-sm bg-white p-4 mt-3 text-center">
        <p className="text-xs text-zinc-600">
          Don&apos;t have an account?{' '}
          <a href="#" className="font-semibold text-[#0095f6] hover:underline">Sign up</a>
        </p>
      </Card>
    </div>
  );
}

export default function InstagramLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <InstagramLoginForm />
    </Suspense>
  );
}
