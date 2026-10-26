import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Icon } from '@/components/ui/icon';
import { ModalScreen } from '@/components/ui/layout';
import { NumberInput } from '@/components/ui/number-input';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { displayToKg, formatWeightDelta, kgToDisplay, weightUnitLabel } from '@/lib/units';
import { latestWeight, milestones } from '@/lib/weight';
import { haptics } from '@/services/haptics';
import { maybeRequestReview } from '@/services/review';
import { useStore } from '@/store';

export default function LogWeight() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = useStore((s) => s.profile);
  const weights = useStore((s) => s.weights);
  const logWeight = useStore((s) => s.logWeight);
  const deleteWeight = useStore((s) => s.deleteWeight);
  const existing = id ? weights.find((w) => w.id === id) : undefined;
  const last = latestWeight(weights);
  const unit = profile?.weightUnit ?? 'lb';
  const [value, setValue] = useState<number | null>(() => {
    const kg = existing?.kg ?? last?.kg ?? profile?.startWeightKg ?? null;
    return kg === null ? null : Math.round(kgToDisplay(kg, unit) * 10) / 10;
  });
  const [at, setAt] = useState(existing ? new Date(existing.at) : new Date());
  if (!profile) return null;

  const kg = value === null ? null : displayToKg(value, unit);
  const change = kg !== null && last && !existing ? kg - last.kg : null;
  const fromStart = kg !== null ? kg - profile.startWeightKg : null;

  const save = () => {
    if (kg === null) return;
    const before = milestones(profile.startWeightKg, weights, unit).filter((m) => m.achieved).length;
    if (existing) deleteWeight(existing.id);
    const entry = logWeight(kg, at.toISOString());
    const after = milestones(profile.startWeightKg, [...weights.filter((w) => w.id !== existing?.id), entry], unit).filter((m) => m.achieved).length;
    haptics.success();
    router.back();
    if (after > before) setTimeout(() => maybeRequestReview(), 900);
  };

  return (
    <ModalScreen
      title={existing ? 'Edit weigh-in' : 'Log weight'}
      footer={
        <View style={styles.footer}>
          <Button title="Save" icon="check" onPress={save} disabled={kg === null || kg < 25} testID="save-weight" />
          {existing && (
            <Button
              title="Delete weigh-in"
              variant="danger"
              size="md"
              onPress={() => {
                deleteWeight(existing.id);
                router.back();
              }}
            />
          )}
        </View>
      }>
      <View style={styles.input}>
        <NumberInput value={value} onChange={setValue} unit={weightUnitLabel(unit)} step={unit === 'kg' ? 0.1 : 0.2} max={unit === 'kg' ? 350 : 770} autoFocus />
      </View>

      {change !== null && Math.abs(change) >= 0.05 && (
        <Animated.View entering={FadeIn}>
          <Card tone={change < 0 ? 'successSoft' : 'surfaceAlt'} style={styles.inline}>
            <Icon name={change < 0 ? 'trendDown' : 'trendUp'} color={change < 0 ? 'success' : 'textSecondary'} />
            <Text variant="callout" weight="600" style={styles.flex}>
              {formatWeightDelta(change, unit)} since your last weigh-in
              {fromStart !== null && fromStart < 0 ? ` · ${formatWeightDelta(fromStart, unit)} total` : ''}
            </Text>
          </Card>
        </Animated.View>
      )}
      {change !== null && change > 0.4 && (
        <Text variant="footnote" color="textSecondary" align="center">
          Day-to-day swings are mostly water, salt and digestion. Your 4-week trend is what matters.
        </Text>
      )}

      <DateTimeField label="Weighed" value={at} onChange={setAt} maximumDate={new Date()} />
      <Text variant="footnote" color="textTertiary" align="center">
        Tip: weigh in first thing in the morning, after the bathroom and before eating.
      </Text>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: Spacing.xs },
  input: { paddingVertical: Spacing.xxl },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
