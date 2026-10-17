import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DishPicker } from '@/components/DishPicker';
import { checkPlan, findPlanned, removePlan, tryUpsertPlan } from '@/domain/actions';
import { dayNotes } from '@/domain/calendar';
import { addDays, prettyDate, shortDate, SLOT_LABEL, todayKey } from '@/domain/dates';
import { dishById, nextDays } from '@/domain/recommender';
import { DraftRow, draftDay } from '@/state/draft';
import { shareMessage, shareOnWhatsApp } from '@/services/share';
import { useFamily, useStore } from '@/state/store';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Row, Screen, T } from '@/ui/kit';
import { radius, space, useColors } from '@/ui/theme';

interface Cell extends DraftRow {
  date: string;
  planned: boolean;
  /** already cooked or ordered in: fixed, corrected only from Memory */
  done: boolean;
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
        return { ...r, date, planned: !!p && p.status !== 'skipped', done: p?.status === 'cooked' || p?.status === 'ordered_in' };
      }),
    }));
  }, [family, start]);

  if (!family) return null;

  const showToast = warn;
  const optsOf = (cell: Cell) => ({ memberId: cell.memberId, forMemberIds: cell.memberIds.length ? cell.memberIds : undefined });
  const name = (id: string) => dishById(family, id)?.name ?? 'That dish';

  const tap = (cell: Cell) => {
    if (cell.done) {
      setSwapFrom(null);
      showToast('This meal is already logged. Correct it in Memory.');
      return;
    }
    if (swapFrom) {
      const same = swapFrom.date === cell.date && swapFrom.key === cell.key;
      if (!same && swapFrom.slot.startsWith('tiffin') === cell.slot.startsWith('tiffin')) {
        // Both destinations must pass every hard rule before anything moves (D05).
        const a = checkPlan(family, swapFrom.date, swapFrom.slot, cell.options, optsOf(swapFrom)).problems[0];
        const b = checkPlan(family, cell.date, cell.slot, swapFrom.options, optsOf(cell)).problems[0];
        const bad = a ?? b;
        if (bad) showToast(`Can’t swap: ${name(bad.dishId)} — ${bad.reason}`);
        else {
          let err: string | undefined;
          update((f) => {
            const one = tryUpsertPlan(f, swapFrom.date, swapFrom.slot, cell.options, { ...optsOf(swapFrom), source: 'calendar', pinned: true });
            const two = tryUpsertPlan(f, cell.date, cell.slot, swapFrom.options, { ...optsOf(cell), source: 'calendar', pinned: true });
            err = one.error ?? two.error;
          });
          if (err) showToast(err);
          else ok('Swapped ✓');
        }
      } else if (!same) showToast('Tiffins can only be swapped with tiffins.');
      setSwapFrom(null);
      return;
    }
    setEdit(cell);
  };

  const pinAll = () => {
    let pinned = 0;
    update((f) => {
      for (const d of days)
        for (const cell of d.cells)
          if (!cell.planned && cell.options.length && !tryUpsertPlan(f, d.date, cell.slot, cell.options, { ...optsOf(cell), source: 'calendar' }).error) pinned++;
    });
    if (pinned) ok(`Pinned ${pinned} meal${pinned > 1 ? 's' : ''} ✓`);
    else warn('Nothing new to pin: every meal this week is already pinned or has no suggestion.');
  };

  const weekText = () => {
    const lines = [`🗓️ ${family.name} — week of ${shortDate(start)}`, ''];
    for (const d of days) {
      lines.push(`*${prettyDate(d.date)}*${d.notes.length ? ` (${d.notes.join(', ')})` : ''}`);
      for (const cell of d.cells) if (cell.options[0]) lines.push(`  ${cell.label.replace(/^\S+\s/, '')}: ${dishById(family, cell.options[0])?.name}`);
    }
    return lines.join('\n');
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
        <Button small kind="secondary" label="WhatsApp week" icon="💬" accessibilityLabel="Share the week on WhatsApp" onPress={() => shareOnWhatsApp(weekText())} />
        <Button small kind="secondary" label="Share…" icon="↗" accessibilityLabel="Share the week with another app" onPress={() => shareMessage(weekText())} />
        <Button small kind="secondary" label="Shopping list" icon="🛒" onPress={() => router.push('/cart')} />
      </Row>
      {days.map((d) => (
        <Card key={d.date}>
          <Row>
            <T bold style={{ flex: 1, fontSize: 17 }}>
              {prettyDate(d.date)}
            </T>
            <Pressable onPress={() => router.push({ pathname: '/tomorrow', params: { date: d.date } })} hitSlop={14} accessibilityRole="button" accessibilityLabel={`Plan ${prettyDate(d.date)}`} style={{ minHeight: 48, justifyContent: 'center' }}>
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
                  onLongPress={() => (cell.done ? showToast('This meal is already logged. Correct it in Memory.') : setSwapFrom(cell))}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.label}: ${dish?.name ?? 'empty'}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    padding: 10,
                    minHeight: 48,
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
                  <T small>{cell.done ? '✓' : cell.planned ? '📌' : ''}</T>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
      <T small muted>
        Faded = live suggestion. 📌 = pinned. ✓ = already eaten. Long-press a meal, then tap another, to swap them.
      </T>

      {edit ? (
        <DishPicker
          visible
          family={family}
          slot={edit.slot}
          date={edit.date}
          memberId={edit.memberId}
          memberIds={edit.memberIds}
          title={`${prettyDate(edit.date)} · ${SLOT_LABEL[edit.slot]}`}
          suggestions={edit.suggestions}
          initial={edit.planned ? edit.options : []}
          onClose={() => setEdit(null)}
          onCreateDish={(dd) => update((f) => void (f.customDishes = [...f.customDishes.filter((x) => x.id !== dd.id), dd]))}
          onRemove={
            edit.planned
              ? () => {
                  const p = findPlanned(family, edit.date, edit.slot, edit.memberId);
                  if (p) update((f) => removePlan(f, p.id));
                  ok('Unpinned. A live suggestion fills the slot again.');
                  setEdit(null);
                }
              : undefined
          }
          onDone={(ids) => {
            let msg: string | null = null;
            let good = false;
            update((f) => {
              const res = tryUpsertPlan(f, edit.date, edit.slot, ids, { ...optsOf(edit), source: 'calendar', pinned: true });
              if (res.error) msg = res.error;
              else if (res.dropped.length) msg = `Pinned, but ${name(res.dropped[0].dishId)} was left out: ${res.dropped[0].reason}`;
              else good = true;
            });
            if (good) ok(`Pinned ${name(ids[0])} for ${prettyDate(edit.date)} ✓`);
            else if (msg) showToast(msg);
            setEdit(null);
          }}
        />
      ) : null}
      <View style={{ height: space.xl }} />
    </Screen>
  );
}
