import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users } from 'lucide-react';
import { leadSourceLabel } from '@/lib/lead-source';

export interface Segment {
  id: string;
  name: string;
  filters: {
    status?: string;
    tags?: string[];
    leadSource?: string;
  };
}

interface SegmentsBuilderProps {
  onSegmentSaved?: () => void;
}

const STATUSES = ['NEW', 'INTERESTED', 'FOLLOW_UP', 'CLOSED'];
const LEAD_SOURCES = ['whatsapp', 'meta_ads', 'meta_organic', 'google_ads', 'campaign', 'manual'];

export function SegmentsBuilder({ onSegmentSaved }: SegmentsBuilderProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [targetCount, setTargetCount] = useState<number | null>(null);

  // List existing segments
  const { data: segments = [], isLoading: isLoadingSegments } = useQuery({
    queryKey: ['segments'],
    queryFn: () => api<Segment[]>('/segments'),
  });

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  // Preview Count query
  const previewMutation = useMutation({
    mutationFn: () =>
      api<{ count: number }>('/segments/preview', {
        method: 'POST',
        body: JSON.stringify({
          filters: {
            ...(status ? { status } : {}),
            ...(leadSource ? { leadSource } : {}),
            ...(parsedTags.length > 0 ? { tags: parsedTags } : {}),
          },
        }),
      }),
    onSuccess: (data) => {
      setTargetCount(data.count);
    },
  });

  // Trigger preview count whenever filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      previewMutation.mutate();
    }, 400); // Debounce preview queries
    return () => clearTimeout(timer);
  }, [status, leadSource, tagsInput]);

  // Create segment mutation
  const createMutation = useMutation({
    mutationFn: () =>
      api('/segments', {
        method: 'POST',
        body: JSON.stringify({
          name,
          filters: {
            ...(status ? { status } : {}),
            ...(leadSource ? { leadSource } : {}),
            ...(parsedTags.length > 0 ? { tags: parsedTags } : {}),
          },
        }),
      }),
    onSuccess: () => {
      toast.success('Segment created successfully');
      setName('');
      setStatus('');
      setLeadSource('');
      setTagsInput('');
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      if (onSegmentSaved) onSegmentSaved();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to create segment');
    },
  });

  // Delete segment mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/segments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Segment deleted');
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Create Segment</CardTitle>
          <CardDescription>
            Group customers dynamically based on CRM filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Segment Name</Label>
            <Input
              placeholder="e.g. High Intent Meta Leads"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Filter by Status</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Filter by Source</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={leadSource}
              onChange={(e) => setLeadSource(e.target.value)}
            >
              <option value="">All Sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {leadSourceLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Filter by Tags (comma separated)</Label>
            <Input
              placeholder="e.g. hot_lead, realestate"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-border mt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Target Size:</span>
              <Badge variant="secondary">
                {previewMutation.isPending ? 'Calculating...' : `${targetCount ?? 0} contacts`}
              </Badge>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
            >
              Save Segment
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Workspace Segments</CardTitle>
          <CardDescription>
            Manage dynamic customer filters in your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSegments ? (
            <p className="text-sm text-muted-foreground">Loading segments...</p>
          ) : segments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No segments created yet.</p>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto">
              {segments.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start justify-between rounded-lg border border-border p-3 hover:bg-muted/10 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">{s.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {s.filters.status && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted border text-muted-foreground font-medium">
                          Status: {s.filters.status}
                        </span>
                      )}
                      {s.filters.leadSource && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted border text-muted-foreground font-medium">
                          Source: {leadSourceLabel(s.filters.leadSource)}
                        </span>
                      )}
                      {s.filters.tags && s.filters.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium"
                        >
                          Tag: {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteMutation.mutate(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
