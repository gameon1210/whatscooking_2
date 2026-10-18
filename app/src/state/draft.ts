import { checkPlan, entryPeople, findPlanned, rankedOptions, tryUpsertPlan } from '@/domain/actions';
import { addDays, todayKey, SLOT_EMOJI, SLOT_LABEL, SLOT_ORDER } from '@/domain/dates';
import { recommendPlates, recommendTiffins } from '@/domain/recommender';
import { tiffinKids } from '@/domain/rules';
import type { ChipId, Family, SlotId, Suggestion } from '@/domain/types';

export interface DraftRow {
  key: string;
  slot: SlotId;
  /** plate key: the child for tiffins, the first member of a split plate, else undefined */
  memberId?: string;
  /** everyone this plate is for (FR-213); empty for the family plate */
  memberIds: string[];
  label: string;
  options: string[];
  suggestions: Suggestion[];
}

/** Build the rows for one day: family slots, split plates and each child's two tiffins. */
export function draftDay(family: Family, date: string, chips: ChipId[] = [], avoid: string[] = []): DraftRow[] {
  const rows: DraftRow[] = [];
  const slots = [...family.settings.planSlots].sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
  let breakfastTop: string | undefined;
  const used: string[] = [];
  for (const slot of slots) {
    let plates = recommendPlates({ family, date, slot, chips, count: 6, exclude: [...used, ...avoid] });
    if (plates.some((p) => !p.suggestions.length)) plates = recommendPlates({ family, date, slot, chips, count: 6, exclude: used });
    plates.forEach((plate, i) => {
      const memberId = i > 0 ? plate.memberIds[0] : undefined;
      const existing = findPlanned(family, date, slot, memberId);
      // A saved plan shows the dish that was actually picked first (D06).
      const opts = existing && existing.status !== 'skipped' ? rankedOptions(existing) : plate.suggestions.slice(0, 3).map((s) => s.dish.id);
      if (slot === 'breakfast' && i === 0) breakfastTop = opts[0];
      if (opts[0]) used.push(opts[0]);
      rows.push({
        key: `${slot}:${memberId ?? ''}`,
        slot,
        memberId,
        // The family plate lists its members only when the meal is split.
        memberIds: existing?.forMemberIds?.length ? existing.forMemberIds : plates.length > 1 ? plate.memberIds : [],
        label: `${SLOT_EMOJI[slot]} ${SLOT_LABEL[slot]}${plates.length > 1 ? ` · ${plate.label}` : ''}`,
        options: opts,
        suggestions: plate.suggestions,
      });
    });
  }
  // Keep separately planned plates visible even if today's split decision differs.
  for (const p of family.planned) {
    if (p.date !== date || !p.memberId || p.slot.startsWith('tiffin') || p.status === 'skipped') continue;
    if (rows.some((r) => r.slot === p.slot && r.memberId === p.memberId)) continue;
    const ids = p.forMemberIds?.length ? p.forMemberIds : [p.memberId];
    const names = family.members.filter((x) => ids.includes(x.id)).map((x) => x.name.split(' ')[0]);
    rows.push({ key: `${p.slot}:${p.memberId}`, slot: p.slot, memberId: p.memberId, memberIds: ids, label: `${SLOT_EMOJI[p.slot]} ${SLOT_LABEL[p.slot]} · For ${names.join(', ') || 'one member'}`, options: rankedOptions(p), suggestions: [] });
  }
  for (const kid of tiffinKids(family, date)) {
    const t = recommendTiffins(family, date, kid.member.id, kid.slots, { chips, breakfastId: breakfastTop });
    const taken = new Set<string>(breakfastTop ? [breakfastTop] : []);
    for (const slot of kid.slots) {
      const existing = findPlanned(family, date, slot, kid.member.id);
      const sug = (t[slot] ?? []).filter((s) => !taken.has(s.dish.id));
      // Saved choices must still differ from breakfast and the other box, and still
      // fit the child's rules (D10). Anything that doesn't is dropped here.
      let options = existing && existing.status !== 'skipped' ? rankedOptions(existing).filter((id) => !taken.has(id)) : [];
      if (options.length) options = checkPlan(family, date, slot, options, { memberId: kid.member.id }).ok.filter((id) => !taken.has(id));
      if (!options.length) options = sug.slice(0, 3).map((s) => s.dish.id);
      if (options[0]) taken.add(options[0]);
      rows.push({
        key: `${slot}:${kid.member.id}`,
        slot,
        memberId: kid.member.id,
        memberIds: [kid.member.id],
        label: `${SLOT_EMOJI[slot]} ${kid.member.name.split(' ')[0]}’s ${SLOT_LABEL[slot].toLowerCase()}`,
        options,
        suggestions: sug,
      });
    }
  }
  return rows.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
}

export interface WeekCell extends DraftRow {
  date: string;
  planned: boolean;
  done: boolean;
  status: 'Suggested' | 'Planned' | 'Logged' | 'Needs confirmation';
  entryId?: string;
}

/** Past days are records, never freshly generated guesses. Future days plan in sequence. */
export function draftWeek(family: Family, start: string, today = todayKey()): { date: string; cells: WeekCell[] }[] {
  const virtual: Family = JSON.parse(JSON.stringify(family));
  const used: string[] = [];
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const entries = family.entries.filter((e) => e.date === date);
    const saved = family.planned.filter((p) => p.date === date && p.status !== 'skipped');
    const rows: DraftRow[] = date < today ? saved.map((p) => ({
      key: p.id, slot: p.slot, memberId: p.memberId, memberIds: p.forMemberIds ?? [],
      label: `${SLOT_EMOJI[p.slot]} ${SLOT_LABEL[p.slot]}`, options: rankedOptions(p), suggestions: [],
    })) : draftDay(virtual, date, [], family.settings.weekVariety === false ? [] : used);
    const cells: WeekCell[] = rows.filter((r) => !entries.some((e) => {
      const p = findPlanned(family, date, r.slot, r.memberId);
      return (p && e.plannedId === p.id) || (e.slot === r.slot && entryPeople(family, e).slice().sort().join('|') === entryPeople(family, { memberId: r.memberId, forMemberIds: r.memberIds }).slice().sort().join('|'));
    })).map((r) => {
      const p = findPlanned(family, date, r.slot, r.memberId);
      const planned = !!p && p.status !== 'skipped';
      return { ...r, date, planned, done: date < today || p?.status === 'cooked' || p?.status === 'ordered_in', status: planned ? 'Planned' : 'Suggested' };
    });
    for (const e of entries) {
      const names = family.members.filter((m) => entryPeople(family, e).includes(m.id)).map((m) => m.name.split(' ')[0]);
      cells.push({ key: `entry:${e.id}`, date, slot: e.slot, memberId: e.memberId, memberIds: entryPeople(family, e), label: `${SLOT_EMOJI[e.slot]} ${SLOT_LABEL[e.slot]} · ${names.join(', ')}`, options: e.dishIds, suggestions: [], planned: false, done: true, status: e.confirmed ? 'Logged' : 'Needs confirmation', entryId: e.id });
    }
    if (date >= today) for (const r of cells) {
      if (!r.done && r.options[0]) {
        used.push(r.options[0]);
        if (!r.planned && family.settings.weekVariety !== false) tryUpsertPlan(virtual, date, r.slot, r.options, { memberId: r.memberId, forMemberIds: r.memberIds.length ? r.memberIds : undefined, source: 'calendar' });
      }
    }
    return { date, cells: cells.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)) };
  });
}
