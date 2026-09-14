import { create } from 'zustand';

type ChatState = {
  draft: string;
  setDraft: (draft: string) => void;
  clearDraft: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  draft: '',
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: '' }),
}));
