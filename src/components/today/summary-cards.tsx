import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DAY_MS, formatRelativeDay, isSameDay } from '@/lib/dates';
import { symptomInfo, SEVERITY_LABEL } from '@/lib/symptoms';
import type { Tip } from '@/lib/tips';
import type { Medication, Profile, Severity, SymptomId, SymptomLog, WeightLog } from '@/lib/types';
import { formatWeight, formatWeightDelta } from '@/lib/units';
import { latestWeight, weightSummary } from '@/lib/weight';

import { LineChart } from '../charts/line-chart';
import { formatLevel, levelHeadline, type LevelData } from '../med/level-chart';
import { PremiumGate } from '../premium-gate';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Icon } from '../ui/icon';
import { Badge } from '../ui/layout';
import { Text } from '../ui/text';

export function LevelCard({ data, medication, now }: { data: LevelData; medication: Medication; now: Date }) {
  const theme = useTheme();
  return (
    <Card onPress={() => router.push('/meds')}>
      <PremiumGate source="level" title="See your estimated medication level" minHeight={150}>
        <View style={styles.cardHeader}>
          <View style={styles.flex}>
            <Text variant="overline" color="textSecondary">
              Medication level · estimate
            </Text>
            <Text variant="headline">{levelHeadline(data, medication)}</Text>
          </View>
          <Text variant="title2" rounded tabular tint={theme.level}>
            {formatLevel(data.current, data.unit)}
          </Text>
        </View>
        <LineChart
          height={110}
          series={[
            { id: 'past', data: data.past, color: theme.level, area: true },
            { id: 'future', data: data.future, color: theme.level, dashed: true, strokeWidth: 2 },
          ]}
          nowX={now.getTime()}
          xDomain={[data.from, data.to]}
          yTickCount={2}
          minYSpan={data.unit === 'percent' ? 20 : 0.5}
          formatY={(y) => (data.unit === 'percent' ? `${Math.round(y)}%` : y.toFixed(1))}
        />
      </PremiumGate>
    </Card>
  );
}

export function WeightCard({ profile, weights, now }: { profile: Profile; weights: WeightLog[]; now: Date }) {
  const theme = useTheme();
  const summary = weightSummary(profile.startWeightKg, profile.goalWeightKg, weights);
  const last = latestWeight(weights);
  const loggedToday = last ? isSameDay(new Date(last.at), now) : false;
  const recent = weights
    .filter((w) => Date.parse(w.at) >= now.getTime() - 30 * DAY_MS)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map((w) => ({ x: Date.parse(w.at), y: w.kg }));
  return (
    <Card style={styles.gap}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text variant="overline" color="textSecondary">
            Weight
          </Text>
          <Text variant="title" rounded tabular>
            {formatWeight(summary.currentKg, profile.weightUnit)}
          </Text>
          <Text variant="footnote" color={summary.lostKg > 0 ? 'success' : 'textSecondary'} weight="600">
            {formatWeightDelta(-summary.lostKg, profile.weightUnit)} since you started · {summary.percentLost.toFixed(1)}%
          </Text>
        </View>
        {recent.length >= 2 && (
          <View style={{ width: 120 }}>
            <LineChart height={64} series={[{ id: 'w', data: recent, color: theme.primary, smooth: true }]} yTickCount={0} minYSpan={1} />
          </View>
        )}
      </View>
      <Button
        title={loggedToday ? `Logged ${formatRelativeDay(new Date(last!.at), now).toLowerCase()} · log again` : 'Log weight'}
        icon="scale"
        variant="secondary"
        size="md"
        onPress={() => router.push('/log-weight')}
        testID="log-weight-cta"
      />
    </Card>
  );
}

export function CheckInCard({ logs, now }: { logs: SymptomLog[]; now: Date }) {
  const today = logs.filter((l) => isSameDay(new Date(l.at), now)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  const entries = today ? (Object.entries(today.symptoms) as [SymptomId, Severity][]).filter(([, s]) => s) : [];
  return (
    <Card onPress={() => router.push('/log-symptoms')} style={styles.row}>
      <View style={styles.flex}>
        <Text variant="overline" color="textSecondary">
          Daily check-in
        </Text>
        <Text variant="headline">{today ? 'Checked in today' : 'How are you feeling?'}</Text>
        {today ? (
          <View style={styles.badges}>
            {entries.length === 0 ? (
              <Badge label="No side effects" tone="success" />
            ) : (
              entries.slice(0, 4).map(([id, sev]) => <Badge key={id} label={`${symptomInfo(id).label} · ${SEVERITY_LABEL[sev]}`} tone={sev >= 2 ? 'warning' : 'neutral'} />)
            )}
          </View>
        ) : (
          <Text variant="footnote" color="textSecondary">
            Log side effects, food noise and energy in 10 seconds.
          </Text>
        )}
      </View>
      <Icon name={today ? 'pencil' : 'plus'} size={18} color="primary" />
    </Card>
  );
}

export function TipCard({ tip }: { tip: Tip }) {
  const theme = useTheme();
  return (
    <Card tone="primarySoft" style={styles.row}>
      <View style={[styles.tipIcon, { backgroundColor: theme.surface }]}>
        <Icon name="sparkles" size={18} color="primary" />
      </View>
      <View style={styles.flex}>
        <Text variant="headline">{tip.title}</Text>
        <Text variant="footnote" color="textSecondary">
          {tip.body}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  tipIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
