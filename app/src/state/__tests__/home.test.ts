/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logMeal } from '@/domain/actions';
import { newFamily, newMember } from '@/domain/family';
import { HOME_DEFAULTS, homePreferences } from '@/domain/home';
import { useStore } from '@/state/store';

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();
  return {
    __esModule: true, storage,
    default: {
      getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { storage.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { storage.delete(key); }),
    },
  };
});
const mockStorage: Map<string, string> = jest.requireMock('@react-native-async-storage/async-storage').storage;

beforeEach(async () => {
  await Promise.resolve();
  mockStorage.clear();
  jest.clearAllMocks();
  useStore.setState({ families: {}, activeId: null, setupDraft: null, hydrated: true });
});

test('appearance edits retain meal IDs, reactions and all unrelated family data', async () => {
  const family = newFamily('Kitchen', 'general');
  family.members = [newMember('A', { roles: ['planner', 'eater'] })];
  logMeal(family, { date: '2026-10-17', slot: 'dinner', dishIds: ['dal_chawal'], via: 'manual' });
  useStore.getState().addFamily(family);
  const before = JSON.parse(JSON.stringify(family));
  const home = { ...HOME_DEFAULTS, theme: 'sage' as const, cover: 'photo' as const, photoUri: 'data:image/jpeg;base64,cGhvdG8=' };
  await useStore.getState().saveHome(family.id, home);
  expect(useStore.getState().families[family.id]).toEqual({ ...before, settings: { ...before.settings, home } });
  const disk = JSON.parse(mockStorage.get('whatscooking-v2')!);
  expect(disk.state.families[family.id].settings.home.photoUri).toBe(home.photoUri);
  expect(disk.state.families[family.id].entries[0].id).toBe(before.entries[0].id);
});

test('a storage quota failure preserves the old cover in memory and on disk', async () => {
  const family = newFamily('Kitchen', 'south');
  family.settings.home = { ...HOME_DEFAULTS, headline: 'Our original home' };
  useStore.getState().addFamily(family);
  const original = mockStorage.get('whatscooking-v2');
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('QuotaExceededError'));
  await expect(useStore.getState().saveHome(family.id, { ...HOME_DEFAULTS, headline: 'Unsaved change' })).rejects.toThrow('QuotaExceededError');
  expect(useStore.getState().families[family.id].settings.home?.headline).toBe('Our original home');
  expect(mockStorage.get('whatscooking-v2')).toBe(original);
});

test('a family photo and theme never overwrite another household or an unfinished setup', async () => {
  const a = newFamily('A', 'south');
  const b = newFamily('B', 'north');
  useStore.getState().addFamily(a);
  useStore.getState().addFamily(b);
  const draft = { step: 1, me: 'Someone', name: 'New home', region: 'general' as const, members: [], favs: [], savedAt: '2026-10-17' };
  useStore.getState().setSetupDraft(draft);
  await useStore.getState().saveHome(a.id, { ...HOME_DEFAULTS, theme: 'rose', showPantry: false });
  expect(useStore.getState().activeId).toBe(b.id);
  expect(useStore.getState().families[b.id]).toEqual(b);
  expect(useStore.getState().setupDraft).toEqual(draft);
  const disk = JSON.parse(mockStorage.get('whatscooking-v2')!);
  expect(disk.state.setupDraft).toEqual(draft);
});

test('older families without appearance settings get usable defaults without being mutated', () => {
  const family = newFamily('Old family', 'general');
  const original = JSON.stringify(family);
  expect(homePreferences(family.settings.home)).toEqual(HOME_DEFAULTS);
  expect(JSON.stringify(family)).toBe(original);
});

test('a missing or temporary cover from an imported backup falls back to a bundled photo', () => {
  expect(homePreferences({ cover: 'photo', photoUri: 'blob:expired' }).cover).toBe('table');
  expect(homePreferences({ cover: 'photo', photoUri: 'https://tracking.example/family.jpg' }).photoUri).toBeUndefined();
  expect(homePreferences({ cover: 'photo', photoUri: 'file:///app/photos/family.jpg' }).cover).toBe('photo');
});

test('saving a family that was removed fails instead of reporting success', async () => {
  await expect(useStore.getState().saveHome('missing', { ...HOME_DEFAULTS })).rejects.toThrow('no longer available');
});

test('a failed photo save does not roll back a meal logged while storage was pending', async () => {
  const family = newFamily('Kitchen', 'general');
  family.members = [newMember('A')];
  useStore.getState().addFamily(family);
  let rejectWrite!: (error: Error) => void;
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(() => new Promise((_, reject) => { rejectWrite = reject; }));
  const saving = useStore.getState().saveHome(family.id, { ...HOME_DEFAULTS, theme: 'cocoa' });
  useStore.getState().update((f) => { logMeal(f, { date: '2026-10-17', slot: 'lunch', dishIds: ['dal_chawal'], via: 'manual' }); });
  rejectWrite(new Error('QuotaExceededError'));
  await expect(saving).rejects.toThrow('QuotaExceededError');
  expect(useStore.getState().families[family.id].entries).toHaveLength(1);
  expect(useStore.getState().families[family.id].settings.home).toBeUndefined();
  expect(JSON.parse(mockStorage.get('whatscooking-v2')!).state.families[family.id].entries).toHaveLength(1);
});
