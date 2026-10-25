# Release 166 — 25 October 2026

Owner request: publish all pending game changes. Merge production main through 830397a, preserving the current animation, guild, storage, NPC-shop, training-route and balance updates.

New changes:
- Distinct daily-bounty illustrations for all 14 targets, 42 measured scene crops, correct leader selection and wrapping watch/reward controls.
- CBT activity icon and entry popup with a full jade frame and generated close button. Gold-bar reward proposals remain a preview: no end date, claims, score ledger or real-money payments are enabled.
- Body-clearance routing for bridge shortcuts, A* edges and AUTO pursuit in both client and authoritative movement. Health advertises bridgeRouting:1 for rollout verification.
- English translations for all 168 newly surfaced strings. The pose-test helper recognizes the newly declared profileFrame playback flag while retaining strict finite checks on geometry channels.

Validation before push:
- Full suite: 611/611 pass, using test concurrency 2 to keep socket deadlines independent of CPU-heavy rendering tests. Animation and frontier network focused checks also pass.
- Static build, content validation, syntax and diff checks pass.
- Native Edge checks pass after merge: all 14 three-shot stories, Thai reveal/Skip, unchanged quest progress, CBT preview controls/reward tabs and seven viewport sizes, and actual WebSocket destination walking across the repaired bridge in both directions.
- Bridge regressions simulate 1,146 crossings over eight real boardwalks at walk and sprint speeds; water remains blocked.

Cache chain: game.html → game-boot.js?v=release166 → viewer-world.js?v=release166 → game-controls.js?v=release166, with bridge164 core/route modules and the combat165 animation modules retained.

Local QA databases, logs, screenshots, source-art work files and server-package archives under outputs/ are excluded from the release commit. Runtime artwork and its production source notes are committed. Rollout evidence is recorded in outputs/release164 after the push; a successful local build alone is not evidence of a production deployment.