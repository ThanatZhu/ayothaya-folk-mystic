# Chapter 2 creature design review

The first deliverable is five original transparent idle illustrations for
`bamboo-grove`. It does not add live spawns, damage, drops, quests or animation.
All entries are explicitly `gameReady: false`. The remaining four hostile maps
have a proposed roster (three common creatures, one elite and one boss each).
Lablae stays a safe town. Level bands and behaviors are design proposals.

Art is saved under `assets/monsters-chapter2/`. `designs.json` records the exact
source dimensions and visible content rectangle (alpha >= 8), so different
canvas padding cannot change the comparison size. `prompts.json` contains the
exact built-in image_gen prompts and reference paths. No external image API or
CLI fallback was used. Source PNGs are retained without resampling or pixel edits.

`monster-design-lab.html` shows the five designs on dark/light transparent
backgrounds, both individually and beside the real normalized Novice art.
The comparison imports `WORLD_BODY_HEIGHT` and `CHARACTER_WORLD_SCALE` from
the game; proposed monster heights are applied consistently with no per-image
auto-enlargement. These proposed visible body heights are not yet live monster
sprite rectangle heights. Animation must keep a uniform scale across a clip.

After the design review, the existing runtime needs these eight authored poses:
idle (0), walk A/B (1–2), wind-up (3), strike (4), hurt/recovery (5–6), down (7).
Each creature needs a stable identity, limb ownership, common foot baseline and
single scale through all poses. Inspect the actual walk/attack playback before
adding append-only IDs to `monster-catalog.js` and configuring spawn locations.
The current static illustrations must not be duplicated across eight frames
and reported as completed animation.

The existing loader uses `assets/frontier38/<sheet>.png` and metadata with
`rects`, `columns: 8`, and one scale per row. New sheets will need a deliberate
loader path or placement compatible with that contract, not just new map IDs.
