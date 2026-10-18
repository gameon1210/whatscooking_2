// Pick any past day for a meal (1.0.4): a month calendar plus a typed date.
// No native date-picker module, so it behaves the same on Android, iPhone and web.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { addDays, daysBetween, fromKey, LOG_BACK_DAYS, loggableDate, longDate, monthGrid, monthLong, parseDateInput, todayKey } from '@/domain/dates';
import { Button, Input, Row, Sheet, T } from '@/ui/kit';
import { radius, useColors } from '@/ui/theme';

const HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function DatePickerSheet({
  visible,
  value,
  onClose,
  onPick,
  title = 'Which day?',
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onPick: (k: string) => void;
  title?: string;
}) {
  const c = useColors();
  const today = todayKey();
  const start = fromKey(loggableDate(value) ? value : today);
  const [ym, setYm] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | null>(null);

  const oldest = addDays(today, -LOG_BACK_DAYS);
  const t = fromKey(today);
  const o = fromKey(oldest);
  const canNext = ym.y < t.getFullYear() || (ym.y === t.getFullYear() && ym.m < t.getMonth());
  const canPrev = ym.y > o.getFullYear() || (ym.y === o.getFullYear() && ym.m > o.getMonth());
  const move = (n: number) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  const pickTyped = () => {
    const k = parseDateInput(typed, today);
    if (!k) return setTypedError('Not a date yet. Try “12 Oct” or 2026-10-12.');
    if (daysBetween(today, k) > 0) return setTypedError('That’s in the future. Meals can be logged for today or earlier.');
    if (!loggableDate(k, today)) return setTypedError('That’s more than a year ago. Pick a day within the last year.');
    setTypedError(null);
    setTyped('');
    onPick(k);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button small kind="ghost" label="‹" accessibilityLabel="Previous month" blockedReason={!canPrev && 'Meals can be logged up to a year back.'} onPress={() => move(-1)} />
        <Text accessibilityRole="header" style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>
          {monthLong(ym.m)} {ym.y}
        </Text>
        <Button small kind="ghost" label="›" accessibilityLabel="Next month" blockedReason={!canNext && 'Future days can’t be logged.'} onPress={() => move(1)} />
      </Row>
      <View style={{ gap: 4 }}>
        <Row gap={4}>
          {HEAD.map((h, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', color: c.muted, fontSize: 12, fontWeight: '700' }} importantForAccessibility="no">
              {h}
            </Text>
          ))}
        </Row>
        {monthGrid(ym.y, ym.m).map((week, wi) => (
          <Row key={wi} gap={4}>
            {week.map((k, di) => {
              if (!k) return <View key={di} style={{ flex: 1, minHeight: 44 }} />;
              const ok = loggableDate(k, today);
              const sel = k === value;
              const isToday = k === today;
              return (
                <Pressable
                  key={k}
                  role="button"
                  accessibilityLabel={`${longDate(k)}${isToday ? ', today' : ''}${ok ? '' : ', not available'}`}
                  accessibilityState={{ selected: sel, disabled: !ok }}
                  disabled={!ok}
                  onPress={() => onPick(k)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.sm,
                    backgroundColor: sel ? c.primary : pressed ? c.chip : 'transparent',
                    borderWidth: isToday && !sel ? 1 : 0,
                    borderColor: c.primary,
                    opacity: ok ? 1 : 0.3,
                  })}>
                  <Text style={{ color: sel ? c.primaryText : c.text, fontWeight: sel || isToday ? '700' : '500' }}>{fromKey(k).getDate()}</Text>
                </Pressable>
              );
            })}
          </Row>
        ))}
      </View>
      <Input label="Or type a date" value={typed} onChangeText={(x) => { setTyped(x); setTypedError(null); }} placeholder="12 Oct" autoCapitalize="none" onSubmitEditing={pickTyped} error={typedError} />
      <Button small kind="secondary" label="Use this date" blockedReason={!typed.trim() && 'Type a date first, or tap a day above.'} onPress={pickTyped} />
      <T small muted>
        Today or any day in the last year.
      </T>
    </Sheet>
  );
}
