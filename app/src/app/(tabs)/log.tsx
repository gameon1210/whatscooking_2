import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';

import { AiKeyGuide } from '@/components/AiKeyGuide';
import { CustomDishForm } from '@/components/CustomDishForm';
import { DatePickerSheet } from '@/components/DatePickerSheet';
import { DishPicker } from '@/components/DishPicker';
import { addLeftover, confirmEntry, deleteEntry, editEntry, entryPeople, entriesForPlate, logMeal, recentDistinct } from '@/domain/actions';
import type { MealDraft as Draft, LogDraft } from '@/domain/log-draft';
import { isEater } from '@/domain/rules';
import { makeCustomDish } from '@/domain/catalog';
import { addDays, daysBetween, loggableDate, longDate, prettyDate, SLOT_EMOJI, SLOT_LABEL, todayKey } from '@/domain/dates';
import { matchDish, parseLogs } from '@/domain/parse';
import { allDishes, dishById } from '@/domain/recommender';
import type { Family, Leftover, SlotId } from '@/domain/types';
import { keepPhoto, removePhotos } from '@/services/files';
import { dishesFromPhoto, dishNamesFromText, hasLlm } from '@/services/llm';
import { useFamily, useStore } from '@/state/store';
import { fail, ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, ChipScroll, H2, Input, LinkText, Row, Screen, Segmented, Sheet, T } from '@/ui/kit';
import { space, useColors } from '@/ui/theme';

const SLOTS: SlotId[] = ['breakfast', 'tiffin_short', 'tiffin_lunch', 'lunch', 'snack', 'dinner'];

/** The meal people most likely mean right now. */
function slotNow(): SlotId {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
}

/** A blank meal for “Pick from the list” (1.0.4). */
const blankDraft = (): Draft => ({ date: todayKey(), slot: slotNow(), dishIds: [], unknown: [], via: 'manual' });

export default function Log() {
  const family = useFamily();
  return family ? <LogWorkspace key={family.id} family={family} /> : null;
}

function LogWorkspace({ family }: { family: Family }) {
  const params = useLocalSearchParams<{ date?: string; slot?: SlotId; dish?: string; plan?: string; member?: string; edit?: string; n?: string; day?: string; ordered?: string }>();
  const update = useStore((s) => s.update);
  const c = useColors();
  const [restored, setRestored] = useState<LogDraft | undefined>(() => useStore.getState().logDrafts[family.id]);
  const [text, setText] = useState(restored?.text ?? '');
  const [drafts, setDrafts] = useState<Draft[]>(restored?.drafts ?? []);
  const [allowedKey, setAllowedKey] = useState('');
  const [draftWriteFailed, setDraftWriteFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [llm, setLlm] = useState(false);
  const [pickFor, setPickFor] = useState<number | null>(null);
  const [leftoverAsk, setLeftoverAsk] = useState<{ dishIds: string[]; date: string; slot: SlotId } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [quickDate, setQuickDate] = useState(todayKey());
  const [newDish, setNewDish] = useState<{ draft: number; name: string } | null>(null);
  /** a meal for this plate is already logged: ask before keeping two (R02) */
  const [clash, setClash] = useState<string[] | null>(null);
  /** “Say or snap” (free text, photo) or “Pick from the list” (structured, 1.0.4) */
  const [mode, setMode] = useState<'say' | 'pick'>(restored?.mode ?? 'pick');
  /** which draft's date is being picked from the calendar */
  const [dateFor, setDateFor] = useState<number | null>(null);
  const [keyGuide, setKeyGuide] = useState(false);

  useEffect(() => {
    hasLlm().then(setLlm);
  }, []);

  // Prefill from "Log as cooked" links (adjust state when params change).
  const paramKey = `${params.date}|${params.slot}|${params.dish}|${params.plan}|${params.n ?? ''}`;
  const [seenKey, setSeenKey] = useState(restored?.routeKey ?? '');
  const requestKey = params.edit ? `edit|${params.edit}|${params.n ?? ''}` : params.day ? `day|${params.day}|${params.n ?? ''}` : params.dish ? paramKey : '';
  const waitingForDraft = !!((drafts.length || text.trim()) && requestKey && requestKey !== seenKey && requestKey !== allowedKey);
  if (!waitingForDraft && params.dish && params.slot && paramKey !== seenKey) {
    setSeenKey(paramKey);
    // Keep the plate's identity from the plan, so a split plate or a child's box isn't logged for the whole family (D38).
    setDrafts([{ date: params.date ?? todayKey(), slot: params.slot, dishIds: [params.dish], unknown: [], via: 'manual', plannedId: params.plan || undefined, memberId: params.member || undefined, forMemberIds: params.plan ? family.planned.find((p) => p.id === params.plan)?.forMemberIds : undefined, orderedIn: params.ordered === '1' }]);
  }
  // "Edit" from Memory opens the meal here to correct it (1.0.3, R02).
  // `n` makes every Edit tap distinct, so the same meal can be edited twice in a row.
  const editKey = params.edit ? `edit|${params.edit}|${params.n ?? ''}` : '';
  if (!waitingForDraft && params.edit && editKey !== seenKey) {
    setSeenKey(editKey);
    const e = family?.entries.find((x) => x.id === params.edit);
    if (e) setDrafts([{ date: e.date, slot: e.slot, dishIds: [...e.dishIds], unknown: [], via: e.via, memberId: e.memberId, forMemberIds: e.forMemberIds, photoUri: e.photoUri, editId: e.id, orderedIn: e.orderedIn }]);
  }

  // “Log a meal for this day” from Memory opens the list mode on that day (1.0.4).
  const dayKey = params.day ? `day|${params.day}|${params.n ?? ''}` : '';
  if (!waitingForDraft && params.day && !params.edit && dayKey !== seenKey && loggableDate(params.day)) {
    setSeenKey(dayKey);
    setMode('pick');
    setDrafts([{ ...blankDraft(), date: params.day }]);
  }

  const kids = useMemo(() => family?.members.filter((m) => m.school) ?? [], [family]);
  useEffect(() => {
    let current = true;
    useStore.getState().setLogDraft(family.id, drafts.length || text.trim() ? { drafts, text, mode, routeKey: seenKey, savedAt: new Date().toISOString() } : null).then(() => { if (current) setDraftWriteFailed(false); }).catch(() => { if (current) setDraftWriteFailed(true); });
    return () => { current = false; };
  }, [family.id, drafts, text, mode, seenKey]);
  const eaters = family.members.filter(isEater);
  const diners = (d: Draft) => d.slot.startsWith('tiffin') && d.memberId ? [d.memberId] : entryPeople(family, d);
  const discard = () => { setDrafts([]); setText(''); setRestored(undefined); setClash(null); router.replace('/log'); };
  const dishes = allDishes(family);
  const pending = family.entries.filter((e) => !e.confirmed).sort((a, b) => (a.date < b.date ? 1 : -1));
  const recent = recentDistinct(family);

  const withKid = (d: Draft): Draft => {
    if (!d.slot.startsWith('tiffin')) return d;
    const memberId = d.memberId ?? (kids.length === 1 ? kids[0].id : undefined);
    return { ...d, memberId, forMemberIds: memberId ? [memberId] : undefined };
  };

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
      const found = res.filter((r) => r.dishIds.length).length;
      const unknown = res.flatMap((r) => r.unknown);
      if (!res.length) warn('Couldn’t find a meal in that. Try “dinner: dal rice” or “aaj lunch rajma chawal”.');
      else if (!found) warn(`Didn’t recognise ${unknown.length ? `“${unknown.join('”, “')}”` : 'a dish'}. Add it as a new dish below, or tap + Add dish.`);
      else ok(`Found ${found} meal${found > 1 ? 's' : ''}. Check below, then Save.`);
    } finally {
      setBusy(false);
    }
  };

  const photo = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      fail(`${camera ? 'Camera' : 'Photo'} access is off. Allow it in your phone’s settings to log a photo.`);
      return;
    }
    const r = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, base64: llm })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: llm, mediaTypes: ['images'] });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const slot = slotNow();
    let ids: string[] = [];
    if (llm && a.base64) {
      setBusy(true);
      const names = await dishesFromPhoto(a.base64, a.mimeType ?? 'image/jpeg').catch(() => [] as string[]);
      ids = names.map((n) => matchDish(n, dishes)?.id).filter(Boolean) as string[];
      setBusy(false);
      if (!ids.length) warn('Couldn’t recognise the dish in the photo. Pick it from the list.');
    }
    setDrafts([{ date: todayKey(), slot, dishIds: ids, unknown: [], via: 'photo', photoUri: keepPhoto(a.uri) }]);
    if (!ids.length) setPickFor(0);
  };

  // A tiffin always belongs to one child (D38).
  const needsKid = (d: Draft) => d.slot.startsWith('tiffin') && kids.length > 0 && !d.memberId;

  const saveProblem = !drafts.some((d) => d.dishIds.length)
    ? 'Add at least one dish first: tap + Add dish.'
    : drafts.some((d) => !diners(d).length) ? 'Choose at least one person who ate this meal.'
    : drafts.some((d) => !loggableDate(d.date)) ? 'Choose a day within the last year, up to today.'
    : drafts.some(needsKid)
      ? 'Pick whose box it is before saving a tiffin.'
      : null;

  const editing = drafts.find((d) => d.editId);
  const plateText = (d: { date: string; slot: SlotId; memberId?: string }) =>
    `${SLOT_LABEL[d.slot]} ${prettyDate(d.date).toLowerCase()}${d.memberId ? ` (${family.members.find((m) => m.id === d.memberId)?.name.split(' ')[0]})` : ''}`;
  const loggedAlready = (d: Draft) => entriesForPlate(family, d.date, d.slot, d.memberId, diners(d)).filter((e) => e.via !== 'auto' && e.id !== d.editId);

  const saveEdit = (d: Draft) => {
    let done = false;
    update((f) => {
      done = editEntry(f, d.editId!, { date: d.date, slot: d.slot, dishIds: d.dishIds, memberId: d.memberId, forMemberIds: diners(d), orderedIn: !!d.orderedIn });
    });
    if (!done) {
      fail('That meal isn’t in your history any more, so nothing was changed.');
      return;
    }
    setDrafts([]);
    setText('');
    void useStore.getState().setLogDraft(family.id, null).catch(() => fail('Couldn’t clear the draft from this device. Check device storage.'));
    ok(`Meal updated ✓ ${plateText(d)}: ${d.dishIds.map((id) => dishById(family, id)?.name).join(', ')}`);
    router.navigate('/history');
  };

  /**
   * `replace`: drop what was already logged for those plates first.
   * `add`: keep both (two dinners can be real, e.g. a second sitting).
   * No mode: ask first if a plate is already logged (R02).
   */
  const save = (mode?: 'replace' | 'add') => {
    if (editing) return saveEdit(editing);
    const valid = drafts.filter((d) => d.dishIds.length && !needsKid(d));
    const skipped = drafts.length - valid.length;
    const clashes = valid.filter((d) => loggedAlready(d).length);
    if (!mode && clashes.length) {
      setClash(clashes.map((d) => `${plateText(d)}: ${loggedAlready(d).map((e) => e.dishIds.map((id) => dishById(family, id)?.name).join(', ')).join(' + ')}`));
      warn('Already logged. Choose Replace it or Add another below.');
      return;
    }
    setClash(null);
    if (mode === 'replace') {
      const gone = clashes.flatMap(loggedAlready);
      const others = Object.values(useStore.getState().families).flatMap((f) => f.entries.filter((e) => !gone.some((g) => g.id === e.id)).map((e) => e.photoUri));
      removePhotos(gone.map((e) => e.photoUri), [...others, ...valid.map((d) => d.photoUri)]);
      update((f) => void (f.entries = f.entries.filter((e) => !gone.some((g) => g.id === e.id))));
    }
    update((f) => {
      for (const d of valid) logMeal(f, { forMemberIds: diners(d), date: d.date, slot: d.slot, dishIds: d.dishIds, via: d.via, memberId: d.memberId, photoUri: d.photoUri, plannedId: d.plannedId, orderedIn: d.orderedIn || undefined });
    });
    const summary = valid.map((d) => `${SLOT_LABEL[d.slot]} ${prettyDate(d.date).toLowerCase()}${d.orderedIn ? ' (ordered in)' : ''} · ${family.members.filter((m) => diners(d).includes(m.id)).map((m) => m.name.split(' ')[0]).join(', ')}: ${d.dishIds.map((id) => dishById(family, id)?.name).join(', ')}`).join('\n');
    setSaved(summary);
    if (skipped) warn(`Saved ${valid.length}. ${skipped} meal${skipped > 1 ? 's had' : ' had'} no dish and wasn’t saved.`);
    else ok(valid.length === 1 ? `Saved ✓ ${summary}` : `Saved ${valid.length} meals ✓`);
    // Leftovers only matter for a meal from today or yesterday, not one logged weeks later.
    const main = valid.find((d) => (d.slot === 'lunch' || d.slot === 'dinner') && daysBetween(d.date, todayKey()) <= 1);
    if (main) setLeftoverAsk({ dishIds: main.dishIds, date: main.date, slot: main.slot });
    setDrafts(drafts.filter((d) => !valid.includes(d)));
    setText('');
    setRestored(undefined);
    router.replace('/log');
  };

  const quick = (id: string, slot: SlotId) => {
    setDrafts([withKid({ date: quickDate, slot, dishIds: [id], unknown: [], via: 'quick' })]);
  };

  // Changing the slot or date detaches the draft from the plan it came from.
  const setDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts(drafts.map((d, j) => (j === i ? withKid({ ...d, ...patch, ...(patch.slot && patch.slot !== d.slot ? { plannedId: undefined, ...((patch.slot.startsWith('tiffin') || d.slot.startsWith('tiffin')) ? { memberId: patch.memberId, forMemberIds: undefined } : {}) } : {}), ...(patch.date && patch.date !== d.date ? { plannedId: undefined } : {}) }) : d)));

  if (waitingForDraft) return <Screen title="An unfinished meal" subtitle="Your previous draft is safe on this device.">
    <Card tone="alt"><T>You already started a meal. Resume it, or discard it to open the meal you just chose.</T><Button label="Resume my draft" onPress={() => router.replace('/log')} /><Button kind="ghost" label="Discard draft and open selected meal" onPress={() => { setAllowedKey(requestKey); setRestored(undefined); setText(''); setDrafts([]); }} /></Card>
  </Screen>;

  return (
    <Screen title={editing ? 'Edit meal' : 'Log a meal'} subtitle={editing ? 'Change the day, meal or dishes, then save.' : 'Say it, snap it, or tap it.'}>
      {draftWriteFailed ? <Card tone="warn"><T bold>Draft could not be saved on this device</T><T small>Keep this screen open. Free some device storage, then change a field to try again.</T></Card> : null}
      {restored && !draftWriteFailed && (drafts.length || text) ? <Card tone="alt"><T bold>Unfinished meal restored</T><T small>Your draft is kept on this device. Check it below and save when ready.</T><Button small kind="ghost" label="Discard draft" onPress={discard} /></Card> : null}
      {(drafts.length || text) && !restored && !editing && !draftWriteFailed ? <Row wrap><T small muted>Draft kept on this device · not yet in Memory</T><Button small kind="ghost" label="Discard draft" onPress={discard} /></Row> : null}
      {editing ? null : (
      <>
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
              <Button
                small
                kind="secondary"
                label="✓"
                accessibilityLabel={`Yes, ${SLOT_LABEL[e.slot]} happened`}
                onPress={() => {
                  update((f) => confirmEntry(f, e.id));
                  ok('Confirmed ✓');
                }}
              />
              <Button
                small
                kind="ghost"
                label="✕"
                accessibilityLabel={`No, remove ${SLOT_LABEL[e.slot]}`}
                onPress={() => {
                  update((f) => deleteEntry(f, e.id));
                  ok('Removed from history');
                }}
              />
            </Row>
          ))}
        </Card>
      ) : null}

      <Segmented<'say' | 'pick'>
        label="How do you want to log?"
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m === 'pick' && !drafts.length) setDrafts([blankDraft()]);
        }}
        options={[
          { value: 'say', label: '🎙️ Say or snap' },
          { value: 'pick', label: '☑️ Pick from the list' },
        ]}
      />
      {mode === 'pick' ? (
        <Card>
          <T bold>Pick what you ate</T>
          <T small muted>
            Choose the day, the meal and the dishes. No typing, and it works without AI. Any day in the last year.
          </T>
          {drafts.length ? null : <Button small label={saved ? 'Log another meal' : 'Start a meal'} icon="+" onPress={() => setDrafts([blankDraft()])} />}
        </Card>
      ) : (
      <Card>
        <T bold>🎙️ Say or type what you cooked</T>
        <T small muted>
          Tap the mic on your keyboard to speak — English, Hinglish, or Hindi, Kannada, Tamil and Telugu script. e.g. “kal raat khichdi, aaj subah idli” or “कल रात खिचड़ी”
        </T>
        <Input value={text} onChangeText={setText} placeholder="aaj dinner mein rajma chawal aur raita" multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <Row wrap>
          <Button label="Understand" onPress={parse} blockedReason={!text.trim() && 'Type or say what you cooked first.'} loading={busy} small />
          <Button kind="secondary" small label="Camera" icon="📷" onPress={() => photo(true)} />
          <Button kind="secondary" small label="Gallery" icon="🖼️" onPress={() => photo(false)} />
        </Row>
        {!llm ? (
          <>
            <T small muted>
              Without an AI key you pick the dish after the photo. With a free Gemini key the app recognises it for you.
            </T>
            <LinkText label="Set up photo recognition (about 2 minutes)" onPress={() => setKeyGuide(true)} />
          </>
        ) : null}
      </Card>
      )}

      </>
      )}

      {drafts.map((d, i) => (
        <Card key={i} tone="alt">
          {d.photoUri ? <Image source={{ uri: d.photoUri }} style={{ width: '100%', height: 180, borderRadius: 12 }} /> : null}
          <T small bold>Day</T>
          <Segmented<string>
            label="Day"
            value={d.date}
            onChange={(date) => setDraft(i, { date })}
            options={[...new Set([todayKey(), addDays(todayKey(), -1), addDays(todayKey(), -2), d.date])].sort().reverse().map((k) => ({ value: k, label: k.slice(0, 4) === todayKey().slice(0, 4) ? prettyDate(k) : longDate(k) }))}
          />
          <Row wrap>
            <Chip label="📅 Another day…" accessibilityLabel={`Pick another day. Now ${longDate(d.date)}`} onPress={() => setDateFor(i)} />
          </Row>
          <T small bold>Meal</T>
          <ChipScroll>
            {SLOTS.map((s) => (
              <Chip choice="radio" key={s} label={`${SLOT_EMOJI[s]} ${SLOT_LABEL[s]}`} selected={d.slot === s} onPress={() => setDraft(i, { slot: s })} />
            ))}
          </ChipScroll>
          {d.slot.startsWith('tiffin') && kids.length > 1 ? (
            <>
              <T small bold style={needsKid(d) ? { color: c.bad } : undefined}>
                Whose box?
              </T>
              <Row wrap>
                {kids.map((k) => (
                  <Chip choice="radio" key={k.id} label={k.name} selected={d.memberId === k.id} onPress={() => setDraft(i, { memberId: k.id })} />
                ))}
              </Row>
            </>
          ) : null}
          {!d.slot.startsWith('tiffin') ? <View style={{ gap: 8 }}>
            <T small bold>Who ate this?</T>
            <Row wrap>
              <Chip label="Everyone" selected={diners(d).length === eaters.length} onPress={() => setDraft(i, { memberId: undefined, forMemberIds: eaters.map((m) => m.id), plannedId: undefined })} />
              {eaters.map((m) => <Chip key={m.id} label={m.name} selected={diners(d).includes(m.id)} onPress={() => { const ids = diners(d); const next = ids.includes(m.id) ? ids.filter((id) => id !== m.id) : [...ids, m.id]; if (!next.length) { warn('Keep at least one person selected.'); return; } setDraft(i, { memberId: undefined, forMemberIds: next, plannedId: undefined }); }} />)}
            </Row>
          </View> : null}
          {d.plannedId && d.memberId && !d.slot.startsWith('tiffin') ? (
            <T small muted>
              For {family.members.find((m) => m.id === d.memberId)?.name.split(' ')[0]}’s plate
            </T>
          ) : null}
          <T small bold>Dishes</T>
          <Row wrap>
            {d.dishIds.map((id) => (
              <Chip key={id} selected choice="button" accessibilityLabel={`Remove ${dishById(family, id)?.name ?? id}`} label={`${dishById(family, id)?.name ?? id}  ✕`} onPress={() => setDraft(i, { dishIds: d.dishIds.filter((x) => x !== id) })} />
            ))}
            <Chip label={d.dishIds.length ? '+ Add dish' : '+ Choose dishes'} onPress={() => setPickFor(i)} />
          </Row>
          <Segmented<'home' | 'out'>
            label="Cooked at home or ordered in"
            value={d.orderedIn ? 'out' : 'home'}
            onChange={(v) => setDraft(i, { orderedIn: v === 'out' })}
            options={[
              { value: 'home', label: '🏠 Cooked at home' },
              { value: 'out', label: '🛵 Ordered in' },
            ]}
          />
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
                ok(`Added “${nd.name}” to your dishes ✓`);
                setNewDish(null);
              }}
            />
          ) : null}
        </Card>
      ))}
      {drafts.length ? <Button label={editing ? 'Save changes' : 'Save meal'} icon="✓" onPress={() => save()} blockedReason={saveProblem} /> : null}
      {editing ? (
        <Button
          kind="ghost"
          label="Cancel"
          onPress={() => {
            setDrafts([]);
            setText('');
            void useStore.getState().setLogDraft(family.id, null).catch(() => fail('Couldn’t clear the draft from this device. Check device storage.'));
            router.navigate('/history');
          }}
        />
      ) : null}
      {clash ? (
        <Card tone="warn">
          <T bold>Already logged</T>
          {clash.map((line) => (
            <T key={line} small>
              {line}
            </T>
          ))}
          <T small muted>
            Replace it if plans changed, or add another if both really happened.
          </T>
          <Row wrap>
            <Button small label="Replace it" onPress={() => save('replace')} />
            <Button small kind="secondary" label="Add another" onPress={() => save('add')} />
            <Button small kind="ghost" label="Cancel" onPress={() => setClash(null)} />
          </Row>
        </Card>
      ) : null}
      {drafts.some(needsKid) ? (
        <T small style={{ color: c.bad }}>
          Pick whose box it is before saving a tiffin.
        </T>
      ) : null}

      {saved && !drafts.length && !text.trim() ? (
        <Card tone="good">
          <T bold>Saved</T>
          <T small>{saved}</T>
        </Card>
      ) : null}

      {recent.length && !editing ? (
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
          max={12}
          initial={drafts[pickFor].dishIds}
          onClose={() => setPickFor(null)}
          onCreateDish={(dd) => update((f) => void (f.customDishes = [...f.customDishes.filter((x) => x.id !== dd.id), dd]))}
          onDone={(ids) => {
            setDraft(pickFor, { dishIds: ids });
            setPickFor(null);
          }}
        />
      ) : null}

      {dateFor !== null && drafts[dateFor] ? (
        <DatePickerSheet
          visible
          value={drafts[dateFor].date}
          onClose={() => setDateFor(null)}
          onPick={(date) => {
            setDraft(dateFor, { date });
            setDateFor(null);
            ok(`Day set to ${longDate(date)}`);
          }}
        />
      ) : null}

      <Sheet visible={keyGuide} onClose={() => setKeyGuide(false)} title="Photo recognition">
        <AiKeyGuide
          onChange={(has) => {
            setLlm(has);
            if (has) setKeyGuide(false);
          }}
        />
      </Sheet>

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
            ok(`Noted. Tomorrow’s ideas will use the leftover ${dishById(family, id)?.name.toLowerCase()}.`);
            onClose();
          }}
        />
      ))}
      <Button kind="ghost" label="Nothing left" onPress={onClose} />
    </Sheet>
  );
}
