'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @typescript-eslint/no-unused-vars */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Map,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface MarketGapInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
}

export default function MarketGapsTab() {
  // Fetch compiled market gaps list
  const { data: gaps, isLoading, refetch, isRefetching } = useQuery<MarketGapInsight[]>({
    queryKey: ['marketGapsList'],
    queryFn: () => api<MarketGapInsight[]>('/competitors/insights/market-gaps'),
  });

  // Regenerate market gaps mutation
  const regenerateMutation = useMutation({
    mutationFn: () => api<MarketGapInsight[]>('/competitors/insights/market-gaps/regenerate', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Successfully scanned competitor reviews and updated market gaps!');
      refetch();
    },
    onError: () => {
      toast.error('Gaps compilation failed. Verify OpenAI API key settings.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Market Gaps Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Map className="h-5 w-5 text-indigo-400" />
            AI Market Gap Detection Heatmap
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Our AI scans competitor reviews where rating falls below 3.0 stars to identify repeated complaints and operational bottlenecks, flagging them as highly profitable market entry gaps for you.
          </p>
        </div>

        <button
          onClick={() => regenerateMutation.mutate()}
          disabled={isLoading || isRefetching || regenerateMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 text-sm shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`h-4 w-4 ${(regenerateMutation.isPending || isRefetching) ? 'animate-spin' : ''}`} />
          {regenerateMutation.isPending || isRefetching ? 'Detecting Gaps...' : 'Scan Market & Detect Gaps'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI analyzing local business failures...</p>
          </div>
        </div>
      ) : !gaps || gaps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <BadgeAlert className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="font-bold text-lg text-white">No market gaps mapped yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Click the "Scan Market & Detect Gaps" button above to evaluate competitor vulnerabilities.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Visual Heatmap Indicators */}
          <div className="grid gap-4 sm:grid-cols-3">
            {gaps.map((gap, i) => (
              <div
                key={gap.id}
                className={`rounded-xl border p-5 shadow-sm space-y-2.5 bg-card hover:shadow-md transition-all ${
                  i === 0
                    ? 'border-indigo-500/20 hover:border-indigo-500/35 bg-gradient-to-br from-indigo-950/10 to-transparent'
                    : i === 1
                    ? 'border-emerald-500/20 hover:border-emerald-500/35 bg-gradient-to-br from-emerald-950/10 to-transparent'
                    : 'border-purple-500/20 hover:border-purple-500/35 bg-gradient-to-br from-purple-950/10 to-transparent'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                    i === 0 ? 'bg-indigo-500/10 text-indigo-400' : i === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'
                  }`}>
                    Gap Opportunity #{i + 1}
                  </span>
                  <span className="text-slate-500 text-xs font-semibold">High Priority</span>
                </div>
                <h4 className="font-bold text-white text-base leading-tight pt-1">{gap.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed truncate-2-lines">{gap.description}</p>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-primary pt-1.5 cursor-pointer hover:underline">
                  View full tactical plan <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Gaps Playbook */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border bg-muted/10 p-5">
              <h4 className="font-bold text-white text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                AI Market Gaps Detailed Action Playbook
              </h4>
              <p className="text-sm text-muted-foreground">Comprehensive strategic roadmap to exploit competitor weaknesses locally.</p>
            </div>

            <div className="divide-y divide-border/60">
              {gaps.map((gap, i) => (
                <div key={gap.id} className="p-6 flex flex-col md:flex-row gap-5 items-start bg-card hover:bg-muted/5 transition-colors">
                  <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-lg mt-0.5">
                    0{i + 1}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h5 className="font-bold text-white text-base leading-tight">{gap.title}</h5>
                      <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                        Competitor Weakness exploited
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-semibold">{gap.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Suggested strategy: Target competitor keywords on Google Search, publish comparative pricing matrices, and leverage WhatsApp auto-booking.</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
