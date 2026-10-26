import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Badge } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Brand } from '@/constants/brand';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { requestNotificationPermission } from '@/services/notifications';
import { loadPlans, purchasePlan, purchasesSimulated, restorePurchases, type Plan } from '@/services/purchases';
import { useStore } from '@/store';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'chart', title: 'Medication level chart', body: 'See your estimated level rise and taper between doses' },
  { icon: 'shield', title: 'Muscle Shield coaching', body: 'Protein, fluid, fiber and strength targets that adapt to you' },
  { icon: 'pulse', title: 'Side-effect patterns', body: 'Learn which days after a dose your symptoms peak' },
  { icon: 'doc', title: 'Doctor-ready PDF reports', body: 'Doses, weight, side effects and adherence on one page' },
  { icon: 'sparkles', title: 'Unlimited everything', body: 'Multiple medications, full history, export and cost tracking' },
];

const SOURCE_HEADLINES: Record<string, string> = {
  onboarding: 'Protect your muscle. Reach your goal.',
  level: 'See your medication level',
  shield: 'Get the full Muscle Shield',
  symptoms: 'Understand your side effects',
  report: 'Bring a report to your next visit',
  meds: 'Track every medication',
  history: 'See your whole journey',
  export: 'Export all your data',
  supply: 'Never run out',
};

export default function Paywall() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { source = 'settings' } = useLocalSearchParams<{ source?: string }>();
  const premium = useStore((s) => s.premium);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState(false);
  const [canClose, setCanClose] = useState(source !== 'onboarding');

  useEffect(() => {
    loadPlans().then(setPlans);
    if (source === 'onboarding') {
      const t = setTimeout(() => setCanClose(true), 2500);
      return () => clearTimeout(t);
    }
  }, [source]);

  useEffect(() => {
    if (premium) close();
  }, [premium]);

  const plan = plans?.find((p) => p.id === selected) ?? plans?.[0];
  const annual = plans?.find((p) => p.id === 'annual');
  const monthly = plans?.find((p) => p.id === 'monthly');
  const savings = annual && monthly && monthly.price > 0 ? Math.round((1 - annual.price / (monthly.price * 12)) * 100) : null;
  const trialDays = plan?.trialDays ?? null;

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const buy = async () => {
    if (!plan) return;
    setBusy(true);
    const { result, message } = await purchasePlan(plan);
    setBusy(false);
    if (result === 'success') {
      if (plan.trialDays) {
        await requestNotificationPermission();
        useStore.getState().setTrialEndsAt(new Date(Date.now() + plan.trialDays * 86_400_000).toISOString());
      }
      haptics.success();
    } else if (result === 'pending') {
      Alert.alert('Purchase pending', 'Your purchase is awaiting approval. Premium unlocks as soon as it completes.');
    } else if (result === 'error') {
      Alert.alert('Purchase failed', message ?? 'Please try again.');
    }
  };

  const restore = async () => {
    setBusy(true);
    const { restored, message } = await restorePurchases();
    setBusy(false);
    if (restored) haptics.success();
    else Alert.alert('Nothing to restore', message ?? 'We couldn’t find an active subscription for this Apple ID.');
  };

  const open = (url: string) => (Platform.OS === 'web' ? window.open(url, '_blank') : WebBrowser.openBrowserAsync(url));

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.lg }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[theme.primary, '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + Spacing.md }]}>
          <View style={styles.heroTop}>
            {canClose ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={12} style={styles.close}>
                <Icon name="close" size={16} tint="rgba(255,255,255,0.9)" weight="semibold" />
              </Pressable>
            ) : (
              <View style={styles.close} />
            )}
            <Pressable accessibilityRole="button" onPress={restore} hitSlop={8}>
              <Text variant="subhead" tint="rgba(255,255,255,0.85)" weight="600">
                Restore
              </Text>
            </Pressable>
          </View>
          <Animated.View entering={FadeIn.duration(500)} style={styles.heroBody}>
            <View style={styles.crown}>
              <LogoMark size={40} color={theme.primary} fill={theme.primarySoft} />
            </View>
            <Text variant="overline" tint="rgba(255,255,255,0.8)">
              {Brand.premiumName}
            </Text>
            <Text variant="title" tint="#fff" align="center">
              {SOURCE_HEADLINES[source] ?? SOURCE_HEADLINES.onboarding}
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.inner}>
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: theme.primarySoft }]}>
                  <Icon name={f.icon} size={17} color="primary" />
                </View>
                <View style={styles.flex}>
                  <Text variant="callout" weight="700">
                    {f.title}
                  </Text>
                  <Text variant="footnote" color="textSecondary">
                    {f.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {!plans ? (
            <ActivityIndicator style={{ marginVertical: Spacing.xxl }} color={theme.primary} />
          ) : (
            <View style={styles.plans}>
              {annual && (
                <PlanOption
                  plan={annual}
                  selected={selected === 'annual'}
                  onPress={() => setSelected('annual')}
                  badge={savings && savings > 0 ? `Save ${savings}%` : 'Best value'}
                  detail={`${annual.priceString}/year${annual.perWeekString ? ` · ${annual.perWeekString}` : ''}`}
                  headline={annual.trialDays ? `${annual.trialDays}-day free trial` : 'Yearly'}
                />
              )}
              {monthly && (
                <PlanOption
                  plan={monthly}
                  selected={selected === 'monthly'}
                  onPress={() => setSelected('monthly')}
                  detail={`${monthly.priceString}/month`}
                  headline="Monthly"
                />
              )}
            </View>
          )}

          {trialDays ? <TrialTimeline days={trialDays} price={plan?.priceString ?? ''} /> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg), borderTopColor: theme.border }]}>
        <View style={styles.innerFooter}>
          <Button
            title={trialDays ? 'Start my free trial' : 'Continue'}
            onPress={buy}
            loading={busy}
            disabled={!plan}
            testID="paywall-purchase"
          />
          <Text variant="caption" color="textSecondary" align="center">
            {plan
              ? trialDays
                ? `${trialDays} days free, then ${plan.priceString}/${plan.id === 'annual' ? 'year' : 'month'}. Cancel anytime in Settings.`
                : `${plan.priceString}/${plan.id === 'annual' ? 'year' : 'month'}, auto-renews. Cancel anytime in Settings.`
              : ' '}
          </Text>
          <View style={styles.legal}>
            <Pressable onPress={() => open(Brand.termsUrl)} hitSlop={6}>
              <Text variant="caption" color="textTertiary">
                Terms
              </Text>
            </Pressable>
            <Text variant="caption" color="textTertiary">
              ·
            </Text>
            <Pressable onPress={() => open(Brand.privacyUrl)} hitSlop={6}>
              <Text variant="caption" color="textTertiary">
                Privacy
              </Text>
            </Pressable>
            {purchasesSimulated() && (
              <>
                <Text variant="caption" color="textTertiary">
                  ·
                </Text>
                <Text variant="caption" color="warning">
                  Test mode
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function PlanOption({
  plan,
  selected,
  onPress,
  badge,
  headline,
  detail,
}: {
  plan: Plan;
  selected: boolean;
  onPress: () => void;
  badge?: string;
  headline: string;
  detail: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${headline}, ${detail}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.plan, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface }]}>
      <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' }]}>
        {selected && <Icon name="check" size={12} tint="#fff" weight="bold" />}
      </View>
      <View style={styles.flex}>
        <Text variant="headline">{headline}</Text>
        <Text variant="footnote" color="textSecondary">
          {detail}
        </Text>
      </View>
      {badge ? <Badge label={badge} tone={plan.id === 'annual' ? 'success' : 'neutral'} /> : null}
    </Pressable>
  );
}

function TrialTimeline({ days, price }: { days: number; price: string }) {
  const theme = useTheme();
  const items: { icon: IconName; title: string; body: string }[] = [
    { icon: 'lock', title: 'Today', body: 'Unlock everything in Lifted+' },
    { icon: 'bell', title: `Day ${Math.max(1, days - 2)}`, body: 'We’ll remind you before your trial ends' },
    { icon: 'star', title: `Day ${days}`, body: `Your subscription starts at ${price}. Cancel before to pay nothing.` },
  ];
  return (
    <View style={[styles.timeline, { backgroundColor: theme.surface }]}>
      <Text variant="headline">How your free trial works</Text>
      {items.map((item, i) => (
        <View key={item.title} style={styles.timelineRow}>
          <View style={styles.timelineRail}>
            <View style={[styles.timelineDot, { backgroundColor: i === 0 ? theme.primary : theme.primarySoft }]}>
              <Icon name={item.icon} size={13} tint={i === 0 ? '#fff' : theme.primary} />
            </View>
            {i < items.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.primarySoft }]} />}
          </View>
          <View style={[styles.flex, { paddingBottom: Spacing.md }]}>
            <Text variant="callout" weight="700">
              {item.title}
            </Text>
            <Text variant="footnote" color="textSecondary">
              {item.body}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroBody: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  crown: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.xl, marginTop: Spacing.xl },
  innerFooter: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.sm },
  features: { gap: Spacing.md },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  plans: { gap: Spacing.sm },
  plan: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  timeline: { padding: Spacing.lg, borderRadius: Radius.lg, gap: Spacing.md },
  timelineRow: { flexDirection: 'row', gap: Spacing.md },
  timelineRail: { alignItems: 'center', width: 26 },
  timelineDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginTop: 2 },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
});
