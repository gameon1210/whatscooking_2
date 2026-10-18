// Transparent rules-plus-score ranker (FSD section 8).
// Pipeline: resolve context -> hard filter -> candidates -> score -> diversify -> explain.
import { CATALOG } from './catalog';
import { cuisineFits } from './cuisines';
import { memberFasts } from './calendar';
import { addDays, daysBetween, weekday, weekdayLong } from './dates';
import { preferenceScore } from './prefs';
import { checkMember, cookOnDuty, eatersFor, isHidden, slotFits, spiceCheck } from './rules';
import type { ChipId, Dish, Driver, Family, Member, Plate, SlotId, Suggestion } from './types';

export interface RecContext {
  family: Family;
  date: string;
  slot: SlotId;
  /** child, for tiffin slots */
  memberId?: string;
  chips?: ChipId[];
  available?: string[];
  /** dish ids not to show (already swiped, the other tiffin, ...) */
  exclude?: string[];
  /** restrict to dishes good for ordering in (FR-255) */
  orderIn?: boolean;
  count?: number;
  /** eaters override (used for split plates) */
  eaters?: Member[];
}

const HALF_LIFE = 60;
const decay = (ageDays: number) => Math.pow(0.5, Math.max(0, ageDays) / HALF_LIFE);

export function allDishes(family: Family): Dish[] {
  return [...CATALOG, ...family.customDishes];
}

export function dishById(family: Family, id: string): Dish | undefined {
  return family.customDishes.find((d) => d.id === id) ?? CATALOG.find((d) => d.id === id);
}

const isTiffin = (s: SlotId) => s === 'tiffin_short' || s === 'tiffin_lunch';

interface Stats {
  lastCooked: Map<string, string>;
  known: Set<string>;
  sameSlotWeekday: Map<string, number>;
  sameSlot: Map<string, number>;
  recentByDate: Map<string, Set<string>>;
  recentBases: string[];
  groupLastSeen: Map<string, string>;
  /** net effect of accept / swipe / cook-change events per dish (D43) */
  eventScore: Map<string, number>;
}

/**
 * Entries ranking may learn from. While learning is paused, anything logged
 * after the pause is ignored, so suggestions stay exactly as they were (D16).
 */
function learnable(family: Family) {
  if (!family.settings.learningPaused) return family.entries;
  const since = family.settings.learningPausedAt ?? '';
  return family.entries.filter((e) => e.createdAt <= since);
}

function buildStats(family: Family, ctx: RecContext): Stats {
  const lastCooked = new Map<string, string>();
  const known = new Set<string>(family.favourites);
  const sameSlotWeekday = new Map<string, number>();
  const sameSlot = new Map<string, number>();
  const recentByDate = new Map<string, Set<string>>();
  const groupLastSeen = new Map<string, string>();
  const wd = weekday(ctx.date);
  const slotType = (s: SlotId) => (isTiffin(s) ? 'tiffin' : s);
  const target = slotType(ctx.slot);

  const sorted = [...learnable(family)].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const e of sorted) {
    if (e.date > ctx.date) continue;
    const age = daysBetween(e.date, ctx.date);
    for (const id of e.dishIds) {
      known.add(id);
      const prev = lastCooked.get(id);
      if (!prev || prev < e.date) lastCooked.set(id, e.date);
      const negative = e.reactions.some((r) => r.kind === 'not_again' || r.kind === 'tiffin_full');
      if (slotType(e.slot) === target && !negative) {
        sameSlot.set(id, (sameSlot.get(id) ?? 0) + decay(age));
        if (weekday(e.date) === wd) sameSlotWeekday.set(id, (sameSlotWeekday.get(id) ?? 0) + decay(age));
      }
      const set = recentByDate.get(e.date) ?? new Set<string>();
      set.add(id);
      recentByDate.set(e.date, set);
      const dish = dishById(family, id);
      dish?.groups.forEach((g) => {
        const p = groupLastSeen.get(g);
        if (!p || p < e.date) groupLastSeen.set(g, e.date);
      });
    }
  }
  // Planned (not yet cooked) meals near this date count as "recent" for repetition.
  for (const p of family.planned) {
    if (p.status === 'cooked' || p.status === 'skipped') continue;
    if (p.date === ctx.date && p.slot === ctx.slot && p.memberId === ctx.memberId) continue;
    const gap = Math.abs(daysBetween(p.date, ctx.date));
    if (gap > 2) continue;
    const id = p.chosenDishId ?? p.options[0];
    if (!id) continue;
    const set = recentByDate.get(p.date) ?? new Set<string>();
    set.add(id);
    recentByDate.set(p.date, set);
  }
  const recentBases = sorted
    .filter((e) => e.date <= ctx.date)
    .slice(-2)
    .flatMap((e) => e.dishIds.map((id) => dishById(family, id)?.base ?? 'other'));
  const eventScore = new Map<string, number>();
  for (const ev of family.events) {
    if (ev.date > ctx.date) continue;
    const w = Math.pow(0.5, Math.max(0, daysBetween(ev.date, ctx.date)) / 30);
    const v = ev.outcome === 'accepted' ? 1 : ev.outcome === 'swiped' ? -1.5 : -4;
    eventScore.set(ev.dishId, (eventScore.get(ev.dishId) ?? 0) + v * w);
  }
  return { lastCooked, known, sameSlotWeekday, sameSlot, recentByDate, recentBases, groupLastSeen, eventScore };
}

function closestRecent(stats: Stats, dishId: string, date: string): number | null {
  let best: number | null = null;
  for (const [d, set] of stats.recentByDate) {
    if (!set.has(dishId)) continue;
    const gap = Math.abs(daysBetween(d, date));
    if (best === null || gap < best) best = gap;
  }
  return best;
}

function candidates(ctx: RecContext, eaters: Member[]): Dish[] {
  const { family } = ctx;
  const region = family.region;
  const known = new Set([...family.favourites, ...family.entries.flatMap((e) => e.dishIds)]);
  return allDishes(family).filter((d) => {
    if (ctx.exclude?.includes(d.id)) return false;
    // Never suggest a custom dish whose diet and allergens aren't confirmed (D03).
    if (d.unverified) return false;
    if (!slotFits(d, ctx.slot)) return false;
    if (ctx.orderIn && !d.orderIn) return false;
    if (isHidden(family, d.id, ctx.date)) return false;
    if (region !== 'general' && !d.regions.includes(region) && !d.regions.includes('general') && !known.has(d.id))
      return false;
    // Only the cuisines the family cooks, plus anything it has already cooked (1.0.4).
    if (!known.has(d.id) && !cuisineFits(d, family)) return false;
    return eaters.every((m) => checkMember(d, m, ctx.date, family).ok);
  });
}

const firstName = (m: Member) => m.name.split(' ')[0];

export function scoreDish(dish: Dish, ctx: RecContext, eaters: Member[], stats: Stats): Suggestion {
  const { family, date, slot } = ctx;
  const chips = ctx.chips ?? [];
  const wd = weekday(date);
  const weekend = wd === 0 || wd === 6;
  const drivers: Driver[] = [];
  const add = (key: string, value: number, label: string) => {
    if (value !== 0) drivers.push({ key, value, label });
  };
  const learning = !family.settings.learningPaused;

  // C: context fit
  add('C', 30, 'Fits this meal');
  if (chips.includes('quick') || chips.includes('low_energy')) {
    if (dish.effort === 1) add('C', 10, 'Quick to make');
    if (dish.effort === 3) add('C', -20, 'Takes long');
  }
  if (chips.includes('low_energy') && dish.comfort) add('C', 4, 'Comfort food');
  if (chips.includes('guests')) {
    if (dish.weekendy) add('C', 8, 'Good for guests');
    if (dish.effort === 1) add('C', -3, 'Simple for guests');
  }
  if (chips.includes('rainy') && dish.comfort) add('C', 8, 'Rainy-day comfort');
  if (chips.includes('sick')) {
    if (dish.light || dish.soft) add('C', 15, 'Light on the stomach');
    if (dish.groups.includes('fried')) add('C', -20, 'Too heavy today');
    if (dish.spice >= 2) add('C', -10, 'Too spicy today');
  }
  if (chips.includes('sunday') && dish.weekendy) add('C', 12, 'A special-day dish');

  // H: habit pattern (weekday x slot)
  if (learning) {
    const hw = stats.sameSlotWeekday.get(dish.id) ?? 0;
    const sw = stats.sameSlot.get(dish.id) ?? 0;
    const h = Math.min(15, hw * 6 + sw * 1);
    if (hw >= 0.9) add('H', h, `Often on ${weekdayLong(wd)}s`);
    else if (sw >= 2.5) add('H', h, 'A family regular');
    else if (h > 0) add('H', h, 'Made for this meal before');
  }

  // R / Rep: recency
  const gap = closestRecent(stats, dish.id, date);
  if (gap !== null && gap <= 2) {
    add('Rep', gap === 0 ? -40 : gap === 1 ? -25 : -12, gap === 0 ? 'Already on today' : gap === 1 ? 'Made yesterday' : 'Made 2 days ago');
  } else {
    const last = stats.lastCooked.get(dish.id);
    if (last) {
      const since = daysBetween(last, date);
      if (since >= 3) add('R', Math.min(20, 5 + since * 0.75), `Not made in ${since} days`);
    }
  }
  if (stats.recentBases.length && stats.recentBases.every((b) => b === 'rice') && dish.base === 'rice')
    add('Rep', -4, 'Lots of rice lately');

  // P / Neg / T: reactions
  if (learning) {
    let p = 0;
    let neg = 0;
    let t = 0;
    let lover: string | null = null;
    let tLabel = '';
    const eaterIds = eaters.map((m) => m.id);
    for (const e of learnable(family)) {
      if (!e.dishIds.includes(dish.id) || e.date > date) continue;
      const w = decay(daysBetween(e.date, date));
      for (const r of e.reactions) {
        if (!eaterIds.includes(r.memberId)) continue;
        if (r.kind === 'loved') {
          p += 4 * w;
          lover = lover ?? family.members.find((m) => m.id === r.memberId)?.name ?? null;
        } else if (r.kind === 'ok') p += 1 * w;
        else if (r.kind === 'not_again') neg -= 12 * w;
        else if (isTiffin(slot) && e.slot === slot && (!ctx.memberId || e.memberId === ctx.memberId)) {
          // Tiffin returns are learned per child and per box (D17).
          if (r.kind === 'tiffin_empty') {
            t += 7 * w;
            tLabel = 'Tiffin came back empty';
          } else if (r.kind === 'tiffin_half') t += 1 * w;
          else if (r.kind === 'tiffin_full') {
            t -= 12 * w;
            tLabel = tLabel || 'Came back full last time';
          }
        }
      }
    }
    if (p > 0) add('P', Math.min(15, p), lover ? `${lover.split(' ')[0]} loved it` : 'Family liked it');
    if (neg < 0) add('Neg', Math.max(-20, neg), 'Someone said "not again"');
    if (t !== 0) add('T', Math.max(-20, Math.min(20, t)), tLabel || 'Tiffin feedback');
    const ev = stats.eventScore.get(dish.id) ?? 0;
    if (ev <= -1) add('E', Math.max(-12, Math.round(ev)), 'Skipped a few times lately');
    else if (ev >= 1) add('E', Math.min(6, Math.round(ev)), 'You often say yes to this');
  }

  // F: free-text preferences and age / tolerance defaults
  const f = preferenceScore(dish, family.preferences, eaters.map((m) => m.id), wd);
  if (f > 0) add('F', f, 'Matches your preferences');
  if (f < 0) add('F', f, 'Against a preference');
  const kids = eaters.filter((m) => m.ageBand === 'toddler' || m.ageBand === 'child');
  if (kids.length && dish.spice >= 2) add('F', -6 * (dish.spice - 1), `Spicy for ${firstName(kids[0])}`);
  // Spice is a hard rule; a dish one step hotter is only here as its mild version.
  const mildFor = eaters.filter((m) => spiceCheck(dish, m).mild);
  if (mildFor.length) add('F', -4, `Make it mild for ${mildFor.map(firstName).join(', ')}`);
  if (eaters.some((m) => m.ageBand === 'senior')) {
    if (dish.soft || dish.light) add('F', 3, 'Easy for elders');
    if (dish.groups.includes('fried')) add('F', -4, 'Heavy for elders');
  }

  // A: available vegetables
  const avail = (ctx.available ?? []).filter((v) => dish.veg.includes(v));
  if (avail.length) add('A', Math.min(20, 10 * avail.length), `Uses your ${avail.slice(0, 2).join(' and ')}`);

  // L / D: leftovers and what the family did with them before
  // A leftover helps the next couple of meals: the rest of that day and the next day (FR-251).
  const leftovers = family.leftovers.filter((l) => !l.resolved && daysBetween(l.date, date) >= 0 && daysBetween(l.date, date) <= 1);
  for (const l of leftovers) {
    const src = dishById(family, l.dishId);
    if (!src) continue;
    if (src.leftoverTo?.includes(dish.id)) {
      add('L', chips.includes('leftovers') ? 22 : 15, `Uses leftover ${src.name.toLowerCase()}`);
    }
    const past = family.leftoverDecisions.filter((x) => x.fromDishId === l.dishId);
    if (past.length && learning) {
      const frac = past.filter((x) => x.becameDishId === dish.id).length / past.length;
      if (frac > 0) add('D', Math.round(frac * 15), `What you usually make from leftover ${src.name.toLowerCase()}`);
    }
  }

  // K: cook repertoire
  const cook = cookOnDuty(family, date, slot);
  if (cook?.repertoire?.includes(dish.id)) add('K', 6, `${firstName(cook)} knows this`);

  // X: effort vs the day
  if (!weekend && (slot === 'breakfast' || isTiffin(slot))) {
    if (dish.effort === 1) add('X', 8, 'Quick for a school morning');
    if (dish.effort === 3) add('X', -10, 'Heavy for a weekday morning');
  } else if (!weekend && slot === 'dinner' && dish.effort === 3) add('X', -4, 'Long for a weeknight');
  if (weekend && dish.weekendy) add('X', 4, 'A weekend favourite');

  // B: balance nudge
  if (family.settings.balanceBoost) {
    const since = (g: string) => {
      const last = stats.groupLastSeen.get(g);
      return last ? daysBetween(last, date) : 99;
    };
    if (dish.groups.includes('greens') && since('greens') >= 3 && family.entries.length > 5) add('B', 5, 'No greens for a few days');
    if (dish.groups.includes('millet') && since('millet') >= 7 && family.entries.length > 5) add('B', 3, 'Millets this week');
  }

  // N: novelty dial
  const novel = !stats.known.has(dish.id);
  if (novel) {
    const adv = family.settings.adventurous;
    const n = adv / 10 - ((100 - adv) / 100) * 12;
    add('N', Math.round(n), n > 0 ? 'Something new to try' : 'New for your family');
  }

  const score = drivers.reduce((s, x) => s + x.value, 0);
  const positives = drivers.filter((x) => x.key !== 'C' || x.value !== 30).filter((x) => x.value >= 4).sort((a, b) => b.value - a.value);
  const context = positives.slice(0, 3).map((x) => x.label).join(' · ');
  const condition = mildFor.length ? `Make it mild for ${mildFor.map(firstName).join(', ')}` : '';
  const reason = [condition, context].filter(Boolean).join(' · ') || 'Fits this plate’s saved food rules';
  return { dish, score, drivers, reason, novel, mildFor: mildFor.length ? mildFor.map((m) => m.id) : undefined };
}

/**
 * Pick the final list (FSD section 8 "diversify"):
 *  - the Familiar/Adventurous dial caps how many never-cooked dishes appear (D15);
 *    at 0 none appear unless no known dish fits at all;
 *  - the top three cover different bases (rice, roti, other) when candidates of
 *    each exist within 30 points of the best, then different main food groups (D44).
 * If the household's rules leave too few dishes, the list is simply shorter.
 */
function select(scored: Suggestion[], count: number, adventurous: number): Suggestion[] {
  const anyKnown = scored.some((s) => !s.novel);
  const maxNovel = !anyKnown ? count : adventurous <= 0 ? 0 : Math.max(1, Math.round((count * adventurous) / 100));
  const out: Suggestion[] = [];
  const pool = [...scored];
  let novelUsed = 0;
  const allowed = (s: Suggestion) => !s.novel || novelUsed < maxNovel;
  while (out.length < count && pool.length) {
    let eligible = pool.filter(allowed);
    if (!eligible.length || eligible[0].score < pool[0].score - 10) {
      // Known dishes ran out, or the only ones left are poor fits (made yesterday,
      // "not again"). "Only known" stays strict; otherwise fill with new ideas.
      if (adventurous <= 0 && anyKnown) {
        if (!eligible.length) break;
      } else eligible = pool;
    }
    const top = eligible[0].score;
    const bases = new Set(out.map((s) => s.dish.base));
    const mains = new Set(out.map((s) => s.dish.groups[0]));
    const pick =
      (out.length && out.length < 3 ? eligible.find((s) => s.score >= top - 30 && !bases.has(s.dish.base)) : undefined) ??
      (out.length ? eligible.find((s) => s.score >= top - 15 && !mains.has(s.dish.groups[0])) : undefined) ??
      eligible[0];
    pool.splice(pool.indexOf(pick), 1);
    if (pick.novel) novelUsed++;
    out.push(pick);
  }
  return out;
}

/** Ranked suggestions for one set of eaters. */
export function recommend(ctx: RecContext): Suggestion[] {
  const eaters = ctx.eaters ?? eatersFor(ctx.family, ctx.slot, ctx.memberId);
  const stats = buildStats(ctx.family, ctx);
  const scored = candidates(ctx, eaters)
    .map((d) => scoreDish(d, ctx, eaters, stats))
    .sort((a, b) => b.score - a.score);
  return select(scored, ctx.count ?? 3, ctx.family.settings.adventurous);
}

/** Members whose rules shrink the menu a lot. */
function isStrict(m: Member, date: string, family: Family): boolean {
  return memberFasts(m, date, family) || m.jain || m.noOnionGarlic || m.diet === 'vegan';
}

/**
 * One base, many plates (FR-213). Fasting members always get a vrat plate.
 * Other strict members (Jain, satvik, vegan) share the family plate unless that
 * forces a much weaker menu; then they get their own plate.
 */
export function recommendPlates(ctx: RecContext): Plate[] {
  const { family, date } = ctx;
  const eaters = ctx.eaters ?? eatersFor(family, ctx.slot, ctx.memberId);
  const fasting = eaters.filter((m) => memberFasts(m, date, family));
  const rest = eaters.filter((m) => !fasting.includes(m));
  const plates: Plate[] = [];
  if (rest.length) {
    const shared = recommend({ ...ctx, eaters: rest });
    const strict = rest.filter((m) => isStrict(m, date, family));
    const relaxed = rest.filter((m) => !strict.includes(m));
    const sharedTop = shared[0]?.score ?? -Infinity;
    const relaxedList = strict.length && relaxed.length ? recommend({ ...ctx, eaters: relaxed }) : [];
    const favouriteLost = !!relaxedList[0] && !relaxedList[0].novel && !!shared[0]?.novel;
    if (relaxedList.length && (relaxedList[0].score > sharedTop + 8 || favouriteLost || shared.length < 2)) {
      plates.push({ memberIds: relaxed.map((m) => m.id), label: 'Main plate', suggestions: relaxedList });
      plates.push({
        memberIds: strict.map((m) => m.id),
        label: `For ${strict.map(firstName).join(', ')}${strict.every((m) => m.jain) ? ' (Jain)' : ''}`,
        suggestions: recommend({ ...ctx, eaters: strict }),
      });
    } else {
      plates.push({ memberIds: rest.map((m) => m.id), label: fasting.length ? 'Main plate' : 'For everyone', suggestions: shared });
    }
  }
  if (fasting.length) {
    plates.push({
      memberIds: fasting.map((m) => m.id),
      label: `Vrat plate for ${fasting.map(firstName).join(', ')}`,
      suggestions: recommend({ ...ctx, eaters: fasting }),
    });
  }
  if (!plates.length) plates.push({ memberIds: [], label: 'For everyone', suggestions: recommend(ctx) });
  return plates;
}

/** Two tiffins for one child (FR-265), kept distinct from each other and breakfast. */
export function recommendTiffins(
  family: Family,
  date: string,
  childId: string,
  slots: SlotId[],
  opts: { chips?: ChipId[]; available?: string[]; breakfastId?: string } = {},
): Partial<Record<SlotId, Suggestion[]>> {
  const out: Partial<Record<SlotId, Suggestion[]>> = {};
  const used: string[] = opts.breakfastId ? [opts.breakfastId] : [];
  for (const slot of slots) {
    const list = recommend({ family, date, slot, memberId: childId, chips: opts.chips, available: opts.available, exclude: used });
    out[slot] = list;
    if (list[0]) used.push(list[0].dish.id);
  }
  return out;
}

export function nextDays(start: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}
