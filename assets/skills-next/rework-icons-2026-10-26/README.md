# Skill icons · 2026-10-26

Generated with built-in image_gen using the exact eight prompt blocks in `docs/skills-icon-prompts.md` and `assets/skills-next/role-skills-v1.png` as the style reference. Full original and final generation prompts are in `generation.json`.

- Eight final PNG atlases at this directory root: Novice 1024 × 256, the seven main classes 1536 × 1024.
- Every final slot is exactly 256 × 256 with a 20 px internal safe area. Main classes have 23 icons and an empty last slot.
- `icons/` contains all 165 individual 256 × 256 PNGs in row-major order: 80 active, 22 ultimate and 63 passive.
- `icon-map.json` records each icon's class, kind, atlas rectangle and individual filename.
- `raw/` preserves the eight selected source images as delivered by image_gen. Generated cell spacing varied, so `pack-sheets.ps1` uses measured source boundaries, preserves each illustration's aspect ratio, and mechanically packs the final exact-size atlases. It does not repaint artwork.
- `index.html` previews every sheet and every icon at 44 px. Open it in a browser.

Order follows the source document: class skills on row 1, first Master branch on row 2, second branch on row 3, class/branch passives on row 4. The Novice strip contains its three active skills and ultimate.

These are delivered artwork files only. No runtime icons or gameplay files have been replaced, committed or pushed.
