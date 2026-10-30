# Versioned frontend releases (223)

A new frontend is announced, never forced. The running game keeps its existing WebSocket and runtime URLs until the player chooses Update when ready. Saving must succeed before navigation. Root game/play HTML and release.json are no-store; next entry loads the current release.

## Release procedure
1. Finish source changes, translations, reference export and tests.
2. Choose a new ID in release.json. Never reuse an archived ID.
3. Commit current source and assets/maps/vendor first: the freeze script records that source commit to recover old bytes later.
4. Run node scripts/freeze-release223.mjs. It snapshots JS/CSS/webmanifest/maps metadata and asset hashes. Modified/deleted old assets are retained as sparse overrides. Unchanged assets use the versioned fallback route; do not duplicate the 750 MB asset pack.
5. Commit the releases changes. Run npm run build and the runtime/retention tests. Vercel publishing without a frozen current release fails.
6. Push the reviewed commit. Keep all retained releases and sparse overrides while clients may still use them. Do not edit frozen files.

Any import or navigation added later must respect the release base. Cross-page navigation goes to a root HTML entry, never another archived page. Keep wire protocol changes backward compatible.

## Hosting limitation requiring operational access
Frontend continuation is implemented and testable without restarting the game authority. DigitalOcean currently auto-deploys main too; replacing that container ends its TCP sockets. A reconnect is not zero-disconnect.

Separate frontend publishing from authority deployment: disable deploy_on_push on the DigitalOcean service or use a separate authority-release branch; perform backend rollouts deliberately. Changing repository files alone cannot change that live App Platform setting.

This task could not inspect/change DigitalOcean settings: Computer Use stopped because it could not verify the current Windows browser URL. No deployment API token or repository deployment secret was configured. No browser workaround was used. Consequently no promise that pushing backend changes preserves existing TCP sessions is made.

First adoption: users must enter this release once before they can see its new-update notice on later frontend releases. The code cannot inject that notice retroactively into an already-running older frontend.

Cross-platform rule: frozen files are marked -text in .gitattributes. Pin textual asset metadata alongside code so checkout line endings cannot alter archived URLs. Source comparison ignores only CRLF/LF differences; archived byte hashes remain exact. Binary assets still use sparse retention and unchanged-image fallback.

Pinned text detection uses actual non-NUL file bytes plus known binary formats, not a short extension whitelist. This covers asset-pack build notes/scripts as well as JSON/JS metadata. Older snapshots receive missing exact-byte text overrides on the next freeze.

## Frontend-only publishing — 226, 30 October 2026

Use this route for UI releases while DigitalOcean still deploys main automatically:
1. Finish and test changes on a working branch; choose a new release ID and commit source.
2. Fetch origin/main. Run node scripts/check-frontend226.mjs origin/main. It traverses server imports and rejects changed authority/shared rules, maps, packages or backend build settings.
3. Freeze the new release, commit its archive, and build/verify retention.
4. Push HEAD to refs/heads/frontend-live, NEVER main for a frontend-only change. DigitalOcean's existing main source remains untouched.
5. Create a production Vercel deployment from that exact frontend-live commit in project prj_Xc7ovSs6wANLMS6G1jA69zI2ntav, team team_WrA2wlKT8Yda9e1ayCEBkqwY, using its existing Git connection. Verify READY, public release.json, the root entry base and retained runtime bytes.
6. Confirm origin/main still points to the previous backend source and no DigitalOcean deployment check was triggered for this UI commit.

Keep frontend-live history; merge it into the next deliberately planned backend release before integrating new shared rules. Never overwrite it with an older main checkout. Before a subsequent task, fetch both branches and start from the current frontend-live version.

The 226 publication changes only the notification position and release workflow. It does not change the authority service, socket protocol, player state or gameplay rules. The notice appears 12 px from the desktop top safe edge and 8 px on short screens. Real local WebSocket tests at 1920×945, 1440×900 and 844×390 verify that discovery leaves the socket open and navigation waits for the player's click and completed save.

This separates UI delivery from backend rollouts; it does not make a backend process replacement preserve TCP sockets. The actual DigitalOcean auto-deploy setting has NOT been changed. Access to its settings remains unavailable via connected tools; the requested in-app browser was unavailable. Do not operate the owner's native desktop/browser as a substitute.

## Farming continuity acceptance — 227/228

The two-player WebGL/real-realm check is scripts/check-update-farming227.mjs. It hosts frontend HTTP separately from the game authority, keeps a retained r226 client farming, switches the published frontend, and has a second player update. It checks increasing kills, XP, coins and actual pet-collected loot; no socket closure or navigation for the player who stays; exact late loading of retained code; save-before-navigation; and the new version only for the updater. Test identities, low-HP fixture monsters and recorded video are isolated in outputs, never production.

First local real-game run: kills 1 -> 3 -> 40; XP 3922 -> 3994 -> 5186; coins 7 -> 11 -> 162; item count 1 -> 2 -> 45. The authority instance and old client connection remained the same. Source code and gameplay rates were not changed.

The 228 notification remains at the top while leaving the existing HUD menu row clear: 96px on desktop and 78px on short screens, plus the safe inset. No item/button art changes.

Use node scripts/publish-frontend226.mjs --push as the guarded publication entry. It requires a clean committed tree, preserves frontend-live ancestry, checks the backend dependency graph, verifies retained runtime bytes, pushes ONLY frontend-live, verifies main stayed unchanged, and emits exact Vercel production-deployment arguments for the connected tool. It never restarts DigitalOcean. Read those arguments and deploy the verified commit through the existing Vercel connection.

For a real publication acceptance run, set QA_LIVE_RELEASE_URL=https://ayothayaonline.com/release.json. The test waits while the old player farms until that public release actually changes to the prepared version, then checks both player paths. This uses isolated local test characters/authority with the production frontend manifest signal, not player credentials or test rewards on the live world. Separately compare the live backend dashboard uptime before/after publication; uptime must advance rather than reset. Backend/code rollouts remain separate.

## Verified production publication — r229-20261030-continuity

Published frontend commit bd286a550e9d5eba2a9581d53dab28c1bfdd56de through Vercel deployment dpl_A1zXEWNHadxsHh8vW8PFa4kKCz5F. It preserves the concurrently delivered painted basic-attack release by merging frontend-live before publication. The publisher correctly refused an initial non-ancestor push; no force push was used.

Two isolated test characters with a real local realm and WebGL clients waited for the PUBLIC release.json to switch to r229. The retained r226 player stayed connected and never navigated while the second player saved and entered r229:
- kills: 1 -> 26 while the notice was visible -> 71 after the other player updated;
- XP: 3922 -> 4822 -> 6267;
- coins: 4 -> 125 -> 309; collected item count: 3 -> 34 -> 88;
- retained-client socket closures: 0; retained-client navigations after the baseline: 0;
- late retained-runtime fetch: exact original bytes; save-before-navigation: passed;
- page errors and changed-asset failures: 0 (19 known unrelated audio180 cue failures remain).

These are local test-world results with fixture monsters, not rewards or test accounts written to production. Live backend dashboard uptime advanced from 9950 to 10478 seconds over 528 seconds of wall time, rather than resetting. Health remained authoritative. The backend source refs/heads/main stayed at 1c5b414e9f4b7123a074ce0c34edab8e82d491a5; this publication triggered no DigitalOcean deployment check.

Local evidence: outputs/update-farming-live/report.json and screenshots/videos; outputs/update-publication/before.json and after.json. They remain untracked because the directories also contain disposable test account tokens. Ten focused merged checks (attack presentation, authority-change guard and runtime retention) pass. Desktop/phone notice, open-socket and save sequencing checks pass at 1920x945, 1440x900 and 844x390.

This completes the frontend-update/continued-farming acceptance. It does not add live replacement of the backend process; planned authority rollouts remain separate.
