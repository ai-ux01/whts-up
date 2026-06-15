'use client';

import { useState, use, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Star, ShieldAlert, CheckCircle2, MessageSquare } from 'lucide-react';
import { API_URL } from '@/lib/api-client';

export default function FeedbackLandingPage({
  params: paramsPromise,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const params = use(paramsPromise);
  const workspaceId = params.workspaceId;
  const searchParams = useSearchParams();

  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isWidget, setIsWidget] = useState(false);

  // Pre-fill query params
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    setName(searchParams.get('name') || '');
    setPhone(searchParams.get('phone') || '');
    setEmail(searchParams.get('email') || '');
    setIsWidget(searchParams.get('widget') === 'true');
  }, [searchParams]);

  const handleRatingSelect = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/feedback/${workspaceId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name || 'Valued Customer',
          phone: phone || '+910000000000',
          email: email || undefined,
          rating,
          feedback: comment,
          source: isWidget ? 'WIDGET' : 'WHATSAPP',
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 py-8 text-foreground ${isWidget ? 'min-h-[460px] p-2 bg-transparent!' : ''}`}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
        
        {/* Header */}
        {!isSubmitted && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Share Your Experience</h1>
            <p className="text-sm text-slate-400">Your feedback helps us serve you better. 🙏</p>
          </div>
        )}

        {/* Form State */}
        {!isSubmitted && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer info (rendered conditionally for demo) */}
            {!name && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Name"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>
            )}

            {/* Stars Selector */}
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <span className="text-sm text-slate-300">How would you rate us?</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingSelect(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="transform transition-all active:scale-90"
                  >
                    <Star
                      className={`h-9 w-9 cursor-pointer transition-colors duration-200 ${
                        star <= (hoverRating ?? rating ?? 0)
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating !== null && (
                <span className="text-xs font-semibold uppercase tracking-wider text-green-400 mt-2">
                  {rating === 5 && 'Excellent! 🌟'}
                  {rating === 4 && 'Very Good! 😊'}
                  {rating === 3 && 'Good / Average 😐'}
                  {rating === 2 && 'Poor 😞'}
                  {rating === 1 && 'Terrible 😡'}
                </span>
              )}
            </div>

            {/* Smart Review Routing UI */}
            {rating !== null && (
              <div className="animate-fadeIn space-y-4">
                {rating >= 4 ? (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
                    <p className="text-sm text-green-400 font-semibold mb-3">Excellent! Thank you for rating us highly.</p>
                    <a
                      href="https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83dQY4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors"
                      onClick={() => setIsSubmitted(true)}
                    >
                      Share details on Google Review 🚀
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-400">
                      We are deeply sorry! How can we make things right for you?
                    </label>
                    <textarea
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your concerns privately. Our manager will contact you immediately..."
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all"
                    >
                      {loading ? 'Submitting...' : 'Submit Private Feedback 📬'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        )}

        {/* Success State */}
        {isSubmitted && (
          <div className="text-center py-8 space-y-4 animate-scaleUp">
            {rating && rating >= 4 ? (
              <>
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-400 animate-pulse" />
                <h2 className="text-xl font-bold text-white">Thank You for Your Support!</h2>
                <p className="text-sm text-slate-400">
                  Your recommendation has been registered. We are thrilled to have satisfied you! 💚
                </p>
              </>
            ) : (
              <>
                <ShieldAlert className="mx-auto h-16 w-16 text-red-500 animate-pulse" />
                <h2 className="text-xl font-bold text-white">Feedback Received!</h2>
                <p className="text-sm text-slate-400">
                  Your comments were sent directly to the business administration. We will contact you at{' '}
                  <span className="font-semibold text-white">{phone}</span> to resolve this experience immediately. Thank you for helping us improve.
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
