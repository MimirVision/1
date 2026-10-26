import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toDateKey, type DateKey, type TimeOfDay } from '@/lib/dates';
import { uid } from '@/lib/id';
import { emptyDay } from '@/lib/nutrition';
import type {
  DayLog,
  DoseLog,
  InjectionSiteId,
  Medication,
  Profile,
  Severity,
  SymptomId,
  SymptomLog,
  Targets,
  WeightLog,
} from '@/lib/types';

export interface Settings {
  weighInReminder: boolean;
  /** 0 = Sunday. */
  weighInWeekday: number;
  weighInTime: TimeOfDay;
  checkInReminder: boolean;
  checkInTime: TimeOfDay;
  haptics: boolean;
}

export interface PillTimer {
  medicationId: string;
  startedAt: string;
  endsAt: string;
}

export interface Meta {
  installedAt: string;
  onboardingCompletedAt?: string;
  reviewRequestedAt?: string;
  /** When a free trial started in-app ends; used for the "trial ending" reminder. */
  trialEndsAt?: string;
  appOpens: number;
}

interface Data {
  profile: Profile | null;
  medications: Medication[];
  doses: DoseLog[];
  weights: WeightLog[];
  days: Record<DateKey, DayLog>;
  symptoms: SymptomLog[];
  targetOverrides: Partial<Targets>;
  settings: Settings;
  pillTimer: PillTimer | null;
  /** Cached entitlement state; RevenueCat is the source of truth and refreshes it. */
  premium: boolean;
  meta: Meta;
}

export interface NewDose {
  medicationId: string;
  takenAt: string;
  doseMg: number;
  site?: InjectionSiteId;
  note?: string;
}

interface Actions {
  completeOnboarding: (input: {
    profile: Profile;
    medication: Medication | null;
    doses: DoseLog[];
    weights: WeightLog[];
  }) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  addMedication: (medication: Medication) => void;
  updateMedication: (id: string, patch: Partial<Medication>) => void;
  removeMedication: (id: string) => void;
  logDose: (dose: NewDose) => DoseLog;
  updateDose: (id: string, patch: Partial<Omit<DoseLog, 'id'>>) => void;
  deleteDose: (id: string) => void;
  logWeight: (kg: number, at: string) => WeightLog;
  deleteWeight: (id: string) => void;
  addToDay: (date: DateKey, delta: Partial<Pick<DayLog, 'proteinG' | 'waterMl' | 'fiberG'>>) => void;
  setDay: (date: DateKey, patch: Partial<Omit<DayLog, 'date'>>) => void;
  logSymptoms: (entry: {
    at: string;
    symptoms: Partial<Record<SymptomId, Severity>>;
    foodNoise?: number;
    energy?: number;
    note?: string;
  }) => SymptomLog;
  deleteSymptoms: (id: string) => void;
  setTargetOverrides: (overrides: Partial<Targets>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  startPillTimer: (medicationId: string, minutes: number) => PillTimer;
  clearPillTimer: () => void;
  setPremium: (premium: boolean) => void;
  recordAppOpen: () => void;
  markReviewRequested: () => void;
  setTrialEndsAt: (iso: string | undefined) => void;
  replaceData: (data: Partial<Data>) => void;
  resetAll: () => void;
}

export type AppState = Data & Actions & { hydrated: boolean };

export const DEFAULT_SETTINGS: Settings = {
  weighInReminder: true,
  weighInWeekday: 1,
  weighInTime: '07:30',
  checkInReminder: true,
  checkInTime: '19:30',
  haptics: true,
};

function initialData(): Data {
  return {
    profile: null,
    medications: [],
    doses: [],
    weights: [],
    days: {},
    symptoms: [],
    targetOverrides: {},
    settings: DEFAULT_SETTINGS,
    pillTimer: null,
    premium: false,
    meta: { installedAt: new Date().toISOString(), appOpens: 0 },
  };
}

const clampNonNegative = (value: number) => Math.max(0, Math.round(value * 10) / 10);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      hydrated: false,

      completeOnboarding: ({ profile, medication, doses, weights }) =>
        set((state) => ({
          profile,
          medications: medication ? [...state.medications, medication] : state.medications,
          doses: [...state.doses, ...doses],
          weights: [...state.weights, ...weights],
          meta: { ...state.meta, onboardingCompletedAt: new Date().toISOString() },
        })),

      updateProfile: (patch) =>
        set((state) => (state.profile ? { profile: { ...state.profile, ...patch } } : {})),

      addMedication: (medication) => set((state) => ({ medications: [...state.medications, medication] })),

      updateMedication: (id, patch) =>
        set((state) => ({
          medications: state.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),

      removeMedication: (id) =>
        set((state) => ({
          medications: state.medications.filter((m) => m.id !== id),
          doses: state.doses.filter((d) => d.medicationId !== id),
          pillTimer: state.pillTimer?.medicationId === id ? null : state.pillTimer,
        })),

      logDose: (input) => {
        const dose: DoseLog = { id: uid(), ...input };
        set((state) => ({
          doses: [...state.doses, dose],
          medications: state.medications.map((m) => {
            if (m.id !== input.medicationId) return m;
            const isLatest = !state.doses.some(
              (d) => d.medicationId === m.id && Date.parse(d.takenAt) > Date.parse(input.takenAt),
            );
            return {
              ...m,
              currentDoseMg: isLatest ? input.doseMg : m.currentDoseMg,
              dosesRemaining: m.dosesRemaining === undefined ? undefined : Math.max(0, m.dosesRemaining - 1),
            };
          }),
        }));
        return dose;
      },

      updateDose: (id, patch) =>
        set((state) => ({ doses: state.doses.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

      deleteDose: (id) =>
        set((state) => {
          const dose = state.doses.find((d) => d.id === id);
          return {
            doses: state.doses.filter((d) => d.id !== id),
            medications: state.medications.map((m) =>
              dose && m.id === dose.medicationId && m.dosesRemaining !== undefined
                ? { ...m, dosesRemaining: m.dosesRemaining + 1 }
                : m,
            ),
          };
        }),

      logWeight: (kg, at) => {
        const entry: WeightLog = { id: uid(), at, kg };
        set((state) => ({ weights: [...state.weights, entry] }));
        return entry;
      },

      deleteWeight: (id) => set((state) => ({ weights: state.weights.filter((w) => w.id !== id) })),

      addToDay: (date, delta) =>
        set((state) => {
          const day = state.days[date] ?? emptyDay(date);
          return {
            days: {
              ...state.days,
              [date]: {
                ...day,
                proteinG: clampNonNegative(day.proteinG + (delta.proteinG ?? 0)),
                waterMl: clampNonNegative(day.waterMl + (delta.waterMl ?? 0)),
                fiberG: clampNonNegative(day.fiberG + (delta.fiberG ?? 0)),
              },
            },
          };
        }),

      setDay: (date, patch) =>
        set((state) => ({
          days: { ...state.days, [date]: { ...(state.days[date] ?? emptyDay(date)), ...patch, date } },
        })),

      logSymptoms: (entry) => {
        const log: SymptomLog = { id: uid(), ...entry };
        set((state) => ({ symptoms: [...state.symptoms, log] }));
        return log;
      },

      deleteSymptoms: (id) => set((state) => ({ symptoms: state.symptoms.filter((s) => s.id !== id) })),

      setTargetOverrides: (overrides) => set({ targetOverrides: overrides }),

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      startPillTimer: (medicationId, minutes) => {
        const now = Date.now();
        const timer: PillTimer = {
          medicationId,
          startedAt: new Date(now).toISOString(),
          endsAt: new Date(now + minutes * 60_000).toISOString(),
        };
        set({ pillTimer: timer });
        return timer;
      },

      clearPillTimer: () => set({ pillTimer: null }),

      setPremium: (premium) => {
        if (get().premium !== premium) set({ premium });
      },

      recordAppOpen: () => set((state) => ({ meta: { ...state.meta, appOpens: state.meta.appOpens + 1 } })),

      markReviewRequested: () =>
        set((state) => ({ meta: { ...state.meta, reviewRequestedAt: new Date().toISOString() } })),

      setTrialEndsAt: (iso) => set((state) => ({ meta: { ...state.meta, trialEndsAt: iso } })),

      replaceData: (data) => set(data),

      resetAll: () => set({ ...initialData() }),
    }),
    {
      name: 'lifted-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): Data => ({
        profile: state.profile,
        medications: state.medications,
        doses: state.doses,
        weights: state.weights,
        days: state.days,
        symptoms: state.symptoms,
        targetOverrides: state.targetOverrides,
        settings: state.settings,
        pillTimer: state.pillTimer,
        premium: state.premium,
        meta: state.meta,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Data>;
        return {
          ...current,
          ...saved,
          settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
          meta: { ...current.meta, ...(saved.meta ?? {}) },
        };
      },
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

export const todayKey = () => toDateKey(new Date());
