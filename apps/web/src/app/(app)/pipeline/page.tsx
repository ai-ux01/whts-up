'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GripVertical } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Status = 'NEW' | 'INTERESTED' | 'FOLLOW_UP' | 'CLOSED';

interface PipelineLead {
  id: string;
  name: string | null;
  phone: string;
  leadSource: string | null;
  tags: string[];
  lastInteractionAt: string;
}

interface Column {
  status: Status;
  leads: PipelineLead[];
}

const COLUMN_META: Record<Status, { label: string; color: string }> = {
  NEW: { label: 'New', color: 'border-t-slate-400' },
  INTERESTED: { label: 'Interested', color: 'border-t-amber-500' },
  FOLLOW_UP: { label: 'Follow-up', color: 'border-t-blue-500' },
  CLOSED: { label: 'Closed', color: 'border-t-emerald-500' },
};

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  const { data: columns = [], isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => api<Column[]>('/leads/pipeline'),
  });

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline'] });
      const prev = queryClient.getQueryData<Column[]>(['pipeline']);
      // Optimistic move.
      queryClient.setQueryData<Column[]>(['pipeline'], (old) => {
        if (!old) return old;
        let moved: PipelineLead | undefined;
        const stripped = old.map((c) => ({
          ...c,
          leads: c.leads.filter((l) => {
            if (l.id === id) { moved = l; return false; }
            return true;
          }),
        }));
        return stripped.map((c) =>
          c.status === status && moved ? { ...c, leads: [moved, ...c.leads] } : c,
        );
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['pipeline'], ctx.prev);
      toast.error('Failed to move lead');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
  });

  function onDrop(status: Status) {
    setOverCol(null);
    if (!dragId) return;
    const lead = columns.flatMap((c) => c.leads).find((l) => l.id === dragId);
    const current = columns.find((c) => c.leads.some((l) => l.id === dragId));
    setDragId(null);
    if (!lead || current?.status === status) return;
    move.mutate({ id: dragId, status });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Lead Pipeline</h1>
        <p className="text-muted-foreground">Drag a lead between stages to update its status.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => (
            <div
              key={col.status}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.status); }}
              onDragLeave={() => setOverCol((s) => (s === col.status ? null : s))}
              onDrop={() => onDrop(col.status)}
              className={cn(
                'rounded-lg border border-t-4 bg-muted/30 p-2 transition-colors',
                COLUMN_META[col.status].color,
                overCol === col.status && 'bg-primary/5 ring-2 ring-primary/30',
              )}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-sm font-semibold">{COLUMN_META[col.status].label}</span>
                <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">
                  {col.leads.length}
                </span>
              </div>
              <div className="space-y-2">
                {col.leads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      'cursor-grab p-3 active:cursor-grabbing',
                      dragId === lead.id && 'opacity-50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {lead.name || lead.phone}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{lead.phone}</p>
                        {lead.tags?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {lead.tags.slice(0, 3).map((t) => (
                              <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {col.leads.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Drop leads here
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
