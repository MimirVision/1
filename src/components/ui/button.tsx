import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const HEIGHT: Record<Size, number> = { lg: 56, md: 46, sm: 36 };
const TEXT: Record<Size, 'headline' | 'callout' | 'subhead'> = { lg: 'headline', md: 'callout', sm: 'subhead' };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth = true,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.primary, fg: theme.onPrimary },
    secondary: { bg: theme.primarySoft, fg: theme.primary },
    ghost: { bg: 'transparent', fg: theme.primary },
    outline: { bg: 'transparent', fg: theme.text, border: theme.border },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
  };
  const { bg, fg, border } = palette[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        haptics.impact();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          backgroundColor: bg,
          borderColor: border ?? 'transparent',
          borderWidth: border ? 1 : 0,
          paddingHorizontal: size === 'sm' ? Spacing.md : Spacing.xl,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !inactive ? 0.98 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={size === 'sm' ? 14 : 18} tint={fg} weight="semibold" />}
          <Text variant={TEXT[size]} tint={fg} weight="700">
            {title}
          </Text>
          {iconRight && <Icon name={iconRight} size={size === 'sm' ? 12 : 15} tint={fg} weight="semibold" />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
