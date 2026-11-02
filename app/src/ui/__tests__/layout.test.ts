/// <reference types="jest" />
import { bottomTabLayout } from '@/ui/layout';

test.each([0, 16, 24, 34, 48])('a %s dp system inset leaves the tab icon and label a full touch area', (inset) => {
  const bar = bottomTabLayout(inset);
  expect(bar.paddingBottom).toBeGreaterThanOrEqual(inset + 8);
  expect(bar.height - bar.paddingTop - bar.paddingBottom).toBeGreaterThanOrEqual(48);
  expect(bar.height - inset).toBe(72);
});
