import { create } from 'zustand';

import type { ChatMessage } from '@/models/agent';
import { readChatHistory, writeChatHistory, type PersistedChatMessage } from '@/storage/chatHistory';

export type PendingChatImage = {
  id: string;
  uri: string;
  width: number;
  height: number;
  fileName: string | null;
  mimeType: string | null;
};

type ChatState = {
  draft: string;
  historyReady: boolean;
  messages: ChatMessage[];
  pendingImages: PendingChatImage[];
  setDraft: (draft: string) => void;
  hydrateHistory: () => Promise<void>;
  startNewConversation: () => void;
  clearHistory: () => void;
  addPendingImages: (images: PendingChatImage[]) => void;
  removePendingImage: (id: string) => void;
  sendMessage: (images: ChatMessage[], text?: string) => void;
  addMessages: (messages: ChatMessage[]) => void;
  replaceMessage: (id: string, message: ChatMessage) => void;
  removeMessage: (id: string) => void;
  addError: (text: string, retryable?: boolean) => string;
  addAssistantMessage: (text: string) => void;
};

const previewMessages: ChatMessage[] = [
  { id: 'preview-1', kind: 'text', role: 'assistant', text: 'Good morning. Want help choosing something, logging what you wore, or adding a garment?' },
];

const maximumPersistedMessages = 150;
const persistedKinds = new Set<ChatMessage['kind']>(['text', 'error', 'conversation_boundary', 'wardrobe_results', 'wear_status', 'action_status']);

function saveHistory(messages: ChatMessage[]) {
  const safeMessages = messages
    .filter((message): message is PersistedChatMessage => persistedKinds.has(message.kind))
    .map((message) => message.kind === 'error' ? { id: message.id, kind: message.kind, text: message.text } : message)
    .slice(-maximumPersistedMessages);
  writeChatHistory(safeMessages);
}

function appendMessages(state: ChatState, additions: ChatMessage[]) {
  const messages = [...state.messages, ...additions];
  saveHistory(messages);
  return messages;
}

export const useChatStore = create<ChatState>((set) => ({
  draft: '',
  historyReady: false,
  messages: previewMessages,
  pendingImages: [],
  setDraft: (draft) => set({ draft }),
  hydrateHistory: async () => {
    const history = await readChatHistory();
    set({ historyReady: true, messages: history.length ? history : previewMessages });
  },
  startNewConversation: () => set((state) => ({
    draft: '',
    messages: appendMessages(state, [
      { id: `conversation-${Date.now()}`, kind: 'conversation_boundary', createdAt: new Date().toISOString() },
      { id: `assistant-${Date.now()}`, kind: 'text', role: 'assistant', text: 'Fresh start. What would you like help with?' },
    ]),
    pendingImages: [],
  })),
  clearHistory: () => {
    writeChatHistory([]);
    set({ draft: '', messages: previewMessages, pendingImages: [] });
  },
  addPendingImages: (images) => set((state) => ({ pendingImages: [...state.pendingImages, ...images].slice(0, 4) })),
  removePendingImage: (id) => set((state) => ({ pendingImages: state.pendingImages.filter((image) => image.id !== id) })),
  sendMessage: (images, text) => set((state) => {
    const submittedText = (text ?? state.draft).trim();
    const additions: ChatMessage[] = [
      ...images,
      ...(submittedText ? [{ id: `text-${Date.now()}`, kind: 'text' as const, role: 'user' as const, text: submittedText }] : []),
    ];
    return {
      draft: '',
      messages: appendMessages(state, additions),
      pendingImages: [],
    };
  }),
  addMessages: (messages) => set((state) => ({ messages: appendMessages(state, messages) })),
  replaceMessage: (id, message) => set((state) => {
    const messages = state.messages.map((item) => item.id === id ? message : item);
    saveHistory(messages);
    return { messages };
  }),
  removeMessage: (id) => set((state) => {
    const messages = state.messages.filter((message) => message.id !== id);
    saveHistory(messages);
    return { messages };
  }),
  addError: (text, retryable = false) => {
    const id = `error-${Date.now()}`;
    set((state) => ({ messages: appendMessages(state, [{ id, kind: 'error', text, retryable }]) }));
    return id;
  },
  addAssistantMessage: (text) => set((state) => ({
    messages: appendMessages(state, [{ id: `assistant-${Date.now()}`, kind: 'text', role: 'assistant', text }]),
  })),
}));
