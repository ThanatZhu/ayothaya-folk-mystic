# Arrival186 — first impression and character entry

Redesigns the real `play.html` account → realm → character flow. The new jade/gold interface is a single stylesheet, with a generated Ayutthaya riverside background, a clear primary action, short supporting copy, staged fades and the game's real animated painted characters.

## Artwork and motion

- `assets/arrival186/river-gate.png` retains the generated master; `river-gate.webp` is the589848-byte web asset. The built-in image-generation prompt is retained in `prompt.json`. It follows the existing world-art reference without replacing it.
- `arrival-showcase186.js` cycles seven current classes and idle/walk/attack poses. The class explorer shows three current skills and two Master paths from the live catalog. Manual selection and hidden-tab suspension are supported. Motion runs continuously, with a14-second class cycle and70% pose playback speed. A reduced-motion preference uses a gentler pace rather than freezing the characters; there is no motion on/off button.
- The class explorer is read-only. Real characters still begin as Novices; classes and Master branches are earned through the existing in-world progression. Choosing a preview never changes account or character data.
- Existing owned characters retain equipment, appearance and their stage preview. Feet and the pedestal remain in one canvas coordinate system.

## Entry behavior

Google sign-in, anonymous online play, later Google linking, offline play, policy consent, five account slots, server-reset handling, name validation and exact-name deletion confirmation remain on the existing handlers and store. No automatic login, account linking or consent acceptance was added. The gallery returns focus to its opener when closed.

`arrival186.css` replaces the old lobby layout cascade for this page. It reflows short landscape and portrait screens, keeps44px actions and16px name input, reserves safe areas and gives the form priority while the software keyboard is open. The page does not scale down the entire interface to fit.

## Review and validation

- `arrival-lab186.html`: interactive desktop/mobile review, backed by `scripts/mobile-lobby-fixture.mjs`. All demo characters stay in memory; it does not connect to accounts or write game saves.
- `scripts/check-arrival186.mjs`:24viewport sizes ×7screen/account states ×Thai/English, plus the seven-class gallery, motion controls, keyboard layout and a demo creation flow.
- Actual `play.html` offline create/select/preview flow was also exercised in an isolated browser context, including creating a female Novice and restoring focus after the gallery. No production profile was used.
- Focused auth/store/character/consent/localization unit tests and production build are checked separately. Chromium/Edge viewport simulations do not certify physical Safari devices.

Release186 includes the approved entry flow and continuous gentle motion. Verify the deployed play.html entry tags and class gallery after publication.
