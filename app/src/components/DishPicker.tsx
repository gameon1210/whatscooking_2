import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CustomDishForm } from '@/components/CustomDishForm';
import { checkPlan } from '@/domain/actions';
import { customDishId, makeCustomDish } from '@/domain/catalog';
import { allDishes } from '@/domain/recommender';
import type { Dish, Family, SlotId, Suggestion } from '@/domain/types';
import { Button, Input, Row, Sheet, T } from '@/ui/kit';
import { radius, useColors } from '@/ui/theme';

/**
 * Pick up to `max` dishes in ranked order. Mount it only while open, so it starts fresh.
 *
 * When `date` is given the picker is planning a meal: every dish is checked against
 * the hard rules of the people on that plate (diet, allergies, fasts, spice, box
 * fit) and dishes that break one can't be picked (D05). Without `date` it is used
 * for logging what was actually eaten, which is never blocked.
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
  memberId,
  memberIds,
  onDone,
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
  memberId?: string;
  memberIds?: string[];
  onDone: (ids: string[]) => void;
  onCreateDish?: (d: Dish) => void;
  onRemove?: () => void;
}) {
  const c = useColors();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>(initial);
  const [created, setCreated] = useState<Dish[]>([]);
  const [creating, setCreating] = useState<string | null>(null);

  const dishes = [...allDishes(family), ...created.filter((d) => !family.customDishes.some((x) => x.id === d.id))];
  const fam: Family = created.length ? { ...family, customDishes: dishes.filter((d) => d.custom) } : family;
  const byId = (id: string) => dishes.find((d) => d.id === id);
  const blockedReason = (d: Dish): string | null => {
    if (!date) return null;
    return checkPlan(fam, date, slot, [d.id], { memberId, forMemberIds: memberIds?.length ? memberIds : undefined }).problems[0]?.reason ?? null;
  };
  const search = q.trim().toLowerCase();
  const results = search
    ? dishes
        .filter((d) => [d.name, ...d.aliases].some((n) => n.toLowerCase().includes(search)))
        .sort((a, b) => Number(b.slots.includes(slot)) - Number(a.slots.includes(slot)))
        .slice(0, 12)
    : [];

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= max ? [...p.slice(0, max - 1), id] : [...p, id]));
  };

  const item = (d: Dish, reason?: string) => {
    const idx = picked.indexOf(d.id);
    const blocked = idx < 0 ? blockedReason(d) : null;
    return (
      <Pressable
        key={d.id}
        onPress={() => !blocked && toggle(d.id)}
        disabled={!!blocked}
        accessibilityRole="button"
        accessibilityLabel={blocked ? `${d.name}. Can’t be planned: ${blocked}` : d.name}
        accessibilityState={{ selected: idx >= 0, disabled: !!blocked }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 48, borderRadius: radius.md, backgroundColor: idx >= 0 ? c.primarySoft : c.card, borderWidth: 1, borderColor: c.border, opacity: blocked ? 0.55 : 1 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: idx >= 0 ? c.primary : c.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: idx >= 0 ? c.primaryText : c.muted, fontWeight: '800' }}>{blocked ? '⛔' : idx >= 0 ? idx + 1 : '+'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <T bold>{d.name}</T>
          {blocked ? (
            <T small style={{ color: c.bad }}>
              {blocked}
            </T>
          ) : reason ? (
            <T small muted numberOfLines={1}>
              {reason}
            </T>
          ) : d.unverified ? (
            <T small muted>
              Diet and allergens not confirmed yet
            </T>
          ) : null}
        </View>
      </Pressable>
    );
  };

  // Picked dishes that no longer fit the plate must be removed before saving.
  const pickedProblems = date ? checkPlan(fam, date, slot, picked, { memberId, forMemberIds: memberIds?.length ? memberIds : undefined }).problems : [];

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {max > 1 ? (
        <T small muted>
          Tap in order: 1st choice, 2nd, backup. The cook picks the first she can make.
        </T>
      ) : null}
      {picked.length ? (
        <Row wrap>
          {picked.map((id, i) => (
            <T key={id} small bold>
              {i + 1}. {byId(id)?.name}
              {i < picked.length - 1 ? '   ' : ''}
            </T>
          ))}
        </Row>
      ) : null}
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
            setCreated((x) => [...x.filter((y) => y.id !== d.id), d]);
            setCreating(null);
            setQ('');
            const fam2: Family = { ...family, customDishes: [...family.customDishes.filter((x) => x.id !== d.id), d] };
            const why = date ? checkPlan(fam2, date, slot, [d.id], { memberId, forMemberIds: memberIds?.length ? memberIds : undefined }).problems[0]?.reason : null;
            if (!why) toggle(d.id);
          }}
        />
      ) : (
        <Input placeholder="Search any dish…" value={q} onChangeText={setQ} autoCorrect={false} />
      )}
      {creating ? null : q.trim() ? (
        <View style={{ gap: 8 }}>
          {results.map((d) => item(d))}
          {onCreateDish && !results.some((d) => d.name.toLowerCase() === q.trim().toLowerCase()) && !dishes.some((d) => d.id === customDishId(q.trim())) ? (
            <Button kind="ghost" label={`Add “${q.trim()}” as a new dish`} onPress={() => setCreating(q.trim())} />
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <T small muted bold>
            Suggested
          </T>
          {suggestions.map((s) => item(s.dish, s.reason))}
          {picked.filter((id) => !suggestions.some((s) => s.dish.id === id)).map((id) => byId(id) && item(byId(id)!))}
        </View>
      )}
      {onRemove ? <Button kind="danger" label="Unpin this meal" onPress={onRemove} /> : null}
      <Button label={picked.length ? `Save ${picked.length} choice${picked.length > 1 ? 's' : ''}` : 'Save'} disabled={!picked.length || pickedProblems.length > 0} onPress={() => onDone(picked)} />
    </Sheet>
  );
}
