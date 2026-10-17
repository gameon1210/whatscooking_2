// Local-first store (data stays on the phone; Supabase sync is the next pass).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ChipId, Family, Member, Region } from '@/domain/types';

import { migrateFamily, migrateFamilyV3 } from './migrate';

export type ToastTone = 'ok' | 'warn' | 'error' | 'info';
/** A short message at the bottom of the screen. `id` changes on every message so a repeat restarts the timer. */
export interface ToastMsg {
  text: string;
  tone: ToastTone;
  id: number;
}

/** An unfinished family setup, kept so a refresh or app switch doesn't lose it (1.0.3, R01). */
export interface SetupDraft {
  step: number;
  name: string;
  region: Region;
  me: string;
  members: Member[];
  favs: string[];
  savedAt: string;
}

interface AppState {
  families: Record<string, Family>;
  activeId: string | null;
  /** session-only UI state */
  chips: ChipId[];
  available: string[];
  hydrated: boolean;
  /** short message shown at the bottom of the screen */
  toast: ToastMsg | null;
  /** Prefer notify()/ok()/warn()/fail() from '@/ui/feedback', which also vibrate and speak the message. */
  showToast: (msg: string | null, tone?: ToastTone) => void;
  /** open bottom sheets; while one is open, the toast is drawn inside it so it isn't hidden */
  sheets: number;
  setupDraft: SetupDraft | null;
  setSetupDraft: (d: SetupDraft | null) => void;
  openSheet: () => void;
  closeSheet: () => void;
  setHydrated: () => void;
  addFamily: (f: Family) => void;
  setActive: (id: string) => void;
  update: (fn: (f: Family) => void) => void;
  /** update a family that may not be the active one */
  updateFamily: (id: string, fn: (f: Family) => void) => void;
  replaceFamily: (f: Family) => void;
  deleteFamily: (id: string) => void;
  toggleChip: (c: ChipId) => void;
  setChips: (c: ChipId[]) => void;
  toggleAvailable: (v: string) => void;
  clearAvailable: () => void;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      families: {},
      activeId: null,
      chips: [],
      available: [],
      hydrated: false,
      toast: null,
      showToast: (text, tone = 'info') => set({ toast: text ? { text, tone, id: Date.now() + Math.random() } : null }),
      sheets: 0,
      setupDraft: null,
      setSetupDraft: (setupDraft) => set({ setupDraft }),
      openSheet: () => set((s) => ({ sheets: s.sheets + 1 })),
      closeSheet: () => set((s) => ({ sheets: Math.max(0, s.sheets - 1) })),
      setHydrated: () => set({ hydrated: true }),
      addFamily: (f) => set((s) => ({ families: { ...s.families, [f.id]: f }, activeId: f.id })),
      setActive: (id) => set({ activeId: id, chips: [], available: [] }),
      update: (fn) => {
        const { activeId, families } = get();
        if (!activeId || !families[activeId]) return;
        const f = clone(families[activeId]);
        fn(f);
        set({ families: { ...families, [activeId]: f } });
      },
      updateFamily: (id, fn) => {
        const { families } = get();
        if (!families[id]) return;
        const f = clone(families[id]);
        fn(f);
        if (JSON.stringify(f) !== JSON.stringify(families[id])) set({ families: { ...families, [id]: f } });
      },
      replaceFamily: (f) => set((s) => ({ families: { ...s.families, [f.id]: f } })),
      deleteFamily: (id) =>
        set((s) => {
          const families = { ...s.families };
          delete families[id];
          const ids = Object.keys(families);
          return { families, activeId: s.activeId === id ? (ids[0] ?? null) : s.activeId };
        }),
      toggleChip: (c) => set((s) => ({ chips: s.chips.includes(c) ? s.chips.filter((x) => x !== c) : [...s.chips, c] })),
      setChips: (c) => set({ chips: c }),
      toggleAvailable: (v) =>
        set((s) => ({ available: s.available.includes(v) ? s.available.filter((x) => x !== v) : [...s.available, v] })),
      clearAvailable: () => set({ available: [] }),
    }),
    {
      name: 'whatscooking-v2',
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as { families?: Record<string, Family>; activeId?: string | null };
        if (version < 2) for (const f of Object.values(state.families ?? {})) migrateFamily(f);
        if (version < 3) for (const f of Object.values(state.families ?? {})) migrateFamilyV3(f);
        return state;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ families: s.families, activeId: s.activeId, setupDraft: s.setupDraft }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export function useFamily(): Family | null {
  return useStore((s) => (s.activeId ? (s.families[s.activeId] ?? null) : null));
}
