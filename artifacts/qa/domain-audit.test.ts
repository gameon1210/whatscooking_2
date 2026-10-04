import { CATALOG, CATALOG_BY_ID as D, makeCustomDish } from '@/domain/catalog';
import { newFamily, newMember } from '@/domain/family';
import { recommend, recommendPlates, recommendTiffins } from '@/domain/recommender';
import { checkMember, slotFits, tiffinKids } from '@/domain/rules';
import { addCart, addLeftover, applyCookReply, autoLog, favourites, logMeal, missingForPlans, recordEvent, toggleReaction, upsertPlan } from '@/domain/actions';
import { buildPayload, cookPageUrl, parseCookReply } from '@/domain/cookcard';
import { parseLogs } from '@/domain/parse';
import { parsePreference } from '@/domain/prefs';
import { memberFasts } from '@/domain/calendar';
import { currentSlot, parseHHMM } from '@/domain/dates';
import { draftDay } from '@/state/draft';
import type { Family, SlotId } from '@/domain/types';

const DATE = '2026-10-07'; // Wednesday; fixed fixture, independent of machine time.
function family(): Family {
  const f = newFamily('QA household', 'general');
  f.members = [newMember('Planner', { id: 'adult', roles: ['planner', 'eater'], diet: 'nonveg', spice: 3 })];
  return f;
}
function kid(id = 'kid') {
  return newMember(id, { id, ageBand: 'child', school: { shortBreak: true, lunchBox: true, schoolDays: [1,2,3,4,5], pickup: '15:50', holidays: [] } });
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
    expect(payload.items[0].q).toBe(require('../../app/src/domain/cookcard').quantities(D[main.options[0]], 1));
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
    const suggested=missingForPlans(f,DATE,DATE).filter(s=>!f.cart.some(x=>x.name===s));
    expect(suggested).toContain('paneer');
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
    const f=family();const p=upsertPlan(f,DATE,'lunch',['rajma_chawal','chole_rice']);const before=JSON.stringify(f);
    applyCookReply(f,{id:'card',picks:{},missing:{},change:[p.id],stop:false});
    expect(JSON.stringify(f)).not.toBe(before);
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
  test('D34 Cook reply destination includes the India country code', () => {
    const f=family();f.settings.plannerPhone='9999999999';
    const p=upsertPlan(f,DATE,'lunch',['rajma_chawal']);
    expect(buildPayload(f,newMember('Cook',{roles:['cook']}),DATE,[p]).ph).toBe('919999999999');
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
    const f=family();const p=upsertPlan(f,DATE,'lunch',['rajma_chawal','chole_rice']);
    applyCookReply(f,parseCookReply(`WC:card #${p.id}=2 #${p.id}=M:tomato%2Cpaneer`));
    expect(p.chosenDishId).toBe('chole_rice');expect(f.cart.map(x=>x.name)).toEqual(['tomato','paneer']);
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
