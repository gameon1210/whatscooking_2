import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Share a text file (JSON/CSV export, FR-293). */
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
  await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: name });
}

/** Keep meal photos in app storage (the picker's cache can be cleared). */
export function keepPhoto(uri: string): string {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ idempotent: true });
    const src = new File(uri);
    const dest = new File(dir, `${Date.now()}.jpg`);
    src.copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}
