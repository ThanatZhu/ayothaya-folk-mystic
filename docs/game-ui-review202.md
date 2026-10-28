# Gacha and companion UI review — revision 202

| Before | After | Why |
|---|---|---|
| Whole ornamental button image stretched to every aspect ratio | Two newly generated capsule assets rendered with nine-slice borders | Keep the lotus ends proportional on compact controls and wide draw actions |
| Legacy flex/header rules hide or squeeze the banner title | One banner stylesheet owns title, reward stage, rail and fixed purchase footer | Restore clear hierarchy and readable controls on short landscape screens |
| Portrait collection sits after all details | Owned-companion rail above independently scrolling details; active skills pinned below | Change companions and use skills without searching through a long page |
| Account updates replace the full selected-creature DOM | Stable hero, details and action elements; only actual data changes | Avoid focus loss, image popping and replayed entrances during saves |
| No visible next-star requirement outside the button | Actual duplicate-copy count and next-star progress | Make the upgrade decision understandable before pressing |
| Gather ring snaps back at the anticipation boundary | Hold the gather endpoint through anticipation and release | Preserve one continuous object and clock |
| Details open and close as hard cuts | 200 ms enter / 140 ms exit, transform and opacity only | Calm, paired motion with immediate focus handling and reduced-motion fallback |

## Player decisions and platforms
Browser MMORPG management overlays, keyboard/mouse and phone touch.
Gacha: choose the pool and preview tier; inspect actual cost/guarantee; draw one or ten; reveal/skip saved results.
Companions: choose an owned creature; inspect actual stats/ability; follow/rest; check copy requirements; upgrade a star; use the active creature's skill.

## State map
Gacha retains authority-owned prices, odds, pity and request IDs. Waiting art remains neutral. Opening, skipping, closing and category changes never create a second draw.
Companion states cover no creatures, chosen/following, star cap, insufficient copies, disconnected, saving, uncertain acknowledgement and exact-request retry.
Skill details retain their open state through updates. Short and portrait screens start compact. Keyboard selection stays immediate; pointer selection uses a 200 ms restrained art resolve, with no full-panel entrance.

## Shared sources
- premium-controls202.css and assets/premium-controls202/: common generated controls.
- gacha-banner199.css: banner layout.
- pet-companion201.css and pet-collection-ui.js: companion layout and stable view updates.
- gacha-motion201.js / gacha-motion201.css: shared ritual clock.
- gacha-overlay199.js: details/history focus and interruptible paired motion.
Exact built-in ImageGen prompts, source paths and alpha checks are in assets/premium-controls202/prompts.json; PNG masters are in outputs/design202/masters/.

## Evidence
scripts/check-gacha-banner200.mjs covers five screen sizes, pool details/rates/history, actual costs, lost-acknowledgement retries, one/ten draws, category changes and transparent image targets.
outputs/design202/check-companion.mjs checks all five sizes, keyboard selection, stable art/details nodes, pinned active skills, follow, an upgrade acknowledged on retry only once, and empty collection.
outputs/design202/check-motion.mjs records actual normal-motion browser footage and checks the whole ritual, skip/interruption and runtime motion reduction.
Review the resulting screenshots and recording; test success alone does not approve the aesthetic. Physical phone behavior is still an emulation check rather than a claim of testing the owner's device.

## Motion verdict
Approve the changed interactions after the checks above pass: deliberate reward ritual timing is documented separately from routine controls; modal and pointer-selection transitions are below 300 ms. No added requestAnimationFrame loop, video layer, renderer or animation package.

The shared style loader waits for CSS and primary control/background artwork before exposing a new dialog, preventing an unstyled first frame. Banner rituals do not fetch their unused legacy pose/flash images. Actual browser overlay checks verify interrupted close/reopen, focus return, inert cleanup, and a transparent ceremony surface.
