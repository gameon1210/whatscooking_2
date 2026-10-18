import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DishPicker } from '@/components/DishPicker';
import { checkPlan, findPlanned, removePlan, tryUpsertPlan } from '@/domain/actions';
import { preparationNotes } from '@/domain/guidance';
import { dayNotes } from '@/domain/calendar';
import { addDays, prettyDate, shortDate, SLOT_LABEL, todayKey } from '@/domain/dates';
import { dishById } from '@/domain/recommender';
import { WeekCell as Cell, draftWeek } from '@/state/draft';
import { shareMessage, shareOnWhatsApp } from '@/services/share';
import { useFamily, useStore } from '@/state/store';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Row, Screen, Sheet, T } from '@/ui/kit';
import { radius, space, useColors } from '@/ui/theme';

/** FR-261: 7-day family calendar. Pinned meals stay; open slots fill with live suggestions. */
export default function Week() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const c = useColors();
  const [start, setStart] = useState(todayKey());
  const [edit, setEdit] = useState<Cell | null>(null);
  const [swapFrom, setSwapFrom] = useState<Cell | null>(null);
  const [preview, setPreview] = useState(false);

  const days = useMemo(() => {
    if (!family) return [];
    return draftWeek(family, start).map((d) => ({ ...d, notes: dayNotes(family, d.date) }));
  }, [family, start]);

  if (!family) return null;

  const showToast = warn;
  const optsOf = (cell: Cell) => ({ memberId: cell.memberId, forMemberIds: cell.memberIds.length ? cell.memberIds : undefined });
  const name = (id: string) => dishById(family, id)?.name ?? 'That dish';

  const tap = (cell: Cell, intent: string) => {
    if (cell.done) {
      setSwapFrom(null);
      if (cell.entryId) router.push({ pathname: '/log', params: { edit: cell.entryId, n: intent } });
      else router.push({ pathname: '/log', params: { day: cell.date, n: intent } });
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
          if (d.date >= todayKey() && !cell.done && !cell.planned && cell.options.length && !tryUpsertPlan(f, d.date, cell.slot, cell.options, { ...optsOf(cell), source: 'calendar' }).error) pinned++;
    });
    setPreview(false);
    if (pinned) ok(`Pinned ${pinned} meal${pinned > 1 ? 's' : ''} ✓`);
    else warn('Nothing new to pin: every meal this week is already pinned or has no suggestion.');
  };

  const weekText = () => {
    const lines = [`🗓️ ${family.name} — week of ${shortDate(start)}`, ''];
    for (const d of days) {
      lines.push(`*${prettyDate(d.date)}*${d.notes.length ? ` (${d.notes.join(', ')})` : ''}`);
      for (const cell of d.cells) if (cell.options[0]) lines.push(`  ${cell.label.replace(/^\S+\s/, '')}: ${dishById(family, cell.options[0])?.name} [${cell.status}]`);
    }
    return lines.join('\n');
  };

  return (
    <Screen title={`${shortDate(start)} – ${shortDate(addDays(start, 6))}`} subtitle={swapFrom ? 'Now tap the meal to swap with' : addDays(start, 6) < todayKey() ? 'Your recorded meals. Tap one to review or correct it.' : 'Review suggestions, then pin the meals you want.'}>
      <Row wrap>
        <Button small kind="ghost" label="‹ Prev" onPress={() => setStart(addDays(start, -7))} />
        <Button small kind="ghost" label="Today" onPress={() => setStart(todayKey())} />
        <Button small kind="ghost" label="Next ›" onPress={() => setStart(addDays(start, 7))} />
      </Row>
      <Row wrap>
        {days.some((d) => d.date >= todayKey() && d.cells.some((r) => !r.done && !r.planned && r.options.length)) ? <Button small label="Review and pin suggestions" icon="📌" onPress={() => setPreview(true)} /> : null}
        <Button small kind="secondary" label="WhatsApp week" icon="💬" accessibilityLabel="Share the week on WhatsApp" onPress={() => shareOnWhatsApp(weekText())} />
        <Button small kind="secondary" label="Share…" icon="↗" accessibilityLabel="Share the week with another app" onPress={() => shareMessage(weekText())} />
        <Button small kind="secondary" label="Shopping list" icon="🛒" onPress={() => router.push({ pathname: '/cart', params: { from: start, to: addDays(start, 6) } })} />
      </Row>
      {days.map((d) => (
        <Card key={d.date}>
          <Row>
            <T bold style={{ flex: 1, fontSize: 17 }}>
              {prettyDate(d.date)}
            </T>
            <Pressable onPress={() => d.date < todayKey() ? router.push({ pathname: '/log', params: { day: d.date, n: String(Date.now()) } }) : router.push({ pathname: '/tomorrow', params: { date: d.date } })} hitSlop={14} accessibilityRole="button" accessibilityLabel={`${d.date < todayKey() ? 'Log a meal for' : 'Plan'} ${prettyDate(d.date)}`} style={{ minHeight: 48, justifyContent: 'center' }}>
              <T small style={{ color: c.primary, fontWeight: '700' }}>
                {d.date < todayKey() ? 'Log a meal' : 'Plan day'}
              </T>
            </Pressable>
          </Row>
          {d.notes.length ? (
            <T small style={{ color: c.warn }}>
              {d.notes.join(' · ')}
            </T>
          ) : null}
          {!d.cells.length ? <T small muted>No meals recorded for this day.</T> : null}
          <View style={{ gap: 6 }}>
            {d.cells.map((cell) => {
              const dish = cell.options[0] ? dishById(family, cell.options[0]) : undefined;
              const selected = swapFrom?.date === cell.date && swapFrom?.key === cell.key;
              return (
                <Pressable
                  key={cell.key}
                  onPress={() => tap(cell, String(Date.now()))}
                  onLongPress={() => (cell.done || cell.date < todayKey() ? showToast('This meal is already logged. Correct it in Memory.') : setSwapFrom(cell))}
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
                  <View style={{ flex: 1, gap: 4 }}>
                    <T bold={cell.planned}>{cell.entryId ? cell.options.map((id) => dishById(family, id)?.name).join(', ') : dish?.name ?? '—'}</T>
                    <T small muted>{cell.status}</T>
                    {!cell.entryId ? preparationNotes(family, { date: cell.date, slot: cell.slot, memberId: cell.memberId, forMemberIds: cell.memberIds }, cell.options).map((note) => <T key={note} small style={{ color: c.warn }}>{note}</T>) : null}
                  </View>
                  <T small>{cell.done ? '✓' : cell.planned ? '📌' : ''}</T>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
      <T small muted>
        Suggestions become plans only when pinned. Logged meals and unconfirmed meals are labelled separately. Long-press a future meal, then tap another, to swap.
      </T>

      <Sheet visible={preview} onClose={() => setPreview(false)} title="Review the week" footer={<Button label="Confirm and pin these suggestions" onPress={pinAll} />}>
        <T small>Only the suggestions below will be pinned. Existing plans stay as chosen. You can change any suggestion before reviewing again.</T>
        {days.flatMap((d) => d.cells.filter((r) => d.date >= todayKey() && !r.done && !r.planned && r.options.length).map((r) => <Card key={`${d.date}:${r.key}`}><T bold>{prettyDate(d.date)} · {r.label}</T><T>{name(r.options[0])}</T>{preparationNotes(family, { date: d.date, slot: r.slot, memberId: r.memberId, forMemberIds: r.memberIds }, r.options).map((n) => <T key={n} small>{n}</T>)}</Card>))}
      </Sheet>
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
