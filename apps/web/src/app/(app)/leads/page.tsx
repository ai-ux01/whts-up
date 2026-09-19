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

interface Agent {
  id: string;
  name: string;
  email: string;
}

const STATUSES = ['NEW', 'INTERESTED', 'FOLLOW_UP', 'CLOSED'];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');

  const [selected, setSelected] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);

  // Fetch agents for workspace
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api<Agent[]>('/users/agents'),
  });

  // Fetch unfiltered leads for dynamic tags and campaigns extraction
  const { data: baseLeads = [] } = useQuery({
    queryKey: ['leads-unfiltered'],
    queryFn: () => api<Lead[]>('/leads'),
  });

  // Extract unique filter options from the unfiltered base list
  const uniqueTags = Array.from(
    new Set(baseLeads.flatMap((l) => l.tags || [])),
  ).sort();

  const uniqueCampaigns = Array.from(
    new Set(
      baseLeads
        .map((l) => l.contact.utmCampaign)
        .filter((c): c is string => typeof c === 'string'),
    ),
  ).sort();

  const uniqueLeadSources = Array.from(
    new Set(
      baseLeads
        .map((l) => l.contact.leadSource)
        .filter((s): s is string => typeof s === 'string'),
    ),
  ).sort();

  // Fetch filtered leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: [
      'leads',
      search,
      statusFilter,
      tagFilter,
      campaignFilter,
      leadSourceFilter,
      assignedToFilter,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (tagFilter) params.set('tag', tagFilter);
      if (campaignFilter) params.set('campaign', campaignFilter);
      if (leadSourceFilter) params.set('leadSource', leadSourceFilter);
      if (assignedToFilter) params.set('assignedTo', assignedToFilter);
      return api<Lead[]>(`/leads?${params}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: string;
      status?: string;
      notes?: string;
      tags?: string[];
      assignedUserId?: string | null;
    }) =>
      api(`/leads/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: data.status,
          notes: data.notes,
          tags: data.tags,
          assignedUserId: data.assignedUserId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-unfiltered'] });
      toast.success('Lead updated successfully');
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to update lead');
    },
  });

  function openLead(lead: Lead) {
    setSelected(lead);
    setNotes(lead.notes || '');
    setTags(lead.tags.join(', '));
    setAssignedUserId(lead.assignedUser?.id || null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">Manage WhatsApp contacts as CRM leads</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-1 flex-wrap gap-3 items-center min-w-[280px]">
            <Input
              placeholder="Search by name, phone, notes..."
              className="max-w-xs h-10 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All Tags</option>
              {uniqueTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
            >
              <option value="">All Campaigns</option>
              {uniqueCampaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={leadSourceFilter}
              onChange={(e) => setLeadSourceFilter(e.target.value)}
            >
              <option value="">All Sources</option>
              {uniqueLeadSources.map((s) => (
                <option key={s} value={s}>
                  {leadSourceLabel(s)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={assignedToFilter}
              onChange={(e) => setAssignedToFilter(e.target.value)}
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {(search ||
              statusFilter ||
              tagFilter ||
              campaignFilter ||
              leadSourceFilter ||
              assignedToFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-10 px-2"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setTagFilter('');
                  setCampaignFilter('');
                  setLeadSourceFilter('');
                  setAssignedToFilter('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            className="h-10"
            onClick={async () => {
              try {
                const params = new URLSearchParams();
                if (search) params.set('search', search);
                if (statusFilter) params.set('status', statusFilter);
                if (tagFilter) params.set('tag', tagFilter);
                if (campaignFilter) params.set('campaign', campaignFilter);
                if (leadSourceFilter) params.set('leadSource', leadSourceFilter);
                if (assignedToFilter) params.set('assignedTo', assignedToFilter);
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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden shadow-sm">
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
                    <td colSpan={5} className="p-4 text-muted-foreground text-center">
                      Loading leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-muted-foreground text-center">
                      No leads match the active filters.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer border-b border-border hover:bg-muted/30 transition-colors"
                      onClick={() => openLead(lead)}
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {lead.contact.name || '—'}
                          </p>
                          {lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {lead.tags.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{lead.contact.phone}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {leadSourceLabel(lead.contact.leadSource)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className="text-xs font-semibold">{lead.status}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
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
          <Card className="shadow-sm h-fit">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">
                {selected.contact.name || selected.contact.phone}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {(selected.contact.leadSource || selected.contact.utmSource) && (
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground font-medium">Source:</span>{' '}
                    {leadSourceLabel(selected.contact.leadSource)}
                  </p>
                  {selected.contact.utmSource && (
                    <p className="text-xs text-muted-foreground">
                      UTM Source: {selected.contact.utmSource}
                    </p>
                  )}
                  {selected.contact.utmCampaign && (
                    <p className="text-xs text-muted-foreground">
                      UTM Campaign: {selected.contact.utmCampaign}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
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
                <Label>Assigned Agent</Label>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  value={assignedUserId || ''}
                  onChange={(e) => setAssignedUserId(e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-card"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="bg-card"
                  placeholder="e.g. meta_ads, hot_lead"
                />
              </div>

              <Button
                className="w-full"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: selected.id,
                    status: selected.status,
                    notes,
                    tags: tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                    assignedUserId,
                  })
                }
              >
                {updateMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
