import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';

import { CustomDishForm } from '@/components/CustomDishForm';
import { DishPicker } from '@/components/DishPicker';
import { addLeftover, confirmEntry, deleteEntry, logMeal, recentDistinct } from '@/domain/actions';
import { makeCustomDish } from '@/domain/catalog';
import { addDays, prettyDate, SLOT_EMOJI, SLOT_LABEL, todayKey } from '@/domain/dates';
import { matchDish, ParsedLog, parseLogs } from '@/domain/parse';
import { allDishes, dishById } from '@/domain/recommender';
import type { Leftover, LogVia, SlotId } from '@/domain/types';
import { keepPhoto } from '@/services/files';
import { dishesFromPhoto, dishNamesFromText, hasLlm } from '@/services/llm';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, Chip, ChipScroll, H2, Input, Row, Screen, Segmented, Sheet, T } from '@/ui/kit';
import { space, useColors } from '@/ui/theme';

const SLOTS: SlotId[] = ['breakfast', 'tiffin_short', 'tiffin_lunch', 'lunch', 'snack', 'dinner'];

interface Draft extends ParsedLog {
  memberId?: string;
  /** the plan this meal closes, when it came from “Log as cooked” */
  plannedId?: string;
  via: LogVia;
  photoUri?: string;
}

export default function Log() {
  const params = useLocalSearchParams<{ date?: string; slot?: SlotId; dish?: string; plan?: string; member?: string }>();
  const family = useFamily();
  const update = useStore((s) => s.update);
  const c = useColors();
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [llm, setLlm] = useState(false);
  const [pickFor, setPickFor] = useState<number | null>(null);
  const [leftoverAsk, setLeftoverAsk] = useState<{ dishIds: string[]; date: string; slot: SlotId } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [quickDate, setQuickDate] = useState(todayKey());
  const [newDish, setNewDish] = useState<{ draft: number; name: string } | null>(null);

  useEffect(() => {
    hasLlm().then(setLlm);
  }, []);

  // Prefill from "Log as cooked" links (adjust state when params change).
  const paramKey = `${params.date}|${params.slot}|${params.dish}|${params.plan}`;
  const [seenKey, setSeenKey] = useState('');
  if (params.dish && params.slot && paramKey !== seenKey) {
    setSeenKey(paramKey);
    // Keep the plate's identity from the plan, so a split plate or a child's box isn't logged for the whole family (D38).
    setDrafts([{ date: params.date ?? todayKey(), slot: params.slot, dishIds: [params.dish], unknown: [], via: 'manual', plannedId: params.plan || undefined, memberId: params.member || undefined }]);
  }

  const kids = useMemo(() => family?.members.filter((m) => m.school) ?? [], [family]);
  if (!family) return null;
  const dishes = allDishes(family);
  const pending = family.entries.filter((e) => !e.confirmed).sort((a, b) => (a.date < b.date ? 1 : -1));
  const recent = recentDistinct(family);

  const withKid = (d: Draft): Draft => (d.slot.startsWith('tiffin') && !d.memberId && kids.length === 1 ? { ...d, memberId: kids[0].id } : d);

  const parse = async () => {
    setBusy(true);
    try {
      let res = parseLogs(text, dishes, todayKey());
      if (llm && res.some((r) => r.unknown.length)) {
        const names = await dishNamesFromText(text).catch(() => [] as string[]);
        res = res.map((r) => {
          const extra = names.map((n) => matchDish(n, dishes)?.id).filter(Boolean) as string[];
          return { ...r, dishIds: [...new Set([...r.dishIds, ...extra])] };
        });
      }
      setDrafts(res.map((r) => withKid({ ...r, via: 'voice' })));
    } finally {
      setBusy(false);
    }
  };

  const photo = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, base64: llm })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: llm, mediaTypes: ['images'] });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const h = new Date().getHours();
    const slot: SlotId = h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
    let ids: string[] = [];
    if (llm && a.base64) {
      setBusy(true);
      const names = await dishesFromPhoto(a.base64, a.mimeType ?? 'image/jpeg').catch(() => [] as string[]);
      ids = names.map((n) => matchDish(n, dishes)?.id).filter(Boolean) as string[];
      setBusy(false);
    }
    setDrafts([{ date: todayKey(), slot, dishIds: ids, unknown: [], via: 'photo', photoUri: keepPhoto(a.uri) }]);
    if (!ids.length) setPickFor(0);
  };

  // A tiffin always belongs to one child (D38).
  const needsKid = (d: Draft) => d.slot.startsWith('tiffin') && kids.length > 0 && !d.memberId;

  const save = () => {
    const valid = drafts.filter((d) => d.dishIds.length && !needsKid(d));
    update((f) => {
      for (const d of valid) logMeal(f, { date: d.date, slot: d.slot, dishIds: d.dishIds, via: d.via, memberId: d.memberId, photoUri: d.photoUri, plannedId: d.plannedId });
    });
    setSaved(valid.map((d) => `${SLOT_LABEL[d.slot]}: ${d.dishIds.map((id) => dishById(family, id)?.name).join(', ')}`).join('\n'));
    const main = valid.find((d) => d.slot === 'lunch' || d.slot === 'dinner');
    if (main) setLeftoverAsk({ dishIds: main.dishIds, date: main.date, slot: main.slot });
    setDrafts([]);
    setText('');
  };

  const quick = (id: string, slot: SlotId) => {
    setDrafts([withKid({ date: quickDate, slot, dishIds: [id], unknown: [], via: 'quick' })]);
  };

  // Changing the slot or date detaches the draft from the plan it came from.
  const setDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts(drafts.map((d, j) => (j === i ? withKid({ ...d, ...patch, ...(patch.slot && patch.slot !== d.slot ? { plannedId: undefined, memberId: patch.memberId } : {}), ...(patch.date && patch.date !== d.date ? { plannedId: undefined } : {}) }) : d)));

  return (
    <Screen title="Log a meal" subtitle="Say it, snap it, or tap it.">
      {pending.length ? (
        <Card tone="warn">
          <T bold>Quick check</T>
          <T small muted>
            These were logged from your plan. Confirm, or remove if it didn’t happen.
          </T>
          {pending.slice(0, 6).map((e) => (
            <Row key={e.id} style={{ justifyContent: 'space-between' }}>
              <T small style={{ flex: 1 }}>
                {prettyDate(e.date)} · {SLOT_LABEL[e.slot]}: {e.dishIds.map((id) => dishById(family, id)?.name).join(', ')}
              </T>
              <Button small kind="secondary" label="✓" onPress={() => update((f) => confirmEntry(f, e.id))} />
              <Button small kind="ghost" label="✕" onPress={() => update((f) => deleteEntry(f, e.id))} />
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <T bold>🎙️ Say or type what you cooked</T>
        <T small muted>
          Tap the mic on your keyboard to speak — English, Hinglish, or Hindi, Kannada, Tamil and Telugu script. e.g. “kal raat khichdi, aaj subah idli” or “कल रात खिचड़ी”
        </T>
        <Input value={text} onChangeText={setText} placeholder="aaj dinner mein rajma chawal aur raita" multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <Row wrap>
          <Button label="Understand" onPress={parse} disabled={!text.trim()} loading={busy} small />
          <Button kind="secondary" small label="Camera" icon="📷" onPress={() => photo(true)} />
          <Button kind="secondary" small label="Gallery" icon="🖼️" onPress={() => photo(false)} />
        </Row>
        {!llm ? (
          <T small muted>
            Photo recognition needs a Gemini key (Settings). Without it, you pick the dish after the photo.
          </T>
        ) : null}
      </Card>

      {drafts.map((d, i) => (
        <Card key={i} tone="alt">
          {d.photoUri ? <Image source={{ uri: d.photoUri }} style={{ width: '100%', height: 180, borderRadius: 12 }} /> : null}
          <Segmented<string> value={d.date} onChange={(date) => setDraft(i, { date })} options={[todayKey(), addDays(todayKey(), -1), addDays(todayKey(), -2)].map((k) => ({ value: k, label: prettyDate(k) }))} />
          <ChipScroll>
            {SLOTS.map((s) => (
              <Chip key={s} label={`${SLOT_EMOJI[s]} ${SLOT_LABEL[s]}`} selected={d.slot === s} onPress={() => setDraft(i, { slot: s })} />
            ))}
          </ChipScroll>
          {d.slot.startsWith('tiffin') && kids.length > 1 ? (
            <>
              <T small bold style={needsKid(d) ? { color: c.bad } : undefined}>
                Whose box?
              </T>
              <Row wrap>
                {kids.map((k) => (
                  <Chip key={k.id} label={k.name} selected={d.memberId === k.id} onPress={() => setDraft(i, { memberId: k.id })} />
                ))}
              </Row>
            </>
          ) : null}
          {d.plannedId && d.memberId && !d.slot.startsWith('tiffin') ? (
            <T small muted>
              For {family.members.find((m) => m.id === d.memberId)?.name.split(' ')[0]}’s plate
            </T>
          ) : null}
          <Row wrap>
            {d.dishIds.map((id) => (
              <Chip key={id} selected label={`${dishById(family, id)?.name ?? id}  ✕`} onPress={() => setDraft(i, { dishIds: d.dishIds.filter((x) => x !== id) })} />
            ))}
            <Chip label="+ Add dish" onPress={() => setPickFor(i)} />
          </Row>
          {d.unknown.map((u) => (
            <Row key={u}>
              <T small muted style={{ flex: 1 }}>
                Didn’t recognise “{u}”
              </T>
              <Button
                small
                kind="ghost"
                label="Add as dish"
                onPress={() => setNewDish({ draft: i, name: u })}
              />
            </Row>
          ))}
          {newDish && newDish.draft === i ? (
            <CustomDishForm
              name={newDish.name}
              onCancel={() => setNewDish(null)}
              onConfirm={(meta) => {
                // A new dish is saved only with its diet and allergens confirmed (D03).
                const nd = makeCustomDish(newDish.name, [...new Set([d.slot, 'lunch', 'dinner'])] as SlotId[], meta);
                update((f) => void (f.customDishes = [...f.customDishes.filter((x) => x.id !== nd.id), nd]));
                setDraft(i, { dishIds: [...d.dishIds.filter((x) => x !== nd.id), nd.id], unknown: d.unknown.filter((x) => x !== newDish.name) });
                setNewDish(null);
              }}
            />
          ) : null}
        </Card>
      ))}
      {drafts.length ? <Button label="Save" icon="✓" onPress={save} disabled={!drafts.some((d) => d.dishIds.length && !needsKid(d))} /> : null}
      {drafts.some(needsKid) ? (
        <T small style={{ color: c.bad }}>
          Pick whose box it is before saving a tiffin.
        </T>
      ) : null}

      {saved ? (
        <Card tone="good">
          <T bold>Saved</T>
          <T small>{saved}</T>
        </Card>
      ) : null}

      {recent.length ? (
        <View style={{ gap: space.sm }}>
          <H2>One-tap repeat</H2>
          <Segmented<string> value={quickDate} onChange={setQuickDate} options={[todayKey(), addDays(todayKey(), -1)].map((k) => ({ value: k, label: prettyDate(k) }))} />
          <Row wrap>
            {recent.map((id) => {
              const dish = dishById(family, id);
              const slot = (dish?.slots.find((s) => !s.startsWith('tiffin')) ?? 'lunch') as SlotId;
              return <Chip key={id} label={dish?.name ?? id} onPress={() => quick(id, slot)} />;
            })}
          </Row>
        </View>
      ) : null}

      {pickFor !== null && drafts[pickFor] ? (
        <DishPicker
          visible
          family={family}
          slot={drafts[pickFor].slot}
          title="Add a dish"
          max={4}
          initial={drafts[pickFor].dishIds}
          onClose={() => setPickFor(null)}
          onCreateDish={(dd) => update((f) => void (f.customDishes = [...f.customDishes.filter((x) => x.id !== dd.id), dd]))}
          onDone={(ids) => {
            setDraft(pickFor, { dishIds: ids });
            setPickFor(null);
          }}
        />
      ) : null}

      <LeftoverSheet ask={leftoverAsk} onClose={() => setLeftoverAsk(null)} />
    </Screen>
  );
}

/** FR-250: "Anything left over?" after lunch or dinner. */
function LeftoverSheet({ ask, onClose }: { ask: { dishIds: string[]; date: string; slot: SlotId } | null; onClose: () => void }) {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const [amount, setAmount] = useState<Leftover['amount']>('half');
  if (!family || !ask) return null;
  return (
    <Sheet visible onClose={onClose} title="Anything left over?">
      <T muted>Tell us and tomorrow’s suggestions will use it — like dal paratha from leftover dal.</T>
      <Segmented<Leftover['amount']>
        value={amount}
        onChange={setAmount}
        options={[
          { value: 'little', label: 'A little' },
          { value: 'half', label: 'About half' },
          { value: 'lots', label: 'Lots' },
        ]}
      />
      {ask.dishIds.map((id) => (
        <Button
          key={id}
          kind="secondary"
          label={`Leftover ${dishById(family, id)?.name.toLowerCase()}`}
          onPress={() => {
            update((f) => addLeftover(f, id, amount, ask.date, ask.slot));
            onClose();
          }}
        />
      ))}
      <Button kind="ghost" label="Nothing left" onPress={onClose} />
    </Sheet>
  );
}
