# Shared public masthead and luxury handbook theme

The home page, player guide and equipment journey now use the same static header. `assets/site171/header.html` is its source; `scripts/sync-site-header171.mjs` synchronizes all three pages and runs during the static build. Keep the generated copies in the commit so local serving and no-JavaScript navigation remain available.

`site-header.css` owns header geometry, colors, breakpoints and keyboard focus. `site-header.js` owns the menu, Escape/outside-click closing, current-page state, Discord links and language changes. Language switching keeps query parameters such as equipment class/level and the current section. Landing-specific film, live status, event clocks and class preview behavior remain in `landing.js`.

`companion-luxury171.css` applies the landing palette, Mali type, full-width cinematic hero and editorial spacing to the two handbook pages. Existing search, diagrams, screenshot viewer, item sources and equipment selectors keep their original logic. The measured header/search heights keep guide anchors and sticky tools clear of each other; short landscape displays let the guide search bar scroll normally to preserve reading space.

Validation: source/data/i18n tests; identical rendered headers and no overflow across 30 combinations (three pages at ten desktop/mobile viewports); keyboard menu closing; guide anchor clearance and image viewer; equipment class/level retention while switching language.
