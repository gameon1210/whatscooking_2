import { findPlanned } from '@/domain/actions';
import { SLOT_EMOJI, SLOT_LABEL, SLOT_ORDER } from '@/domain/dates';
import { recommendPlates, recommendTiffins } from '@/domain/recommender';
import { tiffinKids } from '@/domain/rules';
import type { ChipId, Family, SlotId, Suggestion } from '@/domain/types';

export interface DraftRow {
  key: string;
  slot: SlotId;
  memberId?: string;
  label: string;
  options: string[];
  suggestions: Suggestion[];
}

/** Build the rows for one day: family slots, vrat plates and each child's two tiffins. */
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
      const opts = existing && existing.status !== 'skipped' ? existing.options : plate.suggestions.slice(0, 3).map((s) => s.dish.id);
      if (slot === 'breakfast' && i === 0) breakfastTop = opts[0];
      if (opts[0]) used.push(opts[0]);
      rows.push({
        key: `${slot}:${memberId ?? ''}`,
        slot,
        memberId,
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
    const m = family.members.find((x) => x.id === p.memberId);
    rows.push({ key: `${p.slot}:${p.memberId}`, slot: p.slot, memberId: p.memberId, label: `${SLOT_EMOJI[p.slot]} ${SLOT_LABEL[p.slot]} · For ${m?.name ?? 'one member'}`, options: p.options, suggestions: [] });
  }
  for (const kid of tiffinKids(family, date)) {
    const t = recommendTiffins(family, date, kid.member.id, kid.slots, { chips, breakfastId: breakfastTop });
    for (const slot of kid.slots) {
      const existing = findPlanned(family, date, slot, kid.member.id);
      const sug = t[slot] ?? [];
      rows.push({
        key: `${slot}:${kid.member.id}`,
        slot,
        memberId: kid.member.id,
        label: `${SLOT_EMOJI[slot]} ${kid.member.name.split(' ')[0]}’s ${SLOT_LABEL[slot].toLowerCase()}`,
        options: existing && existing.status !== 'skipped' ? existing.options : sug.slice(0, 3).map((s) => s.dish.id),
        suggestions: sug,
      });
    }
  }
  return rows.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
}

