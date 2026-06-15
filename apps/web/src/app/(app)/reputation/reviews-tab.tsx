'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Star, Sparkles, Send, CheckCircle2, MessageSquare, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleReviewItem {
  id: string;
  author: string;
  rating: number;
  reviewText: string | null;
  reviewDate: string;
  sentiment: string | null;
  aiSummary: string | null;
  replyText: string | null;
  repliedAt: string | null;
}

interface ReviewsListData {
  total: number;
  data: GoogleReviewItem[];
}

export default function ReviewsTab() {
  const queryClient = useQueryClient();
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  
  // Modal & draft states for AI replies
  const [selectedReview, setSelectedReview] = useState<GoogleReviewItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [generating, setGenerating] = useState(false);

  // Fetch reviews list
  const { data, isLoading } = useQuery<ReviewsListData>({
    queryKey: ['reviewsList', ratingFilter, sentimentFilter],
    queryFn: () => {
      const parts = [];
      if (ratingFilter !== 'all') parts.push(`rating=${ratingFilter}`);
      if (sentimentFilter !== 'all') parts.push(`sentiment=${sentimentFilter}`);
      const qs = parts.length > 0 ? `?${parts.join('&')}` : '';
      return api<ReviewsListData>(`/reviews${qs}`);
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => api<{ syncedReviewsCount: number }>('/reviews/sync', { method: 'POST' }),
    onSuccess: (res) => {
      toast.success(`Successfully synced! Fetched ${res.syncedReviewsCount || 0} reviews.`);
      queryClient.invalidateQueries({ queryKey: ['reviewsList'] });
      queryClient.invalidateQueries({ queryKey: ['reputationDashboard'] });
    },
    onError: () => {
      toast.error('Sync failed. Please try again later.');
    },
  });

  // AI Generator mutation
  const generateMutation = useMutation({
    mutationFn: (reviewId: string) => api<{ reply: string }>(`/reviews/${reviewId}/generate-reply`, { method: 'POST' }),
    onMutate: () => {
      setGenerating(true);
    },
    onSuccess: (res) => {
      setReplyText(res.reply);
      toast.success('AI response draft compiled!');
    },
    onError: () => {
      toast.error('Failed to generate AI response draft.');
    },
    onSettled: () => {
      setGenerating(false);
    },
  });

  // Submit reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      api(`/reviews/${reviewId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ replyText: text }),
      }),
    onSuccess: () => {
      toast.success('Reply published to Google review!');
      setSelectedReview(null);
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['reviewsList'] });
    },
    onError: () => {
      toast.error('Failed to publish review reply.');
    },
  });

  const handleOpenReplyDrawer = (review: GoogleReviewItem) => {
    setSelectedReview(review);
    setReplyText(review.replyText || '');
    if (!review.replyText) {
      generateMutation.mutate(review.id);
    }
  };

  const reviews = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Controls & Filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Rating filter */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Stars</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Star Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
              <option value="4">⭐⭐⭐⭐ 4 Stars</option>
              <option value="3">⭐⭐⭐ 3 Stars</option>
              <option value="2">⭐⭐ 2 Stars</option>
              <option value="1">⭐ 1 Star</option>
            </select>
          </div>

          {/* Sentiment filter */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Sentiment</span>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Sentiments</option>
              <option value="POSITIVE">🟢 Positive</option>
              <option value="NEUTRAL">🟡 Neutral</option>
              <option value="NEGATIVE">🔴 Negative</option>
            </select>
          </div>
        </div>

        {/* Sync Trigger */}
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-4 py-2 text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? 'Syncing Reviews...' : 'Sync Google Reviews'}
        </button>
      </div>

      {/* Reviews feed */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="font-bold text-lg">No reviews found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {"We couldn't find any reviews matching these filter criteria. Try clicking the \"Sync Google Reviews\" button."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review: GoogleReviewItem) => {
            const hasReplied = !!review.replyText;
            const sentiment = review.sentiment || 'NEUTRAL';

            return (
              <div
                key={review.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 transition-all hover:shadow-md hover:border-white/10"
              >
                {/* Reviewer Meta */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white">{review.author}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          sentiment === 'POSITIVE'
                            ? 'bg-green-500/10 text-green-400'
                            : sentiment === 'NEGATIVE'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {sentiment}
                      </span>
                    </div>
                    {/* Stars */}
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.reviewDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Review Text */}
                {review.reviewText && (
                  <p className="text-sm text-slate-300 italic">{`"${review.reviewText}"`}</p>
                )}

                {/* Action reply or response rendering */}
                {hasReplied ? (
                  <div className="rounded-lg border border-white/5 bg-white/2.5 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Replied to customer</span>
                    </div>
                    <p className="text-sm text-slate-400 pl-5">{`"${review.replyText}"`}</p>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleOpenReplyDrawer(review)}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold px-3 py-1.5 text-xs text-white shadow-sm transition-all cursor-pointer hover:shadow"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate AI Reply & Reply
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI Reply generator drawer modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-scaleUp">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Review Reply Generator</h3>
                <p className="text-xs text-muted-foreground">Author: {selectedReview.author}</p>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-white text-lg font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Customer review reference */}
            <div className="rounded-xl bg-muted p-4 space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer Review</span>
              <p className="text-sm text-slate-300 italic">{`"${selectedReview.reviewText || 'No review comment text'}"`}</p>
            </div>

            {/* AI Input Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  AI Generated Response Draft
                </span>
                <button
                  type="button"
                  onClick={() => generateMutation.mutate(selectedReview.id)}
                  disabled={generating}
                  className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {generating ? 'Regenerating...' : 'Regenerate draft ↺'}
                </button>
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Drafting response..."
                rows={4}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="rounded-lg border border-border hover:bg-accent px-4 py-2 text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => replyMutation.mutate({ reviewId: selectedReview.id, text: replyText })}
                disabled={replyMutation.isPending || !replyText.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 font-semibold px-4 py-2 text-sm text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                Publish to Google Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
