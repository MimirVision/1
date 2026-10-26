import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ModalScreen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSameDay } from '@/lib/dates';
import { SEVERITY_LABEL, SYMPTOMS, symptomInfo } from '@/lib/symptoms';
import type { Severity, SymptomId } from '@/lib/types';
import { haptics } from '@/services/haptics';
import { useStore } from '@/store';

const FOOD_NOISE = ['Silent', 'Quiet', 'Noticeable', 'Loud'];
const ENERGY = ['Drained', 'Low', 'Okay', 'Good', 'Great'];

export default function LogSymptoms() {
  const theme = useTheme();
  const logs = useStore((s) => s.symptoms);
  const logSymptoms = useStore((s) => s.logSymptoms);
  const deleteSymptoms = useStore((s) => s.deleteSymptoms);
  const todays = useMemo(() => logs.filter((l) => isSameDay(new Date(l.at), new Date())).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0], [logs]);
  const [selected, setSelected] = useState<Partial<Record<SymptomId, Severity>>>(todays?.symptoms ?? {});
  const [foodNoise, setFoodNoise] = useState<number | undefined>(todays?.foodNoise);
  const [energy, setEnergy] = useState<number | undefined>(todays?.energy);
  const [note, setNote] = useState(todays?.note ?? '');

  const cycle = (id: SymptomId) => {
    haptics.tap();
    setSelected((prev) => {
      const current = prev[id];
      const next = { ...prev };
      if (!current) next[id] = 1;
      else if (current < 3) next[id] = (current + 1) as Severity;
      else delete next[id];
      return next;
    });
  };

  const active = (Object.entries(selected) as [SymptomId, Severity][]).filter(([, s]) => s);
  const worst = [...active].sort((a, b) => b[1] - a[1])[0];

  const save = () => {
    if (todays) deleteSymptoms(todays.id);
    logSymptoms({ at: new Date().toISOString(), symptoms: selected, foodNoise, energy, note: note.trim() || undefined });
    haptics.success();
    router.back();
  };

  const severityColor = (s?: Severity) => (s === 3 ? theme.danger : s === 2 ? theme.warning : s === 1 ? theme.primary : theme.border);

  return (
    <ModalScreen title="Daily check-in" footer={<Button title="Save check-in" icon="check" onPress={save} testID="save-checkin" />}>
      <View style={styles.section}>
        <Text variant="headline">Any side effects today?</Text>
        <Text variant="footnote" color="textSecondary">
          Tap once for mild, again for moderate, a third time for severe.
        </Text>
        <View style={styles.grid}>
          {SYMPTOMS.map((s) => {
            const sev = selected[s.id];
            return (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={`${s.label}${sev ? `, ${SEVERITY_LABEL[sev]}` : ''}`}
                onPress={() => cycle(s.id)}
                style={[styles.symptom, { borderColor: severityColor(sev), backgroundColor: sev ? severityColor(sev) + '18' : theme.surface }]}>
                <Text variant="subhead" weight="600">
                  {s.label}
                </Text>
                <View style={styles.dots}>
                  {[1, 2, 3].map((n) => (
                    <View key={n} style={[styles.dot, { backgroundColor: sev && n <= sev ? severityColor(sev) : theme.surfaceSunken }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
        {active.length === 0 && (
          <Text variant="footnote" color="success" weight="600">
            No side effects — nothing to select.
          </Text>
        )}
      </View>

      {worst && (
        <Card tone="primarySoft" style={styles.inline}>
          <Icon name="sparkles" color="primary" />
          <View style={styles.flex}>
            <Text variant="subhead" weight="700">
              {symptomInfo(worst[0]).label}
            </Text>
            <Text variant="footnote">{symptomInfo(worst[0]).tip}</Text>
          </View>
        </Card>
      )}
      {active.some(([, s]) => s === 3) && (
        <Text variant="footnote" color="danger">
          Severe or persistent symptoms — especially severe stomach pain or vomiting — are worth a call to your clinician.
        </Text>
      )}

      <Scale title="Food noise" labels={FOOD_NOISE} value={foodNoise} onChange={setFoodNoise} />
      <Scale title="Energy" labels={ENERGY} value={energy === undefined ? undefined : energy - 1} onChange={(v) => setEnergy(v + 1)} />

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Anything else? (optional)"
        placeholderTextColor={theme.textTertiary}
        multiline
        style={[styles.note, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
      />
    </ModalScreen>
  );
}

function Scale({ title, labels, value, onChange }: { title: string; labels: string[]; value?: number; onChange: (v: number) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="headline">{title}</Text>
      <View style={styles.scale}>
        {labels.map((label, i) => {
          const active = value === i;
          return (
            <Pressable
              key={label}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => {
                haptics.tap();
                onChange(i);
              }}
              style={[styles.scaleItem, { backgroundColor: active ? theme.primary : theme.surface, borderColor: active ? theme.primary : theme.border }]}>
              <Text variant="caption" weight="700" tint={active ? theme.onPrimary : theme.textSecondary} align="center">
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  symptom: { flexBasis: '31%', flexGrow: 1, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  scale: { flexDirection: 'row', gap: Spacing.xs },
  scaleItem: { flex: 1, height: 40, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  note: { minHeight: 64, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, fontSize: 15, textAlignVertical: 'top' },
});
