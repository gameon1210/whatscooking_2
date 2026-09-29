import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { makeCustomDish } from '@/domain/catalog';
import { allDishes } from '@/domain/recommender';
import type { Dish, Family, SlotId, Suggestion } from '@/domain/types';
import { Button, Input, Row, Sheet, T } from '@/ui/kit';
import { radius, useColors } from '@/ui/theme';

/** Pick up to `max` dishes in ranked order. Mount it only while open, so it starts fresh. */
export function DishPicker({
  visible,
  onClose,
  family,
  slot,
  title,
  suggestions = [],
  initial = [],
  max = 3,
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
  onDone: (ids: string[]) => void;
  onCreateDish?: (d: Dish) => void;
  onRemove?: () => void;
}) {
  const c = useColors();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>(initial);

  const dishes = allDishes(family);
  const byId = (id: string) => dishes.find((d) => d.id === id);
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
    return (
      <Pressable
        key={d.id}
        onPress={() => toggle(d.id)}
        accessibilityRole="button"
        accessibilityState={{ selected: idx >= 0 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: idx >= 0 ? c.primarySoft : c.card, borderWidth: 1, borderColor: c.border }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: idx >= 0 ? c.primary : c.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: idx >= 0 ? c.primaryText : c.muted, fontWeight: '800' }}>{idx >= 0 ? idx + 1 : '+'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <T bold>{d.name}</T>
          {reason ? (
            <T small muted numberOfLines={1}>
              {reason}
            </T>
          ) : null}
        </View>
      </Pressable>
    );
  };

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
      <Input placeholder="Search any dish…" value={q} onChangeText={setQ} autoCorrect={false} />
      {q.trim() ? (
        <View style={{ gap: 8 }}>
          {results.map((d) => item(d))}
          {onCreateDish && !results.some((d) => d.name.toLowerCase() === q.trim().toLowerCase()) ? (
            <Button
              kind="ghost"
              label={`Add “${q.trim()}” as a new dish`}
              onPress={() => {
                const d = makeCustomDish(q.trim(), [slot, 'lunch', 'dinner'].filter((v, i, a) => a.indexOf(v) === i) as SlotId[]);
                if (slot.startsWith('tiffin')) d.portable = true;
                onCreateDish(d);
                toggle(d.id);
                setQ('');
              }}
            />
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
      <Button label={picked.length ? `Save ${picked.length} choice${picked.length > 1 ? 's' : ''}` : 'Save'} disabled={!picked.length} onPress={() => onDone(picked)} />
    </Sheet>
  );
}
