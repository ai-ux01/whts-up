'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, MessageSquare, Inbox, Bot, Megaphone } from 'lucide-react';
import { api } from '@/lib/api-client';
import { leadSourceLabel } from '@/lib/lead-source';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

interface DashboardStats {
  totalLeads: number;
  activeConversations: number;
  todayMessages: number;
  aiRepliesCount: number;
  leadsByStatus: { status: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  messagesPerDay: { date: string; count: number }[];
  broadcastStats: {
    totalCampaigns: number;
    recentCampaigns: Array<{
      id: string;
      name: string;
      status: string;
      totalRecipients: number;
      sentCount: number;
    }>;
  };
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardStats>('/dashboard/stats'),
  });

  const stats = [
    { label: 'Total Leads', value: data?.totalLeads ?? 0, icon: Users },
    { label: 'Active Conversations', value: data?.activeConversations ?? 0, icon: Inbox },
    { label: "Today's Messages", value: data?.todayMessages ?? 0, icon: MessageSquare },
    { label: 'AI Replies Today', value: data?.aiRepliesCount ?? 0, icon: Bot },
  ];

  if (isLoading) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your WhatsApp CRM</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Messages (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.messagesPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.leadsByStatus || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {(data?.leadsByStatus || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by source</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {(data?.leadsBySource?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data?.leadsBySource || []).map((s) => ({
                    ...s,
                    label: leadSourceLabel(s.source),
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect marketing accounts in Settings. Meta ad referrals tag leads
                automatically.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <CardTitle>Broadcast campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.broadcastStats.recentCampaigns?.length ? (
            <div className="space-y-3">
              {data.broadcastStats.recentCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.status}</p>
                  </div>
                  <p className="text-sm">
                    {c.sentCount}/{c.totalRecipients} sent
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No campaigns yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
