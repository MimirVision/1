import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ModalScreen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { COMPOUNDS } from '@/lib/medications';

export default function LevelInfo() {
  const compounds = Object.values(COMPOUNDS).filter((c) => c.halfLifeHours);
  return (
    <ModalScreen title="How estimates work">
      <Section title="Medication level">
        The level chart is an educational estimate, not a measurement. It uses a standard one-compartment pharmacokinetic
        model: each dose you log is absorbed and then cleared at rates derived from the medicine’s published half-life and
        time-to-peak, and the curves from every dose are added together. Bioavailability, body weight, kidney function and
        individual differences are not modelled.
      </Section>
      <Section title="Units">
        Injections are shown as an estimated amount (mg) of medicine active in your body. Oral GLP-1s are absorbed in very
        small, variable amounts, so pills are shown as a percentage of the expected steady-state peak at your current dose.
        Dashed lines assume you keep taking your current dose on schedule.
      </Section>
      <Card style={styles.gap}>
        <Text variant="overline" color="textSecondary">
          Parameters used
        </Text>
        {compounds.map((c) => (
          <View key={c.id} style={styles.gapXs}>
            <Text variant="callout" weight="700">
              {c.name}
            </Text>
            <Text variant="footnote" color="textSecondary">
              Half-life {c.halfLifeHours! >= 48 ? `${(c.halfLifeHours! / 24).toFixed(1)} days` : `${c.halfLifeHours} hours`} · peak ≈ {c.tmaxHours} h.{' '}
              {c.sourceNote}
            </Text>
          </View>
        ))}
      </Card>
      <Section title="Trial-average projection">
        The projection you saw during setup follows the shape of the average weight-loss curve reported in each medicine’s
        pivotal trial (for example SURMOUNT-1 for tirzepatide and STEP 1 for semaglutide), scaled to your starting weight.
        Half of trial participants lost more and half lost less.
      </Section>
      <Section title="Daily targets">
        Protein is set at about 1.2–1.5 g per kg of your goal weight (higher if you strength train), in line with published
        GLP-1 nutrition guidance. Fluids are about 30 ml per kg of body weight, and fiber follows standard adult
        recommendations. You can change any target.
      </Section>
      <Section title="Not medical advice">
        Lifted doesn’t diagnose, treat or recommend doses, and it can’t tell you whether a medicine is working. Always follow
        your prescriber’s instructions and the medication guide that came with your prescription.
      </Section>
    </ModalScreen>
  );
}

function Section({ title, children }: { title: string; children: string | string[] }) {
  return (
    <View style={styles.gapXs}>
      <Text variant="headline">{title}</Text>
      <Text variant="callout" color="textSecondary">
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.md },
  gapXs: { gap: Spacing.xs },
});
