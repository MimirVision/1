import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { BodyMap } from '@/components/med/body-map';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, Toggle } from '@/components/ui/controls';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Icon } from '@/components/ui/icon';
import { EmptyState, ModalScreen } from '@/components/ui/layout';
import { NumberInput } from '@/components/ui/number-input';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getPreset } from '@/lib/medications';
import { lastUsedBySite, suggestNextSite } from '@/lib/sites';
import type { InjectionSiteId } from '@/lib/types';
import { formatDose } from '@/lib/units';
import { haptics } from '@/services/haptics';
import { requestNotificationPermission, schedulePillTimerDone } from '@/services/notifications';
import { maybeRequestReview } from '@/services/review';
import { useStore } from '@/store';
import { useActiveMedications } from '@/store/selectors';

function minutesSince(date: Date): number {
  return (Date.now() - date.getTime()) / 60_000;
}

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function LogDose() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ medicationId?: string; id?: string }>();
  const doses = useStore((s) => s.doses);
  const allMeds = useStore((s) => s.medications);
  const logDose = useStore((s) => s.logDose);
  const updateDose = useStore((s) => s.updateDose);
  const deleteDose = useStore((s) => s.deleteDose);
  const startPillTimer = useStore((s) => s.startPillTimer);
  const active = useActiveMedications();

  const existing = params.id ? doses.find((d) => d.id === params.id) : undefined;
  const initialMedId = existing?.medicationId ?? params.medicationId ?? active[0]?.id;
  const [medicationId, setMedicationId] = useState(initialMedId);
  const medication = allMeds.find((m) => m.id === medicationId);
  const preset = medication ? getPreset(medication.presetId) : undefined;

  const medDoses = useMemo(() => doses.filter((d) => d.medicationId === medicationId && d.id !== existing?.id), [doses, medicationId, existing]);
  const suggested = useMemo(() => suggestNextSite(medDoses), [medDoses]);
  const lastUsed = useMemo(() => lastUsedBySite(medDoses), [medDoses]);

  const [doseMg, setDoseMg] = useState<number | null>(existing?.doseMg ?? medication?.currentDoseMg ?? null);
  const [takenAt, setTakenAt] = useState(existing ? new Date(existing.takenAt) : new Date());
  const [site, setSite] = useState<InjectionSiteId | undefined>(existing?.site ?? (medication?.form === 'injection' ? suggested : undefined));
  const [note, setNote] = useState(existing?.note ?? '');
  const waitMinutes = preset?.pillRules?.emptyStomach ? preset.pillRules.waitMinutes : undefined;
  const [startTimer, setStartTimer] = useState(!!waitMinutes && !existing);
  const [customMode, setCustomMode] = useState(false);

  if (!medication || !preset) {
    return (
      <ModalScreen title="Log dose">
        <EmptyState
          icon="syringe"
          title="No medication yet"
          body="Add your medication first, then you can log doses."
          action={<Button title="Add medication" size="md" fullWidth={false} onPress={() => router.replace('/medication/new')} />}
        />
      </ModalScreen>
    );
  }

  const ladder = preset.doses;
  const customDose = customMode || (doseMg !== null && !ladder.includes(doseMg));
  const previousDose = medDoses.filter((d) => Date.parse(d.takenAt) < takenAt.getTime()).sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt))[0];
  const isIncrease = previousDose && doseMg !== null && doseMg > previousDose.doseMg;

  const save = async () => {
    if (doseMg === null || doseMg <= 0) return;
    const payload = {
      medicationId: medication.id,
      takenAt: takenAt.toISOString(),
      doseMg,
      site: medication.form === 'injection' ? site : undefined,
      note: note.trim() || undefined,
    };
    if (existing) updateDose(existing.id, payload);
    else logDose(payload);
    haptics.success();
    const elapsed = minutesSince(takenAt);
    if (startTimer && waitMinutes && elapsed < waitMinutes) {
      const remaining = waitMinutes - elapsed;
      const timer = startPillTimer(medication.id, remaining);
      await requestNotificationPermission();
      schedulePillTimerDone(new Date(timer.endsAt), medication.name);
    }
    router.back();
    if (!existing) setTimeout(() => maybeRequestReview(), 800);
  };

  return (
    <ModalScreen
      title={existing ? 'Edit dose' : medication.form === 'pill' ? 'Log pill' : 'Log shot'}
      footer={
        <View style={styles.footer}>
          <Button title={existing ? 'Save changes' : 'Log dose'} icon="check" onPress={save} disabled={doseMg === null || doseMg <= 0} testID="save-dose" />
          {existing && (
            <Button
              title="Delete dose"
              variant="danger"
              size="md"
              onPress={() =>
                confirm('Delete this dose?', 'This removes it from your history and level chart.', () => {
                  deleteDose(existing.id);
                  router.back();
                })
              }
            />
          )}
        </View>
      }>
      {active.length > 1 && !existing && (
        <View style={styles.chips}>
          {active.map((m) => (
            <Chip
              key={m.id}
              label={m.name}
              icon={m.form === 'pill' ? 'pill' : 'syringe'}
              selected={m.id === medicationId}
              onPress={() => {
                setMedicationId(m.id);
                setDoseMg(m.currentDoseMg);
                setSite(m.form === 'injection' ? suggestNextSite(doses.filter((d) => d.medicationId === m.id)) : undefined);
              }}
            />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text variant="overline" color="textSecondary">
          Dose
        </Text>
        {ladder.length > 0 ? (
          <View style={styles.chips}>
            {ladder.map((mg) => (
              <Chip
                key={mg}
                label={formatDose(mg)}
                selected={!customMode && doseMg === mg}
                onPress={() => {
                  setCustomMode(false);
                  setDoseMg(mg);
                }}
                style={styles.doseChip}
              />
            ))}
          </View>
        ) : null}
        {(ladder.length === 0 || customDose) && (
          <Card>
            <NumberInput value={doseMg} onChange={setDoseMg} unit="mg" step={0.25} decimals={2} max={100} size="display" />
          </Card>
        )}
        {ladder.length > 0 && !customDose && (
          <Text variant="footnote" color="primary" weight="600" onPress={() => setCustomMode(true)}>
            Enter a custom dose
          </Text>
        )}
        {isIncrease && (
          <Card tone="primarySoft" style={styles.inline}>
            <Icon name="trendUp" color="primary" />
            <Text variant="footnote" style={styles.flex}>
              Stepping up from {formatDose(previousDose.doseMg)}. Side effects can flare for a week or two — keep meals small and fluids up.
            </Text>
          </Card>
        )}
      </View>

      <DateTimeField label={medication.form === 'pill' ? 'Taken' : 'Injected'} value={takenAt} onChange={setTakenAt} maximumDate={new Date()} />

      {medication.form === 'injection' && (
        <Card>
          <Text variant="overline" color="textSecondary" style={{ marginBottom: Spacing.md }}>
            Injection site
          </Text>
          <BodyMap selected={site} suggested={suggested} lastUsed={lastUsed} onSelect={setSite} now={new Date()} />
        </Card>
      )}

      {waitMinutes && !existing ? (
        <Card style={styles.inline}>
          <Icon name="timer" tint={theme.water} />
          <View style={styles.flex}>
            <Text variant="headline">Start {waitMinutes}-minute wait timer</Text>
            <Text variant="footnote" color="textSecondary">
              We’ll let you know when you can eat or drink.
            </Text>
          </View>
          <Toggle value={startTimer} onValueChange={setStartTimer} />
        </Card>
      ) : null}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Note (optional) — e.g. new pen, felt queasy"
        placeholderTextColor={theme.textTertiary}
        multiline
        style={[styles.note, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
      />

      {medication.dosesRemaining !== undefined && !existing && (
        <Text variant="footnote" color={medication.dosesRemaining <= 2 ? 'warning' : 'textSecondary'} align="center">
          {Math.max(0, medication.dosesRemaining - 1)} dose{medication.dosesRemaining - 1 === 1 ? '' : 's'} left after this one
        </Text>
      )}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: Spacing.xs },
  section: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  doseChip: { height: 42, paddingHorizontal: Spacing.lg },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  note: { minHeight: 64, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, fontSize: 15, textAlignVertical: 'top' },
});
