# CBT world reset

The owner’s admin header has one **Reset for CBT** entry. Opening it only reads a
preview. Execution requires a fresh actor-bound challenge (expires after five
minutes), typing exactly `RESET CBT`, and checking the acknowledgment. There is
no scheduled execution, URL trigger, or automatic reset on deploy.

## Scope

Both realms, all five slots per account, including orphaned subcollection documents:

- `multiplayerProfiles/{uid}/characters/slot-1` through `slot-5`: authoritative
  character, bag/storage, skills/stats, rebirth, quests, pets/Gold Bars and mail.
- `players/{uid}/characters/slot-1` through `slot-5`: lobby mirrors.
- `players/{uid}/saves/{server-1,server-2,main}`: old migration sources.
- Guilds, shops, leaders, market prices and account session leases.
- Shared announcement mail, map boss timers and dashboard gameplay logs.
- Live rooms, parties, invitations, arena/war matches and weather overrides.

Firebase Auth accounts (including anonymous accounts), admin access, balance
configuration, game assets/maps and private reset audit/backups are retained.
Offline guest characters saved only in a browser’s localStorage are not server
accounts and cannot be remotely erased by this server operation.

## Operation

`GET /admin/world-reset`, `POST /admin/world-reset/preview` and
`POST /admin/world-reset/execute` require a verified owner email from
`OWNER_EMAILS`, a valid Firebase ID token and an allowed origin. Secondary
`ADMIN_EMAILS` cannot reset the world. Loopback local development uses its
isolated LocalStore instead. Public `GET /game-status` exposes only maintenance
and schema status. `/health` advertises `worldReset: 1`.

Execution persists the job, stops simulation/new joins/HTTP mutations, drains
earlier requests and joining sessions, checkpoints and disconnects every player,
and drains shared writes. Every target is archived before any deletion in that
pass. Firestore delete transactions check both the world authority lease and the
matching private backup. Legacy migration sources are deleted before mirrors,
then private profiles. A final inventory must be empty before maintenance lifts.
The operation does not use the admin character list’s 2,000-row limit.

Backups use `multiplayerResetBackups/{jobId}/documents/{sha256(sourcePath)}` with
`{path, data}`. The backup root and `multiplayerRuntime/worldReset` hold status,
actor, timestamps and counts. Existing Firestore rules deny client access to
these paths. Local mode uses `reset-backups/{jobId}.json` and `world-reset.json`
beside the disposable/local profiles database. Backups preserve the first
version of each source across retries. They are never served as static files.

Failures retain maintenance and the durable job. The owner reopens the dialog,
checks data again and provides a fresh confirmation to resume the same backup.
A replacement host reloads durable reset status and shared data when acquiring
world authority, so a deployment cannot reopen a partially erased world or
restore a stale in-memory guild list. Shutdown during maintenance skips ordinary
world flushes. Restoring a backup is a separate deliberate server administration
operation; this feature does not expose an automatic restore button.

## Validation

`tests/world-reset166.test.mjs` uses disposable local databases and a strict
Firestore transaction harness. It covers scope, more than 2,000 profiles, backup
and authority requirements, exact confirmation/expiry/actor/replay validation,
failed backup and partial-delete recovery, real localhost HTTP/WebSocket joins,
stale saves, clean character creation and owner/origin authorization. No test
executes a reset on the production backend.
