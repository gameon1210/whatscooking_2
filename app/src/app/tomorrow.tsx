import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DishPicker } from '@/components/DishPicker';
import { upsertPlan } from '@/domain/actions';
import { dayNotes } from '@/domain/calendar';
import { addDays, prettyDate, todayKey } from '@/domain/dates';
import { dishById } from '@/domain/recommender';
import { DraftRow, draftDay } from '@/state/draft';
import { scheduleCookReminder } from '@/services/notify';
import { useFamily, useStore } from '@/state/store';
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
  const cook = family.members.find((m) => m.roles.includes('cook') && !m.optedOut);
  const notes = dayNotes(family, date);

  const confirm = async () => {
    update((f) => {
      for (const r of rows) if (r.options.length) upsertPlan(f, date, r.slot, r.options, { memberId: r.memberId, source: 'tomorrow' });
    });
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
                Then: {r.options.slice(1).map((id) => dishById(family, id)?.name).join(' → ')}
              </T>
            ) : null}
            {r.suggestions[0] && r.options[0] === r.suggestions[0].dish.id ? (
              <T small muted numberOfLines={1}>
                {r.suggestions[0].reason}
              </T>
            ) : null}
          </Card>
        </Pressable>
      ))}
      <View style={{ gap: space.sm }}>
        <Button label={cook ? 'Confirm all and make Cook Card' : 'Confirm all'} icon="✓" onPress={confirm} disabled={!rows.some((r) => r.options.length)} />
        <T small muted>
          {cook ? `${cook.name} gets your 1st choice, 2nd choice and a backup for each meal.` : 'Add a cook in Family to send Cook Cards.'}
        </T>
      </View>
      {editing ? (
        <DishPicker
          visible
          family={family}
          slot={editing.slot}
          title={editing.label}
          suggestions={editing.suggestions}
          initial={editing.options}
          onClose={() => setEditing(null)}
          onCreateDish={(d) => update((f) => void f.customDishes.push(d))}
          onDone={(ids) => {
            setRows(rows.map((r) => (r.key === editing.key ? { ...r, options: ids } : r)));
            setEditing(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
