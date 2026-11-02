/** Keep the tab controls above both gesture handles and Android's three buttons. */
export function bottomTabLayout(bottomInset: number) {
  const safeBottom = Math.max(0, bottomInset);
  return { height: 72 + safeBottom, paddingTop: 8, paddingBottom: 8 + safeBottom };
}

export const INPUT_CLEARANCE = 20;
