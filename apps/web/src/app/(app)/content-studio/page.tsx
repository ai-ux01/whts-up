'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { WorkflowGuide } from '@/components/workflow-guide';
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
  Upload,
  Calendar,
  Rocket,
  Film,
  Target,
  ArrowRight
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
  // What the competitor does well, and how to counter/neutralise it.
  theirStrength?: string;
  counterStrategy?: string;
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

interface CompetitorAnalysisItem {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  averageRating: number;
  totalReviews: number;
  reviewsAnalyzed: number;
  positiveRate: number;
  sentiment: { POSITIVE: number; NEUTRAL: number; NEGATIVE: number };
  topComplaints: Array<{ category: string; count: number }>;
  topPraise: Array<{ category: string; count: number }>;
  sampleReviews: Array<{ rating: number; text: string | null; sentiment: string | null }>;
  ratingVsOurs: number | null;
}

interface CompetitorAnalysisReport {
  hasData: boolean;
  ownBusiness: { averageRating: number; totalReviews: number };
  competitors: CompetitorAnalysisItem[];
  competitorGaps: CompetitorGap[];
  marketGaps: Array<{ title: string; description: string }>;
}

export default function ContentStudioPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  // Default to Research — the natural first step of the workflow.
  const [activeTab, setActiveTab] = useState<'research' | 'ideas' | 'copy' | 'brand'>('research');
  const [copied, setCopied] = useState(false);

  // Copywriting Form State
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('caption');
  const [language, setLanguage] = useState('Hinglish');
  const [tone, setTone] = useState('Hinglish-Casual');
  const [generatedResult, setGeneratedResult] = useState('');
  // Tracks whether the Brand Kit has been applied to the current generated copy.
  const [brandApplied, setBrandApplied] = useState(false);

  // Ideas State
  const [niche, setNiche] = useState('Real Estate');
  // Seed passed down the chain from Research (a gap/trend/hook) into idea creation.
  const [ideaSeed, setIdeaSeed] = useState('');

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
  // Research sub-steps run in order:
  // Competitor Analysis → Competitor Gaps → Trending Queries → Viral Hooks.
  const [activeResearchTab, setActiveResearchTab] = useState<'analysis' | 'gaps' | 'trends' | 'hooks'>('analysis');

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

  // Detailed competitor analysis that grounds the research report's gaps/trends/hooks.
  const { data: competitorAnalysis } = useQuery<CompetitorAnalysisReport>({
    queryKey: ['competitor-analysis'],
    queryFn: () => api<CompetitorAnalysisReport>('/content/research/competitor-analysis'),
  });
  const trackedCompetitors = competitorAnalysis?.competitors ?? [];

  // Generate Copy Mutation
  const generateMutation = useMutation({
    mutationFn: (body: { type: string; topic: string; tone: string; language: string }) =>
      api<{ content: string }>('/content/studio/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setGeneratedResult(data.content);
      setBrandApplied(false);
      toast.success('AI content generated successfully!');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Generation failed'),
  });

  // Generate Ideas Mutation
  const ideasMutation = useMutation({
    mutationFn: (body: { niche: string; seed?: string }) =>
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
      queryClient.invalidateQueries({ queryKey: ['competitor-analysis'] });
      setActiveReport(data);
      // Land on the Competitor Analysis stage first — it gates the rest.
      setActiveResearchTab('analysis');
      setResearchTopic('');
      toast.success('Competitor analysis complete — review it, then explore gaps, trends & hooks.');
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
    setActiveResearchTab('analysis');
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

  // Schedule the generated copy as a post (tomorrow 10am) — wires Create -> Publish.
  const scheduleMutation = useMutation({
    mutationFn: () => {
      const when = new Date();
      when.setDate(when.getDate() + 1);
      when.setHours(10, 0, 0, 0);
      return api('/content/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: topic ? topic.slice(0, 80) : 'Generated content',
          content: generatedResult,
          scheduledAt: when.toISOString(),
          platform: 'BOTH',
        }),
      });
    },
    onSuccess: () => {
      toast.success('Scheduled for tomorrow 10 AM — see Content Calendar');
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not schedule'),
  });

  // CHAINED PIPELINE STEP 3 → BRAND:
  // Apply the saved Brand Kit to the generated copy (enforce voice + CTA) and
  // return the brand's visual attributes so we can frame the result.
  const applyBrandMutation = useMutation({
    mutationFn: () =>
      api<{ content: string; brand: { brandVoice: string; ctaTemplate: string; primaryColor: string; secondaryColor: string; logoUrl: string | null } }>(
        '/content/studio/apply-brand-kit',
        {
          method: 'POST',
          body: JSON.stringify({ content: generatedResult }),
        },
      ),
    onSuccess: (data) => {
      setGeneratedResult(data.content);
      setBrandApplied(true);
      toast.success('Brand Kit applied — voice + CTA locked in');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not apply Brand Kit'),
  });

  // Create a Reel project from the generated copy — wires Copywriting -> Reel Creator.
  const createReelMutation = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/content/reels', {
        method: 'POST',
        body: JSON.stringify({
          title: (topic || generatedResult).slice(0, 120) || 'Generated reel',
          niche,
          offer: generatedResult.slice(0, 280) || topic,
        }),
      }),
    onSuccess: (reel) => {
      toast.success('Reel project created — opening Reel Creator');
      router.push(reel?.id ? `/reel-creator?id=${reel.id}` : '/reel-creator');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not create reel'),
  });

  // Send the topic to the Campaign Engine — wires Create -> full Campaign.
  const turnIntoCampaign = () => {
    router.push(`/campaign-engine?topic=${encodeURIComponent(topic || generatedResult.slice(0, 80))}`);
  };

  // CHAINED PIPELINE STEP 1 → 2:
  // A competitor gap / trending query / viral hook feeds the Viral Ideas step.
  // We seed the idea generator and jump to the Ideas tab (NOT the campaign engine).
  const createIdeaFromSeed = (seed: string) => {
    const trimmed = seed.trim();
    setIdeaSeed(trimmed);
    // Pre-fill niche context if the research report carries a niche.
    if (currentReport?.niche) setNiche(currentReport.niche);
    setActiveTab('ideas');
    toast.success('Seeded Viral Ideas — generate concepts from this angle');
  };

  // CHAINED PIPELINE STEP 2 → 3:
  // A viral idea feeds Copywriting. We seed the copy topic and jump to the Copy tab.
  const writeCopyFromIdea = (seed: string) => {
    setTopic(seed.trim());
    setActiveTab('copy');
    toast.success('Seeded Copywriting — write the post from this idea');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <WorkflowGuide />
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
          AI Content Studio
        </h1>
        <p className="text-muted-foreground mt-1">
          Work top-to-bottom: research the angle, <strong>Create Viral Idea</strong>, then <strong>Write Copy</strong> — and finally turn it into a campaign.
        </p>
        {/* Inline flow hint — the chained research-to-copy pipeline */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Competitor Analysis</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Competitor Gaps</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Trending Queries</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Viral Hooks</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-primary">Create Viral Idea</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-primary">Write Copy</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-primary">Apply Brand Kit</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Turn into Campaign → Launch</span>
        </div>
      </div>

      {/* Tabs Row — ordered to match the natural workflow:
          Research (find the angle) → Ideas (shape concepts) → Copywriting (write it) → Brand Kit (context) */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('research')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'research'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          1 · Research
        </button>
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ideas'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Compass className="h-4 w-4" />
          2 · Viral Ideas
        </button>
        <button
          onClick={() => setActiveTab('copy')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'copy'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          3 · Copywriting
        </button>
        <button
          onClick={() => setActiveTab('brand')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'brand'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="h-4 w-4" />
          Brand Kit
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    variant={brandApplied ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => applyBrandMutation.mutate()}
                    disabled={applyBrandMutation.isPending}
                    className="gap-2"
                  >
                    {brandApplied ? <Check className="h-4 w-4 text-emerald-500" /> : <Palette className="h-4 w-4" />}
                    {applyBrandMutation.isPending ? 'Applying…' : brandApplied ? 'Brand Applied' : 'Apply Brand Kit'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => scheduleMutation.mutate()}
                    disabled={scheduleMutation.isPending}
                    className="gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    {scheduleMutation.isPending ? 'Scheduling…' : 'Schedule'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createReelMutation.mutate()}
                    disabled={createReelMutation.isPending}
                    className="gap-2"
                  >
                    <Film className="h-4 w-4" />
                    {createReelMutation.isPending ? 'Creating…' : 'Create Reel'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={turnIntoCampaign} className="gap-2">
                    <Rocket className="h-4 w-4" />
                    Turn into Campaign
                  </Button>
                </div>
              )}
            </CardHeader>
            {generatedResult && !brandApplied && (
              <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-6 py-2 text-xs text-muted-foreground">
                <Palette className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  Next step: <strong className="text-foreground">Apply Brand Kit</strong> to lock in your brand voice and signature CTA before turning this into a campaign.
                </span>
              </div>
            )}
            {generatedResult && brandApplied && (
              <div className="flex items-center gap-2 border-b border-border bg-emerald-500/5 px-6 py-2 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Brand Kit applied — voice and CTA are on-brand. You can now Turn into Campaign.</span>
              </div>
            )}
            <CardContent className="flex-1 p-0 flex flex-col">
              {generatedResult ? (
                <Textarea
                  value={generatedResult}
                  onChange={(e) => setGeneratedResult(e.target.value)}
                  className="flex-1 min-h-[320px] resize-none rounded-none border-0 bg-muted/20 p-6 font-sans text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Your generated copy appears here — edit it freely before scheduling, creating a reel, or turning it into a campaign."
                  aria-label="Generated content editor"
                />
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[320px] text-muted-foreground space-y-3 bg-muted/20">
                  <Flame className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
                  <p>Input your offer details and click generate to launch AI SaaS copywriting tools.</p>
                </div>
              )}
              {generatedResult && (
                <p className="border-t border-border px-6 py-2 text-[11px] text-muted-foreground">
                  ✏️ Editable — tweak the copy above; your changes flow into Schedule, Create Reel, and Turn into Campaign.
                </p>
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
                <CardDescription>
                  Runs competitor analysis first, then compiles competitor gaps, trending queries, and viral hooks.
                </CardDescription>
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
                {/* Staged research sequence:
                    0 · Competitor Analysis → 1 · Gaps → 2 · Trends → 3 · Hooks */}
                <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
                  <button
                    onClick={() => setActiveResearchTab('analysis')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                      activeResearchTab === 'analysis'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Target className="h-3.5 w-3.5" />
                    1 · Competitor Analysis
                  </button>
                  <button
                    onClick={() => setActiveResearchTab('gaps')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                      activeResearchTab === 'gaps'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    2 · Competitor Gaps
                  </button>
                  <button
                    onClick={() => setActiveResearchTab('trends')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                      activeResearchTab === 'trends'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    3 · Trending Queries
                  </button>
                  <button
                    onClick={() => setActiveResearchTab('hooks')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                      activeResearchTab === 'hooks'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    4 · Viral Hooks
                  </button>
                </div>

                {/* STAGE 1 — COMPETITOR ANALYSIS (runs first, gates the rest) */}
                {activeResearchTab === 'analysis' && (
                  <div className="space-y-4">
                    {trackedCompetitors.length > 0 ? (
                      <>
                        {/* Summary banner */}
                        <Card className="border-emerald-500/25 bg-emerald-500/5">
                          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-sm flex items-center gap-2 text-emerald-600">
                                <Target className="h-4 w-4" /> Competitor analysis applied
                              </CardTitle>
                              <CardDescription>
                                Grounded in {trackedCompetitors.length} tracked competitor{trackedCompetitors.length === 1 ? '' : 's'}. The gaps, trends and hooks below are derived from their real reviews.
                              </CardDescription>
                            </div>
                            <Button size="sm" className="gap-1 shrink-0" onClick={() => setActiveResearchTab('gaps')}>
                              Continue to Competitor Gaps <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </CardHeader>
                          {competitorAnalysis && competitorAnalysis.ownBusiness.totalReviews > 0 && (
                            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div className="rounded-lg border border-border bg-background p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Your rating</p>
                                <p className="text-lg font-black text-foreground">{competitorAnalysis.ownBusiness.averageRating}★</p>
                                <p className="text-[10px] text-muted-foreground">{competitorAnalysis.ownBusiness.totalReviews} reviews</p>
                              </div>
                              <div className="rounded-lg border border-border bg-background p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Competitors avg</p>
                                <p className="text-lg font-black text-foreground">
                                  {(
                                    trackedCompetitors.reduce((s, c) => s + c.averageRating, 0) / trackedCompetitors.length
                                  ).toFixed(1)}★
                                </p>
                                <p className="text-[10px] text-muted-foreground">{trackedCompetitors.length} tracked</p>
                              </div>
                              <div className="rounded-lg border border-border bg-background p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Gaps found</p>
                                <p className="text-lg font-black text-foreground">{competitorAnalysis.competitorGaps.length}</p>
                                <p className="text-[10px] text-muted-foreground">from real reviews</p>
                              </div>
                              <div className="rounded-lg border border-border bg-background p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Reviews analyzed</p>
                                <p className="text-lg font-black text-foreground">
                                  {trackedCompetitors.reduce((s, c) => s + c.reviewsAnalyzed, 0)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">competitor reviews</p>
                              </div>
                            </CardContent>
                          )}
                        </Card>

                        {/* Per-competitor detailed report */}
                        <div className="grid gap-4">
                          {trackedCompetitors.map((c) => (
                            <Card key={c.id} className="border-border bg-card">
                              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="text-base">{c.name}</CardTitle>
                                  <CardDescription>
                                    {[c.category, c.location].filter(Boolean).join(' · ')}
                                  </CardDescription>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xl font-black text-foreground">{c.averageRating}★</p>
                                  <p className="text-[10px] text-muted-foreground">{c.totalReviews} reviews</p>
                                  {c.ratingVsOurs !== null && (
                                    <p className={`text-[10px] font-bold ${c.ratingVsOurs > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                      {c.ratingVsOurs > 0 ? `+${c.ratingVsOurs}` : c.ratingVsOurs} vs you
                                    </p>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 text-xs">
                                {/* Sentiment split */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sentiment</span>
                                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600">🟢 {c.sentiment.POSITIVE}</span>
                                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600">🟡 {c.sentiment.NEUTRAL}</span>
                                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-semibold text-red-500">🔴 {c.sentiment.NEGATIVE}</span>
                                  <span className="text-muted-foreground">· {c.positiveRate}% positive</span>
                                </div>

                                {/* Complaints vs praise */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-red-500">Top complaints (their weakness)</p>
                                    {c.topComplaints.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {c.topComplaints.map((t) => (
                                          <span key={t.category} className="rounded border border-red-500/20 bg-red-500/5 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                                            {t.category} ({t.count})
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground italic">None recorded</p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Top praise (their strength)</p>
                                    {c.topPraise.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {c.topPraise.map((t) => (
                                          <span key={t.category} className="rounded border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                                            {t.category} ({t.count})
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground italic">None recorded</p>
                                    )}
                                  </div>
                                </div>

                                {/* Sample reviews */}
                                {c.sampleReviews.length > 0 && (
                                  <div className="space-y-1 pt-2 border-t border-border">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sample reviews</p>
                                    {c.sampleReviews.map((r, i) => (
                                      <p key={i} className="text-[11px] text-muted-foreground leading-snug">
                                        <span className="font-bold text-foreground">{r.rating}★</span> &quot;{r.text}&quot;
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <div className="flex justify-end">
                          <Button size="sm" className="gap-1" onClick={() => setActiveResearchTab('gaps')}>
                            Continue to Competitor Gaps <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Card className="border-amber-500/25 bg-amber-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                            <Target className="h-4 w-4" /> No competitors tracked yet
                          </CardTitle>
                          <CardDescription>
                            This report is niche/topic-based only. Track competitors to ground the gaps in their real reviews, then regenerate the report.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => router.push('/competitors')}>
                            <Target className="h-3.5 w-3.5" /> Track competitors
                          </Button>
                          <Button size="sm" className="gap-1" onClick={() => setActiveResearchTab('gaps')}>
                            Continue anyway <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

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

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-2 bg-muted/40 p-2 rounded border">
                                <Award className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                <div className="text-right">
                                  <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">CTR Power</p>
                                  <p className={`text-xs font-black bg-gradient-to-r bg-clip-text text-transparent ${getPowerColor(vh.ctrPower)}`}>
                                    {vh.ctrPower}%
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="gap-1 shrink-0"
                                onClick={() => createIdeaFromSeed(vh.hook)}
                              >
                                <Lightbulb className="h-3.5 w-3.5" /> Create Viral Idea
                              </Button>
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

                          {(comp.theirStrength || comp.counterStrategy) && (
                            <div className="space-y-1 pt-2.5 border-t border-border">
                              <p className="text-amber-600 font-bold uppercase tracking-wider text-[9px]">🛡️ Tackle Their Strength</p>
                              {comp.theirStrength && (
                                <p className="text-muted-foreground leading-relaxed">
                                  <span className="font-semibold text-foreground">They&apos;re strong at:</span> {comp.theirStrength}
                                </p>
                              )}
                              {comp.counterStrategy && (
                                <p className="text-foreground leading-relaxed font-medium">
                                  <span className="font-semibold text-amber-600">Counter:</span> {comp.counterStrategy}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="pt-2.5 border-t border-border space-y-0.5 flex items-start gap-1.5 bg-primary/5 p-1.5 rounded border border-primary/10">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Subtitles Hook Strategy</p>
                              <p className="text-muted-foreground mt-0.5 leading-relaxed italic">{comp.scriptAngle}</p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="w-full gap-1 mt-1"
                            onClick={() => createIdeaFromSeed(comp.opportunity || comp.scriptAngle)}
                          >
                            <Lightbulb className="h-3.5 w-3.5" /> Create Viral Idea
                          </Button>
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

                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => createIdeaFromSeed(t.query)}
                          >
                            <Lightbulb className="h-3.5 w-3.5" /> Create Viral Idea
                          </Button>
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
            <CardContent className="space-y-4">
              {/* Seed carried in from Research (a gap / trend / hook) */}
              {ideaSeed && (
                <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                  <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">From your research</p>
                    <p className="text-foreground leading-snug">{ideaSeed}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIdeaSeed('')}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear research seed"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
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
                  onClick={() => ideasMutation.mutate(ideaSeed ? { niche, seed: ideaSeed } : { niche })}
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
                    <Button
                      size="sm"
                      className="w-full gap-1"
                      onClick={() => writeCopyFromIdea(idea.title || idea.hook)}
                    >
                      <FileText className="h-3.5 w-3.5" /> Write Copy
                    </Button>
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
