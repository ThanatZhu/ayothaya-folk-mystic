# Authorized overnight batch — 223
Owner explicitly authorized implementation and push on 30 October 2026. Premium benefits/paid entitlements and name profanity filtering are deferred. Keep the 299 THB/30-day preview inactive.

Deliver: auctions; optional frontend updates while existing clients continue playing; current-entry freshness and retained assets; farming/progression measurement and tuning; PvP/GvG balance verification; existing AUTO boss bugs; finish 221/222 QoL and visual fixes; test and push to origin/main.

Auction defaults chosen for the first implementation: cowries, whole-lot price, 1/6/24h, 3 active lots per character, 3% success tax (same entry-level market tax), minimum raise 5%, bounded anti-sniping, same-account self-bids forbidden, no cancellation after a bid, server escrow and durable refunds/proceeds/items. State limits must reject before debiting, never discard credits.

Zero-disconnect frontend deployment must not reload a player automatically. Backend process replacement cannot preserve TCP sockets unless runtime deployment is decoupled/drained; inspect the live deployment controls and report actual limits honestly. Do not claim reconnect is zero-disconnect.

Use existing generated frames/buttons, scoped surfaces, and simple rounded item-stat tooltips. Preserve pet collection and S-build owner rules.

## Final batch scope (223)
Latest owner instruction supersedes the older pending-approval notes: implement and push now. Premium services/paid entitlements and profanity filtering are deferred. The old 299 THB/30-day preview stays inactive.

Implemented: S companion selectable priorities; following-pet automatic ground pickup; right-click equip; 10,000-cowry card extraction; reviewed batch/all selling; attack approach; automatic quest running; plain rounded stat tooltips; grouped live boss damage; corrected ordinary window surfaces; auctions with durable escrow; opt-in frontend update notices and retained runtime URLs; measured late-game XP tuning with level-preserving migrations; ranked matchmaking separated from friendly duels; PvP MDEF and diminishing control.

Validation is recorded in docs/overnight223.md and docs/progression223.md. Calendar progression and PvP fun still require player feedback, not claims of a month-long playtest. Full backend zero-disconnect deployment needs the live hosting change documented in docs/releases223.md.

## Verified before publication
- Latest main animation commits through ed8ceff merged; gameplay/UI suite: 950 passed, 14 environment-dependent skips.
- Actual WebGL game: right-click equip, durable 10,000-cowry extraction, reviewed batch sale and auction deposit/cancel/claim pass.
- Simulated frontend manifest update kept the same authenticated WebSocket alive; no automatic navigation; explicit Update waited for server save before reload.
- Frozen r223-20261030 runtime/asset URLs pass the same actual-game flow. Desktop and phone UI (including 320px portrait/844px landscape), lost-ack replay, plain tooltip and zero surface pixels outside the inner frame pass.
- Git fixture preserves old binary bytes and pinned text across two releases and CRLF/LF checkouts; root/source differences cannot silently reuse a release ID.
- Existing 19 missing generic audio180 URLs remain the earlier audio baseline, not introduced in this batch. Audio work remains separate.
- Live backend health before publication: healthy, 0 players. DigitalOcean settings still could not be inspected because Computer Use stopped on Windows URL verification; backend deployment continuity is not claimed.

Publication candidate: r223-20261030a. The first protected preview caught CRLF conversion in an asset-pack PowerShell note. Text pinning now detects actual text bytes, including uncommon extensions, and preserves the earlier release's exact bytes with sparse overrides. The live production site was not changed by that failed preview.
