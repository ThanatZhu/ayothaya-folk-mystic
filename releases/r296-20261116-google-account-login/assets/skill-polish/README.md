# Three painted skill samples

Preview: `/skill-polish-lab.html`. Art/contact sheets: `/skill-polish-art.html`.

Only three clips are in scope: swordsman's cross slash, hunter's rooster dash-peck, and acolyte's lotus revival. This does not replace production combat, server rules or the other skills.

## Art

Generated using the built-in `image_gen` tool, then copied into this workspace without modifying the PNG pixels or alpha. Exact final prompts are preserved in [art-prompts.md](art-prompts.md).

- `cross-slash-v1.png`: eight painted slash / cross / dissipating-fragment frames.
- `rooster-dash-v1.png`: eight full-bird anticipation / flight / peck / landing frames.
- `lotus-revive-v1.png`: eight lotus unfolding / soul-light / drifting-petal frames.

Each source is RGBA, 1774 × 887, a 4 × 2 grid. The native dimensions were retained; UVs address the normalized cells without raster resampling. Original generation output remains in the Codex generated-images directory. Some source cells have tight margins, so mipmaps are disabled and UVs use a small inset to limit neighbouring-cell bleed.

## Playback

`timing.js` deterministically samples poses, travel, hit beats, revival and particle frames. `painted-vfx.js` shares atlas source images across UV frames, overlays subtle additive glow and motes, and disposes owned resources. Character poses reuse the game's existing complete authored artwork; no limb cutting, mesh warping or new character sheet is presented as newly drawn. The acolyte ally uses the existing sleep and stand-up clips, sampled directly so seeking is repeatable.

The comparison button keeps character timing and the camera fixed while switching to the earlier geometric effect manager. The standard camera approximates game viewing scale; zoom is available to inspect edges. Playback supports pause, 0.5× / 0.25×, exact beat buttons, arbitrary seek and replay. Camera shake is brief and attack-only, and reduced motion disables it and root travel.

Validation: `node --test tests/skill-polish.test.mjs`; browser runner `scripts/check-skill-polish.mjs <Playwright index.mjs>` with an unused `MOBILE_REVIEW_PORT`. Browser checks cover all three painted/old comparisons, female actor, seeking, repeated texture allocations, four viewport sizes and reduced motion. Screenshots and checks are in `outputs/skill-polish/`. No real iOS or Android device test is claimed.
