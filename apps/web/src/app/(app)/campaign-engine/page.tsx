'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WorkflowGuide } from '@/components/workflow-guide';
import { Rocket, Wand2, Film, Instagram, Facebook, MessageCircle, Megaphone, Clock, FileText, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CampaignBundle {
  topic: string;
  objective: string;
  strategy: string;
  reel: { title: string; hook: string; scenes: string[] };
  instagramPost: { caption: string; hashtags: string[] };
  facebookPost: { caption: string };
  adCopy: { headline: string; primaryText: string; cta: string };
  whatsappMessage: string;
  followUps: string[];
  landingCopy: string;
  generatedByAi: boolean;
}

const OBJECTIVES = [
  'Generate WhatsApp Leads',
  'Generate Website Leads',
  'Increase Sales',
  'Promote Product',
  'Build Awareness',
  'Retarget Existing Customers',
];

function CampaignEngineInner() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState('');
  const [objective, setObjective] = useState(OBJECTIVES[0]);
  const [bundle, setBundle] = useState<CampaignBundle | null>(null);
  const [created, setCreated] = useState<{
    reelId?: string;
    socialPostId?: string;
    campaignId?: string;
  }>({});

  // Prefill the topic when arriving from Research ("Turn Into Campaign").
  useEffect(() => {
    const t = searchParams.get('topic');
    if (t) setTopic(t);
  }, [searchParams]);

  const generate = useMutation({
    mutationFn: () =>
      api<CampaignBundle>('/content/campaign-engine/generate', {
        method: 'POST',
        body: JSON.stringify({ topic, objective }),
      }),
    onSuccess: (b) => {
      setBundle(b);
      if (!b.generatedByAi) {
        toast.info('Generated with template fallback (AI unavailable).');
      } else {
        toast.success('Campaign generated');
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Generation failed'),
  });

  const materialize = useMutation({
    mutationFn: (parts: { reel?: boolean; post?: boolean; whatsappCampaign?: boolean }) =>
      api<{ created: { reelId?: string; socialPostId?: string; campaignId?: string } }>(
        '/content/campaign-engine/materialize',
        { method: 'POST', body: JSON.stringify({ bundle, parts }) },
      ),
    onSuccess: (r) => {
      setCreated((prev) => ({ ...prev, ...r.created }));
      const n = Object.keys(r.created).length;
      toast.success(`Created ${n} draft${n > 1 ? 's' : ''}. Next steps below 👇`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create drafts'),
  });

  // Schedule the generated Instagram/Facebook post to the calendar (tomorrow 10am).
  const schedulePost = useMutation({
    mutationFn: () => {
      const when = new Date();
      when.setDate(when.getDate() + 1);
      when.setHours(10, 0, 0, 0);
      return api('/content/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: bundle?.topic.slice(0, 80) || 'Campaign post',
          content: bundle?.instagramPost.caption || '',
          scheduledAt: when.toISOString(),
          platform: 'BOTH',
        }),
      });
    },
    onSuccess: () => toast.success('Post scheduled for tomorrow 10 AM (Content Calendar).'),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not schedule'),
  });

  // ONE-CLICK LAUNCH — schedules post + queues reel render + sends WhatsApp to all contacts.
  type LaunchResult = {
    launched: number;
    steps: Record<string, { status: string; detail?: string }>;
  };
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);
  const launch = useMutation({
    mutationFn: () =>
      api<LaunchResult>('/content/campaign-engine/launch', {
        method: 'POST',
        body: JSON.stringify({ bundle, parts: {} }),
      }),
    onSuccess: (r) => {
      setLaunchResult(r);
      toast.success(`🚀 Launched — ${r.launched} step(s) automated`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Launch failed'),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Once launched, advance the stepper to "Launch" (step 3). */}
      <WorkflowGuide activeStep={launchResult ? 3 : undefined} />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Rocket className="h-6 w-6 text-primary" /> Campaign Engine
        </h1>
        <p className="text-muted-foreground">
          Step 2 — enter a topic, <strong>Generate</strong> the full campaign, then <strong>Launch</strong>
          {' '}to auto-schedule the post, render the reel, and message all contacts.
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Opportunity / topic</label>
            <Input
              placeholder='e.g. "3 BHK sea-view launch in Bandra"'
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Objective</label>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            >
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => generate.mutate()}
            disabled={!topic.trim() || generate.isPending}
          >
            <Wand2 className="mr-1 h-4 w-4" />
            {generate.isPending ? 'Generating…' : 'Generate Campaign'}
          </Button>
        </CardContent>
      </Card>

      {/* Bundle review */}
      {bundle && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{bundle.strategy}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Film className="h-4 w-4 text-primary" /> Reel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{bundle.reel.title}</p>
                <p className="text-muted-foreground">{bundle.reel.hook}</p>
                <ol className="list-decimal space-y-1 pl-5">
                  {bundle.reel.scenes.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                <Button size="sm" variant="outline" onClick={() => materialize.mutate({ reel: true })} disabled={materialize.isPending}>
                  Create Reel Draft
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Instagram className="h-4 w-4 text-pink-500" /> Instagram Post
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-wrap">{bundle.instagramPost.caption}</p>
                <p className="text-xs text-blue-500">{bundle.instagramPost.hashtags.join(' ')}</p>
                <Button size="sm" variant="outline" onClick={() => materialize.mutate({ post: true })} disabled={materialize.isPending}>
                  Create Post Draft
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Facebook className="h-4 w-4 text-blue-600" /> Facebook Post
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{bundle.facebookPost.caption}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="h-4 w-4 text-amber-500" /> Ad Copy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-semibold">{bundle.adCopy.headline}</p>
                <p>{bundle.adCopy.primaryText}</p>
                <p className="text-xs text-muted-foreground">CTA: {bundle.adCopy.cta}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4 text-emerald-500" /> WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-wrap">{bundle.whatsappMessage}</p>
                <Button size="sm" variant="outline" onClick={() => materialize.mutate({ whatsappCampaign: true })} disabled={materialize.isPending}>
                  Create WhatsApp Campaign Draft
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-blue-500" /> Follow-up Sequence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {bundle.followUps.map((f, i) => <li key={i}>{f}</li>)}
                </ol>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" /> Landing Page Copy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{bundle.landingCopy}</p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => materialize.mutate({ reel: true, post: true, whatsappCampaign: true })}
              disabled={materialize.isPending || launch.isPending}
            >
              {materialize.isPending ? 'Creating…' : 'Save as Drafts'}
            </Button>
            <Button
              onClick={() => launch.mutate()}
              disabled={launch.isPending || materialize.isPending}
              className="gap-1"
            >
              <Rocket className="h-4 w-4" />
              {launch.isPending ? 'Launching…' : 'Launch Campaign'}
            </Button>
          </div>

          {/* Launch result — the automated outcome, no manual next steps needed */}
          {launchResult && (
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-base">🚀 Campaign launched</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(launchResult.steps).map(([key, s]) => (
                  <div key={key} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <span className="capitalize">
                      {key === 'whatsapp' ? 'WhatsApp send' : key === 'post' ? 'Social post' : 'Reel render'}
                    </span>
                    <span
                      className={
                        s.status === 'done'
                          ? 'text-emerald-600'
                          : s.status === 'skipped'
                            ? 'text-muted-foreground'
                            : 'text-red-500'
                      }
                    >
                      {s.status === 'done' ? '✓ ' : s.status === 'skipped' ? '– ' : '✕ '}
                      {s.detail || s.status}
                    </span>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link href="/launch"><Button size="sm" className="gap-1"><Rocket className="h-3.5 w-3.5" />View in Launch tab</Button></Link>
                  <Link href="/content-calendar"><Button size="sm" variant="ghost">Calendar</Button></Link>
                  <Link href="/campaigns"><Button size="sm" variant="ghost">Campaigns</Button></Link>
                  <Link href="/reel-creator"><Button size="sm" variant="ghost">Reels</Button></Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next steps — appears once drafts exist, so the flow doesn't dead-end */}
          {(created.reelId || created.socialPostId || created.campaignId) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">✅ Drafts created — next steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {created.socialPostId && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <span className="text-sm">📱 Instagram/Facebook post draft</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => schedulePost.mutate()}
                        disabled={schedulePost.isPending}
                      >
                        {schedulePost.isPending ? 'Scheduling…' : 'Schedule Post'}
                      </Button>
                      <Link href="/content-calendar">
                        <Button size="sm" variant="ghost">Open Calendar <ArrowRight className="ml-1 h-3 w-3" /></Button>
                      </Link>
                    </div>
                  </div>
                )}
                {created.reelId && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <span className="text-sm">🎬 Reel project draft</span>
                    <Link href="/reel-creator">
                      <Button size="sm" variant="ghost">Open Reel Creator <ArrowRight className="ml-1 h-3 w-3" /></Button>
                    </Link>
                  </div>
                )}
                {created.campaignId && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <span className="text-sm">💬 WhatsApp campaign draft</span>
                    <Link href="/campaigns">
                      <Button size="sm" variant="ghost">Open Campaigns to send <ArrowRight className="ml-1 h-3 w-3" /></Button>
                    </Link>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Reels compile from the Reel Creator; the WhatsApp campaign is sent from Campaigns
                  (upload recipients + send); scheduled posts publish automatically at their time.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function CampaignEnginePage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <CampaignEngineInner />
    </Suspense>
  );
}
