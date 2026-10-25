# World lighting 159

The approved lighting study is now connected to `viewer-world.js` on every map,
not just the rice preview. `world-lighting159.js` selects day, dusk, night,
cellar, cave or summit profiles. All 13 catalogue maps have a profile. Day uses
the approved warm directional light, reduced ambient fill and soft shadows;
night/indoor/summit keep distinct cool light and their existing emissive lamps.
The profile is applied after scene preparation and before weather captures its
base values. The following sun retains texel snapping and now follows the
player's actual floor height, including raised mountain terrain.

Raised props, foliage, reeds, rice and meadow cards cast shadows; ground/water
and transparent clouds remain receivers/non-casters. Grass/rice depth shaders
share the visible material's atlas UV and wind uniforms. Root shading is added
without moving geometry. No world geometry, navigation, water level, collision,
combat, rewards or network protocol is changed. Water158 continues to animate.

Painted player meshes, remote players, NPC/citizen sprites, monsters and pets
are discovered from alpha-tested world art. UI labels, additive effects and
unmapped meshes are excluded. The existing source object remains visible to
gameplay and ray picking, with its layers, animation ownership, texture maps,
UV transforms, tints, damage flashes and opacity intact. Only source colour/depth
writes are suppressed. A Lambert mesh proxy uses the current silhouette for
lighting and alpha-tested shadows. Mesh proxies share the posed geometry; Sprite
proxies reuse a four-vertex buffer updated for frame anchors and camera rotation.
Transparent/dead/hidden/removed actors and cloned materials synchronize, and
source material writes are restored on cleanup. Bridge x-ray depth tests and
render orders are preserved. Shared actor materials are reference counted.

Medium/high use full directional shadows (1024 on touch, 2048 desktop). Low
retains inexpensive contact shadows with dynamic shadow maps disabled, matching
the existing quality policy. Existing contact circles now have a radial fade.
The desktop finish removes tilt-shift blur/lifted blacks, uses restrained bloom,
and grades lightly. Touch skips the bloom pass. Saved graphics quality/FPS
settings and adaptive resolution remain in control.

A vegetation partitioning experiment was rejected after measuring a regression
on the touch-size desktop test. The shipped implementation retains original
map geometry/batching rather than trading fewer triangles for many more draws.
That measurement is not a real-phone FPS guarantee.

Review: `/water-lab.html?mode=lighting` exposes map/quality selectors and a
painted player in every actual map. Ordinary water-only review still works.
Boot/viewer/scene/finish cache versions are advanced to light159.

Validation (2026-10-25):
- `node --test tests/world-lighting159.test.mjs tests/water158.test.mjs
  tests/lablae-materials-citizens.test.mjs`: 13 passed. Includes moods, caster
  classification, shared wind, Sprite picking/anchors, posed geometry ownership,
  current-frame/tint/opacity/cloned materials, shared-material restoration,
  removed/hidden actors, low contact shadows and water/atlas safety.
- `node scripts/check-water158.mjs --lighting`: 22 cases cover all 13 maps on
  desktop, touch/low representative maps and portrait wetland. No page/GLSL
  errors or page overflow; actors cast and receive, low contacts remain.
- `node scripts/check-world159-game.mjs`: five isolated real-game cases
  (capital/high, rice/touch-mid, mill/night-high, naga/touch-low, summit/high).
  Source actor picking, visible proxies, quality policy, bag opening and manual
  movement passed. Roughly 31–66 actors visible per scene; no page/GLSL errors.
- `check-running153.mjs <playwright path> --smoke`: manual sprint, quest/map
  navigation, menus, pace changes and frozen-page continuation passed under
  180 ms latency each way, with zero correction jumps.

Artifacts are under `outputs/world159/`. Touch is desktop Edge emulation;
real iPhone/Android GPU measurements remain necessary before guaranteeing FPS.
