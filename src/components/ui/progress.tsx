import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ProgressRing({
  progress,
  size = 120,
  stroke = 12,
  color,
  trackColor,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? theme.surfaceSunken} strokeWidth={stroke} fill="none" />
        {clamped > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

export function ProgressBar({
  progress,
  color,
  trackColor,
  height = 8,
}: {
  progress: number;
  color: string;
  trackColor?: string;
  height?: number;
}) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor ?? theme.surfaceSunken }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  track: { borderRadius: Radius.pill, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
