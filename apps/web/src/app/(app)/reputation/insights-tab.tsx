'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Sparkles, RefreshCw, Trophy, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ReputationInsight {
  id: string;
  insight: string;
  category: string;
  createdAt: string;
}

export default function InsightsTab() {
  const queryClient = useQueryClient();

  // Fetch AI insights
  const { data: insights, isLoading } = useQuery<ReputationInsight[]>({
    queryKey: ['insightsList'],
    queryFn: () => api<ReputationInsight[]>('/reputation/insights'),
  });

  // Re-generate insights mutation
  const generateMutation = useMutation({
    mutationFn: () => api('/reputation/insights/generate', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Successfully scanned customer feedback and compiled new insights!');
      queryClient.invalidateQueries({ queryKey: ['insightsList'] });
    },
    onError: () => {
      toast.error('AI Insights compiler failed. Please verify OpenAI credentials.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            AI Reputation & Sentiment Scanner
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Our AI scans comments across all Google reviews and private messages, clusters operational concerns, isolates employee mentions, and outputs highly practical growth insights.
          </p>
        </div>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 text-sm shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
          {generateMutation.isPending ? 'Analyzing Feedback...' : 'Scan & Compile Insights'}
        </button>
      </div>

      {/* Insights List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !insights || insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="font-bold text-lg">No insights generated</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {"Click the \"Scan & Compile Insights\" button above to evaluate your feedback entries and generate business recommendations."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {insights.map((item) => {
            const category = item.category || 'CSAT_OVERVIEW';

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-5 shadow-sm space-y-3 flex gap-4 items-start bg-card transition-all hover:shadow-md ${
                  category === 'COMPLAINT_TREND'
                    ? 'border-red-500/20 hover:border-red-500/35'
                    : category === 'POSITIVE_HIGHLIGHT'
                    ? 'border-green-500/20 hover:border-green-500/35'
                    : 'border-indigo-500/20 hover:border-indigo-500/35'
                }`}
              >
                {/* Visual Icon Box */}
                <div
                  className={`rounded-lg p-2.5 mt-0.5 shrink-0 ${
                    category === 'COMPLAINT_TREND'
                      ? 'bg-red-500/10 text-red-400'
                      : category === 'POSITIVE_HIGHLIGHT'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-indigo-500/10 text-indigo-400'
                  }`}
                >
                  {category === 'COMPLAINT_TREND' && <AlertTriangle className="h-5 w-5" />}
                  {category === 'POSITIVE_HIGHLIGHT' && <Trophy className="h-5 w-5" />}
                  {category === 'CSAT_OVERVIEW' && <ShieldCheck className="h-5 w-5" />}
                  {category !== 'COMPLAINT_TREND' &&
                    category !== 'POSITIVE_HIGHLIGHT' &&
                    category !== 'CSAT_OVERVIEW' && <HelpCircle className="h-5 w-5" />}
                </div>

                {/* Insight Text */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        category === 'COMPLAINT_TREND'
                          ? 'text-red-400'
                          : category === 'POSITIVE_HIGHLIGHT'
                          ? 'text-green-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      {category.replace('_', ' ')}
                    </span>
                    <span className="inline-flex rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      AI Generated
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-slate-200">{item.insight}</p>
                  <p className="text-xs text-muted-foreground pt-1">
                    Compiled on{' '}
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
