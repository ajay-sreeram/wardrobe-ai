import { create } from 'zustand';

import type { ChatMessage } from '@/models/agent';
import { readChatHistory, writeChatHistory, type PersistedChatMessage } from '@/storage/chatHistory';
import { clearChatThumbnails, pruneChatThumbnails, removeChatThumbnail } from '@/storage/chatThumbnails';

export type PendingChatImage = {
  id: string;
  uri: string;
  width: number;
  height: number;
  fileName: string | null;
  mimeType: string | null;
  thumbnailUri: string | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
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
  { id: 'preview-1', kind: 'text', role: 'assistant', text: 'Good morning. Want help choosing something, logging what you wore, or adding a garment?', createdAt: new Date().toISOString() },
];

const maximumPersistedMessages = 150;
const persistedKinds = new Set<ChatMessage['kind']>(['text', 'image', 'error', 'conversation_boundary', 'wardrobe_results', 'outfit_suggestion', 'wardrobe_insight', 'wear_status', 'action_status']);

function saveHistory(messages: ChatMessage[]) {
  const safeMessages = messages
    .filter((message): message is PersistedChatMessage => persistedKinds.has(message.kind) && (message.kind !== 'image' || message.durable === true))
    .map((message) => {
      if (message.kind === 'error') return { id: message.id, kind: message.kind, text: message.text, createdAt: message.createdAt };
      if (message.kind === 'image') return { ...message, expandedUri: undefined };
      return message;
    })
    .slice(-maximumPersistedMessages);
  pruneChatThumbnails(safeMessages.flatMap((message) => message.kind === 'image' ? [message.uri] : []));
  writeChatHistory(safeMessages);
}

function appendMessages(state: ChatState, additions: ChatMessage[]) {
  const createdAt = new Date().toISOString();
  const messages = [...state.messages, ...additions.map((message) => ({ ...message, createdAt: message.createdAt ?? createdAt }))];
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
    pruneChatThumbnails(history.flatMap((message) => message.kind === 'image' ? [message.uri] : []));
    set({ historyReady: true, messages: history.length ? history : previewMessages });
  },
  startNewConversation: () => set((state) => {
    for (const image of state.pendingImages) removeChatThumbnail(image.thumbnailUri);
    return {
      draft: '',
      messages: appendMessages(state, [
        { id: `conversation-${Date.now()}`, kind: 'conversation_boundary', createdAt: new Date().toISOString() },
        { id: `assistant-${Date.now()}`, kind: 'text', role: 'assistant', text: 'Fresh start. What would you like help with?' },
      ]),
      pendingImages: [],
    };
  }),
  clearHistory: () => {
    writeChatHistory([]);
    clearChatThumbnails();
    set({ draft: '', messages: previewMessages, pendingImages: [] });
  },
  addPendingImages: (images) => set((state) => ({ pendingImages: [...state.pendingImages, ...images].slice(0, 4) })),
  removePendingImage: (id) => set((state) => {
    const removed = state.pendingImages.find((image) => image.id === id);
    removeChatThumbnail(removed?.thumbnailUri ?? null);
    return { pendingImages: state.pendingImages.filter((image) => image.id !== id) };
  }),
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
    const messages = state.messages.map((item) => item.id === id ? { ...message, createdAt: message.createdAt ?? item.createdAt ?? new Date().toISOString() } : item);
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
