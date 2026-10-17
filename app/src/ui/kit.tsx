import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normalizeTime } from '@/domain/dates';
import { ToastMsg, useStore } from '@/state/store';

import { errorText, fail, warn } from './feedback';
import { palette, radius, space, useColors } from './theme';

export function Screen({
  title,
  subtitle,
  right,
  children,
  scroll = true,
  edges = ['top'],
  maxWidth = 760,
  footer,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  maxWidth?: number;
  footer?: React.ReactNode;
}) {
  const c = useColors();
  const body = (
    <View style={{ padding: space.lg, gap: space.lg, maxWidth, width: '100%', alignSelf: 'center' }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.text }} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={{ color: c.muted, marginTop: 2 }}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>{body}</ScrollView> : body}
      {footer ? <View style={{ borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.card }}><View style={{ padding: space.md, maxWidth, width: '100%', alignSelf: 'center' }}>{footer}</View></View> : null}
    </SafeAreaView>
  );
}

export function Card({ children, style, tone }: { children: React.ReactNode; style?: ViewStyle; tone?: 'alt' | 'good' | 'warn' | 'bad' }) {
  const c = useColors();
  const bg = tone === 'alt' ? c.cardAlt : tone === 'good' ? c.goodSoft : tone === 'warn' ? c.warnSoft : tone === 'bad' ? c.badSoft : c.card;
  return (
    <View style={[{ backgroundColor: bg, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: c.border, gap: space.sm }, style]}>
      {children}
    </View>
  );
}

export function H2({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, flex: 1 }} accessibilityRole="header">
        {children}
      </Text>
      {right}
    </View>
  );
}

export function T({ children, muted, small, bold, style, numberOfLines }: { children: React.ReactNode; muted?: boolean; small?: boolean; bold?: boolean; style?: any; numberOfLines?: number }) {
  const c = useColors();
  return (
    <Text numberOfLines={numberOfLines} style={[{ color: muted ? c.muted : c.text, fontSize: small ? 13 : 15, fontWeight: bold ? '700' : '400', lineHeight: small ? 18 : 21 }, style]}>
      {children}
    </Text>
  );
}

/**
 * The feedback rule (1.0.2): a button is never silently dead.
 * - `blockedReason`: the action can't run yet. The button looks faded but still
 *   answers a tap with the reason (and vibrates), then calls `onBlocked` so the
 *   screen can show its field errors or focus the field to fix.
 * - `onPress` may be async: the button shows a spinner while it runs and ignores
 *   repeat taps, and anything thrown is shown as an error instead of vanishing.
 */
export function Button({
  label,
  onPress,
  kind = 'primary',
  blockedReason,
  onBlocked,
  loading,
  icon,
  small,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void | Promise<unknown>;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  blockedReason?: string | null | false;
  onBlocked?: () => void;
  loading?: boolean;
  icon?: string;
  small?: boolean;
  style?: ViewStyle;
  /** for icon-only labels such as ✓ or ✕ */
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const [running, setRunning] = React.useState(false);
  const busy = !!loading || running;
  const blocked = !!blockedReason;
  const bg = blocked ? c.chip : kind === 'primary' ? c.primary : kind === 'secondary' ? c.primarySoft : kind === 'danger' ? c.badSoft : 'transparent';
  const fg = blocked ? c.text : kind === 'primary' ? c.primaryText : kind === 'danger' ? c.bad : c.primary;
  const press = async () => {
    if (busy) return;
    if (blockedReason) {
      warn(blockedReason);
      onBlocked?.();
      return;
    }
    if (!onPress) return;
    try {
      const r = onPress();
      if (r && typeof (r as Promise<unknown>).then === 'function') {
        setRunning(true);
        await r;
      }
    } catch (e) {
      fail(`Couldn’t ${label.toLowerCase()}. ${errorText(e)}`);
    } finally {
      setRunning(false);
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={blocked ? `Not ready: ${blockedReason}` : undefined}
      accessibilityState={{ busy }}
      onPress={press}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: small ? 10 : 13,
          paddingHorizontal: small ? 12 : 18,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
          // 48dp touch target for every button, small ones included (FSD section 9, D40)
          minHeight: 48,
          opacity: pressed ? 0.75 : busy ? 0.85 : 1,
          transform: pressed ? [{ scale: 0.98 }] : undefined,
          borderWidth: kind === 'ghost' || blocked ? 1 : 0,
          borderColor: c.border,
        },
        style,
      ]}>
      {busy ? <ActivityIndicator color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * On the web, Space activates only role="button" by default; switches, checkboxes and
 * radios need it too (W3C APG, R13). Native platforms handle this themselves.
 */
export function spaceKey(fn?: () => void): Record<string, unknown> {
  if (Platform.OS !== 'web' || !fn) return {};
  return {
    onKeyDown: (e: { key: string; preventDefault: () => void }) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        fn();
      }
    },
  };
}

/**
 * A chip that can be on or off is a checkbox (or a radio inside a Segmented), so
 * screen readers say "checked / not checked" (R14). Plain action chips stay buttons.
 */
export function Chip({
  label,
  selected,
  onPress,
  tone,
  accessibilityLabel,
  choice,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'good' | 'warn';
  accessibilityLabel?: string;
  choice?: 'radio' | 'checkbox' | 'button';
}) {
  const c = useColors();
  const bg = selected ? c.primary : tone === 'good' ? c.goodSoft : tone === 'warn' ? c.warnSoft : c.chip;
  const fg = selected ? c.primaryText : tone === 'good' ? c.good : tone === 'warn' ? c.warn : c.text;
  const role = !onPress ? undefined : (choice ?? (selected === undefined ? 'button' : 'checkbox'));
  const checkable = role === 'checkbox' || role === 'radio';
  return (
    <Pressable
      role={role}
      accessibilityLabel={accessibilityLabel ?? label}
      aria-checked={checkable ? !!selected : undefined}
      accessibilityState={checkable ? { checked: !!selected } : undefined}
      onPress={onPress}
      disabled={!onPress}
      {...(checkable ? spaceKey(onPress) : {})}
      style={({ pressed }) => ({ backgroundColor: bg, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, opacity: pressed ? 0.8 : 1, minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' })}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, gap = space.sm, wrap, style }: { children: React.ReactNode; gap?: number; wrap?: boolean; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function ChipScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
      {children}
    </ScrollView>
  );
}

export function Input(props: TextInputProps & { label?: string; error?: string | null | false; optional?: boolean; inputRef?: React.Ref<TextInput> }) {
  const c = useColors();
  const { label: rawLabel, style, error, optional, inputRef, ...rest } = props;
  const label = rawLabel && optional ? `${rawLabel} (optional)` : rawLabel;
  // The visible label (or the placeholder) is also the screen-reader name (D40).
  const name = rest.accessibilityLabel ?? label ?? rest.placeholder;
  return (
    <View style={{ gap: 4 }}>
      {label ? (
        <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }} accessible={false} importantForAccessibility="no">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={inputRef}
        placeholderTextColor={c.muted}
        {...rest}
        accessibilityLabel={name}
        aria-label={name}
        aria-invalid={error ? true : undefined}
        style={[
          { backgroundColor: c.card, borderColor: error ? c.bad : c.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, color: c.text, fontSize: 15, minHeight: 48 },
          style,
        ]}
      />
      {error ? (
        <Text style={{ color: c.bad, fontSize: 13 }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A time typed the way people say it: "3:30 pm", "15:30", "1530" (1.0.2).
 * `onChange` gets the clean "HH:MM", or null with the raw text while it isn't a time yet.
 * The error shows once the field is left, or when `showError` is set (after a blocked Save).
 */
export function TimeInput({
  label,
  value,
  onChange,
  placeholder = '3:30 pm',
  showError,
  errorSuffix,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (valid: string | null, raw: string) => void;
  placeholder?: string;
  showError?: boolean;
  errorSuffix?: string;
  inputRef?: React.Ref<TextInput>;
}) {
  const [text, setText] = React.useState(value);
  const [left, setLeft] = React.useState(false);
  const parsed = normalizeTime(text);
  const bad = !parsed && (left || showError);
  return (
    <Input
      label={label}
      value={text}
      inputRef={inputRef}
      keyboardType="numbers-and-punctuation"
      autoCapitalize="none"
      placeholder={placeholder}
      error={bad ? `Not a time yet. Try 3:30 pm or 15:30.${errorSuffix ? ' ' + errorSuffix : ''}` : null}
      onChangeText={(t) => {
        setText(t);
        onChange(normalizeTime(t), t);
      }}
      onBlur={() => {
        setLeft(true);
        if (parsed && parsed !== text) setText(parsed);
      }}
    />
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <View role="radiogroup" accessibilityLabel={label}>
      <Row wrap>
        {options.map((o) => (
          <Chip key={o.value} choice="radio" label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </Row>
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

export function Empty({ emoji, title, body }: { emoji: string; title: string; body?: string }) {
  return (
    <Card tone="alt" style={{ alignItems: 'center', paddingVertical: space.xl }}>
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <T bold>{title}</T>
      {body ? (
        <T muted small style={{ textAlign: 'center' }}>
          {body}
        </T>
      ) : null}
    </Card>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const c = useColors();
  // A modal covers the app's own toast, so while a sheet is open the toast is drawn inside it.
  React.useEffect(() => {
    if (!visible) return;
    useStore.getState().openSheet();
    return () => useStore.getState().closeSheet();
  }, [visible]);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg, paddingBottom: space.sm }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: c.text }}>{title}</Text>
          {/* 48 x 48 close target (R15) */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => ({ width: 48, height: 48, marginRight: -12, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.chip : 'transparent' })}>
            <Text style={{ fontSize: 22, color: c.muted }}>✕</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.md }}>
          {children}
        </ScrollView>
      </View>
      <ToastHost inSheet />
    </Modal>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const c = useColors();
  return (
    <Pressable
      role="switch"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      aria-checked={value}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      {...spaceKey(() => onChange(!value))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6, minHeight: 48 }}>
      <View style={{ flex: 1 }}>
        <T>{label}</T>
        {hint ? (
          <T small muted>
            {hint}
          </T>
        ) : null}
      </View>
      <View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: value ? c.primary : c.border, padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
      </View>
    </Pressable>
  );
}

/** A small tappable text link with a full 48dp touch target. */
export function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const TOAST_ICON = { ok: '✓', warn: '!', error: '✕', info: 'i' } as const;
const TOAST_MS = { ok: 2500, info: 4500, warn: 6000, error: 7000 } as const;

/** Bottom message: what happened after a tap (saved, refused and why, failed). Tap to dismiss. */
export function Toast({ toast, onDone }: { toast: ToastMsg | null; onDone: () => void }) {
  const c = useColors();
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, TOAST_MS[toast.tone]);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  if (!toast) return null;
  const dot = toast.tone === 'ok' ? palette.light.good : toast.tone === 'warn' ? palette.light.warn : toast.tone === 'error' ? palette.light.bad : palette.light.muted;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Platform.OS === 'web' ? 88 : 120, alignItems: 'center', paddingHorizontal: space.lg }}>
      <Pressable
        onPress={onDone}
        accessibilityRole="alert"
        accessibilityLabel={`${toast.text}. Tap to close.`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.text, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, maxWidth: 560, minHeight: 48, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: dot, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{TOAST_ICON[toast.tone]}</Text>
        </View>
        <Text style={{ color: c.bg, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{toast.text}</Text>
      </Pressable>
    </View>
  );
}

/** The app's one toast. The root copy hides while a sheet is open; the sheet draws its own. */
export function ToastHost({ inSheet }: { inSheet?: boolean }) {
  const toast = useStore((s) => s.toast);
  const sheets = useStore((s) => s.sheets);
  const showToast = useStore((s) => s.showToast);
  const done = React.useCallback(() => showToast(null), [showToast]);
  if (!inSheet && sheets > 0) return null;
  return <Toast toast={toast} onDone={done} />;
}
