import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, OptionCard, Stepper, Toggle } from '@/components/ui/controls';
import { DateTimeField } from '@/components/ui/date-time-field';
import { ModalScreen } from '@/components/ui/layout';
import { NumberInput } from '@/components/ui/number-input';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, atTimeOfDay, formatTimeOfDay, startOfDay, WEEKDAY_SHORT } from '@/lib/dates';
import { uid } from '@/lib/id';
import { getPreset, MEDICATION_PRESETS } from '@/lib/medications';
import type { Medication, Schedule } from '@/lib/types';
import { formatDose } from '@/lib/units';
import { haptics } from '@/services/haptics';
import { useStore } from '@/store';

export default function EditMedication() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medications = useStore((s) => s.medications);
  const addMedication = useStore((s) => s.addMedication);
  const updateMedication = useStore((s) => s.updateMedication);
  const removeMedication = useStore((s) => s.removeMedication);
  const existing = medications.find((m) => m.id === id);
  const isNew = !existing;

  const [presetId, setPresetId] = useState(existing?.presetId ?? 'zepbound');
  const preset = getPreset(presetId);
  const [name, setName] = useState(existing?.name ?? preset.name);
  const [doseMg, setDoseMg] = useState<number | null>(existing?.currentDoseMg ?? preset.doses[0] ?? null);
  const [schedule, setSchedule] = useState<Schedule>(existing?.schedule ?? preset.defaultSchedule);
  const [reminderTime, setReminderTime] = useState(existing?.reminderTime ?? '09:00');
  const [remindersEnabled, setRemindersEnabled] = useState(existing?.remindersEnabled ?? true);
  const [startedAt, setStartedAt] = useState(existing ? new Date(existing.startedAt) : startOfDay(new Date()));
  const [trackSupply, setTrackSupply] = useState(existing?.dosesRemaining !== undefined);
  const [dosesRemaining, setDosesRemaining] = useState(existing?.dosesRemaining ?? 4);
  const [monthlyCost, setMonthlyCost] = useState<number | null>(existing?.monthlyCost ?? null);
  const [activeMed, setActiveMed] = useState(existing?.active ?? true);
  const [maxStartDate] = useState(() => addDays(new Date(), 60));

  const choosePreset = (pid: string) => {
    const p = getPreset(pid);
    setPresetId(pid);
    setName(p.id === 'other' ? '' : p.name);
    setDoseMg(p.doses[0] ?? null);
    setSchedule(p.defaultSchedule.kind === 'weekly' ? { kind: 'weekly', weekday: new Date().getDay() } : p.defaultSchedule);
    setReminderTime(p.form === 'pill' ? '07:00' : '09:00');
  };

  const save = () => {
    if (doseMg === null || !name.trim()) return;
    const base: Omit<Medication, 'id' | 'createdAt'> = {
      presetId,
      name: name.trim(),
      compound: preset.compound,
      form: preset.form,
      currentDoseMg: doseMg,
      schedule,
      reminderTime,
      remindersEnabled,
      startedAt: startedAt.toISOString(),
      active: activeMed,
      dosesRemaining: trackSupply ? dosesRemaining : undefined,
      monthlyCost: trackSupply && monthlyCost ? monthlyCost : undefined,
    };
    if (existing) updateMedication(existing.id, base);
    else addMedication({ ...base, id: uid(), createdAt: new Date().toISOString() });
    haptics.success();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const run = () => {
      removeMedication(existing.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${existing.name} and all of its logged doses?`)) run();
      return;
    }
    Alert.alert(`Delete ${existing.name}?`, 'This also deletes every dose logged for it. To keep the history, mark it as stopped instead.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const weekday = schedule.kind === 'weekly' ? schedule.weekday : new Date().getDay();
  const splitDays = schedule.kind === 'weekdays' ? schedule.days : [1, 4];
  const everyDays = schedule.kind === 'interval' ? schedule.everyDays : 10;
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <ModalScreen
      title={isNew ? 'Add medication' : 'Edit medication'}
      footer={
        <View style={styles.gapXs}>
          <Button title={isNew ? 'Add medication' : 'Save'} icon="check" onPress={save} disabled={doseMg === null || !name.trim()} />
          {existing && <Button title="Delete medication" variant="danger" size="md" onPress={remove} />}
        </View>
      }>
      {isNew && (
        <View style={styles.gapSm}>
          <Text variant="overline" color="textSecondary">
            Medication
          </Text>
          <View style={styles.chips}>
            {MEDICATION_PRESETS.map((p) => (
              <Chip key={p.id} label={p.name} icon={p.form === 'pill' ? 'pill' : 'syringe'} selected={p.id === presetId} onPress={() => choosePreset(p.id)} />
            ))}
          </View>
        </View>
      )}

      {(presetId === 'other' || preset.compounded || !isNew) && (
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
        />
      )}

      <View style={styles.gapSm}>
        <Text variant="overline" color="textSecondary">
          Current dose
        </Text>
        {preset.doses.length > 0 && (
          <View style={styles.chips}>
            {preset.doses.map((mg) => (
              <Chip key={mg} label={formatDose(mg)} selected={doseMg === mg} onPress={() => setDoseMg(mg)} />
            ))}
          </View>
        )}
        {(preset.doses.length === 0 || (doseMg !== null && !preset.doses.includes(doseMg))) && (
          <Card>
            <NumberInput value={doseMg} onChange={setDoseMg} unit="mg" step={0.25} decimals={2} max={100} size="display" />
          </Card>
        )}
      </View>

      <View style={styles.gapSm}>
        <Text variant="overline" color="textSecondary">
          Schedule
        </Text>
        <OptionCard title="Once a week" icon="calendar" selected={schedule.kind === 'weekly'} onPress={() => setSchedule({ kind: 'weekly', weekday })} />
        {schedule.kind === 'weekly' && (
          <View style={styles.chips}>
            {weekOrder.map((d) => (
              <Chip key={d} label={WEEKDAY_SHORT[d]} selected={weekday === d} onPress={() => setSchedule({ kind: 'weekly', weekday: d })} />
            ))}
          </View>
        )}
        <OptionCard title="Every day" icon="clock" selected={schedule.kind === 'daily'} onPress={() => setSchedule({ kind: 'daily' })} />
        <OptionCard title={`Every ${everyDays} days`} icon="refresh" selected={schedule.kind === 'interval'} onPress={() => setSchedule({ kind: 'interval', everyDays })} />
        {schedule.kind === 'interval' && (
          <View style={styles.rowEnd}>
            <Stepper
              onDecrement={() => setSchedule({ kind: 'interval', everyDays: Math.max(2, everyDays - 1) })}
              onIncrement={() => setSchedule({ kind: 'interval', everyDays: Math.min(30, everyDays + 1) })}
              disabledDecrement={everyDays <= 2}
            />
          </View>
        )}
        <OptionCard title="Split doses on set days" icon="list" selected={schedule.kind === 'weekdays'} onPress={() => setSchedule({ kind: 'weekdays', days: splitDays })} />
        {schedule.kind === 'weekdays' && (
          <View style={styles.chips}>
            {weekOrder.map((d) => (
              <Chip
                key={d}
                label={WEEKDAY_SHORT[d]}
                selected={splitDays.includes(d)}
                onPress={() => setSchedule({ kind: 'weekdays', days: splitDays.includes(d) ? splitDays.filter((x) => x !== d) : [...splitDays, d] })}
              />
            ))}
          </View>
        )}
      </View>

      <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.listRow}>
          <Text variant="callout" weight="500" style={styles.flex}>
            Dose reminders
          </Text>
          <Toggle value={remindersEnabled} onValueChange={setRemindersEnabled} />
        </View>
      </View>
      {remindersEnabled && (
        <DateTimeField
          label="Reminder time"
          mode="time"
          value={atTimeOfDay(new Date(), reminderTime)}
          onChange={(d) => setReminderTime(formatTimeOfDay(d.getHours(), d.getMinutes()))}
        />
      )}
      <DateTimeField label="Started" mode="date" value={startedAt} onChange={(d) => setStartedAt(startOfDay(d))} maximumDate={maxStartDate} />

      <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.listRow}>
          <View style={styles.flex}>
            <Text variant="callout" weight="500">
              Track supply & cost
            </Text>
            <Text variant="footnote" color="textSecondary">
              Counts down with each logged dose
            </Text>
          </View>
          <Toggle value={trackSupply} onValueChange={setTrackSupply} />
        </View>
        {trackSupply && (
          <>
            <View style={[styles.listRow, styles.topBorder, { borderTopColor: theme.border }]}>
              <Text variant="callout" weight="500" style={styles.flex}>
                Doses on hand: {dosesRemaining}
              </Text>
              <Stepper onDecrement={() => setDosesRemaining(Math.max(0, dosesRemaining - 1))} onIncrement={() => setDosesRemaining(dosesRemaining + 1)} disabledDecrement={dosesRemaining <= 0} />
            </View>
            <View style={[styles.listRow, styles.topBorder, { borderTopColor: theme.border }]}>
              <Text variant="callout" weight="500" style={styles.flex}>
                Monthly cost
              </Text>
              <TextInput
                value={monthlyCost === null ? '' : String(monthlyCost)}
                onChangeText={(t) => {
                  const n = Number(t.replace(/[^0-9.]/g, ''));
                  setMonthlyCost(t.trim() === '' || !Number.isFinite(n) ? null : n);
                }}
                keyboardType="decimal-pad"
                placeholder="$0"
                placeholderTextColor={theme.textTertiary}
                style={[styles.costInput, { color: theme.text, backgroundColor: theme.surfaceAlt }]}
              />
            </View>
          </>
        )}
      </View>

      {!isNew && (
        <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.listRow}>
            <View style={styles.flex}>
              <Text variant="callout" weight="500">
                Currently taking
              </Text>
              <Text variant="footnote" color="textSecondary">
                Turn off if you’ve stopped — your history is kept
              </Text>
            </View>
            <Toggle value={activeMed} onValueChange={setActiveMed} />
          </View>
        </View>
      )}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gapXs: { gap: Spacing.xs },
  gapSm: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end' },
  input: { height: 52, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.lg, fontSize: 16 },
  list: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, minHeight: 56, paddingVertical: Spacing.sm },
  topBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  costInput: { minWidth: 90, height: 38, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, fontSize: 16, textAlign: 'right' },
});
