# Crafting window

The bag's Craft button opens a centered jade-and-gold window in the existing Mali font. Desktop uses recipe, item and material columns; short landscape screens compact those columns with independent scrolling and a fixed quantity/cost/action footer. The frame is the existing nine-slice `assets/ui-skill150/window.webp`; item images come from the real item atlas via `iconStyle`.

`craft-view176.js` is a presentation model over the existing shared recipes. It provides class-aware localized recipe search, a ready-only filter, quantity/cost/material quotes and sources from shops, positive monster drops and crafting recipes. Map names resolve regular spawn types and world bosses from the catalog. Quotes call the same atomic `craft` rule as the realm, including bag capacity. No recipe, price, success chance or gameplay restriction changes.

`craft-ui.js` preserves the existing bag entry point and offline path. Online crafting sends the existing `craft` command, disables duplicate submissions, and shows the receipt/pop only after a matching `crafted` event and an authoritative bag update. Notices clear failed requests; disconnects/timeouts ask the player to check the bag before retrying. The selected recipe and list scroll survive updates and crafting the final available copy. Material sources replace the material pane in place.

Validation: `tests/craft176.test.mjs`, existing crafting/realm and translation tests; browser QA uses a temporary local realm/store, real WebSocket crafting and desktop/landscape viewport sizes 1920×1080, 1440×900, 1280×720, 1024×768, 844×390, 667×375 and 568×320. Private browser fixtures, tokens, logs and screenshots stay in untracked `outputs/`.
