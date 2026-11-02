import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

/** Mobile browsers resize their visual viewport, rather than the layout viewport. */
export function KeyboardHost({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => setHeight(viewport && viewport.scale === 1 ? Math.min(window.innerHeight, viewport.height) : window.innerHeight);
    resize();
    viewport?.addEventListener('resize', resize);
    window.addEventListener('resize', resize);
    return () => { viewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize); };
  }, []);
  return <View style={height === undefined ? { flex: 1 } : { height, flexShrink: 0 }}>{children}</View>;
}
