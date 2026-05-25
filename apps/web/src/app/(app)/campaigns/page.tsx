'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiUpload } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Campaign {
  id: string;
  name: string;
  templateName: string;
  status: string;
  scheduledAt: string | null;
  _count?: { recipients: number };
  recipientStats?: { pending: number; sent: number; failed: number };
  lastError?: string | null;
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [templateName, setTemplateName] = useState('hello_world');
  const { data: templateData } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () =>
      api<{
        templates: Array<{ name: string; language: string; status: string }>;
        error?: string;
      }>('/workspaces/whatsapp/templates'),
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api<Campaign[]>('/campaigns'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api<Campaign>('/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name, templateName, templateParams: {} }),
      }),
    onSuccess: () => {
      toast.success('Campaign created');
      setName('');
      setTemplateName('hello_world');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const scheduleMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ sent: number; failed: number; queued?: boolean }>(
        `/campaigns/${id}/schedule`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      ),
    onSuccess: (data) => {
      if ('queued' in data && data.queued) {
        toast.success('Campaign queued — sending in the background');
      } else if (data.failed > 0) {
        toast.warning(`Sent ${data.sent}, failed ${data.failed}. Check errors below.`);
      } else {
        toast.success(`Sent to ${data.sent} recipient(s)`);
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ sent: number; failed: number; queued?: boolean }>(
        `/campaigns/${id}/send-now`,
        {
          method: 'POST',
        },
      ),
    onSuccess: (data) => {
      if ('queued' in data && data.queued) {
        toast.success('Retry queued in background');
      } else if (data.failed > 0) {
        toast.warning(`Sent ${data.sent}, failed ${data.failed}`);
      } else {
        toast.success(`Sent to ${data.sent} recipient(s)`);
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e) => toast.error(e.message),
  });

  async function uploadCsv(campaignId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiUpload(
        `/campaigns/${campaignId}/upload-csv`,
        form,
        'client',
      );
      toast.success(`Imported ${data.imported} contact(s)`);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-muted-foreground">
          Broadcast an approved Meta template to CSV contacts (sends immediately on
          schedule)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Campaign name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Template name (Meta approved)</Label>
            {templateData?.templates?.length ? (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              >
                {templateData.templates.map((t) => (
                  <option key={`${t.name}-${t.language}`} value={t.name}>
                    {t.name} ({t.language})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="hello_world"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {templateData?.error
                ? templateData.error
                : 'Approved templates from your WhatsApp Business account. Default test template is often hello_world (en_US).'}
              {' '}In Development mode, add each CSV number in Meta → API Setup →
              test recipients (error 131030 if missing).
            </p>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || !templateName || createMutation.isPending}
          >
            Create campaign
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Template: {c.templateName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge>{c.status}</Badge>
                  {c.status === 'RUNNING' && (
                    <Badge variant="outline">Sending…</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Recipients: {c._count?.recipients ?? 0}
                {c.recipientStats && (
                  <>
                    {' '}
                    · sent {c.recipientStats.sent} · failed{' '}
                    {c.recipientStats.failed} · pending{' '}
                    {c.recipientStats.pending}
                  </>
                )}
              </p>
              {c.lastError && (
                <p className="text-xs text-destructive break-all">{c.lastError}</p>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="file"
                  accept=".csv"
                  className="max-w-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadCsv(c.id, file);
                  }}
                />
                {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                  <Button
                    size="sm"
                    onClick={() => scheduleMutation.mutate(c.id)}
                    disabled={
                      scheduleMutation.isPending || !(c._count?.recipients ?? 0)
                    }
                  >
                    Send to CSV
                  </Button>
                )}
                {(c.status === 'COMPLETED' || c.status === 'FAILED') &&
                  (c.recipientStats?.failed ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendMutation.mutate(c.id)}
                      disabled={resendMutation.isPending}
                    >
                      Retry failed
                    </Button>
                  )}
              </div>
              <p className="text-xs text-muted-foreground">
                1. Upload <code>contacts.csv</code> · 2. Click Send to CSV
              </p>
            </div>
          ))}
          {!campaigns.length && (
            <p className="text-sm text-muted-foreground">No campaigns yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
