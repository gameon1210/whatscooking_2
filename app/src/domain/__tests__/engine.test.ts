/// <reference types="jest" />
import { CATALOG, CATALOG_BY_ID } from '../catalog';
import { buildPayload, cookCardText, cookPageUrl, parseCookReply, quantities } from '../cookcard';
import { addDays } from '../dates';
import { newFamily, newMember } from '../family';
import { parseLog, parseLogs } from '../parse';
import { parsePreference } from '../prefs';
import { recommend, recommendPlates, recommendTiffins } from '../recommender';
import { checkMember, tiffinKids } from '../rules';
import type { Family, MealEntry, SlotId } from '../types';

// 2026-10-06 is a Tuesday and an Ekadashi.
const TUE_EKADASHI = '2026-10-06';
const WED = '2026-10-07';
const FRI = '2026-10-09';

function family(): Family {
  const f = newFamily('Sharma', 'north');
  const priya = newMember('Priya', { roles: ['planner', 'eater'], diet: 'nonveg' });
  const aarav = newMember('Aarav', {
    ageBand: 'child',
    school: { shortBreak: true, lunchBox: true, schoolDays: [1, 2, 3, 4, 5], pickup: '15:30', holidays: [] },
  });
  const dadi = newMember('Dadi', { ageBand: 'senior', jain: true, noOnionGarlic: true, dayRules: [{ id: 'r1', kind: 'ekadashi_fast' }] });
  const lakshmi = newMember('Lakshmi', { roles: ['cook'], eatsAtHome: false, language: 'kn', cookDays: [1, 2, 3, 4, 5, 6], cookSlots: ['breakfast', 'lunch', 'tiffin_short', 'tiffin_lunch'] });
  f.members = [priya, aarav, dadi, lakshmi];
  return f;
}

let n = 0;
function log(f: Family, date: string, slot: SlotId, dishId: string, extra: Partial<MealEntry> = {}) {
  f.entries.push({ id: 'e' + n++, date, slot, dishIds: [dishId], via: 'manual', reactions: [], confirmed: true, createdAt: date, ...extra });
}

describe('rules', () => {
  test('Jain senior cannot eat onion-garlic dishes', () => {
    const f = family();
    const dadi = f.members[2];
    expect(checkMember(CATALOG_BY_ID.rajma_chawal, dadi, WED, f).ok).toBe(false);
    expect(checkMember(CATALOG_BY_ID.jain_dal_roti, dadi, WED, f).ok).toBe(true);
  });

  test('Ekadashi fast allows only vrat dishes', () => {
    const f = family();
    const dadi = f.members[2];
    expect(checkMember(CATALOG_BY_ID.jain_dal_roti, dadi, TUE_EKADASHI, f).ok).toBe(false);
    expect(checkMember(CATALOG_BY_ID.samak_rice, dadi, TUE_EKADASHI, f).ok).toBe(true);
  });

  test('weekday no-non-veg rule', () => {
    const f = family();
    const priya = f.members[0];
    priya.dayRules = [{ id: 'x', kind: 'weekday_no_nonveg', weekdays: [2] }];
    expect(checkMember(CATALOG_BY_ID.chicken_curry_rice, priya, TUE_EKADASHI, f).ok).toBe(false);
    expect(checkMember(CATALOG_BY_ID.chicken_curry_rice, priya, WED, f).ok).toBe(true);
  });

  test('allergy exclusion by ingredient', () => {
    const f = family();
    const aarav = f.members[1];
    aarav.allergies = ['peanut'];
    expect(checkMember(CATALOG_BY_ID.poha, aarav, WED, f).ok).toBe(false);
  });

  test('tiffin kids on school days only', () => {
    const f = family();
    expect(tiffinKids(f, WED)).toHaveLength(1);
    expect(tiffinKids(f, '2026-10-11')).toHaveLength(0); // Sunday
  });
});

describe('recommender', () => {
  test('never suggests a dish that breaks a hard rule', () => {
    const f = family();
    for (const slot of ['breakfast', 'lunch', 'dinner'] as SlotId[]) {
      const plates = recommendPlates({ family: f, date: TUE_EKADASHI, slot });
      const vrat = plates.find((p) => p.label.startsWith('Vrat'));
      expect(vrat).toBeDefined();
      vrat!.suggestions.forEach((s) => expect(s.dish.vratOk).toBe(true));
      const main = plates.find((p) => !p.label.startsWith('Vrat'))!;
      main.suggestions.forEach((s) => expect(s.dish.diet === 'nonveg' || s.dish.diet === 'egg').toBe(false));
    }
  });

  test('Jain member gets a Jain-safe plate; shared suggestions always fit everyone', () => {
    const f = family();
    const plates = recommendPlates({ family: f, date: WED, slot: 'dinner' });
    const dadi = f.members[2];
    for (const p of plates) {
      const eaters = f.members.filter((m) => p.memberIds.includes(m.id));
      p.suggestions.forEach((x) => eaters.forEach((m) => expect(checkMember(x.dish, m, WED, f).ok).toBe(true)));
    }
    expect(plates.some((p) => p.memberIds.includes(dadi.id))).toBe(true);
    const shared = recommend({ family: f, date: WED, slot: 'dinner' });
    shared.forEach((x) => expect(x.dish.jainOk).toBe(true));
  });

  test('recently cooked dishes drop; long-unmade favourites rise', () => {
    const f = family();
    f.members = [f.members[0], f.members[1]]; // no Jain constraint
    log(f, addDays(WED, -1), 'dinner', 'rajma_chawal');
    log(f, addDays(WED, -12), 'dinner', 'dal_makhani');
    log(f, addDays(WED, -20), 'dinner', 'dal_makhani');
    const top = recommend({ family: f, date: WED, slot: 'dinner', count: 5 }).map((x) => x.dish.id);
    expect(top).toContain('dal_makhani');
    expect(top).not.toContain('rajma_chawal');
  });

  test('habit pattern: Friday chole shows up on Friday with a reason', () => {
    const f = family();
    f.members = [f.members[0], f.members[1]];
    for (let w = 1; w <= 4; w++) log(f, addDays(FRI, -7 * w), 'dinner', 'chole_rice');
    const top = recommend({ family: f, date: FRI, slot: 'dinner' })[0];
    expect(top.dish.id).toBe('chole_rice');
    expect(top.reason).toMatch(/Fridays/);
  });

  test('leftover chain boosts the transformation', () => {
    const f = family();
    f.members = [f.members[0], f.members[1]];
    f.leftovers.push({ id: 'l1', dishId: 'dal_tadka_roti', amount: 'half', date: WED, slot: 'dinner', resolved: false });
    const s = recommend({ family: f, date: addDays(WED, 1), slot: 'breakfast', chips: ['leftovers'] });
    expect(s[0].dish.id).toBe('dal_paratha');
    expect(s[0].reason).toMatch(/leftover/i);
  });

  test('past leftover decisions are learned', () => {
    const f = family();
    f.members = [f.members[0], f.members[1]];
    f.leftovers.push({ id: 'l1', dishId: 'dal_chawal', amount: 'half', date: WED, slot: 'dinner', resolved: false });
    for (let i = 0; i < 4; i++) f.leftoverDecisions.push({ id: 'd' + i, fromDishId: 'dal_chawal', becameDishId: 'lemon_rice', date: '2026-09-0' + (i + 1) });
    const s = recommend({ family: f, date: addDays(WED, 1), slot: 'tiffin_lunch', memberId: f.members[1].id, count: 5 });
    const lemon = s.find((x) => x.dish.id === 'lemon_rice');
    expect(lemon?.drivers.some((d) => d.key === 'D')).toBe(true);
  });

  test('available vegetables boost dishes that use them', () => {
    const f = family();
    f.members = [f.members[0], f.members[1]];
    const s = recommend({ family: f, date: WED, slot: 'lunch', available: ['okra'] });
    expect(s[0].dish.veg).toContain('okra');
  });

  test('two tiffins are distinct and portable', () => {
    const f = family();
    const kid = f.members[1];
    const t = recommendTiffins(f, WED, kid.id, ['tiffin_short', 'tiffin_lunch']);
    const a = t.tiffin_short![0].dish;
    const b = t.tiffin_lunch![0].dish;
    expect(a.id).not.toBe(b.id);
    expect(a.portable && b.portable).toBe(true);
  });

  test('full tiffin returns push a dish down for that child', () => {
    const f = family();
    const kid = f.members[1];
    const before = recommend({ family: f, date: WED, slot: 'tiffin_lunch', memberId: kid.id, count: 50 });
    const target = before[0].dish.id;
    log(f, addDays(WED, -5), 'tiffin_lunch', target, { memberId: kid.id, reactions: [{ memberId: kid.id, kind: 'tiffin_full' }] });
    log(f, addDays(WED, -9), 'tiffin_lunch', target, { memberId: kid.id, reactions: [{ memberId: kid.id, kind: 'tiffin_full' }] });
    const after = recommend({ family: f, date: WED, slot: 'tiffin_lunch', memberId: kid.id, count: 50 });
    expect(after[0].dish.id).not.toBe(target);
  });

  test('free-text preference "less spicy for kids" lowers spicy dishes', () => {
    const f = family();
    f.members = [f.members[0], f.members[1]];
    const p = parsePreference('less spicy please, prefer healthier options');
    expect(p.weights.spice).toBeLessThan(0);
    expect(p.weights.healthy).toBeGreaterThan(0);
    f.preferences.push({ id: 'p', text: 'less spicy', weights: p.weights, source: 'rules' });
    const s = recommend({ family: f, date: WED, slot: 'dinner', count: 3 });
    s.forEach((x) => expect(x.dish.spice).toBeLessThanOrEqual(2));
  });

  test('hidden dishes never appear', () => {
    const f = family();
    f.members = [f.members[0]];
    const first = recommend({ family: f, date: WED, slot: 'dinner' })[0].dish.id;
    f.hidden.push({ dishId: first });
    expect(recommend({ family: f, date: WED, slot: 'dinner', count: 60 }).map((s) => s.dish.id)).not.toContain(first);
  });

  test('every suggestion carries a reason', () => {
    const f = family();
    recommend({ family: f, date: WED, slot: 'lunch' }).forEach((s) => expect(s.reason.length).toBeGreaterThan(3));
  });
});

describe('parser', () => {
  const today = WED;
  test('Hinglish dinner', () => {
    const r = parseLog('aaj dinner mein rajma chawal aur raita', CATALOG, today);
    expect(r.slot).toBe('dinner');
    expect(r.date).toBe(today);
    expect(r.dishIds).toContain('rajma_chawal');
  });
  test('two clauses, yesterday and today', () => {
    const r = parseLogs('kal raat khichdi aur papad, aaj subah idli', CATALOG, today);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ date: addDays(today, -1), slot: 'dinner' });
    expect(r[0].dishIds).toContain('khichdi');
    expect(r[1]).toMatchObject({ date: today, slot: 'breakfast' });
    expect(r[1].dishIds).toContain('idli_sambar');
  });
  test('English with aliases', () => {
    const r = parseLog('we had masala dosa for breakfast', CATALOG, today);
    expect(r.dishIds).toEqual(['masala_dosa']);
    expect(r.slot).toBe('breakfast');
  });
});

describe('cook card', () => {
  test('quantities scale with headcount', () => {
    expect(quantities(CATALOG_BY_ID.dal_chawal, 4)).toBe('dal 1 cup, rice 2 cups');
  });

  test('card text in Kannada with link, and reply parsing', () => {
    const f = family();
    f.settings.plannerPhone = '9876543210';
    const cook = f.members[3];
    const meals = [
      { id: 'p1', date: WED, slot: 'lunch' as SlotId, options: ['rajma_chawal', 'chole_rice', 'dal_chawal'], pinned: false, status: 'planned' as const, source: 'tomorrow' as const },
    ];
    const payload = buildPayload(f, cook, WED, meals);
    const url = cookPageUrl('https://x.test/cook.html', payload);
    const text = cookCardText(f, cook, payload, url);
    expect(text).toContain('ನಮಸ್ಕಾರ');
    expect(text).toContain('Rajma chawal');
    expect(url).toMatch(/#d=[A-Za-z0-9_-]+$/);
    const r = parseCookReply(`WC:${payload.id} #p1=2 #p2=M:tomato,paneer #p3=C`);
    expect(r.id).toBe(payload.id);
    expect(r.picks.p1).toBe(1);
    expect(r.missing.p2).toEqual(['tomato', 'paneer']);
    expect(r.change).toEqual(['p3']);
    const r2 = parseCookReply('OK\nLunch: Chole\n\nWC:abc #p1=M:tomato%2Ccurry%20leaves #p2=3');
    expect(r2.missing.p1).toEqual(['tomato', 'curry leaves']);
    expect(r2.picks.p2).toBe(2);
  });
});

describe('catalogue integrity', () => {
  test('ids unique and leftover links valid', () => {
    const ids = CATALOG.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of CATALOG) for (const t of d.leftoverTo ?? []) expect(CATALOG_BY_ID[t]).toBeDefined();
  });
  test('every slot has vrat and Jain options', () => {
    for (const slot of ['breakfast', 'lunch', 'dinner'] as SlotId[]) {
      expect(CATALOG.some((d) => d.slots.includes(slot) && d.vratOk)).toBe(true);
      expect(CATALOG.some((d) => d.slots.includes(slot) && d.jainOk)).toBe(true);
    }
  });
});
