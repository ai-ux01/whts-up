'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewClientWorkspacePage() {
  const router = useRouter();
  const [result, setResult] = useState<{
    workspace: { name: string; slug: string; webhookVerifyToken: string | null };
    admin: { email: string; name: string };
    clientLoginUrl: string;
    webhookUrl: string | null;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      api<typeof result>('/platform/workspaces', {
        method: 'POST',
        portal: 'platform',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Client workspace created');
    },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      workspaceName: form.get('workspaceName') as string,
      adminName: form.get('adminName') as string,
      adminEmail: form.get('adminEmail') as string,
      adminPassword: form.get('adminPassword') as string,
      businessName: (form.get('businessName') as string) || undefined,
    } as Record<string, string>);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create client workspace</h1>
        <p className="text-muted-foreground">
          Provisions a new tenant with its own dashboard (inbox, leads, campaigns,
          settings).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Business / workspace name</Label>
              <Input name="workspaceName" required placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Business name (optional)</Label>
              <Input name="businessName" placeholder="Acme Corp India" />
            </div>
            <div className="space-y-2">
              <Label>Admin full name</Label>
              <Input name="adminName" required placeholder="Jane Admin" />
            </div>
            <div className="space-y-2">
              <Label>Admin email (client login)</Label>
              <Input name="adminEmail" type="email" required />
            </div>
            <div className="space-y-2">
              <Label>Admin password</Label>
              <Input name="adminPassword" type="password" required minLength={8} />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create client'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Client ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Login:</span>{' '}
              <a href="/login" className="text-primary underline">
                /login
              </a>
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span>{' '}
              {result.admin.email}
            </p>
            <p>
              <span className="text-muted-foreground">Verify token:</span>{' '}
              {result.workspace.webhookVerifyToken}
            </p>
            {result.webhookUrl && (
              <p className="break-all">
                <span className="text-muted-foreground">Webhook:</span>{' '}
                {result.webhookUrl}
              </p>
            )}
            <Button className="mt-4" variant="outline" onClick={() => router.push('/admin')}>
              Back to clients
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
