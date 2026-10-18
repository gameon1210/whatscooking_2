import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DishPicker } from '@/components/DishPicker';
import { tryUpsertPlan } from '@/domain/actions';
import { preparationNotes } from '@/domain/guidance';
import { dayNotes } from '@/domain/calendar';
import { addDays, prettyDate, todayKey } from '@/domain/dates';
import { dishById } from '@/domain/recommender';
import { anyCook, cookOnDuty } from '@/domain/rules';
import { DraftRow, draftDay } from '@/state/draft';
import { scheduleCookReminder } from '@/services/notify';
import { useFamily, useStore } from '@/state/store';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Row, Screen, T } from '@/ui/kit';
import { space, useColors } from '@/ui/theme';

export default function Tomorrow() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? addDays(todayKey(), 1);
  const family = useFamily();
  const update = useStore((s) => s.update);
  const c = useColors();
  const initial = useMemo(() => (family ? draftDay(family, date, useStore.getState().chips) : []), [family?.id, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rows, setRows] = useState<DraftRow[]>(initial);
  const [editing, setEditing] = useState<DraftRow | null>(null);
  if (!family) return null;
  if (date < todayKey()) return <Screen title="A past day" edges={['bottom']}><T>Past days show what was recorded. Log what you ate to add or correct this day.</T><Button label="Log a meal for this day" onPress={() => router.replace({ pathname: '/log', params: { day: date, n: String(Date.now()) } })} /></Screen>;
  const cook = cookOnDuty(family, date);
  const offDuty = !cook ? anyCook(family) : undefined;
  const notes = dayNotes(family, date);

  const confirm = async () => {
    const issues: string[] = [];
    let saved = 0;
    update((f) => {
      for (const r of rows) {
        if (!r.options.length) continue;
        // Every save goes through the hard-rule check; anything that doesn't fit is dropped (D05).
        const res = tryUpsertPlan(f, date, r.slot, r.options, { memberId: r.memberId, forMemberIds: r.memberIds.length ? r.memberIds : undefined, source: 'tomorrow' });
        if (res.error) issues.push(`${r.label.replace(/^\S+\s/, '')}: ${res.error}`);
        else {
          saved++;
          for (const d of res.dropped) issues.push(`${dishById(f, d.dishId)?.name ?? 'A dish'} left out: ${d.reason}`);
        }
      }
    });
    if (issues.length) warn(`Saved ${saved} meal${saved === 1 ? '' : 's'}. ${issues.slice(0, 2).join('\n')}`);
    else ok(`${prettyDate(date)} planned ✓ ${saved} meal${saved === 1 ? '' : 's'}`);
    if (cook) {
      await scheduleCookReminder(useStore.getState().families[family.id]).catch(() => null);
      router.replace({ pathname: '/cook-card', params: { date } });
    } else router.back();
  };

  return (
    <Screen title={prettyDate(date)} subtitle="Confirm in one tap, or tap a meal to change it." edges={['bottom']}>
      {notes.length ? (
        <Card tone="warn">
          <T small>{notes.join(' · ')}</T>
        </Card>
      ) : null}
      {rows.map((r) => (
        <Pressable key={r.key} onPress={() => setEditing(r)} accessibilityRole="button" accessibilityLabel={`Change ${r.label}`}>
          <Card>
            <Row>
              <T small bold muted style={{ flex: 1 }}>
                {r.label}
              </T>
              <T small style={{ color: c.primary, fontWeight: '700' }}>
                Change
              </T>
            </Row>
            <T bold style={{ fontSize: 18 }}>
              {r.options[0] ? dishById(family, r.options[0])?.name : 'Nothing fits — tap to choose'}
            </T>
            {r.options.length > 1 ? (
              <T small muted>
                Alternatives: {r.options.slice(1).map((id) => dishById(family, id)?.name).join(', ')}
              </T>
            ) : null}
            {preparationNotes(family, { date, slot: r.slot, memberId: r.memberId, forMemberIds: r.memberIds }, r.options).map((note) => <T key={note} small bold style={{ color: c.warn }}>{note}</T>)}
            {r.suggestions[0] && r.options[0] === r.suggestions[0].dish.id ? (
              <T small muted numberOfLines={1}>
                {r.suggestions[0].reason}
              </T>
            ) : null}
          </Card>
        </Pressable>
      ))}
      <View style={{ gap: space.sm }}>
        <Button label={cook ? 'Confirm all and make Cook Card' : 'Confirm all'} icon="✓" onPress={confirm} blockedReason={!rows.some((r) => r.options.length) && 'Nothing to confirm yet: tap a meal and choose a dish.'} />
        <T small muted>
          {cook ? `${cook.name} gets your 1st choice, 2nd choice and a backup for each meal.` : offDuty ? `${offDuty.name} isn’t working that day, so no Cook Card is needed.` : 'Add a cook in Family to send Cook Cards.'}
        </T>
      </View>
      {editing ? (
        <DishPicker
          visible
          family={family}
          slot={editing.slot}
          date={date}
          memberId={editing.memberId}
          memberIds={editing.memberIds}
          title={editing.label}
          suggestions={editing.suggestions}
          initial={editing.options}
          onClose={() => setEditing(null)}
          onCreateDish={(d) => update((f) => void (f.customDishes = [...f.customDishes.filter((x) => x.id !== d.id), d]))}
          onDone={(ids) => {
            setRows(rows.map((r) => (r.key === editing.key ? { ...r, options: ids } : r)));
            setEditing(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
