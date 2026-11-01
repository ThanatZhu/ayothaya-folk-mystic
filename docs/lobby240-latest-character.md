# Character selection 240

The stepper spans the dialog. Existing characters use their server-owned visual equipment and appearance. The preview cycles run and attack without pose buttons, with reduced-motion support. Stats use the same derived snapshot as Realm (including gear, pets, food and rebirth); unavailable server data never displays invented base stats.

## Read-only backend dependency
GET /character/previews requires the current Firebase Bearer token. Only that UID's slots are returned. Reads do not acquire a lease, join a room, or write saves. Live players use the current Realm snapshot; offline players use the authoritative private profile and the same formula. A new client-writable mirror is treated as a fresh novice, as in acquisition.

Backend implementation: branch codex/lobby240-read-preview. Test: node --test tests/character-preview240-host.test.mjs.
UI evidence: outputs/lobby240/report.json, desktop.png, portrait.png, landscape.png, hunter.png, and video/ (local artifacts, not shipped). Fixtures are test users, not production characters.

## Deployment dependency and continuity
Publish the backend endpoint before the frontend. Deploying the backend may replace the DigitalOcean process and disconnect existing sockets; do not claim zero downtime. The owner previously requested uninterrupted farming. Obtain an operational rollout window before pushing main. Merge the current frontend-live history into the backend rollout so it cannot restore an obsolete web UI. Check authenticated endpoint output before promoting the frontend. Retain all old frozen releases. Do not publish only the frontend against an old host (the preview would correctly show unavailable).

Validation: endpoint rejects unauthenticated requests, ignores foreign UID query, leaks neither credentials nor inventory, leaves leases/saves/sessions unchanged, matches actual Realm derived stats online and offline. Firebase mock verifies owner-only paths and distrust of writable stats. Browser test verifies run/attack, removed controls, equipped outfit, true stats, slot switching, three viewport widths, and safe unavailable state.
