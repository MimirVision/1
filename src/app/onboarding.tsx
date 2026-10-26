import { getLocales } from 'expo-localization';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { HeightInput, PlanBuilding, PlanReveal } from '@/components/onboarding/parts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, OptionCard, Segmented, Stepper, Toggle } from '@/components/ui/controls';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Icon, type IconName } from '@/components/ui/icon';
import { NumberInput } from '@/components/ui/number-input';
import { ProgressBar } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { Brand } from '@/constants/brand';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, atTimeOfDay, calendarDaysBetween, formatTimeOfDay, startOfDay, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/lib/dates';
import { getPreset, MEDICATION_PRESETS, trialFor } from '@/lib/medications';
import { computeTargets } from '@/lib/nutrition';
import { buildOnboardingResult, type OnboardingDraft } from '@/lib/onboarding';
import { goalPercent } from '@/lib/projection';
import type { Concern, Goal, Schedule, Sex, StrengthHabit } from '@/lib/types';
import { displayToKg, formatDose, kgToDisplay, lbToKg, weightUnitLabel, type WeightUnit } from '@/lib/units';
import { haptics } from '@/services/haptics';
import { requestNotificationPermission } from '@/services/notifications';
import { useStore } from '@/store';

type StepId =
  | 'welcome'
  | 'goal'
  | 'medication'
  | 'dose'
  | 'schedule'
  | 'history'
  | 'weight'
  | 'startWeight'
  | 'height'
  | 'goalWeight'
  | 'sex'
  | 'strength'
  | 'concerns'
  | 'name'
  | 'building'
  | 'plan'
  | 'notifications';

function defaultUnits(): Pick<OnboardingDraft, 'weightUnit' | 'volumeUnit' | 'heightUnit'> {
  const locale = getLocales()[0];
  if (locale?.measurementSystem === 'us' || locale?.regionCode === 'US') {
    return { weightUnit: 'lb', volumeUnit: 'oz', heightUnit: 'ftin' };
  }
  if (locale?.regionCode === 'GB' || locale?.regionCode === 'IE') {
    return { weightUnit: 'st', volumeUnit: 'ml', heightUnit: 'ftin' };
  }
  return { weightUnit: 'kg', volumeUnit: 'ml', heightUnit: 'cm' };
}

function initialDraft(): OnboardingDraft {
  const units = defaultUnits();
  return {
    goal: 'lose',
    presetId: 'zepbound',
    customName: '',
    doseMg: null,
    schedule: { kind: 'weekly', weekday: new Date().getDay() },
    reminderTime: '09:00',
    lastDoseDaysAgo: 0,
    startedDaysAgo: 0,
    backfill: true,
    ...units,
    currentWeightKg: null,
    startWeightKg: null,
    heightCm: units.heightUnit === 'cm' ? 168 : 167.64,
    goalWeightKg: null,
    sex: 'female',
    strengthHabit: 'never',
    concerns: [],
    name: '',
  };
}

const CONCERNS: { id: Concern; title: string; icon: IconName }[] = [
  { id: 'muscle', title: 'Keeping my muscle', icon: 'dumbbell' },
  { id: 'side_effects', title: 'Managing side effects', icon: 'pulse' },
  { id: 'plateau', title: 'Breaking through plateaus', icon: 'chart' },
  { id: 'remembering', title: 'Remembering my doses', icon: 'bell' },
  { id: 'food_noise', title: 'Quieting food noise', icon: 'brain' },
  { id: 'regain', title: 'Keeping it off long-term', icon: 'target' },
  { id: 'cost', title: 'Tracking cost & supply', icon: 'dollar' },
];

const START_CHOICES = [
  { label: 'Starting today', days: 0 },
  { label: '1–3 weeks ago', days: 14 },
  { label: '1–2 months ago', days: 42 },
  { label: '3–6 months ago', days: 120 },
  { label: '6+ months ago', days: 240 },
];

export default function Onboarding() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [index, setIndex] = useState(0);
  const update = (patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const preset = draft.presetId ? getPreset(draft.presetId) : null;
  const isDaily = draft.schedule.kind === 'daily';

  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ['welcome', 'goal', 'medication'];
    if (draft.presetId) list.push('dose', 'schedule', 'history');
    list.push('weight');
    if (draft.startedDaysAgo > 0) list.push('startWeight');
    list.push('height', 'goalWeight', 'sex', 'strength', 'concerns', 'name', 'building', 'plan', 'notifications');
    return list;
  }, [draft.presetId, draft.startedDaysAgo]);

  const step = steps[Math.min(index, steps.length - 1)];
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), [steps.length]);
  const back = () => setIndex((i) => Math.max(0, i - 1));

  const startKg = draft.startWeightKg ?? draft.currentWeightKg ?? lbToKg(200);
  const goalKg = draft.goalWeightKg ?? Math.round(startKg * 0.85 * 10) / 10;

  const finish = async (askNotifications: boolean) => {
    if (askNotifications) await requestNotificationPermission();
    const now = new Date();
    const result = buildOnboardingResult({ ...draft, goalWeightKg: goalKg }, now);
    completeOnboarding(result);
    haptics.success();
    // Let the navigator swap to the signed-in stack, then present the paywall over Today.
    setTimeout(() => router.push({ pathname: '/paywall', params: { source: 'onboarding' } }), 60);
  };

  const unit = draft.weightUnit;
  const unitLabel = weightUnitLabel(unit);
  const toDisplay = (kg: number | null) => (kg === null ? null : Math.round(kgToDisplay(kg, unit) * 10) / 10);
  const fromDisplay = (v: number | null) => (v === null ? null : displayToKg(v, unit));
  const weightStep = unit === 'kg' ? 0.1 : 0.2;

  let title = '';
  let subtitle: string | undefined;
  let content: ReactNode = null;
  let canContinue = true;
  let cta = 'Continue';
  let hideFooter = false;

  switch (step) {
    case 'welcome':
      hideFooter = true;
      break;

    case 'goal': {
      title = 'What’s your main goal?';
      subtitle = 'We’ll tailor your plan and insights around it.';
      const goals: { id: Goal; title: string; subtitle: string; icon: IconName }[] = [
        { id: 'lose', title: 'Lose weight', subtitle: 'Without losing muscle along the way', icon: 'trendDown' },
        { id: 'maintain', title: 'Maintain my results', subtitle: 'Hold my weight steady on a maintenance dose', icon: 'target' },
        { id: 'health', title: 'Improve my health', subtitle: 'Blood sugar, blood pressure, energy', icon: 'heart' },
      ];
      content = goals.map((g) => (
        <OptionCard key={g.id} title={g.title} subtitle={g.subtitle} icon={g.icon} selected={draft.goal === g.id} onPress={() => update({ goal: g.id })} />
      ));
      break;
    }

    case 'medication':
      title = 'Which medication are you on?';
      subtitle = 'Lifted supports every GLP-1 — shots, pills and compounded.';
      content = (
        <>
          {MEDICATION_PRESETS.map((p) => (
            <OptionCard
              key={p.id}
              title={p.name}
              subtitle={p.subtitle}
              icon={p.form === 'pill' ? 'pill' : 'syringe'}
              selected={draft.presetId === p.id}
              onPress={() =>
                update({
                  presetId: p.id,
                  doseMg: null,
                  schedule: p.defaultSchedule.kind === 'weekly' ? { kind: 'weekly', weekday: new Date().getDay() } : p.defaultSchedule,
                  reminderTime: p.form === 'pill' ? '07:00' : '09:00',
                })
              }
            />
          ))}
          {draft.presetId === 'other' && (
            <TextField value={draft.customName} onChange={(customName) => update({ customName })} placeholder="Medication name" />
          )}
          <OptionCard
            title="I haven’t started yet"
            subtitle="Set up your plan now, add your medication later"
            icon="calendar"
            selected={draft.presetId === null}
            onPress={() => update({ presetId: null, startedDaysAgo: 0, lastDoseDaysAgo: null })}
          />
        </>
      );
      break;

    case 'dose': {
      title = 'What’s your current dose?';
      subtitle = preset?.compounded
        ? 'Enter the dose in mg from your prescription — not the units on your syringe.'
        : 'You can update this whenever your dose changes.';
      const ladder = preset?.doses ?? [];
      const custom = draft.doseMg !== null && !ladder.includes(draft.doseMg);
      canContinue = draft.doseMg !== null && draft.doseMg > 0;
      content = (
        <>
          {ladder.length > 0 && (
            <View style={styles.chipWrap}>
              {ladder.map((mg) => (
                <Chip key={mg} label={formatDose(mg)} selected={draft.doseMg === mg} onPress={() => update({ doseMg: mg })} style={styles.doseChip} />
              ))}
            </View>
          )}
          {(ladder.length === 0 || custom || draft.doseMg === null) && (
            <Card>
              <Text variant="subhead" color="textSecondary" align="center" style={{ marginBottom: Spacing.md }}>
                {ladder.length > 0 ? 'Or enter a custom dose' : 'Dose per injection or pill'}
              </Text>
              <NumberInput value={custom ? draft.doseMg : null} onChange={(v) => update({ doseMg: v })} unit="mg" step={0.25} decimals={2} max={100} size="display" />
            </Card>
          )}
        </>
      );
      break;
    }

    case 'schedule': {
      title = 'How often do you take it?';
      subtitle = 'We’ll remind you when it’s time — and never double-schedule an early or late dose.';
      const kind = draft.schedule.kind;
      const weekday = draft.schedule.kind === 'weekly' ? draft.schedule.weekday : new Date().getDay();
      const everyDays = draft.schedule.kind === 'interval' ? draft.schedule.everyDays : 10;
      const splitDays = draft.schedule.kind === 'weekdays' ? draft.schedule.days : [1, 4];
      const setSchedule = (schedule: Schedule) => update({ schedule });
      canContinue = kind !== 'weekdays' || splitDays.length > 0;
      content = (
        <>
          <OptionCard title="Once a week" subtitle="Same day every week" icon="calendar" selected={kind === 'weekly'} onPress={() => setSchedule({ kind: 'weekly', weekday })} />
          {kind === 'weekly' && <WeekdayPicker selected={[weekday]} onToggle={(d) => setSchedule({ kind: 'weekly', weekday: d })} />}
          <OptionCard title="Every day" subtitle="Daily pill or injection" icon="clock" selected={kind === 'daily'} onPress={() => setSchedule({ kind: 'daily' })} />
          <OptionCard title="Every few days" subtitle="e.g. every 10 days" icon="refresh" selected={kind === 'interval'} onPress={() => setSchedule({ kind: 'interval', everyDays })} />
          {kind === 'interval' && (
            <Card style={styles.inlineRow}>
              <Text variant="headline" style={styles.flex}>
                Every {everyDays} days
              </Text>
              <Stepper
                onDecrement={() => setSchedule({ kind: 'interval', everyDays: Math.max(2, everyDays - 1) })}
                onIncrement={() => setSchedule({ kind: 'interval', everyDays: Math.min(30, everyDays + 1) })}
                disabledDecrement={everyDays <= 2}
              />
            </Card>
          )}
          <OptionCard title="Split doses" subtitle="Specific days, e.g. Mon & Thu" icon="list" selected={kind === 'weekdays'} onPress={() => setSchedule({ kind: 'weekdays', days: splitDays })} />
          {kind === 'weekdays' && (
            <WeekdayPicker
              multi
              selected={splitDays}
              onToggle={(d) => setSchedule({ kind: 'weekdays', days: splitDays.includes(d) ? splitDays.filter((x) => x !== d) : [...splitDays, d] })}
            />
          )}
          <DateTimeField
            label="Reminder time"
            mode="time"
            value={atTimeOfDay(new Date(), draft.reminderTime)}
            onChange={(date) => update({ reminderTime: formatTimeOfDay(date.getHours(), date.getMinutes()) })}
          />
        </>
      );
      break;
    }

    case 'history': {
      title = 'Where are you in your journey?';
      subtitle = 'This puts your next dose and medication level on track from day one.';
      const lastChoices = isDaily
        ? [
            { label: 'Today', days: 0 },
            { label: 'Yesterday', days: 1 },
          ]
        : [0, 1, 2, 3, 4, 5, 6].map((d) => ({ label: d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`, days: d }));
      const startDate = addDays(startOfDay(new Date()), -draft.startedDaysAgo);
      content = (
        <>
          <Text variant="overline" color="textSecondary">
            When did you start {preset?.name ?? 'it'}?
          </Text>
          <View style={styles.chipWrap}>
            {START_CHOICES.map((c) => (
              <Chip
                key={c.label}
                label={c.label}
                selected={draft.startedDaysAgo === c.days}
                onPress={() =>
                  update({
                    startedDaysAgo: c.days,
                    lastDoseDaysAgo: draft.lastDoseDaysAgo === null ? null : Math.min(draft.lastDoseDaysAgo, c.days),
                  })
                }
              />
            ))}
          </View>
          <DateTimeField
            label="Start date"
            mode="date"
            value={startDate}
            maximumDate={new Date()}
            onChange={(date) => update({ startedDaysAgo: Math.max(0, calendarDaysBetween(date, new Date())) })}
          />
          <Text variant="overline" color="textSecondary" style={{ marginTop: Spacing.sm }}>
            When was your last dose?
          </Text>
          <View style={styles.chipWrap}>
            {lastChoices
              .filter((c) => c.days <= draft.startedDaysAgo)
              .map((c) => (
                <Chip
                  key={c.label}
                  label={c.label}
                  selected={draft.lastDoseDaysAgo === c.days}
                  onPress={() =>
                    update({
                      lastDoseDaysAgo: c.days,
                      // A weekly shot taken N days ago means that weekday is the shot day.
                      ...(draft.schedule.kind === 'weekly' ? { schedule: { kind: 'weekly', weekday: addDays(new Date(), -c.days).getDay() } } : {}),
                    })
                  }
                />
              ))}
            <Chip label="Not taken yet" selected={draft.lastDoseDaysAgo === null} onPress={() => update({ lastDoseDaysAgo: null })} />
          </View>
          {draft.schedule.kind === 'weekly' && draft.lastDoseDaysAgo !== null && (
            <Text variant="footnote" color="textSecondary">
              Your shot day is set to {WEEKDAY_LONG[draft.schedule.weekday]}. You can change it anytime.
            </Text>
          )}
          {draft.startedDaysAgo >= 7 && draft.lastDoseDaysAgo !== null && (
            <Card style={styles.inlineRow}>
              <View style={styles.flex}>
                <Text variant="headline">Fill in my past doses</Text>
                <Text variant="footnote" color="textSecondary">
                  We’ll estimate earlier doses using the standard titration schedule so your level chart is accurate now. Edit anytime.
                </Text>
              </View>
              <Toggle value={draft.backfill} onValueChange={(backfill) => update({ backfill })} />
            </Card>
          )}
        </>
      );
      break;
    }

    case 'weight':
      title = 'What do you weigh today?';
      subtitle = 'Your starting point for tracking progress.';
      canContinue = draft.currentWeightKg !== null && draft.currentWeightKg > 25;
      content = (
        <>
          <UnitPicker unit={unit} onChange={(weightUnit) => update({ weightUnit })} />
          <NumberInput
            value={toDisplay(draft.currentWeightKg)}
            onChange={(v) => update({ currentWeightKg: fromDisplay(v) })}
            unit={unitLabel}
            step={weightStep}
            max={unit === 'kg' ? 350 : 770}
            autoFocus={Platform.OS !== 'web'}
          />
        </>
      );
      break;

    case 'startWeight':
      title = 'What did you weigh when you started?';
      subtitle = 'So your total progress counts everything you’ve already lost.';
      canContinue = (draft.startWeightKg ?? draft.currentWeightKg) !== null;
      content = (
        <>
          <NumberInput
            value={toDisplay(draft.startWeightKg ?? draft.currentWeightKg)}
            onChange={(v) => update({ startWeightKg: fromDisplay(v) })}
            unit={unitLabel}
            step={weightStep}
            max={unit === 'kg' ? 350 : 770}
          />
          {draft.startWeightKg !== null && draft.currentWeightKg !== null && draft.startWeightKg > draft.currentWeightKg && (
            <Animated.View entering={FadeIn}>
              <Card tone="successSoft" style={styles.inlineRow}>
                <Icon name="sparkles" color="success" />
                <Text variant="callout" weight="600" style={styles.flex}>
                  You’ve already lost {(kgToDisplay(draft.startWeightKg - draft.currentWeightKg, unit === 'st' ? 'lb' : unit)).toFixed(1)}{' '}
                  {unit === 'kg' ? 'kg' : 'lb'}. Nice work.
                </Text>
              </Card>
            </Animated.View>
          )}
        </>
      );
      break;

    case 'height':
      title = 'How tall are you?';
      subtitle = 'Used for BMI and your protein and fluid targets.';
      content = (
        <HeightInput
          cm={draft.heightCm}
          unit={draft.heightUnit}
          onChange={(heightCm) => update({ heightCm })}
          onUnitChange={(heightUnit) => update({ heightUnit })}
        />
      );
      break;

    case 'goalWeight': {
      title = draft.goal === 'maintain' ? 'What weight do you want to hold?' : 'What’s your goal weight?';
      subtitle = 'You can change it anytime.';
      const pct = goalPercent(startKg, goalKg);
      const trial = preset ? trialFor(preset.compound, draft.doseMg ?? undefined) : undefined;
      content = (
        <>
          <NumberInput
            value={toDisplay(goalKg)}
            onChange={(v) => update({ goalWeightKg: fromDisplay(v) })}
            unit={unitLabel}
            step={unit === 'kg' ? 0.5 : 1}
            max={unit === 'kg' ? 350 : 770}
          />
          {pct > 0.5 && (
            <Card>
              <Text variant="title2" rounded>
                {pct.toFixed(0)}% of your starting weight
              </Text>
              <Text variant="callout" color="textSecondary" style={{ marginTop: 4 }}>
                {trial
                  ? `In the ${trial.name} trial, people on ${trial.doseLabel} lost ${trial.meanPercentLoss}% on average over ${trial.weeks} weeks. ${
                      pct <= trial.meanPercentLoss ? 'Your goal is in line with that.' : 'Your goal is ambitious — consistency with protein and strength will matter.'
                    }`
                  : 'Even 5–10% weight loss brings meaningful health benefits.'}
              </Text>
            </Card>
          )}
        </>
      );
      break;
    }

    case 'sex': {
      title = 'Which best describes you?';
      subtitle = 'Used to personalise your fiber and protein targets.';
      const options: { id: Sex; title: string }[] = [
        { id: 'female', title: 'Female' },
        { id: 'male', title: 'Male' },
        { id: 'unspecified', title: 'Prefer not to say' },
      ];
      content = options.map((o) => <OptionCard key={o.id} title={o.title} selected={draft.sex === o.id} onPress={() => update({ sex: o.id })} />);
      break;
    }

    case 'strength': {
      title = 'Do you do strength training?';
      subtitle = 'Resistance training is the best-studied way to keep muscle while losing weight.';
      const options: { id: StrengthHabit; title: string; subtitle: string }[] = [
        { id: 'never', title: 'Not yet', subtitle: 'We’ll start you with 2 short sessions a week' },
        { id: 'sometimes', title: 'Sometimes', subtitle: '1–2 times a week' },
        { id: 'regular', title: 'Regularly', subtitle: '3 or more times a week' },
      ];
      content = (
        <>
          {options.map((o) => (
            <OptionCard key={o.id} title={o.title} subtitle={o.subtitle} icon="dumbbell" iconColor={theme.strength} selected={draft.strengthHabit === o.id} onPress={() => update({ strengthHabit: o.id })} />
          ))}
          <Card tone="primarySoft" style={styles.inlineRow}>
            <Icon name="info" color="primary" />
            <Text variant="footnote" style={styles.flex}>
              In the major GLP-1 trials, lean mass made up roughly a quarter to two-fifths of the weight people lost. Protein and strength work help keep it.
            </Text>
          </Card>
        </>
      );
      break;
    }

    case 'concerns':
      title = 'What would you like help with?';
      subtitle = 'Pick as many as you like.';
      canContinue = draft.concerns.length > 0;
      content = CONCERNS.map((c) => (
        <OptionCard
          key={c.id}
          multi
          title={c.title}
          icon={c.icon}
          selected={draft.concerns.includes(c.id)}
          onPress={() =>
            update({ concerns: draft.concerns.includes(c.id) ? draft.concerns.filter((x) => x !== c.id) : [...draft.concerns, c.id] })
          }
        />
      ));
      break;

    case 'name':
      title = 'Last thing — what should we call you?';
      subtitle = 'Optional. It stays on your phone.';
      cta = draft.name.trim() ? 'Continue' : 'Skip';
      content = <TextField value={draft.name} onChange={(name) => update({ name })} placeholder="First name" autoFocus={Platform.OS !== 'web'} />;
      break;

    case 'building':
      hideFooter = true;
      content = <PlanBuilding onDone={next} />;
      break;

    case 'plan': {
      title = `${draft.name.trim() ? `${draft.name.trim()}, your` : 'Your'} plan is ready`;
      subtitle = 'Daily targets to protect your muscle and ease side effects.';
      const targets = computeTargets(
        { ...buildOnboardingResult({ ...draft, goalWeightKg: goalKg }, new Date()).profile },
        draft.currentWeightKg ?? startKg,
      );
      cta = 'Let’s go';
      content = (
        <PlanReveal
          targets={targets}
          volumeUnit={draft.volumeUnit}
          weightUnit={unit}
          compound={preset?.compound ?? null}
          doseMg={draft.doseMg}
          startKg={startKg}
          goalKg={goalKg}
          journeyStart={addDays(startOfDay(new Date()), -draft.startedDaysAgo)}
          medicationName={preset && !preset.compounded && preset.id !== 'other' ? preset.name : null}
        />
      );
      break;
    }

    case 'notifications':
      hideFooter = true;
      content = (
        <View style={styles.notif}>
          <View style={[styles.notifIcon, { backgroundColor: theme.primarySoft }]}>
            <Icon name="bell" size={44} color="primary" />
          </View>
          <Text variant="title" align="center">
            Never miss a dose
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Get a reminder on dose day, a nudge if you forget, and a gentle evening check-in for protein and water.
          </Text>
          <Card style={styles.notifPreview}>
            <View style={[styles.notifAppIcon, { backgroundColor: theme.primary }]}>
              <LogoMark size={22} color={theme.primary} />
            </View>
            <View style={styles.flex}>
              <Text variant="subhead" weight="700">
                {preset ? (preset.form === 'pill' ? `Time for your ${preset.name}` : `${preset.name} shot day`) : 'Weekly weigh-in'}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {preset && draft.doseMg ? `${formatDose(draft.doseMg)} is due today. Tap to log it.` : 'Same time, same scale. Tap to log it.'}
              </Text>
            </View>
          </Card>
          <View style={styles.notifButtons}>
            <Button title="Turn on reminders" icon="bell" onPress={() => finish(true)} testID="enable-notifications" />
            <Button title="Not now" variant="ghost" onPress={() => finish(false)} />
          </View>
        </View>
      );
      break;
  }

  if (step === 'welcome') {
    return <Welcome onStart={next} />;
  }

  const progress = index / (steps.length - 1);
  return (
    <View style={[styles.flex, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {step !== 'building' && (
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={10} style={styles.backButton}>
            <Icon name="chevronLeft" size={20} color="text" weight="semibold" />
          </Pressable>
          <View style={styles.flex}>
            <ProgressBar progress={progress} color={theme.primary} height={6} />
          </View>
          <View style={styles.backButton} />
        </View>
      )}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View key={step} entering={FadeInRight.duration(260)} style={styles.inner}>
          {title ? (
            <View style={styles.titleBlock}>
              <Text variant="title" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="body" color="textSecondary">
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          {content}
        </Animated.View>
      </ScrollView>
      {!hideFooter && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <View style={styles.innerFooter}>
            <Button title={cta} onPress={next} disabled={!canContinue} testID="onboarding-continue" />
          </View>
        </View>
      )}
    </View>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const points: { icon: IconName; text: string }[] = [
    { icon: 'syringe', text: 'Shot & pill reminders with site rotation' },
    { icon: 'chart', text: 'Your estimated medication level, live' },
    { icon: 'shield', text: 'Daily Muscle Shield: protein, water, fiber, strength' },
    { icon: 'doc', text: 'Doctor-ready progress reports' },
  ];
  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <LinearGradient colors={[theme.primary, '#8B5CF6', theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + Spacing.xxl }]}>
        <View style={styles.logoRow}>
          <View style={styles.logo}>
            <LogoMark size={24} color={theme.primary} fill={theme.primarySoft} />
          </View>
          <Text variant="title2" tint="#fff">
            {Brand.name}
          </Text>
        </View>
        <Animated.View entering={FadeIn.duration(600)}>
          <Text variant="display" tint="#fff" style={{ marginTop: Spacing.xxl }}>
            Lose the fat.{'\n'}Keep the muscle.
          </Text>
          <Text variant="body" tint="rgba(255,255,255,0.88)" style={{ marginTop: Spacing.md }}>
            The GLP-1 companion that tracks your doses, side effects and progress — and protects the muscle you’re working hard to keep.
          </Text>
        </Animated.View>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.welcomeBody}>
        <View style={styles.inner}>
          {points.map((p, i) => (
            <Animated.View key={p.text} entering={FadeIn.delay(200 + i * 90)} style={styles.point}>
              <View style={[styles.pointIcon, { backgroundColor: theme.primarySoft }]}>
                <Icon name={p.icon} size={18} color="primary" />
              </View>
              <Text variant="callout" weight="600" style={styles.flex}>
                {p.text}
              </Text>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <View style={styles.innerFooter}>
          <Button title="Get started" onPress={onStart} iconRight="chevronRight" testID="onboarding-start" />
          <Text variant="caption" color="textTertiary" align="center">
            Works with Zepbound, Mounjaro, Wegovy, Ozempic, Foundayo, compounded GLP-1s & more
          </Text>
        </View>
      </View>
    </View>
  );
}

function WeekdayPicker({ selected, onToggle, multi }: { selected: number[]; onToggle: (day: number) => void; multi?: boolean }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <View style={styles.weekRow} accessibilityRole={multi ? undefined : 'radiogroup'}>
      {order.map((d) => (
        <Chip key={d} label={WEEKDAY_SHORT[d]} selected={selected.includes(d)} onPress={() => onToggle(d)} style={styles.weekChip} />
      ))}
    </View>
  );
}

function UnitPicker({ unit, onChange }: { unit: WeightUnit; onChange: (unit: WeightUnit) => void }) {
  return (
    <Segmented
      options={[
        { value: 'lb', label: 'lb' },
        { value: 'kg', label: 'kg' },
        { value: 'st', label: 'st & lb' },
      ]}
      value={unit}
      onChange={onChange}
    />
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textTertiary}
      autoFocus={autoFocus}
      autoCapitalize="words"
      returnKeyType="done"
      style={[styles.textField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.md },
  innerFooter: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.sm },
  titleBlock: { gap: Spacing.sm, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  doseChip: { height: 44, paddingHorizontal: Spacing.lg },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  weekChip: { paddingHorizontal: 10 },
  textField: { height: 56, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.lg, fontSize: 18 },
  hero: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xxxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  welcomeBody: { padding: Spacing.xxl, paddingTop: Spacing.xxl },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pointIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notif: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.huge },
  notifIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  notifPreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, alignSelf: 'stretch' },
  notifAppIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  notifButtons: { alignSelf: 'stretch', gap: Spacing.xs, marginTop: Spacing.lg },
});
