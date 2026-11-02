import React from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export function KeyboardHost({ children }: { children: React.ReactNode }) {
  return <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge preload={false}>{children}</KeyboardProvider>;
}
