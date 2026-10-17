// Pure state transitions on a Family. The store clones, applies, and saves.
import { shoppingIngredients } from './allergens';
import type { CookReply } from './cookcard';
import { daysBetween, isAfter, SLOT_END, SLOT_ORDER, todayKey } from './dates';
import { uid } from './family';
import { dishById, recommend } from './recommender';
import { checkDishForPlate, plateEaters, PlanProblem } from './rules';
import type { CookCardRecord, Family, Leftover, LogVia, MealEntry, PlannedMeal, ReactionKind, RecEvent, SlotId } from './types';

const sameKey = (p: PlannedMeal, date: string, slot: SlotId, memberId?: string) =>
  p.date === date && p.slot === slot && (p.memberId ?? '') === (memberId ?? '');

export function findPlanned(f: Family, date: string, slot: SlotId, memberId?: string) {
  return f.planned.find((p) => sameKey(p, date, slot, memberId));
}

/** The dish a plan currently means: the cook's or planner's pick, else the 1st choice (D06). */
export function planDish(p: Pick<PlannedMeal, 'chosenDishId' | 'options'>): string | undefined {
  return p.chosenDishId ?? p.options[0];
}

/** Options with the picked dish first, alternates after. */
export function rankedOptions(p: Pick<PlannedMeal, 'chosenDishId' | 'options'>): string[] {
  if (!p.chosenDishId) return [...p.options];
  return [p.chosenDishId, ...p.options.filter((id) => id !== p.chosenDishId)];
}

export class PlanRuleError extends Error {
  problems: PlanProblem[];
  constructor(message: string, problems: PlanProblem[] = []) {
    super(message);
    this.name = 'PlanRuleError';
    this.problems = problems;
  }
}

export interface PlanOpts {
  memberId?: string;
  forMemberIds?: string[];
  source?: PlannedMeal['source'];
  pinned?: boolean;
}

/** Dishes already taken by the child's breakfast and other box that day (FR-265, D10). */
function tiffinClashes(f: Family, date: string, slot: SlotId, memberId?: string): Set<string> {
  const taken = new Set<string>();
  if (!slot.startsWith('tiffin')) return taken;
  for (const p of f.planned) {
    if (p.date !== date || p.status === 'skipped') continue;
    const dish = planDish(p);
    if (!dish) continue;
    if (p.slot === 'breakfast' && !p.memberId) taken.add(dish);
    if (p.slot.startsWith('tiffin') && p.slot !== slot && (p.memberId ?? '') === (memberId ?? '')) taken.add(dish);
  }
  return taken;
}

/**
 * Check options against every hard rule for the people on this plate (D05):
 * diet, Jain / no onion-garlic, allergies, fasts, spice, and box fit for tiffins.
 */
export function checkPlan(f: Family, date: string, slot: SlotId, options: string[], opts: PlanOpts = {}): { ok: string[]; problems: PlanProblem[] } {
  const eaters = plateEaters(f, { date, slot, memberId: opts.memberId, forMemberIds: opts.forMemberIds });
  const clashes = tiffinClashes(f, date, slot, opts.memberId);
  const ok: string[] = [];
  const problems: PlanProblem[] = [];
  for (const id of [...new Set(options)]) {
    const dish = dishById(f, id);
    if (!dish) {
      problems.push({ dishId: id, reason: 'Unknown dish' });
      continue;
    }
    const why = checkDishForPlate(f, dish, date, slot, eaters);
    if (why) problems.push({ dishId: id, reason: why });
    else if (clashes.has(id)) problems.push({ dishId: id, reason: `${dish.name} is already breakfast or the other box that day` });
    else ok.push(id);
  }
  return { ok, problems };
}

/**
 * The one place a plan is created or changed. Options that break a hard rule are
 * dropped; if none is left, or the meal is already cooked, it throws PlanRuleError
 * and nothing is saved. UI code calls tryUpsertPlan.
 */
export function upsertPlan(f: Family, date: string, slot: SlotId, options: string[], opts: PlanOpts = {}): PlannedMeal {
  const existing = findPlanned(f, date, slot, opts.memberId);
  if (existing && (existing.status === 'cooked' || existing.status === 'ordered_in')) {
    throw new PlanRuleError('This meal is already logged. Correct it in Log or Memory instead of re-planning it.');
  }
  const forMemberIds = opts.forMemberIds ?? existing?.forMemberIds;
  const { ok, problems } = checkPlan(f, date, slot, options, { ...opts, forMemberIds });
  const clean = ok.slice(0, 3);
  if (!clean.length) {
    throw new PlanRuleError(problems[0]?.reason ?? 'Pick at least one dish.', problems);
  }
  if (existing) {
    const changed = clean.join('|') !== existing.options.join('|');
    existing.options = clean;
    existing.chosenDishId = undefined;
    existing.forMemberIds = forMemberIds;
    existing.pinned = opts.pinned ?? existing.pinned;
    existing.changeRequested = false;
    existing.alternates = undefined;
    if (existing.status === 'skipped') existing.status = 'planned';
    if (changed && existing.status === 'sent') {
      // The cook has the old menu: the card must go out again.
      existing.status = 'planned';
      existing.cookSentAt = undefined;
      existing.cookOpenedAt = undefined;
      existing.cookAckAt = undefined;
      existing.cardId = undefined;
    }
    return existing;
  }
  const p: PlannedMeal = {
    id: uid('p'),
    date,
    slot,
    memberId: opts.memberId,
    forMemberIds,
    options: clean,
    pinned: opts.pinned ?? false,
    status: 'planned',
    source: opts.source ?? 'today',
  };
  f.planned.push(p);
  return p;
}

/** upsertPlan for UI code: never throws, reports what was dropped and why. */
export function tryUpsertPlan(f: Family, date: string, slot: SlotId, options: string[], opts: PlanOpts = {}): { plan?: PlannedMeal; dropped: PlanProblem[]; error?: string } {
  const dropped = checkPlan(f, date, slot, options, { ...opts, forMemberIds: opts.forMemberIds ?? findPlanned(f, date, slot, opts.memberId)?.forMemberIds }).problems;
  try {
    return { plan: upsertPlan(f, date, slot, options, opts), dropped };
  } catch (e) {
    return { dropped, error: e instanceof Error ? e.message : 'Could not save this meal.' };
  }
}

/**
 * After a member's rules change, re-check plans that haven't been cooked (D05).
 * Options that no longer fit are removed; a plan with nothing left is deleted.
 */
export function recheckPlans(f: Family, from = todayKey()): string[] {
  const notes: string[] = [];
  for (const p of [...f.planned]) {
    if (p.date < from || (p.status !== 'planned' && p.status !== 'sent')) continue;
    const { ok, problems } = checkPlan(f, p.date, p.slot, p.options, { memberId: p.memberId, forMemberIds: p.forMemberIds });
    if (!problems.length) continue;
    const names = problems.map((x) => dishById(f, x.dishId)?.name ?? x.dishId).join(', ');
    if (!ok.length) {
      f.planned = f.planned.filter((x) => x.id !== p.id);
      notes.push(`Removed ${names} on ${p.date}: ${problems[0].reason}`);
    } else {
      p.options = ok;
      if (p.chosenDishId && !ok.includes(p.chosenDishId)) p.chosenDishId = undefined;
      notes.push(`Dropped ${names} on ${p.date}: ${problems[0].reason}`);
    }
  }
  return notes;
}

export function removePlan(f: Family, id: string) {
  f.planned = f.planned.filter((p) => p.id !== id);
}

export function recordEvent(f: Family, date: string, slot: SlotId, dishId: string, outcome: RecEvent['outcome']) {
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
  const plan = input.plannedId
    ? f.planned.find((p) => p.id === input.plannedId)
    : findPlanned(f, input.date, input.slot, input.memberId);
  const memberId = input.memberId ?? plan?.memberId;
  const entry: MealEntry = {
    id: uid('e'),
    date: input.date,
    slot: input.slot,
    memberId,
    forMemberIds: plan?.forMemberIds,
    dishIds: input.dishIds,
    via: input.via,
    photoUri: input.photoUri,
    plannedId: plan?.id ?? input.plannedId,
    reactions: [],
    orderedIn: input.orderedIn,
    confirmed: input.confirmed ?? true,
    createdAt: new Date().toISOString(),
  };
  // Replace an auto-logged entry for the same plate if the user logs it by hand.
  f.entries = f.entries.filter(
    (e) => !(e.via === 'auto' && e.date === input.date && e.slot === input.slot && (e.memberId ?? '') === (memberId ?? '')),
  );
  f.entries.push(entry);
  if (plan) {
    plan.status = input.orderedIn ? 'ordered_in' : 'cooked';
    // A meal logged by a person is the truth; an auto-log keeps the cook's pick (D08).
    plan.chosenDishId = input.via === 'auto' ? (plan.chosenDishId ?? input.dishIds[0]) : input.dishIds[0];
    plan.changeRequested = false;
  }
  if (entry.confirmed) resolveLeftoversByMeal(f, entry);
  return entry;
}

/**
 * A home-cooked meal made from a leftover uses it up. Only meals after the
 * leftover was created count (D11), and never food ordered in (D12).
 */
function resolveLeftoversByMeal(f: Family, e: MealEntry) {
  if (e.orderedIn || e.via === 'order') return;
  for (const l of f.leftovers) {
    if (l.resolved) continue;
    if (!isAfter(e.date, e.slot, l.date, l.slot)) continue;
    if (daysBetween(l.date, e.date) > 2) continue;
    const src = dishById(f, l.dishId);
    const became = e.dishIds.find((id) => src?.leftoverTo?.includes(id) || id === l.dishId);
    if (became) {
      l.resolved = true;
      if (!f.settings.learningPaused) f.leftoverDecisions.push({ id: uid('ld'), fromDishId: l.dishId, becameDishId: became, date: e.date });
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
    const dish = planDish(p);
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

/** Minutes until the next slot end today that has a plan waiting, or null (D37). */
export function nextAutoLogInMinutes(f: Family, now = new Date()): number | null {
  const today = todayKey(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  let best: number | null = null;
  for (const p of f.planned) {
    if (p.date !== today || (p.status !== 'planned' && p.status !== 'sent')) continue;
    const wait = SLOT_END[p.slot] - mins;
    if (wait > 0 && (best === null || wait < best)) best = wait;
  }
  return best;
}

/** Auto-logged meals nobody has confirmed yet (for the 9 pm digest, FR-222). */
export function unconfirmedEntries(f: Family): MealEntry[] {
  return f.entries
    .filter((e) => !e.confirmed)
    .sort((a, b) => (a.date === b.date ? SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) : a.date < b.date ? -1 : 1));
}

export function confirmEntry(f: Family, id: string) {
  const e = f.entries.find((x) => x.id === id);
  if (!e || e.confirmed) return;
  e.confirmed = true;
  resolveLeftoversByMeal(f, e);
}

/**
 * Meals already logged for the same plate (date, meal and person), so a second
 * log can ask "replace or add another?" instead of quietly keeping both (R02).
 */
export function entriesForPlate(f: Family, date: string, slot: SlotId, memberId?: string): MealEntry[] {
  return f.entries.filter((e) => e.date === date && e.slot === slot && (e.memberId ?? '') === (memberId ?? ''));
}

export interface EntryPatch {
  date?: string;
  slot?: SlotId;
  dishIds?: string[];
  memberId?: string;
  orderedIn?: boolean;
}

/**
 * Corrects a logged meal in place, when the plan changed or it was logged wrong (1.0.3, R02).
 * Moving it to another day or meal detaches it from the plan it came from (that plan
 * didn't happen as planned) and attaches it to the plan for the new plate, if any.
 * Returns false when the meal is gone or would be left with no dish.
 */
export function editEntry(f: Family, id: string, patch: EntryPatch): boolean {
  const e = f.entries.find((x) => x.id === id);
  if (!e) return false;
  if (patch.dishIds && !patch.dishIds.length) return false;
  const date = patch.date ?? e.date;
  const slot = patch.slot ?? e.slot;
  const memberId = 'memberId' in patch ? patch.memberId : e.memberId;
  const moved = date !== e.date || slot !== e.slot || (memberId ?? '') !== (e.memberId ?? '');
  if (moved) {
    const old = e.plannedId ? f.planned.find((p) => p.id === e.plannedId) : undefined;
    if (old && (old.status === 'cooked' || old.status === 'ordered_in')) old.status = 'skipped';
    const next = findPlanned(f, date, slot, memberId);
    e.plannedId = next?.id;
    e.forMemberIds = next?.forMemberIds;
  }
  e.date = date;
  e.slot = slot;
  e.memberId = memberId;
  if (patch.dishIds) e.dishIds = patch.dishIds;
  if (patch.orderedIn !== undefined) e.orderedIn = patch.orderedIn;
  e.confirmed = true;
  e.editedAt = new Date().toISOString();
  const plan = e.plannedId ? f.planned.find((p) => p.id === e.plannedId) : undefined;
  if (plan) {
    plan.status = e.orderedIn ? 'ordered_in' : 'cooked';
    plan.chosenDishId = e.dishIds[0];
    plan.changeRequested = false;
  }
  resolveLeftoversByMeal(f, e);
  return true;
}

/** Takes back the most recent matching learning event, e.g. a "Next" that was undone. */
export function undoEvent(f: Family, date: string, slot: SlotId, dishId: string, outcome: RecEvent['outcome']) {
  for (let i = f.events.length - 1; i >= 0; i--) {
    const ev = f.events[i];
    if (ev.date === date && ev.slot === slot && ev.dishId === dishId && ev.outcome === outcome) {
      f.events.splice(i, 1);
      return;
    }
  }
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

/** "toor dal" on the staples list also covers a recipe that just says "dal". */
function isStaple(staples: string[], item: string): boolean {
  return staples.some((s) => s === item || s.endsWith(' ' + item));
}

/** Ingredients for planned meals that aren't household staples (FR-253). */
export function missingForPlans(f: Family, from: string, to: string): string[] {
  const staples = f.staples.map((s) => s.trim().toLowerCase());
  const out = new Set<string>();
  for (const p of f.planned) {
    if (p.date < from || p.date > to || p.status === 'skipped' || p.status === 'cooked' || p.status === 'ordered_in') continue;
    const id = planDish(p);
    const dish = id ? dishById(f, id) : undefined;
    if (!dish) continue;
    for (const i of shoppingIngredients(dish)) if (!isStaple(staples, i)) out.add(i);
  }
  return [...out].sort();
}

/**
 * What to offer for the shopping list: needs of planned meals that aren't already
 * an open item. Things bought earlier can come back for a later meal (D13).
 */
export function cartSuggestions(f: Family, from: string, to: string): string[] {
  const open = new Set(f.cart.filter((c) => !c.done).map((c) => c.name));
  return missingForPlans(f, from, to).filter((s) => !open.has(s));
}

/** Remember a Cook Card the app issued, so only its reply is accepted (D23). */
export function registerCookCard(f: Family, card: CookCardRecord) {
  f.cookCards = [...(f.cookCards ?? []).filter((c) => c.id !== card.id).slice(-30), card];
  for (const it of card.items) {
    const p = f.planned.find((x) => x.id === it.planId);
    if (p) {
      p.cardId = card.id;
      p.cookOpenedAt = card.createdAt;
    }
  }
}

/** The planner confirms the WhatsApp message really went out (D36). */
export function markCardSent(f: Family, cardId: string, now = new Date()) {
  for (const p of f.planned) {
    if (p.cardId !== cardId) continue;
    if (p.status === 'planned') p.status = 'sent';
    p.cookSentAt = p.cookSentAt ?? now.toISOString();
  }
}

/** Is tomorrow's (or any date's) card still to be sent to a cook on duty? */
export function unsentForCook(f: Family, date: string, cookSlots?: SlotId[]): PlannedMeal[] {
  return f.planned.filter((p) => p.date === date && p.status === 'planned' && p.options.length && (!cookSlots || cookSlots.includes(p.slot)));
}

export function applyCookReply(f: Family, r: CookReply, now = new Date()): string[] {
  const card = (f.cookCards ?? []).find((c) => c.id === r.id);
  if (!card || card.revoked || (r.sig && r.sig !== card.sig)) return ['This reply doesn’t match a Cook Card sent from this phone, so nothing was changed.'];
  if (now.toISOString() > card.expiresAt) return ['That Cook Card has expired, so nothing was changed. Send a fresh one.'];
  const notes: string[] = [];
  const cook = f.members.find((m) => m.id === card.cookId);
  if (r.stop) {
    if (cook) cook.optedOut = true;
    card.revoked = true;
    return [`${cook?.name ?? 'The cook'} opted out of Cook Cards`];
  }
  const item = (pid: string) => card.items.find((x) => x.planId === pid);
  const plan = (pid: string) => (item(pid) ? f.planned.find((x) => x.id === pid) : undefined);
  const touched = new Set<string>();
  for (const [pid, idx] of Object.entries(r.picks)) {
    const p = plan(pid);
    const dishId = item(pid)?.options[idx];
    if (!p || !dishId || p.status === 'cooked' || p.status === 'ordered_in') continue;
    p.chosenDishId = dishId;
    p.changeRequested = false;
    p.alternates = undefined;
    touched.add(pid);
    const clash = tiffinClashes(f, p.date, p.slot, p.memberId).has(dishId);
    notes.push(`${dishById(f, dishId)?.name} chosen${clash ? ' (same as breakfast or the other box — you may want to change it)' : ''}`);
  }
  for (const [pid, items] of Object.entries(r.missing)) {
    const p = plan(pid);
    if (!p) continue;
    p.missing = items;
    touched.add(pid);
    addCart(f, items, 'cook', p.date);
    notes.push(`Missing: ${items.join(', ')}`);
  }
  for (const pid of r.change) {
    const p = plan(pid);
    if (!p || p.status === 'cooked' || p.status === 'ordered_in') continue;
    const current = planDish(p);
    const eaters = plateEaters(f, p);
    p.changeRequested = true;
    p.chosenDishId = undefined;
    p.alternates = recommend({ family: f, date: p.date, slot: p.slot, memberId: p.slot.startsWith('tiffin') ? p.memberId : undefined, eaters: eaters.length ? eaters : undefined, exclude: p.options, count: 2 }).map((s) => s.dish.id);
    touched.add(pid);
    if (current) recordEvent(f, p.date, p.slot, current, 'cook_changed');
    notes.push(`${cook?.name ?? 'Cook'} asked to change ${dishById(f, current ?? '')?.name ?? 'a dish'} — pick an alternate on Today`);
  }
  if (touched.size) {
    card.repliedAt = now.toISOString();
    // A reply proves the card arrived.
    for (const pid of touched) {
      const p = f.planned.find((x) => x.id === pid);
      if (!p) continue;
      if (p.status === 'planned') p.status = 'sent';
      p.cookSentAt = p.cookSentAt ?? now.toISOString();
      p.cookAckAt = now.toISOString();
    }
  }
  return notes.length ? notes : ['Nothing in that reply matched the meals on the card.'];
}

/** Plans the cook asked to change and the planner hasn't settled yet. */
export function changeRequests(f: Family, from = todayKey()): PlannedMeal[] {
  return f.planned.filter((p) => p.changeRequested && p.date >= from && (p.status === 'planned' || p.status === 'sent'));
}

/** Last N distinct dishes for one-tap logging (FR-224). */
export function recentDistinct(f: Family, n = 8): string[] {
  const out: string[] = [];
  const sorted = [...f.entries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  for (const e of sorted) for (const id of e.dishIds) if (!out.includes(id) && out.length < n) out.push(id);
  return out;
}

/**
 * Family favourites shelf (FR-281): built from positive outcomes only. Logging a
 * dish often is not evidence anyone loved it (D18). "safe" means a reliable crowd
 * pleaser (loved or came back empty 3+ times, never rejected). It says nothing
 * about allergies.
 */
export function favourites(f: Family): { dishId: string; score: number; safe: boolean }[] {
  const m = new Map<string, { score: number; pos: number; neg: number }>();
  for (const e of f.entries) {
    for (const id of e.dishIds) {
      const s = m.get(id) ?? { score: 0, pos: 0, neg: 0 };
      for (const r of e.reactions) {
        if (r.kind === 'loved' || r.kind === 'tiffin_empty') {
          s.score += 2;
          s.pos++;
        } else if (r.kind === 'ok') s.score += 0.5;
        else if (r.kind === 'not_again' || r.kind === 'tiffin_full') {
          s.score -= 3;
          s.neg++;
        }
      }
      m.set(id, s);
    }
  }
  return [...m.entries()]
    .filter(([, s]) => s.pos >= 1 && s.score >= 2)
    .sort((a, b) => b[1].score - a[1].score)
    .map(([dishId, s]) => ({ dishId, score: s.score, safe: s.pos >= 3 && s.neg === 0 }));
}
