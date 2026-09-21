'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, IndianRupee, Sparkles, Trophy } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { leadSourceLabel } from '@/lib/lead-source';

interface Analytics {
  acquisition: { source: string; leads: number }[];
  conversion: { leads: number; interested: number; followUp: number; customers: number };
  economics: {
    revenue: number;
    customers: number;
    avgDealValue: number;
    conversionRate: number;
    adSpend: number;
    costPerLead: number;
    costPerCustomer: number;
    roas: number;
    adsConnected: boolean;
    note: string;
  };
  content: { caption: string; platforms: string[]; engagement: number }[];
  hasContentInsights: boolean;
}

export default function IntelligencePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['intelligence'],
    queryFn: () => api<Analytics>('/dashboard/intelligence'),
  });

  const { data: ai } = useQuery({
    queryKey: ['intelligence-interpret'],
    queryFn: () =>
      api<{ interpretation: string; generatedByAi: boolean }>('/dashboard/intelligence/interpret'),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  const maxLeads = Math.max(1, ...(data?.acquisition.map((a) => a.leads) ?? [1]));
  const funnel = [
    { label: 'Leads', value: data?.conversion.leads ?? 0 },
    { label: 'Interested', value: data?.conversion.interested ?? 0 },
    { label: 'Follow-up', value: data?.conversion.followUp ?? 0 },
    { label: 'Customers', value: data?.conversion.customers ?? 0 },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <TrendingUp className="h-6 w-6 text-primary" /> Intelligence
        </h1>
        <p className="text-muted-foreground">Where customers come from, and what converts.</p>
      </div>

      {/* AI interpretation */}
      {ai?.interpretation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm">{ai.interpretation}</p>
              {!ai.generatedByAi && (
                <p className="mt-1 text-xs text-muted-foreground">Rule-based summary (AI not configured)</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Economics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-muted-foreground">Revenue</p>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">₹{data?.economics.revenue.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-muted-foreground">Customers</p>
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data?.economics.customers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Avg deal</p>
            <p className="mt-2 text-2xl font-bold">₹{data?.economics.avgDealValue.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Conversion</p>
            <p className="mt-2 text-2xl font-bold">{data?.economics.conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Ad economics — only when a Meta ad account is connected */}
      {data?.economics.adsConnected && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Ad Spend (mo)</p>
              <p className="mt-2 text-2xl font-bold">₹{data.economics.adSpend.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Cost / Lead</p>
              <p className="mt-2 text-2xl font-bold">₹{data.economics.costPerLead.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Cost / Customer</p>
              <p className="mt-2 text-2xl font-bold">₹{data.economics.costPerCustomer.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">ROAS</p>
              <p className="mt-2 text-2xl font-bold">{data.economics.roas}x</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Acquisition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Where customers come from
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.acquisition.length === 0 && (
              <p className="text-sm text-muted-foreground">No lead-source data yet.</p>
            )}
            {data?.acquisition.map((a) => (
              <div key={a.source}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{leadSourceLabel(a.source)}</span>
                  <span className="font-medium">{a.leads}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(a.leads / maxLeads) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Conversion funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="font-medium">{f.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${(f.value / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Content performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top content</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.hasContentInsights ? (
            <p className="text-sm text-muted-foreground">
              No published-post insights yet. Publish posts (with insights) to see performance here.
            </p>
          ) : (
            <div className="space-y-2">
              {data.content.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span className="truncate">{c.caption || '(no caption)'}</span>
                  <span className="text-xs text-muted-foreground">{c.engagement} eng.</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data?.economics.note && (
        <p className="text-xs text-muted-foreground">{data.economics.note}</p>
      )}
    </div>
  );
}
