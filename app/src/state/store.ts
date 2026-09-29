// Local-first store (data stays on the phone; Supabase sync is the next pass).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ChipId, Family } from '@/domain/types';

interface AppState {
  families: Record<string, Family>;
  activeId: string | null;
  /** session-only UI state */
  chips: ChipId[];
  available: string[];
  hydrated: boolean;
  setHydrated: () => void;
  addFamily: (f: Family) => void;
  setActive: (id: string) => void;
  update: (fn: (f: Family) => void) => void;
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
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ families: s.families, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export function useFamily(): Family | null {
  return useStore((s) => (s.activeId ? (s.families[s.activeId] ?? null) : null));
}
