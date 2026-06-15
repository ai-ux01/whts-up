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

function FacebookLoginForm() {
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

    // Validate the Facebook credentials provided by the user
    if (email.trim().toLowerCase() !== 'sales@avisoft.in' || password !== 'Sales@Avi1') {
      setError('The email or password you entered is incorrect. Please use your Facebook credentials (sales@avisoft.in).');
      setLoading(false);
      return;
    }

    try {
      if (action === 'login') {
        // Logging into the application itself via mock Facebook login
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
        toast.success('Logged in successfully via Facebook!');
        router.push('/dashboard');
      } else if (oauth === 'true') {
        // Performing OAuth connection/integration
        toast.success('Authorized Facebook account successfully!');
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0F2F5] p-4 font-sans">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-[#1877F2] tracking-tight">facebook</h1>
      </div>

      <Card className="w-full max-w-[400px] border-none shadow-md rounded-lg bg-white">
        <CardHeader className="space-y-1 pb-4 pt-6 text-center border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Log in to Facebook</h2>
          <p className="text-xs text-gray-500">To connect your page and Instagram account</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Input
                type="text"
                placeholder="Email address or phone number"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-gray-300 focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2]"
                required
              />
            </div>

            <div className="space-y-1">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-gray-300 focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2]"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold rounded-md text-base transition-colors"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <a href="#" className="text-xs text-[#1877F2] hover:underline">Forgotten account?</a>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-400">or</span>
            </div>
          </div>

          <div className="text-center pb-2">
            <button
              type="button"
              onClick={() => {
                setEmail('sales@avisoft.in');
                setPassword('Sales@Avi1');
              }}
              className="text-xs font-semibold text-[#1877F2] hover:underline"
            >
              Auto-fill demo credentials
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-xs text-gray-500 space-x-4">
        <span>English (UK)</span>
        <span>हिन्दी</span>
        <span>Français (France)</span>
        <span>Español</span>
      </div>
    </div>
  );
}

export default function FacebookLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <FacebookLoginForm />
    </Suspense>
  );
}
