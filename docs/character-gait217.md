# Boxer painted locomotion 217 — 30 October 2026

The approved four-pose walk and a separate four-pose run are used by the actual game renderer for the male boxer in his original appearance and class gear. This release does not deploy the abandoned cut-out rig, mount experiments, or animation study pages.

## Assets and placement

- Runtime: `assets/character-gait217/boxer-male.json` and two 832 × 1664 transparent PNG atlases.
- Four columns; rows S, SE, E, NE, N, NW, W, SW. SW/W/NW mirror SE/E/NE.
- Each 208 × 208 cell shares the waist anchor x=104 and ground y=196. A single scale is used per view/clip. Run contact poses stay grounded; flight poses preserve clearance.
- Original generated sources and packing measurements are under `docs/character-gait217-sources/`.
- Rebuild: `python scripts/build-character-gait217.py` (Pillow required).

## Runtime

`painted-gait217.js` loads the two shared atlases once. `rigged-sprite.js` selects UV windows using actual distance phase; `painted-avatar.js` supplies camera-relative direction even when the older deformable directional actor is disabled. Local and remote actor placement suppresses the extra procedural bob for these authored clips.

Idle, attacks, skills, damage and resting retain their existing artwork. Female boxers, other professions, dyed/custom silhouettes and crafted weapons retain the gear-aware existing renderer. Failed optional gait loading also retains the existing renderer.

## Validation

- Production static build passed.
- 44 renderer, posture, direction, movement and running tests passed.
- A fresh loopback realm account entered the actual `game.html` scene. Keyboard movement exercised walk and run; both sampled all four indices; walking exercised all eight headings and running exercised seven unblocked headings. The renderer tests cover all eight headings for both clips. Releasing movement returned to idle. No browser JavaScript errors occurred.
- Normal-motion browser recording and extracted running frames were inspected at game scale. Private evidence is in the uncommitted `outputs/gait217-qa/` directory.
- The existing local fixture does not serve MP3 files; its audio 404s are unrelated to this change.

