import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import { coordinateLaunchContent } from '@/agents/coordinator';
import { fallbackLaunchContent, type LaunchContent } from '@/content/launchContent';
import { hasApiProxy } from '@/config/providers';

type LaunchContentState = {
  content: LaunchContent;
  status: 'idle' | 'loading' | 'ready' | 'fallback';
  ensureLoaded: (db: SQLiteDatabase) => Promise<void>;
};

let pendingRequest: Promise<void> | null = null;

export const useLaunchContentStore = create<LaunchContentState>((set, get) => ({
  content: fallbackLaunchContent,
  status: 'idle',
  ensureLoaded: async (db) => {
    if (get().status !== 'idle') return pendingRequest ?? Promise.resolve();
    if (!hasApiProxy()) {
      set({ status: 'fallback' });
      return;
    }
    set({ status: 'loading' });
    pendingRequest = coordinateLaunchContent(db)
      .then((content) => { set({ content, status: 'ready' }); })
      .catch(() => { set({ content: fallbackLaunchContent, status: 'fallback' }); })
      .finally(() => { pendingRequest = null; });
    return pendingRequest;
  },
}));
