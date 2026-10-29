# Painted four-frame locomotion 220

All eight playable professions, including novice, have male and female painted walk/run clips: 16 variants, 32 clips and 1,024 runtime frame windows across eight camera-relative views. Each action uses four distance-driven phases. S/SE/E/NE/N are painted; SW/W/NW mirror their matching right-facing views.

The existing approved male boxer art from release 217 is reused. The other 15 character sheets were created with the built-in image_gen tool using the original game identity sheets and the approved boxer walk as the motion reference. The duplicate spear in the male lancer rear views was corrected before packing.

## Files and rebuilding

- Runtime images/metadata: [assets/character-gait220](../assets/character-gait220/catalog.json).
- Generated sources, identity references, prompts, source hashes and measurements: [docs/character-gait220-sources/prompts.json](character-gait220-sources/prompts.json).
- Build with Python, Pillow and NumPy: `python scripts/build-character-gait220.py`.
- HD atlases: 1,024 × 2,048, cell 256; phone atlases: 512 × 1,024, cell 128.
- Packing measures the head-to-sole body separately from tall weapons, uses one scale for the whole clip and anchors the hips/ground. Run flight frames retain clearance. The crop compiler checks all transformed bounds before composition, to catch output cropping.
- Isolated transparent sheet noise is removed by keeping the connected figure; authored costume colours remain intact.

## Runtime and compatibility

`painted-gait220.js` validates class/gender manifests, selects phone artwork on narrow/coarse-pointer devices and shares atlas textures per class, gender and tier. Only the variants needed by actors in the scene are loaded. Both local and multiplayer avatars use `rigged-sprite.js`; distance phase, camera-relative direction and authored ground placement remain shared.

These sheets cover each profession's original appearance and class gear. Customized silhouettes, dyed outfits and crafted weapons keep the existing gear-aware artwork when the new sheet cannot represent them. Idle, attacks, skills, damage, resting and gameplay movement authority retain their existing behavior. Optional image-load failure retains the previous renderer.

## Verification

- 47 renderer, metadata, posture, equipment-fallback, movement and running checks passed.
- Production static build passed.
- All 16 class/gender avatars were loaded and exercised with actual keyboard walk/run controls inside the existing game scene, at both desktop HD and phone SD sizes: 32 cases, no JavaScript errors or missing non-audio assets.
- Class/gender changes were checked against the actual loaded texture URLs; they cannot display another variant's cached sheet. Unit tests cover all eight views and all four phases for each action.
- Normal-motion game recordings, desktop/mobile contact images and extracted playback frames were inspected. Private QA evidence stays in uncommitted `outputs/gait220-qa/`; no new animation review page is shipped.
- The existing local fixture omits MP3 static serving, so its unrelated audio 404s were excluded.

