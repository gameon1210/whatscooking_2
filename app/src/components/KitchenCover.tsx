import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import type { HomePreferences } from '@/domain/types';
import { editorialFont } from '@/ui/theme';

export const KITCHEN_IMAGES = {
  table: require('../../assets/images/kitchen/shared-table.jpg'),
  garden: require('../../assets/images/kitchen/garden-counter.jpg'),
};

/** Mood photography is a cover, never represented as a photograph of a suggested dish. */
export function KitchenCover({ home, familyName, small = false, greeting }: { home: HomePreferences; familyName: string; small?: boolean; greeting?: string }) {
  const { width } = useWindowDimensions();
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const custom = home.cover === 'photo' && home.photoUri && failedPhoto !== home.photoUri;
  return (
    <View style={{ height: small ? 200 : width > 800 ? 185 : 190, borderRadius: 24, overflow: 'hidden', backgroundColor: '#414831' }}>
      <Image
        source={custom ? { uri: home.photoUri } : KITCHEN_IMAGES[home.cover === 'garden' ? 'garden' : 'table']}
        contentFit="cover" contentPosition={home.photoPosition} priority="high"
        style={{ position: 'absolute', inset: 0 }}
        accessibilityLabel={custom ? `${familyName}’s chosen family photo` : home.cover === 'garden' ? 'A sunlit kitchen counter with fresh vegetables and herbs' : 'A shared table with home-cooked food'}
        onError={() => custom && setFailedPhoto(home.photoUri!)}
      />
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,22,12,0.60)' }} />
      <View style={{ flex: 1, padding: 22, justifyContent: 'flex-end', gap: 7 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>{greeting ? greeting.toUpperCase() : 'A PLACE AT YOUR TABLE'}</Text>
        <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: editorialFont, color: '#FFFFFF', fontSize: small ? 30 : width > 800 ? 38 : 30, lineHeight: small ? 36 : width > 800 ? 44 : 35, maxWidth: 650 }}>{home.headline}</Text>
        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 13 }}>{familyName} · one delicious day at a time</Text>
      </View>
    </View>
  );
}
