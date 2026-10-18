import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { HideSheet } from '@/components/HideSheet';
import { KitchenCover } from '@/components/KitchenCover';
import { preparationNotes } from '@/domain/guidance';
import { SuggestionCard } from '@/components/SuggestionCard';
import { changeRequests, findPlanned, planDish, recordEvent, removePlan, tryUpsertPlan, undoEvent } from '@/domain/actions';
import { dayNotes } from '@/domain/calendar';
import { VEGETABLES } from '@/domain/catalog';
import { addDays, currentSlot, prettyDate, SLOT_LABEL, SLOT_ORDER, todayKey } from '@/domain/dates';
import { homePreferences } from '@/domain/home';
import { foodWeek } from '@/domain/insights';
import { dishById, recommendPlates } from '@/domain/recommender';
import { cookOnDuty, tiffinKids } from '@/domain/rules';
import type { ChipId, Dish, Family, SlotId } from '@/domain/types';
import { fetchWeather } from '@/services/weather';
import { useFamily, useStore } from '@/state/store';
import { Eyebrow, KitchenBrand } from '@/ui/editorial';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, ChipScroll, H2, Row, Screen, T } from '@/ui/kit';
import { editorialFont, useColors } from '@/ui/theme';

const CHIPS: { id: ChipId; label: string }[] = [
  { id: 'quick', label: 'Quick & easy' }, { id: 'low_energy', label: 'Low-energy day' },
  { id: 'leftovers', label: 'Use leftovers' }, { id: 'guests', label: 'Guests over' },
  { id: 'rainy', label: 'Rainy-day comfort' }, { id: 'sick', label: 'Something light' },
  { id: 'sunday', label: 'Make it special' },
];
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function usualVeg(f: Family): string[] {
  const seen = new Map<string, number>();
  for (const e of f.entries.slice(-60)) for (const id of e.dishIds) dishById(f, id)?.veg.forEach((v) => seen.set(v, (seen.get(v) ?? 0) + 1));
  return [...new Set([...seen.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v).concat(VEGETABLES))].slice(0, 14);
}

function usePlates(family: Family | null, date: string, slot: SlotId, chips: ChipId[], available: string[], exclude: string[]) {
  return useMemo(() => family ? recommendPlates({ family, date, slot, chips, available, exclude, count: 10 }) : [], [family, date, slot, chips, available, exclude]);
}

export default function Today() {
  const family = useFamily();
  const c = useColors();
  const { width } = useWindowDimensions();
  const { chips, available, toggleChip, toggleAvailable, update, setChips } = useStore();
  const [swiped, setSwiped] = useState<string[]>([]);
  const [hide, setHide] = useState<Dish | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [pantryOpen, setPantryOpen] = useState(false);
  const home = homePreferences(family?.settings.home);
  const now = new Date();
  const { date, slot } = currentSlot(now, family?.settings.planSlots ?? ['breakfast', 'lunch', 'dinner']);
  const [override, setChosenSlot] = useState<SlotId | null>(null);
  const chosenSlot = override ?? slot;

  useEffect(() => {
    if (!family || !home.showWeather) return;
    let alive = true;
    fetchWeather(family.settings.city).then((w) => {
      if (!w || !alive) return;
      setWeather(String(Math.round(w.tempC)) + '°' + (w.rainy ? ' · rain' : ''));
      if ((w.rainy || w.cold) && !useStore.getState().chips.includes('rainy')) setChips([...useStore.getState().chips, 'rainy']);
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.settings.city, home.showWeather]);

  const plates = usePlates(family, date, chosenSlot, chips, available, swiped);
  if (!family) return <Screen title="What’s Cooking">{null}</Screen>;
  const planner = family.members.find((m) => m.roles.includes('planner'));
  const people = family.members.filter((m) => m.roles.includes('eater') && !m.optedOut);
  const notes = dayNotes(family, date);
  const leftovers = family.leftovers.filter((l) => !l.resolved);
  const cook = cookOnDuty(family, date, chosenSlot);
  const anyCookTomorrow = cookOnDuty(family, addDays(todayKey(), 1));
  const requests = changeRequests(family);
  const kidsTomorrow = tiffinKids(family, addDays(todayKey(), 1));
  const recent = family.entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const week = foodWeek(family);
  const plateMember = (pi: number) => pi > 0 ? plates[pi].memberIds[0] : undefined;

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
          <T small muted style={{ marginLeft: 7 }}>{people.length} at the table</T>
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
          <View style={{ flexDirection: width >= 900 ? 'row' : 'column', gap: 16, alignItems: width >= 900 ? 'center' : 'stretch' }}>{width >= 900 ? mealHeading : mealPicker}{width >= 900 ? mealPicker : mealHeading}</View>
          {plates.map((plate, pi) => {
            const planned = findPlanned(family, date, chosenSlot, plateMember(pi));
            return <View key={plate.label} style={{ gap: 12 }}>
              {plates.length > 1 ? <Eyebrow>{plate.label.toUpperCase()}</Eyebrow> : null}
              {planned && planned.status !== 'skipped' ? <Card tone="good">
                <Eyebrow>{planned.status === 'cooked' ? 'IN YOUR FOOD MEMORY' : planned.status === 'ordered_in' ? 'ORDERED IN' : planned.changeRequested ? 'COOK ASKED TO CHANGE' : planned.cookAckAt ? 'COOK CONFIRMED' : planned.status === 'sent' ? 'SENT TO COOK' : planned.cookOpenedAt ? 'PLANNED · SENDING NOT CONFIRMED' : 'ON THE MENU'}</Eyebrow>
                <Text style={{ color: c.text, fontFamily: editorialFont, fontSize: 29, lineHeight: 35 }}>{dishById(family, planDish(planned) ?? '')?.name}</Text>
                {planned.options.length > 1 ? <T small muted>Backups: {planned.options.filter((id) => id !== planDish(planned)).map((id) => dishById(family, id)?.name).join(', ')}</T> : null}
                {preparationNotes(family, planned, planned.options).map((note) => <T key={note} small bold style={{ color: c.warn }}>{note}</T>)}
                <Row wrap>
                  {cook && planned.status === 'planned' ? <Button small label="Send Cook Card" onPress={() => router.push({ pathname: '/cook-card', params: { date } })} /> : null}
                  {planned.status !== 'cooked' && planned.status !== 'ordered_in' ? <>
                    <Button small label="Log as cooked" onPress={() => router.push({ pathname: '/log', params: { date, slot: chosenSlot, dish: planDish(planned), plan: planned.id, member: planned.memberId ?? '' } })} />
                    <Button small kind="ghost" label="Change plan" onPress={() => { update((f) => removePlan(f, planned.id)); ok('Plan cleared. Pick another below.'); }} />
                  </> : <Button small kind="ghost" label="View in memory" onPress={() => router.push('/history')} />}
                </Row>
              </Card> : <>
                {pi === 0 && lastSkipped ? <Button small kind="ghost" label={'‹ Back to ' + lastSkipped} accessibilityLabel={'Back to the previous suggestion, ' + lastSkipped} onPress={back} style={{ alignSelf: 'flex-start' }} /> : null}
                {plate.suggestions[0] ? <SuggestionCard s={plate.suggestions[0]} acceptLabel="Plan this meal" rankLabel="A LITTLE INSPIRATION FOR YOUR TABLE" onAccept={() => accept(pi, 0)} onNext={() => next(plate.suggestions[0].dish.id)} onHide={() => setHide(plate.suggestions[0].dish)} /> : <Card><T>No dish fits everyone’s rules for this slot. Try removing a filter, or add a dish from Log.</T></Card>}
                {plate.suggestions.length > 1 ? <T small muted>Or, something else you might like</T> : null}
                {plate.suggestions.slice(1, 3).map((s, i) => <Pressable key={s.dish.id} accessibilityRole="button" accessibilityLabel={'Pick ' + s.dish.name} onPress={() => accept(pi, i + 1)}>
                  <Card><Row><View style={{ flex: 1 }}><T bold>{s.dish.name}</T><T small muted>{s.reason}</T></View><T style={{ color: c.primary, fontSize: 22 }}>↗</T></Row></Card>
                </Pressable>)}
              </>}
            </View>;
          })}
<Row wrap><Button small kind="secondary" label="Order in" onPress={() => router.push('/order-in')} /><Button small kind="ghost" label="Shopping list" onPress={() => router.push('/cart')} /></Row>
          <View style={{ gap: 10 }}><T small bold muted>A little nudge for today?</T><ChipScroll>{CHIPS.map((chip) => <Chip key={chip.id} label={chip.label} selected={chips.includes(chip.id)} onPress={() => toggleChip(chip.id)} />)}</ChipScroll></View>
        </View>

        <View style={{ flex: 1, gap: 18, minWidth: 0 }}>
          <Card tone="alt"><Eyebrow>ALREADY ATE SOMETHING LOVELY?</Eyebrow><Text style={{ fontFamily: editorialFont, color: c.text, fontSize: 25, lineHeight: 31 }}>Keep the memory.</Text><T small muted>Type what you ate, pick a dish, or add a photo. No AI key needed to get started.</T><Button label="Log a meal" onPress={() => router.push('/log')} /></Card>
          {home.showPantry ? <Card>
            <H2>In your kitchen</H2>
            <T small muted>{available.length ? available.length + ' ingredients selected' : leftovers.length ? leftovers.length + ' leftover ideas to use up' : 'Good meals start with what you have.'}</T>
            <Button small kind="ghost" label={pantryOpen ? 'Close pantry' : 'Open pantry'} onPress={() => setPantryOpen(!pantryOpen)} />
            {pantryOpen ? <><Row wrap>{leftovers.map((l) => <Chip key={l.id} tone="good" label={'Leftover ' + dishById(family, l.dishId)?.name.toLowerCase()} selected={chips.includes('leftovers')} onPress={() => toggleChip('leftovers')} />)}{usualVeg(family).map((v) => <Chip key={v} label={v} selected={available.includes(v)} onPress={() => toggleAvailable(v)} />)}</Row><Row wrap><Button small kind="secondary" label="Shopping list" onPress={() => router.push('/cart')} /><Button small kind="ghost" label="Order in" onPress={() => router.push('/order-in')} /></Row></> : null}
          </Card> : null}
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
      <HideSheet dish={hide} onClose={() => setHide(null)} />
    </Screen>
  );
}
