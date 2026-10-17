import * as Clipboard from 'expo-clipboard';
import { Linking, Share } from 'react-native';

import { whatsappLink } from '@/domain/links';
import { fail, ok } from '@/ui/feedback';

/**
 * Every hand-off is a message the user sends to whoever they choose (1.0.2).
 * `shareMessage` opens the phone's share sheet (WhatsApp, SMS, iMessage, Telegram,
 * email...). Where there is no share sheet (some browsers) the text is copied instead.
 * Returns true when the message may have gone out, false when the user closed it.
 */
export async function shareMessage(text: string): Promise<boolean> {
  try {
    const r = await Share.share({ message: text });
    return r.action !== Share.dismissedAction;
  } catch {
    await Clipboard.setStringAsync(text);
    ok('Copied. Paste it into any chat or app.');
    return true;
  }
}

/** Opens WhatsApp with the message filled in; the user picks the chat. */
export async function shareOnWhatsApp(text: string): Promise<boolean> {
  try {
    await Linking.openURL(whatsappLink(text));
    return true;
  } catch {
    await Clipboard.setStringAsync(text);
    fail('Couldn’t open WhatsApp. The message is copied: paste it into any app.');
    return true;
  }
}

/** Copies text and confirms it on screen. */
export async function copyText(text: string, what = 'Copied'): Promise<void> {
  await Clipboard.setStringAsync(text);
  ok(`${what}. Paste it anywhere.`);
}
