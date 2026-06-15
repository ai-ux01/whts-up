'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @typescript-eslint/no-unused-vars */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Star,
  MapPin,
  TrendingUp,
  Award,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardTabProps {
  compareData: any;
  refetchCompare: () => void;
}

interface CompetitorSearchResult {
  name: string;
  category: string;
  location: string;
  averageRating: number;
  totalReviews: number;
  source: string;
}

export default function DashboardTab({ compareData, refetchCompare }: DashboardTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('Salons');
  const [searchLocation, setSearchLocation] = useState('Mumbai');
  const [searchResults, setSearchResults] = useState<CompetitorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => api('/competitors/sync', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Competitor reviews synchronised successfully!');
      refetchCompare();
    },
    onError: () => {
      toast.error('Sync failed. Please try again.');
    },
  });

  // Track mutation
  const trackMutation = useMutation({
    mutationFn: (dto: CompetitorSearchResult) =>
      api('/competitors/track', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      toast.success('Successfully tracking competitor!');
      refetchCompare();
      // Remove tracked competitor from active search results list to avoid duplicate click
      setSearchResults((prev) => prev.filter((r) => r.name !== trackMutation.variables?.name));
    },
    onError: () => {
      toast.error('Failed to track competitor. Limit of 3 direct trackers reached.');
    },
  });

  // Untrack mutation
  const untrackMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/competitors/track/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Untracked competitor.');
      refetchCompare();
    },
    onError: () => {
      toast.error('Failed to untrack.');
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const results = await api<CompetitorSearchResult[]>(
        `/competitors/search?query=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(
          searchCategory
        )}&location=${encodeURIComponent(searchLocation)}`
      );
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No new competitors found in sandbox database.');
      }
    } catch (err) {
      toast.error('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const own = compareData?.ownBusiness || {
    name: 'Your Business',
    averageRating: 0.0,
    totalReviews: 0,
    positiveRate: 0,
  };

  const competitors = compareData?.competitors || [];

  return (
    <div className="space-y-6">
      {/* 1. Discover Competitors Search Box */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-400" />
            Discover Competitors (Mock Places Engine)
          </h3>
          <p className="text-sm text-muted-foreground">
            Search local businesses in India across major cities to add them to your competitor tracker watch list.
          </p>
        </div>

        <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Category</label>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 p-2.5 text-sm text-slate-200 outline-none focus:border-primary"
            >
              <option value="Salons">Salons & Spas</option>
              <option value="Cafes">Cafes & Restaurants</option>
              <option value="Gyms">Fitness Gyms & Yoga Centers</option>
              <option value="Boutiques">Fashion Boutiques</option>
              <option value="Coaching">Coaching Academies & Institutes</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Indian Location</label>
            <select
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 p-2.5 text-sm text-slate-200 outline-none focus:border-primary"
            >
              <option value="Mumbai">Mumbai, MH</option>
              <option value="Bangalore">Bangalore, KA</option>
              <option value="Delhi">Delhi, NCR</option>
              <option value="Patna">Patna, BR</option>
              <option value="Pune">Pune, MH</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Keywords (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Suresh, Wellness..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 p-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            {isSearching ? 'Searching...' : 'Scan Local Area'}
          </button>
        </form>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="border-t border-border pt-4 mt-2 animate-fadeIn">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Matching Profiles Found:</h4>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {searchResults.map((res, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-muted/20 p-4 flex flex-col justify-between gap-3 hover:border-indigo-500/30 transition-all">
                  <div className="space-y-1">
                    <p className="font-bold text-white leading-tight">{res.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{res.location} • {res.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-slate-200">{res.averageRating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({res.totalReviews} reviews)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => trackMutation.mutate(res)}
                    disabled={trackMutation.isPending}
                    className="w-full rounded-md bg-white/5 hover:bg-indigo-600 hover:text-white transition-all text-slate-300 font-semibold py-1.5 text-xs active:scale-98 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Track Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Tracked Competitors Side-by-Side Comparison */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-xl text-white">Tracked Competitors</h3>
            <p className="text-sm text-muted-foreground">
              A comprehensive live dashboard contrasting your reputation standing with tracked competitors.
            </p>
          </div>
          {competitors.length > 0 && (
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 text-sm shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing reviews...' : 'Sync Reviews Scrapers'}
            </button>
          )}
        </div>

        {competitors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="font-bold text-lg text-white">No competitors tracked yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Use the "Discover Competitors" search tool above to find and track local competitors in your sector and location.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {/* Scorecard: Your Business */}
            <div className="rounded-xl border border-indigo-500 bg-indigo-950/20 p-5 shadow-md flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400">
                  Your Business
                </div>
                <h4 className="font-bold text-lg text-white pt-1">{own.name}</h4>
                <p className="text-xs text-muted-foreground">Consolidated CRM & reviews standing</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-amber-400 fill-amber-400 shrink-0" />
                  <span className="text-3xl font-extrabold text-white">{own.averageRating.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Rating CSAT: {own.positiveRate}%</span>
                  <span>{own.totalReviews} reviews</span>
                </div>
              </div>
            </div>

            {/* Scorecards: Competitors */}
            {competitors.map((comp: any) => (
              <div key={comp.id} className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-border/80 transition-all">
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="inline-flex rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                      Tracked Competitor
                    </span>
                    <button
                      onClick={() => untrackMutation.mutate(comp.id)}
                      disabled={untrackMutation.isPending}
                      className="text-muted-foreground hover:text-red-400 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h4 className="font-bold text-lg text-white pt-1 truncate">{comp.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{comp.category} • {comp.location}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="text-3xl font-extrabold text-white">{comp.averageRating.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span>Sentiment Positive: {comp.positiveRate}%</span>
                    <span>{comp.totalReviews} reviews</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Detailed Rating and Volume Matrix Grid */}
      {competitors.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fadeIn">
          <div className="border-b border-border bg-muted/10 p-5">
            <h3 className="font-bold text-lg text-white">Reputation Standing Breakdown</h3>
            <p className="text-sm text-muted-foreground">Grid layout comparing operational performance indicators against your key direct competitors.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-slate-400 bg-muted/5">
                  <th className="p-4 pl-6">Business Name</th>
                  <th className="p-4">Average Google Rating</th>
                  <th className="p-4">Total Reviews</th>
                  <th className="p-4">Sentiment Strength (Positive)</th>
                  <th className="p-4">Top Primary Praise</th>
                  <th className="p-4">Top Core Complaint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm text-slate-300">
                {/* Own business row */}
                <tr className="bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                  <td className="p-4 pl-6 font-bold text-indigo-400 flex items-center gap-1.5">
                    <Award className="h-4 w-4 shrink-0" />
                    {own.name} (You)
                  </td>
                  <td className="p-4 font-bold text-white">{own.averageRating.toFixed(2)} / 5.0</td>
                  <td className="p-4 font-medium">{own.totalReviews} entries</td>
                  <td className="p-4">
                    <span className="inline-flex rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
                      {own.positiveRate}% Positive
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-emerald-400">Automated CRM & Support</td>
                  <td className="p-4 text-slate-400">None</td>
                </tr>

                {/* Competitors rows */}
                {competitors.map((comp: any) => (
                  <tr key={comp.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-white">{comp.name}</td>
                    <td className="p-4 font-semibold text-slate-200">{comp.averageRating.toFixed(2)} / 5.0</td>
                    <td className="p-4">{comp.totalReviews} entries</td>
                    <td className="p-4">
                      <span className="inline-flex rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400">
                        {comp.positiveRate}% Positive
                      </span>
                    </td>
                    <td className="p-4 text-emerald-400/90 font-medium">{comp.topPraise || 'None'}</td>
                    <td className="p-4 text-rose-400/95 font-medium flex items-center gap-1">
                      {comp.topComplaint !== 'None' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                      {comp.topComplaint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
