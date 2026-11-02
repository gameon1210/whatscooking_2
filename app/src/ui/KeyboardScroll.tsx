import React, { useEffect, useRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

/** Browser fallback: keep the focused field inside the actual scroll container. */
export function KeyboardScroll({ footerHeight = 0, ...props }: ScrollViewProps & { footerHeight?: number }) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    let frame = 0;
    const reveal = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const container = ref.current?.getScrollableNode() as HTMLElement | undefined;
        const field = document.activeElement;
        if (field instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(field.tagName) && container?.contains(field)) {
          field.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      });
    };
    document.addEventListener('focusin', reveal);
    window.visualViewport?.addEventListener('resize', reveal);
    const container = ref.current?.getScrollableNode() as HTMLElement | undefined;
    if (container) container.style.scrollPaddingBottom = `${footerHeight + 20}px`;
    return () => { cancelAnimationFrame(frame); document.removeEventListener('focusin', reveal); window.visualViewport?.removeEventListener('resize', reveal); };
  }, [footerHeight]);
  return <ScrollView {...props} ref={ref} keyboardShouldPersistTaps="handled" />;
}
