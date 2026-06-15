'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  Cell
} from 'recharts';
import { TrendingUp, AlertTriangle, Star, CheckCircle, BarChart3 } from 'lucide-react';

interface ReviewsAnalysisTabProps {
  compareData: any;
}

export default function ReviewsAnalysisTab({ compareData }: ReviewsAnalysisTabProps) {
  const own = compareData?.ownBusiness || {
    name: 'Your Business',
    averageRating: 0.0,
    totalReviews: 0,
    positiveRate: 0,
    sentiment: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
  };

  const competitors = compareData?.competitors || [];
  const complaints = compareData?.competitorComplaints || [];
  const trends = compareData?.trends || [];

  const sentimentTotal = own.sentiment.POSITIVE + own.sentiment.NEUTRAL + own.sentiment.NEGATIVE;

  // Sentiment distributions for custom bars
  const ownSentimentData = [
    { name: 'Positive', count: own.sentiment.POSITIVE, percentage: sentimentTotal > 0 ? Math.round((own.sentiment.POSITIVE / sentimentTotal) * 100) : 0, color: '#10b981' },
    { name: 'Neutral', count: own.sentiment.NEUTRAL, percentage: sentimentTotal > 0 ? Math.round((own.sentiment.NEUTRAL / sentimentTotal) * 100) : 0, color: '#6366f1' },
    { name: 'Negative', count: own.sentiment.NEGATIVE, percentage: sentimentTotal > 0 ? Math.round((own.sentiment.NEGATIVE / sentimentTotal) * 100) : 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {competitors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="font-bold text-lg text-white">No data available for analysis</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Please track at least one competitor in the Overview tab to seed reviews and generate analytics graphs.
          </p>
        </div>
      ) : (
        <>
          {/* Charts Row 1: Weekly Rating Trends */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <div>
                  <h4 className="font-bold text-white text-base">Weekly Rating Comparison</h4>
                  <p className="text-xs text-muted-foreground">Historical average rating progression over the past 4 weeks.</p>
                </div>
              </div>
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorYourRating" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorCompRating" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[3.0, 5.0]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area name="Your Rating" type="monotone" dataKey="yourRating" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorYourRating)" />
                    <Area name="Competitors Average" type="monotone" dataKey="competitorsAverageRating" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorCompRating)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart Column 2: Competitors Complaint Share */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                <div>
                  <h4 className="font-bold text-white text-base">Competitors Top Operational Complaints</h4>
                  <p className="text-xs text-muted-foreground">Volume count of categorized negative topics identified in competitor reviews.</p>
                </div>
              </div>
              <div className="h-72 w-full pt-2">
                {complaints.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No complaint patterns found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={complaints} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                      <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {complaints.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#fda4af'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Sentiment Comparison and Stats List */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Sentiment Box: Own Business */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 md:col-span-1">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Your Sentiment Share
              </h4>
              <p className="text-xs text-muted-foreground">Sentiment ratios derived from your local ratings and feedbacks.</p>

              <div className="space-y-4 pt-2">
                {ownSentimentData.map((s, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{s.name} ({s.count})</span>
                      <span style={{ color: s.color }}>{s.percentage}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.percentage}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* List Table: Top Praises vs Complaints per competitor */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 md:col-span-2">
              <h4 className="font-bold text-white text-base">Key Comparative Qualitative Insights</h4>
              <p className="text-xs text-muted-foreground">Quick list detailing top features customers praise and hate per business.</p>
              
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 text-left font-bold text-slate-400 bg-muted/5">
                      <th className="p-3 pl-4">Business Name</th>
                      <th className="p-3">Average Rating</th>
                      <th className="p-3 text-emerald-400">Primary Core Praise</th>
                      <th className="p-3 text-rose-400">Primary Core Complaint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    <tr className="bg-indigo-500/5 font-medium">
                      <td className="p-3 pl-4 text-indigo-400">{own.name} (You)</td>
                      <td className="p-3 text-slate-100 font-bold">{own.averageRating.toFixed(2)}</td>
                      <td className="p-3 text-emerald-400 font-semibold">Instant Automated CRM Support</td>
                      <td className="p-3 text-slate-400 font-medium">None</td>
                    </tr>
                    {competitors.map((comp: any) => (
                      <tr key={comp.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 pl-4 text-white font-semibold">{comp.name}</td>
                        <td className="p-3 font-semibold">{comp.averageRating.toFixed(2)}</td>
                        <td className="p-3 font-medium text-emerald-400/80">{comp.topPraise || 'None'}</td>
                        <td className="p-3 font-medium text-rose-400/80">{comp.topComplaint || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
