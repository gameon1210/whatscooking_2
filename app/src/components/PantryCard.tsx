import { router } from 'expo-router';
import React, { useState } from 'react';

import { resolveLeftover } from '@/domain/actions';
import { VEGETABLES } from '@/domain/catalog';
import { pantryItemKey, pantryItemName } from '@/domain/pantry';
import { dishById } from '@/domain/recommender';
import type { Family } from '@/domain/types';
import { useStore } from '@/state/store';
import { ok } from '@/ui/feedback';
import { Button, Card, Chip, H2, Input, Row, T } from '@/ui/kit';

function usualVegetables(family: Family): string[] {
  const counts = new Map<string, number>();
  for (const entry of family.entries.slice(-60)) {
    for (const id of entry.dishIds) {
      for (const vegetable of dishById(family, id)?.veg ?? []) {
        counts.set(vegetable, (counts.get(vegetable) ?? 0) + 1);
      }
    }
  }
  const frequent = [...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  return [...new Set([...frequent, ...VEGETABLES])].slice(0, 14);
}

export function PantryCard({ family }: { family: Family }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const updateFamily = useStore((s) => s.updateFamily);
  const useLeftovers = useStore((s) => s.chips.includes('leftovers'));
  const toggleChip = useStore((s) => s.toggleChip);
  const pantry = family.pantry ?? [];
  const keys = new Set(pantry.map(pantryItemKey));
  const quickAdd = open ? usualVegetables(family).filter((name) => !keys.has(pantryItemKey(name))) : [];
  const leftovers = family.leftovers.filter((item) => !item.resolved);

  const add = (raw: string, fromInput = false) => {
    const name = pantryItemName(raw);
    const key = pantryItemKey(name);
    if (!name) return setError('Enter an ingredient first.');
    let added = false;
    updateFamily(family.id, (current) => {
      const items = current.pantry ?? [];
      if (items.some((item) => pantryItemKey(item) === key)) return;
      current.pantry = [...items, name];
      added = true;
    });
    if (!added) return setError(`${name} is already in your pantry.`);
    if (fromInput) setDraft('');
    setError(null);
    ok(`Added ${name} to your pantry`);
  };

  const remove = (name: string) => {
    updateFamily(family.id, (current) => {
      current.pantry = (current.pantry ?? []).filter((item) => pantryItemKey(item) !== pantryItemKey(name));
    });
    setError(null);
    ok(`Removed ${name} from your pantry`);
  };

  return (
    <Card>
      <H2>In your kitchen</H2>
      <T small muted>{pantry.length ? `${pantry.length} ingredient${pantry.length === 1 ? '' : 's'} on hand` : 'Good meals start with what you have.'}</T>
      <Button small kind="ghost" label={open ? 'Close pantry' : 'Open pantry'} onPress={() => setOpen(!open)} />
      {open ? <>
        <T small muted>Today’s meal ideas use the ingredients you add here.</T>
        <Input
          label="Ingredient"
          placeholder="e.g. tofu or basmati rice"
          value={draft}
          maxLength={60}
          error={error}
          onChangeText={(value) => { setDraft(value); setError(null); }}
          onSubmitEditing={() => add(draft, true)}
        />
        <Button small label="Add ingredient" onPress={() => add(draft, true)} />
        <T bold>On hand</T>
        {pantry.length ? (
          <Row wrap>
            {pantry.map((name) => <Chip key={name} label={`${name} ×`} accessibilityLabel={`Remove ${name} from pantry`} onPress={() => remove(name)} />)}
          </Row>
        ) : <T small muted>Your pantry is empty. Type an ingredient or pick one below.</T>}
        {quickAdd.length ? <>
          <T bold>Quick add</T>
          <Row wrap>
            {quickAdd.map((name) => <Chip key={name} label={`+ ${name}`} accessibilityLabel={`Add ${name} to pantry`} onPress={() => add(name)} />)}
          </Row>
        </> : null}
        {leftovers.length ? <>
          <T bold>Leftovers</T>
          <Chip label="Use leftovers in meal ideas" selected={useLeftovers} onPress={() => toggleChip('leftovers')} />
          {leftovers.map((item) => {
            const name = dishById(family, item.dishId)?.name ?? 'Leftover dish';
            return <Row key={item.id}>
              <T style={{ flex: 1 }}>{name}</T>
              <Button small kind="ghost" label="Mark finished" accessibilityLabel={`Mark ${name} leftover finished`} onPress={() => {
                updateFamily(family.id, (current) => resolveLeftover(current, item.id, null));
                ok(`Removed ${name} from leftovers`);
              }} />
            </Row>;
          })}
        </> : null}
        <Row wrap>
          <Button small kind="secondary" label="Shopping list" onPress={() => router.push('/cart')} />
          <Button small kind="ghost" label="Order in" onPress={() => router.push('/order-in')} />
        </Row>
      </> : null}
    </Card>
  );
}
