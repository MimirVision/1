# Market research: why a GLP-1 companion app

_Research done October 2026. Figures are from public reports and third-party estimates; the
original sources are linked. Treat app-revenue estimates as directional, not audited._

## The question

Which App Store app has the highest earning potential for a small team to build and launch now?

## How the market works in 2026

- **The gap between winners and everyone else is widening.** Per RevenueCat's _State of
  Subscription Apps 2026_ (~115k apps, $16B+ revenue), the top 25% of apps grew 80% year over
  year while the bottom 25% shrank 33%. New subscription-app launches went from ~2,000/month
  (Jan 2022) to 14,700+/month (Jan 2026). A me-too app is very unlikely to make money.
- **Health & Fitness has the best economics of any category.** Adapty's 2026 benchmark puts its
  median one-year LTV at $1.21 per install (highest), trial-to-paid at 35% (highest), and annual
  plans at 60.6% of category revenue. RevenueCat shows Health & Fitness leading day-14 revenue
  per install ($0.48).
- **Up-front paywalls convert ~5× better than freemium** (10.7% vs 2.1%, RevenueCat). Opal is the
  counterexample: it moved from hard paywall to freemium to scale to 1M DAU.
- **AI apps earn 41% more per customer but churn 30% faster** (RevenueCat), and they carry
  per-use model costs.
- **Apple tightened Guideline 4.3(b) in June 2026** so it can remove apps "indistinguishable"
  from existing ones. Differentiation now matters for review as well as for revenue.

## Candidates considered

| Idea | Demand signal | Problems |
| --- | --- | --- |
| **GLP-1 companion** | 11% of US adults now on a GLP-1 (Gallup 2026, up from 3% in 2024); leader Shotsy reports ~100k paying subs, 1M+ downloads, zero ad spend | Crowded with new clones; medical-content review scrutiny |
| Quit apps (porn/vape/alcohol) | QUITTR reported $250k MRR within months (2025) | Saturated by clones; TikTok-dependent |
| AI social-skills / study coaches | Gleam ~$100k/mo; StudyFetch $108k MRR | Model costs, fast churn |
| Screen-time blockers | Opal ~$5M ARR | Needs native Screen Time APIs; crowded |
| AI calorie trackers | Cal AI ~$1M+/mo | Saturated; model costs |
| Faith apps | Bible Chat ~$15M annualized; Hallow top-10 overall in Lent | Content-heavy; incumbents entrenched |
| Menopause | Hers targeting $1B with a menopause push | Telehealth-led; app-only revenue unproven |

## Decision: a GLP-1 companion that protects muscle

**Why GLP-1 wins on expected value:**

1. **It's the largest consumer health shift in years, and still accelerating.** About 11% of US
   adults currently use a GLP-1 for weight loss (Gallup, mid-2026), and 15% have used one at some
   point. The Wegovy pill launched January 2026 and passed 5M cumulative prescriptions by
   mid-2026, with **80%+ of new pill prescriptions going to people new to GLP-1s**. Foundayo
   (orforglipron) launched April 2026. Wegovy HD (7.2 mg) was approved in March 2026. Each launch
   brings in people who don't have a tracking app yet.
2. **People in this market have money and a reason to pay.** Users spend $149–$1,000+/month on
   medication, so a $50/year tool is trivial for them. Health & Fitness has the best subscription
   economics on the store.
3. **The model is proven.** Shotsy reports ~100k paying subscribers ($40–60/yr, roughly $4–6M
   ARR) and grew mostly through Reddit, Facebook groups and App Store search. Communities are
   large: r/Zepbound ~215k, r/Semaglutide ~195k, r/Mounjaro ~195k, r/WegovyWeightLoss ~130k.
4. **There are clear gaps.** Users complain about one-medication limits, no split-dose
   scheduling, weigh-ins credited to the wrong dose, and no nutrition or muscle tools. Lean mass
   made up roughly 25–45% of weight lost in the pivotal trials. That makes "protect your muscle"
   both a real need and a clear position against the competition.
5. **It's cheap to run.** Everything runs on the device with no AI per-use cost, so gross margin
   is close to 100% after Apple's cut. It also makes a strong privacy pitch.

**Risks, and how the product handles them:**

- *Crowded category.* The app competes on positioning (muscle protection), on depth (any
  medication, any schedule, pills and injections, multiple meds) and on polish. It does not
  compete on "another shot log".
- *App Review on medical content (Guidelines 1.4.1 and 1.4.2).* There's **no dosage
  calculator**: Apple requires those to come from approved entities. The level chart is labeled
  an educational estimate, with the methodology disclosed in-app. Disclaimers appear in
  onboarding, settings and the report.
- *Compounded-drug regulation is in flux* (FDA proposed removing semaglutide and tirzepatide
  from the 503B bulks list in April 2026). The app supports compounded medications neutrally and
  never sources, sells or links to them.

## Product strategy that follows from the research

- **Positioning:** "Lose the fat. Keep the muscle." A daily Muscle Shield score (protein, fluids,
  fiber, strength) gives a reason to open the app every day, unlike a weekly shot log.
- **Pill-first details:** for the Wegovy pill, a "take on an empty stomach, ≤4 oz of water,
  wait 30 minutes" timer with a notification.
- **Proven conversion levers:** a long personalized onboarding quiz that ends in a plan and a
  trial-average projection, then a paywall with a 7-day free trial on the annual plan and a trial
  timeline. Superwall data shows multi-page onboarding paywalls converting ~37% better.
- **Freemium with visible locks:** core tracking stays free, so the app can compete with free
  incumbents in community recommendations. The premium features (level chart, patterns, full
  history, report, export, multiple meds) show the user's own data dimmed behind a lock, which
  converts better than a generic upsell.
- **Built-in growth loop:** progress cards that show only percent lost, plus a watermark.

## Sources

- RevenueCat, State of Subscription Apps 2026 — https://www.revenuecat.com/state-of-subscription-apps
- 9to5Mac coverage of the report — https://9to5mac.com/2026/03/04/new-report-looks-into-the-sustainability-of-the-subscription-app-market-for-2026/
- Adapty, State of In-App Subscriptions 2026 — https://adapty.io/state-of-in-app-subscriptions/
- Adapty Health & Fitness benchmarks — https://adapty.io/blog/health-fitness-app-subscription-benchmarks/
- Gallup, GLP-1 usage reaches new high — https://news.gallup.com/poll/712157/glp-usage-reaches-new-high.aspx
- Washington Post, record GLP-1 use (Jul 2026) — https://www.washingtonpost.com/health/2026/07/07/americans-are-taking-weight-loss-drugs-record-numbers/
- Novo Nordisk Q2 2026 6-K (Wegovy pill prescriptions) — https://www.sec.gov/Archives/edgar/data/0000353278/000035327826000023/caq22026.htm
- Fierce Pharma, Wegovy pill launch uptake — https://www.fiercepharma.com/pharma/novos-impressive-wegovy-pill-launch-headline-and-itself-evercore-says
- Foundayo (orforglipron) approval and pricing — https://www.theglpspot.com/articles/foundayo-orforglipron-glp1-pill
- Wegovy HD 7.2 mg approval — https://www.biospace.com/press-releases/novo-nordisk-a-s-wegovy-hd-semaglutide-7-2-mg-approved-in-the-us-providing-20-7-mean-weight-loss
- GLP-1 Digest, how Shotsy grew to 350k MAU — https://www.glp1digest.com/p/how-shotsy-grew-to-350000-monthly
- RevenueCat, Shotsy on Launched — https://www.revenuecat.com/blog/growth/aja-beckett-shotsy-launched-podcast-2025
- Shotsy reviews and gaps — https://justuseapp.com/en/app/6499510249/shotsy-glp-1-shot-tracker/reviews and https://www.glp1muscleloss.com/articles/shotsy-review/
- GLP-1 subreddit sizes — https://gummysearch.com/r/Zepbound
- Apple 2026 guideline changes (4.3(b)) — https://appcompliance.io/blog/apple-2026-app-review-guideline-changes/
- FDA proposal on GLP-1 compounding — https://www.medscape.com/viewarticle/fda-proposes-end-mass-glp-1-compounding-2026a1000e06
- Superwall onboarding flow data — https://superwall.com/solutions/onboarding-flow-optimization
- Opal freemium switch — https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026
- QUITTR growth — https://startupspells.com/p/porn-addiction-app-quittr-250k-mrr-4-months
- Focus Friend revenue — https://appfigures.com/resources/insights/20250905/1-the-app-that-dethroned-chatgpt-isnt-what-youd-expect
- Bible Chat / Hallow — https://appfigures.com/resources/insights/hallow-lent-surge-prayer-app-revenue
- WebMD on protein and muscle loss on GLP-1s — https://www.webmd.com/obesity/ss/cm/glp1-things-to-avoid-slideshow
- Reddit side-effect study (arXiv 2026) — https://arxiv.org/pdf/2603.12341
