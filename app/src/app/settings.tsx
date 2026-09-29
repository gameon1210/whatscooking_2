import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { CITIES } from '@/domain/links';
import { dishById } from '@/domain/recommender';
import type { Family, SlotId } from '@/domain/types';
import { shareTextFile } from '@/services/files';
import { DEFAULT_MODEL, getApiKey, getModel, setApiKey, setModel } from '@/services/llm';
import { scheduleFamilyReminders } from '@/services/notify';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, Chip, Divider, H2, Input, Row, Screen, T, Toggle } from '@/ui/kit';

const SLOTS: { v: SlotId; l: string }[] = [
  { v: 'breakfast', l: 'Breakfast' },
  { v: 'lunch', l: 'Lunch' },
  { v: 'snack', l: 'Evening snack' },
  { v: 'dinner', l: 'Dinner' },
];

function toCsv(f: Family): string {
  const rows = [['date', 'slot', 'member', 'dishes', 'via', 'reactions']];
  for (const e of f.entries)
    rows.push([
      e.date,
      e.slot,
      f.members.find((m) => m.id === e.memberId)?.name ?? '',
      e.dishIds.map((id) => dishById(f, id)?.name ?? id).join(' + '),
      e.via,
      e.reactions.map((r) => `${f.members.find((m) => m.id === r.memberId)?.name}:${r.kind}`).join(' '),
    ]);
  return rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function confirm(msg: string, ok: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(msg)) ok();
    return;
  }
  Alert.alert('Are you sure?', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: ok }]);
}

export default function Settings() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const deleteFamily = useStore((s) => s.deleteFamily);
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [model, setModelState] = useState(DEFAULT_MODEL);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
    getModel().then(setModelState);
  }, []);

  if (!family) return null;
  const s = family.settings;
  const set = (patch: Partial<Family['settings']>) => update((f) => void (f.settings = { ...f.settings, ...patch }));

  return (
    <Screen edges={['bottom']}>
      <H2>Planning</H2>
      <Card>
        <T small muted bold>
          Meals you plan (tiffins come from each child’s school settings)
        </T>
        <Row wrap>
          {SLOTS.map((x) => (
            <Chip key={x.v} label={x.l} selected={s.planSlots.includes(x.v)} onPress={() => set({ planSlots: s.planSlots.includes(x.v) ? s.planSlots.filter((y) => y !== x.v) : [...s.planSlots, x.v] })} />
          ))}
        </Row>
        <Input label="Tomorrow-plan reminder (HH:MM)" value={s.tomorrowTime} onChangeText={(tomorrowTime) => set({ tomorrowTime })} />
        <Input label="Cook Card reminder (HH:MM)" value={s.cookCardTime} onChangeText={(cookCardTime) => set({ cookCardTime })} />
        <Button small kind="secondary" label="Update reminders" onPress={() => scheduleFamilyReminders(useStore.getState().families[family.id]).catch(() => {})} />
        <T small muted bold>
          City (for weather)
        </T>
        <Row wrap>
          {CITIES.map((c) => (
            <Chip key={c.name} label={c.name} selected={s.city === c.name} onPress={() => set({ city: c.name })} />
          ))}
        </Row>
        <Input label="Your WhatsApp number (cook replies go here)" keyboardType="phone-pad" value={s.plannerPhone ?? ''} onChangeText={(plannerPhone) => set({ plannerPhone })} />
      </Card>

      <H2>Suggestions</H2>
      <Card>
        <T small muted bold>
          Familiar ↔ Adventurous: {s.adventurous}
        </T>
        <Row wrap>
          {[0, 20, 40, 60, 80, 100].map((v) => (
            <Chip key={v} label={v === 0 ? 'Only known' : v === 100 ? 'Surprise me' : String(v)} selected={s.adventurous === v} onPress={() => set({ adventurous: v })} />
          ))}
        </Row>
        <Toggle label="Balance nudges" hint="A small boost for greens and millets when they’ve been missing (ICMR-NIN 2024)" value={s.balanceBoost} onChange={(balanceBoost) => set({ balanceBoost })} />
        <Toggle label="Pause learning" hint="Suggestions stop adapting to what you log and react to" value={s.learningPaused} onChange={(learningPaused) => set({ learningPaused })} />
        <Button
          small
          kind="ghost"
          label="Reset recommendations"
          onPress={() =>
            confirm('Clears swipes, reactions and leftover learning. Your meal history stays.', () =>
              update((f) => {
                f.events = [];
                f.leftoverDecisions = [];
                f.entries.forEach((e) => (e.reactions = []));
              }),
            )
          }
        />
      </Card>

      {family.hidden.length ? (
        <>
          <H2>Hidden dishes</H2>
          <Card>
            {family.hidden.map((h) => (
              <Row key={h.dishId}>
                <T style={{ flex: 1 }}>
                  {dishById(family, h.dishId)?.name} {h.until ? `(until ${h.until})` : '(forever)'}
                </T>
                <Button small kind="ghost" label="Show again" onPress={() => update((f) => void (f.hidden = f.hidden.filter((x) => x.dishId !== h.dishId)))} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      <H2>Staples you always keep</H2>
      <Card>
        <Input
          multiline
          value={family.staples.join(', ')}
          onChangeText={(t) => update((f) => void (f.staples = t.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)))}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />
        <T small muted>
          Ingredients here are never added to the shopping list.
        </T>
      </Card>

      <H2>AI (optional, the only paid service)</H2>
      <Card>
        <T small muted>
          A Google Gemini key enables photo recognition and smarter parsing of preferences. Everything else works without it. Get a key at aistudio.google.com.
        </T>
        <T small>{hasKey ? '✅ Key saved on this phone' : 'No key yet'}</T>
        <Input value={key} onChangeText={setKey} placeholder="Paste Gemini API key" secureTextEntry autoCapitalize="none" />
        <Input label="Model" value={model} onChangeText={setModelState} autoCapitalize="none" />
        <Row wrap>
          <Button
            small
            label="Save"
            onPress={async () => {
              if (key.trim()) await setApiKey(key.trim());
              await setModel(model);
              setKey('');
              setHasKey(!!(await getApiKey()));
            }}
          />
          {hasKey ? (
            <Button
              small
              kind="ghost"
              label="Remove key"
              onPress={async () => {
                await setApiKey(null);
                setHasKey(false);
              }}
            />
          ) : null}
        </Row>
      </Card>

      <H2>Cook page</H2>
      <Card>
        <Input label="Cook page address" value={s.cookPageBase} onChangeText={(cookPageBase) => set({ cookPageBase })} autoCapitalize="none" />
        <T small muted>
          A free static page (GitHub Pages) that shows the cook the menu and sends her reply back on WhatsApp.
        </T>
      </Card>

      <H2>Your data</H2>
      <Card>
        <T small muted>
          Everything is stored on this phone. Export it any time, or delete it (India DPDP Act 2023).
        </T>
        <Row wrap>
          <Button small kind="secondary" label="Export JSON" onPress={() => shareTextFile(`${family.name.replace(/\W+/g, '_')}.json`, JSON.stringify(family, null, 2), 'application/json')} />
          <Button small kind="secondary" label="Export meals CSV" onPress={() => shareTextFile(`${family.name.replace(/\W+/g, '_')}_meals.csv`, toCsv(family), 'text/csv')} />
        </Row>
        <Divider />
        <Button
          kind="danger"
          label="Delete this family and all its data"
          onPress={() =>
            confirm(`Delete ${family.name}? This can’t be undone.`, () => {
              deleteFamily(family.id);
              router.replace('/');
            })
          }
        />
      </Card>
      <View style={{ height: 24 }} />
      <T small muted style={{ textAlign: 'center' }}>
        What’s Cooking 2.0 · data stays on your device
      </T>
    </Screen>
  );
}
