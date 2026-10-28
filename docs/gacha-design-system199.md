# Gacha design system — Ayothaya

This is the owner's approved design direction for the gacha screen and EVERY future gacha banner. Read this file before adding or changing gacha UI. The approved concept is docs/images/gacha-approved199.webp. The owner explicitly rejected the first implementation's rectangular backplates and CSS box buttons on 28 October 2026.

## Non-negotiable visual rules

1. Keep the large illustrated Thai sanctuary, emerald jade, antique gold and generous empty space. Main reward art dominates the stage. Desktop/landscape use a compact left category rail. Portrait phones use a compact horizontal category selector.
2. **Buttons must use generated image assets. Never substitute a flat CSS rectangle, rounded CSS box, generic web card or colored placeholder.** Use assets/premium-controls202/button-jade.webp for secondary controls and button-gold.webp for the primary ten-pull action/selected control. Reuse their transparent silhouettes. If a genuinely new control shape is needed, generate it with ImageGen and inspect its alpha before integrating it.
3. Use assets/gacha-banner199/close.webp for close controls. Keep the current generated question-mark icon for rate help. Render labels, costs and disabled state as real DOM, not baked into artwork.
4. **Item artwork is NOT a button plate.** A clickable amulet, pet, egg or seal may be a transparent hit target. Its wrapper MUST have transparent background, no background image, no border/border-image, no box-shadow, no rectangular glow. Apply silhouette glow to the transparent image only. Never put the capsule button art behind an item.
5. Category art is also transparent. Only its label uses the generated capsule artwork. No rectangular category card or border around the art.
6. A wallet is live icon + live amount; no opaque rectangular badge. Keep thin layout dividers restrained. Data tables may use row separators, but must not become a wall of framed cards.
7. Details, rates and history use the game's generated window frame. Keep them closed on initial entry. Do not scatter multiple boxed information panels across the banner.
8. Never claim a displayed preview is the reward already won. Preserve faceless, minimal amulet reliefs. No recognizable Buddha facial portrait. Keep the label that these are example rewards.
9. Test actual screenshots, not only bounding rectangles. **A layout passing an overflow test is NOT evidence it looks right.** Compare the desktop composition to the approved concept. Inspect phone landscape and portrait independently. Fix any overlapping text, hidden title, flattened ornament, square halo or box behind an item before delivery.

## Shared implementation

- gacha-banners199.js is the category registry: id, label, panelId and thumbnail.
- premium-hub-ui.js owns the shared header, live wallet, category selection, keyboard navigation, rate-help entry and shell.
- premium-controls202.css owns generated nine-slice controls shared by gacha and companion management. Keep lotus ends proportional; never stretch the full image over mismatched button ratios.
- gacha-banner199.css owns the banner presentation. Do not duplicate/override it ad hoc in each new banner.
- gacha-presentation199.js adapts the existing amulet/pet panels to the common presentation.
- gacha-overlay199.js owns details/history focus trapping, Escape and focus return.
- Existing server-owned draw functions remain the authority. The panel must expose root + render(force) and its shared .gacha-tools slot.
- New categories must add their panel factory and registry entry, implement the same slots, and extend gacha-rate-info.js / gacha-rates-ui.js with the real pool. Never silently fall back to another banner's rates.

## Actual money, guarantees and results

Read cost, normal rates and conditional guarantee rules from the same gameplay modules used by the authority. Amulets currently use AMULET_PRICE / AMULET_PITY; pets use PET_PRICE / PET_PITY. A ten-pull is ten sequential results, not a promise of rainbow.

Do not alter prices, odds, pity, rewards, wallet schema or inventory rules as part of a visual change. Keep the same request ID on uncertain acknowledgement/retry. Never reroll when replaying, changing category, closing or reopening the UI. Show only server-confirmed results. Opening/skip animations never charge extra.

Before the authority confirms a draw, ritual visuals must be neutral sealed energy, not an identifiable amulet or pet. Keep completed/partially opened batches across close/category changes. Session history contains only confirmed, revealed batches, deduplicated by request ID; it is explicitly labeled as this page session, not a fabricated lifetime history.

## Assets and performance

Use built-in ImageGen for new bitmap artwork. Save exact prompts beside generated assets (gacha-banner199/ or premium-controls202/) and preserve generated PNG masters in the project's output folder. Ship optimized WebP; preserve alpha and aspect ratio. Do not copy another game's artwork.

Current background budgets: desktop <= 400 KB; phone <= 180 KB. Prefer real transparent item art, not a full-frame video or extra WebGL scene. No new requestAnimationFrame loop for the banner. Limit idle motion to subtle silhouette glow and stop it under prefers-reduced-motion; keep hidden overlays inert. Use 44 px minimum interactive targets, including close, tabs, tiers and secondary buttons.

## Required validation

- Desktop 1440x900; phone landscape 844x390 and 667x375; portrait 390x844 and 320x568.
- Inspect idle amulet and idle pet screenshots; details; rate help; history; one and ten results; category switch/close/reopen mid-ritual.
- Check actual computed styles of item wrappers: transparent + no background image + no border + no box shadow. Check action controls use generated WebP backgrounds. Check asset alpha; four button corners must be transparent.
- Check keyboard/touch, focus return, Escape, reduced motion, no missing art/page errors, no horizontal overflow and no text/button overlap.
- Verify exact single/ten costs, separate pity counters, actual debit, offline/insufficient funds, and retry after a lost acknowledgement does not charge twice.
- Run scripts/check-gacha-banner200.mjs and relevant gacha/shop authority tests. Run the translation coverage check and build the game.

## Motion and companion screens (201)

Read docs/game-ui-review201.md alongside this file. Pet management must emphasize the selected creature, its real bonuses and the follow/upgrade decisions; keep the collection secondary. Use the same generated controls and transparent image targets as gacha.

Ritual motion must be continuous: one neutral sealed object gathers energy, anticipates, releases light once, then yields to saved results. Use GACHA_MOTION in gacha-motion201.js for both categories. Do not restore unrelated pose swaps, scale-from-zero prizes, full-screen flash plates or idle particle loops. Keep unrevealed rewards neutral. The ritual never controls the transaction.

Inspect an actual normal-motion recording in addition to reduced-motion screenshots. Check interruption, skip and switching tabs during every active phase. Skill checklists and passing automated tests do not substitute for visual review.

## Companion management (202)

Keep the owned-creature rail reachable above scrolling details on portrait phones. Keep active-companion skill actions outside that scrolling area. Show actual duplicate-copy progress for the next star. Skill details are expandable and start compact on small/short screens. Preserve their expanded state and stable image/button nodes while account data updates. Never reset selection or replay image entrance on a routine save.

## Companion background (203)

Companion management uses its own illustrated morning Himmapan glade from assets/companion203/, rather than the gacha sanctuary under a heavy dark wash. The generated outer frame must use border-image-slice:17% without fill so it cannot hide the environment. Shade the text/collection areas with smooth gradients while keeping the creature area open. Set cover/no-repeat explicitly for every viewport when the number of gradient layers changes. Ship the 960 px mobile variant on portrait phones. Exact built-in generation prompt and sizes are in assets/companion203/prompt.json.
