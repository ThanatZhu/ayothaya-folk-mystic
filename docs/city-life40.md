# Ayutthaya townspeople and teachers

The safe capital has 32 ambient walkers using eight newly painted designs, and eight newly painted teachers representing all seven professions. Monk and nun teachers share the acolyte trial. They gather at the Teachers' Court (38, -70), marked by a gold star on the city map. Existing characters keep their classes and Master branches.

## Playable first version

- Talk within three world units. Townspeople pause locally to greet the visitor, then resume their route. Their ambient schedules share wall-clock time; they are scenery, not authoritative combat actors.
- Novice: Base Level 25, accept a teacher's trial, earn five new monster defeat credits outside the safe city, return to that teacher to change class.
- First profession: Base Level 60, accept a separate trial, earn fifteen new defeat credits, return and choose either of that profession's two Master branches.
- One trial per character. Cancelling discards its baseline; accepting again starts at the current kill count. Monk and nun may turn in each other's acolyte trial. Party defeat credits use the existing server reward eligibility.
- These are starter field trials, using the same objective type for every profession. They are not yet bespoke story quest chains or instanced examinations.
- Online level, position, HP and defeat totals come from the authoritative realm. The client sends only mentor/action/branch IDs. Advancement is acknowledged after checkpoint and lease release, then the game reloads its new profession. Job EXP resets; Base EXP remains.
- Trial data lives in each private multiplayer profile, not the client-editable Firestore mirror. Guest offline saves retain it per slot. The lobby and wardrobe direct class/branch selection now direct players to the court.

## Art and map maintenance

`assets/citizens40` contains original generated PNG atlases and exact generation prompts. Four poses per teacher, six per townsperson: idle, greeting, two front walking poses and two back walking poses. Runtime crops sample whole figures and align their feet; limbs are not cut apart or stretched.

`node scripts/build-city-life.mjs` rebuilds the court and pedestrian routes idempotently on the current capital. Run after older map builders. Routes use the same collision navigation as the player; only authored destinations pause, not intermediate pathfinding nodes. The cleared tree is removed from navigation, foliage and the old batched GLB trunk geometry at runtime.

Validation: `npm test` includes route sampling, every profession and branch, independent guest saves, private cloud profile invariants and an actual WebSocket class-change round trip. Desktop and 844 × 390 browser UI were checked; physical mobile hardware and real Google accounts were not used for this change.
