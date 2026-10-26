import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatClock, formatCountdown, formatRelativeDay, formatTimer } from '@/lib/dates';
import { getPreset } from '@/lib/medications';
import { doseStatus } from '@/lib/schedule';
import type { DoseLog, Medication } from '@/lib/types';
import { formatDose } from '@/lib/units';
import { haptics } from '@/services/haptics';
import { cancelPillTimer } from '@/services/notifications';
import { useStore } from '@/store';
import { useNow } from '@/store/selectors';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Icon } from '../ui/icon';
import { ProgressRing } from '../ui/progress';
import { Text } from '../ui/text';

export function DoseCard({ medication, doses, now }: { medication: Medication; doses: DoseLog[]; now: Date }) {
  const theme = useTheme();
  const status = doseStatus(medication, doses, now);
  const preset = getPreset(medication.presetId);
  const isPill = medication.form === 'pill';
  const logDose = () => router.push({ pathname: '/log-dose', params: { medicationId: medication.id } });

  if (status.state === 'due' || status.state === 'overdue') {
    const overdue = status.state === 'overdue';
    return (
      <LinearGradient
        colors={overdue ? [theme.warning, '#F07A2B'] : [theme.primary, '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Icon name={isPill ? 'pill' : 'syringe'} size={20} tint={overdue ? theme.warning : theme.primary} />
          </View>
          <View style={styles.flex}>
            <Text variant="overline" tint="rgba(255,255,255,0.85)">
              {overdue ? `${status.overdueDays} day${status.overdueDays === 1 ? '' : 's'} overdue` : isPill ? 'Pill time' : 'Shot day'}
            </Text>
            <Text variant="title2" tint="#fff">
              {medication.name} · {formatDose(medication.currentDoseMg)}
            </Text>
          </View>
        </View>
        {isPill && preset.pillRules?.emptyStomach ? (
          <Text variant="footnote" tint="rgba(255,255,255,0.9)">
            Empty stomach, up to {preset.pillRules.maxWaterOz} oz of water, then wait {preset.pillRules.waitMinutes} minutes before eating.
          </Text>
        ) : overdue ? (
          <Text variant="footnote" tint="rgba(255,255,255,0.9)">
            Check your medication guide or prescriber for what to do about a late dose.
          </Text>
        ) : null}
        <Button
          title={isPill ? 'I took my pill' : 'Log my shot'}
          icon="check"
          variant="secondary"
          onPress={logDose}
          style={{ backgroundColor: '#fff' }}
          testID="log-dose-cta"
        />
      </LinearGradient>
    );
  }

  const taken = status.state === 'taken';
  const until = status.nextDueAt.getTime() - now.getTime();
  return (
    <Card style={styles.row} onPress={() => router.push('/meds')}>
      <View style={[styles.iconWrap, { backgroundColor: taken ? theme.successSoft : theme.primarySoft }]}>
        <Icon name={taken ? 'checkCircle' : isPill ? 'pill' : 'syringe'} size={22} tint={taken ? theme.success : theme.primary} />
      </View>
      <View style={styles.flex}>
        <Text variant="overline" color="textSecondary">
          {taken ? 'Done for today' : status.state === 'not_started' ? 'Starts' : 'Next dose'}
        </Text>
        <Text variant="headline">
          {medication.name} · {formatDose(medication.currentDoseMg)}
        </Text>
        <Text variant="footnote" color="textSecondary">
          {taken
            ? `Next: ${formatRelativeDay(status.nextDueAt, now)} at ${formatClock(status.nextDueAt)}`
            : `${formatRelativeDay(status.nextDueAt, now)} at ${formatClock(status.nextDueAt)}`}
        </Text>
      </View>
      {!taken && until > 0 && (
        <View style={[styles.countdown, { backgroundColor: theme.surfaceAlt }]}>
          <Text variant="subhead" weight="700" rounded tabular>
            {formatCountdown(until)}
          </Text>
        </View>
      )}
    </Card>
  );
}

export function PillTimerCard() {
  const theme = useTheme();
  const now = useNow(1000);
  const timer = useStore((s) => s.pillTimer);
  const clear = useStore((s) => s.clearPillTimer);
  if (!timer) return null;
  const total = Date.parse(timer.endsAt) - Date.parse(timer.startedAt);
  const left = Date.parse(timer.endsAt) - now.getTime();
  const done = left <= 0;
  const finish = () => {
    haptics.tap();
    cancelPillTimer();
    clear();
  };
  return (
    <Card style={styles.row} tone={done ? 'successSoft' : 'surface'}>
      <ProgressRing progress={done ? 1 : 1 - left / total} size={64} stroke={7} color={done ? theme.success : theme.water}>
        <Icon name={done ? 'check' : 'timer'} size={20} tint={done ? theme.success : theme.water} />
      </ProgressRing>
      <View style={styles.flex}>
        <Text variant="overline" color="textSecondary">
          {done ? 'Wait complete' : 'Pill wait'}
        </Text>
        <Text variant="title2" rounded tabular>
          {done ? 'You can eat now' : formatTimer(left)}
        </Text>
        <Text variant="footnote" color="textSecondary">
          {done ? 'Start with protein to protect your muscle.' : 'No food, drinks or other pills until the timer ends.'}
        </Text>
      </View>
      <Button title={done ? 'Done' : 'Stop'} size="sm" variant={done ? 'primary' : 'outline'} fullWidth={false} onPress={finish} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countdown: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill },
});
