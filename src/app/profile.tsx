import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { HeightInput } from '@/components/onboarding/parts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/controls';
import { DateTimeField } from '@/components/ui/date-time-field';
import { ModalScreen } from '@/components/ui/layout';
import { NumberInput } from '@/components/ui/number-input';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { startOfDay } from '@/lib/dates';
import type { Sex } from '@/lib/types';
import { displayToKg, kgToDisplay, weightUnitLabel, type VolumeUnit, type WeightUnit } from '@/lib/units';
import { haptics } from '@/services/haptics';
import { useStore } from '@/store';

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const [draft, setDraft] = useState(profile);
  if (!profile || !draft) return null;

  const unit = draft.weightUnit;
  const show = (kg: number) => Math.round(kgToDisplay(kg, unit) * 10) / 10;
  const set = (patch: Partial<typeof draft>) => setDraft({ ...draft, ...patch });

  const save = () => {
    updateProfile(draft);
    haptics.success();
    router.back();
  };

  return (
    <ModalScreen title="Profile" footer={<Button title="Save" icon="check" onPress={save} />}>
      <TextInput
        value={draft.name ?? ''}
        onChangeText={(name) => set({ name })}
        placeholder="Name"
        placeholderTextColor={theme.textTertiary}
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
      />

      <Section title="Units">
        <Segmented<WeightUnit>
          options={[
            { value: 'lb', label: 'lb' },
            { value: 'kg', label: 'kg' },
            { value: 'st', label: 'st & lb' },
          ]}
          value={draft.weightUnit}
          onChange={(weightUnit) => set({ weightUnit })}
        />
        <Segmented<VolumeUnit>
          options={[
            { value: 'oz', label: 'fl oz' },
            { value: 'ml', label: 'ml / L' },
          ]}
          value={draft.volumeUnit}
          onChange={(volumeUnit) => set({ volumeUnit })}
        />
      </Section>

      <Section title="Goal weight">
        <Card>
          <NumberInput value={show(draft.goalWeightKg)} onChange={(v) => v && set({ goalWeightKg: displayToKg(v, unit) })} unit={weightUnitLabel(unit)} step={unit === 'kg' ? 0.5 : 1} size="display" />
        </Card>
      </Section>

      <Section title="Starting weight">
        <Card>
          <NumberInput value={show(draft.startWeightKg)} onChange={(v) => v && set({ startWeightKg: displayToKg(v, unit) })} unit={weightUnitLabel(unit)} step={unit === 'kg' ? 0.1 : 0.2} size="display" />
        </Card>
        <DateTimeField label="Journey started" mode="date" value={new Date(draft.journeyStartedAt)} maximumDate={new Date()} onChange={(d) => set({ journeyStartedAt: startOfDay(d).toISOString() })} />
      </Section>

      <Section title="Height">
        <Card>
          <HeightInput cm={draft.heightCm} unit={draft.heightUnit} onChange={(heightCm) => set({ heightCm })} onUnitChange={(heightUnit) => set({ heightUnit })} />
        </Card>
      </Section>

      <Section title="Sex">
        <Segmented<Sex>
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
            { value: 'unspecified', label: 'Not set' },
          ]}
          value={draft.sex}
          onChange={(sex) => set({ sex })}
        />
      </Section>
    </ModalScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" color="textSecondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  input: { height: 52, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.lg, fontSize: 16 },
});
