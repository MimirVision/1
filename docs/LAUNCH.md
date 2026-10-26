# Launch kit: App Store Connect, subscriptions and review

Everything you need to get **Lifted** from this repo into the App Store. Work through it top to
bottom.

## 0. Things only you can do (≈1–2 days)

1. **Apple Developer Program** ($99/yr) — https://developer.apple.com/programs/. Enroll as an
   organization (LLC) if you can. The seller name shows on the store, and health apps from a
   company read as more trustworthy.
2. **Pick a final name and domain.** "Lifted" is a working name. Before you commit, search the
   App Store and USPTO (TESS) for conflicts in Class 9/42/44. Then update `src/constants/brand.ts`,
   `app.json` (`name`, `slug`, `bundleIdentifier`, `package`) and `store/make-screenshots.js`.
3. **Host the privacy policy and terms.** Fill in the drafts in `docs/privacy.html` and
   `docs/terms.html`, publish them (GitHub Pages works), and put the URLs in `Brand.privacyUrl` and
   `Brand.termsUrl`. **The placeholder `liftedapp.co` links must be replaced before you submit.**
4. **Support email.** Set `Brand.supportEmail` to an inbox you actually read.
5. **Small Business Program** — https://developer.apple.com/app-store/small-business-program/.
   It cuts Apple's commission to 15% for your first $1M/yr. Enroll on day one.

## 1. Subscriptions (App Store Connect → your app → Subscriptions)

Create one subscription group named **Lifted+** with two auto-renewable products:

| Reference name | Product ID | Duration | Price (US) | Intro offer |
| --- | --- | --- | --- | --- |
| Lifted+ Yearly | `lifted_plus_annual` | 1 year | $49.99 | 1-week free trial (new subscribers) |
| Lifted+ Monthly | `lifted_plus_monthly` | 1 month | $12.99 | none |

Why these prices: the category leader charges $39.99–59.99/yr and $9.99–19.99/mo. Annual plans
earn ~61% of Health & Fitness revenue, and a monthly price close to the annual one makes the
annual plan look like a deal (the paywall shows "Save 68%").

Fill in each product's localization (display name and description) and the review screenshot,
which can be the paywall screenshot.

## 2. RevenueCat (handles receipts and entitlements, free up to $2.5k MTR)

1. Create a project at https://app.revenuecat.com and add an **App Store** app with your bundle
   ID. Upload an **In-App Purchase Key** (App Store Connect → Users and Access → Integrations →
   In-App Purchase).
2. **Entitlement:** create one with identifier **`premium`** (must match
   `Brand.entitlementId`).
3. **Products:** import `lifted_plus_annual` and `lifted_plus_monthly` and attach both to
   `premium`.
4. **Offering:** make the `default` offering current, with packages **$rc_annual** → annual
   product and **$rc_monthly** → monthly product. The app reads `offerings.current` and matches
   on the ANNUAL/MONTHLY package types.
5. Copy the **Apple public SDK key** (`appl_...`) and set it as an EAS environment variable:
   ```bash
   npx eas-cli@latest env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxx --environment production --visibility plaintext
   ```
   (or put it in a local `.env` for local builds). Without the key, release builds show "store
   unavailable" on the paywall. Purchases are only simulated in web previews and dev builds.
6. Later, use RevenueCat **Experiments** to A/B test price ($39.99 vs $49.99 vs $59.99/yr) and
   trial length.

## 3. Build and upload (no Mac required)

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init                 # links the project, writes extra.eas.projectId into app.json
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest   # uploads to App Store Connect / TestFlight
```

EAS walks you through certificates and provisioning the first time; let it manage them. Put your
App Store Connect app ID in `eas.json` → `submit.production.ios.ascAppId`.

**Test in TestFlight before submitting:** do the onboarding, start the trial with a Sandbox
account (Settings → App Store → Sandbox Account), let notifications fire, log a pill to test the
wait timer, share a progress image, and export the PDF report and CSV.

## 4. Store listing

**App name (30):** `Lifted: GLP-1 Shot Tracker`

**Subtitle (30):** `Dose, Protein & Weight Log`

**Keywords (100, no spaces after commas, no words repeated from the name or subtitle):**
```
glp1,semaglutide,tirzepatide,injection,reminder,muscle,pill,side effects,medication,loss,microdose
```
Keep competitor and brand names (Ozempic, Zepbound, Shotsy…) **out of the keyword field**:
Apple rejects trademark keyword stuffing (Guideline 2.3.7). It's fine to mention compatible
medications in the description.

**Promotional text (170):**
```
New: Wegovy pill & Foundayo support with a built-in 30-minute wait timer. Track any GLP-1 — shots, pills or compounded — and protect your muscle.
```

**Description:**
```
Lose the fat. Keep the muscle.

Lifted is the GLP-1 companion that tracks your doses, side effects and progress — and helps protect the muscle you're working hard to keep.

In the major GLP-1 trials, lean mass made up roughly a quarter to two-fifths of the weight people lost. Lifted's daily Muscle Shield turns the habits that help — protein, fluids, fiber and strength training — into one simple score.

NEVER MISS A DOSE
• Reminders for weekly, daily, every-few-days or split-dose schedules
• Injection-site rotation map that suggests where to go next
• Pill mode with a 30-minute "wait to eat" timer for oral semaglutide
• Track multiple medications, supply on hand and monthly cost

SEE WHAT'S HAPPENING
• Your estimated medication level, rising and tapering between doses
• Weight trend with every dose change marked
• Results by dose: what each step actually did for you
• Side-effect patterns: find out which day after your shot nausea peaks

PROTECT YOUR MUSCLE
• Personal protein, fluid and fiber targets
• One-tap logging — no food database required
• Strength-training goal for the week

BE READY FOR YOUR APPOINTMENT
• One-page doctor report PDF: doses, dose changes, weight, side effects, nutrition
• Export everything to CSV

PRIVATE BY DESIGN
• No account needed. Your health data stays on your phone.
• Share progress cards that show percent lost — never your weight.

Works with Zepbound, Mounjaro, Wegovy (including Wegovy pill and Wegovy HD), Ozempic, Rybelsus, Foundayo, Saxenda, Victoza, Trulicity and compounded semaglutide or tirzepatide.

LIFTED+ (OPTIONAL SUBSCRIPTION)
Unlocks the medication level chart, side-effect patterns, results by dose, full history, doctor reports, data export, multiple medications and supply tracking. Free trial available for new subscribers on the yearly plan. Payment is charged to your Apple ID at confirmation of purchase. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple ID settings.

Terms of Use: <your terms URL>
Privacy Policy: <your privacy URL>

Lifted is a tracking and education tool, not a medical device. It does not diagnose, treat or provide dosing advice. Always follow your prescriber's instructions.
```

**Category:** Primary **Health & Fitness**; secondary **Medical**.

**Screenshots:** `store/screenshots/*.png` (1290×2796, accepted for the 6.9" slot). Upload in
order 01→07. Regenerate after UI changes with `node store/make-screenshots.js` (instructions are
in the script header).

**App preview video:** `store/preview/app-preview.mp4` (886×1920, 21 s, H.264 30 fps with a
stereo AAC track, as Apple requires). Pick a poster frame from the first second, which shows the
shot-day screen. Regenerate with `node store/make-preview-video.js`.

**Social and press:** `store/social/` has a 1200×630 press banner, a 1080×1080 post and two
1080×1920 stories. Most ad platforms restrict paid ads that name prescription drugs, so use the
brand-free banner and square for paid campaigns.

**App icon:** `assets/images/icon.png` (1024×1024, no transparency).

**Age rating:** answer the questionnaire honestly. The app contains medical/treatment
information, so expect a higher rating than 4+. That's fine for this audience.

## 5. App Privacy ("nutrition label")

The app has no account, no analytics SDK and no ad SDK. Health data stays in on-device storage.
RevenueCat processes purchases. A typical, accurate answer:

- **Purchases** → Purchase History: collected, *App Functionality*, **not** linked to identity,
  **not** used for tracking.
- **Identifiers** → User ID (RevenueCat's anonymous app user ID): collected, *App Functionality*,
  not linked, not tracking.
- **Health & Fitness:** **not collected.** It never leaves the device unless the user exports or
  shares it.

Re-check this if you add analytics, crash reporting or cloud sync.

## 6. App Review notes (paste into "Notes")

```
Lifted is a self-tracking companion for people prescribed GLP-1 medications. No login is required.

• The app does not calculate, recommend or adjust doses. Users enter the dose their prescriber gave them.
• The "medication level" chart is a clearly labelled educational estimate based on published half-life data (methodology: You tab → "How estimates work"). It is not presented as a measurement.
• The onboarding projection shows the published clinical-trial average with a disclaimer that individual results vary.
• All health data is stored on device. Nothing is uploaded.
• Lifted+ is an auto-renewable subscription managed with StoreKit via RevenueCat. Restore is available on the paywall and in the You tab.

To see premium features, start the free trial with a sandbox account.
```

## 7. Pre-submission checklist

- [ ] `Brand` constants updated (name, URLs, support email)
- [ ] Privacy policy and terms live at the URLs in `Brand`
- [ ] RevenueCat key set in EAS env; offering `default` current with annual and monthly packages
- [ ] Sandbox purchase, restore and cancel tested in TestFlight
- [ ] Notifications tested on a real device (dose day, follow-up, pill timer, trial ending)
- [ ] Screenshots uploaded; description has Terms and Privacy links
- [ ] Small Business Program enrolled
- [ ] Remove nothing from the in-app disclaimers. They're there for App Review.
