import { checkPlan, findPlanned, rankedOptions } from '@/domain/actions';
import { SLOT_EMOJI, SLOT_LABEL, SLOT_ORDER } from '@/domain/dates';
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
export function draftDay(family: Family, date: string, chips: ChipId[] = []): DraftRow[] {
  const rows: DraftRow[] = [];
  const slots = [...family.settings.planSlots].sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
  let breakfastTop: string | undefined;
  const used: string[] = [];
  for (const slot of slots) {
    const plates = recommendPlates({ family, date, slot, chips, count: 6, exclude: used });
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
