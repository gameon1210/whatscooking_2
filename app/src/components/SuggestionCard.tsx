import React, { useMemo, useState } from 'react';
import { Animated, PanResponder, Text, View } from 'react-native';

import type { Suggestion } from '@/domain/types';
import { Button, Card, LinkText, Row, T } from '@/ui/kit';
import { editorialFont, space, useColors } from '@/ui/theme';

const EFFORT = ['', 'Quick', 'Medium', 'Takes time'];

export function dishMeta(s: Suggestion['dish']): string {
  const bits = [EFFORT[s.effort]];
  if (s.diet === 'nonveg') bits.push('Non-veg');
  if (s.diet === 'vegan') bits.push('Vegan');
  if (s.diet === 'egg') bits.push('Egg');
  if (s.jainOk) bits.push('Jain-safe');
  if (s.vratOk) bits.push('Vrat');
  if (s.spice >= 2) bits.push('Spicy');
  return bits.join(' · ');
}

/** FR-201/202/206: swipe right to accept, left for the next one; "Why this?" shows drivers. */
export function SuggestionCard({
  s,
  onAccept,
  onNext,
  onHide,
  acceptLabel = 'Cook this',
  compact,
  rankLabel,
  extra,
  ordering,
}: {
  s: Suggestion;
  onAccept?: () => void;
  onNext?: () => void;
  onHide?: () => void;
  acceptLabel?: string;
  compact?: boolean;
  ordering?: boolean;
  rankLabel?: string;
  extra?: { label: string; onPress: () => void };
}) {
  const c = useColors();
  const [why, setWhy] = useState(false);
  const [x] = useState(() => new Animated.Value(0));
  const pan = useMemo(
    () =>
      PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: Animated.event([null, { dx: x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 110 && onAccept) {
          Animated.timing(x, { toValue: 500, duration: 160, useNativeDriver: false }).start(() => {
            x.setValue(0);
            onAccept();
          });
        } else if (g.dx < -110 && onNext) {
          Animated.timing(x, { toValue: -500, duration: 160, useNativeDriver: false }).start(() => {
            x.setValue(0);
            onNext();
          });
        } else Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
      },
    }),
    [x, onAccept, onNext],
  );
  const rotate = x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-6deg', '0deg', '6deg'] });
  const required = s.drivers.filter((d) => d.label.startsWith('Make it mild'));
  const top = [...s.drivers].filter((d) => !(d.key === 'C' && d.value === 30)).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5);

  return (
    <Animated.View {...(onAccept || onNext ? pan.panHandlers : {})} style={{ transform: [{ translateX: x }, { rotate }] }}>
      <Card>
        {rankLabel ? (
          <T small muted bold>
            {rankLabel}
          </T>
        ) : null}
        <Row>
          <Text style={{ fontFamily: compact ? undefined : editorialFont, fontSize: compact ? 17 : 29, lineHeight: compact ? 23 : 35, fontWeight: compact ? '700' : '400', color: c.text, flex: 1 }}>{s.dish.name}</Text>
          {s.novel ? (
            <View style={{ backgroundColor: c.warnSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
              <Text style={{ color: c.warn, fontSize: 11, fontWeight: '700' }}>NEW</Text>
            </View>
          ) : null}
        </Row>
        <Row>
          <View style={{ flex: 1, gap: 4 }}>
            <T muted small>{ordering ? dishMeta(s.dish).split(' · ').slice(1).join(' · ') : dishMeta(s.dish)}</T>
            <T small>{s.reason}</T>
          </View>
          <LinkText label={why ? 'Hide reasons' : 'Why this?'} onPress={() => setWhy(!why)} />
        </Row>
        {required.map((d) => <T key={d.label} small bold style={{ color: c.warn }}>⚠ {d.label}</T>)}
        {why ? (
          <View style={{ gap: 4, paddingVertical: 4 }}>
            {top.map((d, i) => (
              <Row key={i}>
                <T small style={{ flex: 1 }}>
                  {d.label}
                </T>
              </Row>
            ))}
          </View>
        ) : null}
        {onAccept || onNext || onHide || extra ? (
          <Row style={{ marginTop: space.xs }} wrap>
            {onAccept ? <Button label={acceptLabel} icon="✓" onPress={onAccept} small={compact} /> : null}
            {onNext ? <Button label="Next" kind="secondary" onPress={onNext} small={compact} /> : null}
            {extra ? <Button label={extra.label} kind="secondary" onPress={extra.onPress} small /> : null}
            {onHide ? <Button label="Hide" kind="ghost" onPress={onHide} small /> : null}
          </Row>
        ) : null}
      </Card>
    </Animated.View>
  );
}
