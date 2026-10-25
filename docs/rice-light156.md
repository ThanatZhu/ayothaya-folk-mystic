# Rice-field lighting study 156

Open `/rice-light-lab.html`, or `node scripts/check-light156.mjs --serve` for a
loopback preview at port 8923. This is an opt-in study only. No live game module,
map, saved graphics preference, wallet, multiplayer or movement code is changed.

Both sides load the actual v5 rice-fields GLB, scene preparation, deterministic
meadow placement, avatar, camera and existing shadow-box stabilization. The
desktop baseline reproduces the live day lights, bloom and soft-look finish.
The phone baseline omits post bloom/blur on both sides to compare the lightweight
profiles fairly; it is not a claim to reproduce every saved live graphics tier.

The candidate reduces ambient fill, uses a slightly warmer angled sun and green
ground bounce, soft PCF shadows, subtle grass-root shading, sparse instanced
radial contact stamps, and restrained bloom without tilt-shift blur. The phone
profile uses a 1024 shadow map, low meadow density, fewer contact stamps and no
bloom/blur. Contact masks are code-native radial gradients, not generated art.
The existing rice/grass wind shader remains attached when root shading is added.

The slider is a full-camera wipe; it does not compare different camera crops.
Three view presets, shared orbit/zoom, wind pause and a timing button are included.
At either end of the slider only the visible scene is rendered. During comparison
both scenes render, so comparison-page FPS must not be treated as game FPS.

`node scripts/check-light156.mjs --bench` checks 1440×900, touch 844×390 and touch
390×844, page/GLSL errors, control bounds, page overflow and screenshots. It runs
the two profiles sequentially at identical viewport and pixel ratio with 30
warmup frames and 90 measured frames per profile. GPU timings use the disjoint
timer extension when available; CPU submission timings are separately labelled.
The loopback test uses desktop Edge touch emulation, **not an actual phone GPU**.
Output: `outputs/light156/checks.json` and before/after screenshots. There is no
automatic performance pass threshold or assertion that the new profile is faster.

Verified 2026-10-25: all three viewport checks passed, with no page/GLSL errors,
overflow or offscreen controls. On the test desktop, GPU medians at the canal
view were 28.30 → 23.04 ms (1440×900 desktop profile) and 7.15 → 7.26 ms
(844×390 emulated touch profile), DPR 1, 90 frames each. These are local samples,
not device-independent frame-rate guarantees.

Before enabling in the game: review the look, measure real iPhone/Android GPUs,
wire the profile before `createWeather` captures its light bases, preserve
`followSun` texel snapping, and respect graphics quality settings. Do not replace
every map's day/night/mood values with this rice-only study.
