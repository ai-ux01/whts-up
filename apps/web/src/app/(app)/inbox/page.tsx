'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Send, Plus, AlertCircle, Clock, Instagram, Mail, MessageSquare, MessageCircle, FlaskConical, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getSocket } from '@/lib/socket';
import { useInboxStore } from '@/stores/inbox-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { leadSourceLabel } from '@/lib/lead-source';

interface Conversation {
  id: string;
  unreadCount: number;
  lastMessageAt: string;
  contact: { id: string; name: string | null; phone: string };
  lastMessage: { content: string; sender: string } | null;
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL';
}

interface Message {
  id: string;
  content: string;
  sender: string;
  createdAt: string;
  deliveryStatus?: string | null;
  deliveryError?: string | null;
  metadata?: { deliveryFailed?: boolean; error?: string } | null;
  senderUser?: { name: string };
}

interface ConversationDetail {
  id: string;
  sessionWindowOpen?: boolean;
  sessionExpiresAt?: string | null;
  lastCustomerMessageAt?: string | null;
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL';
  contact: {
    name: string | null;
    phone: string;
    leadSource?: string | null;
    utmSource?: string | null;
    utmCampaign?: string | null;
    lead?: {
      status: string;
      tags: string[];
      notes: string | null;
      assignedUser?: { name: string };
    };
  };
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const {
    selectedConversationId,
    setSelectedConversation,
    search,
    setSearch,
    unreadOnly,
    setUnreadOnly,
    typingConversationId,
  } = useInboxStore();
  const [messageText, setMessageText] = useState('');
  const [forceSend, setForceSend] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatChannel, setNewChatChannel] = useState<'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL'>('WHATSAPP');
  const [showNewChat, setShowNewChat] = useState(false);
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL'>('ALL');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WhatsApp Simulator Sandbox States
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorPhone, setSimulatorPhone] = useState('');
  const [simulatorName, setSimulatorName] = useState('');
  const [simulatorMessage, setSimulatorMessage] = useState('');
  const [simulatorLoading, setSimulatorLoading] = useState(false);

  const { data: conversations = [], isLoading, isError, error } = useQuery({
    queryKey: ['conversations', search, unreadOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (unreadOnly) params.set('unread', 'true');
      return api<Conversation[]>(`/conversations?${params}`);
    },
    refetchInterval: 30_000,
  });

  const { data: detail } = useQuery({
    queryKey: ['conversation', selectedConversationId],
    queryFn: () =>
      api<ConversationDetail>(`/conversations/${selectedConversationId}`),
    enabled: !!selectedConversationId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () =>
      api<Message[]>(`/conversations/${selectedConversationId}/messages`),
    enabled: !!selectedConversationId,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api<Message & { deliveryError?: string | null }>(
        `/conversations/${selectedConversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content, forceSend }),
        },
      ),
    onSuccess: (data) => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      if (data.deliveryError) {
        toast.warning('Saved in inbox — delivery failed', {
          description: data.deliveryError,
          duration: 8000,
        });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const suggestReplyMutation = useMutation({
    mutationFn: () =>
      api<{ suggestion: string | null; reason?: string }>(
        `/conversations/${selectedConversationId}/messages/suggest-reply`,
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      if (data.suggestion) {
        setMessageText(data.suggestion);
        toast.success('AI drafted a reply — review and send');
      } else {
        toast.info(data.reason || 'No suggestion available');
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'AI suggest failed'),
  });

  const newChatMutation = useMutation({
    mutationFn: (vars: { phone: string; channel: string }) =>
      api<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ phone: vars.phone, channel: vars.channel }),
      }),
    onSuccess: (c) => {
      setShowNewChat(false);
      setNewChatPhone('');
      setSelectedConversation(c.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation opened');
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (conversations.length && !selectedConversationId) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversationId, setSelectedConversation]);

  useEffect(() => {
    if (detail) {
      setSimulatorPhone(detail.contact.phone);
      setSimulatorName(detail.contact.name || '');
    }
  }, [detail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedConversationId) return;
    api(`/conversations/${selectedConversationId}/read`, {
      method: 'PATCH',
    }).then(() =>
      queryClient.invalidateQueries({ queryKey: ['conversations'] }),
    );
  }, [selectedConversationId, queryClient]);

  function emitTyping() {
    const socket = getSocket();
    if (socket?.connected && selectedConversationId) {
      socket.emit('typing', { conversationId: selectedConversationId });
    }
  }

  function deliveryStatusLabel(status: string | null | undefined) {
    if (!status) return null;
    const labels: Record<string, string> = {
      sent: 'Sent',
      delivered: 'Delivered',
      read: 'Read',
      failed: 'Failed',
    };
    return labels[status] ?? status;
  }

  function messageDeliveryFailed(m: Message) {
    return (
      m.deliveryError ||
      m.metadata?.deliveryFailed ||
      m.metadata?.error
    );
  }

  const filteredConversations = conversations.filter((c) => {
    if (channelFilter !== 'ALL' && c.channel !== channelFilter) return false;
    return true;
  });

  function renderChannelIcon(channel: 'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL') {
    switch (channel) {
      case 'INSTAGRAM':
        return <Instagram className="h-3.5 w-3.5 text-pink-500 shrink-0" />;
      case 'SMS':
        return <MessageSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
      case 'EMAIL':
        return <Mail className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
      default:
        return <MessageCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">Multi-channel shared inbox</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewChat((v) => !v)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New chat
        </Button>
      </div>

      {showNewChat && (
        <Card className="p-4 flex flex-wrap gap-3 items-end max-w-xl">
          <div className="flex-1 min-w-[180px] space-y-1">
            <label className="text-sm font-medium">Recipient Address / Phone</label>
            <Input
              placeholder="e.g. +919999575357 or user@email.com"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
            />
          </div>
          <div className="w-36 space-y-1">
            <label className="text-sm font-medium">Channel</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-medium"
              value={newChatChannel}
              onChange={(e) => setNewChatChannel(e.target.value as 'WHATSAPP' | 'INSTAGRAM' | 'SMS' | 'EMAIL')}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>
          <Button
            onClick={() => newChatMutation.mutate({ phone: newChatPhone.trim(), channel: newChatChannel })}
            disabled={!newChatPhone.trim() || newChatMutation.isPending}
          >
            Open
          </Button>
        </Card>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Failed to load conversations: {error?.message}
        </p>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden rounded-xl border border-border min-h-0">
        {/* Chat list */}
        <div className="flex w-full max-w-xs flex-col border-r border-border bg-card md:max-w-sm shrink-0">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or phone..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
              />
              Unread only
            </label>
            
            {/* Channel Filters */}
            <div className="flex gap-1 overflow-x-auto pb-1 mt-2 text-xs">
              {(['ALL', 'WHATSAPP', 'INSTAGRAM', 'SMS', 'EMAIL'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setChannelFilter(filter)}
                  className={cn(
                    'px-2.5 py-1 rounded-md border border-border font-medium transition-all shrink-0 cursor-pointer',
                    channelFilter === filter
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  )}
                >
                  {filter === 'ALL' ? 'All' : filter === 'WHATSAPP' ? 'WA' : filter === 'INSTAGRAM' ? 'IG' : filter === 'SMS' ? 'SMS' : 'Email'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <p className="p-4 text-sm text-muted-foreground">Loading...</p>
            )}
            {!isLoading && filteredConversations.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No conversations match this channel filter.
              </p>
            )}
            {filteredConversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedConversation(c.id)}
                className={cn(
                  'w-full border-b border-border p-3 text-left hover:bg-muted/50',
                  selectedConversationId === c.id && 'bg-accent',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {renderChannelIcon(c.channel)}
                    <p className="font-medium truncate">
                      {c.contact.name || c.contact.phone}
                    </p>
                  </div>
                  {c.unreadCount > 0 && <Badge>{c.unreadCount}</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {c.lastMessage?.content || 'No messages'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col bg-background min-w-0">
          {selectedConversationId ? (
            <>
              <div className="border-b border-border p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {detail?.channel && renderChannelIcon(detail.channel)}
                    <p className="font-semibold">
                      {detail?.contact.name || detail?.contact.phone || '…'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {detail?.contact.phone}
                    {detail?.contact.leadSource && (
                      <> · {leadSourceLabel(detail.contact.leadSource)}</>
                    )}
                  </p>
                </div>
                {detail?.channel === 'WHATSAPP' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSimulatorOpen(true)}
                    className="flex items-center gap-1.5 border-dashed border-primary/40 hover:border-primary"
                  >
                    <FlaskConical className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span className="text-xs">WhatsApp Sandbox</span>
                  </Button>
                )}
              </div>
              {detail && detail.channel === 'WHATSAPP' && (
                <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        detail.sessionWindowOpen ? 'default' : 'secondary'
                      }
                    >
                      {detail.sessionWindowOpen
                        ? '24h window open'
                        : '24h window closed'}
                    </Badge>
                    {detail.sessionExpiresAt && detail.sessionWindowOpen && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Closes{' '}
                        {formatDistanceToNow(
                          new Date(detail.sessionExpiresAt),
                          { addSuffix: true },
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {typingConversationId === selectedConversationId && (
                <p className="text-xs text-primary px-4 py-1">typing...</p>
              )}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messagesLoading && (
                  <p className="text-sm text-muted-foreground">
                    Loading messages...
                  </p>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Send a message to start the conversation.
                  </p>
                )}
                {messages.map((m) => {
                  const failed = messageDeliveryFailed(m);
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'flex flex-col',
                        m.sender === 'CONTACT' ? 'items-start' : 'items-end',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-xl px-4 py-2 text-sm',
                          m.sender === 'CONTACT'
                            ? 'bg-muted'
                            : m.sender === 'AI'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-primary text-primary-foreground',
                          failed && 'ring-1 ring-destructive/50',
                        )}
                      >
                        <p>{m.content}</p>
                        <p className="mt-1 text-[10px] opacity-70">
                          {format(new Date(m.createdAt), 'HH:mm')} · {m.sender}
                          {m.senderUser?.name ? ` · ${m.senderUser.name}` : ''}
                          {m.deliveryStatus &&
                            m.sender !== 'CONTACT' &&
                            ` · ${deliveryStatusLabel(m.deliveryStatus)}`}
                        </p>
                      </div>
                      {failed && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-destructive max-w-[75%]">
                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                          {m.deliveryError || m.metadata?.error || 'Not delivered'}
                        </p>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              {detail && detail.channel === 'WHATSAPP' && !detail.sessionWindowOpen && (
                <div className="border-t border-border px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-amber-500/5">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Free-text replies only work within 24 hours of the customer&apos;s
                    last message. Use Campaigns for approved templates, or enable
                    &quot;Force send&quot; to try anyway.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300"
                    onClick={() => {
                      setSimulatorPhone(detail.contact.phone);
                      setSimulatorName(detail.contact.name || '');
                      setSimulatorMessage('Hi, I am replying to your message!');
                      setIsSimulatorOpen(true);
                    }}
                  >
                    Simulate customer reply
                  </Button>
                </div>
              )}
              <form
                className="flex flex-col gap-2 border-t border-border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (messageText.trim()) sendMutation.mutate(messageText.trim());
                }}
              >
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="AI suggest reply"
                    onClick={() => suggestReplyMutation.mutate()}
                    disabled={suggestReplyMutation.isPending}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                  </Button>
                  <Input
                    placeholder={
                      detail?.channel !== 'WHATSAPP' || detail?.sessionWindowOpen
                        ? 'Type a message...'
                        : 'Window closed — template or force send'
                    }
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      emitTyping();
                    }}
                    disabled={sendMutation.isPending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={
                      sendMutation.isPending ||
                      !messageText.trim() ||
                      (detail?.channel === 'WHATSAPP' && !detail?.sessionWindowOpen && !forceSend)
                    }
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {detail?.channel === 'WHATSAPP' && !detail?.sessionWindowOpen && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={forceSend}
                      onChange={(e) => setForceSend(e.target.checked)}
                    />
                    Force send (may fail at Meta)
                  </label>
                )}
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground p-6 text-center">
              {filteredConversations.length
                ? 'Select a conversation'
                : 'No conversations to display'}
            </div>
          )}
        </div>

        {/* Profile */}
        {detail && (
          <Card className="hidden w-64 shrink-0 flex-col border-0 border-l border-border rounded-none lg:flex">
            <div className="border-b border-border p-4">
              <p className="font-semibold">Contact</p>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p>{detail.contact.phone}</p>
              </div>
              {detail.contact.leadSource && (
                <div>
                  <p className="text-muted-foreground">Lead source</p>
                  <Badge variant="outline">
                    {leadSourceLabel(detail.contact.leadSource)}
                  </Badge>
                  {detail.contact.utmSource && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      {detail.contact.utmSource}
                      {detail.contact.utmCampaign
                        ? ` · ${detail.contact.utmCampaign}`
                        : ''}
                    </p>
                  )}
                </div>
              )}
              {detail.contact.lead && (
                <>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge>{detail.contact.lead.status}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {detail.contact.lead.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {detail.contact.lead.notes && (
                    <div>
                      <p className="text-muted-foreground">Notes</p>
                      <p>{detail.contact.lead.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        {/* WhatsApp Sandbox Simulator Modal */}
        {isSimulatorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md border border-border/80 bg-background/95 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="h-5 w-5 text-primary animate-pulse" />
                <h3 className="text-lg font-semibold">WhatsApp Webhook Simulator</h3>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Simulate an incoming WhatsApp message webhook to test auto-reply AI flows and CRM conversation routing.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!simulatorPhone.trim() || !simulatorMessage.trim()) {
                    toast.error('Phone and message content are required');
                    return;
                  }
                  setSimulatorLoading(true);
                  try {
                    await api('/whatsapp/simulate-incoming', {
                      method: 'POST',
                      body: JSON.stringify({
                        phone: simulatorPhone.trim(),
                        name: simulatorName.trim() || undefined,
                        message: simulatorMessage.trim(),
                      }),
                    });
                    toast.success('Simulated customer message dispatched!');
                    setSimulatorMessage('');
                    setIsSimulatorOpen(false);

                    // Refresh inbox lists
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                    if (selectedConversationId) {
                      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
                      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] });
                    }
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Simulation failed';
                    toast.error(msg);
                  } finally {
                    setSimulatorLoading(false);
                  }
                }}
                className="space-y-4 text-left"
              >
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Customer Phone Number</label>
                  <Input
                    placeholder="e.g. +919999123456"
                    value={simulatorPhone}
                    onChange={(e) => setSimulatorPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Customer Name (Optional)</label>
                  <Input
                    placeholder="e.g. Rohan Sharma"
                    value={simulatorName}
                    onChange={(e) => setSimulatorName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Message Content</label>
                  <textarea
                    placeholder="Type message text here..."
                    rows={3}
                    className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={simulatorMessage}
                    onChange={(e) => setSimulatorMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsSimulatorOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={simulatorLoading} className="flex items-center gap-1.5">
                    {simulatorLoading ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Simulate Message</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
