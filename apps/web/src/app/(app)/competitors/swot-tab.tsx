'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Sparkles,
  RefreshCw,
  Award,
  AlertTriangle,
  Zap,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';

interface SwotResponse {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export default function SwotTab() {
  // Query to fetch initially or fetch existing (triggers dynamically)
  const { data: swot, isLoading, refetch, isRefetching } = useQuery<SwotResponse>({
    queryKey: ['competitorSwot'],
    queryFn: () => api<SwotResponse>('/competitors/insights/swot', { method: 'POST' }),
  });

  // Force re-generate SWOT mutation
  const compileMutation = useMutation({
    mutationFn: () => api<SwotResponse>('/competitors/insights/swot', { method: 'POST' }),
    onSuccess: (data) => {
      toast.success('Successfully compiled SWOT Matrix comparing competitors!');
      refetch();
    },
    onError: () => {
      toast.error('SWOT compiler failed. Please check your OpenAI configuration.');
    },
  });

  return (
    <div className="space-y-6">
      {/* SWOT Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            AI SWOT Matrix Analysis
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Our AI scans your private feedbacks and public ratings against tracked competitors to compile a highly specific, customized Strengths, Weaknesses, Opportunities, and Threats playbook.
          </p>
        </div>

        <button
          onClick={() => compileMutation.mutate()}
          disabled={isLoading || isRefetching || compileMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 text-sm shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`h-4 w-4 ${(compileMutation.isPending || isRefetching) ? 'animate-spin' : ''}`} />
          {compileMutation.isPending || isRefetching ? 'Compiling SWOT...' : 'Scan & Compile SWOT Matrix'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI processing review comparison...</p>
          </div>
        </div>
      ) : !swot ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="font-bold text-lg text-white">No SWOT Matrix compiled</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Click the button above to trigger the AI SWOT compilation engine.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Card: Strengths (S) */}
          <div className="rounded-xl border border-emerald-500/20 bg-card p-6 shadow-sm flex flex-col gap-4 hover:border-emerald-500/35 transition-all">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Strengths (S)</h4>
                  <p className="text-xs text-muted-foreground">What you excel at compared to competitors</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>

            <ul className="space-y-3 flex-1">
              {swot.strengths?.map((item, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-slate-200">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                    ✓
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card: Weaknesses (W) */}
          <div className="rounded-xl border border-rose-500/20 bg-card p-6 shadow-sm flex flex-col gap-4 hover:border-rose-500/35 transition-all">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Weaknesses (W)</h4>
                  <p className="text-xs text-muted-foreground">Where competitors have a distinct edge</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-rose-400" />
            </div>

            <ul className="space-y-3 flex-1">
              {swot.weaknesses?.map((item, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-slate-200">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-xs font-bold text-rose-400">
                    ✕
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card: Opportunities (O) */}
          <div className="rounded-xl border border-indigo-500/20 bg-card p-6 shadow-sm flex flex-col gap-4 hover:border-indigo-500/35 transition-all">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400 shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Opportunities (O)</h4>
                  <p className="text-xs text-muted-foreground">Gaps left by competitors you can exploit</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-indigo-400" />
            </div>

            <ul className="space-y-3 flex-1">
              {swot.opportunities?.map((item, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-slate-200">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-400">
                    💡
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card: Threats (T) */}
          <div className="rounded-xl border border-amber-500/20 bg-card p-6 shadow-sm flex flex-col gap-4 hover:border-amber-500/35 transition-all">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Threats (T)</h4>
                  <p className="text-xs text-muted-foreground">Market moves by competitors that endanger you</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-amber-400" />
            </div>

            <ul className="space-y-3 flex-1">
              {swot.threats?.map((item, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-slate-200">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400">
                    ⚠
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
