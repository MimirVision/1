import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, atTimeOfDay, formatClock, formatRelativeDay, formatShortDate, formatTimeOfDay, startOfDay } from '@/lib/dates';
import { haptics } from '@/services/haptics';

import { Chip, Stepper } from './controls';
import { Text } from './text';

type Mode = 'datetime' | 'date' | 'time';

function describe(value: Date, mode: Mode, now: Date): string {
  if (mode === 'time') return formatClock(value);
  const day = formatRelativeDay(value, now);
  const label = ['Today', 'Yesterday', 'Tomorrow'].includes(day) ? day : formatShortDate(value);
  return mode === 'date' ? label : `${label}, ${formatClock(value)}`;
}

/**
 * Date/time input: the native compact picker on iOS, the system dialogs on Android, and a
 * simple chip + stepper picker on web.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'datetime',
  maximumDate,
  minimumDate,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: Mode;
  maximumDate?: Date;
  minimumDate?: Date;
}) {
  const theme = useTheme();
  const now = new Date();
  const [webOpen, setWebOpen] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text variant="callout" weight="500" style={styles.flex}>
          {label}
        </Text>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          accentColor={theme.primary}
          onValueChange={(_, date) => onChange(date)}
        />
      </View>
    );
  }

  const openAndroid = () => {
    const pickTime = (base: Date) =>
      DateTimePickerAndroid.open({
        value: base,
        mode: 'time',
        onValueChange: (_, date) => onChange(date),
      });
    if (mode === 'time') return pickTime(value);
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      maximumDate,
      minimumDate,
      onValueChange: (_, date) => {
        const merged = new Date(date.getFullYear(), date.getMonth(), date.getDate(), value.getHours(), value.getMinutes());
        if (mode === 'date') onChange(merged);
        else pickTime(merged);
      },
    });
  };

  return (
    <View style={[styles.box, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.tap();
          if (Platform.OS === 'android') openAndroid();
          else setWebOpen((o) => !o);
        }}
        style={styles.rowInner}>
        <Text variant="callout" weight="500" style={styles.flex}>
          {label}
        </Text>
        <View style={[styles.valuePill, { backgroundColor: theme.surfaceAlt }]}>
          <Text variant="callout" weight="600" color="primary">
            {describe(value, mode, now)}
          </Text>
        </View>
      </Pressable>
      {webOpen && Platform.OS === 'web' && (
        <View style={styles.webPicker}>
          {mode !== 'time' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {Array.from({ length: 10 }, (_, i) => addDays(startOfDay(now), -i)).map((day) => {
                const selected = startOfDay(value).getTime() === day.getTime();
                return (
                  <Chip
                    key={day.toISOString()}
                    label={formatRelativeDay(day, now) === 'Today' || formatRelativeDay(day, now) === 'Yesterday' ? formatRelativeDay(day, now) : formatShortDate(day)}
                    selected={selected}
                    onPress={() => onChange(atTimeOfDay(day, formatTimeOfDay(value.getHours(), value.getMinutes())))}
                  />
                );
              })}
            </ScrollView>
          )}
          {mode !== 'date' && (
            <View style={styles.timeRow}>
              <Text variant="title2" rounded tabular style={styles.flex}>
                {formatClock(value)}
              </Text>
              <Stepper
                onDecrement={() => onChange(new Date(value.getTime() - 15 * 60_000))}
                onIncrement={() => {
                  const next = new Date(value.getTime() + 15 * 60_000);
                  onChange(maximumDate && next > maximumDate ? maximumDate : next);
                }}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  box: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rowInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, minHeight: 56 },
  valuePill: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.sm },
  webPicker: { paddingBottom: Spacing.lg, gap: Spacing.md },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  timeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg },
});
