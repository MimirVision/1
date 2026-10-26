import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { Fonts, Typography, type ColorName, type TextVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: ColorName;
  /** Raw color; wins over `color`. */
  tint?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  /** Rounded system font, used for numbers and stats. */
  rounded?: boolean;
  /** Tabular figures so numbers don't jitter as they change. */
  tabular?: boolean;
}

export function Text({
  variant = 'body',
  color = 'text',
  tint,
  weight,
  align,
  rounded,
  tabular,
  style,
  ...props
}: AppTextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...props}
      style={[
        Typography[variant],
        { color: tint ?? theme[color], fontFamily: rounded ? Fonts.rounded : Fonts.sans },
        weight !== undefined && { fontWeight: weight },
        align !== undefined && { textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
