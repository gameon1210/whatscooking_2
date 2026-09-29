import React, { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { deleteEntry, favourites, toggleReaction } from '@/domain/actions';
import { prettyDate, SLOT_EMOJI, SLOT_LABEL, SLOT_ORDER } from '@/domain/dates';
import { dishById } from '@/domain/recommender';
import type { MealEntry, ReactionKind } from '@/domain/types';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, Chip, ChipScroll, Empty, H2, Input, Row, Screen, Sheet, T } from '@/ui/kit';
import { space, useColors } from '@/ui/theme';

const REACT: { k: ReactionKind; l: string }[] = [
  { k: 'loved', l: '😍 Loved' },
  { k: 'ok', l: '🙂 OK' },
  { k: 'not_again', l: '🙅 Not again' },
];
const TIFFIN: { k: ReactionKind; l: string }[] = [
  { k: 'tiffin_empty', l: 'Empty' },
  { k: 'tiffin_half', l: 'Half' },
  { k: 'tiffin_full', l: 'Full' },
];

/** FR-280/281/243: timeline memory, favourites shelf and per-member reactions. */
export default function History() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const c = useColors();
  const [q, setQ] = useState('');
  const [who, setWho] = useState<string | null>(null);
  const [open, setOpen] = useState<MealEntry | null>(null);

  const groups = useMemo(() => {
    if (!family) return [];
    const s = q.trim().toLowerCase();
    const list = family.entries
      .filter((e) => !who || e.memberId === who || (!e.memberId && family.members.find((m) => m.id === who)?.eatsAtHome))
      .filter((e) => !s || e.dishIds.some((id) => dishById(family, id)?.name.toLowerCase().includes(s)))
      .sort((a, b) => (a.date === b.date ? SLOT_ORDER.indexOf(b.slot) - SLOT_ORDER.indexOf(a.slot) : a.date < b.date ? 1 : -1));
    const map = new Map<string, MealEntry[]>();
    for (const e of list) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()].slice(0, 60);
  }, [family, q, who]);

  if (!family) return null;
  const favs = favourites(family).slice(0, 10);
  const eaters = family.members.filter((m) => m.eatsAtHome);
  const current = open ? family.entries.find((e) => e.id === open.id) ?? null : null;

  return (
    <Screen title="Family food memory" subtitle={`${family.entries.length} meals remembered`}>
      {favs.length ? (
        <View style={{ gap: space.sm }}>
          <H2>Family favourites</H2>
          <ChipScroll>
            {favs.map((f) => (
              <Chip key={f.dishId} tone={f.safe ? 'good' : undefined} label={`${f.safe ? '🛡️ ' : ''}${dishById(family, f.dishId)?.name}`} />
            ))}
          </ChipScroll>
          <T small muted>
            🛡️ = safe choice: loved again and again.
          </T>
        </View>
      ) : null}

      <Input placeholder="Search dishes…" value={q} onChangeText={setQ} />
      <ChipScroll>
        <Chip label="Everyone" selected={!who} onPress={() => setWho(null)} />
        {family.members
          .filter((m) => m.eatsAtHome)
          .map((m) => (
            <Chip key={m.id} label={m.name} selected={who === m.id} onPress={() => setWho(m.id)} />
          ))}
      </ChipScroll>

      {!groups.length ? <Empty emoji="📖" title="Nothing here yet" body="Meals you log or confirm from the plan show up here." /> : null}
      {groups.map(([date, items]) => (
        <View key={date} style={{ gap: space.sm }}>
          <T bold muted small>
            {prettyDate(date).toUpperCase()}
          </T>
          {items.map((e) => (
            <Pressable key={e.id} onPress={() => setOpen(e)} accessibilityRole="button">
              <Card>
                <Row>
                  {e.photoUri ? (
                    <Image source={{ uri: e.photoUri }} style={{ width: 52, height: 52, borderRadius: 10 }} />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}>
                      <T style={{ fontSize: 24 }}>{SLOT_EMOJI[e.slot]}</T>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <T bold>{e.dishIds.map((id) => dishById(family, id)?.name ?? id).join(', ')}</T>
                    <T small muted>
                      {SLOT_LABEL[e.slot]}
                      {e.memberId ? ` · ${family.members.find((m) => m.id === e.memberId)?.name}` : ''}
                      {e.orderedIn ? ' · ordered in' : ''}
                      {!e.confirmed ? ' · from plan' : ''}
                    </T>
                    {e.reactions.length ? (
                      <T small>
                        {e.reactions
                          .map((r) => `${family.members.find((m) => m.id === r.memberId)?.name.split(' ')[0]} ${[...REACT, ...TIFFIN].find((x) => x.k === r.kind)?.l}`)
                          .join(' · ')}
                      </T>
                    ) : null}
                  </View>
                </Row>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}

      <Sheet visible={!!current} onClose={() => setOpen(null)} title={current ? current.dishIds.map((id) => dishById(family, id)?.name).join(', ') : ''}>
        {current ? (
          <>
            <T muted>
              {prettyDate(current.date)} · {SLOT_LABEL[current.slot]}
            </T>
            {(current.memberId ? eaters.filter((m) => m.id === current.memberId) : eaters).map((m) => (
              <View key={m.id} style={{ gap: 6 }}>
                <T bold>{m.name}</T>
                <Row wrap>
                  {(current.slot.startsWith('tiffin') ? TIFFIN : REACT).map((r) => (
                    <Chip key={r.k} label={r.l} selected={current.reactions.some((x) => x.memberId === m.id && x.kind === r.k)} onPress={() => update((f) => toggleReaction(f, current.id, m.id, r.k))} />
                  ))}
                </Row>
              </View>
            ))}
            <Button
              kind="danger"
              label="Delete this meal"
              onPress={() => {
                update((f) => deleteEntry(f, current.id));
                setOpen(null);
              }}
            />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
