# Painted basic attacks — 224

Release: r227-20261030-attack224. Frontend presentation update.

Each of the eight professions has three basic-attack variations for both genders in the approved original costume. Each variation has guard, drive, contact/release and recovery poses, with eight view directions. Five views are drawn; the opposite three are mirrored during packing. Total: 48 clips and 1,536 packed body frames, in HD and SD WebP.

| Profession | Variations | Compact effect |
|---|---|---|
| Novice | lead jab, rear straight, palm | cream punch wind |
| Swordsman | downward, horizontal, rising cut | ivory/gold blade sweep |
| Lancer | thrust, sweep, rising thrust | amber spear trace |
| Hunter | standing, braced, low release | jade arrow |
| Boxer | jab, cross, short high strike | amber knuckle trace |
| Rogue | right dagger, left dagger, crossed cut | crimson/silver trails |
| Shaman | palm, empty-hand pulse, talisman gesture | cyan/jade wisp |
| Acolyte | palm, two-hand mantra, prayer-bead gesture | pale-gold lotus dart |

The shaman keeps one staff. The swordswoman's contact poses were corrected so the blade reaches forward rather than pointing behind her head.

## Sources and packing

- docs/attack-motion224-sources/: transparent masters, costume references, exact prompts, correction prompts, calibration and SHA-256 records. swordsman-female-pose-correction.prompt.txt describes the final swordswoman master.
- scripts/build-attack224.py: connected-figure extraction, common body scale, shoe/ground pivots, full weapon bounds, mirrored views, HD/SD packing and soft-edged FX packing.
- assets/attack224/: sixteen manifests, ninety-six body WebPs, four FX WebPs and catalog/FX metadata.

Run python scripts/build-attack224.py. Keep full source rows while extracting figures: polearms can cross a nominal cell margin. Per-view body heights compensate for weapon length; crouched frames do not get enlarged to standing height.

## Runtime

attack-style224.js, painted-attack224.js and basic-attack-fx224.js are shared by local and remote rendering. The authoritative cast ID selects the same variation on both. Multiple blades/trails do not create extra damage.

Server duration and impact timestamps remain authoritative. Hunter, shaman and acolyte release before the impact beat so the projectile can travel. Local basic body poses and FX use the existing monotonic role presentation clock; remote basics use a separate monotonic counter. Snapshot corrections cannot reverse these poses. Matching local damage numbers and the visible defeated monster can wait for the presentation beat. Server HP, loot and combat rules are unchanged.

An impact requires matching actor/cast basic damage confirmation. Misses, air attacks, cancellations and spirit damage cannot confirm it. Cold atlas loading keeps FX invisible until ready. Per-cast materials are disposed; shared atlases stay pooled. The existing sixteen-effect limit remains.

Body atlases share texture sources across UV frames, use a small idle LRU, and warm the local character's textures. Missing art preserves the previous usable character. Compatible original appearances use the new poses. Crafted/custom hair, costumes or weapons that fail posesFit retain their matching previous art. Skills and approved four-frame walking/running keep their existing rendering.

Very late casts can be finished before delivery; very fast casts can skip intermediate poses. They are not restarted from the beginning.

## Verification

~~~
node --test tests/attack224.test.mjs tests/combat-animation165.test.mjs tests/combat-vfx.test.mjs tests/magic-basic.test.mjs tests/painted-gait220.test.mjs tests/character-life-renderer.test.mjs tests/character-life-transitions.test.mjs
node scripts/check-frontend226.mjs origin/main
~~~

Real-game QA uses private local accounts and authoritative attacks in game.html. Recordings, browser results and the private helper are under local outputs/attack224-qa/. Temporary accounts and tokens are not committed.

## Publication

Follow docs/releases223.md: commit source/assets, choose a fresh release ID, freeze, commit the archive, build and verify retained releases. Publish only to frontend-live and the existing Vercel production project. Keep main and authority dependencies unchanged. Players retain their runtime until they choose Update.


Measured validation on 30 October 2026: 40 related automated tests passed. Real game.html ran 96 authoritative casts across all 16 identities in HD and SD (32 identity/tier cases), with zero browser exceptions, missing runtime assets or expired-delivery skips. A second client displayed matching variants in all eight views. Additional two-client checks confirmed remote impact after a camera orbit, high-speed timing (0.0989 s period / 0.08901 s body duration), misses, cancellation and a +10 s simulation-time correction. Misses/cancellations produced zero generated impact frames. Desktop normal-motion recordings and packed contact poses were inspected, including the corrected swordswoman. Local evidence: matrix-checks.json, extra/pair-checks.json and remote-fx/pair-checks.json under outputs/attack224-qa/.
