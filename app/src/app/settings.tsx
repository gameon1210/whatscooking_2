import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';

import { CustomDishForm } from '@/components/CustomDishForm';
import { recheckPlans } from '@/domain/actions';
import { deriveAllergens } from '@/domain/allergens';
import { validHHMM } from '@/domain/dates';
import { CITIES } from '@/domain/links';
import { dishById } from '@/domain/recommender';
import type { Family, SlotId } from '@/domain/types';
import { removePhotos, shareTextFile } from '@/services/files';
import { DEFAULT_MODEL, getApiKey, getModel, setApiKey, setModel } from '@/services/llm';
import { cancelFamilyReminders, scheduleFamilyReminders } from '@/services/notify';
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

/** A time setting that is saved only while it is a valid HH:MM (D26). */
function TimeField({ label, value, onValid }: { label: string; value: string; onValid: (v: string) => void }) {
  const [text, setText] = useState(value);
  const bad = !validHHMM(text);
  return (
    <Input
      label={label}
      value={text}
      keyboardType="numbers-and-punctuation"
      placeholder="21:00"
      error={bad ? `Use 24-hour HH:MM, for example 21:00. Still using ${value}.` : null}
      onChangeText={(t) => {
        setText(t);
        if (validHHMM(t)) onValid(t.trim());
      }}
    />
  );
}

export default function Settings() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const deleteFamily = useStore((s) => s.deleteFamily);
  const showToast = useStore((s) => s.showToast);
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [editDish, setEditDish] = useState<string | null>(null);

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
        <TimeField label="Tomorrow-plan reminder (HH:MM)" value={s.tomorrowTime} onValid={(tomorrowTime) => set({ tomorrowTime })} />
        <TimeField label="Cook Card reminder (HH:MM)" value={s.cookCardTime} onValid={(cookCardTime) => set({ cookCardTime })} />
        <Button
          small
          kind="secondary"
          label="Update reminders"
          onPress={() =>
            scheduleFamilyReminders(useStore.getState().families[family.id])
              .then((problems) => showToast(problems.length ? problems.join('\n') : Platform.OS === 'web' ? 'Reminders work in the phone app, not in the browser.' : 'Reminders updated.'))
              .catch(() => showToast('Couldn’t schedule reminders. Check that notifications are allowed for this app.'))
          }
        />
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
        <Toggle
          label="Pause learning"
          hint="Suggestions freeze as they are now. Meals, reactions and swipes logged while paused are ignored — including “made yesterday” — until you turn this off."
          value={s.learningPaused}
          onChange={(learningPaused) => set({ learningPaused, learningPausedAt: learningPaused ? new Date().toISOString() : undefined })}
        />
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

      {family.customDishes.length ? (
        <>
          <H2>Dishes you added</H2>
          <Card>
            <T small muted>
              A dish you added is only suggested, or planned for someone with food rules, once its diet and allergens are confirmed.
            </T>
            {family.customDishes.map((d) => (
              <View key={d.id} style={{ gap: 6 }}>
                <Row>
                  <T style={{ flex: 1 }}>
                    {d.name}
                    {d.unverified ? '  · needs details' : ''}
                  </T>
                  <Button small kind={d.unverified ? 'primary' : 'ghost'} label={d.unverified ? 'Confirm' : 'Edit'} onPress={() => setEditDish(editDish === d.id ? null : d.id)} />
                </Row>
                {editDish === d.id ? (
                  <CustomDishForm
                    name={d.name}
                    initial={d.unverified ? undefined : { diet: d.diet, allergens: d.allergens ?? [], onionGarlic: d.onionGarlic, spice: d.spice }}
                    onCancel={() => setEditDish(null)}
                    onConfirm={(meta) => {
                      let notes: string[] = [];
                      update((f) => {
                        const x = f.customDishes.find((y) => y.id === d.id);
                        if (!x) return;
                        x.diet = meta.diet;
                        x.onionGarlic = meta.onionGarlic;
                        x.spice = meta.spice;
                        x.unverified = false;
                        x.allergens = [...new Set([...meta.allergens, ...deriveAllergens({ ...x, allergens: undefined })])];
                        notes = recheckPlans(f);
                      });
                      if (notes.length) showToast(notes[0]);
                      setEditDish(null);
                    }}
                  />
                ) : null}
              </View>
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
          Everything is stored on this phone. Export it any time, or delete it — deleting also removes meal photos and reminders (India DPDP Act 2023).
        </T>
        <Row wrap>
          <Button small kind="secondary" label="Export JSON" onPress={() => shareTextFile(`${family.name.replace(/\W+/g, '_')}.json`, JSON.stringify(family, null, 2), 'application/json')} />
          <Button small kind="ghost" label="Privacy policy" onPress={() => Linking.openURL('https://gameon1210.github.io/whatscooking_2/privacy.html')} />
          <Button small kind="secondary" label="Export meals CSV" onPress={() => shareTextFile(`${family.name.replace(/\W+/g, '_')}_meals.csv`, toCsv(family), 'text/csv')} />
        </Row>
        <Divider />
        <Button
          kind="danger"
          label="Delete this family and all its data"
          onPress={() =>
            confirm(`Delete ${family.name}? Meals, photos and reminders are removed from this phone. This can’t be undone.`, () => {
              // Photos live outside the saved data, so remove them too (FR-293, D39),
              // unless another family on this phone still uses the same file.
              const others = Object.values(useStore.getState().families).filter((f) => f.id !== family.id).flatMap((f) => f.entries.map((e) => e.photoUri));
              removePhotos(family.entries.map((e) => e.photoUri), others);
              cancelFamilyReminders(family.id).catch(() => {});
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
