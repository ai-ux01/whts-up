'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';
import { useInboxStore } from '@/stores/inbox-store';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const setTyping = useInboxStore((s) => s.setTyping);

  useEffect(() => {
    if (!user) return;
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;
    if (!token || user.portal !== 'client') return;

    const socket = connectSocket(token);

    const onNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const onMessageStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:status', onMessageStatus);
    socket.on('connect', onNewMessage);

    socket.on('typing', (data: { conversationId: string }) => {
      setTyping(data.conversationId);
      setTimeout(() => setTyping(null), 3000);
    });

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:status', onMessageStatus);
      socket.off('connect', onNewMessage);
      socket.off('typing');
    };
  }, [user, queryClient, setTyping]);

  return <>{children}</>;
}
