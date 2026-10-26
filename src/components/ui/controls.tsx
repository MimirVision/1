import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export function Chip({
  label,
  selected,
  onPress,
  icon,
  color,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Accent used when selected (defaults to primary). */
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const accent = color ?? theme.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? accent : theme.surface,
          borderColor: selected ? accent : theme.border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {icon && <Icon name={icon} size={14} tint={selected ? theme.onPrimary : theme.textSecondary} />}
      <Text variant="subhead" weight="600" tint={selected ? theme.onPrimary : theme.text}>
        {label}
      </Text>
    </Pressable>
  );
}

export function OptionCard({
  title,
  subtitle,
  icon,
  iconColor,
  selected,
  onPress,
  multi,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  selected?: boolean;
  onPress: () => void;
  multi?: boolean;
  right?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: !!selected }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}>
      {icon && (
        <View style={[styles.optionIcon, { backgroundColor: selected ? theme.surface : theme.surfaceAlt }]}>
          <Icon name={icon} size={20} tint={iconColor ?? theme.primary} />
        </View>
      )}
      <View style={styles.optionText}>
        <Text variant="headline">{title}</Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      <View
        style={[
          multi ? styles.checkbox : styles.radio,
          { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' },
        ]}>
        {selected && <Icon name="check" size={12} tint={theme.onPrimary} weight="bold" />}
      </View>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.surfaceSunken }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptics.tap();
              onChange(option.value);
            }}
            style={[styles.segment, active && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }]}>
            <Text variant="subhead" weight={active ? '700' : '500'} color={active ? 'text' : 'textSecondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  onDecrement,
  onIncrement,
  disabledDecrement,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
  disabledDecrement?: boolean;
}) {
  const theme = useTheme();
  const button = (icon: IconName, onPress: () => void, disabled?: boolean, label?: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.surfaceAlt, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Icon name={icon} size={18} color="text" weight="semibold" />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {button('minus', onDecrement, disabledDecrement, 'Decrease')}
      {button('plus', onIncrement, false, 'Increase')}
    </View>
  );
}

export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptics.tap();
        onValueChange(v);
      }}
      trackColor={{ true: theme.primary, false: theme.surfaceSunken }}
      thumbColor="#FFFFFF"
      // react-native-web colors the active thumb separately.
      {...({ activeThumbColor: '#FFFFFF' } as object)}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  optionIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 3 },
  segment: { flex: 1, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', gap: Spacing.sm },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
