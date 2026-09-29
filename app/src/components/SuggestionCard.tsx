import React, { useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';

import type { Suggestion } from '@/domain/types';
import { Button, Card, Row, T } from '@/ui/kit';
import { space, useColors } from '@/ui/theme';

const EFFORT = ['', 'Quick', 'Medium', 'Takes time'];

export function dishMeta(s: Suggestion['dish']): string {
  const bits = [EFFORT[s.effort]];
  if (s.diet === 'nonveg') bits.push('Non-veg');
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
}: {
  s: Suggestion;
  onAccept?: () => void;
  onNext?: () => void;
  onHide?: () => void;
  acceptLabel?: string;
  compact?: boolean;
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
  const top = [...s.drivers].filter((d) => !(d.key === 'C' && d.value === 30)).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 4);

  return (
    <Animated.View {...(onAccept || onNext ? pan.panHandlers : {})} style={{ transform: [{ translateX: x }, { rotate }] }}>
      <Card>
        {rankLabel ? (
          <T small muted bold>
            {rankLabel}
          </T>
        ) : null}
        <Row>
          <Text style={{ fontSize: compact ? 17 : 22, fontWeight: '800', color: c.text, flex: 1 }}>{s.dish.name}</Text>
          {s.novel ? (
            <View style={{ backgroundColor: c.warnSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
              <Text style={{ color: c.warn, fontSize: 11, fontWeight: '700' }}>NEW</Text>
            </View>
          ) : null}
        </Row>
        <T muted small>
          {dishMeta(s.dish)}
        </T>
        <T>{s.reason}</T>
        <Pressable onPress={() => setWhy(!why)} accessibilityRole="button" hitSlop={8}>
          <Text style={{ color: c.primary, fontWeight: '600', fontSize: 13 }}>{why ? 'Hide reasons' : 'Why this?'}</Text>
        </Pressable>
        {why ? (
          <View style={{ gap: 4, paddingVertical: 4 }}>
            {top.map((d, i) => (
              <Row key={i}>
                <Text style={{ width: 44, color: d.value >= 0 ? c.good : c.bad, fontWeight: '700' }}>
                  {d.value > 0 ? '+' : ''}
                  {Math.round(d.value)}
                </Text>
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
