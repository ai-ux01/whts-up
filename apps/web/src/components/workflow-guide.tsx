'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Sparkles, Rocket, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    n: 1,
    label: 'Research',
    desc: 'Find an opportunity',
    href: '/content-studio',
    icon: Search,
    match: ['/content-studio'],
  },
  {
    n: 2,
    label: 'Create',
    desc: 'Generate the campaign',
    href: '/campaign-engine',
    icon: Sparkles,
    match: ['/campaign-engine', '/reel-creator', '/content-calendar'],
  },
  {
    n: 3,
    label: 'Launch',
    desc: 'Publish & message',
    href: '/launch',
    icon: Rocket,
    match: ['/launch', '/campaigns', '/inbox'],
  },
  {
    n: 4,
    label: 'Track',
    desc: 'See what worked',
    href: '/intelligence',
    icon: TrendingUp,
    match: ['/intelligence', '/leads', '/pipeline'],
  },
];

/**
 * A visible, clickable map of the core workflow so users always know where they
 * are and what comes next: Research → Create → Launch → Track.
 */
export function WorkflowGuide({ activeStep }: { activeStep?: number } = {}) {
  const pathname = usePathname();
  // An explicit activeStep (1-based) overrides the pathname-based detection —
  // used e.g. on the Campaign Engine to advance to "Launch" once a campaign is launched.
  const activeIndex =
    typeof activeStep === 'number'
      ? STEPS.findIndex((s) => s.n === activeStep)
      : STEPS.findIndex((s) =>
          s.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)),
        );

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1 overflow-x-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeIndex;
          const isDone = activeIndex > -1 && i < activeIndex;
          return (
            <div key={step.n} className="flex min-w-0 flex-1 items-center">
              <Link
                href={step.href}
                className={cn(
                  'group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 transition-colors',
                  isActive ? 'bg-primary/10' : 'hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'truncate text-sm font-semibold',
                      isActive ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {step.n}. {step.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{step.desc}</p>
                </div>
              </Link>
              {i < STEPS.length - 1 && (
                <ChevronRight className="mx-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
