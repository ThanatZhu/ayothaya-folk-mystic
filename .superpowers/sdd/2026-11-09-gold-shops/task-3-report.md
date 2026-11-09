# Task 3 report: owner switch, persisted
Implemented: storage loadGoldMarket/saveGoldMarket (local gold-market.json; Firestore multiplayerRuntime/goldMarket inside checkAuthority tx); host boot load + reload on authority regain (renew); POST /admin/gold-market (owner-only outside local, 409 wipe-not-finished, 400 on non-boolean, 200 {goldMarket}); gold-report gains goldMarket; world-reset-store comment (switch deliberately kept).
TDD: RED = new test failed (no route/flag) before implementation; GREEN = 22/22 pass on gold-market-switch, gold-wipe-host, market-gold-realm, economy*.
Files: server/host.js, server/storage.js, server/world-reset-store.js, tests/gold-market-switch.test.mjs. CRLF kept.
Concerns: non-owner 403 is the same expression as /admin/gold-wipe but not tested (harness is local mode only). Firestore path untested.
