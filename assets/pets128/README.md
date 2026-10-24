# Companion motion and skill art (128)

Generated with the built-in `image_gen` tool using the approved `assets/pets125/` portraits as identity references. Each pet has six newly authored poses: three movement poses and three cast/attack poses. Ground pets articulate their legs; flying pets articulate wings, and the naga changes its coil. The runtime uses the same art for the owner and other players.

Final game assets are saved in this directory:

- `motion/<pet-id>.webp`: transparent 960 × 640 sheet, six 320 × 320 cells.
- `motion/<pet-id>.json`: clip timings and original crop bounds. Movement loops; attack plays anticipation, strike/cast and recovery.
- `skills/<pet-id>.webp`: transparent circular 256 × 256 skill icon.
- [Pose prompts](prompts.json), [skill atlas prompt](skill-prompt.json): exact prompt set and built-in-tool provenance.

Pet IDs: `garuda-dawn`, `lotus-naga`, `moon-kirin`, `golden-singha`, `yantra-owl`, `blossom-fox`, `rice-rabbit`, `jade-turtle`, `water-kingfisher`, `lantern-bat`.

Processing preserves source alpha, isolates connected silhouettes, uses one scale per sheet and a common baseline, and mirrors the naga's third pose to keep it facing right. No stationary-image warping supplies the gait. The skill atlas is cropped and circularly masked. Original generated sheets are preserved locally under `outputs/pets128/originals/`, outside the public game bundle. `scripts/prepare-pet-motion128.py` accepts a generation manifest when repacking originals.

Review: `pet-gacha-lab.html?v=128`. Real followers and pet skills are in `game.html`; test balances in the isolated preview never transfer into game characters.
