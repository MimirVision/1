import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { openPaywall, PremiumGate, usePremium } from '@/components/premium-gate';
import { WeightChart } from '@/components/progress/weight-chart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { IconButton, Screen, SectionHeader } from '@/components/ui/layout';
import { ProgressBar } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DAY_MS, formatMonthYear, formatShortDate, fromDateKey, WEEKDAY_SHORT } from '@/lib/dates';
import { averageProtein, shieldHistory } from '@/lib/nutrition';
import { dosesForMedication } from '@/lib/schedule';
import { patternInsight, symptomInfo, symptomPatterns } from '@/lib/symptoms';
import { bmi, bmiCategory, formatDose, formatWeight, formatWeightDelta } from '@/lib/units';
import { lossByDose, milestones, projectedGoalDate, weeklyRate, weightSummary } from '@/lib/weight';
import { useStore } from '@/store';
import { useActiveMedications, useNow, useTargets } from '@/store/selectors';

type Range = 30 | 90 | 180 | 0;

export default function Progress() {
  const theme = useTheme();
  const now = useNow(60_000);
  const premium = usePremium();
  const profile = useStore((s) => s.profile);
  const weights = useStore((s) => s.weights);
  const doses = useStore((s) => s.doses);
  const days = useStore((s) => s.days);
  const symptoms = useStore((s) => s.symptoms);
  const targets = useTargets();
  const primary = useActiveMedications()[0];
  const [range, setRange] = useState<Range>(30);

  const primaryDoses = useMemo(() => (primary ? dosesForMedication(doses, primary.id) : []), [doses, primary]);
  const shield = useMemo(() => shieldHistory(days, targets, now, 7), [days, targets, now]);
  const patterns = useMemo(() => symptomPatterns(symptoms, primaryDoses).slice(0, 4), [symptoms, primaryDoses]);
  const periods = useMemo(() => lossByDose(primaryDoses, weights, now), [primaryDoses, weights, now]);

  if (!profile) return null;
  const unit = profile.weightUnit;
  const summary = weightSummary(profile.startWeightKg, profile.goalWeightKg, weights);
  const rate = weeklyRate(weights, now);
  const eta = projectedGoalDate(summary.currentKg, profile.goalWeightKg, rate, now);
  const currentBmi = bmi(summary.currentKg, profile.heightCm);
  const ms = milestones(profile.startWeightKg, weights, unit);
  const achieved = ms.filter((m) => m.achieved);
  const upcoming = ms.filter((m) => !m.achieved).slice(0, 2);
  const avgProtein = averageProtein(days, shield.map((d) => d.date));
  const weeklyPattern = primary && primary.schedule.kind !== 'daily';

  const changeRange = (r: Range) => {
    if (r !== 30 && !premium) openPaywall('history');
    else setRange(r);
  };

  return (
    <Screen title="Progress" right={<IconButton icon="share" label="Share progress" onPress={() => router.push('/share')} />}>
      <Card style={styles.gap}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="overline" color="textSecondary">
              Total lost
            </Text>
            <Text variant="hero" rounded tabular tint={summary.lostKg > 0 ? theme.success : theme.text}>
              {formatWeightDelta(-summary.lostKg, unit === 'st' ? 'lb' : unit)}
            </Text>
            <Text variant="callout" color="textSecondary" weight="600">
              {summary.percentLost.toFixed(1)}% of your starting weight
            </Text>
          </View>
        </View>
        <View style={styles.gapSm}>
          <ProgressBar progress={summary.progress} color={theme.success} height={10} />
          <View style={styles.row}>
            <Text variant="caption" color="textSecondary" style={styles.flex}>
              {formatWeight(summary.startKg, unit, 0)}
            </Text>
            <Text variant="caption" weight="700" color="success">
              {Math.round(summary.progress * 100)}% to goal
            </Text>
            <Text variant="caption" color="textSecondary" style={[styles.flex, { textAlign: 'right' }]}>
              {formatWeight(summary.goalKg, unit, 0)}
            </Text>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat label="Current" value={formatWeight(summary.currentKg, unit)} />
          <Stat label="4-week trend" value={rate === null ? '—' : `${formatWeightDelta(rate, unit)}/wk`} />
          <Stat label="BMI" value={currentBmi ? currentBmi.toFixed(1) : '—'} sub={currentBmi ? bmiCategory(currentBmi) : undefined} />
          <Stat label="Goal ETA" value={eta ? formatMonthYear(eta).replace(/ \d{4}$/, ` ’${String(eta.getFullYear()).slice(2)}`) : '—'} sub={eta ? 'at current pace' : undefined} />
        </View>
      </Card>

      <Card style={styles.gap}>
        <View style={styles.row}>
          <Text variant="headline" style={styles.flex}>
            Weight
          </Text>
          <Button title="Log" icon="plus" size="sm" variant="secondary" fullWidth={false} onPress={() => router.push('/log-weight')} />
        </View>
        <WeightChart weights={weights} doses={primaryDoses} unit={unit} goalKg={profile.goalWeightKg} rangeDays={range === 0 ? null : range} now={now} showGoal={range === 0} />
        <Segmented<Range>
          options={[
            { value: 30, label: '1M' },
            { value: 90, label: premium ? '3M' : '3M 🔒' },
            { value: 180, label: premium ? '6M' : '6M 🔒' },
            { value: 0, label: premium ? 'All' : 'All 🔒' },
          ]}
          value={range}
          onChange={changeRange}
        />
        {primaryDoses.length > 0 && (
          <Text variant="caption" color="textTertiary">
            Purple markers show when your dose changed.
          </Text>
        )}
      </Card>

      <SectionHeader title="Milestones" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milestones} style={styles.bleed}>
        {[...achieved.slice(-6).reverse(), ...upcoming].map((m) => (
          <View key={m.id} style={[styles.milestone, { backgroundColor: m.achieved ? theme.successSoft : theme.surface, borderColor: m.achieved ? theme.success : theme.border }]}>
            <Icon name={m.achieved ? 'medal' : 'target'} size={22} tint={m.achieved ? theme.success : theme.textTertiary} />
            <Text variant="subhead" weight="700" align="center">
              {m.label}
            </Text>
            <Text variant="caption" color="textSecondary" align="center">
              {m.achieved && m.achievedAt ? formatShortDate(new Date(m.achievedAt)) : 'Up next'}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Card style={styles.gap}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="headline">Muscle Shield · last 7 days</Text>
            <Text variant="footnote" color="textSecondary">
              {avgProtein === null ? 'Log protein to see your average' : `Avg protein ${Math.round(avgProtein)} g of ${targets.proteinG} g target`}
            </Text>
          </View>
        </View>
        <View style={styles.bars}>
          {shield.map((d) => {
            const color = d.score >= 85 ? theme.success : d.score >= 60 ? theme.primary : d.score >= 35 ? theme.strength : theme.protein;
            return (
              <View key={d.date} style={styles.barCol}>
                <Text variant="caption" color="textSecondary" rounded tabular>
                  {d.score}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={[styles.barFill, { height: `${Math.max(4, d.score)}%`, backgroundColor: color }]} />
                </View>
                <Text variant="caption" color="textTertiary">
                  {WEEKDAY_SHORT[fromDateKey(d.date).getDay()].slice(0, 2)}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {primary && periods.length > 0 && (
        <Card style={styles.gap}>
          <Text variant="headline">Results by dose</Text>
          <PremiumGate source="history" title="See what each dose did for you" minHeight={120}>
            <View style={styles.gapSm}>
              {periods.map((p) => (
                <View key={p.from} style={[styles.doseRow, { borderColor: theme.border }]}>
                  <View style={[styles.dosePill, { backgroundColor: theme.levelSoft }]}>
                    <Text variant="subhead" weight="700" tint={theme.level}>
                      {formatDose(p.doseMg)}
                    </Text>
                  </View>
                  <Text variant="footnote" color="textSecondary" style={styles.flex}>
                    {formatShortDate(new Date(p.from))} · {p.weeks.toFixed(p.weeks < 2 ? 1 : 0)} wk
                  </Text>
                  <Text variant="callout" weight="700" color={p.lostKg !== null && p.lostKg > 0 ? 'success' : 'textSecondary'}>
                    {p.lostKg === null ? '—' : formatWeightDelta(-p.lostKg, unit)}
                  </Text>
                </View>
              ))}
            </View>
          </PremiumGate>
        </Card>
      )}

      <Card style={styles.gap}>
        <View style={styles.row}>
          <Text variant="headline" style={styles.flex}>
            Side-effect patterns
          </Text>
          <Button title="Check in" size="sm" variant="secondary" fullWidth={false} onPress={() => router.push('/log-symptoms')} />
        </View>
        {patterns.length === 0 ? (
          <Text variant="footnote" color="textSecondary">
            Do a quick daily check-in and we’ll show which days after your dose symptoms tend to peak.
          </Text>
        ) : (
          <PremiumGate source="symptoms" title="Find out when side effects peak" minHeight={160}>
            <View style={styles.gapSm}>
              {weeklyPattern && (
                <View style={styles.heatHeader}>
                  <View style={styles.heatLabel} />
                  {['Dose', '+1', '+2', '+3', '+4', '+5', '+6'].map((d) => (
                    <Text key={d} variant="caption" color="textTertiary" style={styles.heatCellLabel} align="center">
                      {d}
                    </Text>
                  ))}
                </View>
              )}
              {patterns.map((p) => (
                <View key={p.symptom} style={styles.gapXs}>
                  <View style={styles.heatRow}>
                    <Text variant="footnote" weight="600" style={styles.heatLabel} numberOfLines={1}>
                      {symptomInfo(p.symptom).label}
                    </Text>
                    {weeklyPattern ? (
                      p.byDay.map((v, i) => (
                        <View
                          key={i}
                          style={[styles.heatCell, { backgroundColor: v > 0 ? theme.protein : theme.surfaceAlt, opacity: v > 0 ? 0.25 + Math.min(1, v / 2) * 0.75 : 1 }]}
                        />
                      ))
                    ) : (
                      <Text variant="footnote" color="textSecondary">
                        {p.total} times logged
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {weeklyPattern &&
                patterns
                  .map(patternInsight)
                  .filter((s): s is string => !!s)
                  .slice(0, 2)
                  .map((insight) => (
                    <View key={insight} style={[styles.insight, { backgroundColor: theme.primarySoft }]}>
                      <Icon name="sparkles" size={14} color="primary" />
                      <Text variant="footnote" weight="600" style={styles.flex}>
                        {insight}
                      </Text>
                    </View>
                  ))}
            </View>
          </PremiumGate>
        )}
      </Card>

      <Card style={styles.row} onPress={() => (premium ? router.push('/report') : openPaywall('report'))}>
        <View style={[styles.reportIcon, { backgroundColor: theme.primarySoft }]}>
          <Icon name="doc" size={20} color="primary" />
        </View>
        <View style={styles.flex}>
          <Text variant="headline">Doctor report</Text>
          <Text variant="footnote" color="textSecondary">
            A one-page PDF of doses, weight and side effects for your next visit.
          </Text>
        </View>
        <Icon name={premium ? 'chevronRight' : 'lock'} size={14} color="textTertiary" />
      </Card>

      <Text variant="caption" color="textTertiary" align="center">
        Started {formatShortDate(new Date(profile.journeyStartedAt))} · {Math.max(0, Math.round((now.getTime() - Date.parse(profile.journeyStartedAt)) / (7 * DAY_MS)))} weeks
      </Text>
    </Screen>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surfaceAlt }]}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="headline" rounded tabular numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text variant="caption" color="textTertiary" numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.md },
  gapSm: { gap: Spacing.sm },
  gapXs: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: { flexBasis: '47%', flexGrow: 1, padding: Spacing.md, borderRadius: Radius.md, gap: 2 },
  bleed: { marginHorizontal: -Spacing.lg },
  milestones: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  milestone: { width: 116, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', gap: Spacing.xs },
  bars: { flexDirection: 'row', gap: Spacing.sm, height: 140 },
  barCol: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  barTrack: { flex: 1, width: '100%', borderRadius: Radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: Radius.sm },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs },
  dosePill: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, minWidth: 64, alignItems: 'center' },
  heatHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatLabel: { width: 96 },
  heatCellLabel: { flex: 1 },
  heatCell: { flex: 1, height: 22, borderRadius: 6 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  reportIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
