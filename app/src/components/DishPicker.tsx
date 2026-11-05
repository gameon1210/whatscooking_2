import React, { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { browseDishes, DISH_PAGE_SIZE, type DishShelf } from '@/domain/dish-browse';
import { CustomDishForm } from '@/components/CustomDishForm';
import { checkPlan, recentDistinct, separatePlateChoice } from '@/domain/actions';
import { CUISINE_LABEL, familyCuisines } from '@/domain/cuisines';
import { customDishId, makeCustomDish } from '@/domain/catalog';
import { ORDER_DIET_LABEL, orderWarnings, preparationNotes } from '@/domain/guidance';
import { allDishes } from '@/domain/recommender';
import type { Dish, Family, SlotId, Suggestion } from '@/domain/types';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, ChipScroll, Input, Row, Sheet, T } from '@/ui/kit';
import { radius, useColors } from '@/ui/theme';

/**
 * Pick up to `max` dishes in ranked order. Mount it only while open, so it starts fresh.
 *
 * When `date` is given the picker is planning a meal: every dish is checked against
 * the hard rules of the people on that plate (diet, allergies, fasts, spice, box
 * fit). Restaurant orders show those concerns as warnings because dishes can be
 * for different people. Logging a meal also leaves all dishes selectable.
 */
export function DishPicker({
  visible,
  onClose,
  family,
  slot,
  title,
  suggestions = [],
  initial = [],
  max = 3,
  date,
  orderIn = false,
  focusSearch = false,
  initialQuery = '',
  memberId,
  memberIds,
  onDone,
  onPlanSeparately,
  onCreateDish,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  family: Family;
  slot: SlotId;
  title: string;
  suggestions?: Suggestion[];
  initial?: string[];
  max?: number;
  date?: string;
  orderIn?: boolean;
  focusSearch?: boolean;
  initialQuery?: string;
  memberId?: string;
  memberIds?: string[];
  onDone: (ids: string[]) => void;
  onPlanSeparately?: (dishId: string, diners: string[]) => void;
  onCreateDish?: (d: Dish) => void;
  onRemove?: () => void;
}) {
  const c = useColors();
  const [limit, setLimit] = useState(DISH_PAGE_SIZE);
  const [q, setQ] = useState(initialQuery);
  const searchRef = useRef<TextInput>(null);
  const [picked, setPicked] = useState<string[]>(initial);
  const [created, setCreated] = useState<Dish[]>([]);
  const [creating, setCreating] = useState<string | null>(null);
  const [separateDish, setSeparateDish] = useState<Dish | null>(null);
  /** browse without typing when there are no suggestions (1.0.4): recent dishes or one cuisine */
  const recentIds = recentDistinct(family, 16);
  const [shelf, setShelf] = useState<DishShelf>('all');

  const dishes = [...allDishes(family), ...created.filter((d) => !family.customDishes.some((x) => x.id === d.id))];
  const fam: Family = created.length ? { ...family, customDishes: dishes.filter((d) => d.custom) } : family;
  const byId = (id: string) => dishes.find((d) => d.id === id);
  const blockedReason = (d: Dish): string | null => {
    if (!date || orderIn) return null;
    return checkPlan(fam, date, slot, [d.id], { memberId, forMemberIds: memberIds?.length ? memberIds : undefined }).problems[0]?.reason ?? null;
  };
  const search = q.trim().toLowerCase();
  const results = search
    ? dishes
        .filter((d) => [d.name, ...d.aliases].some((n) => n.toLowerCase().includes(search)))
        .sort((a, b) => Number(b.slots.includes(slot)) - Number(a.slots.includes(slot)))

    : [];

  const toggle = (id: string) => {
    if (max === 1) { setPicked(picked.includes(id) ? [] : [id]); return; }
    if (!picked.includes(id) && picked.length >= max) return warn(`You have ${max} dishes selected. Remove one before adding another.`);
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };
  const browse = browseDishes(dishes, slot, shelf, recentIds, picked, suggestions.map((s) => s.dish.id));

  const separateChoice = (dish: Dish) => date && !memberId && onPlanSeparately
    ? separatePlateChoice(fam, date, slot, dish, memberIds)
    : null;

  const split = separateDish && separateChoice(separateDish);
  if (split && separateDish && onPlanSeparately) {
    const names = split.eligible.map((person) => person.name).join(', ');
    return (
      <Sheet visible={visible} onClose={onClose} title="Plan a separate plate" footer={
        <Button label="Save separate plate" onPress={() => onPlanSeparately(separateDish.id, split.eligible.map((person) => person.id))} />
      }>
        <Card tone="warn">
          <T bold>{separateDish.name}</T>
          <T>For {names}</T>
          {split.excluded.map(({ member, reason }) => <T key={member.id} small style={{ color: reason.includes('is allergic to') ? c.bad : c.warn }}>⚠ {reason}</T>)}
          <T small muted>Plan a different dish for the other diners.</T>
        </Card>
        <Button kind="ghost" label="Back to dishes" onPress={() => setSeparateDish(null)} />
      </Sheet>
    );
  }

  const item = (d: Dish, reason?: string) => {
    const idx = picked.indexOf(d.id);
    const blocked = idx < 0 ? blockedReason(d) : null;
    const separate = blocked ? separateChoice(d) : null;
    const splitText = separate ? `Plan separately for ${separate.eligible.map((person) => person.name).join(', ')}` : null;
    const warnings = orderIn && date ? orderWarnings(fam, d, date) : [];
    const diet = orderIn ? (d.unverified ? 'Diet unconfirmed' : ORDER_DIET_LABEL[d.diet]) : null;
    const label = blocked ? `${d.name}. ${blocked}. ${splitText ?? 'Can’t be planned for this plate'}` : [d.name, diet, ...warnings.map((note) => note.text)].filter(Boolean).join('. ');
    const caution = warnings.some((note) => note.tone === 'bad') ? c.bad : warnings.length || separate ? c.warn : c.border;
    return (
      <Pressable
        key={d.id}
        // A dish that breaks a rule still answers a tap, with the reason (1.0.2).
        onPress={() => {
          if (separate) { Keyboard.dismiss(); setSeparateDish(d); }
          else if (blocked) warn(`${d.name} can’t go on this plate: ${blocked}`);
          else toggle(d.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: idx >= 0 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 48, borderRadius: radius.md, backgroundColor: idx >= 0 ? c.primarySoft : separate ? c.warnSoft : c.card, borderWidth: 1, borderColor: caution, opacity: blocked && !separate ? 0.55 : 1 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: idx >= 0 ? c.primary : c.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: idx >= 0 ? c.primaryText : c.muted, fontWeight: '800' }}>{separate ? '⚠' : blocked ? '⛔' : idx >= 0 ? (orderIn ? '✓' : idx + 1) : '+'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <T bold>{d.name}</T>
          {diet ? <T small muted>{diet}</T> : null}
          {warnings.map((note) => <T key={note.text} small bold style={{ color: c[note.tone] }}>⚠ {note.text}</T>)}
          {date && !orderIn ? preparationNotes(fam, { date, slot, memberId, forMemberIds: memberIds }, [d.id]).map((n) => <T key={n} small bold style={{ color: c.warn }}>{n}</T>) : null}
          {blocked ? (
            <><T small style={{ color: separate ? c.warn : c.bad }}>{blocked}</T>{splitText ? <T small bold style={{ color: c.warn }}>{splitText}</T> : null}</>
          ) : reason ? (
            <T small muted numberOfLines={1}>
              {reason}
            </T>
          ) : d.unverified && !orderIn ? (
            <T small muted>
              Diet and allergens not confirmed yet
            </T>
          ) : null}
        </View>
      </Pressable>
    );
  };

  // Picked dishes that no longer fit the plate must be removed before saving.
  const pickedProblems = date && !orderIn ? checkPlan(fam, date, slot, picked, { memberId, forMemberIds: memberIds?.length ? memberIds : undefined }).problems : [];
  const countLabel = `${picked.length} dish${picked.length === 1 ? '' : 'es'}`;
  let doneLabel = date ? `Save ${picked.length} choice${picked.length === 1 ? '' : 's'}` : `Use ${countLabel}`;
  if (orderIn) {
    doneLabel = `Use ${countLabel} for this order`;
    if (!picked.length) doneLabel = initial.length ? 'Clear dishes' : 'Use selected dishes';
  }
  const needsDish = !picked.length && !(orderIn && initial.length);

  return (
    <Sheet large visible={visible} onClose={onClose} onShow={focusSearch ? () => searchRef.current?.focus() : undefined} title={title} footer={(<Button
        label={doneLabel}
        icon="✓"
        blockedReason={needsDish ? 'Tap a dish first, or search for one.' : pickedProblems.length ? `Remove ${byId(pickedProblems[0].dishId)?.name ?? 'the dish'} first: ${pickedProblems[0].reason}` : null}
        onPress={() => onDone(picked)}
      />)}>
      {orderIn ? (
        <T small muted>Choose dishes for everyone’s order. Warnings show who should avoid a dish or ask about its preparation.</T>
      ) : max > 1 && date ? (
        <T small muted>
          Tap in order: 1st choice, 2nd, backup. The cook picks the first she can make.
        </T>
      ) : max > 1 ? (
        <T small muted>
          Tap everything that was on the plate, up to {max} dishes.
        </T>
      ) : null}
      {picked.length ? <Row wrap>{picked.map((id, i) => {
        const name = byId(id)?.name ?? id;
        return <Chip key={id} choice="button" selected label={`${orderIn ? '' : `${i + 1}. `}${name} ×`} accessibilityLabel={`Remove ${orderIn ? name : `choice ${i + 1}: ${name}`}`} onPress={() => toggle(id)} />;
      })}</Row> : null}
      {pickedProblems.map((p) => (
        <Row key={p.dishId}>
          <T small style={{ color: c.bad, flex: 1 }}>
            {byId(p.dishId)?.name}: {p.reason}
          </T>
          <Button small kind="ghost" label="Remove" onPress={() => toggle(p.dishId)} />
        </Row>
      ))}
      {creating ? (
        <CustomDishForm
          name={creating}
          onCancel={() => setCreating(null)}
          onConfirm={(meta) => {
            const slots = [slot, 'lunch', 'dinner'].filter((v, i, a) => a.indexOf(v) === i) as SlotId[];
            const d = makeCustomDish(creating, slots, meta);
            if (slot.startsWith('tiffin')) {
              d.portable = true;
              if (slot === 'tiffin_short') d.dry = true;
            }
            onCreateDish?.(d);
            ok(`Added “${d.name}” to your dishes ✓`);
            setCreated((x) => [...x.filter((y) => y.id !== d.id), d]);
            setCreating(null);
            setQ('');
            const fam2: Family = { ...family, customDishes: [...family.customDishes.filter((x) => x.id !== d.id), d] };
            const why = date && !orderIn ? checkPlan(fam2, date, slot, [d.id], { memberId, forMemberIds: memberIds?.length ? memberIds : undefined }).problems[0]?.reason : null;
            if (!why) toggle(d.id);
          }}
        />
      ) : (
        <Input voice inputRef={searchRef} placeholder="Search any dish…" value={q} onChangeText={(v) => { setQ(v); setLimit(DISH_PAGE_SIZE); }} autoCorrect={false} />
      )}
      {creating ? null : q.trim() ? (
        <View style={{ gap: 8 }}>
          <T small muted>{Math.min(limit, results.length)} of {results.length} matching dishes</T>
          {results.slice(0, limit).map((d) => item(d))}
          {results.length > limit ? <Button small kind="secondary" label="Show more results" onPress={() => setLimit(limit + DISH_PAGE_SIZE)} /> : null}
          {onCreateDish && !results.some((d) => d.name.toLowerCase() === q.trim().toLowerCase()) && !dishes.some((d) => d.id === customDishId(q.trim())) ? (
            <Button kind="ghost" label={`Add “${q.trim()}” as a new dish`} onPress={() => setCreating(q.trim())} />
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <ChipScroll>
            <Chip choice="radio" label="All dishes" selected={shelf === 'all'} onPress={() => { setShelf('all'); setLimit(DISH_PAGE_SIZE); }} />
            {recentIds.length ? <Chip choice="radio" label="🕘 Recent" selected={shelf === 'recent'} onPress={() => { setShelf('recent'); setLimit(DISH_PAGE_SIZE); }} /> : null}
            <Chip choice="radio" label="Our own dishes" selected={shelf === 'own'} onPress={() => { setShelf('own'); setLimit(DISH_PAGE_SIZE); }} />
            {familyCuisines(family).map((x) => <Chip key={x} choice="radio" label={CUISINE_LABEL[x]} selected={shelf === x} onPress={() => { setShelf(x); setLimit(DISH_PAGE_SIZE); }} />)}
          </ChipScroll>
          {shelf === 'all' && suggestions.length ? <>
            <T small muted bold>Suggested for this meal</T>
            {suggestions.map((s) => item(s.dish, s.reason))}
            <T small muted bold>More dishes to explore</T>
          </> : null}
          <T small muted>{Math.min(limit, browse.length)} of {browse.length} {shelf === 'all' && suggestions.length ? 'more ' : ''}dishes · {picked.length} selected</T>
          {browse.slice(0, limit).map((d) => item(d))}
          {browse.length > limit ? <Button small kind="secondary" label={`Show more dishes (${browse.length - limit} remaining)`} onPress={() => setLimit(limit + DISH_PAGE_SIZE)} /> : null}
          {!browse.length && (shelf !== 'all' || !suggestions.length) ? <T small muted>{shelf === 'own' ? 'No own dishes yet. Search above to add one.' : 'No more dishes on this shelf. Try All dishes or search above.'}</T> : null}

        </View>
      )}
      {onRemove ? <Button kind="danger" label="Unpin this meal" onPress={onRemove} /> : null}

    </Sheet>
  );
}
