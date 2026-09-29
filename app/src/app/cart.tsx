import * as Clipboard from 'expo-clipboard';
import React, { useMemo } from 'react';
import { Linking, Pressable } from 'react-native';

import { addCart, missingForPlans } from '@/domain/actions';
import { addDays, todayKey } from '@/domain/dates';
import { blinkitSearch, whatsappLink } from '@/domain/links';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, Empty, H2, Input, Row, Screen, T } from '@/ui/kit';
import { useColors } from '@/ui/theme';

/** FR-252/253: staples, not inventory — list what planned meals need, hand off to Blinkit. */
export default function Cart() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const c = useColors();
  const [manual, setManual] = React.useState('');
  const suggested = useMemo(() => (family ? missingForPlans(family, todayKey(), addDays(todayKey(), 2)) : []), [family]);
  if (!family) return null;
  const open = family.cart.filter((x) => !x.done);
  const newSuggestions = suggested.filter((s) => !family.cart.some((x) => x.name === s));

  const openBlinkit = async (q: string) => {
    await Clipboard.setStringAsync(q);
    Linking.openURL(blinkitSearch(q));
  };

  return (
    <Screen title="To buy" subtitle="For meals planned in the next 3 days, beyond your staples." edges={['bottom']}>
      {newSuggestions.length ? (
        <Card tone="alt">
          <T bold>Planned meals need</T>
          <T small>{newSuggestions.join(', ')}</T>
          <Button small label="Add all to list" onPress={() => update((f) => addCart(f, newSuggestions, 'plan'))} />
        </Card>
      ) : null}
      <Row>
        <Input value={manual} onChangeText={setManual} placeholder="Add an item…" style={{ minWidth: 200 }} onSubmitEditing={() => {
          update((f) => addCart(f, manual.split(','), 'manual'));
          setManual('');
        }} />
        <Button small label="Add" onPress={() => {
          update((f) => addCart(f, manual.split(','), 'manual'));
          setManual('');
        }} />
      </Row>
      {!open.length ? <Empty emoji="🛒" title="Nothing to buy" body="Items the cook marks as missing land here too." /> : null}
      {open.map((i) => (
        <Card key={i.id}>
          <Row>
            <Pressable onPress={() => update((f) => void (f.cart.find((x) => x.id === i.id)!.done = true))} accessibilityRole="checkbox" hitSlop={8}>
              <T style={{ fontSize: 22 }}>⬜</T>
            </Pressable>
            <T style={{ flex: 1 }}>
              {i.name}
              {i.source === 'cook' ? '  · from cook' : ''}
            </T>
            <Button small kind="secondary" label="Blinkit" onPress={() => openBlinkit(i.name)} />
          </Row>
        </Card>
      ))}
      {open.length ? (
        <>
          <H2>Hand off</H2>
          <Row wrap>
            <Button label="Share list on WhatsApp" icon="💬" onPress={() => Linking.openURL(whatsappLink(`🛒 To buy:\n${open.map((i) => `• ${i.name}`).join('\n')}`))} />
            <Button kind="secondary" label="Copy list" onPress={() => Clipboard.setStringAsync(open.map((i) => i.name).join(', '))} />
          </Row>
          <T small muted style={{ color: c.muted }}>
            Blinkit has no public ordering API yet, so each item opens a Blinkit search (the item is also copied, to paste if needed).
          </T>
          <Button kind="ghost" label="Clear bought items" onPress={() => update((f) => void (f.cart = f.cart.filter((x) => !x.done)))} />
        </>
      ) : null}
    </Screen>
  );
}
