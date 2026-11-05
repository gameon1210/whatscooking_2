import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';

import { DishPicker } from '@/components/DishPicker';
import { findPlanned, planDish } from '@/domain/actions';
import { addDays, prettyDate, shortDate, SLOT_LABEL, todayKey, validDateKey } from '@/domain/dates';
import { matchDish } from '@/domain/parse';
import { allDishes, dishById } from '@/domain/recommender';
import type { Family } from '@/domain/types';
import { parseSpokenPlan, reviewAiPlan, saveSpokenPlan, voicePlanProblem, type SpokenMeal, type VoicePlanResult } from '@/domain/voice-plan';
import { hasLlm, mealsFromPlanText } from '@/services/llm';
import { useFamily, useStore } from '@/state/store';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, H2, Input, Row, Screen, Segmented, T } from '@/ui/kit';

type ReviewMeal = SpokenMeal & { dishId?: string; selected: boolean; replacePlanId?: string };

export default function PlanByVoice() {
  const family = useFamily();
  return family ? <VoicePlanWorkspace family={family} key={family.id} /> : null;
}

function VoicePlanWorkspace({ family }: { family: Family }) {
  const { date, range } = useLocalSearchParams<{ date?: string; range?: string }>();
  const today = todayKey();
  const initial = typeof date === 'string' && validDateKey(date) && date >= today ? date : today;
  const [start, setStart] = useState(initial);
  const [scope, setScope] = useState<'day' | 'week'>(range === 'week' ? 'week' : 'day');
  const [language, setLanguage] = useState('en-IN');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<ReviewMeal[] | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const end = scope === 'week' ? addDays(start, 6) : start;

  useFocusEffect(useCallback(() => {
    let active = true;
    hasLlm().then((enabled) => { if (active) setAi(enabled); }).catch(() => {});
    return () => { active = false; };
  }, []));

  const resetReview = () => { setRows(null); setIssues([]); };
  const review = async (useAi: boolean) => {
    const local = parseSpokenPlan(note, start, end, today);
    let result: VoicePlanResult = local;
    if (useAi) {
      resetReview();
      setBusy(true);
      try {
        const extracted = reviewAiPlan(await mealsFromPlanText(note, start, end, today), start, end);
        if (extracted.meals.length) result = extracted;
        else result = { ...local, issues: ['Gemini didn’t find a usable plan. Showing local matches.', ...local.issues] };
      } catch {
        result = { ...local, issues: ['Gemini was unavailable. Showing local matches.', ...local.issues] };
      } finally {
        setBusy(false);
      }
    }
    const catalog = allDishes(family);
    setRows(result.meals.map((meal) => {
      const dish = matchDish(meal.dish, catalog);
      const existing = findPlanned(family, meal.date, meal.slot);
      const selected = !!dish && (!existing || existing.status === 'skipped') && !voicePlanProblem(family, { ...meal, dishId: dish.id });
      return { ...meal, dishId: dish?.id, selected };
    }));
    setIssues(result.issues);
  };

  const displayRows = (rows ?? []).map((row) => {
    const existing = findPlanned(family, row.date, row.slot);
    const previous = existing && existing.status !== 'skipped' ? existing : undefined;
    const problem = row.dishId ? voicePlanProblem(family, { ...row, dishId: row.dishId }) : 'Choose a dish or add it to your catalogue.';
    const selected = row.selected && row.replacePlanId === previous?.id;
    return { row, previous, problem, selected };
  });
  const choices = displayRows.flatMap(({ row, selected, problem }) => selected && row.dishId && !problem
    ? [{ date: row.date, slot: row.slot, dishId: row.dishId, replacePlanId: row.replacePlanId }] : []);

  const save = () => {
    try {
      const store = useStore.getState();
      if (store.activeId !== family.id) throw new Error('The active family changed. Open the planner again.');
      store.updateFamily(family.id, (current) => saveSpokenPlan(current, choices));
      ok(`Planned ${choices.length} meal${choices.length === 1 ? '' : 's'} ✓`);
      router.navigate({ pathname: '/plan', params: { start } });
    } catch (error) {
      warn(error instanceof Error ? error.message : 'Couldn’t save the plan. Review it and try again.');
    }
  };

  return (
    <Screen title="Plan by voice" subtitle="Say your meals, check what we heard, then save." edges={['bottom']} footer={choices.length ?
      <Button label={`Save ${choices.length} meal${choices.length === 1 ? '' : 's'}`} onPress={save} /> : undefined}>
      <Card>
        <Segmented label="Planning range" value={scope} onChange={(value) => { if (!busy) { setScope(value); resetReview(); } }} options={[{ value: 'day', label: 'One day' }, { value: 'week', label: 'Seven days' }]} />
        <Row wrap>
          <Chip label="Start today" choice="radio" selected={start === today} onPress={() => { if (!busy) { setStart(today); resetReview(); } }} />
          <Chip label="Start tomorrow" choice="radio" selected={start === addDays(today, 1)} onPress={() => { if (!busy) { setStart(addDays(today, 1)); resetReview(); } }} />
          {initial > addDays(today, 1) ? <Chip label={`Start ${shortDate(initial)}`} choice="radio" selected={start === initial} onPress={() => { if (!busy) { setStart(initial); resetReview(); } }} /> : null}
        </Row>
        <T small bold>{scope === 'day' ? prettyDate(start) : `${shortDate(start)} to ${shortDate(end)}`}</T>
        <Segmented label="Dictation language" value={language} onChange={setLanguage} options={[{ value: 'en-IN', label: 'English (India)' }, { value: 'hi-IN', label: 'हिन्दी' }]} />
        <Input
          voice
          voiceLanguage={language}
          label="Meal plan notes"
          placeholder={scope === 'day' ? 'Breakfast poha, lunch rajma chawal' : 'Monday lunch rajma chawal, Tuesday dinner palak paneer'}
          value={note}
          onChangeText={(value) => { setNote(value); resetReview(); }}
          onDictation={(line) => { setNote((value) => [value, line].filter(Boolean).join('\n').slice(0, 2400)); resetReview(); }}
          maxLength={2400}
          multiline
          editable={!busy}
          style={{ minHeight: 106, textAlignVertical: 'top' }}
        />
        <T small muted>Tap the microphone to dictate. Your device’s speech service processes your voice. You can edit the text before reviewing.</T>
        <Row wrap>
          <Button small label="Review plan" blockedReason={busy ? 'Wait for Gemini to finish.' : !note.trim() && 'Say or type some meals first.'} onPress={() => review(false)} />
          {ai ? <Button small kind="secondary" label="Review with Gemini" loading={busy} blockedReason={!note.trim() && 'Say or type some meals first.'} onPress={() => review(true)} /> : null}
        </Row>
        {ai ? <T small muted>Review with Gemini sends the meal plan notes to Google.</T> : <Button small kind="ghost" label="Set up Gemini for natural wording" onPress={() => router.push('/settings')} />}
      </Card>
      {rows ? <>
        <H2>Review your meals</H2>
        {issues.map((issue) => <Card key={issue} tone="warn"><T small>{issue}</T></Card>)}
        {!rows.length ? <T>Try a day, meal and dish on each line.</T> : null}
        {displayRows.map(({ row, previous, problem, selected }, index) => (
          <Card key={`${row.date}:${row.slot}`} tone={problem ? 'warn' : undefined}>
            <T small muted>{prettyDate(row.date)} · {SLOT_LABEL[row.slot]}</T>
            <T bold>{row.dishId ? dishById(family, row.dishId)?.name ?? row.dish : row.dish}</T>
            {problem ? <T small>{problem}</T> : null}
            {previous && !problem ? <T small muted>Current plan: {dishById(family, planDish(previous) ?? '')?.name ?? 'a saved dish'}</T> : null}
            <Row wrap>
              {!problem ? <Chip label={previous ? 'Replace this plan' : 'Include this meal'} selected={selected} onPress={() => setRows(rows.map((value, i) => i === index ? { ...value, selected: !selected, replacePlanId: !selected ? previous?.id : undefined } : value))} /> : null}
              <Button small kind="ghost" label={row.dishId ? 'Change dish' : 'Choose a dish'} onPress={() => setEditing(index)} />
            </Row>
          </Card>
        ))}
      </> : null}
      {editing !== null && rows?.[editing] ? <DishPicker
        visible
        family={family}
        title="Choose a dish for this meal"
        date={rows[editing].date}
        slot={rows[editing].slot}
        max={1}
        initial={rows[editing].dishId ? [rows[editing].dishId!] : []}
        initialQuery={rows[editing].dishId ? '' : rows[editing].dish}
        onCreateDish={(dish) => useStore.getState().updateFamily(family.id, (current) => {
          current.customDishes = [...current.customDishes.filter((item) => item.id !== dish.id), dish];
        })}
        onClose={() => setEditing(null)}
        onDone={([dishId]) => {
          setRows(rows.map((row, index) => index === editing ? { ...row, dishId, selected: false, replacePlanId: undefined } : row));
          setEditing(null);
        }}
      /> : null}
    </Screen>
  );
}
