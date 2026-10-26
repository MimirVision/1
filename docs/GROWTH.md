# Growth plan: from launch to meaningful revenue

The app is the easy half. Revenue comes from distribution and conversion. This plan focuses on
channels that worked for the category leader (communities and App Store search) and on the
micro-creator playbook that's working for consumer apps in 2026.

## Revenue model (honest numbers)

Revenue ≈ installs × trial-start rate × trial-to-paid rate × price × (1 − Apple's 15% cut).

| Scenario | Installs / month | Trial starts | Trial → paid | New annual subs / month | New bookings / month* |
| --- | --- | --- | --- | --- | --- |
| Slow | 3,000 | 6% | 30% | 54 | ~$2.3k |
| Solid | 15,000 | 8% | 35% | 420 | ~$17.8k |
| Breakout | 60,000 | 10% | 40% | 2,400 | ~$102k |

\*At $49.99/yr net of a 15% commission, before renewals. Annual subscribers renew, so revenue
compounds year over year. For calibration: Shotsy reached ~100k paying subscribers from ~1M
downloads (about 10% of downloads), which would be roughly $4M+/yr at our price. Most apps land
in the "slow" row. The plan below is about getting to "solid" and above.

Health & Fitness benchmarks to track (Adapty/RevenueCat 2026): trial-to-paid ~35% median,
day-14 revenue per install ~$0.48, one-year LTV per install ~$1.21. **Target day-14 RPI above
$0.50.**

## Week 0–2: launch foundations

1. **ASO is the #1 free channel.** The category leader said ranking in search was the only
   affordable way for an indie to reach a wide audience. Use the metadata in `LAUNCH.md`. After
   launch, check rankings weekly (Appfigures or Astro) for: `glp1 tracker`, `glp-1`,
   `semaglutide`, `tirzepatide`, `shot tracker`, `injection tracker`, `glp1 app`,
   `wegovy pill` (brand terms belong only in the description). Iterate the subtitle and keywords
   every 2–4 weeks.
2. **Get to 20–50 real ratings fast.** The app already asks for a review after milestones
   (`src/services/review.ts`). Ask friends and early users to try it honestly. Never incentivize
   reviews.
3. **Product Hunt / Hacker News "Show HN"** for a one-time spike and backlinks.

## Week 2–8: communities (where GLP-1 users already are)

Two-thirds of Shotsy's new users came from community groups. Do this authentically:

- **Reddit:** r/Zepbound (~215k), r/Semaglutide (~195k), r/Mounjaro (~195k),
  r/WegovyWeightLoss (~130k), r/glp1, r/tirzepatidecompound. **Read each sub's rules.** Most ban
  self-promotion. The path that works: be a useful member, answer questions about protein,
  side-effect timing and site rotation, and share your own progress card when relevant. Ask the
  mods whether you can post a one-time "I built a free tracker" thread.
- **Facebook groups:** the big GLP-1 support groups (often 50k–300k members). Same rule: help
  first, and post only where the admins allow it.
- **Feedback loop:** reply to every review and every email in the first 3 months. Ship the
  features people ask for most and say so in release notes ("You asked, we built it").

## Week 4+: short-form video (TikTok, Reels, Shorts)

What's working in 2026 for consumer apps: **many small accounts posting daily** beat a few big
creators. One app reportedly grew from 30k to 70k+ downloads in 30 days with 7 micro-creators at
$15–20 a video.

- **Recruit 5–10 GLP-1 creators** with 1k–50k followers who already post journey content. Pay a
  flat rate per video plus a bonus per 10k views. Give them hooks, not scripts.
- **Hooks that fit the product:**
  - "I lost 30 lb on Zepbound and almost lost my muscle too. Here's what I track now."
  - "Why your nausea always hits the day after your shot" (show the pattern heatmap)
  - "What my medication level looks like between shots" (show the level chart)
  - "POV: you take the Wegovy pill and have to wait 30 minutes to eat" (pill timer)
  - Progress-card reveals using the in-app share feature (the watermark is the attribution)
- **Your own account:** post daily, rotate 3–4 formats, and double down on whatever wins.
- **Compliance:** creators must disclose paid partnerships. Never make medical claims ("this app
  helps you lose weight"). Claim tracking and awareness only.

## Conversion levers to test (RevenueCat Experiments)

In rough order of expected impact:

1. **Price:** $39.99 vs $49.99 vs $59.99 for the yearly plan.
2. **Trial length:** 3 days vs 7 days.
3. **Paywall timing:** after the plan (current) vs after notifications vs right after
   onboarding.
4. **Hard vs soft paywall:** a hard paywall converts up to ~5× better per install, but in this
   category the leader's free core drives word of mouth. Test hard for paid-ad traffic and keep
   soft for organic.
5. **Win-back offers** for cancelled trials (a RevenueCat feature) and a discounted annual offer
   after day 3 for free users.

## Paid acquisition (only after organic conversion is proven)

Turn on Apple Search Ads once day-14 RPI is reliably above $0.50. Start with exact-match
category terms, a $20–50/day cap, and a target CPI under $2. Meta ads come later. They need a
creative pipeline, and the UGC videos above can double as ad creatives.

## Product roadmap (ordered by revenue impact)

1. **Apple Health sync** (import weight from smart scales, export doses). Users expect it, and it
   improves retention. Use `@kingstinct/react-native-healthkit` with its config plugin.
2. **Home-screen widget + Live Activity** for "next shot in 2d 4h" and the pill wait timer, using
   `expo-widgets` (available in this SDK). Widgets are a known retention driver.
3. **Protein quick-add library** (common foods and shakes) and, later, an optional photo-based
   protein estimate. That's an AI feature with per-use cost, so it belongs in premium only.
4. **Maintenance and tapering mode** for people coming off, or holding, a dose. The "keeping it
   off" concern is growing as the market matures.
5. **Localization:** UK (stone already supported), Germany, Australia, Canada. GLP-1 use is
   growing fast in all of them.
6. **Android** — the codebase already runs there. Ship once iOS is converting.
7. **Optional encrypted iCloud backup.** Users switching phones currently rely on CSV export.

## Weekly metrics to watch

Installs, onboarding completion rate (target >70%), paywall view → trial start (target >8%),
trial → paid (target >35%), day-7 and day-30 retention, refund rate, rating average, and
keyword ranks.
