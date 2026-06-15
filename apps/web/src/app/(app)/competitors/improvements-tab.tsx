'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @typescript-eslint/no-unused-vars */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Sparkles,
  RefreshCw,
  Zap,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ImprovementSuggestion {
  id: string;
  suggestion: string;
  category: string;
  priority: string;
  impactScore: number;
  createdAt: string;
}

export default function ImprovementsTab() {
  // Fetch AI improvements
  const { data: list, isLoading, refetch, isRefetching } = useQuery<ImprovementSuggestion[]>({
    queryKey: ['competitorImprovementsList'],
    queryFn: () => api<ImprovementSuggestion[]>('/competitors/recommendations/improvements'),
  });

  // Regenerate recommendations mutation
  const generateMutation = useMutation({
    mutationFn: () => api<ImprovementSuggestion[]>('/competitors/recommendations/improvements/generate', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Successfully compiled fresh improvement action cards!');
      refetch();
    },
    onError: () => {
      toast.error('Failed to regenerate suggestions. Check OpenAI key configuration.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-400" />
            AI Product Improvement Engine
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Our recommendation engine compares competitor complaints directly with your feedbacks, offering prioritized, actionable business improvements with calculated growth impact scores.
          </p>
        </div>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={isLoading || isRefetching || generateMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 text-sm shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`h-4 w-4 ${(generateMutation.isPending || isRefetching) ? 'animate-spin' : ''}`} />
          {generateMutation.isPending || isRefetching ? 'Recalculating...' : 'Compile Recommendations'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI calculating growth potentials...</p>
          </div>
        </div>
      ) : !list || list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="font-bold text-lg text-white">No recommendations created</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Click the "Compile Recommendations" button above to run the AI engine.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {list.map((item) => {
            const priority = (item.priority || 'MEDIUM').toUpperCase();
            const impact = item.impactScore || 50;

            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                  priority === 'HIGH'
                    ? 'border-red-500/20 hover:border-red-500/35'
                    : priority === 'MEDIUM'
                    ? 'border-amber-500/20 hover:border-amber-500/35'
                    : 'border-blue-500/20 hover:border-blue-500/35'
                }`}
              >
                {/* Text and Description */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        priority === 'HIGH'
                          ? 'bg-red-500/10 text-red-400'
                          : priority === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {priority} PRIORITY
                    </span>
                    <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                      {item.category || 'Strategy'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">AI Suggested</span>
                  </div>

                  <p className="text-sm font-semibold leading-relaxed text-slate-200">{item.suggestion}</p>
                </div>

                {/* Progress bar and impact rating */}
                <div className="w-full md:w-56 space-y-2 shrink-0 md:border-l md:border-border/60 md:pl-5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      Growth Impact
                    </span>
                    <span className="text-white">{impact}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        impact >= 80
                          ? 'bg-emerald-500'
                          : impact >= 60
                          ? 'bg-indigo-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${impact}%` }}
                    />
                  </div>

                  <button className="w-full mt-2 rounded-lg bg-white/5 hover:bg-emerald-600 hover:text-white text-slate-300 font-semibold py-1.5 text-xs transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Accept Action Card
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
