import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { logMeal, toggleReaction } from '@/domain/actions';
import { prettyDate, SLOT_LABEL, todayKey } from '@/domain/dates';
import { dishById } from '@/domain/recommender';
import { tiffinKids } from '@/domain/rules';
import type { ReactionKind } from '@/domain/types';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, Chip, Empty, Row, Screen, T } from '@/ui/kit';
import { space } from '@/ui/theme';

const OPTS: { k: ReactionKind; l: string }[] = [
  { k: 'tiffin_empty', l: '😋 Empty' },
  { k: 'tiffin_half', l: '😐 Half' },
  { k: 'tiffin_full', l: '😕 Full' },
];

/** FR-242: how did each box come back? The strongest signal per child. */
export default function TiffinCheck() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  if (!family) return null;
  const date = todayKey();
  const kids = tiffinKids(family, date);
  const boxes = kids.flatMap((k) =>
    k.slots.map((slot) => {
      const entry = family.entries.find((e) => e.date === date && e.slot === slot && e.memberId === k.member.id);
      const plan = family.planned.find((p) => p.date === date && p.slot === slot && p.memberId === k.member.id);
      return { kid: k.member, slot, entry, plan };
    }),
  );

  const mark = (b: (typeof boxes)[number], kind: ReactionKind) => {
    update((f) => {
      let entry = f.entries.find((e) => e.date === date && e.slot === b.slot && e.memberId === b.kid.id);
      if (!entry) {
        const dish = b.plan?.chosenDishId ?? b.plan?.options[0];
        if (!dish) return;
        entry = logMeal(f, { date, slot: b.slot, memberId: b.kid.id, dishIds: [dish], via: 'auto', plannedId: b.plan?.id });
      }
      entry.confirmed = true;
      toggleReaction(f, entry.id, b.kid.id, kind);
    });
  };

  return (
    <Screen title="How did the tiffins come back?" subtitle={prettyDate(date)} edges={['bottom']}>
      {!boxes.length ? <Empty emoji="🍱" title="No school tiffins today" /> : null}
      {boxes.map((b) => {
        const dishId = b.entry?.dishIds[0] ?? b.plan?.chosenDishId ?? b.plan?.options[0];
        return (
          <Card key={b.kid.id + b.slot}>
            <T small bold muted>
              {b.kid.name.toUpperCase()} · {SLOT_LABEL[b.slot].toUpperCase()}
            </T>
            <T bold style={{ fontSize: 18 }}>
              {dishId ? dishById(family, dishId)?.name : 'Not planned'}
            </T>
            {dishId ? (
              <Row wrap>
                {OPTS.map((o) => (
                  <Chip key={o.k} label={o.l} selected={!!b.entry?.reactions.some((r) => r.kind === o.k)} onPress={() => mark(b, o.k)} />
                ))}
              </Row>
            ) : (
              <T small muted>
                Log it in Log to give feedback.
              </T>
            )}
          </Card>
        );
      })}
      <View style={{ gap: space.sm }}>
        <Button label="Done" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
