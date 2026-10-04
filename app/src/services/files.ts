import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Share a text file (JSON/CSV export, FR-293). The temporary copy is removed afterwards. */
export async function shareTextFile(name: string, content: string, mime: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: name });
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // the OS clears the cache folder anyway
    }
  }
}

/** Keep meal photos in app storage (the picker's cache can be cleared). */
export function keepPhoto(uri: string): string {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ idempotent: true });
    const src = new File(uri);
    const dest = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`);
    src.copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/**
 * Delete stored meal photos (FR-293, D39). `stillUsed` lists photo URIs that other
 * meals or families still reference; those are kept. Returns how many were removed.
 */
export function removePhotos(uris: (string | undefined)[], stillUsed: (string | undefined)[] = []): number {
  if (Platform.OS === 'web') return 0;
  const keep = new Set(stillUsed.filter(Boolean) as string[]);
  let n = 0;
  for (const uri of new Set(uris.filter(Boolean) as string[])) {
    if (keep.has(uri)) continue;
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
        n++;
      }
    } catch {
      // already gone, or not a file this app owns
    }
  }
  return n;
}
