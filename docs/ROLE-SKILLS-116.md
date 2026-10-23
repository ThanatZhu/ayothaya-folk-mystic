# Role skill release 116

The live viewer and production host now use the role skill catalog: 7 classes, 14 existing Master paths, 84 active skills and 28 passives. Novice retains its original skill set. The 15-slot save format remains: base skills 0–5, reserved 6–9, Master actives 10–12 and passives 13–14.

Old class allocations are archived in the private `roleSkillBackup`, then refunded once using `_roles116`. Novice allocations and earned points are preserved. Private `roleCooldowns` carries all 15 cooldowns and the downed timer across travel/relog; neither private field is written to the client-readable Firestore mirror.

Combat is authoritative in `role-combat.js`. Select a party member in the party roster to heal, protect or revive them; the default friendly target is yourself. A fallen ally remains down for 20 seconds. Movement interrupts a revive. Auto configuration and hotbar order are edited with the enlarged Auto button's gear, separate from skill learning. The positions tab also offers ground aiming for area skills.

Painted effects use the approved 17 atlases with bounded renderer pools (3 desktop, 2 compact) and shared companion textures. Reduced motion disables shaking. Server Docker includes only the catalog and pure timing/profile modules, not image atlases.

Validation: `node --test tests/*.test.mjs` (439 passed), `node build-vercel.mjs`, and `node scripts/check-role-release.mjs <absolute Playwright module path>` (all 7 classes, no browser errors or failed resources). Browser script uses isolated local characters and server; it does not access production accounts. Screenshots and logs are in untracked `outputs/role-release/`. A minimal server package containing the same source files as Docker was also started and checked through `/health`.

Deployment: push the branch to main for the existing Vercel frontend and DigitalOcean backend auto deploys. Verify `/health` has `roleSchema: 1` and `authority: true`, then confirm the frontend exposes the new modules and images. Reverting the release requires reverting frontend and backend together; preserve the private archived skill allocations when restoring an earlier skill tree. `ROLE_SKILLS=off` is available for server diagnostics only and must not be mixed with the new live client.

Physical iOS/Android devices and prolonged multiplayer balance still need live playtesting; browser emulation does not replace device testing.
