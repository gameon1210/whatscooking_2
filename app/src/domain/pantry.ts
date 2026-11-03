export function pantryItemName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function pantryItemKey(value: string): string {
  return pantryItemName(value).toLowerCase();
}
