import { create } from 'zustand';

interface InboxState {
  selectedConversationId: string | null;
  search: string;
  unreadOnly: boolean;
  typingConversationId: string | null;
  setSelectedConversation: (id: string | null) => void;
  setSearch: (search: string) => void;
  setUnreadOnly: (unreadOnly: boolean) => void;
  setTyping: (conversationId: string | null) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  selectedConversationId: null,
  search: '',
  unreadOnly: false,
  typingConversationId: null,
  setSelectedConversation: (id) => set({ selectedConversationId: id }),
  setSearch: (search) => set({ search }),
  setUnreadOnly: (unreadOnly) => set({ unreadOnly }),
  setTyping: (typingConversationId) => set({ typingConversationId }),
}));
