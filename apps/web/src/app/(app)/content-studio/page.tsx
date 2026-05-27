'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Palette, FileText, Check, Copy, Flame, Lightbulb, Compass, Share2 } from 'lucide-react';

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

export default function ContentStudioPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'copy' | 'ideas' | 'brand'>('copy');
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

  // Fetch Brand Kit Query
  const { data: brandKit } = useQuery<BrandKit>({
    queryKey: ['brand-kit'],
    queryFn: async () => {
      const data = await api<BrandKit>('/content/brand-kit');
      if (data) {
        setPrimaryColor(data.primaryColor);
        setSecondaryColor(data.secondaryColor);
        setBrandVoice(data.brandVoice);
        setCtaTemplate(data.ctaTemplate);
      }
      return data;
    }
  });

  // Generate Copy Mutation
  const generateMutation = useMutation({
    mutationFn: (body: any) =>
      api<{ content: string }>('/content/studio/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setGeneratedResult(data.content);
      toast.success('AI content generated successfully!');
    },
    onError: (e: any) => toast.error(e.message || 'Generation failed'),
  });

  // Generate Ideas Mutation
  const ideasMutation = useMutation({
    mutationFn: (body: any) =>
      api<ContentIdea[]>('/content/ideas/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Viral content concepts generated!');
    },
    onError: (e: any) => toast.error(e.message || 'Ideas compilation failed'),
  });

  // Update Brand Kit Mutation
  const updateBrandMutation = useMutation({
    mutationFn: (body: any) =>
      api<BrandKit>('/content/brand-kit', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit'] });
      toast.success('Brand Kit saved successfully!');
    },
    onError: (e: any) => toast.error(e.message || 'Saving failed'),
  });

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
          Generate high-converting copies, viral hooks, reels script outlines, and custom brand assets in Hinglish.
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
                    <p className="text-muted-foreground italic font-medium">"{idea.hook}"</p>
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
              onClick={() => updateBrandMutation.mutate({ primaryColor, secondaryColor, brandVoice, ctaTemplate })}
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
