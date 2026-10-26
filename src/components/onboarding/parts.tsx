import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthYear } from '@/lib/dates';
import { trialProjection, weekToDate } from '@/lib/projection';
import type { CompoundId, Targets } from '@/lib/types';
import { cmToFtIn, formatVolume, ftInToCm, kgToDisplay, weightUnitLabel, type HeightUnit, type VolumeUnit, type WeightUnit } from '@/lib/units';

import { LineChart } from '../charts/line-chart';
import { Card } from '../ui/card';
import { Segmented, Stepper } from '../ui/controls';
import { Icon, type IconName } from '../ui/icon';
import { NumberInput } from '../ui/number-input';
import { ProgressRing } from '../ui/progress';
import { Text } from '../ui/text';

export function HeightInput({
  cm,
  unit,
  onChange,
  onUnitChange,
}: {
  cm: number;
  unit: HeightUnit;
  onChange: (cm: number) => void;
  onUnitChange: (unit: HeightUnit) => void;
}) {
  const { feet, inches } = cmToFtIn(cm);
  return (
    <View style={styles.gapLg}>
      <Segmented
        options={[
          { value: 'ftin', label: 'ft / in' },
          { value: 'cm', label: 'cm' },
        ]}
        value={unit}
        onChange={onUnitChange}
      />
      {unit === 'cm' ? (
        <NumberInput value={Math.round(cm)} onChange={(v) => v && onChange(v)} unit="cm" step={1} decimals={0} min={120} max={230} />
      ) : (
        <View style={styles.ftRow}>
          <View style={styles.ftCol}>
            <Text variant="hero" rounded tabular>
              {feet}
              <Text variant="title2" color="textSecondary">
                {' '}
                ft
              </Text>
            </Text>
            <Stepper
              onDecrement={() => onChange(ftInToCm(Math.max(4, feet - 1), inches))}
              onIncrement={() => onChange(ftInToCm(Math.min(7, feet + 1), inches))}
              disabledDecrement={feet <= 4}
            />
          </View>
          <View style={styles.ftCol}>
            <Text variant="hero" rounded tabular>
              {inches}
              <Text variant="title2" color="textSecondary">
                {' '}
                in
              </Text>
            </Text>
            <Stepper
              onDecrement={() => onChange(inches === 0 ? ftInToCm(Math.max(4, feet - 1), 11) : ftInToCm(feet, inches - 1))}
              onIncrement={() => onChange(inches === 11 ? ftInToCm(Math.min(7, feet + 1), 0) : ftInToCm(feet, inches + 1))}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const BUILD_STEPS = [
  'Matching your medication and dose',
  'Setting your protein target to protect muscle',
  'Planning hydration and fiber for side effects',
  'Scheduling your reminders',
  'Personalising your plan',
];

/** Short "building your plan" moment; calls onDone when finished. */
export function PlanBuilding({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const duration = 3200;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / duration);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        setTimeout(onDone, 350);
      }
    }, 50);
    return () => clearInterval(id);
  }, [onDone]);
  const done = Math.floor(progress * BUILD_STEPS.length);
  return (
    <View style={styles.building}>
      <ProgressRing progress={progress} size={168} stroke={14} color={theme.primary}>
        <Text variant="display" rounded tabular>
          {Math.round(progress * 100)}%
        </Text>
      </ProgressRing>
      <Text variant="title2" align="center">
        Building your plan
      </Text>
      <View style={styles.gapMd}>
        {BUILD_STEPS.map((step, i) => (
          <View key={step} style={styles.buildRow}>
            <View style={[styles.buildDot, { backgroundColor: i < done ? theme.success : theme.surfaceSunken }]}>
              {i < done && <Icon name="check" size={11} tint="#fff" weight="bold" />}
            </View>
            <Text variant="callout" color={i < done ? 'text' : 'textTertiary'}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TargetTile({ icon, color, soft, value, label }: { icon: IconName; color: string; soft: string; value: string; label: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: soft }]}>
      <Icon name={icon} size={18} tint={color} />
      <Text variant="title2" rounded tabular tint={color}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

export function PlanReveal({
  targets,
  volumeUnit,
  weightUnit,
  compound,
  doseMg,
  startKg,
  goalKg,
  journeyStart,
  medicationName,
}: {
  targets: Targets;
  volumeUnit: VolumeUnit;
  weightUnit: WeightUnit;
  compound: CompoundId | null;
  doseMg: number | null;
  startKg: number;
  goalKg: number;
  journeyStart: Date;
  medicationName: string | null;
}) {
  const theme = useTheme();
  const projection = compound ? trialProjection(compound, startKg, goalKg, doseMg ?? undefined, 2) : null;
  const unitLabel = weightUnitLabel(weightUnit);
  return (
    <View style={styles.gapLg}>
      <Animated.View entering={FadeInDown.delay(80)} style={styles.tiles}>
        <TargetTile icon="protein" color={theme.protein} soft={theme.proteinSoft} value={`${targets.proteinG} g`} label="protein / day" />
        <TargetTile icon="drop" color={theme.water} soft={theme.waterSoft} value={formatVolume(targets.waterMl, volumeUnit)} label="fluids / day" />
        <TargetTile icon="leaf" color={theme.fiber} soft={theme.fiberSoft} value={`${targets.fiberG} g`} label="fiber / day" />
        <TargetTile icon="dumbbell" color={theme.strength} soft={theme.strengthSoft} value={`${targets.strengthPerWeek}×`} label="strength / week" />
      </Animated.View>

      {projection && (
        <Animated.View entering={FadeIn.delay(250)}>
          <Card>
            <Text variant="overline" color="textSecondary">
              Clinical-trial average path
            </Text>
            <Text variant="headline" style={{ marginTop: 4 }}>
              {projection.goalWeek !== null
                ? `On track for your goal around ${formatMonthYear(weekToDate(journeyStart, projection.goalWeek))}`
                : `Trial average: −${projection.trial.meanPercentLoss}% in ${projection.trial.weeks} weeks`}
            </Text>
            <View style={{ marginTop: Spacing.md }}>
              <LineChart
                height={150}
                series={[
                  {
                    id: 'proj',
                    data: projection.points.map((p) => ({ x: p.week, y: kgToDisplay(p.kg, weightUnit) })),
                    color: theme.primary,
                    area: true,
                    smooth: true,
                  },
                ]}
                goal={{ y: kgToDisplay(goalKg, weightUnit), label: 'Goal' }}
                formatY={(y) => y.toFixed(0)}
                formatX={(x) => (x === 0 ? 'Start' : `Wk ${Math.round(x)}`)}
                minYSpan={10}
              />
            </View>
            <Text variant="caption" color="textTertiary" style={{ marginTop: Spacing.sm }}>
              Based on the average result in the {projection.trial.name} trial ({projection.trial.doseLabel}
              {medicationName ? `; ${medicationName} uses the same medicine` : ''}). Individual results vary — this isn’t a
              prediction or medical advice. Shown in {unitLabel}.
            </Text>
          </Card>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gapLg: { gap: Spacing.lg },
  gapMd: { gap: Spacing.md, alignSelf: 'stretch' },
  ftRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.huge },
  ftCol: { alignItems: 'center', gap: Spacing.md },
  building: { alignItems: 'center', gap: Spacing.xxl, paddingTop: Spacing.huge * 2 },
  buildRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  buildDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { flexBasis: '47%', flexGrow: 1, padding: Spacing.lg, borderRadius: Radius.lg, gap: 2 },
});
