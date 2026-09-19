'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiUpload } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SegmentsBuilder, type Segment } from '@/components/segments-builder';
import { CampaignStatus } from '@whats-up/shared';

interface Campaign {
  id: string;
  name: string;
  templateName?: string | null;
  status: CampaignStatus;
  scheduledAt: string | null;
  createdAt: string;
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL';
  subject?: string | null;
  body?: string | null;
  _count?: { recipients: number };
  recipientStats?: {
    total: number;
    sent: number;
    read: number;
    replied: number;
    clicked: number;
    pending: number;
    failed: number;
  };
  lastError?: string | null;
  segmentId?: string | null;
  segment?: { id: string; name: string } | null;
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [templateName, setTemplateName] = useState('hello_world');
  const [targetType, setTargetType] = useState<'csv' | 'segment'>('csv');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [templateParamsInput, setTemplateParamsInput] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [channel, setChannel] = useState<'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL'>('WHATSAPP');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Fetch approved Meta templates
  const { data: templateData } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () =>
      api<{
        templates: Array<{ name: string; language: string; status: string }>;
        error?: string;
      }>('/workspaces/whatsapp/templates'),
  });

  // Fetch active segments
  const { data: segments = [] } = useQuery({
    queryKey: ['segments'],
    queryFn: () => api<Segment[]>('/segments'),
  });

  // Fetch campaigns history
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api<Campaign[]>('/campaigns'),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      let parsedParams = {};
      if (channel === 'WHATSAPP' && templateParamsInput.trim()) {
        try {
          parsedParams = JSON.parse(templateParamsInput.trim());
        } catch {
          throw new Error('Invalid JSON format for Template Parameters.');
        }
      }
      return api<Campaign>('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name,
          templateName: channel === 'WHATSAPP' ? templateName : null,
          templateParams: channel === 'WHATSAPP' ? parsedParams : null,
          segmentId: targetType === 'segment' ? selectedSegmentId : null,
          channel,
          subject: channel === 'EMAIL' ? subject : null,
          body: channel !== 'WHATSAPP' ? body : null,
        }),
      });
    },
    onSuccess: () => {
      toast.success('Campaign created successfully');
      setName('');
      setTemplateName('hello_world');
      setTemplateParamsInput('');
      setSelectedSegmentId('');
      setSubject('');
      setBody('');
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
          Broadcast Meta templates to segments or uploaded CSV files.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
          <CardDescription>Configure target audience and template parameters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g. Black Friday Special Offer"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Campaign Channel</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-medium"
                value={channel}
                onChange={(e) => setChannel(e.target.value as 'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL')}
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="INSTAGRAM">Instagram DM</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            {channel === 'WHATSAPP' && (
              <div className="space-y-2">
                <Label>Meta Approved Template</Label>
                {templateData?.templates?.length ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
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
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Label className="text-sm font-semibold">Target Audience</Label>
            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  checked={targetType === 'csv'}
                  onChange={() => setTargetType('csv')}
                  className="text-primary focus:ring-primary"
                />
                CSV Import File
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  checked={targetType === 'segment'}
                  onChange={() => setTargetType('segment')}
                  className="text-primary focus:ring-primary"
                />
                Dynamic Segment
              </label>
            </div>
          </div>

          {targetType === 'segment' && (
            <div className="space-y-3 p-3 bg-muted/30 border border-border rounded-xl">
              <div className="flex justify-between items-center">
                <Label>Target Segment</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={() => setShowBuilder(!showBuilder)}
                >
                  {showBuilder ? 'Hide Segment Builder' : 'Manage Segments'}
                </Button>
              </div>

              {showBuilder && (
                <div className="border border-border rounded-xl p-4 bg-background shadow-inner mb-2">
                  <SegmentsBuilder />
                </div>
              )}

              {segments.length > 0 ? (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  value={selectedSegmentId}
                  onChange={(e) => setSelectedSegmentId(e.target.value)}
                >
                  <option value="">Select a segment...</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No segments found. Open Segment Builder above to create one.
                </p>
              )}
            </div>
          )}

          {channel === 'WHATSAPP' ? (
            <div className="space-y-2 border-t border-border pt-4">
              <Label>Template Parameters (Optional JSON)</Label>
              <Input
                value={templateParamsInput}
                onChange={(e) => setTemplateParamsInput(e.target.value)}
                placeholder='e.g. {"1": "{{contact.name}}", "2": "WUP10"}'
              />
              <p className="text-[10px] text-muted-foreground">
                Map index variables to dynamic properties using{' '}
                <code>{"{{contact.name}}"}</code> or <code>{"{{contact.phone}}"}</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-4 border-t border-border pt-4">
              {channel === 'EMAIL' && (
                <div className="space-y-2">
                  <Label>Email Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. {{contact.name}}, check out our new catalog!"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Message Content</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-medium"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="e.g. Hello {{contact.name}}, here is your link: https://skyline.com/deals"
                />
                <p className="text-[10px] text-muted-foreground">
                  Insert dynamic placeholders like <code>{"{{contact.name}}"}</code> and <code>{"{{contact.phone}}"}</code>. URLs will be wrapped with click tracking.
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={() => createMutation.mutate()}
            disabled={
              !name ||
              (channel === 'WHATSAPP' && !templateName) ||
              (channel !== 'WHATSAPP' && !body) ||
              (channel === 'EMAIL' && !subject) ||
              createMutation.isPending ||
              (targetType === 'segment' && !selectedSegmentId)
            }
            className="w-full sm:w-auto"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Channel: <span className="font-semibold text-foreground">{c.channel}</span>
                    {c.channel === 'WHATSAPP' ? (
                      <> · Template: <code className="bg-muted px-1.5 py-0.5 rounded">{c.templateName}</code></>
                    ) : (
                      c.body && ` · Message: ${c.body.substring(0, 45)}${c.body.length > 45 ? '...' : ''}`
                    )}
                  </p>
                  {c.segment && (
                    <p className="text-xs text-primary font-medium mt-1">
                      Segment: {c.segment.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge>{c.status}</Badge>
                  {c.status === 'RUNNING' && <Badge variant="outline">Sending…</Badge>}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Recipients: {c._count?.recipients ?? 0}
                {c.recipientStats && (
                  <>
                    {' '}
                    · Sent/Delivered {c.recipientStats.sent} · Failed {c.recipientStats.failed} · Pending {c.recipientStats.pending}
                  </>
                )}
              </p>

              {c.recipientStats && c.recipientStats.sent > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border mt-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Read Rate</span>
                      <span className="text-foreground font-semibold">
                        {Math.round((c.recipientStats.read / c.recipientStats.sent) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((c.recipientStats.read / c.recipientStats.sent) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {c.recipientStats.read} of {c.recipientStats.sent} read
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Reply Rate</span>
                      <span className="text-foreground font-semibold">
                        {Math.round((c.recipientStats.replied / c.recipientStats.sent) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((c.recipientStats.replied / c.recipientStats.sent) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {c.recipientStats.replied} of {c.recipientStats.sent} replied
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Click Rate (CTR)</span>
                      <span className="text-foreground font-semibold">
                        {Math.round((c.recipientStats.clicked / c.recipientStats.sent) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((c.recipientStats.clicked / c.recipientStats.sent) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {c.recipientStats.clicked} of {c.recipientStats.sent} clicked
                    </p>
                  </div>
                </div>
              )}

              {c.lastError && <p className="text-xs text-destructive break-all">{c.lastError}</p>}

              <div className="flex flex-wrap gap-2 items-center">
                {!c.segmentId && (
                  <Input
                    type="file"
                    accept=".csv"
                    className="max-w-xs bg-background"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCsv(c.id, file);
                    }}
                  />
                )}
                {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                  <Button
                    size="sm"
                    onClick={() => scheduleMutation.mutate(c.id)}
                    disabled={scheduleMutation.isPending || (!c.segmentId && !(c._count?.recipients ?? 0))}
                  >
                    {c.segmentId ? 'Send to Segment' : 'Send to CSV'}
                  </Button>
                )}
                {(c.status === 'COMPLETED' || c.status === 'FAILED') && (c.recipientStats?.failed ?? 0) > 0 && (
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
                {c.segmentId
                  ? 'This campaign targets a dynamic segment. Segment size resolves at broadcast dispatch.'
                  : c.channel === 'WHATSAPP'
                    ? '1. Upload contacts.csv · 2. Click Send to CSV'
                    : '1. Upload contacts.csv (phone, name column) · 2. Click Send to CSV'}
              </p>
            </div>
          ))}
          {!campaigns.length && <p className="text-sm text-muted-foreground">No campaigns yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}
