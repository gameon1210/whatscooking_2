import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { DishPicker } from '@/components/DishPicker';
import { findPlanned, removePlan, upsertPlan } from '@/domain/actions';
import { dayNotes } from '@/domain/calendar';
import { addDays, prettyDate, shortDate, SLOT_LABEL, todayKey } from '@/domain/dates';
import { whatsappLink } from '@/domain/links';
import { dishById, nextDays } from '@/domain/recommender';
import { DraftRow, draftDay } from '@/state/draft';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, Row, Screen, T } from '@/ui/kit';
import { radius, space, useColors } from '@/ui/theme';

interface Cell extends DraftRow {
  date: string;
  planned: boolean;
}

/** FR-261: 7-day family calendar. Pinned meals stay; open slots fill with live suggestions. */
export default function Week() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const c = useColors();
  const [start, setStart] = useState(todayKey());
  const [edit, setEdit] = useState<Cell | null>(null);
  const [swapFrom, setSwapFrom] = useState<Cell | null>(null);

  const days = useMemo(() => {
    if (!family) return [];
    return nextDays(start, 7).map((date) => ({
      date,
      notes: dayNotes(family, date),
      cells: draftDay(family, date).map<Cell>((r) => {
        const p = findPlanned(family, date, r.slot, r.memberId);
        return { ...r, date, planned: !!p && p.status !== 'skipped' };
      }),
    }));
  }, [family, start]);

  if (!family) return null;

  const tap = (cell: Cell) => {
    if (swapFrom) {
      if (swapFrom.key.split(':')[0].startsWith('tiffin') === cell.key.split(':')[0].startsWith('tiffin') && !(swapFrom.date === cell.date && swapFrom.key === cell.key)) {
        update((f) => {
          upsertPlan(f, swapFrom.date, swapFrom.slot, cell.options, { memberId: swapFrom.memberId, source: 'calendar', pinned: true });
          upsertPlan(f, cell.date, cell.slot, swapFrom.options, { memberId: cell.memberId, source: 'calendar', pinned: true });
        });
      }
      setSwapFrom(null);
      return;
    }
    setEdit(cell);
  };

  const pinAll = () =>
    update((f) => {
      for (const d of days) for (const cell of d.cells) if (!cell.planned && cell.options.length) upsertPlan(f, d.date, cell.slot, cell.options, { memberId: cell.memberId, source: 'calendar' });
    });

  const shareWeek = () => {
    const lines = [`🗓️ ${family.name} — week of ${shortDate(start)}`, ''];
    for (const d of days) {
      lines.push(`*${prettyDate(d.date)}*${d.notes.length ? ` (${d.notes.join(', ')})` : ''}`);
      for (const cell of d.cells) if (cell.options[0]) lines.push(`  ${cell.label.replace(/^\S+\s/, '')}: ${dishById(family, cell.options[0])?.name}`);
    }
    Linking.openURL(whatsappLink(lines.join('\n')));
  };

  return (
    <Screen title="This week" subtitle={swapFrom ? 'Now tap the meal to swap with' : 'Tap a meal to pin or change it.'}>
      <Row wrap>
        <Button small kind="ghost" label="‹ Prev" onPress={() => setStart(addDays(start, -7))} />
        <Button small kind="ghost" label="Today" onPress={() => setStart(todayKey())} />
        <Button small kind="ghost" label="Next ›" onPress={() => setStart(addDays(start, 7))} />
      </Row>
      <Row wrap>
        <Button small label="Pin all suggestions" icon="📌" onPress={pinAll} />
        <Button small kind="secondary" label="Share week" icon="💬" onPress={shareWeek} />
        <Button small kind="secondary" label="Shopping list" icon="🛒" onPress={() => router.push('/cart')} />
      </Row>
      {days.map((d) => (
        <Card key={d.date}>
          <Row>
            <T bold style={{ flex: 1, fontSize: 17 }}>
              {prettyDate(d.date)}
            </T>
            <Pressable onPress={() => router.push({ pathname: '/tomorrow', params: { date: d.date } })} hitSlop={8}>
              <T small style={{ color: c.primary, fontWeight: '700' }}>
                Plan day
              </T>
            </Pressable>
          </Row>
          {d.notes.length ? (
            <T small style={{ color: c.warn }}>
              {d.notes.join(' · ')}
            </T>
          ) : null}
          <View style={{ gap: 6 }}>
            {d.cells.map((cell) => {
              const dish = cell.options[0] ? dishById(family, cell.options[0]) : undefined;
              const selected = swapFrom?.date === cell.date && swapFrom?.key === cell.key;
              return (
                <Pressable
                  key={cell.key}
                  onPress={() => tap(cell)}
                  onLongPress={() => setSwapFrom(cell)}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.label}: ${dish?.name ?? 'empty'}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    padding: 10,
                    borderRadius: radius.md,
                    backgroundColor: selected ? c.primarySoft : cell.planned ? c.goodSoft : c.cardAlt,
                    borderWidth: 1,
                    borderColor: selected ? c.primary : 'transparent',
                  }}>
                  <T small muted style={{ width: 118 }} numberOfLines={2}>
                    {cell.label}
                  </T>
                  <T bold={cell.planned} style={{ flex: 1, opacity: cell.planned ? 1 : 0.7 }} numberOfLines={2}>
                    {dish?.name ?? '—'}
                  </T>
                  <T small>{cell.planned ? '📌' : ''}</T>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
      <T small muted>
        Faded = live suggestion. 📌 = pinned. Long-press a meal, then tap another, to swap them.
      </T>

      {edit ? (
        <DishPicker
          visible
          family={family}
          slot={edit.slot}
          title={`${prettyDate(edit.date)} · ${SLOT_LABEL[edit.slot]}`}
          suggestions={edit.suggestions}
          initial={edit.planned ? edit.options : []}
          onClose={() => setEdit(null)}
          onCreateDish={(dd) => update((f) => void f.customDishes.push(dd))}
          onRemove={
            edit.planned
              ? () => {
                  const p = findPlanned(family, edit.date, edit.slot, edit.memberId);
                  if (p) update((f) => removePlan(f, p.id));
                  setEdit(null);
                }
              : undefined
          }
          onDone={(ids) => {
            update((f) => upsertPlan(f, edit.date, edit.slot, ids, { memberId: edit.memberId, source: 'calendar', pinned: true }));
            setEdit(null);
          }}
        />
      ) : null}
      <View style={{ height: space.xl }} />
    </Screen>
  );
}
