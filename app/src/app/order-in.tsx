import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { DishPicker } from '@/components/DishPicker';
import { SuggestionCard } from '@/components/SuggestionCard';
import { todayKey } from '@/domain/dates';
import { uid } from '@/domain/family';
import { ORDER_DIET_LABEL, orderWarnings } from '@/domain/guidance';
import { zomatoSearch } from '@/domain/links';
import { LOG_DISH_LIMIT } from '@/domain/log-draft';
import { dishById, recommend } from '@/domain/recommender';
import { isEater } from '@/domain/rules';
import type { Dish, Family, SlotId } from '@/domain/types';
import { useFamily, useStore } from '@/state/store';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, H2, Row, Screen, Segmented, T } from '@/ui/kit';
import { useColors } from '@/ui/theme';

export default function OrderIn() {
  const family = useFamily();
  return family ? <OrderWorkspace key={family.id} family={family} /> : null;
}

function OrderWorkspace({ family }: { family: Family }) {
  const c = useColors();
  const updateFamily = useStore((s) => s.updateFamily);
  const [slot, setSlot] = useState<SlotId>(new Date().getHours() < 16 ? 'lunch' : 'dinner');
  const [index, setIndex] = useState(0);
  const [picker, setPicker] = useState(false);
  const [orders, setOrders] = useState<Partial<Record<SlotId, string[]>>>({});
  const date = todayKey();
  const list = useMemo(() => recommend({ family, date, slot, orderIn: true, eaters: family.members.filter(isEater), count: 100 }), [family, slot, date]);
  const ideaIndex = index % Math.max(1, list.length);
  const idea = list[ideaIndex];
  const selected = (orders[slot] ?? []).map((id) => dishById(family, id)).filter((dish): dish is Dish => !!dish);
  const selectedIds = selected.map((dish) => dish.id);
  const setSelection = (ids: string[]) => setOrders((current) => ({ ...current, [slot]: ids }));

  const addIdea = (dish: Dish) => {
    if (selectedIds.includes(dish.id)) return;
    if (selectedIds.length >= LOG_DISH_LIMIT) return warn(`Remove a dish before adding more than ${LOG_DISH_LIMIT}.`);
    setSelection([...selectedIds, dish.id]);
    ok(`Added ${dish.name} to your order`);
  };

  const findOnZomato = async (dish: Dish) => {
    await Clipboard.setStringAsync(dish.name).catch(() => {});
    await Linking.openURL(zomatoSearch(dish.name, family.settings.city));
  };

  const logOrder = () => router.push({
    pathname: '/log',
    params: { date, slot, dishes: selectedIds.join(','), ordered: '1', n: uid('order_') },
  });

  return (
    <Screen
      title="Order in"
      subtitle="Choose dishes for different people in the same order."
      edges={['bottom']}
      footer={selected.length ? <Button label="Record what we ordered" onPress={logOrder} /> : undefined}>
      <Segmented<SlotId>
        label="Meal"
        value={slot}
        onChange={(value) => { setSlot(value); setIndex(0); }}
        options={[{ value: 'lunch', label: 'Lunch' }, { value: 'snack', label: 'Snack' }, { value: 'dinner', label: 'Dinner' }]}
      />
      <Button label={selected.length ? 'Add or change dishes' : 'Choose dishes'} onPress={() => setPicker(true)} />
      {selected.length ? <>
        <H2>Your order · {selected.length} {selected.length === 1 ? 'dish' : 'dishes'}</H2>
        {selected.map((dish) => {
          const notes = orderWarnings(family, dish, date);
          return <Card key={dish.id} tone={notes.some((note) => note.tone === 'bad') ? 'bad' : notes.length ? 'warn' : undefined}>
            <T bold>{dish.name}</T>
            <T small muted>{dish.unverified ? 'Diet unconfirmed' : ORDER_DIET_LABEL[dish.diet]}</T>
            {notes.map((note) => <T key={note.text} small bold style={{ color: c[note.tone] }}>⚠ {note.text}</T>)}
            <Row wrap>
              <Button small kind="secondary" label="Find on Zomato" accessibilityLabel={`Find ${dish.name} on Zomato`} onPress={() => findOnZomato(dish)} />
              <Button small kind="ghost" label="Remove" accessibilityLabel={`Remove ${dish.name} from order`} onPress={() => setSelection(selectedIds.filter((id) => id !== dish.id))} />
            </Row>
          </Card>;
        })}
      </> : null}
      <T small muted>Confirm ingredients and cross-contact with the restaurant. Place your order with the restaurant, then review the dishes and people in Log.</T>
      {idea ? <>
        <T small muted>Ideas for sharing · {ideaIndex + 1} of {list.length}</T>
        <SuggestionCard
          key={idea.dish.id}
          s={idea}
          ordering
          acceptLabel="Add to order"
          onAccept={selectedIds.includes(idea.dish.id) ? undefined : () => addIdea(idea.dish)}
          onNext={list.length > 1 ? () => setIndex(ideaIndex + 1) : undefined}
        />
        {ideaIndex > 0 ? <Button small kind="ghost" label="‹ Previous idea" onPress={() => setIndex(ideaIndex - 1)} /> : null}
      </> : null}
      {picker ? <DishPicker
        visible
        orderIn
        family={family}
        date={date}
        slot={slot}
        title="Choose order-in dishes"
        max={LOG_DISH_LIMIT}
        initial={selectedIds}
        onClose={() => setPicker(false)}
        onDone={(ids) => { setSelection(ids); setPicker(false); }}
        onCreateDish={(dish) => updateFamily(family.id, (current) => {
          current.customDishes = [...current.customDishes.filter((item) => item.id !== dish.id), dish];
        })}
      /> : null}
    </Screen>
  );
}
