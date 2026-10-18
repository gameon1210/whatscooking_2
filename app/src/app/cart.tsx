import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { addCart, cartSuggestions, setCartBought, shoppingNeeds } from '@/domain/actions';
import { addDays, prettyDate, SLOT_LABEL, todayKey, validDateKey } from '@/domain/dates';
import { blinkitSearch } from '@/domain/links';
import { copyText, shareMessage, shareOnWhatsApp } from '@/services/share';
import type { Family } from '@/domain/types';
import { useFamily, useStore } from '@/state/store';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, Empty, H2, Input, Row, Screen, T } from '@/ui/kit';

export default function Cart() {
  const params = useLocalSearchParams<{ from?: string; to?: string }>();
  const family = useFamily();
  return family ? <CartWorkspace key={`${family.id}:${params.from ?? ''}:${params.to ?? ''}`} family={family} requestedFrom={params.from} requestedTo={params.to} /> : null;
}

function CartWorkspace({ family, requestedFrom, requestedTo }: { family: Family; requestedFrom?: string; requestedTo?: string }) {
  const update = useStore((s) => s.update);
  const [manual, setManual] = useState('');
  const [from, setFrom] = useState(requestedFrom && validDateKey(requestedFrom) ? requestedFrom : todayKey());
  const [to, setTo] = useState(requestedTo && validDateKey(requestedTo) ? requestedTo : addDays(todayKey(), 2));
  const [staplesOpen, setStaplesOpen] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [custom, setCustom] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [quantity, setQuantity] = useState('');
  const validRange = validDateKey(from) && validDateKey(to) && from <= to;
  const needs = useMemo(() => family && validRange ? shoppingNeeds(family, from, to) : [], [family, from, to, validRange]);
  const suggestions = family && validRange ? cartSuggestions(family, from, to) : [];
  const allOpen = family.cart.filter((x) => !x.done);
  const inPeriod = (x: typeof family.cart[number]) => x.needKeys?.length
    ? x.needKeys.some((k) => { const date = k.split('|')[1]; return date >= from && date <= to; })
    : x.forDate ? x.forDate >= from && x.forDate <= to : x.source === 'manual' || needs.some((n) => n.name === x.name);
  const other = allOpen.filter((x) => !inPeriod(x));
  const open = allOpen.filter(inPeriod);
  const shown = showOther ? [...open, ...other] : open;
  const bought = family.cart.filter((x) => x.done && !x.archived);
  const period = validRange ? `${prettyDate(from)} – ${prettyDate(to)}` : 'Choose a valid period';
  const picked = suggestions.filter((n) => !excluded.includes(n));
  const forPeriod = (n: string) => needs.find((x) => x.name === n);
  const add = (names: string[], have = false) => {
    update((f) => {
      addCart(f, names, 'plan', from, to);
      if (have) for (const item of f.cart) if (!item.done && names.includes(item.name)) item.done = true;
    });
    ok(have ? 'Marked as already at home ✓' : `Added ${names.length} item${names.length === 1 ? '' : 's'} ✓`);
  };
  const addManual = () => {
    const items = manual.split(',').map((x) => x.trim()).filter(Boolean);
    if (!items.length) return warn('Type an item first, e.g. tomato, paneer.');
    update((f) => addCart(f, items, 'manual', from, to));
    setManual('');
    ok('Added to your list ✓');
  };
  const listText = () => `🛒 ${family.name} · ${period}${showOther && other.length ? ' · also includes other saved items' : ''}\n${shown.map((i) => `• ${i.name}${i.quantity ? ` — ${i.quantity}` : ''}`).join('\n')}`;
  const mark = (id: string, done: boolean) => {
    update((f) => setCartBought(f, id, done, from, to));
    ok(done ? 'Marked as bought ✓ · Undo in Bought / already have' : 'Returned to your list ✓');
  };
  return (
    <Screen title="To buy" subtitle={`Meal ingredients · ${period}`} edges={['bottom']}>
      <Row wrap>
        <Chip label="Next 3 days" selected={from === todayKey() && to === addDays(from, 2)} onPress={() => { setFrom(todayKey()); setTo(addDays(todayKey(), 2)); setCustom(false); }} />
        <Chip label="Next 7 days" selected={from === todayKey() && to === addDays(from, 6)} onPress={() => { setFrom(todayKey()); setTo(addDays(todayKey(), 6)); setCustom(false); }} />
        <Chip label="Choose dates" selected={custom} onPress={() => setCustom(!custom)} />
      </Row>
      {custom ? <Card><Input label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} /><Input label="To (YYYY-MM-DD)" value={to} onChangeText={setTo} error={!validRange ? 'Use valid dates, with the end on or after the start.' : null} /></Card> : null}
      <Card tone="alt">
        <T bold>Review ingredients for these meals</T>
        <Button small kind="ghost" label={`${staplesOpen ? 'Hide' : 'View'} staples assumed at home (${family.staples.length})`} onPress={() => setStaplesOpen(!staplesOpen)} />
        {staplesOpen ? <T small>{family.staples.join(', ') || 'No staples saved'}</T> : null}
        <T small>Quantities depend on your recipe; add them to a list item.</T>
        {suggestions.map((name) => <Card key={name}>
          <Chip label={name} selected={!excluded.includes(name)} onPress={() => setExcluded(excluded.includes(name) ? excluded.filter((n) => n !== name) : [...excluded, name])} />
          <T small muted>{forPeriod(name)?.meals.map((m) => `${prettyDate(m.date)} · ${SLOT_LABEL[m.slot]} · ${m.dish}`).join('\n')}</T>
          <Button small kind="ghost" label={`Already have ${name}`} onPress={() => add([name], true)} />
        </Card>)}
        {suggestions.length ? <Button label={`Add selected (${picked.length})`} blockedReason={!picked.length && 'Select at least one ingredient.'} onPress={() => add(picked)} /> : <T small>{needs.length ? 'These planned ingredients are on your list or covered by a purchase.' : 'No extra ingredients for this period. Plan meals to see their ingredients here.'}</T>}
      </Card>
      <Row wrap>
        <Input value={manual} onChangeText={setManual} placeholder="Add an item…" style={{ minWidth: 180, flex: 1 }} onSubmitEditing={addManual} />
        <Button small label="Add" onPress={addManual} />
      </Row>
      {!open.length ? <Empty emoji="🛒" title={suggestions.length ? 'Review ingredients above' : 'Your list is clear'} body={suggestions.length ? 'Choose what you need before adding it to your list.' : 'Bought items stay below so you can undo a tap.'} /> : null}
      {other.length ? <Button small kind="secondary" label={`${showOther ? 'Hide' : 'Show'} other saved items (${other.length})`} onPress={() => setShowOther(!showOther)} /> : null}
      {shown.map((i) => <Card key={i.id}>
        {!inPeriod(i) ? <T small muted>Other dates · {i.forDate ?? 'period not recorded'}</T> : null}
        <Row wrap>
          <Button small kind="secondary" label="Bought" accessibilityLabel={`Mark ${i.name} as bought`} onPress={() => mark(i.id, true)} />
          <T style={{ flex: 1 }}>{i.name}{i.quantity ? ` · ${i.quantity}` : ''}{i.source === 'cook' ? ' · from cook' : ''}</T>
        </Row>
        {editing === i.id ? <>
          <Input label="Item" value={editName} onChangeText={setEditName} />
          <Input label="Quantity" optional value={quantity} onChangeText={setQuantity} placeholder="e.g. 500 g, 2 packets" />
          <Button small label="Save item" blockedReason={!editName.trim() && 'Enter an item name.'} onPress={() => { update((f) => { const item = f.cart.find((x) => x.id === i.id)!; item.name = editName.trim().toLowerCase(); item.quantity = quantity.trim(); }); setEditing(null); ok('Item updated ✓'); }} />
        </> : <Row wrap>
          <Button small kind="ghost" label={`Edit ${i.name}`} onPress={() => { setEditing(i.id); setEditName(i.name); setQuantity(i.quantity ?? ''); }} />
          <Button small kind="secondary" label="Find on Blinkit" onPress={async () => { await Clipboard.setStringAsync(i.name); await Linking.openURL(blinkitSearch(i.name)); }} />
        </Row>}
      </Card>)}
      {bought.length ? <Card><H2>Bought / already have</H2>{bought.map((i) => <Row key={i.id}><T style={{ flex: 1 }}>✓ {i.name}</T><Button small kind="ghost" label={`Undo ${i.name}`} onPress={() => mark(i.id, false)} /></Row>)}<Button small kind="ghost" label="Hide bought items" onPress={() => { update((f) => { f.cart.forEach((i) => { if (i.done) i.archived = true; }); }); ok('Hidden. These purchases still cover their planned meals.'); }} /></Card> : null}
      {family.cart.some((i) => i.archived) ? <Button small kind="ghost" label="Show earlier purchases" onPress={() => update((f) => { f.cart.forEach((i) => { i.archived = false; }); })} /> : null}
      {shown.length ? <><H2>Hand off · {period}</H2><Row wrap>
        <Button label="WhatsApp list" onPress={() => shareOnWhatsApp(listText())} />
        <Button kind="secondary" label="Share…" onPress={() => shareMessage(listText())} />
        <Button kind="secondary" label="Copy list" onPress={() => copyText(listText(), 'List copied')} />
      </Row></> : null}
    </Screen>
  );
}
