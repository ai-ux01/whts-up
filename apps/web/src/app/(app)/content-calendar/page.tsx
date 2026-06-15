'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Plus, Share2, Eye, Flame, Check, AlertCircle, Sparkles } from 'lucide-react';

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  scheduledAt: string;
  status: string;
  platform: string;
}

export default function ContentCalendarPage() {
  const queryClient = useQueryClient();
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // New Post Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPlatform, setNewPlatform] = useState('INSTAGRAM');

  // Fetch Scheduled Posts Query
  const { data: posts = [], isLoading } = useQuery<ScheduledPost[]>({
    queryKey: ['scheduled-posts'],
    queryFn: () => api<ScheduledPost[]>('/content/calendar'),
  });

  // Schedule Post Mutation
  const scheduleMutation = useMutation({
    mutationFn: (body: { title: string; content: string; scheduledAt: string; platform: string }) =>
      api<ScheduledPost>('/content/calendar', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      setNewTitle('');
      setNewContent('');
      setNewDate('');
      setShowScheduleForm(false);
      toast.success('Social post successfully scheduled and synced in Calendar queue!');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Scheduling failed'),
  });

  const defaultMockPosts = [
    {
      id: 'p1',
      title: 'Monsoon Villa Launch Reel',
      content: 'Checkout this gorgeous 3BHK duplex with private infinity pool starting at 1.8Cr!',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      status: 'PENDING',
      platform: 'INSTAGRAM'
    },
    {
      id: 'p2',
      title: 'IIT-JEE New Batch Announcement',
      content: 'Admissions open for JEE Classroom course. 90% scholarship test registrations open!',
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING',
      platform: 'BOTH'
    },
    {
      id: 'p3',
      title: 'Free Dental Checkup Camp Post',
      content: 'WellCare clinic is hosting a free dental health camp this weekend. Book slot now!',
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      status: 'SENT',
      platform: 'FACEBOOK'
    }
  ];

  const calendarPosts = posts.length > 0 ? posts : defaultMockPosts;

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent || !newDate) {
      toast.warning('Please fill in all scheduling fields.');
      return;
    }
    scheduleMutation.mutate({
      title: newTitle,
      content: newContent,
      scheduledAt: new Date(newDate).toISOString(),
      platform: newPlatform,
    });
  };

  const getPlatformStyle = (platform: string) => {
    if (platform === 'INSTAGRAM') return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
    if (platform === 'FACEBOOK') return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    return 'bg-violet-500/10 text-violet-600 border-violet-500/20'; // Both
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Generate 7-day visual calendar grid preview
  const daysOfPreview = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 1); // 1 day ago, today, and 5 days ahead
    return d;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            Content Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan, organize, and drag-and-drop schedule reels, posts, and campaigns across all linked networks.
          </p>
        </div>
        <Button onClick={() => setShowScheduleForm(!showScheduleForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Post
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left Side: Drag-and-drop visual monthly timeline list */}
        <div className="lg:col-span-2 space-y-4">
          {daysOfPreview.map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayPosts = calendarPosts.filter(
              (p) => new Date(p.scheduledAt).toDateString() === day.toDateString()
            );

            return (
              <Card
                key={idx}
                className={`border-border shadow-sm hover:shadow transition-shadow ${
                  isToday ? 'border-primary ring-2 ring-primary/10' : ''
                }`}
              >
                <CardHeader className="py-3.5 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4.5 w-4.5 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-bold leading-none text-foreground uppercase">
                      {day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-full">
                        TODAY
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {dayPosts.length} posts scheduled
                  </span>
                </CardHeader>
                <CardContent className="p-4 space-y-3 divide-y divide-border/40">
                  {dayPosts.map((post, pIdx) => (
                    <div key={post.id} className={`pt-3 first:pt-0 text-xs flex justify-between gap-4 items-start`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold ${getPlatformStyle(post.platform)}`}>
                            {post.platform}
                          </span>
                          <span className="font-bold text-foreground text-sm">{post.title}</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">&quot;{post.content}&quot;</p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(post.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          post.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dayPosts.length === 0 && (
                    <p className="text-muted-foreground text-xs italic py-2">No content scheduled for this date. Click Schedule Post above to plan ideas.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right Side: Quick Scheduler dialog form */}
        <div className="lg:col-span-1">
          {showScheduleForm ? (
            <Card className="border-border shadow-sm sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Schedule Social Post
                </CardTitle>
                <CardDescription>Configure drafts to queue direct social media releases.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSimulateSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Post / Campaign Title</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Weekend Villa Tour Reel"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Caption Copy</Label>
                    <Textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Write your custom caption and hashtags here..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Target Platform</Label>
                      <select
                        value={newPlatform}
                        onChange={(e) => setNewPlatform(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="FACEBOOK">Facebook</option>
                        <option value="BOTH">Both Platforms</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Schedule Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) {
                            // fallback
                          }
                        }}
                        className="cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={scheduleMutation.isPending}
                    className="w-full mt-2"
                  >
                    {scheduleMutation.isPending ? 'Queuing post...' : 'Schedule & Lock Post'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm p-5 text-center space-y-4 sticky top-6">
              <AlertCircle className="h-10 w-10 text-primary mx-auto animate-bounce" />
              <div>
                <h4 className="font-bold text-foreground text-sm">Need to fill the calendar?</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Schedule campaign drafts, vertical reels, and social media flyers to ensure consistent audience reach.
                </p>
              </div>
              <Button onClick={() => setShowScheduleForm(true)} variant="outline" className="w-full text-xs">
                Open Quick Scheduler
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
