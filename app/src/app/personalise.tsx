import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { KitchenCover, KITCHEN_IMAGES } from '@/components/KitchenCover';
import { HOME_DEFAULTS, homePreferences } from '@/domain/home';
import type { HomePreferences, KitchenCover as CoverId } from '@/domain/types';
import { removePhotos } from '@/services/files';
import { prepareHomePhoto } from '@/services/home-photo';
import { useFamily, useStore } from '@/state/store';
import { Eyebrow } from '@/ui/editorial';
import { ok } from '@/ui/feedback';
import { Button, Card, Chip, H2, Input, Row, Screen, Segmented, spaceKey, T, Toggle } from '@/ui/kit';
import { KITCHEN_THEMES, useColors } from '@/ui/theme';

const referencedPhotos = () => Object.values(useStore.getState().families).flatMap((f) => [f.settings.home?.photoUri, ...f.entries.map((e) => e.photoUri)]);

export default function Personalise() {
  const family = useFamily();
  const c = useColors();
  const [draft, setDraft] = useState<HomePreferences>(() => homePreferences(family?.settings.home));
  const pendingPhotos = useRef(new Set<string>());
  const set = (patch: Partial<HomePreferences>) => setDraft((value) => ({ ...value, ...patch }));

  useEffect(() => () => { removePhotos([...pendingPhotos.current], referencedPhotos()); }, []);

  if (!family) return null;
  const choosePhoto = async () => {
    // SDK 57 uses the system picker on supported native platforms: access to a
    // selected photo needs no broad library request. On web this call also stays
    // in the originating click, as required for opening the file chooser.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, exif: false });
    if (result.canceled || !result.assets?.[0]) return;
    const photoUri = await prepareHomePhoto(result.assets[0]);
    pendingPhotos.current.add(photoUri);
    set({ photoUri, cover: 'photo' });
    ok('Photo ready. Save to make it your cover.');
  };

  const save = async () => {
    const previous = family.settings.home?.photoUri;
    try {
      await useStore.getState().saveHome(family.id, homePreferences(draft));
    } catch {
      throw new Error('Your changes could not be saved. Local storage may be full. Try a smaller photo; your previous home is still saved.');
    }
    if (previous && previous !== draft.photoUri) removePhotos([previous], referencedPhotos());
    ok('Your kitchen has a new look ✓');
    router.back();
  };

  return (
    <Screen edges={['bottom']} title="A home that feels like yours." subtitle="A family snapshot. A favourite colour. A little more you." footer={<Row><Button kind="ghost" label="Cancel" onPress={() => router.back()} /><Button label="Save my home" onPress={save} style={{ flex: 1 }} /></Row>}>
      <Eyebrow>YOUR HOME PREVIEW</Eyebrow>
      <KitchenCover home={homePreferences(draft)} familyName={family.name} small />
      <T small muted>Preview your changes here. They apply after you tap Save my home.</T>

      <H2>Choose your cover</H2>
      <Row wrap>
        {([{ id: 'table', name: 'Around the table' }, { id: 'garden', name: 'Fresh from the garden' }] as { id: CoverId; name: string }[]).map((cover) => (
          <Pressable key={cover.id} role="radio" aria-checked={draft.cover === cover.id} accessibilityState={{ checked: draft.cover === cover.id }} accessibilityLabel={cover.name}
            onPress={() => set({ cover: cover.id })} {...spaceKey(() => set({ cover: cover.id }))}
            style={{ flexBasis: 140, flexGrow: 1, borderWidth: 2, borderColor: draft.cover === cover.id ? c.primary : c.border, borderRadius: 16, padding: 6, gap: 8, backgroundColor: c.card }}>
            <Image source={KITCHEN_IMAGES[cover.id as 'table' | 'garden']} contentFit="cover" style={{ height: 90, width: '100%', borderRadius: 10 }} accessible={false} />
            <T small bold style={{ padding: 5 }}>{cover.name}{draft.cover === cover.id ? ' ✓' : ''}</T>
          </Pressable>
        ))}
      </Row>
      <Card tone="alt">
        <T bold>Your people. Your place.</T>
        <T small muted>Make a family photo, a holiday memory or your own kitchen the cover. Your chosen photo stays on this device and is not sent to AI.</T>
        <Row wrap>
          <Button label={draft.photoUri ? 'Change family photo' : 'Add a family photo'} icon="＋" onPress={choosePhoto} />
          {draft.photoUri ? <Button kind="ghost" label="Remove photo" onPress={() => set({ cover: 'table', photoUri: undefined })} /> : null}
        </Row>
        {draft.photoUri ? <>
          <Chip choice="radio" label="Use my family photo" selected={draft.cover === 'photo'} onPress={() => set({ cover: 'photo' })} />
          <Segmented label="Photo framing" value={draft.photoPosition} onChange={(photoPosition) => set({ photoPosition })} options={[{ value: 'top', label: 'Keep the top' }, { value: 'center', label: 'Centre' }, { value: 'bottom', label: 'Keep the bottom' }]} />
        </> : null}
      </Card>

      <H2>A colour for your kitchen</H2>
      <View role="radiogroup" accessibilityLabel="Kitchen colour theme" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {KITCHEN_THEMES.map((theme) => <Pressable key={theme.id} role="radio" aria-checked={draft.theme === theme.id} accessibilityState={{ checked: draft.theme === theme.id }} accessibilityLabel={theme.name}
          {...spaceKey(() => set({ theme: theme.id }))} onPress={() => set({ theme: theme.id })}
          style={{ flexBasis: 145, flexGrow: 1, backgroundColor: theme.colors.bg, borderWidth: 2, borderColor: draft.theme === theme.id ? c.primary : c.border, borderRadius: 16, padding: 16, gap: 9, minHeight: 115 }}>
          <Row>{[theme.colors.primary, theme.colors.primarySoft, theme.colors.text].map((color, index) => <View key={index} style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: color }} />)}</Row>
          <T bold small style={{ color: theme.colors.text }}>{theme.name}{draft.theme === theme.id ? ' ✓' : ''}</T>
          <T small style={{ color: theme.colors.muted }}>{theme.note}</T>
        </Pressable>)}
      </View>
      <Chip choice="radio" label="Follow device light / dark mode" selected={draft.theme === 'system'} onPress={() => set({ theme: 'system' })} />

      <H2>A little message from home</H2>
      <Input label="Cover message" value={draft.headline} onChangeText={(headline) => set({ headline })} maxLength={70} placeholder={HOME_DEFAULTS.headline} />
      <T small muted>{draft.headline.length}/70 characters · leave blank for the original message</T>

      <H2>Make room for what matters</H2>
      <Card>
        <Toggle label="People at your table" hint="Family initials and a shortcut to your people" value={draft.showFamily} onChange={(showFamily) => set({ showFamily })} />
        <Toggle label="Weather at home" hint="Use your saved city; no location permission needed" value={draft.showWeather} onChange={(showWeather) => set({ showWeather })} />
        <Toggle label="What’s in the kitchen" hint="An expandable pantry and leftovers section" value={draft.showPantry} onChange={(showPantry) => set({ showPantry })} />
        <Toggle label="A little ahead" hint="Tomorrow’s planning card; notification settings stay in Settings" value={draft.showTomorrow} onChange={(showTomorrow) => set({ showTomorrow })} />
        <Toggle label="From your food memory" hint="A recent meal, with a link to your history" value={draft.showMemories} onChange={(showMemories) => set({ showMemories })} />
      </Card>
      <Button kind="ghost" label="Reset this preview" onPress={() => setDraft({ ...HOME_DEFAULTS })} />
    </Screen>
  );
}
