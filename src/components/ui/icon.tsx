import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ColorName } from '@/constants/theme';

/** Semantic icon names mapped to SF Symbols (iOS) and Material Symbols (Android/web). */
const ICONS = {
  syringe: { ios: 'syringe.fill', android: 'vaccines', web: 'vaccines' },
  pill: { ios: 'pills.fill', android: 'medication', web: 'medication' },
  scale: { ios: 'scalemass.fill', android: 'monitor_weight', web: 'monitor_weight' },
  drop: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  leaf: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
  dumbbell: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  protein: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  chart: { ios: 'chart.xyaxis.line', android: 'show_chart', web: 'show_chart' },
  bars: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  gear: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  shield: { ios: 'shield.lefthalf.filled', android: 'shield', web: 'shield' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  privacy: { ios: 'lock.shield.fill', android: 'verified_user', web: 'verified_user' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' },
  doc: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  trophy: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  pencil: { ios: 'pencil', android: 'edit', web: 'edit' },
  target: { ios: 'target', android: 'track_changes', web: 'track_changes' },
  box: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  dollar: { ios: 'dollarsign.circle.fill', android: 'paid', web: 'paid' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
  mail: { ios: 'envelope.fill', android: 'mail', web: 'mail' },
  person: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  bolt: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  timer: { ios: 'timer', android: 'timer', web: 'timer' },
  brain: { ios: 'brain.head.profile', android: 'psychology', web: 'psychology' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  list: { ios: 'list.bullet', android: 'list', web: 'list' },
  body: { ios: 'figure.stand', android: 'accessibility_new', web: 'accessibility_new' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  alert: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  medical: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  stethoscope: { ios: 'stethoscope', android: 'stethoscope', web: 'stethoscope' },
  smile: { ios: 'face.smiling', android: 'sentiment_satisfied', web: 'sentiment_satisfied' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  trendDown: { ios: 'arrow.down.right', android: 'south_east', web: 'south_east' },
  trendUp: { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' },
  gift: { ios: 'gift.fill', android: 'redeem', web: 'redeem' },
  thumbsUp: { ios: 'hand.thumbsup.fill', android: 'thumb_up', web: 'thumb_up' },
  pulse: { ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' },
  crown: { ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' },
  medal: { ios: 'medal.fill', android: 'military_tech', web: 'military_tech' },
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' },
  download: { ios: 'square.and.arrow.down', android: 'download', web: 'download' },
} satisfies Record<string, SymbolViewProps['name']>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
  tint,
  style,
  weight,
}: {
  name: IconName;
  size?: number;
  /** Theme color name. */
  color?: ColorName;
  /** Raw color; wins over `color`. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const theme = useTheme();
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={tint ?? theme[color ?? 'text']}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={style}
    />
  );
}
