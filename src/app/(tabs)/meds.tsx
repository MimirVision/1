import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BodyMap } from '@/components/med/body-map';
import { formatLevel, LevelChart, levelHeadline, useLevelData } from '@/components/med/level-chart';
import { openPaywall, PremiumGate, usePremium } from '@/components/premium-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Badge, EmptyState, IconButton, Screen, SectionHeader } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Brand } from '@/constants/brand';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatClock, formatMediumDate, formatRelativeDay } from '@/lib/dates';
import { getCompound, getPreset, scheduleIntervalDays } from '@/lib/medications';
import { describeSchedule, doseStatus, dosesForMedication } from '@/lib/schedule';
import { lastUsedBySite, siteInfo, suggestNextSite } from '@/lib/sites';
import type { DoseLog, Medication } from '@/lib/types';
import { formatDose } from '@/lib/units';
import { useStore } from '@/store';
import { useActiveMedications, useNow } from '@/store/selectors';

const RANGES = [
  { value: 14, label: '2W' },
  { value: 30, label: '1M' },
  { value: 90, label: '3M' },
];

export default function Meds() {
  const now = useNow(60_000);
  const premium = usePremium();
  const doses = useStore((s) => s.doses);
  const allMeds = useStore((s) => s.medications);
  const active = useActiveMedications();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [range, setRange] = useState(14);
  const medication = active.find((m) => m.id === selectedId) ?? active[0];
  const level = useLevelData(medication, doses, now, range);

  const addMedication = () => {
    if (!premium && active.length >= 1) openPaywall('meds');
    else router.push('/medication/new');
  };

  if (allMeds.length === 0) {
    return (
      <Screen title="Medications">
        <Card>
          <EmptyState
            icon="syringe"
            title="No medication yet"
            body="Add your GLP-1 to get reminders, site rotation and your estimated medication level."
            action={<Button title="Add medication" icon="plus" size="md" fullWidth={false} onPress={() => router.push('/medication/new')} />}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Medications" right={<IconButton icon="plus" label="Add medication" onPress={addMedication} tone="primary" />}>
      {active.map((m) => (
        <MedicationCard key={m.id} medication={m} doses={doses} now={now} selected={m.id === medication?.id && active.length > 1} onSelect={() => setSelectedId(m.id)} />
      ))}

      {medication && level?.supported && (
        <Card style={styles.gap}>
          <View style={styles.rowTop}>
            <View style={styles.flex}>
              <Text variant="overline" color="textSecondary">
                Estimated level · {getCompound(medication.compound).name.toLowerCase()}
              </Text>
              <Text variant="headline">{levelHeadline(level, medication)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="How this is estimated" onPress={() => router.push('/level-info')} hitSlop={8}>
              <Icon name="info" color="textSecondary" />
            </Pressable>
          </View>
          <PremiumGate source="level" title="Your medication level, rising and tapering" minHeight={220}>
            <View style={styles.gap}>
              <View style={styles.levelStats}>
                <Stat label="Now" value={formatLevel(level.current, level.unit)} />
                <Stat label="Of steady-state peak" value={level.ofPeak === null ? '—' : `${Math.round(level.ofPeak * 100)}%`} />
                <Stat label="Trend" value={level.trend === 'rising' ? 'Rising' : level.trend === 'falling' ? 'Tapering' : 'Steady'} />
              </View>
              <LevelChart data={level} now={now} height={200} />
              <Segmented options={RANGES} value={range} onChange={setRange} />
            </View>
          </PremiumGate>
        </Card>
      )}

      {medication?.form === 'injection' && <SiteCard medication={medication} doses={doses} />}

      {medication && <SupplyCard medication={medication} now={now} />}

      <SectionHeader title="History" action="Log dose" onAction={() => router.push({ pathname: '/log-dose', params: { medicationId: medication?.id } })} />
      <HistoryList doses={doses} medications={allMeds} premium={premium} now={now} />

      {allMeds.some((m) => !m.active) && (
        <Text variant="footnote" color="textTertiary" align="center">
          Stopped medications are kept in your history and reports.
        </Text>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.levelSoft }]}>
      <Text variant="headline" rounded tabular tint={theme.level}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

function MedicationCard({
  medication,
  doses,
  now,
  selected,
  onSelect,
}: {
  medication: Medication;
  doses: DoseLog[];
  now: Date;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const status = doseStatus(medication, doses, now);
  const preset = getPreset(medication.presetId);
  const stateBadge =
    status.state === 'overdue' ? (
      <Badge label="Overdue" tone="warning" />
    ) : status.state === 'due' ? (
      <Badge label="Due today" tone="primary" />
    ) : status.state === 'taken' ? (
      <Badge label="Taken today" tone="success" />
    ) : null;
  return (
    <Card onPress={onSelect} style={[styles.gap, selected && { borderColor: theme.primary, borderWidth: 2 }]}>
      <View style={styles.rowTop}>
        <View style={[styles.medIcon, { backgroundColor: theme.primarySoft }]}>
          <Icon name={medication.form === 'pill' ? 'pill' : 'syringe'} size={22} color="primary" />
        </View>
        <View style={styles.flex}>
          <Text variant="title2">{medication.name}</Text>
          <Text variant="footnote" color="textSecondary">
            {formatDose(medication.currentDoseMg)} · {describeSchedule(medication.schedule)} · {preset.subtitle.split(' · ')[0]}
          </Text>
        </View>
        <IconButton icon="pencil" label={`Edit ${medication.name}`} onPress={() => router.push({ pathname: '/medication/[id]', params: { id: medication.id } })} tone="plain" />
      </View>
      <View style={[styles.nextRow, { backgroundColor: theme.surfaceAlt }]}>
        <Icon name="calendar" size={15} color="textSecondary" />
        <Text variant="subhead" style={styles.flex}>
          {status.state === 'taken' ? 'Next ' : status.state === 'overdue' ? 'Was due ' : 'Next '}
          <Text variant="subhead" weight="700">
            {formatRelativeDay(status.nextDueAt, now)}, {formatClock(status.nextDueAt)}
          </Text>
        </Text>
        {stateBadge}
      </View>
      {(status.state === 'due' || status.state === 'overdue') && (
        <Button title={medication.form === 'pill' ? 'Log pill' : 'Log shot'} icon="check" size="md" onPress={() => router.push({ pathname: '/log-dose', params: { medicationId: medication.id } })} />
      )}
    </Card>
  );
}

function SiteCard({ medication, doses }: { medication: Medication; doses: DoseLog[] }) {
  const own = useMemo(() => dosesForMedication(doses, medication.id), [doses, medication.id]);
  const suggested = suggestNextSite(own);
  const lastUsed = lastUsedBySite(own);
  return (
    <Card style={styles.gap}>
      <Text variant="overline" color="textSecondary">
        Site rotation
      </Text>
      <Text variant="headline">Next shot: {siteInfo(suggested).label}</Text>
      <BodyMap suggested={suggested} lastUsed={lastUsed} now={new Date()} />
    </Card>
  );
}

function SupplyCard({ medication, now }: { medication: Medication; now: Date }) {
  const theme = useTheme();
  const premium = usePremium();
  const tracking = medication.dosesRemaining !== undefined;
  const intervalDays = scheduleIntervalDays(medication.schedule);
  const daysLeft = tracking ? Math.floor(medication.dosesRemaining! * intervalDays) : null;
  const runOut = daysLeft !== null ? addDays(now, daysLeft) : null;
  const edit = () =>
    premium ? router.push({ pathname: '/medication/[id]', params: { id: medication.id, focus: 'supply' } }) : openPaywall('supply');
  return (
    <Card style={styles.rowTop} onPress={edit}>
      <View style={[styles.medIcon, { backgroundColor: theme.strengthSoft }]}>
        <Icon name="box" size={20} tint={theme.strength} />
      </View>
      <View style={styles.flex}>
        <Text variant="overline" color="textSecondary">
          Supply & cost
        </Text>
        {tracking ? (
          <>
            <Text variant="headline">
              {medication.dosesRemaining} dose{medication.dosesRemaining === 1 ? '' : 's'} left
            </Text>
            <Text variant="footnote" color={daysLeft! <= 7 ? 'warning' : 'textSecondary'}>
              {daysLeft! <= 0 ? 'Time to refill' : `Lasts until about ${formatMediumDate(runOut!)}`}
              {medication.monthlyCost ? ` · ${medication.monthlyCost.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/mo` : ''}
            </Text>
          </>
        ) : (
          <>
            <Text variant="headline">Track pens, vials & refills</Text>
            <Text variant="footnote" color="textSecondary">
              Get a heads-up before you run out{premium ? '' : ` · ${Brand.premiumName}`}
            </Text>
          </>
        )}
      </View>
      <Icon name={premium ? 'chevronRight' : 'lock'} size={14} color="textTertiary" />
    </Card>
  );
}

function HistoryList({ doses, medications, premium, now }: { doses: DoseLog[]; medications: Medication[]; premium: boolean; now: Date }) {
  const theme = useTheme();
  const sorted = useMemo(() => [...doses].sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt)), [doses]);
  const visible = premium ? sorted.slice(0, 60) : sorted.filter((d) => Date.parse(d.takenAt) >= now.getTime() - 30 * 86_400_000);
  const hidden = sorted.length - visible.length;
  const names = new Map(medications.map((m) => [m.id, m]));
  if (sorted.length === 0) {
    return (
      <Card>
        <EmptyState icon="list" title="No doses logged yet" body="Logged doses show up here with the date, dose and site." />
      </Card>
    );
  }
  return (
    <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {visible.map((d, i) => {
        const med = names.get(d.medicationId);
        return (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/log-dose', params: { id: d.id } })}
            style={({ pressed }) => [
              styles.historyRow,
              i < visible.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
              pressed && { backgroundColor: theme.surfaceAlt },
            ]}>
            <View style={[styles.historyDot, { backgroundColor: theme.primarySoft }]}>
              <Icon name={med?.form === 'pill' ? 'pill' : 'syringe'} size={14} color="primary" />
            </View>
            <View style={styles.flex}>
              <Text variant="callout" weight="600">
                {formatDose(d.doseMg)} {med ? `· ${med.name}` : ''}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {formatMediumDate(new Date(d.takenAt))}, {formatClock(new Date(d.takenAt))}
                {d.site ? ` · ${siteInfo(d.site).short}` : ''}
              </Text>
            </View>
            {d.note ? <Icon name="doc" size={14} color="textTertiary" /> : null}
            <Icon name="chevronRight" size={12} color="textTertiary" />
          </Pressable>
        );
      })}
      {hidden > 0 && !premium && (
        <Pressable accessibilityRole="button" onPress={() => openPaywall('history')} style={[styles.historyRow, { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <Icon name="lock" size={14} color="primary" />
          <Text variant="callout" weight="600" color="primary" style={styles.flex}>
            {hidden} older dose{hidden === 1 ? '' : 's'} · unlock full history
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  medIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  levelStats: { flexDirection: 'row', gap: Spacing.sm },
  stat: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, gap: 2 },
  list: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  historyDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
