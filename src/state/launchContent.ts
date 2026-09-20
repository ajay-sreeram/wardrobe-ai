import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import { coordinateLaunchContent } from '@/agents/coordinator';
import { emptyWardrobeLaunchContent, fallbackLaunchContent, type LaunchContent } from '@/content/launchContent';
import { hasApiProxy } from '@/config/providers';
import { getActiveGarments } from '@/database/repository';

type LaunchContentState = {
  content: LaunchContent;
  isEmptyWardrobe: boolean | null;
  status: 'idle' | 'loading' | 'ready' | 'fallback';
  ensureLoaded: (db: SQLiteDatabase) => Promise<void>;
};

let pendingRequest: Promise<void> | null = null;

export const useLaunchContentStore = create<LaunchContentState>((set, get) => ({
  content: fallbackLaunchContent,
  isEmptyWardrobe: null,
  status: 'idle',
  ensureLoaded: async (db) => {
    if (get().status !== 'idle') return pendingRequest ?? Promise.resolve();
    set({ status: 'loading' });
    const wardrobe = await getActiveGarments(db).catch(() => null);
    if (wardrobe?.length === 0) {
      set({ content: emptyWardrobeLaunchContent, isEmptyWardrobe: true, status: 'ready' });
      return;
    }
    set({ isEmptyWardrobe: wardrobe ? false : null });
    if (!hasApiProxy()) {
      set({ status: 'fallback' });
      return;
    }
    pendingRequest = coordinateLaunchContent(db)
      .then((content) => { set({ content, status: 'ready' }); })
      .catch(() => { set({ content: fallbackLaunchContent, status: 'fallback' }); })
      .finally(() => { pendingRequest = null; });
    return pendingRequest;
  },
}));
