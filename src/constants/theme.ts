import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

const light = {
  background: '#F6F5FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EEF7',
  surfaceSunken: '#E9E6F2',
  border: '#E4E1EE',
  text: '#17151F',
  textSecondary: '#625F75',
  textTertiary: '#9693A8',
  primary: '#5B3DF5',
  primaryPressed: '#4A2EDB',
  primarySoft: '#ECE8FF',
  onPrimary: '#FFFFFF',
  accent: '#FF6B4A',
  protein: '#FF6B4A',
  proteinSoft: '#FFE9E3',
  water: '#2E9BFF',
  waterSoft: '#E1F0FF',
  fiber: '#2FB36B',
  fiberSoft: '#DFF5E8',
  strength: '#F2A516',
  strengthSoft: '#FDF1D8',
  level: '#8B5CF6',
  levelSoft: '#F1EBFF',
  success: '#1FA971',
  successSoft: '#DDF5EA',
  warning: '#E59500',
  warningSoft: '#FFF3D6',
  danger: '#E5484D',
  dangerSoft: '#FDE6E7',
  overlay: 'rgba(23, 21, 31, 0.45)',
  shadow: 'rgba(40, 30, 90, 0.08)',
  tabBar: 'rgba(255,255,255,0.94)',
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  background: '#0C0B11',
  surface: '#17161F',
  surfaceAlt: '#201F2B',
  surfaceSunken: '#282636',
  border: '#2B2939',
  text: '#F4F3F8',
  textSecondary: '#ABA8BD',
  textTertiary: '#77748A',
  primary: '#8D78FF',
  primaryPressed: '#7A63F5',
  primarySoft: '#2A2452',
  onPrimary: '#FFFFFF',
  accent: '#FF8166',
  protein: '#FF8166',
  proteinSoft: '#3A221D',
  water: '#4DAAFF',
  waterSoft: '#14283D',
  fiber: '#45C77F',
  fiberSoft: '#15301F',
  strength: '#F5B83A',
  strengthSoft: '#352914',
  level: '#A07BFF',
  levelSoft: '#2A2045',
  success: '#34C287',
  successSoft: '#12301F',
  warning: '#F5AE2A',
  warningSoft: '#352914',
  danger: '#FF6369',
  dangerSoft: '#3A1A1C',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0)',
  tabBar: 'rgba(23,22,31,0.94)',
};

export const Colors = { light, dark } as const;

export type ColorName = keyof ThemeColors;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});

export type TextVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'title2'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline';

export const Typography: Record<TextVariant, TextStyle> = {
  hero: { fontSize: 52, lineHeight: 58, fontWeight: '800', letterSpacing: -1.5 },
  display: { fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
};

export const MaxContentWidth = 640;

/** Space reserved at the bottom of tab screens so content clears the tab bar. */
export const TabBarInset = Platform.select({ ios: 96, android: 96, default: 96 }) ?? 96;
