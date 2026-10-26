export type WeightUnit = 'lb' | 'kg' | 'st';
export type VolumeUnit = 'oz' | 'ml';
export type HeightUnit = 'ftin' | 'cm';

export const KG_PER_LB = 0.45359237;
export const ML_PER_OZ = 29.5735;
const LB_PER_STONE = 14;
const CM_PER_INCH = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Converts kg into the display unit's primary number (stone is expressed in total pounds). */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === 'kg' ? 'kg' : 'lb';
}

/** "182.4 lb", "82.7 kg", "13 st 0.4 lb" */
export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  if (unit === 'kg') return `${round(kg, decimals).toFixed(decimals)} kg`;
  const lb = kgToLb(kg);
  if (unit === 'lb') return `${round(lb, decimals).toFixed(decimals)} lb`;
  const negative = lb < 0;
  const abs = Math.abs(lb);
  let stones = Math.floor(abs / LB_PER_STONE);
  let rest = round(abs - stones * LB_PER_STONE, decimals);
  if (rest >= LB_PER_STONE) {
    stones += 1;
    rest = 0;
  }
  return `${negative ? '-' : ''}${stones} st ${rest.toFixed(decimals)} lb`;
}

/** Weight delta with an explicit sign, e.g. "−12.4 lb". Uses a true minus sign. */
export function formatWeightDelta(kg: number, unit: WeightUnit, decimals = 1): string {
  const sign = kg < 0 ? '−' : kg > 0 ? '+' : '';
  return `${sign}${formatWeight(Math.abs(kg), unit === 'st' ? 'lb' : unit, decimals)}`;
}

export function mlToOz(ml: number): number {
  return ml / ML_PER_OZ;
}

export function ozToMl(oz: number): number {
  return oz * ML_PER_OZ;
}

export function formatVolume(ml: number, unit: VolumeUnit): string {
  if (unit === 'ml') {
    return ml >= 1000 ? `${round(ml / 1000, 1)} L` : `${Math.round(ml)} ml`;
  }
  return `${Math.round(mlToOz(ml))} oz`;
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

export function formatHeight(cm: number, unit: HeightUnit): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFtIn(cm);
  return `${feet}′ ${inches}″`;
}

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Healthy range';
  if (value < 30) return 'Overweight';
  if (value < 35) return 'Obesity class I';
  if (value < 40) return 'Obesity class II';
  return 'Obesity class III';
}

/** Medication dose formatting: 2.5 → "2.5 mg", 0.25 → "0.25 mg". */
export function formatDose(mg: number): string {
  const text = Number.isInteger(mg) ? String(mg) : String(Number(mg.toFixed(3)));
  return `${text} mg`;
}
