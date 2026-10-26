import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import { Brand, FallbackPricing } from '@/constants/brand';
import { useStore } from '@/store';

export type PlanId = 'annual' | 'monthly';

export interface Plan {
  id: PlanId;
  title: string;
  price: number;
  priceString: string;
  /** e.g. "$0.96/week" for the annual plan. */
  perWeekString: string | null;
  /** Free-trial length in days, if the store offers one to this user. */
  trialDays: number | null;
  pkg?: PurchasesPackage;
}

export type PurchaseResult = 'success' | 'cancelled' | 'pending' | 'error';

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

let configured = false;

/**
 * Without a store connection (web preview, or a dev build with no API key) purchases are
 * simulated so the flow can be exercised. Production native builds never simulate.
 */
const simulated = () => !configured && (Platform.OS === 'web' || __DEV__);

function isEntitled(info: CustomerInfo): boolean {
  return info.entitlements.active[Brand.entitlementId] !== undefined;
}

function trialDaysOf(pkg: PurchasesPackage): number | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price > 0) return null;
  const unit = intro.periodUnit?.toUpperCase();
  const n = intro.periodNumberOfUnits ?? 1;
  if (unit === 'DAY') return n;
  if (unit === 'WEEK') return n * 7;
  if (unit === 'MONTH') return n * 30;
  return null;
}

function formatMoney(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function fallbackPlans(): Plan[] {
  return [
    {
      id: 'annual',
      title: 'Yearly',
      price: FallbackPricing.annual.price,
      priceString: FallbackPricing.annual.priceString,
      perWeekString: `${formatMoney(FallbackPricing.annual.price / 52, 'USD')}/week`,
      trialDays: FallbackPricing.annual.trialDays,
    },
    {
      id: 'monthly',
      title: 'Monthly',
      price: FallbackPricing.monthly.price,
      priceString: FallbackPricing.monthly.priceString,
      perWeekString: null,
      trialDays: null,
    },
  ];
}

export function configurePurchases() {
  if (configured || Platform.OS === 'web' || !apiKey) return;
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN).catch(() => {});
    Purchases.configure({ apiKey });
    configured = true;
    Purchases.addCustomerInfoUpdateListener((info) => useStore.getState().setPremium(isEntitled(info)));
    refreshEntitlement();
  } catch (error) {
    console.warn('RevenueCat configure failed', error);
  }
}

export async function refreshEntitlement() {
  if (!configured) return;
  try {
    const info = await Purchases.getCustomerInfo();
    useStore.getState().setPremium(isEntitled(info));
  } catch {
    // Offline: keep the cached entitlement.
  }
}

export async function loadPlans(): Promise<Plan[]> {
  if (!configured) return fallbackPlans();
  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    const plans: Plan[] = [];
    const annual = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
    const monthly = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
    if (annual) {
      plans.push({
        id: 'annual',
        title: 'Yearly',
        price: annual.product.price,
        priceString: annual.product.priceString,
        perWeekString: annual.product.pricePerWeekString
          ? `${annual.product.pricePerWeekString}/week`
          : `${formatMoney(annual.product.price / 52, annual.product.currencyCode)}/week`,
        trialDays: trialDaysOf(annual),
        pkg: annual,
      });
    }
    if (monthly) {
      plans.push({
        id: 'monthly',
        title: 'Monthly',
        price: monthly.product.price,
        priceString: monthly.product.priceString,
        perWeekString: null,
        trialDays: trialDaysOf(monthly),
        pkg: monthly,
      });
    }
    return plans.length > 0 ? plans : fallbackPlans();
  } catch {
    return fallbackPlans();
  }
}

export async function purchasePlan(plan: Plan): Promise<{ result: PurchaseResult; message?: string }> {
  if (simulated()) {
    useStore.getState().setPremium(true);
    return { result: 'success' };
  }
  if (!plan.pkg) {
    return { result: 'error', message: 'The App Store is unavailable right now. Please try again in a moment.' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    const entitled = isEntitled(customerInfo);
    useStore.getState().setPremium(entitled);
    return { result: entitled ? 'success' : 'pending' };
  } catch (error) {
    const e = error as { code?: string; userCancelled?: boolean; message?: string };
    if (e.userCancelled || e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { result: 'cancelled' };
    if (e.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { result: 'pending' };
    return { result: 'error', message: e.message ?? 'Something went wrong with the purchase.' };
  }
}

export async function restorePurchases(): Promise<{ restored: boolean; message?: string }> {
  if (simulated()) return { restored: useStore.getState().premium };
  if (!configured) return { restored: false, message: 'The App Store is unavailable right now.' };
  try {
    const info = await Purchases.restorePurchases();
    const entitled = isEntitled(info);
    useStore.getState().setPremium(entitled);
    return { restored: entitled };
  } catch (error) {
    return { restored: false, message: (error as Error).message };
  }
}

export async function openManageSubscriptions() {
  if (configured) await Purchases.showManageSubscriptions().catch(() => {});
}

export const purchasesSimulated = simulated;
