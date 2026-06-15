'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  Palette, 
  FileText, 
  Check, 
  Copy, 
  Flame, 
  Lightbulb, 
  Compass, 
  Share2, 
  TrendingUp, 
  Zap, 
  Briefcase, 
  Activity, 
  Award, 
  BookOpen, 
  Search, 
  Trash, 
  RefreshCw,
  Upload
} from 'lucide-react';

interface BrandKit {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  brandVoice: string;
  ctaTemplate: string;
}

interface ContentIdea {
  title: string;
  hook: string;
  description: string;
  cta: string;
  type: string;
}

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

export default function ContentStudioPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'copy' | 'research' | 'ideas' | 'brand'>('copy');
  const [copied, setCopied] = useState(false);

  // Copywriting Form State
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('caption');
  const [language, setLanguage] = useState('Hinglish');
  const [tone, setTone] = useState('Hinglish-Casual');
  const [generatedResult, setGeneratedResult] = useState('');

  // Ideas State
  const [niche, setNiche] = useState('Real Estate');

  // Brand Kit State
  const [primaryColor, setPrimaryColor] = useState('#16a34a');
  const [secondaryColor, setSecondaryColor] = useState('#14532d');
  const [brandVoice, setBrandVoice] = useState('Hinglish-Casual');
  const [ctaTemplate, setCtaTemplate] = useState("DM us 'START' to learn more!");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'Brand');

    const toastId = toast.loading(`Uploading brand logo "${file.name}"...`);

    try {
      const uploadedAsset = await api<{ url: string }>('/content/media', {
        method: 'POST',
        body: formData,
      });
      toast.dismiss(toastId);
      setLogoUrl(uploadedAsset.url);
      toast.success('Brand logo uploaded successfully!');
    } catch (err: unknown) {
      toast.dismiss(toastId);
      const errorMsg = err instanceof Error ? err.message : 'Logo upload failed';
      toast.error(errorMsg);
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Research State
  const [researchTopic, setResearchTopic] = useState('');
  const [researchNiche, setResearchNiche] = useState('Real Estate');
  const [activeReport, setActiveReport] = useState<ResearchReport | null>(null);
  const [activeResearchTab, setActiveResearchTab] = useState<'hooks' | 'gaps' | 'trends'>('hooks');

  // Fetch Brand Kit Query
  const { data: brandKit } = useQuery<BrandKit>({
    queryKey: ['brand-kit'],
    queryFn: async () => {
      const data = await api<BrandKit>('/content/brand-kit');
      if (data) {
        setPrimaryColor(data.primaryColor || '#16a34a');
        setSecondaryColor(data.secondaryColor || '#14532d');
        setBrandVoice(data.brandVoice || 'Professional');
        setCtaTemplate(data.ctaTemplate || '');
        setLogoUrl(data.logoUrl || null);
      }
      return data;
    }
  });

  // Fetch Historical Research Query
  const { data: history = [], isLoading: isHistoryLoading } = useQuery<ResearchReport[]>({
    queryKey: ['research-history'],
    queryFn: () => api<ResearchReport[]>('/content/research'),
  });

  // Generate Copy Mutation
  const generateMutation = useMutation({
    mutationFn: (body: { type: string; topic: string; tone: string; language: string }) =>
      api<{ content: string }>('/content/studio/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setGeneratedResult(data.content);
      toast.success('AI content generated successfully!');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Generation failed'),
  });

  // Generate Ideas Mutation
  const ideasMutation = useMutation({
    mutationFn: (body: { niche: string }) =>
      api<ContentIdea[]>('/content/ideas/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Viral content concepts generated!');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Ideas compilation failed'),
  });

  // Update Brand Kit Mutation
  const updateBrandMutation = useMutation({
    mutationFn: (body: { logoUrl: string | null; primaryColor: string; secondaryColor: string; brandVoice: string; ctaTemplate: string }) =>
      api<BrandKit>('/content/brand-kit', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit'] });
      toast.success('Brand Kit saved successfully!');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Saving failed'),
  });

  // Generate Research Mutation
  const generateResearchMutation = useMutation({
    mutationFn: (body: { topic: string; niche: string }) =>
      api<ResearchReport>('/content/research', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['research-history'] });
      setActiveReport(data);
      setActiveResearchTab('hooks');
      setResearchTopic('');
      toast.success('AI Growth Trends successfully analyzed and locked!');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Research compilation failed'),
  });

  // Delete Research Mutation
  const deleteResearchMutation = useMutation({
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
    setActiveResearchTab('hooks');
  };

  const getPowerColor = (power: number) => {
    if (power >= 95) return 'from-rose-500 to-amber-500';
    if (power >= 90) return 'from-amber-500 to-emerald-500';
    return 'from-emerald-500 to-teal-500';
  };

  const currentReport = activeReport || (history.length > 0 ? history[0] : null);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
          AI Content Studio
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate high-converting copies, viral hooks, competitor gap research, and custom brand assets in Hinglish.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex gap-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab('copy')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'copy'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          AI Copywriting Suite
        </button>
        <button
          onClick={() => setActiveTab('research')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'research'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          AI Research Engine
        </button>
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'ideas'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Compass className="h-4 w-4" />
          Viral Content Ideas
        </button>
        <button
          onClick={() => setActiveTab('brand')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'brand'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="h-4 w-4" />
          Brand Kit Builder
        </button>
      </div>

      {/* TAB CONTENT: COPYWRITING */}
      {activeTab === 'copy' && (
        <div className="grid gap-6 md:grid-cols-5">
          {/* Left Column Controls */}
          <Card className="md:col-span-2 shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Configure Copy AI
              </CardTitle>
              <CardDescription>Enter details to prompt SMB sales copywriting templates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>What is the topic/offer?</Label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Free home solar site audit inside Delhi NCR"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Content Type</Label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="caption">Instagram/FB Caption</option>
                  <option value="ad_copy">High-Converting Facebook Ad Copy</option>
                  <option value="hashtags">SEO Hashtags Groups</option>
                  <option value="cta">WhatsApp Action Taglines (CTA)</option>
                  <option value="carousel_outline">Multi-slide Carousel Board Outline</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="Hinglish">Hinglish (Casual Hindi)</option>
                    <option value="English">Pure English</option>
                    <option value="Hindi">Pure Hindi</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Brand Voice / Tone</Label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="Hinglish-Casual">Friendly / Hinglish-Casual</option>
                    <option value="Professional">Corporate / Professional</option>
                    <option value="Humorous">Witty / Humorous</option>
                    <option value="Energetic">Bold / Energetic</option>
                  </select>
                </div>
              </div>

              <Button
                onClick={() => generateMutation.mutate({ type: contentType, topic, tone, language })}
                disabled={generateMutation.isPending || !topic}
                className="w-full mt-2"
              >
                {generateMutation.isPending ? 'Drafting content...' : 'Generate AI Copy'}
              </Button>
            </CardContent>
          </Card>

          {/* Right Column Result Output */}
          <Card className="md:col-span-3 border-border shadow-sm flex flex-col min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg">Generated Content Workspace</CardTitle>
                <CardDescription>Review and copy your conversion-optimized text.</CardDescription>
              </div>
              {generatedResult && (
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-6 overflow-auto font-sans whitespace-pre-wrap leading-relaxed text-sm bg-muted/20">
              {generatedResult ? (
                generatedResult
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                  <Flame className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
                  <p>Input your offer details and click generate to launch AI SaaS copywriting tools.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: AI RESEARCH ENGINE */}
      {activeTab === 'research' && (
        <div className="grid gap-6 md:grid-cols-12 items-start">
          {/* Research controls */}
          <div className="md:col-span-4 space-y-4">
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
                    value={researchNiche}
                    onChange={(e) => setResearchNiche(e.target.value)}
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
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    placeholder="e.g. ROI of solar, luxury penthouse tour"
                    required
                  />
                </div>

                <Button
                  onClick={() => generateResearchMutation.mutate({ topic: researchTopic, niche: researchNiche })}
                  disabled={generateResearchMutation.isPending || !researchTopic}
                  className="w-full gap-2 mt-2"
                >
                  {generateResearchMutation.isPending ? (
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

            {/* History logs */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold">Historical Research Logs</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[220px] overflow-auto">
                <div className="divide-y divide-border">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className={`w-full p-3 text-xs flex justify-between items-center transition-colors hover:bg-muted/50 ${
                        currentReport?.id === h.id ? 'bg-muted/70 font-semibold border-l-4 border-primary' : ''
                      }`}
                    >
                      <button
                        onClick={() => selectReport(h)}
                        className="flex-1 text-left truncate mr-2"
                      >
                        <p className="font-bold text-foreground truncate">{h.topic}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide">{h.niche}</p>
                      </button>
                      <button
                        onClick={() => deleteResearchMutation.mutate(h.id)}
                        disabled={deleteResearchMutation.isPending}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {history.length === 0 && !isHistoryLoading && (
                    <p className="text-muted-foreground p-4 text-[11px] text-center italic">No searches conducted yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Research visualizations */}
          <div className="md:col-span-8">
            {currentReport ? (
              <div className="space-y-6">
                {/* Header Tab Panel */}
                <div className="flex gap-2 border-b border-border pb-px">
                  <button
                    onClick={() => setActiveResearchTab('hooks')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                      activeResearchTab === 'hooks'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Viral Video Hooks
                  </button>
                  <button
                    onClick={() => setActiveResearchTab('gaps')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                      activeResearchTab === 'gaps'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    Competitor Gaps
                  </button>
                  <button
                    onClick={() => setActiveResearchTab('trends')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                      activeResearchTab === 'trends'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Trending Search Queries
                  </button>
                </div>

                {/* TAB CONTENT: VIRAL HOOKS */}
                {activeResearchTab === 'hooks' && (
                  <div className="grid gap-4">
                    {currentReport.viralHooks.map((vh, idx) => (
                      <Card key={idx} className="border-border hover:shadow transition-shadow relative overflow-hidden bg-card flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-bl-full flex items-center justify-center pointer-events-none">
                          <span className="text-[9px] font-bold text-primary mr-[-12px] mt-[-12px] uppercase tracking-wider">Hook #{idx+1}</span>
                        </div>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex gap-2 items-center">
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-extrabold rounded-full uppercase">
                              {vh.type}
                            </span>
                          </div>

                          <p className="text-sm font-extrabold text-foreground pr-8 leading-snug">
                            &quot;{vh.hook}&quot;
                          </p>

                          <div className="pt-3 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-0.5 max-w-md">
                              <h5 className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                                <BookOpen className="h-2.5 w-2.5 text-primary" /> Visual Presentation Guide
                              </h5>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{vh.executionTips}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 bg-muted/40 p-2 rounded border">
                              <Award className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                              <div className="text-right">
                                <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">CTR Power</p>
                                <p className={`text-xs font-black bg-gradient-to-r bg-clip-text text-transparent ${getPowerColor(vh.ctrPower)}`}>
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
                {activeResearchTab === 'gaps' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {currentReport.competitors.map((comp, idx) => (
                      <Card key={idx} className="border-border hover:shadow transition-shadow flex flex-col justify-between h-full bg-card">
                        <CardHeader className="border-b bg-muted/10 py-2.5 px-3 flex flex-row items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <CardTitle className="text-xs font-bold">Angle of Attack #{idx+1}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 space-y-3 text-xs flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <p className="text-red-500 font-bold uppercase tracking-wider text-[9px]">❌ Competitor Weakness</p>
                            <p className="text-muted-foreground leading-relaxed font-medium">{comp.weakness}</p>
                          </div>

                          <div className="space-y-1 pt-2.5 border-t border-border">
                            <p className="text-emerald-500 font-bold uppercase tracking-wider text-[9px]">✅ Our Opportunity</p>
                            <p className="text-foreground leading-relaxed font-semibold">{comp.opportunity}</p>
                          </div>

                          <div className="pt-2.5 border-t border-border space-y-0.5 flex items-start gap-1.5 bg-primary/5 p-1.5 rounded border border-primary/10">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Subtitles Hook Strategy</p>
                              <p className="text-muted-foreground mt-0.5 leading-relaxed italic">{comp.scriptAngle}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* TAB CONTENT: TRENDS & INSPIRATIONS */}
                {activeResearchTab === 'trends' && (
                  <div className="grid gap-3">
                    {currentReport.trends.map((t, idx) => (
                      <Card key={idx} className="border-border hover:shadow transition-shadow bg-card">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-3 flex-col md:flex-row">
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5 pr-4">
                                <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                                &quot;{t.query}&quot;
                              </h4>
                              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 pr-2">
                                {t.angle}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1 shrink-0 max-w-[160px]">
                              {t.keywords.map((kw, kIdx) => (
                                <span
                                  key={kIdx}
                                  className="px-2 py-0.5 bg-muted border text-muted-foreground font-semibold rounded text-[9px] tracking-wide"
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
              <Card className="border-border shadow-sm flex flex-col items-center justify-center p-8 text-center space-y-3 bg-muted/10 min-h-[300px]">
                <Search className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">No growth analysis active</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                    Enter a competitor topic or business offer on the left side form to launch the AI Growth Operating System&apos;s automated Trend Miner.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: VIRAL CONTENT IDEAS */}
      {activeTab === 'ideas' && (
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Viral Content Concepts Planner
              </CardTitle>
              <CardDescription>Select your niche and AI will extract trending concepts, hooks, and storylines designed for local businesses.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end max-w-xl">
                <div className="flex-1 space-y-1.5">
                  <Label>Niche / Vertical Type</Label>
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
                <Button
                  onClick={() => ideasMutation.mutate({ niche })}
                  disabled={ideasMutation.isPending}
                >
                  {ideasMutation.isPending ? 'Extracting topics...' : 'Generate Viral Ideas'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {ideasMutation.data && (
            <div className="grid gap-4 md:grid-cols-3">
              {ideasMutation.data.map((idea, idx) => (
                <Card key={idx} className="border-border hover:shadow-md transition-shadow relative overflow-hidden bg-card flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary mr-[-10px] mt-[-10px]">Idea #{idx+1}</span>
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold leading-tight pr-6">{idea.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm flex-1 flex flex-col justify-between">
                    <p className="text-muted-foreground italic font-medium">&quot;{idea.hook}&quot;</p>
                    <p className="text-xs text-muted-foreground">{idea.description}</p>
                    <div className="pt-3 border-t text-xs font-semibold text-primary/90">
                      💡 Call To Action: {idea.cta}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: BRAND KIT */}
      {activeTab === 'brand' && (
        <Card className="max-w-xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Configure Custom Brand Kit
            </CardTitle>
            <CardDescription>Save logo assets, color systems, and default voices. AI will automatically inject these attributes into all captioning tools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5 border-b border-border pb-4 mb-4">
              <Label className="text-sm font-semibold text-foreground">Brand Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative h-16 w-16 rounded-xl border border-border bg-muted/20 overflow-hidden flex items-center justify-center group">
                    <img src={logoUrl} alt="Brand Logo" className="object-contain h-full w-full p-1" />
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      <Trash className="h-4 w-4 text-destructive-foreground hover:scale-110 transition-transform" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/60 bg-muted/5">
                    <Palette className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLogoUploadClick}
                    className="gap-2"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Logo Image
                  </Button>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG or SVG. Transparent background recommended.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Primary Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 p-0 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#16a34a"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Secondary Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 p-0 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#14532d"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Default AI Copy Tone / Voice</Label>
              <select
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="Hinglish-Casual">Friendly & Hinglish-Casual (Highly Recommended)</option>
                <option value="Professional">Formal Corporate / Professional</option>
                <option value="Humorous">Witty / Humorous</option>
                <option value="Energetic">Bold / Energetic</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Default Signature Call-to-Action (CTA)</Label>
              <Input
                type="text"
                value={ctaTemplate}
                onChange={(e) => setCtaTemplate(e.target.value)}
                placeholder="DM us 'DEAL' on WhatsApp to get started!"
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                Will be automatically appended at the bottom of all generated posts/scripts.
              </p>
            </div>

            <Button
              onClick={() => updateBrandMutation.mutate({ logoUrl, primaryColor, secondaryColor, brandVoice, ctaTemplate })}
              disabled={updateBrandMutation.isPending}
              className="w-full mt-2"
            >
              {updateBrandMutation.isPending ? 'Saving Brand Profile...' : 'Save Brand Kit'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
