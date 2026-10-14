# Multiplayer 0.24 — implementation and release gate

## What is implemented

- Real WebSocket connections, separate `server-1:map` and `server-2:map` rooms, 20 Hz authoritative simulation and 10 Hz snapshots. Configured capacity is 50, not a measured production concurrency guarantee.
- Input-only movement with server collision/speed, server-owned HP/MP/cooldowns/skill validation, shared monster state, single death rewards, distance-limited party Base/Job EXP splits. Existing game balance is retained.
- Nearby player sprites and appearance, interpolated movement, skill FX and emotes. Full appearance only on entering interest range; compact position snapshots thereafter.
- Five-person parties: invite, decline, expiring invitation, transfer leader, kick, leave. Room/party chat with text limits and per-player rate limits; rendered with text nodes. Party membership survives a short (20 second) disconnect while this process remains alive.
- Token verification through Firebase Admin, including revocation check. One online character per Google UID, Firestore session leases, fenced writes, and a global authority lease prevent two runtime processes from running divergent rooms.
- Automatic checkpoints every 10 seconds, save acknowledgement before leaving, heartbeat, bounded reconnection, stale-input stop. Chat and parties are session data, not permanently saved.
- Local mode with separate test identities and file-backed server saves, exclusively bound to `127.0.0.1`. Public Firebase mode rejects local identities and has no `/dev/session` endpoint.

## In-game multiplayer UI (0.25)

- Online is automatic: when `MULTIPLAYER_URL` is set (or on the loopback dev server) and the account can authenticate, entering the game joins the shared room with no button. There is no "leave online" action; returning to the lobby or logging out closes the session and the server saves it. If the connection fails, the roster dialog opens with the reason and a reconnect button instead of leaving the player frozen. Until a public backend exists the public site stays single player, and guest/trial characters stay single player because the production server only accepts Google tokens.
- HUD chip with a connection dot (grey unavailable/offline, amber connecting, green online) and room head-count; it opens the roster dialog for invite, leader transfer, kick and leaving the party.
- Non-modal chat dock with Room/Party tabs. It never pauses play. Enter focuses the input, Esc leaves it, an empty Enter leaves it, and sending on desktop returns focus to the game. Q/E camera and V overview keys are ignored while typing. On touch screens the dock starts collapsed at bottom-centre, showing the latest line and an unread count.
- Speech bubbles above the speaker for about 5.5 seconds (party messages tinted blue). Party allies get a ✦ blue nameplate; disconnected players fade.
- Party frame (desktop under the minimap, touch under the portrait) with leader crown, HP bars from server snapshots, and far/disconnected/down states.
- Party invitations appear as a top-centre toast with a countdown bar and accept/decline, so they no longer require the roster dialog to be open.
- Text is always inserted as text nodes. Snapshot players now include `maxHp` for the party HP bars.

## What is not live / not included

`MULTIPLAYER_URL` remains empty on the public site. The backend, Firebase deployment permissions, updated Firestore rules and billing approval are still needed before public users can enter a shared room. A local proof is not a public multiplayer deployment.

The only shipped map is the safe capital. Co-op combat and reward sharing are exercised in server tests with a fixture field; there is no playable public wilderness yet. This change does not implement the Phase 4 inventory/equipment/crafting/economy, Phase 5 quests, guilds, player trade, PvP, raids, auction house, reports/moderation tools, or production backup/restore operations. There is no misleading placeholder shop/trade system. Phase 7 cannot be declared fully accepted until its Phase 3–6 dependencies and real cloud checks pass.

The first online join imports the owner's existing saved character/progress once. Those prototype saves were historically client-writable; they are not proof of fair earned XP. Subsequent joins use private `multiplayerProfiles` state, not client XP claims. Legal appearance/class upgrades in the lobby are checked against the server-owned progress. Class changes reset Job EXP. The server mirrors checkpoints into the existing character document so the lobby can show current levels. Offline progress after the import is not merged into the authoritative online profile. This migration policy must be accepted before enabling competitive play; do not claim retroactive anti-cheat.

## Run locally

From repository root (Node 22+):

```powershell
npm ci
npm run build
$env:AUTH_MODE='local'
$env:PORT='8787'
npm run server
```

Open `http://127.0.0.1:8787/`. Create two different guest Novice characters in two tabs, enter the city; each tab joins the shared room automatically. Local online test characters are separate server-owned Novices and are not a migration of local single-player saves. Their bearer token is sessionStorage-scoped and usable only on this loopback development server. Never expose this mode through a tunnel or bind it publicly.

`npm run test:multiplayer` runs real two-client socket tests (needs localhost networking). `npm test` includes all regression suites. Local persisted test records are in the ignored `.local-multiplayer/` directory. Do not publish that directory.

## Production checklist (not executed)

1. Owner identity is verified (gcloud can read **ayothaya-folk-mystic**). Remaining gate: billing is not enabled on the project; hosting choice and budget need owner approval. Do not silently deploy to a different project, and pass `--project=ayothaya-folk-mystic` explicitly.
2. Attach a dedicated runtime service account with Firebase Auth user-read permission (revocation check) and Firestore read/write access. Do not create/download a long-lived key into the repository. IAM grants require owner review.
3. Rules pass the local emulator suite (`npm run test:rules`, see below). Still to do: deploy and verify `firestore.rules`. Existing client character updates are denied while the owner's `multiplayerLeases` lease is live. `multiplayerProfiles`, `multiplayerLeases`, `multiplayerRuntime` remain private under default deny. Test owner/other-user/unauthenticated/online-lock/lease-expiry cases in the emulator and the selected project before launch.
4. Build `server/Dockerfile` from the repository root. Deploy one service, one instance, no traffic split, exact HTTPS origins, `AUTH_MODE=firebase`, project ID and room capacity. For Cloud Run, use WebSocket timeout/reconnect support. Public ingress is required for browser sockets, but no game session is accepted without a verified Firebase token and owned slot. Review the exact service/IAM/billing changes before applying.
5. Verify `/health`, two distinct Google accounts on separate devices, same-room visibility, movement/skills, private party chat, wrong-token/wrong-slot/wrong-origin rejection, duplicate-login refusal, disconnect/reconnect, server restart, stale lease rejection, and cloud save roundtrip. Confirm saves after forced network failure. A clean shutdown attempts final saves; a sudden process crash can lose at most the last checkpoint interval and resets world mobs/parties/chat.
6. Set `MULTIPLAYER_URL` in `multiplayer-config.js` to the verified `wss://.../realtime` endpoint, deploy the frontend, and rerun mobile/desktop checks. Until then the public button must honestly say the backend is not enabled.

Global authority ownership is a fail-closed single-authority design. It is not horizontal scaling. During deployment/restart, players reconnect; a replacement process must wait for the old authority lease or clean release. A 100+ player rollout requires load/soak/bandwidth tests and further room partitioning, not merely raising a config number.

## Current service references

- [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Cloud Run WebSocket limits and instance coordination](https://docs.cloud.google.com/run/docs/triggering/websockets)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Vercel WebSockets](https://vercel.com/docs/functions/websockets): now supported in Beta; new connections are not guaranteed to reach the same instance and connections have maximum duration. This authoritative room implementation is packaged as a dedicated service; do not deploy an in-memory room per arbitrary Vercel function instance.

## Verification recorded on 2026-10-14

- 0.25 UI, local server, two browser tabs: room chat bubble over the remote player, invite toast accepted from the second tab, party frame and Party tab on both, party message tinted, reload kept the party, closing one tab showed it as disconnected on the other. Typing `eee vvv` in chat left the camera unchanged while E outside chat rotated it. 1280×720 and 844×390: no element overlap with skills/joystick/minimap and no page overflow; roster dialog fits 844×390 without scrolling. Viewport emulation only, not a physical phone.

- Firestore rules emulator (`npm run test:rules`, 7 tests, offline `demo-ayothaya` project): owner-only reads; fresh-Novice creation at revision 1; next-revision and no-XP-loss saves with server timestamps; client writes refused while a live `multiplayerLeases` lease exists and accepted after expiry; Base Lv.25 class / Lv.60 job thresholds with Job EXP reset; `multiplayerProfiles`/`multiplayerLeases`/`multiplayerRuntime` unreadable and unwritable by clients, including clearing one's own lock; legacy saves frozen after migration. Mutation check: disabling the lease lock or opening character reads each makes one test fail. This is emulator evidence only; the rules are not deployed and no cloud project was touched.

- 84 regression tests; 13 multiplayer tests include two actual loopback WebSockets, persistent local saves, rejected origins/tokens, reconnect, lease fences and server reward checks. Firebase transactions use a mock adapter; this is not a rules emulator or cloud test.
- Two browser tabs in the real capital: separate male/female Novices, movement, visible remote avatar, invitation/accept, party chat received, explicit leave, browser reload and rejoin retaining the party within 20 seconds. No browser console errors in the final run.
- Landscape viewport 844 × 390: online dialog 321 px high, no dialog overflow or page horizontal overflow. This is viewport testing, not a physical phone performance result.
- 50 real local sockets for 3 seconds: 1,250 snapshots, 10.14 MiB received total, approximately 68.9 KiB/s per client and 2.2 ms local p95 roundtrip. A short smoke test only; no cloud capacity/latency guarantee.
- Camera zoom, heading and motion preference are the only optional client-owned settings in save requests. Progress and positions are captured by the server. Consecutive save requests receive acknowledgements instead of silently timing out.
