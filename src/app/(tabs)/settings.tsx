import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { openPaywall, usePremium } from '@/components/premium-gate';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { ListRow, ListSection, Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Brand } from '@/constants/brand';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeOfDayLabel, WEEKDAY_LONG } from '@/lib/dates';
import { describeSchedule } from '@/lib/schedule';
import { formatDose, formatHeight, formatVolume, formatWeight } from '@/lib/units';
import { shareCsv } from '@/services/export';
import { notificationPermission, requestNotificationPermission } from '@/services/notifications';
import { openManageSubscriptions, restorePurchases } from '@/services/purchases';
import { loadDemoData } from '@/store/demo';
import { useStore } from '@/store';
import { useTargets } from '@/store/selectors';

function confirmDestructive(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function Settings() {
  const theme = useTheme();
  const premium = usePremium();
  const profile = useStore((s) => s.profile);
  const medications = useStore((s) => s.medications);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const setPremium = useStore((s) => s.setPremium);
  const resetAll = useStore((s) => s.resetAll);
  const targets = useTargets();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('granted');

  useEffect(() => {
    notificationPermission().then(setPermission);
  }, []);

  if (!profile) return null;

  const open = (url: string) => (Platform.OS === 'web' ? window.open(url, '_blank') : WebBrowser.openBrowserAsync(url));
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const enableReminders = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (!granted && Platform.OS !== 'web') Linking.openSettings();
  };

  const rate = async () => {
    if (Brand.appStoreId) {
      Linking.openURL(`https://apps.apple.com/app/id${Brand.appStoreId}?action=write-review`);
    } else if (await StoreReview.hasAction()) {
      StoreReview.requestReview();
    }
  };

  const restore = async () => {
    const { restored, message } = await restorePurchases();
    Alert.alert(restored ? 'Purchases restored' : 'Nothing to restore', restored ? `${Brand.premiumName} is active.` : (message ?? 'No active subscription found.'));
  };

  return (
    <Screen title="You">
      {premium ? (
        <View style={[styles.premium, { backgroundColor: theme.primarySoft }]}>
          <Icon name="crown" size={22} color="primary" />
          <View style={styles.flex}>
            <Text variant="headline">{Brand.premiumName} is active</Text>
            <Text variant="footnote" color="textSecondary">
              Thanks for supporting {Brand.name}.
            </Text>
          </View>
          {Platform.OS !== 'web' && <Button title="Manage" size="sm" variant="outline" fullWidth={false} onPress={openManageSubscriptions} />}
        </View>
      ) : (
        <LinearGradient colors={[theme.primary, '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upsell}>
          <Text variant="overline" tint="rgba(255,255,255,0.8)">
            {Brand.premiumName}
          </Text>
          <Text variant="title2" tint="#fff">
            Unlock your medication level, side-effect patterns and doctor reports
          </Text>
          <Button title="Try it free" variant="secondary" size="md" onPress={() => openPaywall('settings')} style={{ backgroundColor: '#fff' }} />
        </LinearGradient>
      )}

      <ListSection title="Profile">
        <ListRow icon="person" title={profile.name || 'Your profile'} subtitle={`${formatHeight(profile.heightCm, profile.heightUnit)} · started at ${formatWeight(profile.startWeightKg, profile.weightUnit, 0)}`} onPress={() => router.push('/profile')} />
        <ListRow icon="target" title="Goal weight" value={formatWeight(profile.goalWeightKg, profile.weightUnit, 0)} onPress={() => router.push('/profile')} />
        <ListRow
          icon="shield"
          iconColor={theme.protein}
          title="Daily targets"
          subtitle={`${targets.proteinG} g protein · ${formatVolume(targets.waterMl, profile.volumeUnit)} fluids · ${targets.fiberG} g fiber`}
          onPress={() => router.push('/targets')}
          last
        />
      </ListSection>

      <ListSection title="Medications">
        {medications.map((m) => (
          <ListRow
            key={m.id}
            icon={m.form === 'pill' ? 'pill' : 'syringe'}
            title={m.name}
            subtitle={`${formatDose(m.currentDoseMg)} · ${describeSchedule(m.schedule)}${m.active ? '' : ' · stopped'}`}
            onPress={() => router.push({ pathname: '/medication/[id]', params: { id: m.id } })}
          />
        ))}
        <ListRow
          icon="plus"
          title="Add medication"
          onPress={() => (!premium && medications.filter((m) => m.active).length >= 1 ? openPaywall('meds') : router.push('/medication/new'))}
          last
        />
      </ListSection>

      <ListSection
        title="Reminders"
        footer={permission === 'granted' || Platform.OS === 'web' ? undefined : 'Notifications are off for Lifted. Turn them on to get dose reminders.'}>
        {permission !== 'granted' && Platform.OS !== 'web' && <ListRow icon="bell" iconColor={theme.warning} title="Turn on notifications" onPress={enableReminders} />}
        <ListRow
          icon="scale"
          title="Weekly weigh-in"
          subtitle={`${WEEKDAY_LONG[settings.weighInWeekday]}s at ${formatTimeOfDayLabel(settings.weighInTime)}`}
          right={<Toggle value={settings.weighInReminder} onValueChange={(v) => updateSettings({ weighInReminder: v })} />}
        />
        <ListRow
          icon="shield"
          title="Evening check-in"
          subtitle={`Protein & water nudge at ${formatTimeOfDayLabel(settings.checkInTime)}`}
          right={<Toggle value={settings.checkInReminder} onValueChange={(v) => updateSettings({ checkInReminder: v })} />}
        />
        <ListRow icon="bolt" title="Haptics" right={<Toggle value={settings.haptics} onValueChange={(v) => updateSettings({ haptics: v })} />} last />
      </ListSection>

      <ListSection title="Data">
        <ListRow icon="doc" title="Doctor report (PDF)" onPress={() => (premium ? router.push('/report') : openPaywall('report'))} right={premium ? undefined : <Icon name="lock" size={14} color="textTertiary" />} />
        <ListRow icon="download" title="Export all data (CSV)" onPress={() => (premium ? shareCsv() : openPaywall('export'))} right={premium ? undefined : <Icon name="lock" size={14} color="textTertiary" />} />
        <ListRow icon="privacy" iconColor={theme.success} title="Your data stays on this device" subtitle="No account, no ads, nothing sold. Ever." last />
      </ListSection>

      <ListSection title="Support">
        <ListRow icon="star" iconColor={theme.strength} title={`Rate ${Brand.name}`} onPress={rate} />
        <ListRow icon="mail" title="Contact support" subtitle={Brand.supportEmail} onPress={() => Linking.openURL(`mailto:${Brand.supportEmail}?subject=${encodeURIComponent(`${Brand.name} ${version}`)}`)} />
        <ListRow icon="refresh" title="Restore purchases" onPress={restore} last />
      </ListSection>

      <ListSection title="About">
        <ListRow icon="info" title="How estimates work" onPress={() => router.push('/level-info')} />
        <ListRow icon="privacy" title="Privacy policy" onPress={() => open(Brand.privacyUrl)} />
        <ListRow icon="doc" title="Terms of use" onPress={() => open(Brand.termsUrl)} last />
      </ListSection>

      {(__DEV__ || Platform.OS === 'web') && (
        <ListSection title="Developer">
          <ListRow icon="sparkles" title="Load demo data" onPress={() => loadDemoData()} />
          <ListRow icon="crown" title="Premium (simulated)" right={<Toggle value={premium} onValueChange={setPremium} />} last />
        </ListSection>
      )}

      <ListSection>
        <ListRow
          icon="trash"
          iconColor={theme.danger}
          title="Delete all data"
          destructive
          onPress={() =>
            confirmDestructive('Delete all data?', 'This permanently erases your profile, doses, weigh-ins and check-ins from this device.', 'Delete', () => {
              resetAll();
            })
          }
          last
        />
      </ListSection>

      <Text variant="caption" color="textTertiary" align="center" style={styles.disclaimer}>
        {Brand.name} {version} · {Brand.name} is a tracking tool, not a medical device. It doesn’t diagnose, treat or give dosing advice — always follow your prescriber’s instructions.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  premium: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg },
  upsell: { padding: Spacing.xl, borderRadius: Radius.lg, gap: Spacing.sm },
  disclaimer: { paddingHorizontal: Spacing.lg },
});
