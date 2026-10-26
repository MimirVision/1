import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DateKey } from '@/lib/dates';
import { emptyDay, muscleShield, strengthSessionsThisWeek } from '@/lib/nutrition';
import type { Targets } from '@/lib/types';
import { formatVolume, ozToMl, type VolumeUnit } from '@/lib/units';
import { haptics } from '@/services/haptics';
import { useStore } from '@/store';

import { Card } from '../ui/card';
import { Icon, type IconName } from '../ui/icon';
import { ProgressBar, ProgressRing } from '../ui/progress';
import { Text } from '../ui/text';

function QuickAdd({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${label}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      hitSlop={4}
      style={({ pressed }) => [styles.quick, { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.6 : 1 }]}>
      <Text variant="caption" weight="700" tint={color}>
        {label}
      </Text>
    </Pressable>
  );
}

function TrackerRow({
  icon,
  color,
  label,
  value,
  progress,
  actions,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: string;
  progress: number;
  actions: { label: string; onPress: () => void }[];
}) {
  return (
    <View style={styles.tracker}>
      <View style={styles.trackerTop}>
        <Icon name={icon} size={15} tint={color} />
        <Text variant="subhead" weight="600" style={styles.flex}>
          {label}
        </Text>
        <Text variant="subhead" weight="700" rounded tabular>
          {value}
        </Text>
      </View>
      <View style={styles.trackerBottom}>
        <View style={styles.flex}>
          <ProgressBar progress={progress} color={color} height={6} />
        </View>
        {actions.map((a) => (
          <QuickAdd key={a.label} label={a.label} color={color} onPress={a.onPress} />
        ))}
      </View>
    </View>
  );
}

export function ShieldCard({ date, targets, volumeUnit, now }: { date: DateKey; targets: Targets; volumeUnit: VolumeUnit; now: Date }) {
  const theme = useTheme();
  const days = useStore((s) => s.days);
  const addToDay = useStore((s) => s.addToDay);
  const setDay = useStore((s) => s.setDay);
  const day = days[date] ?? emptyDay(date);
  const strengthWeek = strengthSessionsThisWeek(days, now);
  const shield = muscleShield(day, targets, strengthWeek);
  const ringColor = shield.score >= 85 ? theme.success : shield.score >= 60 ? theme.primary : shield.score >= 35 ? theme.strength : theme.protein;
  const waterStep = volumeUnit === 'oz' ? ozToMl(8) : 250;

  return (
    <Card style={styles.card}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/targets')} style={styles.header}>
        <ProgressRing progress={shield.score / 100} size={84} stroke={9} color={ringColor}>
          <Text variant="title2" rounded tabular>
            {shield.score}
          </Text>
        </ProgressRing>
        <View style={styles.flex}>
          <Text variant="overline" color="textSecondary">
            Muscle Shield
          </Text>
          <Text variant="title2">{shield.label}</Text>
          <Text variant="footnote" color="textSecondary">
            {shield.protein < 1
              ? `${Math.max(0, targets.proteinG - day.proteinG)} g protein to go today`
              : 'Protein target hit — great work.'}
          </Text>
        </View>
        <Icon name="chevronRight" size={13} color="textTertiary" />
      </Pressable>

      <TrackerRow
        icon="protein"
        color={theme.protein}
        label="Protein"
        value={`${Math.round(day.proteinG)} / ${targets.proteinG} g`}
        progress={shield.protein}
        actions={[
          { label: '+10g', onPress: () => addToDay(date, { proteinG: 10 }) },
          { label: '+25g', onPress: () => addToDay(date, { proteinG: 25 }) },
        ]}
      />
      <TrackerRow
        icon="drop"
        color={theme.water}
        label="Fluids"
        value={`${formatVolume(day.waterMl, volumeUnit)} / ${formatVolume(targets.waterMl, volumeUnit)}`}
        progress={shield.water}
        actions={[
          { label: volumeUnit === 'oz' ? '−8oz' : '−250', onPress: () => addToDay(date, { waterMl: -waterStep }) },
          { label: volumeUnit === 'oz' ? '+8oz' : '+250', onPress: () => addToDay(date, { waterMl: waterStep }) },
        ]}
      />
      <TrackerRow
        icon="leaf"
        color={theme.fiber}
        label="Fiber"
        value={`${Math.round(day.fiberG)} / ${targets.fiberG} g`}
        progress={shield.fiber}
        actions={[
          { label: '−5g', onPress: () => addToDay(date, { fiberG: -5 }) },
          { label: '+5g', onPress: () => addToDay(date, { fiberG: 5 }) },
        ]}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: day.strength }}
        onPress={() => {
          haptics.impact();
          setDay(date, { strength: !day.strength });
        }}
        style={[styles.strength, { backgroundColor: day.strength ? theme.strengthSoft : theme.surfaceAlt }]}>
        <Icon name="dumbbell" size={16} tint={theme.strength} />
        <Text variant="subhead" weight="600" style={styles.flex}>
          {day.strength ? 'Strength workout done' : 'Did a strength workout today?'}
        </Text>
        <Text variant="caption" color="textSecondary" weight="600">
          {strengthWeek}/{targets.strengthPerWeek} this week
        </Text>
        <View style={[styles.check, { borderColor: theme.strength, backgroundColor: day.strength ? theme.strength : 'transparent' }]}>
          {day.strength && <Icon name="check" size={11} tint="#fff" weight="bold" />}
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  tracker: { gap: Spacing.sm },
  trackerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  trackerBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  quick: { paddingHorizontal: 10, height: 28, borderRadius: Radius.pill, justifyContent: 'center' },
  strength: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
