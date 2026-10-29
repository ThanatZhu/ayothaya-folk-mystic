# S companion stat builds — 220

Owner intent: let every class and player build use any S companion without forcing class-based STR/AGI/VIT/INT/DEX/LUK presets.

## Contract

- A character selects three distinct stats in primary, secondary and support order. All of that character's S companions share this selection; A/B companions keep their original bonuses.
- This is opt-in. A missing or malformed selection retains the original S bonuses. Merely viewing recommendations does not save anything.
- Keep the exact sum of each companion's existing bonus at its current star rank. Allocate 50/30/20 with integer largest-remainder rounding, priority order breaking ties. Current S budgets by stars 1–5: 8, 10, 13, 14, 16. Do not silently increase the total when adding companions or changing this UI.
- Recommend from the character's allocated raw stats only. Never include gear, food, pet bonuses or derived totals; never infer a fixed build from the class.
- Pet identity and active skill, multipliers, cooldowns, star costs, rarity, pity and prices are unchanged. Offensive pet skills use the owner's ATK/physical defense channel or MATK/magic defense channel.
- Save for the character, not globally for the login account. Changes are free and allowed outside combat: no combat AUTO, duel, pending attack/cast, active rival combat or recent damage/cast/pet skill in the previous 6 seconds. Dead, suspended and observing players cannot change.
- A failed or disconnected save is not optimistic. Preserve the same request ID for uncertain retries; the server returns a previous successful receipt without applying again, even if combat has since started.
- Server accepts only three stat names, computes all numbers and durably saves before acknowledging. Raw allocations, stat points, money and current HP/MP do not refill.
- Following-pet ground collection remains automatic, independent of both combat AUTO and pet skill AUTO. This feature adds no collection switch.

## Files and UI

Pure rules: pet-stat-build220.js. Authority: pet-account.js, server/host.js and server/realm.js. UI: pet-stat-build-ui220.js in the existing companion details pane. Shared generated capsule buttons remain owned by premium-controls202.css; companion layout remains in pet-companion201.css. Use 44px minimum targets, keyboard buttons, scoped scrolling and the existing modal behavior.

An old server without petBuildStatus disables saving rather than simulating a successful change. Deploy the authority with the frontend when the owner later requests deployment.

Local preview: run node scripts/preview-gacha200.mjs (ensure outputs/gacha-banner200 exists), then open its URL with view=companions. Fixtures contain test pets/currency and never touch real characters.

## Verification

- node --test tests/pet-stat-build220.test.mjs tests/pet-stat-build220-host.test.mjs tests/pet-live.test.mjs tests/pet-gacha.test.mjs tests/ground-loot219.test.mjs tests/i18n.test.mjs
- node scripts/check-pet-build220.mjs while the preview server runs; optional PET_BUILD_PREVIEW environment variable overrides its origin.
- Browser checks: select/swap priorities, recommendations, cancel, save, cross-pet application, A unchanged, combat and offline states, lost-response replay, generated controls, no missing assets or JS exceptions at 1440×900, 844×390, 667×375, 390×844 and 320×568. Inspect screenshots in outputs/pet-build220, not just overflow assertions.
- Build and full-suite results belong in the handoff; the existing boss-auto201 hunter/shaman baseline failures are unrelated to this change.

## Recorded results (local trial, 30 October 2026)

- Build succeeded. Focused rule/authority/localization checks passed; browser UI checks passed at all five sizes.
- Real game UI → WebSocket → durable local server save → authoritative derivedView update passed. Selecting AGI/LUK/STR gave the equipped one-star Garuda AGI +4, LUK +2, STR +2; server and online display both reported total AGI 5 from raw AGI 1.
- Normal-motion recording: outputs/pet-build220/live-game-normal.webm. Saved view: outputs/pet-build220/live-game-saved.png. No new page errors or missing changed assets. The existing 19 generic audio180 404s remain outside this task.
- Full suite: 929 tests, 913 passed, 14 skipped, 2 pre-existing failures in boss-auto201 (hunter/shaman selected-skill AUTO).
- Local release candidate only; no push or deployment. Disposable QA stores, tokens, logs, videos and screenshots under outputs must remain untracked.
- To reproduce the real-client check: node scripts/check-pet-build220-runtime.mjs. It creates an isolated LocalStore and loopback server, redirects only that test browser, and closes them afterward. Never point it at real player records.

## Acceptance follow-through

Cold storage reload preserves the selected profile and derived bonuses; another character remains independent. The public health response advertises petStatBuild:1 for later rollout verification. The player handbook and S companion reference describe original versus customized bonuses, and both Thai/English browser checks passed. Final targeted checks: 25/25 passed, build succeeded. Remaining work from the original 18-item list is recorded in docs/feature-backlog220.md.
