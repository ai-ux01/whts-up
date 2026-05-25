'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiDownload } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { leadSourceLabel } from '@/lib/lead-source';

interface Lead {
  id: string;
  status: string;
  notes: string | null;
  tags: string[];
  lastInteractionAt: string;
  contact: {
    name: string | null;
    phone: string;
    leadSource?: string | null;
    utmSource?: string | null;
    utmCampaign?: string | null;
  };
  assignedUser?: { id: string; name: string };
}

const STATUSES = ['NEW', 'INTERESTED', 'FOLLOW_UP', 'CLOSED'];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      return api<Lead[]>(`/leads?${params}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; status?: string; notes?: string; tags?: string[] }) =>
      api(`/leads/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: data.status,
          notes: data.notes,
          tags: data.tags,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  function openLead(lead: Lead) {
    setSelected(lead);
    setNotes(lead.notes || '');
    setTags(lead.tags.join(', '));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">Manage WhatsApp contacts as CRM leads</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search leads..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const params = new URLSearchParams();
              if (search) params.set('search', search);
              if (statusFilter) params.set('status', statusFilter);
              await apiDownload(
                `/leads/export?${params}`,
                `leads-${Date.now()}.csv`,
              );
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Export failed');
            }
          }}
        >
          Export CSV
        </Button>
        <select
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Phone</th>
                  <th className="p-3 text-left font-medium">Source</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer border-b border-border hover:bg-muted/30"
                      onClick={() => openLead(lead)}
                    >
                      <td className="p-3">
                        {lead.contact.name || '—'}
                      </td>
                      <td className="p-3">{lead.contact.phone}</td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {leadSourceLabel(lead.contact.leadSource)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge>{lead.status}</Badge>
                      </td>
                      <td className="p-3">
                        {lead.assignedUser?.name || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{selected.contact.name || selected.contact.phone}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(selected.contact.leadSource ||
                selected.contact.utmSource) && (
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Source:</span>{' '}
                    {leadSourceLabel(selected.contact.leadSource)}
                  </p>
                  {selected.contact.utmSource && (
                    <p className="text-xs text-muted-foreground">
                      UTM: {selected.contact.utmSource}
                      {selected.contact.utmCampaign
                        ? ` / ${selected.contact.utmCampaign}`
                        : ''}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                  value={selected.status}
                  onChange={(e) =>
                    setSelected({ ...selected, status: e.target.value })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  updateMutation.mutate({
                    id: selected.id,
                    status: selected.status,
                    notes,
                    tags: tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              >
                Save changes
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
