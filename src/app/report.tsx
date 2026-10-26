import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/controls';
import { Icon, type IconName } from '@/components/ui/icon';
import { ModalScreen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { DAY_MS } from '@/lib/dates';
import { adherence } from '@/lib/schedule';
import { symptomCounts, symptomInfo } from '@/lib/symptoms';
import { formatWeight, formatWeightDelta } from '@/lib/units';
import { weeklyRate, weightSummary } from '@/lib/weight';
import { shareReport } from '@/services/export';
import { useStore } from '@/store';

export default function ReportScreen() {
  const profile = useStore((s) => s.profile);
  const medications = useStore((s) => s.medications);
  const doses = useStore((s) => s.doses);
  const weights = useStore((s) => s.weights);
  const symptoms = useStore((s) => s.symptoms);
  const [range, setRange] = useState(90);
  const [busy, setBusy] = useState(false);
  if (!profile) return null;

  const now = new Date();
  const from = new Date(now.getTime() - range * DAY_MS);
  const unit = profile.weightUnit;
  const summary = weightSummary(profile.startWeightKg, profile.goalWeightKg, weights);
  const rate = weeklyRate(weights, now);
  const top = symptomCounts(symptoms, from.getTime()).slice(0, 3);
  const active = medications.filter((m) => m.active);

  const create = async () => {
    setBusy(true);
    try {
      await shareReport(range);
    } catch (e) {
      Alert.alert('Couldn’t create the report', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const items: { icon: IconName; label: string; value: string }[] = [
    { icon: 'scale', label: 'Weight change', value: `${formatWeightDelta(-summary.lostKg, unit)} (${summary.percentLost.toFixed(1)}%)` },
    { icon: 'chart', label: '4-week trend', value: rate === null ? 'Not enough weigh-ins' : `${formatWeightDelta(rate, unit)} per week` },
    { icon: 'target', label: 'Current / goal', value: `${formatWeight(summary.currentKg, unit)} → ${formatWeight(summary.goalKg, unit)}` },
    ...active.map((m) => {
      const a = adherence(m, doses, from, now);
      return { icon: (m.form === 'pill' ? 'pill' : 'syringe') as IconName, label: m.name, value: a === null ? 'Doses logged' : `${Math.round(a * 100)}% of doses logged` };
    }),
    { icon: 'pulse', label: 'Top side effects', value: top.length ? top.map((t) => symptomInfo(t.symptom).label).join(', ') : 'None logged' },
  ];

  return (
    <ModalScreen title="Doctor report" footer={<Button title="Create PDF" icon="share" onPress={create} loading={busy} />}>
      <Text variant="callout" color="textSecondary">
        A one-page summary of your doses, dose changes, weight trend, side effects and nutrition — ready to share with your clinician or print for your appointment.
      </Text>
      <Segmented
        options={[
          { value: 30, label: '30 days' },
          { value: 90, label: '90 days' },
          { value: 180, label: '6 months' },
        ]}
        value={range}
        onChange={setRange}
      />
      <Card style={styles.gap}>
        <Text variant="overline" color="textSecondary">
          Included in your report
        </Text>
        {items.map((item) => (
          <View key={item.label} style={styles.row}>
            <Icon name={item.icon} size={16} color="primary" />
            <Text variant="callout" weight="600" style={styles.flex}>
              {item.label}
            </Text>
            <Text variant="footnote" color="textSecondary" style={styles.value} align="right">
              {item.value}
            </Text>
          </View>
        ))}
      </Card>
      <Text variant="caption" color="textTertiary">
        The report is generated on your phone. Nothing is uploaded unless you choose to share it.
      </Text>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  value: { maxWidth: '55%' },
});
