/// <reference types="jest" />
// Regression tests for the QA audit of 3 Oct 2026 (D01–D44). Based on the auditor's
// suite; three fixtures were corrected, each marked FIXTURE below.
import { CATALOG, CATALOG_BY_ID as D, makeCustomDish } from '@/domain/catalog';
import { newFamily, newMember } from '@/domain/family';
import { recommend, recommendTiffins } from '@/domain/recommender';
import { checkMember, cookOnDuty, plateEaters, slotFits, tiffinKids } from '@/domain/rules';
import { dishAllergens } from '@/domain/allergens';
import { migrateFamily } from '@/state/migrate';
import { addCart, addLeftover, applyCookReply, autoLog, cartSuggestions, changeRequests, checkPlan, favourites, logMeal, markCardSent, missingForPlans, PlanRuleError, recheckPlans, recordEvent, registerCookCard, toggleReaction, tryUpsertPlan, upsertPlan } from '@/domain/actions';
import { buildCard, buildPayload, cardSig, cookPageUrl, parseCookReply, quantities } from '@/domain/cookcard';
import { parseLogs } from '@/domain/parse';
import { parsePreference } from '@/domain/prefs';
import { memberFasts } from '@/domain/calendar';
import { currentSlot, parseHHMM } from '@/domain/dates';
import { draftDay } from '@/state/draft';
import type { Family, Member, PlannedMeal, SlotId } from '@/domain/types';

const DATE = '2026-10-07'; // Wednesday; fixed fixture, independent of machine time.
function family(): Family {
  const f = newFamily('QA household', 'general');
  f.members = [newMember('Planner', { id: 'adult', roles: ['planner', 'eater'], diet: 'nonveg', spice: 3 })];
  return f;
}
function kid(id = 'kid') {
  return newMember(id, { id, ageBand: 'child', school: { shortBreak: true, lunchBox: true, schoolDays: [1,2,3,4,5], pickup: '15:50', holidays: [] } });
}
const NOW = new Date(2026, 9, 7, 8, 0, 0);
function cookOf(f: Family): Member {
  let c = f.members.find(m => m.roles.includes('cook'));
  if (!c) { c = newMember('Cook', { id: 'cook', roles: ['cook'], eatsAtHome: false }); f.members.push(c); }
  return c;
}
/** Issue and register a Cook Card the way the Cook Card screen does. */
function sendCard(f: Family, plans: PlannedMeal[]) {
  const card = buildCard(f, cookOf(f), DATE, plans, NOW);
  registerCookCard(f, card.record);
  return card.record;
}
function score(f: Family, dishId: string, slot: SlotId = 'dinner', memberId?: string) {
  return recommend({ family: f, date: DATE, slot, memberId, count: 200 }).find(s => s.dish.id === dishId)!;
}

describe('Dietary safety', () => {
  test('D01 milk allergy blocks paneer and curd', () => {
    const f = family(); f.members[0].allergies = ['milk'];
    expect(['paneer_roll', 'curd_rice', 'oats_porridge'].filter(id => checkMember(D[id], f.members[0], DATE, f).ok)).toEqual([]);
  });
  test('D01 wheat allergy blocks atta-based paratha', () => {
    const f = family(); f.members[0].allergies = ['wheat'];
    expect(checkMember(D.aloo_paratha, f.members[0], DATE, f).ok).toBe(false);
  });
  test('Control plural nuts allergy blocks peanuts', () => {
    const f = family(); f.members[0].allergies = ['nuts'];
    expect(checkMember(D.poha, f.members[0], DATE, f).ok).toBe(false);
  });
  test('D02 hard spice tolerance rejects a hotter dish', () => {
    const f = family(); f.members[0].spice = 0;
    expect(checkMember(D.chole_rice, f.members[0], DATE, f).ok).toBe(false);
  });
  test('D03 custom chicken dish is not classified vegetarian', () => {
    expect(makeCustomDish('Chicken soup', ['dinner']).diet).not.toBe('veg');
  });
  test('D04 vegan catalogue has useful breakfast, lunch, dinner candidates', () => {
    const f = family(); f.members[0].diet = 'vegan';
    for (const slot of ['breakfast', 'lunch', 'dinner'] as SlotId[]) expect(recommend({ family: f, date: DATE, slot }).length).toBeGreaterThan(0);
  });
  test('D05 planning refuses a vegetarian member chicken', () => {
    const f = family(); f.members[0].diet = 'veg';
    try { upsertPlan(f, DATE, 'dinner', ['chicken_curry_rice']); } catch {}
    expect(f.planned.some(p => p.options.includes('chicken_curry_rice'))).toBe(false);
  });
  test('Control exact peanut allergy is blocked', () => {
    const f = family(); f.members[0].allergies = ['peanut'];
    expect(checkMember(D.poha, f.members[0], DATE, f).ok).toBe(false);
  });
  test('Control veg and Jain hard rules block chicken/onion', () => {
    const f = family(); f.members[0].diet = 'veg'; f.members[0].jain = true;
    expect(checkMember(D.chicken_curry_rice, f.members[0], DATE, f).ok).toBe(false);
    expect(checkMember(D.rajma_chawal, f.members[0], DATE, f).ok).toBe(false);
    expect(checkMember(D.jain_dal_roti, f.members[0], DATE, f).ok).toBe(true);
  });
});

describe('Planning and meal integrity', () => {
  test('D06 picked alternate is displayed in tomorrow/week draft', () => {
    const f = family(); const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal','chole_rice','dal_chawal']); p.chosenDishId = 'chole_rice';
    expect(draftDay(f, DATE).find(r => r.slot === 'lunch')!.options[0]).toBe('chole_rice');
  });
  test('D07 editing cooked plan does not contradict its history', () => {
    const f = family(); const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal']);
    logMeal(f, {date: DATE, slot:'lunch', dishIds:['rajma_chawal'], via:'manual'});
    try { upsertPlan(f, DATE, 'lunch', ['chole_rice']); } catch {}
    expect(p.status === 'cooked' && p.options[0] !== f.entries[0].dishIds[0]).toBe(false);
  });
  test('D08 manual correction supersedes earlier cook pick', () => {
    const f = family(); const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal','chole_rice']); p.chosenDishId = 'rajma_chawal';
    logMeal(f, {date:DATE, slot:'lunch', dishIds:['chole_rice'], via:'manual'});
    expect(p.chosenDishId).toBe('chole_rice');
  });
  test('D09 fasting group retains every member and accurate main-plate quantities', () => {
    const f = family(); f.members.push(newMember('Fast1', {id:'fast1',dayRules:[{id:'w',kind:'weekday_fast',weekdays:[3]}]}),newMember('Fast2', {id:'fast2',dayRules:[{id:'w',kind:'weekday_fast',weekdays:[3]}]}));
    const rows = draftDay(f, DATE); const main = rows.find(r => r.slot === 'lunch' && !r.memberId)!;
    const p = upsertPlan(f, DATE, 'lunch', main.options);
    const payload = buildPayload(f, newMember('Cook', {roles:['cook']}), DATE, [p]);
    expect(payload.items[0].q).toBe(quantities(D[main.options[0]], 1));
  });
  test('D10 tiffin chosen alternate does not repeat breakfast', () => {
    const f = family(); f.members.push(kid());
    upsertPlan(f, DATE, 'breakfast', ['poha']);
    upsertPlan(f, DATE, 'tiffin_short', ['fruit_chaat','poha'], {memberId:'kid'});
    const rows = draftDay(f, DATE); const breakfast = rows.find(r=>r.slot==='breakfast')!;
    expect(rows.find(r=>r.slot==='tiffin_short')!.options).not.toContain(breakfast.options[0]);
  });
  test('D11 future meal cannot resolve a leftover backwards within the same day', () => {
    const f = family(); addLeftover(f, 'dal_tadka_roti', 'half', DATE, 'dinner');
    logMeal(f, {date:DATE,slot:'breakfast',dishIds:['dal_paratha'],via:'manual'});
    expect(f.leftovers[0].resolved).toBe(false);
  });
  test('D12 order-in does not claim existing leftovers were reused', () => {
    const f = family(); addLeftover(f, 'dal_tadka_roti','half','2026-10-06','dinner');
    logMeal(f,{date:DATE,slot:'breakfast',dishIds:['dal_paratha'],via:'order',orderedIn:true});
    expect(f.leftovers[0].resolved).toBe(false);
  });
  test('D13 bought groceries can be suggested again for a later meal', () => {
    const f = family(); upsertPlan(f,DATE,'dinner',['paneer_roll']); addCart(f,['paneer'],'plan'); f.cart[0].done=true;
    // FIXTURE: the audit test re-implemented the buggy screen filter inline (it hid
    // anything ever bought), so it could not pass. The screen now calls cartSuggestions.
    expect(missingForPlans(f,DATE,DATE)).toContain('paneer');
    expect(cartSuggestions(f,DATE,DATE)).toContain('paneer');
    addCart(f,['paneer'],'plan');
    expect(cartSuggestions(f,DATE,DATE)).not.toContain('paneer'); // already open on the list
  });
  test('D14 empty ingredient metadata does not omit dal/atta from shopping', () => {
    const f = family(); f.staples=[]; upsertPlan(f,DATE,'dinner',['dal_tadka_roti']);
    expect(missingForPlans(f,DATE,DATE)).toEqual(expect.arrayContaining(['dal','atta']));
  });
  test('Control auto-log creates one pending meal and is idempotent', () => {
    const f = family(); upsertPlan(f,DATE,'lunch',['rajma_chawal']);
    expect(autoLog(f,new Date(2026,9,7,16))).toBe(1);
    expect(autoLog(f,new Date(2026,9,7,17))).toBe(0);
    expect(f.entries).toHaveLength(1); expect(f.entries[0].confirmed).toBe(false);
  });
  test('Control manual correction replaces auto-log', () => {
    const f = family(); upsertPlan(f,DATE,'lunch',['rajma_chawal']); autoLog(f,new Date(2026,9,7,16));
    logMeal(f,{date:DATE,slot:'lunch',dishIds:['chole_rice'],via:'manual'});
    expect(f.entries).toHaveLength(1); expect(f.entries[0].dishIds).toEqual(['chole_rice']);
  });
  test('Control school holiday suppresses child tiffins', () => {
    const f = family(); const k=kid(); k.school!.holidays=[DATE]; f.members.push(k);
    expect(tiffinKids(f,DATE)).toEqual([]);
  });
  test('Control tiffin primaries differ from each other and breakfast', () => {
    const f=family();f.members.push(kid()); const t=recommendTiffins(f,DATE,'kid',['tiffin_short','tiffin_lunch'],{breakfastId:'poha'});
    expect(t.tiffin_short![0].dish.id).not.toBe(t.tiffin_lunch![0].dish.id);
    expect([t.tiffin_short![0].dish.id,t.tiffin_lunch![0].dish.id]).not.toContain('poha');
  });
});

describe('Learning, language, cook replies', () => {
  test('D15 Only known dial excludes new dishes', () => {
    const f=family();f.settings.adventurous=0;f.favourites=['rajma_chawal'];
    expect(recommend({family:f,date:DATE,slot:'dinner'}).filter(s=>s.novel)).toEqual([]);
  });
  test('D16 paused learning does not adapt recency from new logs', () => {
    const f=family(); f.settings.learningPaused=true;
    const before=score(f,'rajma_chawal').score;
    logMeal(f,{date:'2026-10-06',slot:'dinner',dishIds:['rajma_chawal'],via:'manual'});
    expect(score(f,'rajma_chawal').score).toBe(before);
  });
  test('D17 tiffin return feedback remains specific to its box', () => {
    const f=family(); f.members.push(kid());
    const before=score(f,'poha','tiffin_short','kid');
    logMeal(f,{date:'2026-09-30',slot:'tiffin_lunch',memberId:'kid',dishIds:['poha'],via:'manual'});
    f.entries[0].reactions=[{memberId:'kid',kind:'tiffin_full'}];
    expect(score(f,'poha','tiffin_short','kid').drivers.find(d=>d.key==='T')).toBeUndefined();
    expect(before).toBeDefined();
  });
  test('D18 repeated neutral logs do not earn loved safe-choice badge', () => {
    const f=family();for(let i=0;i<8;i++)logMeal(f,{date:`2026-09-${10+i}`,slot:'lunch',dishIds:['rajma_chawal'],via:'manual'});
    expect(favourites(f).find(x=>x.dishId==='rajma_chawal')?.safe??false).toBe(false);
  });
  test('D19 no millets must not increase millet preference', () => {expect(parsePreference('No millets please').weights.millet??0).toBeLessThan(0);});
  test('D19 no sweets must not increase sweet preference', () => {expect(parsePreference('Avoid sweets').weights.sweet??0).toBeLessThan(0);});
  test('D20 Hindi script meal log preserves dishes/date/slot', () => {
    expect(parseLogs('कल रात खिचड़ी',CATALOG,DATE)[0]).toMatchObject({date:'2026-10-06',slot:'dinner',dishIds:['khichdi']});
  });
  test('D21 distinct Indic custom dishes have distinct ids', () => {
    expect(makeCustomDish('खिचड़ी',['dinner']).id).not.toBe(makeCustomDish('पापड़',['dinner']).id);
  });
  test('D22 cook Change tap produces an actionable plan transition', () => {
    // FIXTURE: the audit used a card id the app never issued, which D23 requires us
    // to reject. Here the reply is for a card that was really sent.
    const f=family();const p=upsertPlan(f,DATE,'lunch',['rajma_chawal','chole_rice']);const card=sendCard(f,[p]);const before=JSON.stringify(f);
    applyCookReply(f,{id:card.id,picks:{},missing:{},change:[p.id],stop:false},NOW);
    expect(JSON.stringify(f)).not.toBe(before);
    expect(p.changeRequested).toBe(true);
    expect(p.alternates).toHaveLength(2);
    expect(p.alternates).not.toContain('rajma_chawal');
    expect(changeRequests(f,DATE).map(x=>x.id)).toEqual([p.id]);
    expect(f.events.some(e=>e.outcome==='cook_changed'&&e.dishId==='rajma_chawal')).toBe(true);
  });
  test('D23 mismatched card id cannot alter a plan', () => {
    const f=family();const p=upsertPlan(f,DATE,'lunch',['rajma_chawal','chole_rice']);
    applyCookReply(f,{id:'wrong-card',picks:{[p.id]:1},missing:{},change:[],stop:false});
    expect(p.chosenDishId).toBeUndefined();
  });
  test('D23 unknown meal ids cannot add groceries', () => {
    const f=family();applyCookReply(f,{id:'wrong-card',picks:{},missing:{unknown:['paneer']},change:[],stop:false});
    expect(f.cart).toEqual([]);
  });
  test('D24 Cook page links contain authentication and expiry', () => {
    const f=family();const cook=newMember('Cook',{roles:['cook']});const p=upsertPlan(f,DATE,'lunch',['rajma_chawal']);
    const url=cookPageUrl('https://example.invalid/cook.html',buildPayload(f,cook,DATE,[p]));
    expect(url).toMatch(/(?:signature|sig|token|exp)=/);
  });
  test('D34 (1.0.2) Cook card carries no phone number: the cook picks the chat', () => {
    const f=family();
    const p=upsertPlan(f,DATE,'lunch',['rajma_chawal']);
    expect(buildPayload(f,newMember('Cook',{roles:['cook']}),DATE,[p]).ph).toBeUndefined();
  });
  test('D43 recorded swipe outcomes influence later recommendations', () => {
    const f=family();f.favourites=['rajma_chawal'];const before=score(f,'rajma_chawal').score;
    for(let i=0;i<20;i++)recordEvent(f,'2026-10-06','dinner','rajma_chawal','swiped');
    expect(score(f,'rajma_chawal').score).toBeLessThan(before);
  });
  test('D44 top three diversify rice, roti and other when all are available', () => {
    const f=family();
    expect(new Set(recommend({family:f,date:DATE,slot:'lunch'}).map(s=>s.dish.base)).size).toBe(3);
  });
  test('D25 edit fast date does not make a no-meat-only member fast', () => {
    const f=family();f.customFastDates=[DATE];f.members[0].dayRules=[{id:'r',kind:'weekday_no_nonveg',weekdays:[2]}];
    expect(memberFasts(f.members[0],DATE,f)).toBe(false);
  });
  test('Control cook reply carries ranked pick and missing items', () => {
    // FIXTURE: as D22 — the reply must belong to a card the app issued.
    const f=family();const p=upsertPlan(f,DATE,'lunch',['rajma_chawal','chole_rice']);const card=sendCard(f,[p]);
    applyCookReply(f,parseCookReply(`WC:${card.id}.${card.sig} #${p.id}=2 #${p.id}=M:tomato%2Cpaneer`),NOW);
    expect(p.chosenDishId).toBe('chole_rice');expect(f.cart.map(x=>x.name)).toEqual(['tomato','paneer']);
    expect(p.status).toBe('sent');expect(p.cookAckAt).toBeDefined();
  });
  test('Control one reaction per member per group', () => {
    const f=family();const e=logMeal(f,{date:DATE,slot:'lunch',dishIds:['rajma_chawal'],via:'manual'});
    toggleReaction(f,e.id,'adult','loved');toggleReaction(f,e.id,'adult','not_again');
    expect(e.reactions).toEqual([{memberId:'adult',kind:'not_again'}]);
  });
  test('Control Hinglish multiple days parse independently', () => {
    const rows=parseLogs('kal raat khichdi aur papad, aaj subah idli',CATALOG,DATE);
    expect(rows).toHaveLength(2);expect(rows[0].date).toBe('2026-10-06');expect(rows[1].dishIds).toContain('idli_sambar');
  });
  test('Control current slot switches to next day after dinner', () => {
    expect(currentSlot(new Date(2026,9,7,23),['breakfast','lunch','dinner'])).toEqual({date:'2026-10-08',slot:'breakfast'});
  });
  test('D26 malformed reminder times are rejected', () => {
    for(const time of ['25:90','abc','-1:30']){
      let accepted=true;try {const r=parseHHMM(time);accepted=r.hour>=0&&r.hour<24&&r.minute>=0&&r.minute<60;}catch{accepted=false;}
      expect(accepted).toBe(false);
    }
  });
  test('D27 short-break candidates satisfy dry/finger-food box fit', () => {
    expect(slotFits(D.idli_sambar,'tiffin_short')).toBe(false);
  });
});

describe('More regression cover for the audit findings', () => {
  test('D01 catalogue: every vegan dish is free of milk, egg and fish', () => {
    const bad = CATALOG.filter(d => d.diet === 'vegan' && dishAllergens(d).some(a => ['milk','egg','fish'].includes(a))).map(d => d.id);
    expect(bad).toEqual([]);
  });
  test('D01 wheat-free rotis stay available; coconut milk is not milk', () => {
    const f = family(); f.members[0].allergies = ['wheat'];
    expect(checkMember(D.akki_roti, f.members[0], DATE, f).ok).toBe(true);
    expect(checkMember(D.bajra_roti, f.members[0], DATE, f).ok).toBe(true);
    expect(checkMember(D.rava_upma, f.members[0], DATE, f).ok).toBe(false);
    f.members[0].allergies = ['milk'];
    expect(checkMember(D.appam_stew, f.members[0], DATE, f).ok).toBe(true);
    expect(checkMember(D.kadhi_chawal, f.members[0], DATE, f).ok).toBe(false);
    expect(checkMember(D.veg_pulao, f.members[0], DATE, f).ok).toBe(false); // served with raita
  });
  test('D01 an allergy never yields a milk dish in suggestions', () => {
    const f = family(); f.members[0].allergies = ['milk'];
    for (const slot of ['breakfast','lunch','dinner'] as SlotId[])
      for (const s of recommend({ family: f, date: DATE, slot, count: 200 })) expect(dishAllergens(s.dish)).not.toContain('milk');
  });
  test('D02 one step hotter is allowed only as the mild version', () => {
    const f = family(); f.members[0].spice = 1;
    expect(checkMember(D.chole_rice, f.members[0], DATE, f)).toMatchObject({ ok: true, mild: true });
    expect(checkMember(D.mutton_curry, f.members[0], DATE, f).ok).toBe(false);
  });
  test('D03 unconfirmed custom dish: never suggested, never planned for restricted eaters', () => {
    const f = family(); f.members[0].diet = 'veg';
    const dish = makeCustomDish('Nihari', ['dinner']);
    expect(dish.unverified).toBe(true);
    f.customDishes.push(dish);
    expect(recommend({ family: f, date: DATE, slot: 'dinner', count: 300 }).some(s => s.dish.id === dish.id)).toBe(false);
    expect(tryUpsertPlan(f, DATE, 'dinner', [dish.id]).error).toBeDefined();
    const ok = makeCustomDish('Lauki kofta', ['dinner'], { diet: 'veg', allergens: ['milk'], onionGarlic: true, spice: 1 });
    expect(ok.unverified).toBe(false);
    f.customDishes.push(ok);
    expect(tryUpsertPlan(f, DATE, 'dinner', [ok.id]).plan).toBeDefined();
    f.members[0].allergies = ['dairy'];
    expect(checkMember(ok, f.members[0], DATE, f).ok).toBe(false);
  });
  test('D03 dishes saved by the old build must be confirmed after the update', () => {
    const f = family();
    const old = makeCustomDish('Old dish', ['dinner'], { diet: 'veg', allergens: [], onionGarlic: true, spice: 1 });
    delete old.unverified; delete old.allergens;
    f.customDishes.push(old);
    migrateFamily(f);
    expect(f.customDishes[0].unverified).toBe(true);
  });
  test('D05 invalid options are dropped, valid ones kept; error is a PlanRuleError', () => {
    const f = family(); f.members[0].diet = 'veg';
    const p = upsertPlan(f, DATE, 'dinner', ['chicken_curry_rice', 'dal_chawal']);
    expect(p.options).toEqual(['dal_chawal']);
    expect(() => upsertPlan(f, '2026-10-08', 'dinner', ['chicken_curry_rice'])).toThrow(PlanRuleError);
    expect(checkPlan(f, DATE, 'dinner', ['chicken_curry_rice']).problems[0].reason).toMatch(/veg/);
  });
  test('D05 changing a member rule re-checks saved plans', () => {
    const f = family();
    upsertPlan(f, '2026-10-08', 'dinner', ['chicken_curry_rice', 'dal_chawal']);
    upsertPlan(f, '2026-10-09', 'dinner', ['butter_chicken']);
    f.members[0].diet = 'veg';
    const notes = recheckPlans(f, DATE);
    expect(notes).toHaveLength(2);
    expect(f.planned.map(p => p.options)).toEqual([['dal_chawal']]);
  });
  test('D05 fasting and tiffin box fit are enforced when planning by hand', () => {
    const f = family(); f.members[0].dayRules = [{ id: 'w', kind: 'weekday_fast', weekdays: [3] }];
    expect(tryUpsertPlan(f, DATE, 'lunch', ['rajma_chawal'], { memberId: 'adult', forMemberIds: ['adult'] }).error).toMatch(/fasting/);
    f.members.push(kid());
    expect(tryUpsertPlan(f, DATE, 'tiffin_short', ['idli_sambar'], { memberId: 'kid' }).error).toMatch(/short-break/);
  });
  test('D06 Cook Card built after a pick leads with the picked dish', () => {
    const f = family(); const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal','chole_rice','dal_chawal']); p.chosenDishId = 'chole_rice';
    expect(buildPayload(f, cookOf(f), DATE, [p]).items[0].o[0]).toBe('Chole with rice');
  });
  test('D09 split plate keeps every member through plan, card and log', () => {
    const f = family();
    f.members.push(newMember('Fast1', {id:'fast1',dayRules:[{id:'w',kind:'weekday_fast',weekdays:[3]}]}), newMember('Fast2', {id:'fast2',dayRules:[{id:'w',kind:'weekday_fast',weekdays:[3]}]}));
    const vrat = draftDay(f, DATE).find(r => r.slot === 'lunch' && r.memberId)!;
    expect(vrat.memberIds).toEqual(['fast1','fast2']);
    const p = upsertPlan(f, DATE, 'lunch', vrat.options, { memberId: vrat.memberId, forMemberIds: vrat.memberIds });
    expect(plateEaters(f, p).map(m => m.id)).toEqual(['fast1','fast2']);
    expect(buildPayload(f, cookOf(f), DATE, [p]).items[0].w).toBe('Fast1, Fast2');
    const e = logMeal(f, { date: DATE, slot: 'lunch', dishIds: [vrat.options[0]], via: 'manual', plannedId: p.id });
    expect(e.memberId).toBe('fast1'); expect(e.forMemberIds).toEqual(['fast1','fast2']); expect(p.status).toBe('cooked');
  });
  test('D09 child portions are smaller than adult portions', () => {
    const f = family(); f.members.push(newMember('Kid', { id: 'k', ageBand: 'child' }));
    const p = upsertPlan(f, DATE, 'lunch', ['dal_chawal']);
    expect(buildPayload(f, cookOf(f), DATE, [p]).items[0].q).toBe(quantities(D.dal_chawal, 1.6));
  });
  test('D23/D24 replies: wrong signature, expired card and STOP', () => {
    const f = family(); const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal','chole_rice']); const card = sendCard(f, [p]);
    applyCookReply(f, { id: card.id, sig: 'deadbeefdeadbeef', picks: { [p.id]: 1 }, missing: {}, change: [], stop: false }, NOW);
    expect(p.chosenDishId).toBeUndefined();
    applyCookReply(f, { id: card.id, picks: { [p.id]: 1 }, missing: {}, change: [], stop: false }, new Date(2026, 9, 9));
    expect(p.chosenDishId).toBeUndefined();
    applyCookReply(f, { id: card.id, picks: {}, missing: {}, change: [], stop: true }, NOW);
    expect(cookOf(f).optedOut).toBe(true);
    applyCookReply(f, { id: card.id, picks: { [p.id]: 1 }, missing: {}, change: [], stop: false }, NOW);
    expect(p.chosenDishId).toBeUndefined(); // a revoked card is dead
  });
  test('D24 link carries expiry and a signature bound to the family secret', () => {
    const f = family(); const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal']);
    const payload = buildPayload(f, cookOf(f), DATE, [p]);
    expect(payload.exp).toBeGreaterThan(new Date(2026, 9, 7).getTime());
    expect(cardSig(payload, 'a')).not.toBe(cardSig(payload, 'b'));
    expect(cookPageUrl('https://x.test/c.html', payload, f.secret)).toContain(`&exp=${payload.exp}&sig=${cardSig(payload, f.secret)}`);
  });
  test('D35 cook duty respects days, slots and leave; empty means never', () => {
    const f = family(); const c = cookOf(f);
    expect(cookOnDuty(f, DATE, 'lunch')).toBe(c); // nothing set: always
    c.cookDays = [2]; c.cookSlots = ['lunch'];
    expect(cookOnDuty(f, '2026-10-04', 'lunch')).toBeUndefined(); // Sunday
    expect(cookOnDuty(f, '2026-10-06', 'lunch')).toBe(c);
    expect(cookOnDuty(f, '2026-10-06', 'dinner')).toBeUndefined();
    c.leaveDates = ['2026-10-06'];
    expect(cookOnDuty(f, '2026-10-06', 'lunch')).toBeUndefined();
    c.leaveDates = []; c.cookSlots = [];
    expect(cookOnDuty(f, '2026-10-06', 'lunch')).toBeUndefined();
  });
  test('D36 opening WhatsApp does not mark meals sent; confirming does', () => {
    const f = family(); const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal']); const card = sendCard(f, [p]);
    expect(p.status).toBe('planned'); expect(p.cookOpenedAt).toBeDefined(); expect(p.cookSentAt).toBeUndefined();
    markCardSent(f, card.id, NOW);
    expect(p.status).toBe('sent'); expect(p.cookSentAt).toBeDefined();
  });
  test('D38 a plan logged from Today closes that plan and keeps its member', () => {
    const f = family(); f.members.push(kid('k1'), kid('k2'));
    const p1 = upsertPlan(f, DATE, 'tiffin_lunch', ['lemon_rice'], { memberId: 'k1' });
    const p2 = upsertPlan(f, DATE, 'tiffin_lunch', ['curd_rice'], { memberId: 'k2' });
    const e = logMeal(f, { date: DATE, slot: 'tiffin_lunch', dishIds: ['curd_rice'], via: 'manual', plannedId: p2.id });
    expect(e.memberId).toBe('k2'); expect(p2.status).toBe('cooked'); expect(p1.status).toBe('planned');
  });
  test('D41 quantities are provided for every ranked option', () => {
    const f = family(); const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal','curd_rice','dal_chawal']);
    const it = buildPayload(f, cookOf(f), DATE, [p]).items[0];
    expect(it.qs).toEqual([quantities(D.rajma_chawal,1), quantities(D.curd_rice,1), quantities(D.dal_chawal,1)]);
    expect(it.qs![1]).toContain('curd');
  });
  test('D42 Hindi card: dish names, ingredients and units in Devanagari', () => {
    const f = family(); const c = cookOf(f); c.language = 'hi';
    const p = upsertPlan(f, DATE, 'lunch', ['rajma_chawal','curd_rice']);
    const it = buildPayload(f, c, DATE, [p]).items[0];
    expect(it.o).toEqual(['राजमा चावल', 'दही चावल']);
    expect(it.q).toBe('राजमा (रात भर भिगोएँ) ¼ कप, चावल ½ कप');
    expect(/[A-Za-z]/.test(it.o.join('') + it.qs!.join(''))).toBe(false);
  });
  test('D20 Kannada, Tamil and Telugu dish names are recognised', () => {
    expect(parseLogs('ನಿನ್ನೆ ರಾತ್ರಿ ಇಡ್ಲಿ', CATALOG, DATE)[0]).toMatchObject({ date: '2026-10-06', slot: 'dinner', dishIds: ['idli_sambar'] });
    expect(parseLogs('இன்று காலை தோசை', CATALOG, DATE)[0]).toMatchObject({ date: DATE, slot: 'breakfast', dishIds: ['masala_dosa'] });
    expect(parseLogs('ఈరోజు మధ్యాహ్నం పెరుగన్నం', CATALOG, DATE)[0]).toMatchObject({ slot: 'lunch', dishIds: ['curd_rice'] });
  });
  test('D19 negation is scoped to its clause; plain mentions still work', () => {
    expect(parsePreference('More millets, less rice').weights).toMatchObject({ millet: 8, rice: -8 });
    expect(parsePreference('No maida on weekdays')).toMatchObject({ weights: { maida: -10 }, weekdays: [1,2,3,4,5] });
    expect(parsePreference('not too spicy').weights.spice).toBeLessThan(0);
    expect(parsePreference('Prefer healthier options').weights).toMatchObject({ healthy: 8, fried: -8 });
  });
  test('D15 with no known dish at all, new dishes are the visible fallback', () => {
    const f = family(); f.settings.adventurous = 0;
    const list = recommend({ family: f, date: DATE, slot: 'dinner' });
    expect(list.length).toBe(3); expect(list.every(s => s.novel)).toBe(true);
  });
});
