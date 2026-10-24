# Combat timing and boss reports — 129

## Findings and changes

Rogue's dagger still has the existing size modifiers (medium 0.85, large 0.70). This release fixes combat defects rather than raising every dagger coefficient. Judge builds by encounter DPS, not one hit against a large boss.

- Base poison could overwrite stronger Master venom, including its owner. One strongest poison per caster now ticks independently. AUTO skips replacing an active stronger poison. Tick phase survives refresh, and the final full-duration tick is delivered.
- Venom detonation previously added already resolved poison to raw skill power, then multiplied ATK, size and defence again. It now combines one resolved base hit with the remaining resolved poison once. Detonation cannot consume another caster's poison.
- Assassin's learned last-drop passive now applies once to basic attacks, skill damage and poison below 35% HP. Previously only the role skill helper applied it.
- A 3–5 second effect lifetime held the body pose even after combat resumed. Body recovery now ends after the final impact plus 0.16 seconds; the approved painted particles can fade independently.

`combat-timing.js` shares basic duration/impact/period and direct multi-hit skill beats. Live basic attacks and Novice skills reserve an attack/cast first and resolve damage on the authority at impact, with target/range/wall and interruption checks. Each cast has an actor-local ID and each direct skill hit has an index. Direct multi-hit attacks divide base power between beats; they do not repeat full power. Persistent fields and summons retain their periodic combat ticks.

Combat presentation advances with render time at low FPS and while an online utility window is open; movement and offline simulation keep their existing pause/clamp rules. Both clients present casts, damage, misses, cancellations and snapshots on one 120 ms buffer to absorb 10 Hz network batching. They do not fabricate damage. Authored attack clips use normalized attack progress; role poses use the approved profile's explicit artwork frames instead of a generic cast clip at world time. Ordinary incoming damage still tints the character but does not hide a committed swing; explicit stun/sleep cancellation ends it. Particle contact uses the hit beat, including early projectile launch. Cancellation is scoped to the actor as well as the cast ID.

The authoritative simulation runs at 20 Hz. Impact resolution is therefore within one 50 ms simulation tick, plus network delivery/frame presentation. This does not claim zero-latency networking. Legacy non-role standalone tests keep their old immediate combat behavior; the actual game and host enable the live role world, including Novice.

## Boss report

All boss types, including chapter-two field bosses, timed MVPs, admin summons and dungeon bosses, collect effective HP damage per encounter. Poison, skill fields, summons and premium pets credit their caster through the same damage path. Overkill is capped to remaining HP. Private character keys combine reconnecting sessions internally; reports expose only public session IDs, names and classes. Identical names remain distinct. Disconnected contributors remain in the report.

The report is sent once to the defeated boss's room. It includes rank, total damage, share and encounter DPS; encounter time runs from first effective hit until defeat, with a 50 ms minimum. Ties preserve first-contribution order. Existing MVP prize eligibility and respawn timers are unchanged. Ranking reports do not grant items.

The centered report highlights the highest damage dealer and the viewing player, supports desktop and phone layouts, and retains the last five reports for this page session. Reopen through MVP in the secondary menu. Reports are ephemeral and reset on page reload; currency and saved characters are unaffected.

## Verification

- `tests/combat129.test.mjs`: authoritative impact times, fast/slow attack cadence, Novice cost and release, all direct multi-hit skill beats/damage count, poison isolation/refresh/final tick, detonation scaling, Master passive, AUTO, projectile contact, actor-scoped cancellation, presentation queue, overkill, simultaneous bosses, field bosses and reconnect attribution.
- `scripts/check-combat129.mjs <absolute Playwright module>`: a fresh local store and real WebSocket host, one rendered player and a remote participant, actual equipped artwork, network timing assertions, remote killing blow, report reopening and bounds at 1440×900, 844×390 and 390×844. Fixtures never connect to production accounts or grant production items.
- Full regression suite, build, translation coverage and screenshot review before release.

Health capabilities: `combatTiming: 2`, `bossResults: 1`.
