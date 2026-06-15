'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Star, Clipboard, Check, RefreshCw, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';

interface WidgetScriptData {
  script: string;
}

export default function SettingsTab() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [format, setFormat] = useState<'stars' | 'emojis'>('stars');
  const [copied, setCopied] = useState(false);

  // Fetch script embed code
  const { data, isLoading } = useQuery<WidgetScriptData>({
    queryKey: ['widgetScriptCode'],
    queryFn: () => api<WidgetScriptData>('/feedback/widget-script'),
  });

  const handleCopyCode = () => {
    const code = data?.script || `<!-- AI Feedback Widget -->`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Widget script copied to clipboard! 📋');
    setTimeout(() => setCopied(false), 2000);
  };

  const mockEmojis = ['😡', '😞', '😐', '😊', '🌟'];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Visual Customizer Options */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            Website Feedback Widget Customizer
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure how your embeddable feedback popup widget will look on your official landing pages.
          </p>
        </div>

        {/* Customization toggles */}
        <div className="space-y-4">
          {/* Theme selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400">Widget Theme</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 rounded-lg border p-3 text-sm font-semibold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-green-500 bg-white text-black shadow'
                    : 'border-border bg-background text-slate-400 hover:border-slate-600'
                }`}
              >
                ☀️ Light Theme
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 rounded-lg border p-3 text-sm font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-green-500 bg-slate-900 text-white shadow'
                    : 'border-border bg-background text-slate-400 hover:border-slate-600'
                }`}
              >
                🌙 Dark Theme
              </button>
            </div>
          </div>

          {/* Rating format selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400">Rating Interface Style</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormat('stars')}
                className={`flex-1 rounded-lg border p-3 text-sm font-semibold transition-all cursor-pointer ${
                  format === 'stars'
                    ? 'border-green-500 bg-white/5 text-white shadow'
                    : 'border-border bg-background text-slate-400 hover:border-slate-600'
                }`}
              >
                ⭐ Star Ratings
              </button>
              <button
                type="button"
                onClick={() => setFormat('emojis')}
                className={`flex-1 rounded-lg border p-3 text-sm font-semibold transition-all cursor-pointer ${
                  format === 'emojis'
                    ? 'border-green-500 bg-white/5 text-white shadow'
                    : 'border-border bg-background text-slate-400 hover:border-slate-600'
                }`}
              >
                😍 Emojis Smileys
              </button>
            </div>
          </div>
        </div>

        {/* Script Exporter CodeBlock */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Embed Script Code</span>
            <button
              onClick={handleCopyCode}
              disabled={isLoading}
              className="text-xs font-semibold text-green-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Embed Code'}
            </button>
          </div>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-background">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : (
            <pre className="rounded-lg border border-border bg-background p-3 text-[11px] font-mono text-slate-400 overflow-x-auto select-all max-h-48 overflow-y-auto">
              <code>{data?.script || '<!-- widget code block -->'}</code>
            </pre>
          )}
          <p className="text-[10px] text-muted-foreground">
            {"* Paste this HTML code block directly at the bottom of your site's body tag to activate the floating feedback button."}
          </p>
        </div>
      </div>

      {/* Visual Live Preview container mockup */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-base text-white">Visual Live Preview Mock</h3>
          <p className="text-xs text-muted-foreground">
            A real-time mockup demonstrating what your customers will see on your website.
          </p>
        </div>

        {/* Browser Mockup wrapper */}
        <div className="rounded-xl border border-border bg-background p-4 flex-1 flex items-center justify-center min-h-[300px] transition-all">
          <div
            className={`w-72 rounded-2xl p-5 shadow-2xl border transition-all duration-300 ${
              theme === 'light' ? 'bg-white border-slate-200 text-black' : 'bg-slate-900 border-white/10 text-white'
            }`}
          >
            {/* Header */}
            <div className="text-center mb-4">
              <h4 className="font-bold text-sm">Rate Your Experience</h4>
              <p className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Share feedback for Suresh Motors
              </p>
            </div>

            {/* Selector mock panel */}
            <div className="flex justify-center gap-2.5 py-4 border-y border-dashed border-slate-700/20 my-3">
              {format === 'stars'
                ? [1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 fill-amber-500 ${
                        star <= 4 ? 'text-amber-500' : theme === 'light' ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    />
                  ))
                : mockEmojis.map((emoji, index) => (
                    <span
                      key={index}
                      className={`text-2xl transition-all ${
                        index === 3 ? 'scale-125 saturate-100 filter drop-shadow' : 'opacity-40 grayscale saturate-50'
                      }`}
                    >
                      {emoji}
                    </span>
                  ))}
            </div>

            {/* Comment Text Input Area Mock */}
            <div className="space-y-3">
              <textarea
                readOnly
                placeholder="Type details privately..."
                rows={2}
                className={`w-full rounded-lg border p-2 text-xs focus:outline-none resize-none ${
                  theme === 'light'
                    ? 'border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400'
                    : 'border-white/10 bg-white/5 text-slate-200 placeholder-slate-500'
                }`}
              />
              <button
                type="button"
                className="w-full rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-1.5 text-xs shadow-sm transition-all"
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
