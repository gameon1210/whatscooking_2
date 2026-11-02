import React from 'react';
import type { ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { INPUT_CLEARANCE } from './layout';

export function KeyboardScroll({ footerHeight = 0, ...props }: ScrollViewProps & { footerHeight?: number }) {
  return <KeyboardAwareScrollView {...props} bottomOffset={footerHeight + INPUT_CLEARANCE} extraKeyboardSpace={footerHeight} disableScrollOnKeyboardHide keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" />;
}
