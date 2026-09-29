// Pure state transitions on a Family. The store clones, applies, and saves.
import { dishById } from './recommender';
import { daysBetween, SLOT_END, todayKey } from './dates';
import type { CookReply } from './cookcard';
import { uid } from './family';
import type { Family, Leftover, LogVia, MealEntry, PlannedMeal, ReactionKind, SlotId } from './types';

const sameKey = (p: PlannedMeal, date: string, slot: SlotId, memberId?: string) =>
  p.date === date && p.slot === slot && (p.memberId ?? '') === (memberId ?? '');

export function findPlanned(f: Family, date: string, slot: SlotId, memberId?: string) {
  return f.planned.find((p) => sameKey(p, date, slot, memberId));
}

export function upsertPlan(
  f: Family,
  date: string,
  slot: SlotId,
  options: string[],
  opts: { memberId?: string; source?: PlannedMeal['source']; pinned?: boolean } = {},
): PlannedMeal {
  const existing = findPlanned(f, date, slot, opts.memberId);
  const clean = [...new Set(options)].slice(0, 3);
  if (existing) {
    existing.options = clean;
    existing.chosenDishId = undefined;
    existing.pinned = opts.pinned ?? existing.pinned;
    if (existing.status === 'skipped') existing.status = 'planned';
    return existing;
  }
  const p: PlannedMeal = {
    id: uid('p'),
    date,
    slot,
    memberId: opts.memberId,
    options: clean,
    pinned: opts.pinned ?? false,
    status: 'planned',
    source: opts.source ?? 'today',
  };
  f.planned.push(p);
  return p;
}

export function removePlan(f: Family, id: string) {
  f.planned = f.planned.filter((p) => p.id !== id);
}

export function recordEvent(f: Family, date: string, slot: SlotId, dishId: string, outcome: 'accepted' | 'swiped') {
  if (f.settings.learningPaused) return;
  f.events.push({ date, slot, dishId, outcome });
  if (f.events.length > 600) f.events = f.events.slice(-500);
}

export interface LogInput {
  date: string;
  slot: SlotId;
  dishIds: string[];
  via: LogVia;
  memberId?: string;
  photoUri?: string;
  plannedId?: string;
  orderedIn?: boolean;
  confirmed?: boolean;
}

export function logMeal(f: Family, input: LogInput): MealEntry {
  const entry: MealEntry = {
    id: uid('e'),
    date: input.date,
    slot: input.slot,
    memberId: input.memberId,
    dishIds: input.dishIds,
    via: input.via,
    photoUri: input.photoUri,
    plannedId: input.plannedId,
    reactions: [],
    orderedIn: input.orderedIn,
    confirmed: input.confirmed ?? true,
    createdAt: new Date().toISOString(),
  };
  // Replace an auto-logged entry for the same slot if the user logs it by hand.
  f.entries = f.entries.filter(
    (e) => !(e.via === 'auto' && e.date === input.date && e.slot === input.slot && (e.memberId ?? '') === (input.memberId ?? '')),
  );
  f.entries.push(entry);
  const plan = input.plannedId
    ? f.planned.find((p) => p.id === input.plannedId)
    : findPlanned(f, input.date, input.slot, input.memberId);
  if (plan) {
    plan.status = input.orderedIn ? 'ordered_in' : 'cooked';
    plan.chosenDishId = plan.chosenDishId ?? input.dishIds[0];
    entry.plannedId = plan.id;
  }
  resolveLeftoversByMeal(f, entry);
  return entry;
}

function resolveLeftoversByMeal(f: Family, e: MealEntry) {
  for (const l of f.leftovers) {
    if (l.resolved) continue;
    const gap = daysBetween(l.date, e.date);
    if (gap < 0 || gap > 2) continue;
    if (l.date === e.date && l.slot === e.slot) continue;
    const src = dishById(f, l.dishId);
    const became = e.dishIds.find((id) => src?.leftoverTo?.includes(id) || id === l.dishId);
    if (became) {
      l.resolved = true;
      f.leftoverDecisions.push({ id: uid('ld'), fromDishId: l.dishId, becameDishId: became, date: e.date });
    }
  }
}

export function addLeftover(f: Family, dishId: string, amount: Leftover['amount'], date: string, slot: SlotId) {
  f.leftovers.push({ id: uid('l'), dishId, amount, date, slot, resolved: false });
}

export function resolveLeftover(f: Family, id: string, becameDishId: string | null) {
  const l = f.leftovers.find((x) => x.id === id);
  if (!l || l.resolved) return;
  l.resolved = true;
  f.leftoverDecisions.push({ id: uid('ld'), fromDishId: l.dishId, becameDishId, date: todayKey() });
}

export function expireLeftovers(f: Family, today: string) {
  for (const l of f.leftovers) {
    if (!l.resolved && daysBetween(l.date, today) > 2) {
      l.resolved = true;
      f.leftoverDecisions.push({ id: uid('ld'), fromDishId: l.dishId, becameDishId: null, date: today });
    }
  }
}

export function toggleReaction(f: Family, entryId: string, memberId: string, kind: ReactionKind) {
  const e = f.entries.find((x) => x.id === entryId);
  if (!e) return;
  const tiffinKinds: ReactionKind[] = ['tiffin_empty', 'tiffin_half', 'tiffin_full'];
  const group = tiffinKinds.includes(kind) ? tiffinKinds : (['loved', 'ok', 'not_again'] as ReactionKind[]);
  const had = e.reactions.some((r) => r.memberId === memberId && r.kind === kind);
  e.reactions = e.reactions.filter((r) => !(r.memberId === memberId && group.includes(r.kind)));
  if (!had) e.reactions.push({ memberId, kind });
}

/** FR-222: accepted plans become cooked meals after their slot ends. Returns count. */
export function autoLog(f: Family, now = new Date()): number {
  const today = todayKey(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  let n = 0;
  for (const p of f.planned) {
    if (p.status !== 'planned' && p.status !== 'sent') continue;
    const past = p.date < today || (p.date === today && mins >= SLOT_END[p.slot]);
    if (!past) continue;
    if (daysBetween(p.date, today) > 3) {
      p.status = 'skipped';
      continue;
    }
    const dish = p.chosenDishId ?? p.options[0];
    if (!dish) continue;
    const already = f.entries.some((e) => e.date === p.date && e.slot === p.slot && (e.memberId ?? '') === (p.memberId ?? ''));
    if (already) {
      p.status = 'cooked';
      continue;
    }
    logMeal(f, { date: p.date, slot: p.slot, memberId: p.memberId, dishIds: [dish], via: 'auto', plannedId: p.id, confirmed: false });
    n++;
  }
  return n;
}

export function confirmEntry(f: Family, id: string) {
  const e = f.entries.find((x) => x.id === id);
  if (e) e.confirmed = true;
}

export function deleteEntry(f: Family, id: string) {
  const e = f.entries.find((x) => x.id === id);
  f.entries = f.entries.filter((x) => x.id !== id);
  if (e?.plannedId) {
    const p = f.planned.find((x) => x.id === e.plannedId);
    if (p) p.status = 'skipped';
  }
}

export function addCart(f: Family, names: string[], source: 'plan' | 'cook' | 'manual', forDate?: string) {
  for (const raw of names) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    if (f.cart.some((c) => !c.done && c.name === name)) continue;
    f.cart.push({ id: uid('c'), name, source, forDate, done: false });
  }
}

/** Ingredients for planned meals that aren't household staples (FR-253). */
export function missingForPlans(f: Family, from: string, to: string): string[] {
  const staples = new Set(f.staples.map((s) => s.toLowerCase()));
  const out = new Set<string>();
  for (const p of f.planned) {
    if (p.date < from || p.date > to || p.status === 'skipped') continue;
    const dish = dishById(f, p.chosenDishId ?? p.options[0]);
    if (!dish) continue;
    for (const i of [...dish.ingredients, ...dish.veg]) {
      const k = i.toLowerCase();
      if (!staples.has(k)) out.add(k);
    }
  }
  return [...out].sort();
}

export function applyCookReply(f: Family, r: CookReply): string[] {
  const notes: string[] = [];
  const cook = f.members.find((m) => m.roles.includes('cook'));
  if (r.stop && cook) {
    cook.optedOut = true;
    notes.push(`${cook.name} opted out of Cook Cards`);
  }
  for (const [pid, idx] of Object.entries(r.picks)) {
    const p = f.planned.find((x) => x.id === pid);
    if (!p || !p.options[idx]) continue;
    p.chosenDishId = p.options[idx];
    notes.push(`${dishById(f, p.chosenDishId)?.name} chosen`);
  }
  for (const [pid, items] of Object.entries(r.missing)) {
    const p = f.planned.find((x) => x.id === pid);
    p && (p.missing = items);
    addCart(f, items, 'cook', p?.date);
    notes.push(`Missing: ${items.join(', ')}`);
  }
  for (const pid of r.change) {
    const p = f.planned.find((x) => x.id === pid);
    if (p) notes.push(`Cook asked to change ${dishById(f, p.options[0])?.name ?? 'a dish'}`);
  }
  return notes;
}

/** Last N distinct dishes for one-tap logging (FR-224). */
export function recentDistinct(f: Family, n = 8): string[] {
  const out: string[] = [];
  const sorted = [...f.entries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  for (const e of sorted) for (const id of e.dishIds) if (!out.includes(id) && out.length < n) out.push(id);
  return out;
}

/** Family favourites shelf (FR-281): repeated positive outcomes. */
export function favourites(f: Family): { dishId: string; score: number; safe: boolean }[] {
  const m = new Map<string, number>();
  for (const e of f.entries) {
    for (const id of e.dishIds) {
      let s = m.get(id) ?? 0;
      s += 0.5;
      for (const r of e.reactions) {
        if (r.kind === 'loved' || r.kind === 'tiffin_empty') s += 2;
        if (r.kind === 'not_again' || r.kind === 'tiffin_full') s -= 3;
      }
      m.set(id, s);
    }
  }
  return [...m.entries()]
    .filter(([, s]) => s >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([dishId, score]) => ({ dishId, score, safe: score >= 4 }));
}
