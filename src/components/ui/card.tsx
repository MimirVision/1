import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Radius, Spacing, type ColorName } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';

interface CardProps extends ViewProps {
  padded?: boolean;
  tone?: ColorName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padded = true, tone = 'surface', onPress, style, children, ...props }: CardProps) {
  const theme = useTheme();
  const dark = useIsDark();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: theme[tone],
      borderColor: dark ? theme.border : 'transparent',
      shadowColor: theme.shadow,
    },
    padded && styles.padded,
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        {...props}
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        style={({ pressed }) => [base, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View {...props} style={base}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 2,
  },
  padded: { padding: Spacing.lg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
