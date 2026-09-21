'use client';

import Link from 'next/link';
import {
  Search,
  Sparkles,
  Rocket,
  TrendingUp,
  ArrowRight,
  ArrowDown,
  Brain,
  Film,
  Instagram,
  MessageCircle,
  Calendar,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function Step({
  n,
  title,
  desc,
  href,
  icon: Icon,
  color,
  children,
}: {
  n: number;
  title: string;
  desc: string;
  href: string;
  icon: typeof Search;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-4">
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', color)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step {n}</p>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
            {children && <div className="mt-2 flex flex-wrap gap-2">{children}</div>}
          </div>
          <ArrowRight className="mt-3 h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Film; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px]">
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function Down() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="h-5 w-5 text-muted-foreground/50" />
    </div>
  );
}

export default function FlowPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">How it works</h1>
        <p className="text-muted-foreground">
          The complete flow — from finding an opportunity to tracking what worked. Click any step to go there.
        </p>
      </div>

      {/* Marketing Brain — the context layer */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-3 p-4">
          <Brain className="h-6 w-6 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Marketing Brain</p>
            <p className="text-xs text-muted-foreground">
              Your business profile + brand kit feed the AI at every step below.
            </p>
          </div>
          <Link href="/business-profile" className="text-xs font-medium text-primary underline">
            Set up
          </Link>
        </CardContent>
      </Card>
      <Down />

      <Step
        n={1}
        title="Research & Create"
        desc="Find a viral hook, competitor gap, trend, or draft copy. Hit 'Turn into Campaign' on anything."
        href="/content-studio"
        icon={Search}
        color="bg-blue-500/15 text-blue-500"
      >
        <Chip icon={Sparkles} label="Copywriting" />
        <Chip icon={TrendingUp} label="Research" />
        <Chip icon={Sparkles} label="Viral ideas" />
      </Step>
      <Down />

      <Step
        n={2}
        title="Generate the campaign"
        desc="One topic → a full campaign: reel, posts, ad copy, WhatsApp message, follow-ups, landing copy."
        href="/campaign-engine"
        icon={Sparkles}
        color="bg-violet-500/15 text-violet-500"
      >
        <Chip icon={Film} label="Reel" />
        <Chip icon={Instagram} label="Posts" />
        <Chip icon={MessageCircle} label="WhatsApp" />
      </Step>
      <Down />

      <Step
        n={3}
        title="Launch (one click)"
        desc="Auto-schedules the post, queues the reel render, and sends the WhatsApp campaign to all contacts."
        href="/campaign-engine"
        icon={Rocket}
        color="bg-emerald-500/15 text-emerald-500"
      >
        <Chip icon={Calendar} label="Post scheduled" />
        <Chip icon={Film} label="Reel rendering" />
        <Chip icon={MessageCircle} label="WhatsApp sent" />
      </Step>
      <Down />

      <Step
        n={4}
        title="Track & decide"
        desc="See where customers came from, conversion, revenue & ROAS. AI suggests the next move."
        href="/intelligence"
        icon={TrendingUp}
        color="bg-amber-500/15 text-amber-500"
      >
        <Chip icon={Users} label="Pipeline" />
        <Chip icon={TrendingUp} label="Intelligence" />
      </Step>

      <div className="flex items-center justify-center gap-2 pt-3 text-xs text-muted-foreground">
        <ArrowRight className="h-3 w-3 rotate-180" />
        Insights loop back to your Command Center as tomorrow&apos;s actions
      </div>
    </div>
  );
}
