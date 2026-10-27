# Map population

All ten hunting maps, including Mill Cellar, set `mobPopulation: 2`. `packSpawns` applies this after the original 4/5-member camp expansion so each ordinary monster type doubles exactly. Existing spawn entries and runtime IDs stay first and unchanged. Extra camps have independent pack IDs and their own leaders. Boss, elite, MVP and world-boss encounters retain their original numbers and combat/reward rules. Safe towns and the arena stay empty of hostile spawns.

Copies first try a shared camp translation onto walkable ground, then individual nearby offsets when terrain or an existing monster blocks a slot. The authored maps pass checks for walkability and unique added homes with no stacking on old spawns. The constructor never mutates authored map data or expands again on respawn. Offline clients and authoritative rooms use the same deterministic function.

| Map | Ordinary monsters before | After |
|---|---:|---:|
| Rice Fields | 58 | 116 |
| Old Orchard | 40 | 80 |
| Moonlit Mill | 27 | 54 |
| Mill Cellar | 8 | 16 |
| Lotus Marsh | 45 | 90 |
| Bamboo Grove | 27 | 54 |
| Ruined Temple | 27 | 54 |
| Himmapan Edge | 27 | 54 |
| Naga Cave | 27 | 54 |
| Kailash Peak | 27 | 54 |
| **Total** | **313** | **626** |

The 26 special encounter spawns remain unchanged. Rice Fields therefore has 119 total authored/runtime monsters after the change, including its three special encounters.

Walking ambient residents halve: Ayutthaya 32 → 16; Lablae 24 → 12. Both retain all eight styles. Lablae keeps three residents on each of its four circuits with original stable IDs and staggered phases. Fixed quest/shop NPCs, teachers, routes and collision geometry remain unchanged. The city builder now generates 16 residents and `lablaeCitizens()` generates 12.

After re-exporting authored maps, run `node scripts/apply-population195.mjs`. It applies the population flags and citizen targets idempotently; it never duplicates raw spawn rows. Default/synthetic combat configurations without the flag retain their original population.

Validation: the full Node suite passes (809 passed, 14 skipped); dedicated population tests check exact per-type counts, stable IDs, independent camp leaders, non-stacking walkable homes, respawn, and channel switching. `node scripts/check-population195.mjs` verifies the real rendered game and local server agree on Rice Fields (119 mobs), Ayutthaya mobile (16 residents/eight teachers), and Lablae mobile (12 residents), with no browser errors. Its temporary test context grants local-network access to its loopback origin only.
