import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

/** No upload: retain a durable app-owned copy; web copies are re-encoded locally. */
export async function prepareHomePhoto(asset: ImagePickerAsset): Promise<string> {
  if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024) throw new Error('Choose a photo under 20 MB. A JPG, PNG or WebP works best.');
  if (Platform.OS !== 'web') {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ idempotent: true });
    const dest = new File(dir, `family-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
    new File(asset.uri).copySync(dest);
    return dest.uri;
  }
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Photo preview is unavailable in this browser.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let result = canvas.toDataURL('image/jpeg', 0.82);
        for (const quality of [0.65, 0.48, 0.3]) if (result.length > 800_000) result = canvas.toDataURL('image/jpeg', quality);
        if (result.length > 800_000) throw new Error('This photo is too detailed to save locally. Try a smaller photo.');
        resolve(result);
      } catch (error) { reject(error); }
      finally { if (asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri); }
    };
    img.onerror = () => { if (asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri); reject(new Error('Couldn’t read that photo. Try a JPG, PNG or WebP.')); };
    img.src = asset.uri;
  });
}
