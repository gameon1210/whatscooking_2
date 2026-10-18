// "Our food week" (1.0.4): a private recap from meals already logged. Not shareable (decided 17 Oct 2026).
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { CUISINE_LABEL } from '@/domain/cuisines';
import { todayKey } from '@/domain/dates';
import { foodWeek, weekLabel, type WeekStats } from '@/domain/insights';
import { dishById } from '@/domain/recommender';
import type { Cuisine } from '@/domain/types';
import { useFamily } from '@/state/store';
import { Eyebrow } from '@/ui/editorial';
import { Button, Card, Empty, H2, Row, Screen, Segmented, T } from '@/ui/kit';
import { editorialFont, radius, space, useColors } from '@/ui/theme';

function Tile({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  const c = useColors();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`} style={{ flexGrow: 1, flexBasis: 140, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 2 }}>
      <Text style={{ color: c.text, fontSize: 28, fontWeight: '800', fontFamily: editorialFont }}>{value}</Text>
      <T small bold>
        {label}
      </T>
      {sub ? (
        <T small muted>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

/** Home-cooked meals per week, last four weeks: one series, values labelled on the bars. */
function WeekStrip({ weeks, today }: { weeks: WeekStats[]; today: string }) {
  const c = useColors();
  const max = Math.max(1, ...weeks.map((w) => w.meals));
  return (
    <View style={{ gap: space.sm }}>
      {weeks.map((w) => (
        <View key={w.start} accessible accessibilityLabel={`${weekLabel(w, today)}: ${w.homeCooked} cooked at home, ${w.orderedIn} ordered in`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <T small muted style={{ width: 118 }} numberOfLines={1}>
            {weekLabel(w, today)}
          </T>
          <View style={{ flex: 1, flexDirection: 'row', height: 14, alignItems: 'center', gap: 2 }}>
            {w.homeCooked ? <View style={{ width: `${(w.homeCooked / max) * 100}%`, height: 14, backgroundColor: c.primary, borderTopRightRadius: w.orderedIn ? 0 : 4, borderBottomRightRadius: w.orderedIn ? 0 : 4 }} /> : null}
            {w.orderedIn ? <View style={{ width: `${(w.orderedIn / max) * 100}%`, height: 14, backgroundColor: c.border, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} /> : null}
          </View>
          <T small style={{ width: 64, textAlign: 'right' }}>
            {w.homeCooked}
            {w.orderedIn ? ` + ${w.orderedIn}` : ''}
          </T>
        </View>
      ))}
      <Row wrap gap={space.md}>
        <Row gap={6}>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.primary }} />
          <T small muted>
            Cooked at home
          </T>
        </Row>
        <Row gap={6}>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.border }} />
          <T small muted>
            Ordered in
          </T>
        </Row>
      </Row>
    </View>
  );
}

export default function Insights() {
  const family = useFamily();
  const c = useColors();
  const [offset, setOffset] = useState<'0' | '-1'>('0');
  if (!family) return null;
  const today = todayKey();
  const w = foodWeek(family, today, Number(offset));
  const s = w.now;
  const cuisines = (Object.entries(s.cuisines) as [Cuisine, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <Screen title="Our food week" subtitle="Just for your family. Nothing here is shared.">
      <Segmented<'0' | '-1'> label="Which week" value={offset} onChange={setOffset} options={[{ value: '0', label: 'This week' }, { value: '-1', label: 'Last week' }]} />
      {!s.meals ? (
        <Empty emoji="📖" title={offset === '0' ? 'Nothing logged this week yet' : 'Nothing logged last week'} body="Stats come from meals you log or confirm. A meal from any day can be added in Log." />
      ) : (
        <>
          {w.isSunday && offset === '0' ? (
            <Card tone="alt">
              <Eyebrow>SUNDAY RECAP</Eyebrow>
              <Text style={{ fontFamily: editorialFont, color: c.text, fontSize: 24, lineHeight: 30 }}>
                {s.meals} meals together this week.
              </Text>
            </Card>
          ) : null}
          {w.nudge ? (
            <Card tone="alt">
              <T bold>{w.nudge.text}</T>
              <Button small label="See ideas for the next meal" onPress={() => router.navigate('/')} />
            </Card>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Tile value={s.meals} label="Meals logged" sub={`${s.homeCooked} at home · ${s.orderedIn} ordered in`} />
            <Tile value={`${s.rice} · ${s.roti}`} label="Rice · Roti" sub={`last week ${w.last.rice} · ${w.last.roti}`} />
            <Tile value={s.protein} label="Protein-packed" sub="dal, beans, paneer, eggs, meat" />
            <Tile value={s.greensDays} label="Days with greens" sub={`last week ${w.last.greensDays}`} />
            <Tile value={s.distinctDishes} label="Different dishes" sub={s.firsts.length ? `${s.firsts.length} new to the family` : 'all familiar favourites'} />
            <Tile value={`${s.veg} · ${s.egg} · ${s.nonveg}`} label="Veg · Egg · Non-veg" />
          </View>

          {w.badges.length ? (
            <>
              <H2>Little wins</H2>
              <Card>
                {w.badges.map((b) => (
                  <Row key={b.memberId + b.title}>
                    <Text style={{ fontSize: 24 }} importantForAccessibility="no">
                      {b.emoji}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <T bold>{b.title}</T>
                      <T small muted>
                        {b.detail}
                      </T>
                    </View>
                  </Row>
                ))}
              </Card>
            </>
          ) : null}

          {s.firsts.length ? (
            <>
              <H2>Firsts</H2>
              <T>{s.firsts.map((id) => dishById(family, id)?.name ?? id).join(', ')}</T>
            </>
          ) : null}

          {cuisines.length > 1 ? (
            <>
              <H2>Cuisines</H2>
              <T>{cuisines.map(([k, n]) => `${CUISINE_LABEL[k]} ${n}`).join(' · ')}</T>
            </>
          ) : null}
        </>
      )}

      <H2>Last four weeks</H2>
      <Card>
        <WeekStrip weeks={w.weeks} today={today} />
      </Card>
      {w.streak >= 2 ? <T muted>🔥 {w.streak} days in a row with a home-cooked meal.</T> : null}
      <T small muted>
        Counts use meals you logged or confirmed. “Protein-packed” means the meal had a protein food group; it isn’t a nutrition measurement.
      </T>
    </Screen>
  );
}
