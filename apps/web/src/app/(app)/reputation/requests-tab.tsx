'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Send, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackSummary {
  id: string;
  customerName: string;
  phone: string;
  rating: number;
  source: string;
  createdAt: string;
}

interface FeedbacksListData {
  total: number;
  data: FeedbackSummary[];
}

export default function RequestsTab() {
  const queryClient = useQueryClient();

  // Simulating inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch feedback submissions list as proxy of review requests & responses
  const { data: feedbacksData, isLoading } = useQuery<FeedbacksListData>({
    queryKey: ['feedbacksListSummary'],
    queryFn: () => api<FeedbacksListData>('/feedback'),
  });

  const triggerMutation = useMutation({
    mutationFn: (payload: { contactId: string; customerPhone: string; customerName: string }) =>
      api('/automations/trigger-service-completed', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: () => {
      toast.success(`Feedback WhatsApp request sent to ${customerPhone}!`);
      setCustomerName('');
      setCustomerPhone('');
      queryClient.invalidateQueries({ queryKey: ['reputationDashboard'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to trigger simulated WhatsApp request.');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const handleSimulateTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      toast.error('Please input customer name and phone.');
      return;
    }

    triggerMutation.mutate({
      contactId: 'demo-contact-id',
      customerPhone,
      customerName,
    });
  };

  const feedbacks = feedbacksData?.data || [];
  const totalSent = feedbacks.length + 4; // Mock conversion offset
  const responsesCount = feedbacks.length;
  const conversionRate = totalSent > 0 ? Math.round((responsesCount / totalSent) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requests Sent</span>
          <h4 className="text-2xl font-bold">{totalSent}</h4>
          <p className="text-xs text-muted-foreground">Sent automatically via WhatsApp</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responses Received</span>
          <h4 className="text-2xl font-bold">{responsesCount}</h4>
          <p className="text-xs text-muted-foreground">WhatsApp + widget feedback submissions</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Response Rate</span>
          <h4 className="text-2xl font-bold text-green-400">{conversionRate}%</h4>
          <p className="text-xs text-muted-foreground">High benchmark in Indian SMB sector</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Simulation Panel */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 lg:col-span-1">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-green-500" />
              Demo Simulation Panel
            </h3>
            <p className="text-xs text-muted-foreground">
              Simulate service completion to trigger automated WhatsApp feedbacks.
            </p>
          </div>

          <form onSubmit={handleSimulateTrigger} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Customer Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Suresh Patel"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-slate-200 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">WhatsApp Number</label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. +919999999999"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-slate-200 focus:border-green-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 font-semibold px-4 py-2.5 text-sm text-white shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Sending Request...' : 'Trigger WhatsApp Request'}
            </button>
          </form>
        </div>

        {/* Requests Logs List */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 lg:col-span-2">
          <div>
            <h3 className="font-bold text-base text-white">Sent Request Logs</h3>
            <p className="text-xs text-muted-foreground">List of customer review requests and current review states</p>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No review requests logged yet. Trigger one using the simulation panel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4">Customer</th>
                    <th className="pb-3 pr-4">Phone</th>
                    <th className="pb-3 pr-4">Sent At</th>
                    <th className="pb-3 pr-4">Source</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {feedbacks.map((item: FeedbackSummary) => (
                    <tr key={item.id} className="hover:bg-white/2.5">
                      <td className="py-3 pr-4 font-semibold text-white">{item.customerName}</td>
                      <td className="py-3 pr-4 text-slate-400">{item.phone}</td>
                      <td className="py-3 pr-4 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{item.source || 'WHATSAPP'}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Submitted ({item.rating}⭐)
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Seeded Pending entries */}
                  <tr className="hover:bg-white/2.5">
                    <td className="py-3 pr-4 font-semibold text-white">Rahul Verma</td>
                    <td className="py-3 pr-4 text-slate-400">+918888888888</td>
                    <td className="py-3 pr-4 text-slate-400">Just now</td>
                    <td className="py-3 pr-4 text-slate-400">WHATSAPP</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-400">
                        <AlertCircle className="h-3 w-3" />
                        Pending Reply
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
