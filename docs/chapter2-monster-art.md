# Chapter 2 monster art and animation review

The roster now has **25 original creature designs across five hostile maps**:
bamboo-grove, ruined-temple, himmapan-edge, naga-cave and kailash-peak.
Each map has three common creatures, one elite and one boss. Lablae remains a
safe town. Heights, level bands and behaviors remain design proposals.

This delivery adds 20 new transparent idle illustrations and 25 authored
eight-pose animation atlases (200 poses total), including the original bamboo
set. It does **not** add live spawns, damage, drops, quests or catalog indices.
Every manifest entry remains explicitly `gameReady: false`.

## Files and generation

- `assets/monsters-chapter2/<id>-idle-v1.png`: original full-size designs.
- `assets/monsters-chapter2/animations/<id>-poses-v1.png`: original RGBA atlases.
- `assets/monsters-chapter2/animations/<id>.json`: frame rectangles, alpha
  clipping masks, contact anchors, shared scale and playback timings.
- `designs.json`: roster, measured source dimensions/content bounds (alpha >= 8),
  proposed visible body heights and honest review status.
- `prompts.json`, `production-prompts-v2.json`, `animation-prompts-v1.json`:
  exact prompt sets and reference roles. All art used built-in image_gen;
  no external image API or CLI fallback. Original PNGs are preserved without
  resampling or pixel editing.

## Playback contract

Eight authored key poses follow the existing monster state convention:
idle (0), locomotion A/B (1–2), wind-up (3), strike (4), hurt (5), recovery (6),
down (7). The review includes locomotion, attack, hurt and non-looping down clips.
The idle clip currently holds pose 0; it is not a separate breathing animation.
These are a first key-pose animation pass, not a finished high-frame-count rig.
Locomotion detail and smoothness still need artistic review before release.

All poses use one scale derived from frame 0's visible height. A crouch or
downed pose therefore stays naturally lower. No per-pose fit-to-box scaling,
CSS bobbing or static squash is presented as authored animation. Birds use
wing poses, snakes use body curves and rabbits/toads have hop poses.

Generated silhouettes are not perfectly aligned to a strict 4×2 grid. Some
wings and attacks overlap neighboring *bounding boxes* without touching the
neighbor's actual silhouette. Read-only connected-component analysis records
`clipRows` to isolate each sprite during canvas rendering. It avoids chopping
off a wing or importing pieces of the next pose. Alpha >= 8 defines the retained
silhouette. Every source atlas is untouched. Stone Garuda's strike is mirrored
at render time to keep its facing direction consistent.

`chapter2-monster-art.js` loads only the active map's five atlases and prepares
its frame canvases. It provides a renderer and state-to-frame selection for the
review. It does not modify the production loader `monster-art.js`.

## Review and validation

`monster-design-lab.html` has five map tabs, shared action controls, speed,
pause, individual frame selection, a large selected-creature view, dark/light
backgrounds, downloads and a scale lineup beside the real normalized Novice.
It imports the game's `WORLD_BODY_HEIGHT` and `CHARACTER_WORLD_SCALE`.
Proposed visible body heights are **not** live sprite-rectangle height values.

Run:

```powershell
python scripts/inspect-chapter2-monsters.py
$env:MOBILE_REVIEW_PORT='8918'
node scripts/check-monster-designs.mjs <absolute-path-to-playwright/index.mjs>
```

The inspector only reads PNG pixels and writes JSON metadata/reports.
It checks nonempty distinct silhouettes, transparency and source-edge clipping.
The browser check renders all 200 poses at 1280×900 and 390×844, checks alpha,
canvas clipping and horizontal overflow, exercises real locomotion playback,
and captures all five maps on dark/light backgrounds. Reports and screenshots
are in `outputs/monster-chapter2/`.

After art approval, integrate through an explicit new-loader path, append-only
catalog IDs, safe spawn positions, stats, drops and server/client data checks.
Do not replace existing monster indices or treat this art preview as populated
production maps.
