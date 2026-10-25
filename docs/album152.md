# Explicit card deposits (152)

Monster cards count in the album only after the player presses **ฝากการ์ด 1 ใบ** in Quests → Card Book. Each unique type consumes exactly one loose card from the bag. A drop, purchase, trade, mail gift, equipped card, or storage copy does not constitute a deposit. Duplicate deposits are rejected without consuming anything.

`card-album.js` shares the rules between offline play and the authoritative realm command `albumDeposit`. The server accepts only a known exact card ID and computes the quantity itself; client quantities/progress/rewards are ignored. During a trade or mailbox mutation a deposit is refused. Bag, deposited IDs and milestone ledger are saved together with the character.

Legacy `album` values were discovery history. On first load they become an empty deposit list (`albumSchema:2`), while the milestone thresholds already paid under the old system remain in `albumRewards`. Players must explicitly deposit cards for the new count; old reward thresholds cannot be paid twice. The private deposit schema/ledger are excluded from the client-writable Firebase mirror and are never imported from it.

Milestone rewards retain the existing amounts. The shared rule checks item slots, stack limits and the cowry cap before committing the deposit. If any reward cannot fit, the original bag, card and album remain unchanged. Consuming the last copy can free a slot for the reward.

Every album entry reserves the same 2:3 portrait canvas and aligned name/status/action rows. Existing atlas paintings use an SVG viewport to omit transparent cell side gutters; individual Chapter 2 images use `object-fit:contain`. Original artwork is retained without stretching or creating new raster assets. The responsive grid uses equal columns, a 44 px minimum action, and scrolls within the quest window.

Validation:

- `node --test tests/album152.test.mjs tests/content60.test.mjs tests/cards.test.mjs tests/i18n.test.mjs`
- `node build-vercel.mjs`
- `node scripts/check-album152.mjs <absolute Playwright module path>` runs isolated LocalStore/realm and real Edge desktop/touch clicks, milestone payout, loot exclusion, reconnect persistence, image decoding and six viewport sizes. Results/screenshots are local under `outputs/album152/`; these are not release assets.
- Backend health advertises `albumDeposits:2` for deployment readiness.
