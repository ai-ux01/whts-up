'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  MessageCircle,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Sparkles,
  ArrowRight,
  Search,
  Rocket,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkflowGuide } from '@/components/workflow-guide';

type Kpi = { value: number; period: string };
type Action = {
  id: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  detail?: string;
  cta: { label: string; href: string };
  count?: number;
};

interface Recommendation {
  id: string;
  title: string;
  category: string;
  priority: string;
  impactScore: number;
}

interface CommandCenter {
  greetingDate: string;
  kpis: {
    newLeads: Kpi;
    whatsappConversations: Kpi;
    interestedLeads: Kpi;
    closedLeads: Kpi;
  };
  pipeline: {
    new: number;
    interested: number;
    followUp: number;
    closed: number;
    total: number;
  };
  actions: Action[];
  recommendations: Recommendation[];
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    channel: string;
  }>;
}

const severityStyles: Record<Action['severity'], { dot: string; icon: typeof AlertTriangle }> = {
  high: { dot: 'text-red-500', icon: AlertTriangle },
  medium: { dot: 'text-amber-500', icon: Clock },
  low: { dot: 'text-blue-500', icon: FileText },
  info: { dot: 'text-emerald-500', icon: CheckCircle2 },
};

export default function CommandCenterPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['command-center'],
    queryFn: () => api<CommandCenter>('/dashboard/command-center'),
    refetchInterval: 60_000,
  });

  // Use the full display name — first-word splitting reads oddly for
  // business/role-style names (e.g. "Real Estate Admin" -> "Real").
  const greetingName = user?.name?.trim() || 'there';
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const kpiCards = [
    { label: 'New Leads', value: data?.kpis.newLeads.value ?? 0, period: data?.kpis.newLeads.period ?? '', icon: Users },
    { label: 'WhatsApp Chats', value: data?.kpis.whatsappConversations.value ?? 0, period: data?.kpis.whatsappConversations.period ?? '', icon: MessageCircle },
    { label: 'Interested', value: data?.kpis.interestedLeads.value ?? 0, period: data?.kpis.interestedLeads.period ?? '', icon: Flame },
    { label: 'Closed', value: data?.kpis.closedLeads.value ?? 0, period: data?.kpis.closedLeads.period ?? '', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Good day, {greetingName} 👋
          </h1>
          <p className="text-muted-foreground">Your Marketing Command Center · {today}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/content-studio">
            <Button variant="outline" size="sm">
              <Search className="mr-1 h-4 w-4" /> Find an idea
            </Button>
          </Link>
          <Link href="/campaign-engine">
            <Button size="sm">
              <Rocket className="mr-1 h-4 w-4" /> New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Workflow map — always visible so the journey is clear */}
      <WorkflowGuide />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
                <k.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-3xl font-bold">{isLoading ? '—' : k.value}</p>
              <p className="text-xs text-muted-foreground">{k.period}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Today&apos;s Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading &&
              data?.actions.map((a) => {
                const S = severityStyles[a.severity];
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start gap-3">
                      <S.icon className={cn('mt-0.5 h-5 w-5 shrink-0', S.dot)} />
                      <div>
                        <p className="font-medium">{a.title}</p>
                        {a.detail && (
                          <p className="text-sm text-muted-foreground">{a.detail}</p>
                        )}
                      </div>
                    </div>
                    <Link href={a.cta.href}>
                      <Button variant="outline" size="sm" className="shrink-0">
                        {a.cta.label} <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* Pipeline snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ['New', data?.pipeline.new ?? 0, 'bg-slate-400'],
                ['Interested', data?.pipeline.interested ?? 0, 'bg-amber-500'],
                ['Follow-up', data?.pipeline.followUp ?? 0, 'bg-blue-500'],
                ['Closed', data?.pipeline.closed ?? 0, 'bg-emerald-500'],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
                  <span className="text-sm">{label}</span>
                </div>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
            <div className="mt-2 border-t border-border pt-2">
              <Link href="/leads">
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  View all leads <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI recommendations (from the competitor/reputation engine, cached) */}
      {!!data?.recommendations?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recommendations.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <p className="text-sm">{r.title}</p>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                    r.priority === 'HIGH'
                      ? 'bg-red-500/10 text-red-500'
                      : r.priority === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-blue-500/10 text-blue-500',
                  )}
                >
                  {r.category}
                </span>
              </div>
            ))}
            <Link href="/competitors">
              <Button variant="ghost" size="sm" className="w-full justify-between">
                See all recommendations <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent campaigns */}
      {!!data?.recentCampaigns.length && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentCampaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.channel} · {c.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
