import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { useStore } from '@/store';

import { Icon } from './ui/icon';
import { Text } from './ui/text';

export function usePremium(): boolean {
  return useStore((s) => s.premium);
}

export function openPaywall(source: string) {
  haptics.tap();
  router.push({ pathname: '/paywall', params: { source } });
}

/**
 * Shows the real content for premium users. Free users see a dimmed preview with an unlock
 * prompt — seeing their own data behind the lock converts far better than a generic upsell.
 */
export function PremiumGate({
  source,
  title,
  children,
  minHeight = 160,
}: {
  source: string;
  title: string;
  children: ReactNode;
  minHeight?: number;
}) {
  const premium = usePremium();
  const theme = useTheme();
  if (premium) return <>{children}</>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Unlock ${title}`} onPress={() => openPaywall(source)} style={{ minHeight }}>
      <View style={styles.preview} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        {children}
      </View>
      <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.surface + 'D6' }]}>
        <View style={[styles.lock, { backgroundColor: theme.primary }]}>
          <Icon name="lock" size={16} tint={theme.onPrimary} />
        </View>
        <Text variant="headline" align="center">
          {title}
        </Text>
        <View style={[styles.pill, { backgroundColor: theme.primarySoft }]}>
          <Text variant="subhead" weight="700" color="primary">
            Unlock with {Brand.premiumName}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  preview: { opacity: 0.3 },
  overlay: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.lg },
  lock: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill },
});
