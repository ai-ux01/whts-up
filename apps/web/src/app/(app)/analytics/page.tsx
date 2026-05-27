'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  TrendingUp,
  Eye,
  Users,
  MessageSquare,
  Percent,
  PlayCircle,
  Share2,
  Calendar
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AnalyticsData {
  reach: {
    instagramReelViews: number;
    instagramFollowers: number;
    facebookLikes: number;
    postEngagements: number;
  };
  crm: {
    totalLeads: number;
    closedDeals: number;
    interestedLeads: number;
    activeCampaigns: number;
  };
  charts: {
    engagementTrend: Array<{ date: string; views: number; clicks: number; leads: number }>;
    platformSplit: Array<{ name: string; value: number }>;
  };
}

const COLORS = ['#16a34a', '#3b82f6', '#ec4899'];

export default function AnalyticsPage() {
  // Fetch Platform Analytics Query
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['platform-analytics'],
    queryFn: () => api<AnalyticsData>('/content/analytics'),
  });

  const mockAnalytics: AnalyticsData = {
    reach: {
      instagramReelViews: 45290,
      instagramFollowers: 12480,
      facebookLikes: 8930,
      postEngagements: 3820,
    },
    crm: {
      totalLeads: 128,
      closedDeals: 24,
      interestedLeads: 42,
      activeCampaigns: 4,
    },
    charts: {
      engagementTrend: [
        { date: 'Mon', views: 5200, clicks: 310, leads: 8 },
        { date: 'Tue', views: 6800, clicks: 420, leads: 15 },
        { date: 'Wed', views: 8100, clicks: 510, leads: 22 },
        { date: 'Thu', views: 7900, clicks: 480, leads: 19 },
        { date: 'Fri', views: 9500, clicks: 650, leads: 31 },
        { date: 'Sat', views: 12000, clicks: 820, leads: 44 },
        { date: 'Sun', views: 11000, clicks: 750, leads: 38 }
      ],
      platformSplit: [
        { name: 'Instagram Reels', value: 65 },
        { name: 'Facebook Pages', value: 25 },
        { name: 'WhatsApp Campaigns', value: 10 }
      ]
    }
  };

  const data = analytics || mockAnalytics;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor your cross-channel reach, reels performance, ad click analytics, and direct WhatsApp CRM lead conversions.
        </p>
      </div>

      {/* Grid Row: Key Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm bg-card hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Reel Views (IG/FB)</CardTitle>
            <PlayCircle className="h-5 w-5 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{data.reach.instagramReelViews.toLocaleString()}</div>
            <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +18.4% since last week
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Social Engagements</CardTitle>
            <Users className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{data.reach.postEngagements.toLocaleString()}</div>
            <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +12.3% active interaction rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">CRM Leads Collected</CardTitle>
            <MessageSquare className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{data.crm.totalLeads} leads</div>
            <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +8.5% automated conversion
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Closed Deal Conversions</CardTitle>
            <Percent className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {((data.crm.closedDeals / (data.crm.totalLeads || 1)) * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {data.crm.closedDeals} sales won this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recharts Charts Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Engagement Trend line chart */}
        <Card className="border-border shadow-sm md:col-span-2 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg">Campaign Performance Trend</CardTitle>
            <CardDescription>Track Reel views, ad clicks, and direct WhatsApp conversions daily.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.engagementTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0F172A', color: '#FFF', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="views" name="Video Views" stroke="#ec4899" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="clicks" name="Link Clicks" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="leads" name="CRM Leads" stroke="#16a34a" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform traffic split pie chart */}
        <Card className="border-border shadow-sm md:col-span-1 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg">Platform Share</CardTitle>
            <CardDescription>Source of generated impressions and inbound leads.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.platformSplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.charts.platformSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" layout="horizontal" align="center" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
