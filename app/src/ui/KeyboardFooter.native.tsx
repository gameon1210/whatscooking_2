import React from 'react';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import type { ViewProps } from 'react-native';

export function KeyboardFooter({ bottomInset = 0, ...props }: ViewProps & { bottomInset?: number }) {
  return <KeyboardStickyView {...props} offset={{ opened: bottomInset }} />;
}
