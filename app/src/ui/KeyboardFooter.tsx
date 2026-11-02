import React from 'react';
import { View, type ViewProps } from 'react-native';

export function KeyboardFooter({ bottomInset: _bottomInset, ...props }: ViewProps & { bottomInset?: number }) {
  return <View {...props} />;
}
