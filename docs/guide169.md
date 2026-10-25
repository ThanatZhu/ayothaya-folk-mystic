# Player guide

Public URL: https://ayothayaonline.com/guide.html

`guide.html` is a standalone read-only Thai handbook. No account, cloud save, renderer, or live session is loaded. Home navigation and the in-game profile link to it.

Edit chapters in `assets/guide169/handbook.md`: each `@id|group|title` starts an article with a permanent anchor. Paragraphs, `###` subheadings, ordered/unordered lists, and `!` notes are escaped before rendering. UI labels live in `ui.json`. Article IDs are stable share links; reference entries use `#ref-<category>-<id>`.

`scripts/build-guide169.mjs` exports current gameplay definitions and authored sprite crops. The static build regenerates `game-data.json` before copying assets. Do not edit the generated snapshot by hand. Run the exporter before committing source-data changes to keep its checked-in copy current. No private account/admin data is exported.

Base monster HP and map world-boss HP are explicitly separate. Rates are base probabilities, not live event-adjusted rates. Live boss timers, market prices and daily target selection remain in game. CBT is documented as preview with claims/ranked queue disabled; update this chapter when the actual event opens. Real payments are not advertised as available.

Validation: `node --test tests/guide169.test.mjs tests/i18n.test.mjs`, static build/content validation, and browser checks for global search, all reference categories, stable deep links, filters, refinement calculations, asset loading and six viewport widths.
