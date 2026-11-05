import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { DishPicker } from '@/components/DishPicker';
import { HideSheet } from '@/components/HideSheet';
import { KitchenCover } from '@/components/KitchenCover';
import { PantryCard } from '@/components/PantryCard';
import { preparationNotes } from '@/domain/guidance';
import { SuggestionCard } from '@/components/SuggestionCard';
import { changeRequests, findPlanned, planDish, planSeparateDish, recordEvent, removePlan, tryUpsertPlan, undoEvent } from '@/domain/actions';
import { dayNotes } from '@/domain/calendar';
import { addDays, currentSlot, prettyDate, SLOT_LABEL, SLOT_ORDER, todayKey } from '@/domain/dates';
import { homePreferences } from '@/domain/home';
import { foodWeek } from '@/domain/insights';
import { MEAL_NUDGES } from '@/domain/meal-nudges';
import { dishById, planningPlates } from '@/domain/recommender';
import { cookOnDuty, tiffinKids } from '@/domain/rules';
import type { ChipId, Dish, Family, SlotId, Suggestion } from '@/domain/types';
import { fetchWeather } from '@/services/weather';
import { useFamily, useStore } from '@/state/store';
import { Eyebrow, KitchenBrand } from '@/ui/editorial';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, ChipScroll, Row, Screen, T } from '@/ui/kit';
import { editorialFont, useColors } from '@/ui/theme';

const NUDGE_IDS = Object.keys(MEAL_NUDGES) as ChipId[];
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
const EMPTY_PANTRY: string[] = [];

function usePlates(family: Family | null, date: string, slot: SlotId, chips: ChipId[], available: string[], exclude: string[]) {
  return useMemo(() => family ? planningPlates({ family, date, slot, chips, nudge: chips[0], available, exclude, count: 10 }) : [], [family, date, slot, chips, available, exclude]);
}

export default function Today() {
  const family = useFamily();
  const c = useColors();
  const { width } = useWindowDimensions();
  const { chips, toggleChip, update, setChips } = useStore();
  const [swiped, setSwiped] = useState<string[]>([]);
  const [dishPicker, setDishPicker] = useState<{ date: string; slot: SlotId; memberId?: string; memberIds: string[]; suggestions: Suggestion[]; focusSearch: boolean } | null>(null);
  const [hide, setHide] = useState<Dish | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const home = homePreferences(family?.settings.home);
  const now = new Date();
  const { date, slot } = currentSlot(now, family?.settings.planSlots ?? ['breakfast', 'lunch', 'dinner']);
  const [override, setChosenSlot] = useState<SlotId | null>(null);
  const chosenSlot = override ?? slot;
  const city = family?.settings.city;

  useEffect(() => {
    if (!city || !home.showWeather) return;
    let alive = true;
    fetchWeather(city).then((w) => {
      if (!w || !alive) return;
      setWeather(String(Math.round(w.tempC)) + '°' + (w.rainy ? ' · rain' : ''));
    }).catch(() => {});
    return () => { alive = false; };
  }, [city, home.showWeather]);

  const plates = usePlates(family, date, chosenSlot, chips, family?.pantry ?? EMPTY_PANTRY, swiped);
  if (!family) return <Screen title="What’s Cooking">{null}</Screen>;
  const planner = family.members.find((m) => m.roles.includes('planner'));
  const people = family.members.filter((m) => m.roles.includes('eater') && !m.optedOut);
  const notes = dayNotes(family, date);
  const cook = cookOnDuty(family, date, chosenSlot);
  const anyCookTomorrow = cookOnDuty(family, addDays(todayKey(), 1));
  const requests = changeRequests(family);
  const kidsTomorrow = tiffinKids(family, addDays(todayKey(), 1));
  const recent = family.entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const week = foodWeek(family);
  const plateMember = (pi: number) => plates[pi].memberId;
  const openDishPicker = (pi: number, focusSearch = false) => setDishPicker({
    date,
    slot: chosenSlot,
    memberId: plateMember(pi),
    memberIds: plates.length > 1 ? plates[pi].memberIds : [],
    suggestions: plates[pi].suggestions,
    focusSearch,
  });
  const searchLabel = `Search ${SLOT_LABEL[chosenSlot].toLowerCase()} dishes`;
  const nudge = chips[0] ? MEAL_NUDGES[chips[0]] : undefined;
  const matchCount = new Set(plates.flatMap((plate) => plate.suggestions.map((suggestion) => suggestion.dish.id))).size;
  const mealName = SLOT_LABEL[chosenSlot].toLowerCase();

  const saveSeparate = (dishId: string, diners: string[]) => {
    if (!dishPicker) return;
    let error: string | undefined;
    update((f) => {
      error = planSeparateDish(f, dishPicker.date, dishPicker.slot, dishId, diners, dishPicker.memberIds).error;
      if (!error) recordEvent(f, dishPicker.date, dishPicker.slot, dishId, 'accepted');
    });
    if (error) return warn(error);
    ok('Separate plate planned ✓');
    setDishPicker(null);
    setSwiped([]);
  };

  const accept = (pi: number, idx: number) => {
    const list = plates[pi].suggestions;
    const chosen = list[idx];
    const ranked = [chosen, ...list.filter((_, i) => i !== idx)].slice(0, 3).map((s) => s.dish.id);
    let error: string | undefined;
    update((f) => {
      const result = tryUpsertPlan(f, date, chosenSlot, ranked, { source: 'today', memberId: plateMember(pi), forMemberIds: plates.length > 1 ? plates[pi].memberIds : undefined });
      error = result.error;
      if (!error) recordEvent(f, date, chosenSlot, chosen.dish.id, 'accepted');
    });
    if (error) warn(error);
    else ok(chosen.dish.name + ' planned for ' + SLOT_LABEL[chosenSlot].toLowerCase() + ' ✓');
    setSwiped([]);
  };
  const next = (id: string) => {
    update((f) => recordEvent(f, date, chosenSlot, id, 'swiped'));
    setSwiped((s) => [...s, id]);
  };
  const back = () => {
    const last = swiped[swiped.length - 1];
    if (!last) return;
    update((f) => undoEvent(f, date, chosenSlot, last, 'swiped'));
    setSwiped((s) => s.slice(0, -1));
  };
  const lastSkipped = swiped.length ? dishById(family, swiped[swiped.length - 1])?.name : undefined;
  const mealPicker = <View role="radiogroup" accessibilityLabel="Meal to plan" style={{ width: width >= 900 ? 285 : '100%' }}><ChipScroll>{family.settings.planSlots.slice().sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b)).map((s) =>
    <Chip key={s} choice="radio" label={SLOT_LABEL[s]} selected={chosenSlot === s} onPress={() => { setChosenSlot(s); setSwiped([]); }} />)}</ChipScroll></View>;
  const mealHeading = <View style={{ gap: 4, flex: width >= 900 ? 1 : undefined }}><Eyebrow>{date === todayKey() ? 'LET’S MAKE SOMETHING GOOD' : 'PLANNING FOR ' + prettyDate(date).toUpperCase()}</Eyebrow><Text accessibilityRole="header" style={{ fontFamily: editorialFont, color: c.text, fontSize: 28, lineHeight: 35 }}>What’s for {SLOT_LABEL[chosenSlot].toLowerCase()}?</Text></View>;

  return (
    <Screen maxWidth={1120}>
      <Row>
        <View style={{ flex: 1 }}><KitchenBrand /></View>
        <Button small kind="ghost" label="Personalise" icon="✧" onPress={() => router.push('/personalise')} />
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 14 }}>
          <T style={{ fontSize: 21 }}>☰</T>
        </Pressable>
      </Row>
      <KitchenCover home={home} familyName={family.name} greeting={greeting() + (planner ? ', ' + planner.name.split(' ')[0] : '')} />
      <Row wrap>
        <T small muted style={{ flex: 1 }}>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}{home.showWeather && weather ? '  ·  ' + family.settings.city + ' ' + weather : ''}</T>
        {home.showFamily ? <Pressable accessibilityRole="button" accessibilityLabel="See the people in your family" onPress={() => router.push('/family')} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
          {people.slice(0, 4).map((person, i) => <View key={person.id} style={{ width: 31, height: 31, borderRadius: 16, marginLeft: i ? -6 : 0, borderWidth: 2, borderColor: c.bg, backgroundColor: i % 2 ? c.goodSoft : c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.text, fontSize: 11, fontWeight: '700' }}>{person.name.trim().slice(0, 1).toUpperCase()}</Text>
          </View>)}
          <T small muted style={{ marginLeft: 7 }}>Our family</T>
        </Pressable> : null}
      </Row>

      {requests.map((p) => <Card key={p.id} tone="warn">
        <T bold>Cook asked to change {dishById(family, p.options[0])?.name ?? 'a dish'}</T>
        <T small muted>{prettyDate(p.date)} · {SLOT_LABEL[p.slot]}. Pick an alternate, or keep the plan.</T>
        <Row wrap>
          {(p.alternates ?? []).map((id) => <Button key={id} small label={dishById(family, id)?.name ?? id} onPress={() => {
            let error: string | undefined;
            update((f) => { error = tryUpsertPlan(f, p.date, p.slot, [id, ...(p.alternates ?? []).filter((x) => x !== id)], { memberId: p.memberId, forMemberIds: p.forMemberIds }).error; });
            if (error) warn(error); else ok('Changed to ' + (dishById(family, id)?.name ?? 'that dish') + ' ✓');
          }} />)}
          <Button small kind="ghost" label="Choose another" onPress={() => router.push({ pathname: '/tomorrow', params: { date: p.date } })} />
          <Button small kind="ghost" label="Keep it" onPress={() => {
            update((f) => { const x = f.planned.find((y) => y.id === p.id); if (x) { x.changeRequested = false; x.alternates = undefined; } });
            ok('Kept the plan ✓');
          }} />
        </Row>
      </Card>)}

      <View style={{ flexDirection: width >= 900 ? 'row' : 'column', alignItems: 'stretch', gap: 24 }}>
        <View style={{ flex: 1.65, gap: 16, minWidth: 0 }}>
          <Card tone={nudge ? 'alt' : undefined}>
            <T bold>A little nudge for {date === todayKey() ? 'today' : 'tomorrow'}?</T>
            <T small muted>Pick what would help and see matching ideas for {mealName}.</T>
            <Row wrap>
              {NUDGE_IDS.map((id) => <Chip key={id} label={MEAL_NUDGES[id].label} selected={chips.includes(id)} onPress={() => { toggleChip(id); setSwiped([]); }} />)}
            </Row>
            {nudge ? <>
              <T small>{nudge.description}</T>
              <T bold>{matchCount ? `${matchCount} ${mealName} ${matchCount === 1 ? 'idea' : 'ideas'} match` : `No matching ${mealName} ideas`}</T>
              {!matchCount ? <T small muted>{chips[0] === 'leftovers' ? 'Try a different meal or add leftovers after logging a meal.' : 'Try another nudge or switch meals.'}</T> : null}
              <Button small kind="ghost" label="Clear nudge" onPress={() => { setChips([]); setSwiped([]); }} />
            </> : null}
          </Card>
          <View style={{ flexDirection: width >= 900 ? 'row' : 'column', gap: 16, alignItems: width >= 900 ? 'center' : 'stretch' }}>{width >= 900 ? mealHeading : mealPicker}{width >= 900 ? mealPicker : mealHeading}</View>
          {plates.map((plate, pi) => {
            const planned = findPlanned(family, date, chosenSlot, plateMember(pi));
            const hasPlan = planned && planned.status !== 'skipped';
            const logged = planned?.status === 'cooked' || planned?.status === 'ordered_in';
            return <View key={plate.memberId ?? 'shared'} style={{ gap: 12 }}>
              {plates.length > 1 ? <Eyebrow>{plate.label.toUpperCase()}</Eyebrow> : null}
              {!logged ? (
                <Button
                  kind="secondary"
                  icon="⌕"
                  label={searchLabel}
                  accessibilityLabel={plates.length > 1 ? `${searchLabel}, ${plate.label}` : searchLabel}
                  onPress={() => openDishPicker(pi, true)}
                />
              ) : null}
              {hasPlan ? <Card tone="good">
                <Eyebrow>{planned.status === 'cooked' ? 'IN YOUR FOOD MEMORY' : planned.status === 'ordered_in' ? 'ORDERED IN' : planned.changeRequested ? 'COOK ASKED TO CHANGE' : planned.cookAckAt ? 'COOK CONFIRMED' : planned.status === 'sent' ? 'SENT TO COOK' : planned.cookOpenedAt ? 'PLANNED · SENDING NOT CONFIRMED' : 'ON THE MENU'}</Eyebrow>
                <Text style={{ color: c.text, fontFamily: editorialFont, fontSize: 29, lineHeight: 35 }}>{dishById(family, planDish(planned) ?? '')?.name}</Text>
                {plate.memberId && plates.length === 1 ? <T small muted>{plate.label}</T> : null}
                {planned.options.length > 1 ? <T small muted>Backups: {planned.options.filter((id) => id !== planDish(planned)).map((id) => dishById(family, id)?.name).join(', ')}</T> : null}
                {preparationNotes(family, planned, planned.options).map((note) => <T key={note} small bold style={{ color: c.warn }}>{note}</T>)}
                <Row wrap>
                  {cook && planned.status === 'planned' ? <Button small label="Send Cook Card" onPress={() => router.push({ pathname: '/cook-card', params: { date } })} /> : null}
                  {planned.status !== 'cooked' && planned.status !== 'ordered_in' ? <>
                    <Button small label="Log as cooked" onPress={() => router.push({ pathname: '/log', params: { date, slot: chosenSlot, dish: planDish(planned), plan: planned.id, member: planned.memberId ?? '' } })} />
                    <Button small kind="ghost" label="Change plan" onPress={() => { update((f) => removePlan(f, planned.id)); ok('Plan cleared. Pick another below.'); }} />
                  </> : <Button small kind="ghost" label="View in memory" onPress={() => router.push('/history')} />}
                </Row>
              </Card> : null}
              {nudge && logged && plate.suggestions.length ? <Card tone="alt">
                <T bold>{nudge.label} · ideas for next time</T>
                {plate.suggestions.slice(0, 3).map(({ dish }) => <T key={dish.id}>{dish.name}</T>)}
                <T small muted>This meal is already logged. Choose another meal above to plan with this nudge.</T>
              </Card> : null}
              {!hasPlan || (nudge && !logged) ? <>
                {pi === 0 && lastSkipped ? <Button small kind="ghost" label={'‹ Back to ' + lastSkipped} accessibilityLabel={'Back to the previous suggestion, ' + lastSkipped} onPress={back} style={{ alignSelf: 'flex-start' }} /> : null}
                {plate.suggestions[0] ? <SuggestionCard s={plate.suggestions[0]} acceptLabel={hasPlan ? 'Use this instead' : 'Plan this meal'} rankLabel={nudge ? nudge.label.toUpperCase() : 'A LITTLE INSPIRATION FOR YOUR TABLE'} onAccept={() => accept(pi, 0)} onNext={() => next(plate.suggestions[0].dish.id)} onHide={() => setHide(plate.suggestions[0].dish)} /> : <Card><T>{nudge ? 'No matching ideas for this plate. Try a different nudge or search for a dish.' : 'No dish fits this plate’s rules for this slot. Try searching or adding a dish.'}</T></Card>}
                {plate.suggestions.length > 1 ? <T small muted>Or, something else you might like</T> : null}
                {plate.suggestions.slice(1, 3).map((s, i) => <Pressable key={s.dish.id} accessibilityRole="button" accessibilityLabel={'Pick ' + s.dish.name} onPress={() => accept(pi, i + 1)}>
                  <Card><Row><View style={{ flex: 1 }}><T bold>{s.dish.name}</T><T small muted>{s.reason}</T></View><T style={{ color: c.primary, fontSize: 22 }}>↗</T></Row></Card>
                </Pressable>)}
                <Button kind="secondary" label="Browse all dishes" onPress={() => openDishPicker(pi)} />
              </> : null}
            </View>;
          })}
<Row wrap><Button small kind="secondary" label="Order in" onPress={() => router.push('/order-in')} /><Button small kind="ghost" label="Shopping list" onPress={() => router.push('/cart')} /></Row>
        </View>

        <View style={{ flex: 1, gap: 18, minWidth: 0 }}>
          <Button kind="secondary" label="Plan meals by voice" onPress={() => router.push('/plan-by-voice')} />
          <Card tone="alt"><Eyebrow>ALREADY ATE SOMETHING LOVELY?</Eyebrow><Text style={{ fontFamily: editorialFont, color: c.text, fontSize: 25, lineHeight: 31 }}>Keep the memory.</Text><T small muted>Type what you ate, pick a dish, or add a photo. No AI key needed to get started.</T><Button label="Log a meal" onPress={() => router.push('/log')} /></Card>
          {home.showPantry ? <PantryCard key={family.id} family={family} /> : null}
          {home.showTomorrow ? <Card tone="alt">
            <Eyebrow>A LITTLE AHEAD</Eyebrow><Text style={{ fontFamily: editorialFont, color: c.text, fontSize: 25, lineHeight: 31 }}>Tomorrow, taken care of.</Text>
            <T small muted>{kidsTomorrow.length ? 'Breakfast and ' + kidsTomorrow.reduce((n, k) => n + k.slots.length, 0) + ' tiffin boxes for ' + kidsTomorrow.map((k) => k.member.name).join(', ') + '.' : 'A small plan tonight. An easier morning.'}</T>
            <Button kind="secondary" label="Plan tomorrow" onPress={() => router.push('/tomorrow')} />
            {cook || anyCookTomorrow ? <Button small kind="ghost" label="Cook’s reply" onPress={() => router.push('/cook-reply')} /> : null}
          </Card> : null}
          {home.showMemories ? <Card>
            <Eyebrow>FROM YOUR FOOD MEMORY</Eyebrow><T bold>{recent ? recent.dishIds.map((id) => dishById(family, id)?.name ?? 'A meal').join(' + ') : 'The beginning of your family cookbook.'}</T>
            <T small muted>{recent ? prettyDate(recent.date) + ' · ' + SLOT_LABEL[recent.slot] + (recent.confirmed ? '' : ' · waiting for confirmation') : 'The meals you log become stories to come back to.'}</T>
            {week.highlights.length ? <View style={{ gap: 2 }}><Eyebrow>{week.isSunday ? 'SUNDAY RECAP' : 'THIS WEEK'}</Eyebrow><T small>{week.highlights[new Date().getDate() % week.highlights.length].text}</T>{week.nudge ? <T small muted>{week.nudge.text}</T> : null}</View> : null}
            <Row wrap><Button small kind="ghost" label="Open memory" onPress={() => router.push('/history')} />{week.now.meals || week.last.meals ? <Button small kind="secondary" label="Our food week" onPress={() => router.push('/insights')} /> : null}</Row>
          </Card> : null}
          {notes.length ? <T small muted>On the calendar: {notes.join(' · ')}. Food rules follow each person’s preferences.</T> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Personalise your home page" onPress={() => router.push('/personalise')} style={{ minHeight: 48, justifyContent: 'center' }}><T small style={{ color: c.primary }}>✧  Your photos. Your colours. Make it yours.</T></Pressable>
        </View>
      </View>
      {dishPicker ? <DishPicker visible family={family} date={dishPicker.date} slot={dishPicker.slot} memberId={dishPicker.memberId} memberIds={dishPicker.memberIds} suggestions={dishPicker.suggestions} focusSearch={dishPicker.focusSearch} title={`Choose ${SLOT_LABEL[dishPicker.slot].toLowerCase()}`} onClose={() => setDishPicker(null)} onPlanSeparately={saveSeparate} onCreateDish={(d) => update((f) => { f.customDishes = [...f.customDishes.filter((x) => x.id !== d.id), d]; })} onDone={(ids) => {
        let error: string | undefined;
        update((f) => { const result = tryUpsertPlan(f, dishPicker.date, dishPicker.slot, ids, { source: 'today', memberId: dishPicker.memberId, forMemberIds: dishPicker.memberIds.length ? dishPicker.memberIds : undefined }); error = result.error; if (!error) recordEvent(f, dishPicker.date, dishPicker.slot, ids[0], 'accepted'); });
        if (error) warn(error); else { ok('Meal planned ✓'); setDishPicker(null); setSwiped([]); }
      }} /> : null}
      <HideSheet dish={hide} onClose={() => setHide(null)} />
    </Screen>
  );
}
