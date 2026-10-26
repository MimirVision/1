import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stepper } from '@/components/ui/controls';
import { Icon, type IconName } from '@/components/ui/icon';
import { ModalScreen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { computeTargets } from '@/lib/nutrition';
import type { Targets } from '@/lib/types';
import { formatVolume, ozToMl } from '@/lib/units';
import { latestWeight } from '@/lib/weight';
import { haptics } from '@/services/haptics';
import { useStore } from '@/store';
import { useTargets } from '@/store/selectors';

export default function TargetsScreen() {
  const theme = useTheme();
  const profile = useStore((s) => s.profile);
  const weights = useStore((s) => s.weights);
  const setOverrides = useStore((s) => s.setTargetOverrides);
  const current = useTargets();
  const [targets, setTargets] = useState<Targets>(current);
  if (!profile) return null;
  const recommended = computeTargets(profile, latestWeight(weights)?.kg ?? profile.startWeightKg);
  const waterStep = profile.volumeUnit === 'oz' ? ozToMl(8) : 250;

  const save = () => {
    const overrides: Partial<Targets> = {};
    (Object.keys(targets) as (keyof Targets)[]).forEach((k) => {
      if (Math.round(targets[k]) !== Math.round(recommended[k])) overrides[k] = targets[k];
    });
    setOverrides(overrides);
    haptics.success();
    router.back();
  };

  const rows: { key: keyof Targets; icon: IconName; color: string; label: string; format: (v: number) => string; step: number; min: number; why: string }[] = [
    {
      key: 'proteinG',
      icon: 'protein',
      color: theme.protein,
      label: 'Protein',
      format: (v) => `${Math.round(v)} g / day`,
      step: 5,
      min: 40,
      why: 'Enough protein is the single biggest lever for keeping muscle while you lose weight.',
    },
    {
      key: 'waterMl',
      icon: 'drop',
      color: theme.water,
      label: 'Fluids',
      format: (v) => `${formatVolume(v, profile.volumeUnit)} / day`,
      step: waterStep,
      min: 1000,
      why: 'Thirst cues fade on GLP-1s, and dehydration worsens nausea, headaches and constipation.',
    },
    { key: 'fiberG', icon: 'leaf', color: theme.fiber, label: 'Fiber', format: (v) => `${Math.round(v)} g / day`, step: 1, min: 10, why: 'Fiber plus fluids is the first-line fix for GLP-1 constipation.' },
    {
      key: 'strengthPerWeek',
      icon: 'dumbbell',
      color: theme.strength,
      label: 'Strength training',
      format: (v) => `${Math.round(v)}× / week`,
      step: 1,
      min: 1,
      why: 'Resistance training signals your body to hold on to muscle.',
    },
  ];

  return (
    <ModalScreen
      title="Daily targets"
      footer={
        <View style={styles.gapXs}>
          <Button title="Save targets" icon="check" onPress={save} />
          <Button title="Reset to recommended" variant="ghost" size="md" onPress={() => setTargets(recommended)} />
        </View>
      }>
      <Text variant="callout" color="textSecondary">
        Your Muscle Shield score combines these four habits: protein counts for half, strength for a fifth, fluids and fiber for the rest.
      </Text>
      {rows.map((row) => (
        <Card key={row.key} style={styles.gapSm}>
          <View style={styles.row}>
            <Icon name={row.icon} tint={row.color} />
            <View style={styles.flex}>
              <Text variant="headline">{row.label}</Text>
              <Text variant="title2" rounded tabular tint={row.color}>
                {row.format(targets[row.key])}
              </Text>
            </View>
            <Stepper
              onDecrement={() => setTargets({ ...targets, [row.key]: Math.max(row.min, targets[row.key] - row.step) })}
              onIncrement={() => setTargets({ ...targets, [row.key]: targets[row.key] + row.step })}
              disabledDecrement={targets[row.key] <= row.min}
            />
          </View>
          <Text variant="footnote" color="textSecondary">
            {row.why} Recommended for you: {row.format(recommended[row.key])}.
          </Text>
        </Card>
      ))}
      <Text variant="caption" color="textTertiary">
        Targets are general guidance based on published GLP-1 nutrition recommendations, not medical advice. Your clinician or dietitian may set different targets.
      </Text>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gapXs: { gap: Spacing.xs },
  gapSm: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
