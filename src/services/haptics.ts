import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useStore } from '@/store';

const enabled = () => Platform.OS !== 'web' && useStore.getState().settings.haptics;

export const haptics = {
  tap() {
    if (enabled()) Haptics.selectionAsync().catch(() => {});
  },
  impact() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
