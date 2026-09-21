'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
}

export function WorkspaceSwitcher() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: workspaces = [] } = useQuery({
    queryKey: ['my-workspaces'],
    queryFn: () => api<WorkspaceItem[]>('/workspaces/mine'),
  });

  const active =
    workspaces.find((w) => w.isActive) || workspaces[0] || null;

  // Keep the header's active id in sync with localStorage (used by api-client).
  useEffect(() => {
    if (active && typeof window !== 'undefined') {
      localStorage.setItem('activeWorkspaceId', active.id);
    }
  }, [active]);

  const switchWs = useMutation({
    mutationFn: (workspaceId: string) =>
      api('/workspaces/switch', {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      }),
    onSuccess: (_d, workspaceId) => {
      localStorage.setItem('activeWorkspaceId', workspaceId);
      setOpen(false);
      toast.success('Switched workspace');
      // Refetch everything for the new workspace context.
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Switch failed'),
  });

  const createWs = useMutation({
    mutationFn: (name: string) =>
      api<{ id: string }>('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: (d) => {
      localStorage.setItem('activeWorkspaceId', d.id);
      setNewName('');
      setCreating(false);
      setOpen(false);
      toast.success('Business created');
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Create failed'),
  });

  if (!active) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
      >
        <Building2 className="h-4 w-4 text-primary" />
        <span className="max-w-[160px] truncate font-medium">{active.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-64 rounded-md border border-border bg-card p-1 shadow-lg">
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => (w.isActive ? setOpen(false) : switchWs.mutate(w.id))}
                className={cn(
                  'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted',
                  w.isActive && 'bg-muted',
                )}
              >
                <span className="truncate">{w.name}</span>
                {w.isActive && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}

            <div className="my-1 border-t border-border" />

            {creating ? (
              <form
                className="flex gap-1 p-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newName.trim()) createWs.mutate(newName.trim());
                }}
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New business name"
                  className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                />
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-primary hover:bg-muted"
              >
                <Plus className="h-4 w-4" /> Add business
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
