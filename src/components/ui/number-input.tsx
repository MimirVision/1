import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Stepper } from './controls';
import { Text } from './text';

/** Large numeric input with unit label and +/- steppers. */
export function NumberInput({
  value,
  onChange,
  unit,
  step = 0.2,
  decimals = 1,
  min = 0,
  max = 1000,
  autoFocus,
  size = 'hero',
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  unit: string;
  step?: number;
  decimals?: number;
  min?: number;
  max?: number;
  autoFocus?: boolean;
  size?: 'hero' | 'display';
}) {
  const theme = useTheme();
  const [text, setText] = useState(value === null ? '' : value.toFixed(decimals));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value === null ? '' : value.toFixed(decimals));
  }, [value, decimals]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(',', '.'));
    if (raw.trim() === '' || !Number.isFinite(parsed)) onChange(null);
    else onChange(Math.min(max, Math.max(min, parsed)));
  };

  const bump = (delta: number) => {
    const next = Math.min(max, Math.max(min, Number(((value ?? 0) + delta).toFixed(decimals))));
    setText(next.toFixed(decimals));
    onChange(next);
  };

  const fontSize = size === 'hero' ? 56 : 40;
  // Size the field to its content so the unit label sits right beside the number.
  const chars = Math.max(text.length, (0).toFixed(decimals).length, 2);
  const inputWidth = chars * fontSize * 0.62 + 8;
  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            commit(t);
          }}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            if (value !== null) setText(value.toFixed(decimals));
          }}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoFocus={autoFocus}
          placeholder={(0).toFixed(decimals)}
          placeholderTextColor={theme.textTertiary}
          selectTextOnFocus
          accessibilityLabel={`Value in ${unit}`}
          style={[
            styles.input,
            styles.webNoOutline,
            { color: theme.text, fontSize, lineHeight: fontSize * 1.15, fontFamily: Fonts.rounded, width: inputWidth },
          ]}
        />
        <Text variant="title2" color="textSecondary" style={styles.unit}>
          {unit}
        </Text>
      </View>
      <Stepper onDecrement={() => bump(-step)} onIncrement={() => bump(step)} disabledDecrement={(value ?? 0) <= min} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  input: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    padding: 0,
    borderWidth: 0,
  },
  // react-native-web supports `outlineStyle: 'none'`, which RN's types don't include.
  webNoOutline: (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle,
  unit: { marginLeft: Spacing.xs },
});
