import { create } from 'zustand';

import type { ChatMessage } from '@/models/agent';

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
  messages: ChatMessage[];
  pendingImages: PendingChatImage[];
  setDraft: (draft: string) => void;
  addPendingImages: (images: PendingChatImage[]) => void;
  removePendingImage: (id: string) => void;
  sendMessage: (images: ChatMessage[]) => void;
  addMessages: (messages: ChatMessage[]) => void;
  replaceMessage: (id: string, message: ChatMessage) => void;
  addError: (text: string) => void;
  addAssistantMessage: (text: string) => void;
};

const previewMessages: ChatMessage[] = [
  { id: 'preview-1', kind: 'text', role: 'assistant', text: 'Good morning. Want help choosing something, logging what you wore, or adding a garment?' },
];

export const useChatStore = create<ChatState>((set) => ({
  draft: '',
  messages: previewMessages,
  pendingImages: [],
  setDraft: (draft) => set({ draft }),
  addPendingImages: (images) => set((state) => ({ pendingImages: [...state.pendingImages, ...images].slice(0, 4) })),
  removePendingImage: (id) => set((state) => ({ pendingImages: state.pendingImages.filter((image) => image.id !== id) })),
  sendMessage: (images) => set((state) => ({
    draft: '',
    messages: [
      ...state.messages,
      ...images,
      ...(state.draft.trim() ? [{ id: `text-${Date.now()}`, kind: 'text' as const, role: 'user' as const, text: state.draft.trim() }] : []),
    ],
    pendingImages: [],
  })),
  addMessages: (messages) => set((state) => ({ messages: [...state.messages, ...messages] })),
  replaceMessage: (id, message) => set((state) => ({ messages: state.messages.map((item) => item.id === id ? message : item) })),
  addError: (text) => set((state) => ({ messages: [...state.messages, { id: `error-${Date.now()}`, kind: 'error', text }] })),
  addAssistantMessage: (text) => set((state) => ({
    messages: [...state.messages, { id: `assistant-${Date.now()}`, kind: 'text', role: 'assistant', text }],
  })),
}));
