'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  TrendingUp, 
  Search, 
  Trash, 
  Check, 
  Sparkles, 
  Lightbulb, 
  Zap, 
  BookOpen, 
  Activity, 
  Award, 
  Briefcase,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface ViralHook {
  hook: string;
  type: string;
  ctrPower: number;
  executionTips: string;
}

interface CompetitorGap {
  weakness: string;
  opportunity: string;
  scriptAngle: string;
}

interface SearchTrend {
  query: string;
  angle: string;
  keywords: string[];
}

interface ResearchReport {
  id: string;
  topic: string;
  niche: string;
  viralHooks: ViralHook[];
  competitors: CompetitorGap[];
  trends: SearchTrend[];
  createdAt: string;
}

export default function ResearchEnginePage() {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('Real Estate');
  const [activeReport, setActiveReport] = useState<ResearchReport | null>(null);
  const [activeTab, setActiveTab] = useState<'hooks' | 'gaps' | 'trends'>('hooks');

  // Fetch Historical Research Query
  const { data: history = [], isLoading } = useQuery<ResearchReport[]>({
    queryKey: ['research-history'],
    queryFn: () => api<ResearchReport[]>('/content/research'),
  });

  // Generate Research Mutation
  const generateMutation = useMutation({
    mutationFn: (body: { topic: string; niche: string }) =>
      api<ResearchReport>('/content/research', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['research-history'] });
      setActiveReport(data);
      setActiveTab('hooks');
      setTopic('');
      toast.success('AI Growth Trends successfully analyzed and locked!');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Research compilation failed'),
  });

  // Delete Research Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api<unknown>(`/content/research/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['research-history'] });
      if (activeReport?.id === deletedId) {
        setActiveReport(null);
      }
      toast.success('Research entry removed.');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Deletion failed'),
  });

  const selectReport = (report: ResearchReport) => {
    setActiveReport(report);
    setActiveTab('hooks');
  };

  const getPowerColor = (power: number) => {
    if (power >= 95) return 'from-rose-500 to-amber-500';
    if (power >= 90) return 'from-amber-500 to-emerald-500';
    return 'from-emerald-500 to-teal-500';
  };

  const currentReport = activeReport || (history.length > 0 ? history[0] : null);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
          AI Research Engine
        </h1>
        <p className="text-muted-foreground mt-1">
          Perform live trend mining, analyze competitor content gaps, and extract high-converting viral hooks in seconds.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Hand: Controls & History */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Launch Trend Miner
              </CardTitle>
              <CardDescription>Configure AI searches to scan niche keywords.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Research Niche / Vertical</Label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Real Estate">Real Estate Presets</option>
                  <option value="Coaching Center">Coaching Center / JEE-NEET classes</option>
                  <option value="Dental Clinic">Dental / Health Clinic</option>
                  <option value="Solar Rooftops">Solar panel / Renewable energy</option>
                  <option value="Car Dealerships">Premium Car Dealerships</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Research Topic / Competitor Keyword</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. ROI of solar, luxury penthouse tour"
                  required
                />
              </div>

              <Button
                onClick={() => generateMutation.mutate({ topic, niche })}
                disabled={generateMutation.isPending || !topic}
                className="w-full gap-2"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Mining trends...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Extract Growth Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Historical Logs List */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Historical Research Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[300px] overflow-auto">
              <div className="divide-y divide-border">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className={`w-full p-3.5 text-xs flex justify-between items-center transition-colors hover:bg-muted/50 ${
                      currentReport?.id === h.id ? 'bg-muted/70 font-semibold border-l-4 border-primary' : ''
                    }`}
                  >
                    <button
                      onClick={() => selectReport(h)}
                      className="flex-1 text-left truncate mr-2"
                    >
                      <p className="font-bold text-foreground truncate">{h.topic}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{h.niche}</p>
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(h.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {history.length === 0 && !isLoading && (
                  <p className="text-muted-foreground p-5 text-xs text-center italic">No searches conducted yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Hand: Interactive Reports Visualizer */}
        <div className="lg:col-span-8">
          {currentReport ? (
            <div className="space-y-6">
              {/* Header Tab Panel */}
              <div className="flex gap-2 border-b border-border pb-px">
                <button
                  onClick={() => setActiveTab('hooks')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                    activeTab === 'hooks'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  Viral Video Hooks
                </button>
                <button
                  onClick={() => setActiveTab('gaps')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                    activeTab === 'gaps'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  Competitor Gaps
                </button>
                <button
                  onClick={() => setActiveTab('trends')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                    activeTab === 'trends'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  Trending Search Queries
                </button>
              </div>

              {/* TAB CONTENT: VIRAL HOOKS */}
              {activeTab === 'hooks' && (
                <div className="grid gap-4">
                  {currentReport.viralHooks.map((vh, idx) => (
                    <Card key={idx} className="border-border hover:shadow transition-shadow relative overflow-hidden bg-card flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-primary mr-[-15px] mt-[-15px] uppercase tracking-wider">Hook #{idx+1}</span>
                      </div>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex gap-2 items-center">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-extrabold rounded-full uppercase">
                            {vh.type}
                          </span>
                        </div>

                        <p className="text-base font-extrabold text-foreground pr-8 leading-snug">
                          &quot;{vh.hook}&quot;
                        </p>

                        <div className="pt-3.5 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1 max-w-lg">
                            <h5 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <BookOpen className="h-3 w-3 text-primary" /> Visual Presentation Guide
                            </h5>
                            <p className="text-xs text-muted-foreground leading-relaxed">{vh.executionTips}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 bg-muted/40 p-2.5 rounded-lg border">
                            <Award className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                            <div className="text-right">
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">CTR Power Rating</p>
                              <p className={`text-base font-black bg-gradient-to-r bg-clip-text text-transparent ${getPowerColor(vh.ctrPower)}`}>
                                {vh.ctrPower}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* TAB CONTENT: COMPETITOR GAPS */}
              {activeTab === 'gaps' && (
                <div className="grid gap-4 md:grid-cols-2">
                  {currentReport.competitors.map((comp, idx) => (
                    <Card key={idx} className="border-border hover:shadow transition-shadow flex flex-col justify-between h-full bg-card">
                      <CardHeader className="border-b bg-muted/10 py-3.5 px-4 flex flex-row items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-bold">Angle of Attack #{idx+1}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 text-xs flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <p className="text-red-500 font-bold uppercase tracking-wider text-[10px]">❌ Competitor Weakness</p>
                          <p className="text-muted-foreground leading-relaxed font-medium">{comp.weakness}</p>
                        </div>

                        <div className="space-y-1.5 pt-3.5 border-t border-border">
                          <p className="text-emerald-500 font-bold uppercase tracking-wider text-[10px]">✅ Our Opportunity</p>
                          <p className="text-foreground leading-relaxed font-semibold">{comp.opportunity}</p>
                        </div>

                        <div className="pt-3.5 border-t border-border space-y-1 flex items-start gap-2 bg-primary/5 p-2 rounded border border-primary/10">
                          <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Subtitles Hook Strategy</p>
                            <p className="text-muted-foreground mt-0.5 leading-relaxed italic">{comp.scriptAngle}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* TAB CONTENT: TRENDS & INSPIRATIONS */}
              {activeTab === 'trends' && (
                <div className="grid gap-4">
                  {currentReport.trends.map((t, idx) => (
                    <Card key={idx} className="border-border hover:shadow transition-shadow bg-card">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex justify-between items-start gap-4 flex-col md:flex-row">
                          <div className="space-y-1">
                            <h4 className="text-base font-extrabold text-foreground flex items-center gap-2 pr-6">
                              <Search className="h-4.5 w-4.5 text-primary shrink-0" />
                              &quot;{t.query}&quot;
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed pt-1.5 pr-4">
                              {t.angle}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5 shrink-0 max-w-[200px]">
                            {t.keywords.map((kw, kIdx) => (
                              <span
                                key={kIdx}
                                className="px-2.5 py-0.5 bg-muted border text-muted-foreground font-semibold rounded text-[10px] tracking-wide"
                              >
                                #{kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="border-border shadow-sm flex flex-col items-center justify-center p-12 text-center space-y-4 bg-muted/10 min-h-[400px]">
              <Search className="h-12 w-12 text-muted-foreground/30 animate-pulse" />
              <div>
                <h4 className="font-bold text-foreground text-base">No growth analysis active</h4>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Enter a competitor topic or business offer on the left side form to launch the AI Growth Operating System&apos;s automated Trend Miner.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
