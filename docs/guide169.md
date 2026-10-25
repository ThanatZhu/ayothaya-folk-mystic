# Player guide

Public URL: https://ayothayaonline.com/guide.html

`guide.html` is a standalone read-only Thai handbook. No account, cloud save, renderer, or live session is loaded. Home navigation and the in-game profile link to it.

Edit chapters in `assets/guide169/handbook.md`: each `@id|group|title` starts an article with a permanent anchor. Paragraphs, `###` subheadings, ordered/unordered lists, and `!` notes are escaped before rendering. UI labels live in `ui.json`. Article IDs are stable share links; reference entries use `#ref-<category>-<id>`.

`scripts/build-guide169.mjs` exports current gameplay definitions and authored sprite crops. The static build regenerates `game-data.json` before copying assets. Do not edit the generated snapshot by hand. Run the exporter before committing source-data changes to keep its checked-in copy current. No private account/admin data is exported.

Base monster HP and map world-boss HP are explicitly separate. Rates are base probabilities, not live event-adjusted rates. Live boss timers, market prices and daily target selection remain in game. CBT is documented as preview with claims/ranked queue disabled; update this chapter when the actual event opens. Real payments are not advertised as available.

Validation: `node --test tests/guide169.test.mjs tests/i18n.test.mjs`, static build/content validation, and browser checks for global search, all reference categories, stable deep links, filters, refinement calculations, asset loading and six viewport widths.

## Illustrated walkthroughs (170)

`visuals.json` maps 17 actual game UI screenshots to relevant chapters. They were captured using the real game and local authority with a disposable sample character; no live account or production mutation was used. `screens/*.webp` totals about 1.35 MiB and images load lazily. Numbered callouts use percentage positions relative to each inspected crop and have separate text explanations.

The native image dialog supports fit-to-screen, actual-size scrolling, Escape, focus restoration and touch scrolling. Seven original class portraits, six equipment examples, training materials, card examples and ten pet portraits link to the existing reference library. Keep screenshots descriptive rather than promising the sample balances/items as rewards. Recapture and review callout coordinates when the underlying UI changes.
