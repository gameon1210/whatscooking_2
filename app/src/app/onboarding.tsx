import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, useWindowDimensions, View } from 'react-native';

import { CustomDishForm } from '@/components/CustomDishForm';
import { KITCHEN_IMAGES } from '@/components/KitchenCover';
import { MemberForm, memberProblem } from '@/components/MemberForm';
import { CATALOG, CustomMeta, customDishId, makeCustomDish } from '@/domain/catalog';
import { CUISINES, cuisineSummary, DEFAULT_CUISINES, dishCuisine } from '@/domain/cuisines';
import { AGE_LABEL, DIET_LABEL, newFamily, newMember } from '@/domain/family';
import { similarDishes } from '@/domain/parse';
import type { Cuisine, Diet, Dish, Member, Region, SlotId } from '@/domain/types';
import { scheduleFamilyReminders } from '@/services/notify';
import { useStore } from '@/state/store';
import { Eyebrow, KitchenBrand } from '@/ui/editorial';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Chip, H2, Input, LinkText, Row, Screen, Segmented, Sheet, T } from '@/ui/kit';
import { editorialFont, useColors } from '@/ui/theme';

/** When an own dish is usually eaten (1.0.4). */
const OWN_SLOTS: { v: SlotId; l: string }[] = [
  { v: 'breakfast', l: 'Breakfast' },
  { v: 'lunch', l: 'Lunch' },
  { v: 'snack', l: 'Evening snack' },
  { v: 'dinner', l: 'Dinner' },
];

export default function Onboarding() {
  return useStore((s) => s.hydrated) ? <OnboardingSteps /> : null;
}

function OnboardingSteps() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const addFamily = useStore((s) => s.addFamily);
  const hasFamilies = useStore((s) => Object.keys(s.families).length > 0);
  const [draft] = useState(() => useStore.getState().setupDraft);
  const [step, setStep] = useState(Math.max(0, Math.min(2, draft?.step ?? 0)));
  const [name, setName] = useState(draft?.name ?? '');
  const [region, setRegion] = useState<Region>(draft?.region ?? 'general');
  const [me, setMe] = useState(draft?.me ?? '');
  const [planner, setPlanner] = useState<Member>(() => draft?.planner ?? newMember('', { roles: ['planner', 'eater', 'shopper'] }));
  const [allergyText, setAllergyText] = useState(planner.allergies.join(', '));
  const [meError, setMeError] = useState(false);
  const meRef = useRef<TextInput>(null);
  const [memberErrors, setMemberErrors] = useState(false);
  const memberName = useRef<TextInput>(null);
  const memberPickup = useRef<TextInput>(null);
  const [members, setMembers] = useState<Member[]>(draft?.members ?? []);
  const [editing, setEditing] = useState<Member | null>(draft?.editing ?? null);
  const [favs, setFavs] = useState<string[]>(draft?.favs ?? []);
  const [cuisines, setCuisines] = useState<Cuisine[]>(draft?.cuisines?.length ? draft.cuisines : DEFAULT_CUISINES);
  const [calendar, setCalendar] = useState(!!draft?.calendar);
  const [showCuisines, setShowCuisines] = useState(false);
  /** the family's own dishes, added when the list doesn't have them (1.0.4) */
  const [ownDishes, setOwnDishes] = useState<Dish[]>(draft?.customDishes ?? []);
  const [adding, setAdding] = useState<string | null>(null);
  const [addSlots, setAddSlots] = useState<SlotId[]>(['lunch', 'dinner']);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    if (draft && (draft.me || draft.name || draft.members.length || draft.editing)) ok('Picked up where you left off ✓');
  }, [draft]);
  useEffect(() => {
    const blank = !name.trim() && !me.trim() && !members.length && !favs.length && !editing && step === 0;
    useStore.getState().setSetupDraft(blank ? null : { step, name, region, me, planner, members, editing, favs, cuisines, calendar, customDishes: ownDishes, savedAt: new Date().toISOString() });
  }, [step, name, region, me, planner, members, editing, favs, cuisines, calendar, ownDishes]);

  const pickable = useMemo(() => CATALOG.filter((d) => cuisines.includes(dishCuisine(d)) && (dishCuisine(d) !== 'indian' || region === 'general' || d.regions.includes(region) || d.regions.includes('general')) &&
    d.slots.some((s) => s !== 'snack') && (!search.trim() || (d.name + ' ' + d.aliases.join(' ')).toLowerCase().includes(search.trim().toLowerCase()))), [region, search, cuisines]);
  const visible = showAll || search.trim() ? pickable : pickable.slice(0, 12);
  const q = search.trim();
  const ownMatches = ownDishes.filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()));
  const exact = !!q && [...CATALOG, ...ownDishes].some((d) => [d.name, ...d.aliases].some((n) => n.toLowerCase() === q.toLowerCase()) || d.id === customDishId(q));
  const didYouMean = q && !visible.length ? similarDishes(q, CATALOG.filter((d) => cuisines.includes(dishCuisine(d)))) : [];
  const addOwn = (meta: CustomMeta, dishName: string) => {
    const d = makeCustomDish(dishName, addSlots.length ? addSlots : ['lunch', 'dinner'], meta);
    setOwnDishes((xs) => [...xs.filter((x) => x.id !== d.id), d]);
    setFavs((fs) => (fs.includes(d.id) ? fs : [...fs, d.id]));
    setAdding(null);
    setSearch('');
    ok('Added “' + d.name + '” to your dishes ✓');
  };
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    const f = newFamily(name.trim() || 'Our family', region);
    f.members = [{ ...planner, name: me.trim() || 'Me' }, ...members];
    f.favourites = favs;
    f.customDishes = ownDishes;
    f.settings.cuisines = cuisines;
    if (calendar) f.settings.foodCalendar = true;
    addFamily(f);
    useStore.getState().setSetupDraft(null);
    scheduleFamilyReminders(f).catch(() => {});
    ok(f.name + ' is ready ✓');
    router.replace('/');
  };
  const startOver = () => {
    useStore.getState().setSetupDraft(null);
    setStep(0); setName(''); setRegion('general'); setMe(''); setMembers([]); setFavs([]); setEditing(null); setCuisines(DEFAULT_CUISINES); setCalendar(false); setOwnDishes([]); setAdding(null);
    setPlanner(newMember('', { roles: ['planner', 'eater', 'shopper'] }));
    setAllergyText('');
    ok('Starting with a fresh page.');
  };
  const advance = () => setStep(Math.min(2, step + 1));
  const footer = <Row>
    {step > 0 ? <Button kind="ghost" label="Back" onPress={() => setStep(step - 1)} /> : null}
    {step === 0 && hasFamilies ? <Button kind="ghost" label="Cancel" onPress={() => { useStore.getState().setSetupDraft(null); router.back(); }} /> : null}
    {step === 2 ? <Button kind="ghost" label="Skip for now" onPress={finish} /> : null}
    <Button label={step === 2 ? 'Start planning' : step === 1 ? 'Continue · favourites' : 'Let’s begin'} onPress={step === 2 ? finish : advance} style={{ flex: 1 }}
      blockedReason={step === 0 && !me.trim() && 'Add your name to continue.'} onBlocked={() => { setMeError(true); meRef.current?.focus(); }} />
  </Row>;

  return (
    <Screen maxWidth={wide ? 1100 : 760} edges={['top', 'bottom']} footer={footer}>
      <Row><View style={{ flex: 1 }}><KitchenBrand /></View><T small muted>Step {step + 1} of 3</T></Row>
      <Row gap={6}>{[0, 1, 2].map((n) => <View key={n} style={{ flex: 1, height: 4, borderRadius: 3, backgroundColor: n <= step ? c.primary : c.border }} />)}</Row>
      {step === 0 ? <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 32 : 20, alignItems: 'stretch' }}>
        <View style={{ flex: wide ? 1 : undefined, minWidth: 0, borderRadius: 24, overflow: 'hidden', height: wide ? 495 : 155, backgroundColor: c.cardAlt }}>
          <Image source={KITCHEN_IMAGES.table} style={{ width: '100%', height: '100%' }} contentFit="cover" priority="high" accessibilityLabel="A colourful shared table of home-cooked food" />
          <View style={{ position: 'absolute', bottom: 16, left: 18, backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 13, borderRadius: 12 }}><Text style={{ color: '#365340', fontSize: 11, fontWeight: '700' }}>A little less deciding. A little more together.</Text></View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, gap: 16, minWidth: 0, justifyContent: 'center' }}>
          <View style={{ gap: 8 }}><Eyebrow>WELCOME TO YOUR FAMILY’S KITCHEN</Eyebrow><Text accessibilityRole="header" style={{ fontFamily: editorialFont, color: c.text, fontSize: wide ? 46 : 32, lineHeight: wide ? 51 : 37 }}>Good food starts{wide ? '\n' : ' '}with your people.</Text><T muted>A few small details. Then let’s find something you’ll love to make.</T></View>
          <Input label="Your name" inputRef={meRef} value={me} onChangeText={(value) => { setMe(value); if (value.trim()) setMeError(false); }} placeholder="What should we call you?" error={meError ? 'Add your name to continue.' : null} autoComplete="given-name" />
          <Input label="Family name" optional value={name} onChangeText={setName} placeholder="e.g. The Sharmas · or leave it to us" />
          <View style={{ gap: 7 }}>
            <T small bold muted>Your everyday kitchen</T>
            {showCuisines ? (
              <Row wrap>
                {CUISINES.map((x) => <Chip key={x.id} choice="checkbox" label={x.emoji + ' ' + x.label} selected={cuisines.includes(x.id)} onPress={() => {
                  if (cuisines.includes(x.id) && cuisines.length === 1) return warn('Keep at least one cuisine.');
                  setCuisines(cuisines.includes(x.id) ? cuisines.filter((y) => y !== x.id) : [...cuisines, x.id]);
                }} />)}
              </Row>
            ) : (
              <Row wrap><T small style={{ flexShrink: 1 }}>{cuisineSummary(cuisines)}</T><LinkText label="Change cuisines" onPress={() => setShowCuisines(true)} /></Row>
            )}
            {cuisines.includes('indian') ? <Segmented<Region> label="Indian dishes from" value={region} onChange={setRegion} options={[{ value: 'south', label: 'South Indian' }, { value: 'north', label: 'North Indian' }, { value: 'general', label: 'A bit of everything' }]} /> : null}
          </View>
          <T small muted>No AI key needed. You can change these details later.</T>
          {draft && (me || name || members.length) ? <Button small kind="ghost" label="Start over" onPress={startOver} style={{ alignSelf: 'flex-start' }} /> : null}
        </View>
      </View> : null}

      {step === 1 ? <>
        <View style={{ gap: 7 }}><Eyebrow>A PLACE FOR EVERYONE</Eyebrow><Text accessibilityRole="header" style={{ fontFamily: editorialFont, color: c.text, fontSize: 34, lineHeight: 40 }}>Who’s coming to the table?</Text><T muted>Start with you. Add your people now, or come back to Family later.</T></View>
        <Card tone="alt"><H2>{me || 'You'}’s place</H2><T small muted>Tell us what you eat so your first suggestions start with the right boundaries.</T>
          <Segmented<Diet> label="Your diet" value={planner.diet} onChange={(diet) => setPlanner({ ...planner, diet })} options={[{ value: 'veg', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' }, { value: 'egg', label: 'Eggetarian' }, { value: 'nonveg', label: 'Non-veg' }]} />
          <Input label="Allergies or ingredients to avoid" optional value={allergyText} onChangeText={(value) => { setAllergyText(value); setPlanner({ ...planner, allergies: value.split(',').map((x) => x.trim()).filter(Boolean) }); }} placeholder="e.g. peanut, milk · separate with commas" />
          <T small muted>You can set spice, fasting and other preferences in Family.</T>
        </Card>
        {members.map((m) => <Button key={m.id} kind="secondary" label={m.name + ' · ' + (m.roles.includes('eater') ? AGE_LABEL[m.ageBand] + ' · ' + DIET_LABEL[m.diet] : 'Cook')} onPress={() => setEditing(m)} />)}
        <H2>More people, more favourites.</H2>
        <Row wrap>
          <Button kind="secondary" label="Add child" icon="＋" onPress={() => setEditing(newMember('', { ageBand: 'child', school: { shortBreak: true, lunchBox: true, schoolDays: [1, 2, 3, 4, 5], pickup: '15:30', holidays: [] } }))} />
          <Button kind="secondary" label="Add adult" icon="＋" onPress={() => setEditing(newMember(''))} />
          <Button kind="secondary" label="Add elder" icon="＋" onPress={() => setEditing(newMember('', { ageBand: 'senior' }))} />
          <Button kind="ghost" label="Add cook" onPress={() => setEditing(newMember('', { roles: ['cook'], eatsAtHome: false, language: 'kn', cookDays: [1, 2, 3, 4, 5, 6], cookSlots: ['breakfast', 'tiffin_short', 'tiffin_lunch', 'lunch'] }))} />
        </Row>
        <T small muted>Only you for now? Continue. There’s always room to add more later.</T>
      </> : null}

      {step === 2 ? <>
        <View style={{ gap: 8 }}><Eyebrow>A LITTLE TASTE OF HOME · OPTIONAL</Eyebrow><Text accessibilityRole="header" style={{ fontFamily: editorialFont, color: c.text, fontSize: 34, lineHeight: 40 }}>What feels like home?</Text><T muted>Pick a few dishes you make often. Or skip this and explore — you can add favourites later.</T></View>
        <Input label="Find a familiar dish" value={search} onChangeText={setSearch} placeholder="Search idli, pasta, dal…" />
        {favs.length || !q || visible.length ? <T small bold>{favs.length ? favs.length + (favs.length === 1 ? ' favourite picked' : ' favourites picked') : q ? 'Matches' : 'A few ideas to get you started'}</T> : null}
        <Row wrap>{[...ownMatches, ...visible].map((d) => <Chip key={d.id} label={d.custom ? d.name + ' · yours' : d.name} selected={favs.includes(d.id)} onPress={() => setFavs(favs.includes(d.id) ? favs.filter((id) => id !== d.id) : [...favs, d.id])} />)}</Row>
        {q && !visible.length && !ownMatches.length ? <T muted>“{q}” isn’t in our list yet.</T> : null}
        {didYouMean.length ? <View style={{ gap: 6 }}><T small bold>Did you mean</T><Row wrap>{didYouMean.map((d) => <Chip key={d.id} label={d.name} selected={favs.includes(d.id)} onPress={() => { setFavs(favs.includes(d.id) ? favs.filter((id) => id !== d.id) : [...favs, d.id]); setSearch(''); }} />)}</Row></View> : null}
        {adding !== null ? <View style={{ gap: 8 }}>
          <Input label="Dish name" value={adding} onChangeText={setAdding} placeholder="e.g. Bread poha" />
          <T small bold muted>When do you usually have it?</T>
          <Row wrap>{OWN_SLOTS.map((x) => <Chip key={x.v} choice="checkbox" label={x.l} selected={addSlots.includes(x.v)} onPress={() => setAddSlots(addSlots.includes(x.v) ? addSlots.filter((y) => y !== x.v) : [...addSlots, x.v])} />)}</Row>
          <CustomDishForm name={adding.trim() || 'your dish'} onCancel={() => setAdding(null)} onConfirm={(meta) => {
            if (!adding.trim()) return warn('Give the dish a name first.');
            if (!addSlots.length) return warn('Pick when you usually have it: breakfast, lunch, snack or dinner.');
            addOwn(meta, adding.trim());
          }} />
        </View> : q && !exact ? <Button kind="secondary" icon="＋" label={'Add “' + q + '” as our dish'} onPress={() => { setAdding(q); setAddSlots(['lunch', 'dinner']); }} /> : !q ? <LinkText label="Don’t see a dish you make? Add your own" onPress={() => { setAdding(''); setAddSlots(['lunch', 'dinner']); }} /> : null}
        {!search.trim() && pickable.length > 12 ? <Button kind="ghost" label={showAll ? 'Show fewer dishes' : 'Explore all ' + pickable.length + ' dishes'} onPress={() => setShowAll(!showAll)} /> : null}
        <Card tone="alt"><T bold>Make it feel like yours.</T><T small muted>Once you’re in, tap Personalise to add a family photo, pick your colours and choose what appears on your home page.</T></Card>
      </> : null}

      <Sheet visible={!!editing} title={editing?.name || 'A new place at the table'} onClose={() => { setEditing(null); setMemberErrors(false); }} footer={editing ? (<Row>{members.some((m) => m.id === editing.id) ? <Button kind="danger" label="Remove" onPress={() => { setMembers(members.filter((m) => m.id !== editing.id)); setEditing(null); ok('Removed from this setup.'); }} /> : null}
            <Button label="Save person" style={{ flex: 1 }} blockedReason={memberProblem(editing)} onBlocked={() => { setMemberErrors(true); (editing.name.trim() ? memberPickup : memberName).current?.focus(); }}
              onPress={() => { setMembers((ms) => ms.some((m) => m.id === editing.id) ? ms.map((m) => m.id === editing.id ? editing : m) : [...ms, editing]); ok('Saved ' + editing.name.trim() + ' ✓'); setMemberErrors(false); setEditing(null); }} />
          </Row>) : undefined}>
        {editing ? <>
          <MemberForm quick key={editing.id} value={editing} onChange={setEditing} showErrors={memberErrors} nameRef={memberName} pickupRef={memberPickup} calendarOn={calendar} onCalendarChange={setCalendar} />

        </> : null}
      </Sheet>
    </Screen>
  );
}
