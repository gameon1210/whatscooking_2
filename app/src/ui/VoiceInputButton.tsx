import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Keyboard, Pressable, Text } from 'react-native';

import { warn } from './feedback';
import { radius, useColors } from './theme';

type Recognizer = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;
let activeSession: symbol | null = null;

export function VoiceInputButton({ label, language, onText }: { label: string; language: string; onText: (text: string) => void }) {
  const c = useColors();
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening'>('idle');
  const control = useRef<{ cancel: () => void; stop: () => void } | null>(null);
  useFocusEffect(useCallback(() => () => control.current?.cancel(), []));

  const start = async () => {
    if (activeSession) return warn('Finish the current dictation first.');
    const session = Symbol();
    activeSession = session;
    setStatus('starting');
    Keyboard.dismiss();

    let recognizer: Recognizer | undefined;
    let transcript = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listeners: { remove: () => void }[] = [];
    const release = (reset: boolean) => {
      if (activeSession !== session) return false;
      activeSession = null;
      clearTimeout(timer);
      listeners.forEach((listener) => listener.remove());
      control.current = null;
      if (reset) setStatus('idle');
      return true;
    };
    control.current = {
      cancel: () => {
        if (release(true)) recognizer?.abort();
      },
      stop: () => recognizer?.stop(),
    };

    try {
      recognizer = (await import('expo-speech-recognition')).ExpoSpeechRecognitionModule;
      if (activeSession !== session) return;
      if (!recognizer.isRecognitionAvailable()) {
        if (release(true)) warn('Dictation is unavailable here. You can type or use your keyboard microphone.');
        return;
      }
      const permission = await recognizer.requestPermissionsAsync();
      if (activeSession !== session) return;
      if (!permission.granted) {
        if (release(true)) warn('Allow microphone and speech access in your device settings to dictate.');
        return;
      }
      listeners.push(
        recognizer.addListener('result', (event) => {
          if (event.isFinal) transcript = event.results[0]?.transcript.trim() ?? '';
        }),
        recognizer.addListener('end', () => {
          if (!release(true)) return;
          if (transcript) onText(transcript);
          else warn('No speech was captured. Tap the microphone to try again.');
        }),
        recognizer.addListener('error', ({ error }) => {
          if (release(true) && error !== 'aborted') warn(error === 'not-allowed' ? 'Microphone access is off. You can change it in settings.' : 'Couldn’t transcribe that. Try again or type it in.');
        }),
      );
      setStatus('listening');
      recognizer.start({ lang: language, interimResults: false, continuous: false, maxAlternatives: 1 });
      timer = setTimeout(() => {
        if (release(true)) {
          recognizer?.abort();
          warn('Dictation timed out. Try speaking a shorter phrase.');
        }
      }, 60_000);
    } catch {
      if (release(true)) warn('Dictation is unavailable here. You can type or use your keyboard microphone.');
    }
  };

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={status === 'listening' ? `Stop dictating ${label}` : `Dictate ${label}`}
    accessibilityState={{ busy: status === 'starting', selected: status === 'listening' }}
    onPress={status === 'listening' ? () => control.current?.stop() : status === 'idle' ? start : undefined}
    style={{ minWidth: 48, minHeight: 48, paddingHorizontal: 8, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: status === 'listening' ? c.primary : c.primarySoft }}>
    <Text style={{ color: status === 'listening' ? c.primaryText : c.primary, fontSize: 16 }}>{status === 'listening' ? '■ Stop' : status === 'starting' ? '…' : '🎙'}</Text>
  </Pressable>;
}
