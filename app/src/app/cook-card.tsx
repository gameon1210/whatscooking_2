import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useMemo, useState } from 'react';
import { Linking, Text } from 'react-native';

import { buildPayload, cookCardText, cookPageUrl } from '@/domain/cookcard';
import { addDays, prettyDate, SLOT_ORDER, todayKey } from '@/domain/dates';
import { whatsappLink } from '@/domain/links';
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
  const [copied, setCopied] = useState(false);

  const cook = family?.members.find((m) => m.roles.includes('cook') && !m.optedOut);
  const meals = useMemo(
    () =>
      (family?.planned ?? [])
        .filter((p) => p.date === date && p.status !== 'skipped' && p.options.length && (!cook?.cookSlots?.length || cook.cookSlots.includes(p.slot)))
        .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)),
    [family, date, cook],
  );
  const built = useMemo(() => {
    if (!family || !cook || !meals.length) return null;
    const payload = buildPayload(family, cook, date, meals);
    const url = cookPageUrl(family.settings.cookPageBase, payload);
    return { payload, url, text: cookCardText(family, cook, payload, url) };
  }, [family, cook, meals, date]);

  if (!family) return null;
  if (!cook)
    return (
      <Screen edges={['bottom']}>
        <Empty emoji="👩‍🍳" title="No cook added" body="Add your cook in Family to send Cook Cards on WhatsApp." />
        <Button label="Go to Family" onPress={() => router.replace('/family')} />
      </Screen>
    );
  if (!built)
    return (
      <Screen edges={['bottom']}>
        <Empty emoji="🗓️" title={`Nothing planned for ${prettyDate(date).toLowerCase()}`} body={`Plan the meals ${cook.name} cooks first.`} />
        <Button label="Plan now" onPress={() => router.replace({ pathname: '/tomorrow', params: { date } })} />
      </Screen>
    );

  const needsConsent = !!cook.whatsapp && !cook.whatsappConsent;
  const send = async () => {
    await Linking.openURL(whatsappLink(built.text, cook.whatsappConsent ? cook.whatsapp : undefined));
    update((f) => {
      for (const p of f.planned) if (meals.some((m) => m.id === p.id) && p.status === 'planned') {
        p.status = 'sent';
        p.cookSentAt = new Date().toISOString();
      }
    });
  };

  return (
    <Screen title={`For ${cook.name}`} subtitle={`${prettyDate(date)} · ${meals.length} meal${meals.length > 1 ? 's' : ''}`} edges={['bottom']}>
      {needsConsent ? (
        <Card tone="warn">
          <T small>
            {cook.name} hasn’t agreed to messages yet, so WhatsApp will open without their number. Mark consent in Family once they say yes.
          </T>
        </Card>
      ) : null}
      <Card tone="alt">
        <Text selectable style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>
          {built.text}
        </Text>
      </Card>
      <Button label="Send on WhatsApp" icon="💬" onPress={send} />
      <Row wrap>
        <Button
          kind="secondary"
          small
          label={copied ? 'Copied' : 'Copy text'}
          onPress={async () => {
            await Clipboard.setStringAsync(built.text);
            setCopied(true);
          }}
        />
        <Button kind="secondary" small label="Read aloud" icon="🔊" onPress={() => Speech.speak(built.text.replace(/https?:\S+/g, ''), { language: TTS_LANG[built.payload.lang] })} />
        <Button kind="ghost" small label="Preview Cook page" onPress={() => Linking.openURL(built.url)} />
      </Row>
      <T small muted>
        The link opens a simple page where {cook.name.split(' ')[0]} taps what she’ll make, or what’s missing. Her reply comes back to your WhatsApp; paste it in “Cook’s reply”.
      </T>
      <Button kind="ghost" label="Paste the cook’s reply" onPress={() => router.push('/cook-reply')} />
    </Screen>
  );
}
