# Water surfaces 158

All current scene maps use `prepareSceneV2`; water is identified from material
names, not only `waterAreas` (the cellar and guild trough have no water-area
rectangles). The 13-map catalogue contains water on 12 maps, including two
distinct surfaces on rice-fields and a waterfall material on himmapan-edge.
Kailash Peak has none. Names such as water buffalo and waterfall rock are excluded.

`water-surface158.js` adds advected, irregular analytic waves, moving surface
normals, restrained sun highlights/sky Fresnel tint and soft shoreline highlights
to the existing material. It uses one small RGBA data field per water material:
distance from the actual projected water geometry plus local flow direction.
This follows water shape/land holes rather than drawing a rectangular foam frame.
Nearby `waterAreas` guide canal/stream axes. Pools/paddies/troughs move slowly;
waterfalls use downward world-height motion with an across-surface tangent,
independent of their orientation. Horizontal outflow triangles sharing the same
waterfall material retain horizontal river flow.

No water mesh displacement, water level, navigation, bridge, collision, game
logic, reward, multiplayer packet, atlas UV or shared image is changed. Existing
safe standalone texture motion remains. Geometry/materials of roofs, timber,
leaves and terrain are not water effects. One clock updates uniforms per frame;
no per-frame textures or extra reflection scene renders are allocated. Reflections
are sun shading and an approximate sky response, not mirrored scene geometry.

Distance fields are 256 px maximum axis on desktop and 192 on touch devices.
The shader works with PBR and the existing low-quality Lambert conversion.
Reduced motion and the existing scene motion toggle stop the clock. Fields are
disposed with the map. The effect is enabled through the scene preparation used
by the game, with boot/viewer/scene cache URLs updated. Lighting/shadow studies
remain separate; this does not globally enable their experimental lighting.

Review `/water-lab.html`: map/quality selectors, old/new toggle, pause and a
waterfall camera. `node scripts/check-water158.mjs --serve` serves the lab at
loopback port 8924. It has no character, account or wallet I/O.

Validation (2026-10-25):
- `node --test tests/water158.test.mjs tests/lablae-materials-citizens.test.mjs`:
  8 passed. Coverage includes all GLB water material names, shared atlas safety,
  water/rock/animal distinction, shore land holes, slow pool/river/fall profiles,
  unchanged geometry/UVs/navigation, disable/restore and one-time disposal.
- `node scripts/check-water158.mjs`: 22 browser cases passed. All 13 maps on
  desktop, four representative maps each in touch/low, plus portrait wetland.
  Tests capture actual pixel changes at two water times with all other scene
  motion frozen, verify visible water on all 12 maps, render both Standard and
  Lambert shaders, and check page/GLSL errors and overflow. Waterfall camera
  screenshots are also captured. Outputs: `outputs/water158/`.
- `node scripts/check-light156.mjs`: existing character/meadow shadows and
  moving actor preview pass in desktop, landscape touch and portrait touch.
- Built the full static game and ran `check-running153.mjs <playwright path>
  --smoke` against an isolated authority with 180 ms latency each way: manual,
  quest/map routes, menu opening, pace changes and page freeze passed with zero
  correction jumps. Updated that fixture to mark presentation-only story
  cinematics as seen so a newly added intro cannot intercept its controls.

Touch cases are desktop Edge emulation, not real iPhone/Android GPU tests.
CPU submission timings in the QA output are diagnostics, not FPS/GPU guarantees.
