'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, BarChart3, MessageSquare, Sparkles, Settings2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';
import DashboardTab from './dashboard-tab';
import ReviewsTab from './reviews-tab';
import RequestsTab from './requests-tab';
import InsightsTab from './insights-tab';
import SettingsTab from './settings-tab';

interface ReputationDashboardData {
  summary: {
    totalReviews: number;
    totalFeedbacks: number;
    totalGoogleReviews: number;
    averageRating: number;
    csat: number;
    nps: number;
    positiveRatio: number;
    negativeRatio: number;
  };
  ratingDistribution: Record<number, number>;
  sentimentDistribution: { POSITIVE: number; NEUTRAL: number; NEGATIVE: number };
  complaintCategories: Array<{ category: string; count: number }>;
  trends: Array<{ name: string; reviewsCount: number; averageRating: number; positiveRate: number }>;
}

export default function ReputationPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'requests' | 'insights' | 'settings'>('dashboard');

  // Fetch consolidated reputation metrics
  const { data: dashboardData, isLoading, refetch, isRefetching } = useQuery<ReputationDashboardData>({
    queryKey: ['reputationDashboard'],
    queryFn: () => api<ReputationDashboardData>('/reputation/dashboard'),
  });

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'reviews', label: 'Google Reviews', icon: Star },
    { id: 'requests', label: 'Feedback Requests', icon: MessageSquare },
    { id: 'insights', label: 'AI Business Insights', icon: Sparkles },
    { id: 'settings', label: 'Widget & Settings', icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Reputation & Feedback Engine</h1>
          <p className="text-muted-foreground">
            Collect automated WhatsApp feedback, improve Google ratings, and evaluate sentiment insights.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent hover:text-accent-foreground shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'dashboard' | 'reviews' | 'requests' | 'insights' | 'settings')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Compiling reputation insights...</p>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {activeTab === 'dashboard' && <DashboardTab data={dashboardData} />}
          {activeTab === 'reviews' && <ReviewsTab />}
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'insights' && <InsightsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      )}
    </div>
  );
}
