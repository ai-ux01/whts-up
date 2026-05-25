'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientWorkspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  whatsappConnected: boolean;
  marketingConnected: number;
  createdAt: string;
  counts: {
    users: number;
    conversations: number;
    leads: number;
    campaigns: number;
  };
  adminUser: { email: string; name: string } | null;
  webhookUrl: string | null;
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['platform-workspaces'],
    queryFn: () => api<ClientWorkspace[]>('/platform/workspaces', { portal: 'platform' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/platform/workspaces/${id}`, {
        method: 'PATCH',
        portal: 'platform',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-workspaces'] });
      toast.success('Workspace updated');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client workspaces</h1>
          <p className="text-muted-foreground">
            Each client gets their own inbox, leads, campaigns, and settings at{' '}
            <code className="text-sm">/login</code>
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/workspaces/new">Create client</Link>
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading clients...</p>
      )}

      <div className="grid gap-4">
        {workspaces.map((w) => (
          <Card key={w.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{w.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {w.slug} · admin: {w.adminUser?.email ?? '—'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={w.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {w.status}
                  </Badge>
                  {w.whatsappConnected && (
                    <Badge variant="outline">WhatsApp</Badge>
                  )}
                  {w.marketingConnected > 1 && (
                    <Badge variant="outline">
                      {w.marketingConnected} channels
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {w.counts.conversations} chats · {w.counts.leads} leads ·{' '}
                {w.counts.campaigns} campaigns · {w.counts.users} users
              </p>
              {w.webhookUrl && (
                <p className="text-xs break-all text-muted-foreground">
                  Webhook: {w.webhookUrl}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {w.status === 'ACTIVE' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({ id: w.id, status: 'SUSPENDED' })
                    }
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({ id: w.id, status: 'ACTIVE' })
                    }
                  >
                    Activate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && workspaces.length === 0 && (
          <p className="text-muted-foreground">No clients yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
