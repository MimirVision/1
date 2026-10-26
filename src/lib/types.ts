import type { DateKey, TimeOfDay } from './dates';
import type { HeightUnit, VolumeUnit, WeightUnit } from './units';

export type CompoundId =
  | 'tirzepatide'
  | 'semaglutide'
  | 'oral_semaglutide'
  | 'orforglipron'
  | 'liraglutide'
  | 'dulaglutide'
  | 'other';

export type MedicationForm = 'injection' | 'pill';

export type Schedule =
  /** Every day at the reminder time. */
  | { kind: 'daily' }
  /** Once a week on a fixed weekday (0 = Sunday). */
  | { kind: 'weekly'; weekday: number }
  /** Every N days counted from the last logged dose. */
  | { kind: 'interval'; everyDays: number }
  /** Specific weekdays, e.g. split dosing on Mon + Thu. */
  | { kind: 'weekdays'; days: number[] };

export interface Medication {
  id: string;
  presetId: string;
  /** Display name, e.g. "Zepbound" or "Compounded tirzepatide". */
  name: string;
  compound: CompoundId;
  form: MedicationForm;
  currentDoseMg: number;
  schedule: Schedule;
  reminderTime: TimeOfDay;
  remindersEnabled: boolean;
  /** ISO timestamp the user started this medication. */
  startedAt: string;
  active: boolean;
  /** Doses left on hand; undefined when supply tracking is off. */
  dosesRemaining?: number;
  /** Monthly out-of-pocket cost, in the user's currency. */
  monthlyCost?: number;
  createdAt: string;
}

export type InjectionSiteId =
  | 'abdomen_upper_left'
  | 'abdomen_upper_right'
  | 'abdomen_lower_left'
  | 'abdomen_lower_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'arm_left'
  | 'arm_right';

export interface DoseLog {
  id: string;
  medicationId: string;
  /** ISO timestamp the dose was taken. */
  takenAt: string;
  doseMg: number;
  site?: InjectionSiteId;
  note?: string;
}

export interface WeightLog {
  id: string;
  /** ISO timestamp of the weigh-in. */
  at: string;
  kg: number;
}

export interface DayLog {
  date: DateKey;
  proteinG: number;
  waterMl: number;
  fiberG: number;
  strength: boolean;
}

export type SymptomId =
  | 'nausea'
  | 'vomiting'
  | 'constipation'
  | 'diarrhea'
  | 'heartburn'
  | 'bloating'
  | 'sulfur_burps'
  | 'fatigue'
  | 'headache'
  | 'dizziness'
  | 'injection_site'
  | 'hair_shedding';

/** 1 = mild, 2 = moderate, 3 = severe. */
export type Severity = 1 | 2 | 3;

export interface SymptomLog {
  id: string;
  at: string;
  symptoms: Partial<Record<SymptomId, Severity>>;
  /** 0 (quiet) – 3 (loud). */
  foodNoise?: number;
  /** 1 (drained) – 5 (great). */
  energy?: number;
  note?: string;
}

export type Sex = 'female' | 'male' | 'unspecified';
export type StrengthHabit = 'never' | 'sometimes' | 'regular';
export type Goal = 'lose' | 'maintain' | 'health';
export type Concern =
  | 'muscle'
  | 'side_effects'
  | 'plateau'
  | 'remembering'
  | 'regain'
  | 'cost'
  | 'food_noise';

export interface Profile {
  name?: string;
  sex: Sex;
  birthYear?: number;
  heightCm: number;
  startWeightKg: number;
  goalWeightKg: number;
  goal: Goal;
  concerns: Concern[];
  strengthHabit: StrengthHabit;
  weightUnit: WeightUnit;
  volumeUnit: VolumeUnit;
  heightUnit: HeightUnit;
  /** ISO date the GLP-1 journey started (used for "week N"). */
  journeyStartedAt: string;
}

export interface Targets {
  proteinG: number;
  waterMl: number;
  fiberG: number;
  strengthPerWeek: number;
}
