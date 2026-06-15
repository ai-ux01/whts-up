'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Star, MessageCircle, HeartHandshake, Smile, AlertCircle } from 'lucide-react';

export default function DashboardTab({ data }: { data: {
  summary?: {
    totalReviews: number;
    totalFeedbacks: number;
    totalGoogleReviews: number;
    averageRating: number;
    csat: number;
    nps: number;
    positiveRatio: number;
    negativeRatio: number;
  };
  ratingDistribution?: Record<number, number>;
  sentimentDistribution?: { POSITIVE: number; NEUTRAL: number; NEGATIVE: number };
  complaintCategories?: Array<{ category: string; count: number }>;
  trends?: Array<{ name: string; reviewsCount: number; averageRating: number; positiveRate: number }>;
} | undefined }) {
  const summary = data?.summary || {
    totalReviews: 0,
    averageRating: 0,
    csat: 0,
    nps: 0,
    positiveRatio: 0,
    negativeRatio: 0,
    totalFeedbacks: 0,
    totalGoogleReviews: 0,
  };

  const ratingDistribution = data?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const sentimentDistribution = data?.sentimentDistribution || { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
  const complaintCategories = data?.complaintCategories || [];
  const trends = data?.trends || [];

  // Recharts colors
  const SENTIMENT_COLORS = {
    POSITIVE: '#16a34a', // green
    NEUTRAL: '#eab308',  // yellow
    NEGATIVE: '#dc2626', // red
  };

  const sentimentPieData = [
    { name: 'Positive', value: sentimentDistribution.POSITIVE, color: SENTIMENT_COLORS.POSITIVE },
    { name: 'Neutral', value: sentimentDistribution.NEUTRAL, color: SENTIMENT_COLORS.NEUTRAL },
    { name: 'Negative', value: sentimentDistribution.NEGATIVE, color: SENTIMENT_COLORS.NEGATIVE },
  ].filter((item) => item.value > 0);

  const starBreakdownData = [
    { star: '5 Star', count: ratingDistribution[5] },
    { star: '4 Star', count: ratingDistribution[4] },
    { star: '3 Star', count: ratingDistribution[3] },
    { star: '2 Star', count: ratingDistribution[2] },
    { star: '1 Star', count: ratingDistribution[1] },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Average Rating Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Average Rating</span>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{summary.averageRating}</span>
            <span className="text-xs text-muted-foreground">/ 5.0 rating</span>
          </div>
          <p className="text-xs text-muted-foreground">Across all customer reviews</p>
        </div>

        {/* Total Reviews Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Total Reviews</span>
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{summary.totalReviews}</span>
            <span className="text-xs text-muted-foreground">submissions</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.totalGoogleReviews || 0} Google • {summary.totalFeedbacks || 0} Private
          </p>
        </div>

        {/* CSAT Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">CSAT Score</span>
            <HeartHandshake className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{summary.csat}%</span>
            <span className="text-xs text-muted-foreground">satisfied</span>
          </div>
          <p className="text-xs text-muted-foreground">Ratio of 4 & 5 star ratings</p>
        </div>

        {/* NPS Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Net Promoter Score (NPS)</span>
            <Smile className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{summary.nps > 0 ? `+${summary.nps}` : summary.nps}</span>
            <span className="text-xs text-muted-foreground">index</span>
          </div>
          <p className="text-xs text-muted-foreground">Range: -100 to +100</p>
        </div>
      </div>

      {/* Main Charts Panel */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Trend Area Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 lg:col-span-2">
          <div>
            <h3 className="font-semibold text-base">Reviews Growth Trend</h3>
            <p className="text-xs text-muted-foreground">Volume growth and CSAT shift over the past weeks</p>
          </div>
          <div className="h-72 w-full">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reviewsCount"
                    name="Total Reviews"
                    stroke="#16a34a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReviews)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No trend data compiled yet.
              </div>
            )}
          </div>
        </div>

        {/* Sentiment share Donut Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-base">Customer Sentiment</h3>
            <p className="text-xs text-muted-foreground">Positive vs Neutral vs Negative feedback ratio</p>
          </div>
          <div className="flex h-56 items-center justify-center">
            {sentimentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sentimentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No sentiment tags found.</div>
            )}
          </div>
          <div className="flex justify-center gap-6 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
              <span>Positive ({summary.positiveRatio}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span>Neutral</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              <span>Negative ({summary.negativeRatio}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Complaint Categories & Star Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Star breakdown progress lines */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-base">Rating Distribution</h3>
            <p className="text-xs text-muted-foreground">Breakdown of customer star selections</p>
          </div>
          <div className="space-y-3">
            {starBreakdownData.map((row) => {
              const percentage = summary.totalReviews > 0 ? (row.count / summary.totalReviews) * 100 : 0;
              return (
                <div key={row.star} className="flex items-center gap-4 text-sm font-medium">
                  <span className="w-12 text-muted-foreground">{row.star}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{row.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complaint Categories Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-base">Operational Hotspots</h3>
            <p className="text-xs text-muted-foreground">Main complaint categories detected by AI</p>
          </div>
          <div className="h-56 w-full">
            {complaintCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintCategories} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 5 }}>
                  <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="category" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground text-center gap-2">
                <AlertCircle className="h-8 w-8 text-green-500" />
                <p>Perfect! No operational complaint hotspots detected by AI.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
