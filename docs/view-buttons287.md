# Camera view HUD buttons

Owner request: move the view switch to the right of the emote/run pair and generate matching 2D, 2.5D and 3D artwork. Keep one cycling control with three illustrated states. Use only the mode lettering, with the emerald/gold frame matching the emote button.

- Generated PNGs: assets/ui-view287; 256px sources rendered at 48px, matching the emote/run artwork.
- Desktop position: right of the life-controls column, aligned with the run button (owner adjustment). The button no longer adds a grid row above emote.
- Camera mode behavior and saved device preference are preserved. Mode names are available as an accessible label and tooltip; all three images preload.
- On a mobile HUD the button mounts under body, so hiding the desktop actionbar does not hide the switch. Breakpoint changes reparent the same button without recreating its state.
- Verification: isolated HUD harness with real actionbar CSS and extracted production mount/setView functions, at 1920x1032, 1366x768, 1024x768, 844x390 and 390x844. Verified equal 48px dimensions, desktop separation, mode cycling, free-rotation flag, persistence and mobile visibility. JavaScript syntax and diff whitespace checks pass.
- Evidence and generated masters: outputs/view-buttons287 (local). This is HUD/camera-adapter verification, not a live-server gameplay test.
- Prepared from origin/frontend-live commit 1a46a2fd. No backend change or production deployment performed. Follow releases223.md before publication; never replace archived runtime assets.
