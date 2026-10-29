# Player feedback implementation — 221 (in progress)

Owner approved implementing the remaining feedback using existing in-game frame/button assets. Do not restore the discarded "equipment supports all classes" request. S pet selectable stats remain approved (commit e0d7b21).

Confirmed:
- Level cap target 4–7 days at 6–8 hours/day (24–56 active hours).
- Near endgame equipment target about one month, separate from level cap.
- Card extraction costs 10,000 cowries per card, returns the whole card and preserves refine/affix/grade.
- Pet ground pickup remains automatic whenever an owned companion follows, even if both AUTO settings are off.
- Do not push/deploy without explicit request.

Authorized scope:
1. Right-click equip; basic attacks approach the selected monster; automatic quest running; selectable batch/all selling; item stat tooltips.
2. Card extraction with durable idempotent receipts; live boss bars grouped by party/solo with member damage.
3. Profanity filtering on naming; premium remote refine/NPC shop services; auctions.
4. Farm/craft/boss/PvP/GvG core economy and measured progression targets.
5. Version update notification, optional update while playing, latest assets on next entry; preserving live server connections requires authority deployment architecture, not reconnect marketing.

Pending user preference:
- Premium: owner approved preview only at 299 THB / 30 days. Do not enable real sales or invent a gold conversion.
- Auction fees/duration/default rules need concrete review before public enablement.

Implementation and evidence checklist must be updated as work continues. No features above may be described as complete until authority, UI and relevant tests pass.

Owner selected premium PREVIEW ONLY at 299 THB / 30 days. No real sale, top-up conversion or activation charge is authorized. Monthly cost stated: 15,000 THB; 51 buyers at 299 THB give gross 15,249 THB, 67 give gross 20,033 THB, before fees/tax.

## Current working checkpoint

221: core extraction/batch sale and durable authority tests pass; basic attack approach and quest auto-run rules pass; NPC talk quest routes now carry the quest pace. Right-click equip, item hover and live boss meter are connected. Component browser QA passes five sizes and lost-ack replay. Full real-game integration/visual verification, source translations, cache tags and broad regression checks remain before acceptance.

222 owner steering: remove stretched black frame centers across game windows and generate replacement backgrounds. Two built-in ImageGen assets are saved in assets/ui-surfaces222 with exact prompts and phone encodings. jade-surfaces222.js/css applies them to ordinary dialogs, preserves illustrated pet/gacha/cinematic scenes, and strips frame center fill. The gacha rates/details frame rules also no longer fill black centers. Theme component QA passes all five sizes; inspect actual game and gacha regression next.

## Verified checkpoint after surfaces222

- 222 visual work is complete in the local preview, not pushed or deployed.
- Generated silk/paper surfaces cover ordinary dialogs, HUD panels and popovers; explicit inset backings cover crafting, card insertion, mail, boss browser and NPC talk. Existing illustrated pet/gacha/cinematic scenes are retained.
- Fixed ui-kit 28px pattern sizing overriding the generated image. All backings now use centered cover/no-repeat and existing decorative frame edges.
- Real built WebGL game QA: right-click equip, extraction with exactly 10,000 cowries and preserved refine/affix, batch sale with rare exclusion, and bag/status/extraction/craft/shop backgrounds passed. See outputs/farm-qol221/runtime-report.json and game-*.png.
- Surface/pseudo/phone/exclusion assertions passed three viewports; utility and gacha/shop/companion regressions passed five viewports each, including lost-ack idempotency. See outputs/ui-surfaces222/validation.json and outputs/farm-qol221/ui-report.json.
- Focused authority/combat/stats/quest/party suite: 26 passed. Source translations: zero missing. Build passed with 2,773 asset files.
- Full suite: 937 tests, 921 passed, 14 skipped, two existing boss-auto201 hunter/shaman failures, unchanged from the prior baseline. Full evidence: outputs/test221-full.log. Do not represent the full suite as green.
- Local preview currently http://127.0.0.1:11429/farm-qol-lab221.html?panel=card&rev=surfaces222 . Server ports may change after restart.

Remaining roadmap scope is still as listed above: profanity naming, premium entitlement/services (price preview only), auction authority/UI, measured farming/endgame/PvP/GvG balance and deployment continuity. Do not claim these implemented.

Before accepting the remaining 221 feature batch: review malformed receipt normalization, disconnected confirmation gating, tooltip lifecycle after grid replacement, obsolete permanent-card copy in insertion/handbook, live-meter keyboard/focus/collapse details and authority delta/privacy coverage. No live rollout is authorized by this visual request.

## Final batch scope (223)
Latest owner instruction supersedes the older pending-approval notes: implement and push now. Premium services/paid entitlements and profanity filtering are deferred. The old 299 THB/30-day preview stays inactive.

Implemented: S companion selectable priorities; following-pet automatic ground pickup; right-click equip; 10,000-cowry card extraction; reviewed batch/all selling; attack approach; automatic quest running; plain rounded stat tooltips; grouped live boss damage; corrected ordinary window surfaces; auctions with durable escrow; opt-in frontend update notices and retained runtime URLs; measured late-game XP tuning with level-preserving migrations; ranked matchmaking separated from friendly duels; PvP MDEF and diminishing control.

Validation is recorded in docs/overnight223.md and docs/progression223.md. Calendar progression and PvP fun still require player feedback, not claims of a month-long playtest. Full backend zero-disconnect deployment needs the live hosting change documented in docs/releases223.md.
