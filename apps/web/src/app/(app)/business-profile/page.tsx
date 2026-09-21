'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Brain, Save } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BusinessProfile {
  industry?: string | null;
  location?: string | null;
  description?: string | null;
  targetCustomer?: string | null;
  usp?: string | null;
  priceRange?: string | null;
  website?: string | null;
  whatsappNumber?: string | null;
  offers?: string[];
  competitors?: string[];
  keywords?: string[];
}

const toList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export default function BusinessProfilePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['business-profile'],
    queryFn: () => api<BusinessProfile>('/content/business-profile'),
  });

  const [form, setForm] = useState<BusinessProfile>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: BusinessProfile) => {
      // Send ONLY the editable fields the API whitelists. The GET response also
      // carries server-managed fields (id, workspaceId, createdAt, updatedAt,
      // products) which the validation pipe rejects as "should not exist".
      const body = {
        industry: payload.industry ?? null,
        location: payload.location ?? null,
        description: payload.description ?? null,
        targetCustomer: payload.targetCustomer ?? null,
        usp: payload.usp ?? null,
        priceRange: payload.priceRange ?? null,
        website: payload.website ?? null,
        whatsappNumber: payload.whatsappNumber ?? null,
        offers: payload.offers ?? [],
        competitors: payload.competitors ?? [],
        keywords: payload.keywords ?? [],
      };
      return api('/content/business-profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success('Marketing Brain updated — AI will use this everywhere');
      queryClient.invalidateQueries({ queryKey: ['business-profile'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  function set<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  const textField = (
    label: string,
    key: keyof BusinessProfile,
    placeholder: string,
  ) => (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={(form[key] as string) || ''}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  const areaField = (
    label: string,
    key: keyof BusinessProfile,
    placeholder: string,
  ) => (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <textarea
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={(form[key] as string) || ''}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  const listField = (
    label: string,
    key: 'offers' | 'competitors' | 'keywords',
    placeholder: string,
  ) => (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={(form[key] || []).join(', ')}
        placeholder={placeholder}
        onChange={(e) => set(key, toList(e.target.value))}
      />
      <p className="text-xs text-muted-foreground">Comma-separated</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Brain className="h-6 w-6 text-primary" /> Marketing Brain
        </h1>
        <p className="text-muted-foreground">
          The single source of truth about your business. Your AI uses this to make every
          caption, reel, and idea specific and on-brand.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {textField('Industry', 'industry', 'e.g. Real Estate')}
          {textField('Location / service area', 'location', 'e.g. Bandra, Mumbai')}
          <div className="sm:col-span-2">{areaField('About the business', 'description', 'What you do, in a sentence or two')}</div>
          <div className="sm:col-span-2">{areaField('Target customer', 'targetCustomer', 'Who is your ideal customer?')}</div>
          <div className="sm:col-span-2">{areaField('Unique selling point', 'usp', 'Why customers choose you over competitors')}</div>
          {textField('Price range', 'priceRange', 'e.g. ₹50L–₹2Cr')}
          {textField('Website', 'website', 'https://…')}
          {textField('WhatsApp number', 'whatsappNumber', '+91…')}
          <div className="sm:col-span-2">{listField('Current offers', 'offers', 'e.g. Free site visit, 10% launch discount')}</div>
          <div className="sm:col-span-2">{listField('Competitors', 'competitors', 'e.g. Lodha, Godrej Properties')}</div>
          <div className="sm:col-span-2">{listField('Core topics / keywords', 'keywords', 'e.g. 3BHK, sea view, interior design')}</div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
          <Save className="mr-1 h-4 w-4" />
          {save.isPending ? 'Saving…' : 'Save Marketing Brain'}
        </Button>
      </div>
    </div>
  );
}
