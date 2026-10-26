import type { Concern, MedicationForm } from './types';

export interface Tip {
  id: string;
  title: string;
  body: string;
}

export interface TipContext {
  form: MedicationForm | null;
  /** Calendar days since the last dose of the primary weekly medication. */
  daysSinceDose: number | null;
  /** True if the dose went up within the last 14 days. */
  recentIncrease: boolean;
  proteinRemainingG: number;
  hour: number;
  strengthThisWeek: number;
  strengthTarget: number;
  concerns: Concern[];
  /** Used to rotate evergreen tips day to day. */
  dayIndex: number;
}

const EVERGREEN: Tip[] = [
  { id: 'protein-first', title: 'Protein first', body: 'With a smaller appetite, eat the protein on your plate before anything else so it never gets skipped.' },
  { id: 'sip', title: 'Sip all day', body: 'Thirst cues get quieter on GLP-1s. Keep a bottle in sight and sip between meals rather than chugging with them.' },
  { id: 'fiber', title: 'Fiber, slowly', body: 'Add fiber gradually — berries, chia, beans, oats — and pair it with plenty of fluid to keep things moving.' },
  { id: 'scale', title: 'Weigh in the same way', body: 'Same time, same scale, after the bathroom and before breakfast. Daily swings of 1–2 lb are normal water noise.' },
  { id: 'lift', title: 'Lift to keep what you have', body: 'Two or three short resistance sessions a week is the best-studied way to hold on to muscle while you lose fat.' },
  { id: 'plateau', title: 'Plateaus are part of it', body: 'Most people see stalls of 1–3 weeks. Look at the 4-week trend rather than any single weigh-in.' },
];

export function tipFor(ctx: TipContext): Tip {
  if (ctx.recentIncrease) {
    return {
      id: 'increase',
      title: 'New dose, new adjustment',
      body: 'Side effects often flare for a week or two after a step up. Smaller meals and steady fluids help while your body adjusts.',
    };
  }
  if (ctx.hour >= 15 && ctx.proteinRemainingG >= 40) {
    return {
      id: 'protein-gap',
      title: `${Math.round(ctx.proteinRemainingG)} g of protein to go`,
      body: 'A Greek yogurt, a protein shake or a couple of eggs closes most of that gap without needing a big meal.',
    };
  }
  if (ctx.form === 'injection' && ctx.daysSinceDose !== null) {
    if (ctx.daysSinceDose <= 2) {
      return {
        id: 'peak-days',
        title: 'Peak days',
        body: 'Levels are near their highest 1–3 days after a shot, which is when nausea is most common. Go for small, bland, protein-rich meals.',
      };
    }
    if (ctx.daysSinceDose >= 5) {
      return {
        id: 'tail-days',
        title: 'End of the week',
        body: 'Some people notice appetite or food noise creeping back before their next shot. Plan protein-forward snacks for today and tomorrow.',
      };
    }
  }
  if (ctx.concerns.includes('muscle') && ctx.strengthThisWeek < ctx.strengthTarget && ctx.hour < 18) {
    return EVERGREEN.find((t) => t.id === 'lift') as Tip;
  }
  return EVERGREEN[Math.abs(ctx.dayIndex) % EVERGREEN.length];
}
