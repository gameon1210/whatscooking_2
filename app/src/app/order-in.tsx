import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { DishPicker } from '@/components/DishPicker';
import { SuggestionCard } from '@/components/SuggestionCard';
import { checkPlan } from '@/domain/actions';
import { todayKey } from '@/domain/dates';
import { preparationNotes } from '@/domain/guidance';
import { zomatoSearch } from '@/domain/links';
import { dishById, recommend } from '@/domain/recommender';
import type { SlotId, Suggestion } from '@/domain/types';
import { useFamily } from '@/state/store';
import { warn } from '@/ui/feedback';
import { Button, Empty, Row, Screen, Segmented, T } from '@/ui/kit';

export default function OrderIn() {
  const family = useFamily();
  const [slot, setSlot] = useState<SlotId>(new Date().getHours() < 16 ? 'lunch' : 'dinner');
  const [index, setIndex] = useState(0);
  const [picker, setPicker] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const date = todayKey();
  const list = useMemo(() => family ? recommend({ family, date, slot, orderIn: true, count: 100 }) : [], [family, slot, date]);
  if (!family) return null;
  const dish = chosen ? dishById(family, chosen) : undefined;
  const notes = dish ? preparationNotes(family, { date, slot }, [dish.id]) : [];
  const s: Suggestion | undefined = dish ? { dish, score: 0, drivers: [], reason: notes.join(' · ') || 'Check the restaurant’s recipe against your family’s food rules.', novel: false } : list[index % Math.max(1, list.length)];
  const logOrder = () => {
    if (!s) return;
    const problem = checkPlan(family, date, slot, [s.dish.id]).problems[0];
    if (problem) return warn(problem.reason);
    router.push({ pathname: '/log', params: { date, slot, dish: s.dish.id, ordered: '1', n: String(Date.now()) } });
  };
  return (
    <Screen title="Order in" subtitle="Find an idea, then check the restaurant’s recipe and preparation." edges={['bottom']}>
      <Segmented<SlotId> label="Meal" value={slot} onChange={(v) => { setSlot(v); setIndex(0); setChosen(null); }} options={[{ value: 'lunch', label: 'Lunch' }, { value: 'snack', label: 'Snack' }, { value: 'dinner', label: 'Dinner' }]} />
      {s ? <>
        <T small muted>{chosen ? 'Your choice' : `Idea ${index + 1} of ${list.length}`}</T>
        <SuggestionCard key={s.dish.id} s={s} ordering acceptLabel="Find on Zomato" onAccept={async () => { await Clipboard.setStringAsync(s.dish.name); await Linking.openURL(zomatoSearch(s.dish.name, family.settings.city)); }} onNext={list.length > 1 ? () => { setChosen(null); setIndex((index + 1) % list.length); } : undefined} extra={{ label: 'Record what we ordered…', onPress: logOrder }} />
        <Row wrap>{index > 0 || chosen ? <Button small kind="ghost" label="‹ Previous idea" onPress={() => { setChosen(null); setIndex(Math.max(0, index - 1)); }} /> : null}<Button small kind="secondary" label="Choose another dish" onPress={() => setPicker(true)} /></Row>
      </> : <><Empty emoji="🛵" title="No restaurant ideas fit the saved rules" body="Browse dishes to check more choices, or review the family’s food rules." /><Button label="Browse dishes" onPress={() => setPicker(true)} /></>}
      <T small muted>Opening Zomato does not place or record an order. Once you have eaten, record the day, dishes and people in Log.</T>
      {picker ? <DishPicker visible family={family} date={date} slot={slot} title="Choose an order-in dish" max={1} initial={s ? [s.dish.id] : []} onClose={() => setPicker(false)} onDone={(ids) => { setChosen(ids[0]); setPicker(false); }} /> : null}
    </Screen>
  );
}
