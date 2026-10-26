import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLevelData } from '@/components/med/level-chart';
import { DoseCard, PillTimerCard } from '@/components/today/dose-card';
import { ShieldCard } from '@/components/today/shield-card';
import { CheckInCard, LevelCard, TipCard, WeightCard } from '@/components/today/summary-cards';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconButton, Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { calendarDaysBetween, DAY_MS, formatMediumDate, greeting, HOUR_MS, WEEKDAY_LONG } from '@/lib/dates';
import { strengthSessionsThisWeek } from '@/lib/nutrition';
import { doseStatus } from '@/lib/schedule';
import { tipFor } from '@/lib/tips';
import { useStore } from '@/store';
import { useActiveMedications, useNow, useTargets, useTodayKey } from '@/store/selectors';

export default function Today() {
  const now = useNow(30_000);
  const today = useTodayKey();
  const profile = useStore((s) => s.profile);
  const doses = useStore((s) => s.doses);
  const weights = useStore((s) => s.weights);
  const symptoms = useStore((s) => s.symptoms);
  const days = useStore((s) => s.days);
  const medications = useActiveMedications();
  const targets = useTargets();
  const primary = medications[0];
  const level = useLevelData(primary, doses, now, 21);

  const hourTick = Math.floor(now.getTime() / HOUR_MS);
  const tip = useMemo(() => {
    const at = new Date(hourTick * HOUR_MS);
    const status = primary ? doseStatus(primary, doses, at) : null;
    const recentIncrease = primary
      ? (() => {
          const own = doses.filter((d) => d.medicationId === primary.id).sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt));
          return own.length >= 2 && own[0].doseMg > own[1].doseMg && at.getTime() - Date.parse(own[0].takenAt) < 14 * DAY_MS;
        })()
      : false;
    return tipFor({
      form: primary?.form ?? null,
      daysSinceDose: primary?.schedule.kind === 'daily' ? null : (status?.daysSinceLast ?? null),
      recentIncrease,
      proteinRemainingG: targets.proteinG - (days[today]?.proteinG ?? 0),
      hour: at.getHours(),
      strengthThisWeek: strengthSessionsThisWeek(days, at),
      strengthTarget: targets.strengthPerWeek,
      concerns: profile?.concerns ?? [],
      dayIndex: Math.floor(at.getTime() / DAY_MS),
    });
    // Tips only need to refresh hourly or when data changes.
  }, [primary, doses, days, today, targets, profile, hourTick]);

  if (!profile) return null;
  const week = Math.floor(calendarDaysBetween(new Date(profile.journeyStartedAt), now) / 7) + 1;

  return (
    <Screen
      subtitle={`${WEEKDAY_LONG[now.getDay()]}, ${formatMediumDate(now)}`}
      title={`${greeting(now)}${profile.name ? `, ${profile.name}` : ''}`}
      right={<IconButton icon="share" label="Share progress" onPress={() => router.push('/share')} />}>
      <View style={styles.weekRow}>
        <Icon name="flame" size={14} color="accent" />
        <Text variant="subhead" color="textSecondary" weight="600">
          Week {week} of your journey
        </Text>
      </View>

      <PillTimerCard />

      {medications.length === 0 ? (
        <Card style={styles.gap}>
          <Text variant="headline">Add your medication</Text>
          <Text variant="footnote" color="textSecondary">
            Get dose reminders, site rotation and your estimated medication level.
          </Text>
          <Button title="Add medication" icon="plus" size="md" onPress={() => router.push('/medication/new')} />
        </Card>
      ) : (
        medications.map((m) => <DoseCard key={m.id} medication={m} doses={doses} now={now} />)
      )}

      <ShieldCard date={today} targets={targets} volumeUnit={profile.volumeUnit} now={now} />

      {primary && level?.supported && <LevelCard data={level} medication={primary} now={now} />}

      <WeightCard profile={profile} weights={weights} now={now} />

      <CheckInCard logs={symptoms} now={now} />

      <TipCard tip={tip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: -Spacing.sm },
  gap: { gap: Spacing.sm },
});
