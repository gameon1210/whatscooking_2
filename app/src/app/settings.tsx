import { router } from 'expo-router';
import appMetadata from '../../package.json';
import React, { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { AiKeyGuide } from '@/components/AiKeyGuide';
import { CustomDishForm } from '@/components/CustomDishForm';
import { recheckPlans } from '@/domain/actions';
import { foodCalendarOn, hasCalendarRules } from '@/domain/calendar';
import { deriveAllergens } from '@/domain/allergens';
import { CITIES } from '@/domain/links';
import { dishById } from '@/domain/recommender';
import { CUISINES, familyCuisines } from '@/domain/cuisines';
import type { Family, Region, SlotId } from '@/domain/types';
import { removePhotos, shareTextFile } from '@/services/files';
import { cancelFamilyReminders, scheduleFamilyReminders } from '@/services/notify';
import { useFamily, useStore } from '@/state/store';
import { confirmThen, fail, ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, Divider, H2, Input, Row, Screen, Segmented, T, TimeInput, Toggle } from '@/ui/kit';

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
      e.forMemberIds?.length ? f.members.filter((m) => e.forMemberIds!.includes(m.id)).map((m) => m.name).join(' + ') : f.members.find((m) => m.id === e.memberId)?.name ?? 'Everyone',
      e.dishIds.map((id) => dishById(f, id)?.name ?? id).join(' + '),
      e.via,
      e.reactions.map((r) => `${f.members.find((m) => m.id === r.memberId)?.name}:${r.kind}`).join(' '),
    ]);
  return rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
}

const confirm = confirmThen;

/** A time setting that is saved only once it is a real time (D26); "9 pm" works too. */
function TimeField({ label, value, onValid }: { label: string; value: string; onValid: (v: string) => void }) {
  return <TimeInput label={label} value={value} placeholder="9:00 pm" errorSuffix={`Still using ${value}.`} onChange={(v) => v && onValid(v)} />;
}

export default function Settings() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const deleteFamily = useStore((s) => s.deleteFamily);
  const [editDish, setEditDish] = useState<string | null>(null);

  if (!family) return null;
  const s = family.settings;
  const set = (patch: Partial<Family['settings']>) => update((f) => void (f.settings = { ...f.settings, ...patch }));

  return (
    <Screen edges={['bottom']}>
      <T small muted>What’s Cooking {appMetadata.version} · usability fixes · 18 Oct 2026</T>
      <T small muted>
        Planning preferences save as you change them. AI and reminders have their own Save or Update buttons.
      </T>
      <Card tone="alt">
        <H2>Your kitchen, your way</H2>
        <T small muted>A family photo, a favourite colour and the sections you want to see at home.</T>
        <Button label="Personalise my home" onPress={() => router.push('/personalise')} />
      </Card>
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
        <TimeField label="Tomorrow-plan reminder" value={s.tomorrowTime} onValid={(tomorrowTime) => set({ tomorrowTime })} />
        <TimeField label="Cook Card reminder" value={s.cookCardTime} onValid={(cookCardTime) => set({ cookCardTime })} />
        <Button
          small
          kind="secondary"
          label="Update reminders"
          onPress={() =>
            scheduleFamilyReminders(useStore.getState().families[family.id])
              .then((problems) => (problems.length ? warn(problems.join('\n')) : Platform.OS === 'web' ? warn('Reminders work in the phone app, not in the browser.') : ok('Reminders updated ✓')))
              .catch(() => fail('Couldn’t schedule reminders. Check that notifications are allowed for this app.'))
          }
        />
        <Toggle
          label="Food calendar"
          hint={
            foodCalendarOn(family)
              ? 'On: fasts, Ekadashi, Navratri and no-non-veg days shape suggestions. Turning it off pauses them; nothing is deleted.'
              : hasCalendarRules(family)
                ? 'Paused: saved fasting and no-non-veg rules are kept but not used. Turn on to use them again.'
                : 'Off. Turn on if anyone keeps fasts or no-non-veg days; each person’s days are set in Family.'
          }
          value={foodCalendarOn(family)}
          onChange={(on) => {
            let notes: string[] = [];
            update((f) => {
              f.settings.foodCalendar = on;
              notes = recheckPlans(f);
            });
            if (notes.length) warn(`Food calendar on. ${notes.length} planned meal${notes.length > 1 ? 's' : ''} changed to fit fasting rules. ${notes[0]}`);
            else ok(on ? 'Food calendar on ✓ Set each person’s days in Family.' : 'Food calendar paused. Rules are kept for later.');
          }}
        />
        <T small muted bold>
          City (for weather)
        </T>
        <Row wrap>
          {CITIES.map((c) => (
            <Chip choice="radio" key={c.name} label={c.name} selected={s.city === c.name} onPress={() => set({ city: c.name })} />
          ))}
        </Row>
      </Card>

      <H2>Cuisines you cook</H2>
      <Card>
        <T small muted>
          Suggestions come from these, plus anything you’ve already cooked and dishes you added yourself.
        </T>
        <Row wrap>
          {CUISINES.map((x) => {
            const on = familyCuisines(family).includes(x.id);
            return (
              <Chip
                key={x.id}
                choice="checkbox"
                label={`${x.emoji} ${x.label}`}
                selected={on}
                onPress={() => {
                  const cur = familyCuisines(family);
                  if (on && cur.length === 1) return warn('Keep at least one cuisine, so there’s something to suggest.');
                  set({ cuisines: on ? cur.filter((y) => y !== x.id) : [...cur, x.id] });
                }}
              />
            );
          })}
        </Row>
        {familyCuisines(family).includes('indian') ? (
          <>
            <T small muted bold>
              Indian dishes from
            </T>
            <Segmented<Region>
              label="Indian dishes from"
              value={family.region}
              onChange={(region) => update((f) => void (f.region = region))}
              options={[
                { value: 'south', label: 'South Indian' },
                { value: 'north', label: 'North Indian' },
                { value: 'general', label: 'Both' },
              ]}
            />
          </>
        ) : null}
      </Card>

      <H2>Suggestions</H2>
      <Card>
        <T small muted bold>
          How often would you like something new?
        </T>
        <Row wrap>
          {[0, 20, 40, 60, 80, 100].map((v) => (
            <Chip choice="radio" key={v} label={['Only familiar', 'Mostly familiar', 'A little variety', 'Often explore', 'Very adventurous', 'Surprise me'][v / 20]} selected={Math.round(s.adventurous / 20) * 20 === v} onPress={() => set({ adventurous: v })} />
          ))}
        </Row>
        <Toggle label="Vary meals across the week" hint="Prefer different dishes in a suggested week. Turn off if your family enjoys more repeats. Pinned choices stay as chosen." value={s.weekVariety !== false} onChange={(weekVariety) => set({ weekVariety })} />
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
            confirm('Clears swipes, reactions and leftover learning. Your meal history stays.', () => {
              update((f) => {
                f.events = [];
                f.leftoverDecisions = [];
                f.entries.forEach((e) => (e.reactions = []));
              });
              ok('Recommendations reset ✓');
            })
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
                <Button
                  small
                  kind="ghost"
                  label="Show again"
                  accessibilityLabel={`Show ${dishById(family, h.dishId)?.name} again`}
                  onPress={() => {
                    update((f) => void (f.hidden = f.hidden.filter((x) => x.dishId !== h.dishId)));
                    ok(`${dishById(family, h.dishId)?.name} is back in suggestions ✓`);
                  }}
                />
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
                      if (notes.length) warn(`Saved ${d.name}. ${notes[0]}`);
                      else ok(`Saved ${d.name} ✓`);
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

      <H2>AI photo recognition (optional)</H2>
      <Card>
        <AiKeyGuide compact />
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
              const others = Object.values(useStore.getState().families).filter((f) => f.id !== family.id).flatMap((f) => [f.settings.home?.photoUri, ...f.entries.map((e) => e.photoUri)]);
              removePhotos([family.settings.home?.photoUri, ...family.entries.map((e) => e.photoUri)], others);
              cancelFamilyReminders(family.id).catch(() => {});
              deleteFamily(family.id);
              ok(`${family.name} and its data were deleted`);
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
