import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useMemo, useState } from 'react';
import { Linking, Text } from 'react-native';

import { markCardSent, registerCookCard } from '@/domain/actions';
import { buildCard } from '@/domain/cookcard';
import { addDays, prettyDate, SLOT_ORDER, todayKey, weekday, weekdayLong } from '@/domain/dates';
import { anyCook, cookOnDuty } from '@/domain/rules';
import { cancelCookReminder } from '@/services/notify';
import { copyText, shareMessage, shareOnWhatsApp } from '@/services/share';
import { ok } from '@/ui/feedback';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, Empty, Row, Screen, T } from '@/ui/kit';
import { useColors } from '@/ui/theme';

const TTS_LANG = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN' } as const;

/** FR-230..236: the free WhatsApp handoff to the cook. */
export default function CookCard() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? addDays(todayKey(), 1);
  const family = useFamily();
  const update = useStore((s) => s.update);
  const c = useColors();
  /** id of the card WhatsApp was opened with, until the planner says whether it went out */
  const [expanded, setExpanded] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);

  // Only the cook who works that day, and only the meals she cooks (FR-235, D35).
  const cook = family ? cookOnDuty(family, date) : undefined;
  const meals = useMemo(
    () =>
      (family?.planned ?? [])
        .filter((p) => p.date === date && (p.status === 'planned' || p.status === 'sent') && p.options.length && !!cook && (cook.cookSlots === undefined || cook.cookSlots.includes(p.slot)))
        .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)),
    [family, date, cook],
  );
  const built = useMemo(() => (family && cook && meals.length ? buildCard(family, cook, date, meals) : null), [family, cook, meals, date]);

  if (!family) return null;
  if (!cook) {
    const off = anyCook(family);
    return (
      <Screen edges={['bottom']}>
        {off ? (
          <Empty emoji="🗓️" title={`${off.name} is off on ${weekdayLong(weekday(date))}`} body="No Cook Card is needed. Change working days or leave in Family if that’s wrong." />
        ) : (
          <Empty emoji="👩‍🍳" title="No cook added" body="Add your cook in Family to send Cook Cards on WhatsApp." />
        )}
        <Button label="Go to Family" onPress={() => router.replace('/family')} />
      </Screen>
    );
  }
  if (!built)
    return (
      <Screen edges={['bottom']}>
        <Empty emoji="🗓️" title={`Nothing for ${cook.name} on ${prettyDate(date).toLowerCase()}`} body={`Plan the meals ${cook.name} cooks first.`} />
        <Button label="Plan now" onPress={() => router.replace({ pathname: '/tomorrow', params: { date } })} />
      </Screen>
    );

  const allSent = meals.every((m) => m.status === 'sent');
  const acked = meals.some((m) => m.cookAckAt);

  // Opening WhatsApp or the share sheet is not the same as sending (D36). Remember
  // the card so the reply can be matched, and ask the planner what happened.
  const handOff = async (how: 'whatsapp' | 'share' | 'copy') => {
    const card = built;
    update((f) => registerCookCard(f, card.record));
    if (how === 'copy') await copyText(card.text, 'Cook Card copied');
    else {
      const maybeSent = how === 'whatsapp' ? await shareOnWhatsApp(card.text) : await shareMessage(card.text);
      if (!maybeSent) return;
    }
    setOpened(card.record.id);
  };

  const confirmSent = () => {
    if (!opened) return;
    update((f) => markCardSent(f, opened));
    cancelCookReminder(family.id, date).catch(() => {});
    setOpened(null);
    ok(`Marked as sent to ${cook.name} ✓`);
  };

  return (
    <Screen title={`For ${cook.name}`} subtitle={`${prettyDate(date)} · ${meals.length} meal${meals.length > 1 ? 's' : ''}${acked ? ' · cook replied' : allSent ? ' · sent' : ''}`} edges={['bottom']} footer={<Button label={allSent ? 'Send again on WhatsApp' : 'Send on WhatsApp'} icon="💬" onPress={() => handOff('whatsapp')} />}>
      {opened ? (
        <Card tone="warn">
          <T bold>Did the message go out?</T>
          <T small>The card was handed over. Mark it sent only once you’ve sent it to {cook.name}.</T>
          <Row wrap>
            <Button small label="Yes, it was sent" icon="✓" onPress={confirmSent} />
            <Button small kind="ghost" label="Not yet" onPress={() => setOpened(null)} />
          </Row>
        </Card>
      ) : null}
      <Card tone="alt">
        <T bold>{built.payload.n} people · {meals.length} meals</T>
        <T small>Review the dishes and food instructions below. The complete message and reply link are included when you send.</T>
      </Card>
      {built.payload.items.map((item) => <Card key={item.k}>
        <T bold>{item.t}{item.w ? ` · ${item.w}` : ''}</T>
        <T>{item.o[0]}</T>
        {item.o.length > 1 ? <T small muted>Alternatives: {item.o.slice(1).join(', ')}</T> : null}
        {item.nt ? <T small bold style={{ color: c.warn }}>{item.nt}</T> : null}
      </Card>)}
      <Button small kind="ghost" label={expanded ? 'Hide complete message' : 'Show complete message & quantities'} onPress={() => setExpanded(!expanded)} />
      {expanded ? <Card tone="alt"><Text selectable style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>{built.text}</Text></Card> : null}
      <T small muted>
        WhatsApp opens with the card ready. Pick {cook.name.split(' ')[0]}’s chat and press send.
      </T>
      <Row wrap>
        <Button kind="secondary" small label="Share…" icon="↗" accessibilityLabel="Share with another app" onPress={() => handOff('share')} />
        <Button kind="secondary" small label="Copy text" onPress={() => handOff('copy')} />
        <Button kind="secondary" small label="Read aloud" icon="🔊" onPress={() => Speech.speak(built.text.replace(/https?:\S+/g, ''), { language: TTS_LANG[built.payload.lang] })} />
        <Button kind="ghost" small label="Preview Cook page" onPress={() => Linking.openURL(built.url)} />
      </Row>
      <T small muted>
        The link opens a simple page where {cook.name.split(' ')[0]} taps what she’ll make, or what’s missing. It works until the end of that day. She sends her reply back to you (she chooses your chat); paste it in “Cook’s reply”.
      </T>
      <Button kind="ghost" label="Paste the cook’s reply" onPress={() => router.push('/cook-reply')} />
    </Screen>
  );
}
