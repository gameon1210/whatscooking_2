import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Linking } from 'react-native';

import { SuggestionCard } from '@/components/SuggestionCard';
import { logMeal } from '@/domain/actions';
import { todayKey } from '@/domain/dates';
import { zomatoSearch } from '@/domain/links';
import { recommend } from '@/domain/recommender';
import { useFamily, useStore } from '@/state/store';
import { Empty, Screen, T } from '@/ui/kit';

/** FR-255: a tired evening — order in, still within everyone's rules and recent pattern. */
export default function OrderIn() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const h = new Date().getHours();
  const slot = h < 16 ? 'lunch' : 'dinner';
  const list = useMemo(() => (family ? recommend({ family, date: todayKey(), slot, orderIn: true, count: 3 }) : []), [family, slot]);
  if (!family) return null;

  return (
    <Screen title="Order in" subtitle="Dishes that fit today’s rules and haven’t been eaten lately." edges={['bottom']}>
      {!list.length ? <Empty emoji="🛵" title="Nothing fits today’s rules" body="Fasting or Jain rules may rule out restaurant dishes today." /> : null}
      {list.map((s) => (
        <SuggestionCard
          key={s.dish.id}
          s={s}
          acceptLabel="Open Zomato"
          onAccept={async () => {
            await Clipboard.setStringAsync(s.dish.name);
            Linking.openURL(zomatoSearch(s.dish.name, family.settings.city));
          }}
          extra={{
            label: 'Log as ordered in',
            onPress: () => {
              update((f) => logMeal(f, { date: todayKey(), slot, dishIds: [s.dish.id], via: 'order', orderedIn: true }));
              router.back();
            },
          }}
        />
      ))}
      <T small muted>
        Log the order so your history stays complete. The dish name is copied, in case Zomato opens on its home page.
      </T>
    </Screen>
  );
}
