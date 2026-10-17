import React from 'react';
import { Text, View } from 'react-native';

import { editorialFont, useColors } from './theme';

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, lineHeight: 16 }}>{children}</Text>;
}
export function KitchenBrand() {
  const c = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text accessible={false} style={{ color: c.primaryText, fontFamily: editorialFont, fontSize: 24, lineHeight: 29 }}>w.</Text></View><Text style={{ color: c.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.6 }}>what’s cooking</Text></View>;
}
