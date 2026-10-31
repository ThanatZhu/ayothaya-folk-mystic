# Consistent idle / locomotion proportions — 235

The owner reported that the novice grows when walking. The 220 packer split generated sheets into equal-height rows before extracting alpha. Several figures, including the novice sandals, cross those nominal boundaries. Fitting the remaining cropped body to the intended height enlarged the head and torso.

The new pack extracts complete connected figures from the full master first. The shared watershed extractor now accepts an explicit grid size; its attack defaults remain unchanged. Each walk/run view keeps one crown-to-sole scale for the complete four-frame clip, using contact phases 0 and 2 as the reference. Run flight clearance remains authored. No per-frame body stretching or animation speed change.

All 16 class/gender variants have rebuilt HD and SD atlases in assets/character-gait235. The original 220 assets and frozen releases remain unchanged for existing clients. The reviewed male boxer 217 art remains unchanged in appearance. Custom cosmetics/crafted equipment retain the existing equipment-aware fallback. Physics, hitboxes, movement, combat timing and server authority are unchanged.

Rebuild with Python/Pillow/NumPy: scripts/build-character-gait235.py. Calibration includes complete source bounds, output bounds, crown, sole and per-clip scale. Never crop a figure at the nominal grid row before body measurement.

Validation: 22 focused renderer, sizing, equipment fallback and attack checks; 2 new extraction/packed-frame regressions; 3 existing attack extraction regressions. The real createPaintedAvatar WebGL renderer loaded every class/gender at HD and SD and sampled idle, both grounded walk phases and run in all eight directions (1,024 samples), with no page errors. Novice male east measured 110 px standing / 111 px walking in HD and 110 / 112 in SD at the fixed test camera; the 1–2 px difference is texture sampling. All 2,048 HD/SD packed cells have safe alpha margins. Private evidence: outputs/size235, including renderer galleries and raw comparison.
