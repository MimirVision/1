/**
 * Single place for the product's name, links and monetization identifiers.
 * Change these before submitting to the App Store.
 */
export const Brand = {
  name: 'Lifted',
  tagline: 'The GLP-1 tracker that protects your muscle',
  premiumName: 'Lifted+',
  supportEmail: 'support@liftedapp.co',
  privacyUrl: 'https://liftedapp.co/privacy',
  termsUrl: 'https://liftedapp.co/terms',
  /** Apple's standard EULA is acceptable if you don't publish custom terms. */
  appleEulaUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  /** Filled in after the App Store listing exists, used for "Rate us" and share links. */
  appStoreId: '',
  /** RevenueCat entitlement that unlocks premium features. */
  entitlementId: 'premium',
} as const;

/** Fallback prices shown on the paywall only if the store can't be reached. */
export const FallbackPricing = {
  annual: { price: 49.99, priceString: '$49.99', trialDays: 7 },
  monthly: { price: 12.99, priceString: '$12.99' },
} as const;
