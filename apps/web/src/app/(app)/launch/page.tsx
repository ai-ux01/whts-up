'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkflowGuide } from '@/components/workflow-guide';
import { Rocket, CheckCircle2, MinusCircle, XCircle, ArrowRight } from 'lucide-react';

type LaunchStep = { status: 'done' | 'skipped' | 'failed'; detail?: string; id?: string };

interface LaunchedCampaign {
  id: string;
  topic: string;
  objective: string | null;
  launched: number;
  steps: Record<string, LaunchStep>;
  postId: string | null;
  reelId: string | null;
  campaignId: string | null;
  createdAt: string;
}

const STEP_LABEL: Record<string, string> = {
  post: 'Social post',
  reel: 'Reel render',
  whatsapp: 'WhatsApp send',
};

function StepRow({ name, step }: { name: string; step: LaunchStep }) {
  const Icon =
    step.status === 'done' ? CheckCircle2 : step.status === 'skipped' ? MinusCircle : XCircle;
  const color =
    step.status === 'done'
      ? 'text-emerald-600'
      : step.status === 'skipped'
        ? 'text-muted-foreground'
        : 'text-red-500';
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
      <span className="font-medium text-foreground">{STEP_LABEL[name] || name}</span>
      <span className={`flex items-center gap-1.5 ${color}`}>
        <Icon className="h-4 w-4" />
        {step.detail || step.status}
      </span>
    </div>
  );
}

export default function LaunchPage() {
  const { data: launches = [], isLoading } = useQuery<LaunchedCampaign[]>({
    queryKey: ['launched-campaigns'],
    queryFn: () => api<LaunchedCampaign[]>('/content/campaign-engine/launches'),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <WorkflowGuide activeStep={3} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Rocket className="h-6 w-6 text-primary" />
            Launched Campaigns
          </h1>
          <p className="text-muted-foreground mt-1">
            Step 3 — everything you&apos;ve launched, and what each launch automated.
          </p>
        </div>
        <Link href="/campaign-engine">
          <Button className="gap-2">
            New launch <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Loading launches…</CardContent>
        </Card>
      ) : launches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Rocket className="h-10 w-10 text-muted-foreground/30" />
            <div>
              <p className="font-semibold text-foreground">No campaigns launched yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Generate a campaign in the Campaign Engine and hit <strong>Launch</strong> — it will
                appear here with its automated results.
              </p>
            </div>
            <Link href="/campaign-engine">
              <Button className="gap-2 mt-1">
                Go to Campaign Engine <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {launches.map((l) => (
            <Card key={l.id} className="border-emerald-500/30">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div>
                  <CardTitle className="text-base">{l.topic}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {l.objective ? `${l.objective} · ` : ''}
                    {new Date(l.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                  {l.launched} step{l.launched === 1 ? '' : 's'} automated
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(l.steps).map(([name, step]) => (
                  <StepRow key={name} name={name} step={step} />
                ))}
                <div className="flex flex-wrap gap-2 pt-1">
                  {l.postId && (
                    <Link href="/content-calendar">
                      <Button size="sm" variant="ghost">View post</Button>
                    </Link>
                  )}
                  {l.reelId && (
                    <Link href="/reel-creator">
                      <Button size="sm" variant="ghost">View reel</Button>
                    </Link>
                  )}
                  {l.campaignId && (
                    <Link href="/campaigns">
                      <Button size="sm" variant="ghost">View WhatsApp campaign</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
