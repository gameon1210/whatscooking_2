import React from 'react';
import {
  ActivityIndicator,
  Modal,
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

import { radius, space, useColors } from './theme';

export function Screen({
  title,
  subtitle,
  right,
  children,
  scroll = true,
  edges = ['top'],
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const c = useColors();
  const body = (
    <View style={{ padding: space.lg, gap: space.lg, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
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
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>{body}</ScrollView> : body}
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

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  icon,
  small,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  small?: boolean;
  style?: ViewStyle;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.primary : kind === 'secondary' ? c.primarySoft : kind === 'danger' ? c.badSoft : 'transparent';
  const fg = kind === 'primary' ? c.primaryText : kind === 'danger' ? c.bad : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: small ? 8 : 13,
          paddingHorizontal: small ? 12 : 18,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
          minHeight: small ? 36 : 48,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          borderWidth: kind === 'ghost' ? 1 : 0,
          borderColor: c.border,
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'good' | 'warn' }) {
  const c = useColors();
  const bg = selected ? c.primary : tone === 'good' ? c.goodSoft : tone === 'warn' ? c.warnSoft : c.chip;
  const fg = selected ? c.primaryText : tone === 'good' ? c.good : tone === 'warn' ? c.warn : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: bg, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, opacity: pressed ? 0.8 : 1, minHeight: 36, justifyContent: 'center' })}>
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

export function Input(props: TextInputProps & { label?: string }) {
  const c = useColors();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...rest}
        style={[
          { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, color: c.text, fontSize: 15, minHeight: 46 },
          style,
        ]}
      />
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <Row wrap>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </Row>
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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg, paddingBottom: space.sm }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: c.text }}>{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
            <Text style={{ fontSize: 22, color: c.muted }}>✕</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.md }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6, minHeight: 44 }}>
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
