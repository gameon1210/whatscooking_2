import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { HideSheet } from '@/components/HideSheet';
import { SuggestionCard } from '@/components/SuggestionCard';
import { changeRequests, findPlanned, planDish, recordEvent, removePlan, tryUpsertPlan } from '@/domain/actions';
import { dayNotes } from '@/domain/calendar';
import { VEGETABLES } from '@/domain/catalog';
import { addDays, currentSlot, prettyDate, SLOT_EMOJI, SLOT_LABEL, SLOT_ORDER, todayKey } from '@/domain/dates';
import { dishById, recommendPlates } from '@/domain/recommender';
import { cookOnDuty, tiffinKids } from '@/domain/rules';
import type { ChipId, Dish, Family, SlotId } from '@/domain/types';
import { fetchWeather } from '@/services/weather';
import { useFamily, useStore } from '@/state/store';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, ChipScroll, H2, Row, Screen, T } from '@/ui/kit';
import { space, useColors } from '@/ui/theme';

const CHIPS: { id: ChipId; label: string }[] = [
  { id: 'quick', label: '⚡ Quick <20 min' },
  { id: 'low_energy', label: '😮‍💨 Low energy' },
  { id: 'leftovers', label: '♻️ Use leftovers' },
  { id: 'guests', label: '🎉 Guests' },
  { id: 'rainy', label: '🌧️ Rainy / cold' },
  { id: 'sick', label: '🤒 Light food' },
  { id: 'sunday', label: '⭐ Special' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function usualVeg(f: Family): string[] {
  const seen = new Map<string, number>();
  for (const e of f.entries.slice(-60)) for (const id of e.dishIds) dishById(f, id)?.veg.forEach((v) => seen.set(v, (seen.get(v) ?? 0) + 1));
  const top = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  return [...new Set([...top, ...VEGETABLES])].slice(0, 14);
}

export default function Today() {
  const family = useFamily();
  const c = useColors();
  const { chips, available, toggleChip, toggleAvailable, update, setChips } = useStore();
  const showToast = warn;
  const [swiped, setSwiped] = useState<string[]>([]);
  const [hide, setHide] = useState<Dish | null>(null);
  const [weather, setWeather] = useState<string | null>(null);

  const now = new Date();
  const { date, slot } = currentSlot(now, family?.settings.planSlots ?? ['breakfast', 'lunch', 'dinner']);
  const [override, setChosenSlot] = useState<SlotId | null>(null);
  const chosenSlot = override ?? slot;

  useEffect(() => {
    if (!family) return;
    fetchWeather(family.settings.city).then((w) => {
      if (!w) return;
      setWeather(`${Math.round(w.tempC)}°C${w.rainy ? ' · raining' : ''}`);
      if ((w.rainy || w.cold) && !useStore.getState().chips.includes('rainy')) setChips([...useStore.getState().chips, 'rainy']);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.settings.city]);

  const plates = useMemo(
    () => (family ? recommendPlates({ family, date, slot: chosenSlot, chips, available, exclude: swiped, count: 10 }) : []),
    [family, date, chosenSlot, chips, available, swiped],
  );

  if (!family) return <Screen title="What’s Cooking">{null}</Screen>;

  const planner = family.members.find((m) => m.roles.includes('planner'));
  const notes = dayNotes(family, date);
  const leftovers = family.leftovers.filter((l) => !l.resolved);
  const cook = cookOnDuty(family, date, chosenSlot);
  const anyCookTomorrow = cookOnDuty(family, addDays(todayKey(), 1));
  const requests = changeRequests(family);
  const slotsToday = family.settings.planSlots;
  const kidsTomorrow = tiffinKids(family, addDays(todayKey(), 1));

  const plateMember = (pi: number) => (pi > 0 ? plates[pi].memberIds[0] : undefined);
  const accept = (plateIdx: number, idx: number) => {
    const list = plates[plateIdx].suggestions;
    const chosen = list[idx];
    const ranked = [chosen, ...list.filter((_, i) => i !== idx)].slice(0, 3).map((s) => s.dish.id);
    let err: string | undefined;
    update((f) => {
      // Split plates keep everyone they are for (D09), and the save is rule-checked (D05).
      const res = tryUpsertPlan(f, date, chosenSlot, ranked, { source: 'today', memberId: plateMember(plateIdx), forMemberIds: plates.length > 1 ? plates[plateIdx].memberIds : undefined });
      err = res.error;
      if (!res.error) recordEvent(f, date, chosenSlot, chosen.dish.id, 'accepted');
    });
    if (err) showToast(err);
    else ok(`${chosen.dish.name} for ${SLOT_LABEL[chosenSlot].toLowerCase()} ✓`);
    setSwiped([]);
  };

  const next = (dishId: string) => {
    update((f) => recordEvent(f, date, chosenSlot, dishId, 'swiped'));
    setSwiped((s) => [...s, dishId]);
  };

  return (
    <Screen
      title={`${greeting()}${planner ? ', ' + planner.name.split(' ')[0] : ''}`}
      subtitle={`${family.name}${weather ? ' · ' + weather : ''}`}
      right={
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 24 }}>⚙️</T>
        </Pressable>
      }>
      {notes.length ? (
        <Card tone="warn">
          <T bold>Rules applied today</T>
          <T small>{notes.join(' · ')}</T>
        </Card>
      ) : null}

      {requests.map((p) => (
        <Card key={p.id} tone="warn">
          <T bold>
            Cook asked to change {dishById(family, p.options[0])?.name ?? 'a dish'}
          </T>
          <T small muted>
            {prettyDate(p.date)} · {SLOT_LABEL[p.slot]}. Pick an alternate, or keep the plan.
          </T>
          <Row wrap>
            {(p.alternates ?? []).map((id) => (
              <Button
                key={id}
                small
                label={dishById(family, id)?.name ?? id}
                onPress={() => {
                  let err: string | undefined;
                  update((f) => {
                    err = tryUpsertPlan(f, p.date, p.slot, [id, ...(p.alternates ?? []).filter((x) => x !== id)], { memberId: p.memberId, forMemberIds: p.forMemberIds }).error;
                  });
                  if (err) showToast(err);
                  else ok(`Changed to ${dishById(family, id)?.name ?? 'that dish'} ✓`);
                }}
              />
            ))}
            <Button small kind="ghost" label="Choose another" onPress={() => router.push({ pathname: '/tomorrow', params: { date: p.date } })} />
            <Button
              small
              kind="ghost"
              label="Keep it"
              onPress={() => {
                update((f) => {
                  const x = f.planned.find((y) => y.id === p.id);
                  if (x) {
                    x.changeRequested = false;
                    x.alternates = undefined;
                  }
                });
                ok('Kept the plan ✓');
              }}
            />
          </Row>
        </Card>
      ))}

      <ChipScroll>
        {slotsToday
          .slice()
          .sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b))
          .map((s) => (
            <Chip key={s} label={`${SLOT_EMOJI[s]} ${SLOT_LABEL[s]}`} selected={chosenSlot === s} onPress={() => setChosenSlot(s)} />
          ))}
      </ChipScroll>

      <View style={{ gap: space.sm }}>
        <ChipScroll>
          {CHIPS.map((ch) => (
            <Chip key={ch.id} label={ch.label} selected={chips.includes(ch.id)} onPress={() => toggleChip(ch.id)} />
          ))}
        </ChipScroll>
      </View>

      <Card tone="alt">
        <T bold>What’s in the kitchen?</T>
        <ChipScroll>
          {leftovers.map((l) => (
            <Chip key={l.id} tone="good" label={`♻️ Leftover ${dishById(family, l.dishId)?.name.toLowerCase()}`} selected={chips.includes('leftovers')} onPress={() => toggleChip('leftovers')} />
          ))}
          {usualVeg(family).map((v) => (
            <Chip key={v} label={v} selected={available.includes(v)} onPress={() => toggleAvailable(v)} />
          ))}
        </ChipScroll>
        <Row wrap>
          <Button small kind="secondary" label="Order missing items" icon="🛒" onPress={() => router.push('/cart')} />
          <Button small kind="secondary" label="Order in tonight" icon="🛵" onPress={() => router.push('/order-in')} />
        </Row>
      </Card>

      <H2>
        {SLOT_EMOJI[chosenSlot]} {SLOT_LABEL[chosenSlot]} {date === todayKey() ? '' : '· tomorrow'}
      </H2>

      {plates.map((plate, pi) => {
        const planned = findPlanned(family, date, chosenSlot, plateMember(pi));
        return (
          <View key={plate.label} style={{ gap: space.sm }}>
            {plates.length > 1 ? (
              <T small bold muted>
                {plate.label.toUpperCase()}
              </T>
            ) : null}
            {planned && planned.status !== 'skipped' ? (
              <Card tone="good">
                <T small muted bold>
                  {planned.status === 'cooked'
                    ? 'COOKED'
                    : planned.status === 'ordered_in'
                      ? 'ORDERED IN'
                      : planned.changeRequested
                        ? 'COOK ASKED TO CHANGE'
                        : planned.cookAckAt
                          ? 'COOK CONFIRMED'
                          : planned.status === 'sent'
                            ? 'SENT TO COOK'
                            : planned.cookOpenedAt
                              ? 'PLANNED · CARD NOT CONFIRMED SENT'
                              : 'PLANNED'}
                </T>
                <T bold style={{ fontSize: 20 }}>
                  {dishById(family, planDish(planned) ?? '')?.name}
                </T>
                {planned.options.length > 1 ? (
                  <T small muted>
                    Backup: {planned.options.filter((id) => id !== planDish(planned)).map((id) => dishById(family, id)?.name).join(', ')}
                  </T>
                ) : null}
                <Row wrap>
                  {cook && planned.status === 'planned' ? <Button small label="Send Cook Card" icon="💬" onPress={() => router.push({ pathname: '/cook-card', params: { date } })} /> : null}
                  {planned.status !== 'cooked' && planned.status !== 'ordered_in' ? (
                    <Button small kind="secondary" label="Log as cooked" onPress={() => router.push({ pathname: '/log', params: { date, slot: chosenSlot, dish: planDish(planned), plan: planned.id, member: planned.memberId ?? '' } })} />
                  ) : null}
                  {planned.status !== 'cooked' && planned.status !== 'ordered_in' ? <Button
                      small
                      kind="ghost"
                      label="Change"
                      onPress={() => {
                        update((f) => removePlan(f, planned.id));
                        ok('Plan cleared. Pick another below.');
                      }}
                    /> : null}
                </Row>
              </Card>
            ) : (
              <>
                {plate.suggestions[0] ? (
                  <SuggestionCard
                    s={plate.suggestions[0]}
                    onAccept={() => accept(pi, 0)}
                    onNext={() => next(plate.suggestions[0].dish.id)}
                    onHide={() => setHide(plate.suggestions[0].dish)}
                  />
                ) : (
                  <Card>
                    <T>No dish fits everyone’s rules for this slot. Try removing a chip, or add a custom dish from Log.</T>
                  </Card>
                )}
                {plate.suggestions.slice(1, 3).map((s, i) => (
                  <Pressable key={s.dish.id} onPress={() => accept(pi, i + 1)} accessibilityRole="button" accessibilityLabel={`Pick ${s.dish.name}`}>
                    <Card>
                      <Row>
                        <View style={{ flex: 1 }}>
                          <T bold>{s.dish.name}</T>
                          <T small muted numberOfLines={1}>
                            {s.reason}
                          </T>
                        </View>
                        <T style={{ color: c.primary, fontWeight: '700' }}>Pick</T>
                      </Row>
                    </Card>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        );
      })}
      <T small muted>
        Swipe the big card right to accept, left for the next idea.
      </T>

      <Card>
        <H2>Tomorrow</H2>
        <T muted small>
          {kidsTomorrow.length
            ? `Breakfast and ${kidsTomorrow.reduce((n, k) => n + k.slots.length, 0)} tiffin box(es) for ${kidsTomorrow.map((k) => k.member.name).join(', ')}.`
            : 'Settle tomorrow’s meals before bed.'}
        </T>
        <Row wrap>
          <Button label="Plan tomorrow" icon="🌙" onPress={() => router.push('/tomorrow')} />
          {cook || anyCookTomorrow ? <Button kind="secondary" label="Cook’s reply" onPress={() => router.push('/cook-reply')} /> : null}
        </Row>
      </Card>

      <HideSheet dish={hide} onClose={() => setHide(null)} />
    </Screen>
  );
}
