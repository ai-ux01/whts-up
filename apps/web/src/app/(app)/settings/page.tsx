'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MarketingAccount {
  id: string;
  name: string;
  connected: boolean;
  configured: boolean;
  hint?: string;
}

interface Settings {
  whatsappPhoneNumberId: string | null;
  whatsappConnected: boolean;
  webhookVerifyToken: string | null;
  webhookBaseUrl: string | null;
  metaAdsAccountId: string | null;
  metaPageId: string | null;
  googleAdsCustomerId: string | null;
  facebookPixelId: string | null;
  instagramUsername: string | null;
  defaultUtmSource: string | null;
  marketingAccounts?: MarketingAccount[];
  aiEnabled: boolean;
  aiSystemPrompt: string | null;
  businessName: string | null;
  secretsEncrypted?: boolean;
  metaOAuth?: { connected: boolean; connectedAt?: string | null };
  googleOAuth?: { connected: boolean; connectedAt?: string | null };
}

interface Agent {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Automation {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
}

function OAuthCallbackToasts() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const status = searchParams.get('status');
    const message = searchParams.get('message');
    if (!oauth || !status) return;

    if (status === 'success') {
      toast.success(
        message ||
          (oauth === 'meta' ? 'Meta connected' : 'Google Ads connected'),
      );
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } else {
      toast.error(message || `${oauth} connection failed`);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('oauth');
    url.searchParams.delete('status');
    url.searchParams.delete('message');
    window.history.replaceState({}, '', url.pathname);
  }, [searchParams, queryClient]);

  return null;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [phoneId, setPhoneId] = useState('');
  const [token, setToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [autoName, setAutoName] = useState('');
  const [autoMessage, setAutoMessage] = useState('');
  const [metaAdsAccountId, setMetaAdsAccountId] = useState('');
  const [metaPageId, setMetaPageId] = useState('');
  const [googleAdsCustomerId, setGoogleAdsCustomerId] = useState('');
  const [facebookPixelId, setFacebookPixelId] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [defaultUtmSource, setDefaultUtmSource] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<Settings>('/workspaces/settings'),
    enabled: user?.role === 'ADMIN',
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api<Agent[]>('/users/agents'),
    enabled: user?.role === 'ADMIN',
  });

  const { data: automations = [] } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api<Automation[]>('/automations'),
    enabled: user?.role === 'ADMIN',
  });

  useEffect(() => {
    if (settings) {
      setPhoneId(settings.whatsappPhoneNumberId || '');
      setVerifyToken(settings.webhookVerifyToken || '');
      setAiEnabled(settings.aiEnabled);
      setAiPrompt(settings.aiSystemPrompt || '');
      setBusinessName(settings.businessName || '');
      setMetaAdsAccountId(settings.metaAdsAccountId || '');
      setMetaPageId(settings.metaPageId || '');
      setGoogleAdsCustomerId(settings.googleAdsCustomerId || '');
      setFacebookPixelId(settings.facebookPixelId || '');
      setInstagramUsername(settings.instagramUsername || '');
      setDefaultUtmSource(settings.defaultUtmSource || '');
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api('/workspaces/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          whatsappPhoneNumberId: phoneId,
          whatsappAccessToken: token || undefined,
          webhookVerifyToken: verifyToken,
          aiEnabled,
          aiSystemPrompt: aiPrompt,
          businessName,
          metaAdsAccountId,
          metaPageId,
          googleAdsCustomerId,
          facebookPixelId,
          instagramUsername,
          defaultUtmSource,
        }),
      }),
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const createAgentMutation = useMutation({
    mutationFn: () =>
      api('/users/agents', {
        method: 'POST',
        body: JSON.stringify({
          email: agentEmail,
          name: agentName,
          password: agentPassword,
        }),
      }),
    onSuccess: () => {
      toast.success('Agent created');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setAgentEmail('');
      setAgentName('');
      setAgentPassword('');
    },
    onError: (e) => toast.error(e.message),
  });

  const connectMetaMutation = useMutation({
    mutationFn: async () => {
      const { url } = await api<{ url: string }>('/integrations/meta/connect-url');
      window.location.href = url;
    },
    onError: (e) => toast.error(e.message),
  });

  const disconnectMetaMutation = useMutation({
    mutationFn: () =>
      api('/integrations/meta/disconnect', { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Meta disconnected');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const { url } = await api<{ url: string }>('/integrations/google/connect-url');
      window.location.href = url;
    },
    onError: (e) => toast.error(e.message),
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: () =>
      api('/integrations/google/disconnect', { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Google Ads disconnected');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const testWhatsAppMutation = useMutation({
    mutationFn: () =>
      api<{ ok: boolean; method: string; templateName?: string }>(
        '/workspaces/settings/test-whatsapp',
        {
          method: 'POST',
          body: JSON.stringify({ phone: testPhone }),
        },
      ),
    onSuccess: (data) => {
      toast.success(
        data.method === 'template'
          ? `Test template "${data.templateName}" sent`
          : 'Test message sent',
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const createAutoMutation = useMutation({
    mutationFn: () =>
      api('/automations', {
        method: 'POST',
        body: JSON.stringify({
          name: autoName,
          trigger: 'NO_REPLY_24H',
          action: 'SEND_MESSAGE',
          config: { message: autoMessage },
          enabled: true,
        }),
      }),
    onSuccess: () => {
      toast.success('Automation created');
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setAutoName('');
      setAutoMessage('');
    },
    onError: (e) => toast.error(e.message),
  });

  if (user?.role !== 'ADMIN') {
    return (
      <p className="text-muted-foreground">
        Settings are only available to workspace admins.
      </p>
    );
  }

  const webhookBase =
    settings?.webhookBaseUrl ||
    process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL ||
    API_URL.replace('/api/v1', '');
  const webhookUrlPrimary = `${webhookBase}/api/v1/whatsapp/webhook`;
  const webhookUrlShort = `${webhookBase}/v1/whatsapp/webhook`;

  return (
    <div className="space-y-6 max-w-2xl">
      <Suspense fallback={null}>
        <OAuthCallbackToasts />
      </Suspense>
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          WhatsApp, digital marketing accounts, AI, team & automations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Cloud API</CardTitle>
          <CardDescription>
            Connect your Meta WhatsApp Business account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.secretsEncrypted && (
            <p className="text-xs text-muted-foreground">
              Access tokens are encrypted at rest in the database.
            </p>
          )}
          <div className="rounded-lg bg-muted p-3 text-sm break-all space-y-2">
            <p className="font-medium">Webhook URL (use in Meta)</p>
            <p className="text-muted-foreground">{webhookUrlPrimary}</p>
            <p className="text-xs text-muted-foreground">
              Also works: {webhookUrlShort}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Phone Number ID</Label>
            <Input value={phoneId} onChange={(e) => setPhoneId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Access Token</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={settings?.whatsappConnected ? '••••••••' : 'Paste token'}
            />
          </div>
          <div className="space-y-2">
            <Label>Webhook Verify Token</Label>
            <Input
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="your-webhook-verify-token"
            />
            <p className="text-xs text-muted-foreground">
              Must match Meta → Webhook → Verify token and{' '}
              <code className="text-xs">WHATSAPP_VERIFY_TOKEN</code> in{' '}
              <code className="text-xs">apps/api/.env</code>. Do not open the
              webhook URL in the browser — use Meta&apos;s Verify and save button.
            </p>
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <Label>Test delivery</Label>
            <p className="text-xs text-muted-foreground">
              Sends the <code>hello_world</code> template (or{' '}
              <code>WHATSAPP_TEST_TEMPLATE</code> in API env). Number must be on
              Meta&apos;s test allowlist in Development mode.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="+919999575357"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => testWhatsAppMutation.mutate()}
                disabled={
                  !testPhone.trim() ||
                  testWhatsAppMutation.isPending ||
                  !settings?.whatsappConnected
                }
              >
                Send test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digital marketing accounts</CardTitle>
          <CardDescription>
            Link Meta Ads, Google Ads, and tracking IDs. Leads from Click-to-WhatsApp
            ads are tagged automatically when Meta sends referral data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.marketingAccounts && (
            <div className="flex flex-wrap gap-2">
              {settings.marketingAccounts.map((a) => (
                <Badge
                  key={a.id}
                  variant={a.configured ? 'default' : 'outline'}
                >
                  {a.name}
                  {a.configured ? ' ✓' : ''}
                </Badge>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">Meta (Facebook)</p>
                <p className="text-xs text-muted-foreground">
                  Ads account, Page, and WhatsApp Business assets
                </p>
              </div>
              {settings?.metaOAuth?.connected ? (
                <Badge>OAuth connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => connectMetaMutation.mutate()}
                disabled={connectMetaMutation.isPending}
              >
                Connect Meta
              </Button>
              {settings?.metaOAuth?.connected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectMetaMutation.mutate()}
                  disabled={disconnectMetaMutation.isPending}
                >
                  Disconnect
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires <code>META_APP_ID</code> and redirect URI in Meta app →
              Facebook Login → Valid OAuth Redirect URIs:{' '}
              <code className="break-all">
                http://localhost:4000/api/v1/integrations/meta/callback
              </code>
            </p>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">Google Ads</p>
                <p className="text-xs text-muted-foreground">
                  Links customer ID for UTM / conversion tracking
                </p>
              </div>
              {settings?.googleOAuth?.connected ? (
                <Badge>OAuth connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => connectGoogleMutation.mutate()}
                disabled={connectGoogleMutation.isPending}
              >
                Connect Google
              </Button>
              {settings?.googleOAuth?.connected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectGoogleMutation.mutate()}
                  disabled={disconnectGoogleMutation.isPending}
                >
                  Disconnect
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>,
              and <code>GOOGLE_ADS_DEVELOPER_TOKEN</code> for auto customer ID.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Or enter IDs manually below and save.
          </p>

          <div className="space-y-2">
            <Label>Meta Ads account ID</Label>
            <Input
              value={metaAdsAccountId}
              onChange={(e) => setMetaAdsAccountId(e.target.value)}
              placeholder="act_123456789"
            />
            <p className="text-xs text-muted-foreground">
              Business Manager → Ads account ID (for Click-to-WhatsApp campaigns)
            </p>
          </div>
          <div className="space-y-2">
            <Label>Facebook Page ID</Label>
            <Input
              value={metaPageId}
              onChange={(e) => setMetaPageId(e.target.value)}
              placeholder="Page ID linked to WABA"
            />
          </div>
          <div className="space-y-2">
            <Label>Google Ads customer ID</Label>
            <Input
              value={googleAdsCustomerId}
              onChange={(e) => setGoogleAdsCustomerId(e.target.value)}
              placeholder="123-456-7890"
            />
            <p className="text-xs text-muted-foreground">
              Use UTMs on landing links: ?utm_source=google&utm_medium=cpc
            </p>
          </div>
          <div className="space-y-2">
            <Label>Meta Pixel ID</Label>
            <Input
              value={facebookPixelId}
              onChange={(e) => setFacebookPixelId(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Instagram username</Label>
            <Input
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value)}
              placeholder="yourbrand"
            />
          </div>
          <div className="space-y-2">
            <Label>Default UTM source</Label>
            <Input
              value={defaultUtmSource}
              onChange={(e) => setDefaultUtmSource(e.target.value)}
              placeholder="whatsapp"
            />
            <p className="text-xs text-muted-foreground">
              Applied to inbound chats without ad referral (e.g. organic WhatsApp)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Auto Reply</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable AI replies</Label>
            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
          </div>
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>System prompt</Label>
            <Textarea
              rows={5}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team — Invite Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {agents.map((a) => (
            <div key={a.id} className="flex justify-between text-sm border-b border-border pb-2">
              <span>{a.name} ({a.email})</span>
              <span className="text-muted-foreground">{a.role}</span>
            </div>
          ))}
          <div className="space-y-2">
            <Label>Agent name</Label>
            <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Agent email</Label>
            <Input value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={agentPassword} onChange={(e) => setAgentPassword(e.target.value)} />
          </div>
          <Button onClick={() => createAgentMutation.mutate()}>Add agent</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation</CardTitle>
          <CardDescription>No reply in 24h → send follow-up</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {automations.map((a) => (
            <div key={a.id} className="text-sm border-b border-border pb-2">
              {a.name} — {a.trigger} {a.enabled ? '✓' : 'off'}
            </div>
          ))}
          <div className="space-y-2">
            <Label>Rule name</Label>
            <Input value={autoName} onChange={(e) => setAutoName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Follow-up message</Label>
            <Textarea value={autoMessage} onChange={(e) => setAutoMessage(e.target.value)} />
          </div>
          <Button onClick={() => createAutoMutation.mutate()}>Add automation</Button>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        Save all settings
      </Button>
    </div>
  );
}
