# Mirrored actor lighting 160

Painted animation mirrors X positions to turn left. This reverses triangle
winding but leaves the authored normals intact. Three's double-sided Lambert
shader then reverses the interpolated normal on those back-facing triangles,
changing sun and hemisphere lighting even after the actor leaves actual shade.

`stabilizeBillboardLighting` keeps the authored, camera-facing normal for lit
actor billboards. It composes with the existing shader hook and uses a distinct
program cache key. Both global actor proxies and the rice lighting prototype
use it. Cast/receive shadows, current animation frames, colour/opacity updates,
source picking, geometry ownership and low-quality contacts remain intact.
Boot, viewer and both preview dependency chains advance to `shadow160`.

Validation (2026-10-25):

- `node scripts/check-shadow160.mjs --repro` records the former GPU behaviour.
- `node scripts/check-shadow160.mjs` checks a coloured silhouette and the actual
  animated male shaman at 1280x720 and 844x390. It compares facing directions,
  real roof shade, departure into sunlight, shadow maps disabled, self-casting
  disabled and three repeated crossings. No page or GLSL errors. The shaman's
  sunlight luminance before/after turning was 54.40/39.36 before the fix and
  54.40/54.37 after; real roof shade remains darker at 48.16. At mobile size it
  returns to 55.61 versus 55.81 initially. These are desktop Edge GPU readbacks,
  not physical phone measurements.
- The 13 world-lighting, water and Lablae tests pass.
- `node build-vercel.mjs` builds the static game. The five-map real-game smoke
  test checks actor visibility, original sprite picking, quality settings,
  opening the bag and player movement.

GPU measurements and screenshots are written to untracked `outputs/shadow160/`.
The fixture uses two settled draws after changing renderer state before its
pixel readback, and samples only the alpha-tested character silhouette.
