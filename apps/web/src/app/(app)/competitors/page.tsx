'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Target,
  BarChart3,
  TrendingUp,
  Award,
  Zap,
  Download,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api-client';
import DashboardTab from './dashboard-tab';
import ReviewsAnalysisTab from './reviews-analysis-tab';
import SwotTab from './swot-tab';
import MarketGapsTab from './market-gaps-tab';
import ImprovementsTab from './improvements-tab';
import ReportsTab from './reports-tab';

export default function CompetitorsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'swot' | 'gaps' | 'improvements' | 'reports'>('dashboard');

  // Fetch comparison analytics data to keep it centralized and shared
  const { data: compareData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['competitorsCompare'],
    queryFn: () => api<any>('/reviews-analysis/compare'),
  });

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'reviews', label: 'Review Analysis', icon: TrendingUp },
    { id: 'swot', label: 'SWOT Analysis', icon: Target },
    { id: 'gaps', label: 'AI Market Gaps', icon: Award },
    { id: 'improvements', label: 'Product Improvements', icon: Zap },
    { id: 'reports', label: 'Executive Reports', icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Competitor Intelligence & Improvements
          </h1>
          <p className="text-muted-foreground">
            Track Indian local competitors, compare reviews and ratings, run SWOT analysis, detect market gaps, and get AI product upgrades.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-accent hover:text-white shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Refreshing...' : 'Refresh Competitors'}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
            <p className="text-sm text-muted-foreground">Compiling competitor analytics...</p>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {activeTab === 'dashboard' && <DashboardTab compareData={compareData} refetchCompare={refetch} />}
          {activeTab === 'reviews' && <ReviewsAnalysisTab compareData={compareData} />}
          {activeTab === 'swot' && <SwotTab />}
          {activeTab === 'gaps' && <MarketGapsTab />}
          {activeTab === 'improvements' && <ImprovementsTab />}
          {activeTab === 'reports' && <ReportsTab />}
        </div>
      )}
    </div>
  );
}
