'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Send, Plus, AlertCircle, Clock } from 'lucide-react';
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
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        toast.warning('Saved in inbox — WhatsApp delivery failed', {
          description: data.deliveryError,
          duration: 8000,
        });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const newChatMutation = useMutation({
    mutationFn: (phone: string) =>
      api<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ phone }),
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

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">WhatsApp shared inbox</p>
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
        <Card className="p-4 flex flex-wrap gap-2 items-end max-w-lg">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-sm font-medium">Phone number</label>
            <Input
              placeholder="9999575357 or +919999575357"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
            />
          </div>
          <Button
            onClick={() => newChatMutation.mutate(newChatPhone.trim())}
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
              />
              Unread only
            </label>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <p className="p-4 text-sm text-muted-foreground">Loading...</p>
            )}
            {!isLoading && conversations.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No conversations. Start a new chat or wait for an inbound
                WhatsApp message.
              </p>
            )}
            {conversations.map((c) => (
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
                  <p className="font-medium truncate">
                    {c.contact.name || c.contact.phone}
                  </p>
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
              <div className="border-b border-border p-4">
                <p className="font-semibold">
                  {detail?.contact.name || detail?.contact.phone || '…'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detail?.contact.phone}
                  {detail?.contact.leadSource && (
                    <> · {leadSourceLabel(detail.contact.leadSource)}</>
                  )}
                </p>
                {detail && (
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
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
                )}
                {typingConversationId === selectedConversationId && (
                  <p className="text-xs text-primary">typing...</p>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messagesLoading && (
                  <p className="text-sm text-muted-foreground">
                    Loading messages...
                  </p>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Send one below — the contact must message
                    you first (24h window) or be on Meta&apos;s test allowlist.
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
              {detail && !detail.sessionWindowOpen && (
                <p className="border-t border-border px-4 pt-3 text-xs text-amber-600 dark:text-amber-400">
                  Free-text replies only work within 24 hours of the customer&apos;s
                  last message. Use Campaigns for approved templates, or enable
                  &quot;Force send&quot; to try anyway.
                </p>
              )}
              <form
                className="flex flex-col gap-2 border-t border-border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (messageText.trim()) sendMutation.mutate(messageText.trim());
                }}
              >
                <div className="flex gap-2">
                  <Input
                    placeholder={
                      detail?.sessionWindowOpen
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
                      (!detail?.sessionWindowOpen && !forceSend)
                    }
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {!detail?.sessionWindowOpen && (
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
              {conversations.length
                ? 'Select a conversation'
                : 'Create a new chat or connect WhatsApp webhook to receive messages'}
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
      </div>
    </div>
  );
}
