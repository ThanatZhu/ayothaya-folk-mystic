# Gold Shops in the Central Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 3 of the gold market design: a market shop (sell or buy) can be priced in ทองแท่ง instead of เบี้ย, behind an owner-only switch that can only be turned on after the gold wipe has finished.

**Architecture:** Shops gain `currency:'coins'|'gold'`. The pure rules in `market-board.js` take and return the player's gold balance next to the bag. `realm.marketCommand` applies the new balance to `p.petCollection.balance` the same way it applies `p.bag` (autosave, `p.saveNow`), refuses while a host gold save is in flight, books tax in `realm.goldEcon`, and gives no trade XP for gold. The host persists the switch like the observers list and tells the realm.

**Tech Stack:** Node ESM, `node:test`, vanilla JS UI, JSON (local) / Firestore (production).

**Spec:** `docs/superpowers/specs/2026-11-09-gold-market-design.md` (ช่วง 3, สวิตช์)

## Global Constraints

- Gold wallet = `p.petCollection.balance` (integer, 0..1,000,000,000; read through `normalizePetAccount`). New errors: `no-gold` (not enough gold), `gold-cap` (would exceed 1,000,000,000).
- One currency per shop, chosen at open; existing shops without `currency` are `'coins'`.
- Gold sales tax = the same rate as coins (`tradePerks().tax`, `taxOf`), burned, booked in `realm.goldEcon` as sink `marketTax` (`{th:'ภาษีตลาด',en:'Market sales tax'}`, added to `GOLD_SINKS`).
- Gold trades never add trade XP (`traded()` / `xpOwed` stay coin-only).
- Any market action that changes a gold balance is refused with `server-busy` while that player has `mailMutationBusy` or `petMutationBusy` set (a host `persistMail`/`persistPets` gold save is in flight and would overwrite the change).
- Switch off: nobody can open a gold shop or buy/sell at one; owners can still collect and close gold shops. The switch can only be turned on when the gold wipe state has `completedAt`; turning it on/off is owner-only (`OWNER_EMAILS`, same check as `/admin/gold-wipe`) and audited.
- Reference prices for gold are kept apart from coin prices (`priceKey` prefixed `gold:`).
- Server changes ship to `frontend-live` and `main`; `npm run release:check` before offering a push. UI: Mali font, unified 236 window rules, every new Thai string gets English in `i18n-en.js`.

## Review Focus

- Gold buy-shop closes or expires with gold still in escrow → the owner gets every bar back on collect; a closed shop holding gold is never deleted (Task 1 test `closed gold shop keeps its claims`; Task 2 test on `expireShops`).
- A buyer pays gold while their own gacha/mail save is in flight → refused `server-busy`, no gold or item moved (Task 2 test `busy wallet refuses gold trade`).
- Gold received from a shop sale would push the owner over 1,000,000,000 on collect → `gold-cap`, nothing collected, pouch kept (Task 1 test).
- Switch turned off while gold shops are open → trades refused `gold-market-closed`, collect/close still work (Task 2 test).
- Search mixing currencies → price sort and min/max filter never compare gold against coins (Task 1 test `browse sorts within one currency`).

---

### Task 1: Pure market rules with a currency

**Files:**
- Modify: `market-board.js`
- Test: `tests/market-gold.test.mjs`

**Interfaces:**
- Produces: `GOLD_MAX = 1000000000`; `shopCurrency(shop) -> 'coins'|'gold'`.
- `normalizeListing(req, bag, perks, gold=0)` reads `req.currency` (`'gold'` or anything else → `'coins'`); buy escrow checks `gold` for gold shops (`no-gold`). Returns `{kind,title,items,escrow,currency}`.
- `openShop({bag, gold=0, req, perks, owner, x, z, mapId, now, id, existing})` → `{bag, gold, shop}`; gold buy shops take `escrow` from `gold`; shop has `currency` and `pouch:{coins:0,gold:0,items:{}}`.
- `buyFromShop(shop, buyerBag, id, qty, perks, {who, now, gold=0})` → `{bag, gold, cost, tax, currency, shop}`; gold shops take `cost` from `gold` (`no-gold`), add `cost-tax` to `pouch.gold`.
- `sellToShop(shop, sellerBag, id, qty, perks, {who, now, gold=0})` → `{bag, gold, pay, tax, currency, shop}`; gold shops pay `pay-tax` into `gold` (`gold-cap` if over `GOLD_MAX`), `escrow -= pay`.
- `collectShop(shop, bag, {close=false, gold=0})` → `{bag, gold, goldOut, shop, coins, items}` (`goldOut` = gold collected); closing a gold buy shop returns `escrow` to gold; `gold-cap` if the result exceeds `GOLD_MAX` (nothing moved).
- `shopHasClaims` also true for `pouch.gold>0` or a gold shop's `escrow>0`.
- `publicShop`, `searchMarket` rows and `browseMarket` rows carry `currency`. `marketOptions` accepts `currency:'all'|'coins'|'gold'` (default `'all'`); `browseMarket` filters by it, applies min/max price only within the chosen currency (ignored for `'all'`), and price sorts by currency first (coins before gold) then price.
- `priceKey(id, currency='coins')` → gold keys are `'gold:'+base`; `recordPrice`/`priceHint` take the key they are given.

- [ ] **Step 1: Write failing tests** in `tests/market-gold.test.mjs`:
  - `gold sell shop: buyer pays gold, owner pouch gets gold minus tax`: tax 3% at trade level 1 → buy 2 × 100 gold: buyer gold 1000→800, item in bag, `pouch.gold===194`, bag coins unchanged.
  - `gold buy shop escrows gold and pays the seller`: open buy shop for 5 × 40 gold with gold 300 → gold 100, escrow 200; seller sells 5 → seller gold +194, escrow 0.
  - `no-gold refuses without moving anything` for open (buy) and buy.
  - `gold-cap on sell and on collect, nothing moved`.
  - `closed gold shop keeps its claims`: `shopHasClaims` true with only `pouch.gold` or only gold escrow; collect with close returns escrow to gold.
  - `old shops default to coins`: a shop object without `currency` behaves exactly as today (existing tests in `tests/market*.test.mjs` and `tests/shop-lifecycle155.test.mjs` still pass).
  - `browse sorts within one currency`: mixed coin/gold rows sorted price-asc list all coin rows first; `currency:'gold'` with `minPrice:50` only filters gold rows; `currency:'all'` ignores min/max.
  - `gold prices are recorded apart`: `priceKey('hp-large','gold')==='gold:hp-large'`.
- [ ] **Step 2:** `node --test tests/market-gold.test.mjs` → FAIL.
- [ ] **Step 3:** Implement in `market-board.js`; reuse `moveOffer` for items and coins, plain integer math for gold.
- [ ] **Step 4:** `node --test tests/market-gold.test.mjs tests/market*.test.mjs tests/shop-lifecycle155.test.mjs` → PASS.
- [ ] **Step 5:** Commit `Market rules: shops priced in gold bars`.

### Task 2: Realm applies gold trades

**Files:**
- Modify: `server/realm.js` (`marketCommand` ~L684-719, `expireShops` ~L670, `mine()` ~L683), `server/economy-ledger.js` (`GOLD_SINKS.marketTax`), `server/host.js` (`/economy` route adds `gold.shops`)
- Test: `tests/market-gold-realm.test.mjs`

**Interfaces:**
- Consumes: Task 1 functions; `realm.goldEcon` (exists); `realm.goldMarketOpen` (boolean, default `false`, set by Task 3).
- Produces: `realm.goldInShops() -> number` (gold escrow of open gold buy shops + `pouch.gold` of all shops); `/economy` `gold` gains `shops: realm.goldInShops()` (spec ช่วง 1 asks for gold held in shop escrow).
- Produces: helpers in realm `goldBalance(p)` / `setGold(p, value)` (writes `p.petCollection={...normalizePetAccount(p.petCollection),balance:value}`, sets `p.saveNow=true`); shop messages accept `shop.currency` on `shopOpen`; `shopMine` reply adds `goldMarket: realm.goldMarketOpen`; `marketResults` adds the same flag.
- Errors: `gold-market-closed` (switch off: open gold shop, buy or sell at a gold shop), `server-busy` (Global Constraints busy rule).

- [ ] **Step 1: Write failing tests** with the `tests/shop-lifecycle155.test.mjs` harness (RealmServer + fake map, `t.send(peer,…)`):
  - `switch off refuses gold shops` (open, buy, sell → `gold-market-closed`) while coin shops still work.
  - `gold sale moves gold both ways and books tax`: switch on, owner opens gold sell shop, buyer buys → buyer `petCollection.balance` drops by cost, owner collects `cost-tax`, `realm.goldEcon` today `out.marketTax===tax`, buyer and owner `tradeXp` unchanged, buyer `saveNow` set.
  - `busy wallet refuses gold trade`: buyer `mailMutationBusy=true` → `server-busy`, balances and shop unchanged; same with `petMutationBusy`.
  - `switch off keeps collect and close working` for a gold shop with pouch gold.
  - `expired gold shop with claims is kept` by `expireShops`, deleted only after collect.
  - Evidence entries for gold trades include `currency:'gold'`.
  - `goldInShops counts escrow and pouches`: one gold buy shop with escrow 200 and one gold sell shop with pouch 50 → 250; coin shops add nothing.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implement; pass `gold: goldBalance(p)` into the Task 1 calls and `setGold` the result; book `realm.goldEcon.record(-tax,'marketTax')` for gold trades instead of the coin `econRecord`; skip `traded()` and `xpOwed` for gold.
- [ ] **Step 4:** `node --test tests/market-gold-realm.test.mjs tests/market-gold.test.mjs tests/market*.test.mjs tests/shop-lifecycle155.test.mjs tests/economy*.test.mjs` → PASS.
- [ ] **Step 5:** Commit `Realm: gold shop trades with busy guard and gold tax books`.

### Task 3: Owner switch, persisted

**Files:**
- Modify: `server/storage.js` (both stores: `loadGoldMarket()` → `{enabled:boolean, changedAt, by}|null`, `saveGoldMarket(state)`; local file `gold-market.json`, Firestore doc `multiplayerRuntime/goldMarket` written inside the authority transaction like `saveGoldWipeState`), `server/host.js` (boot load next to `loadObservers` ~L88/160, routes), `server/world-reset-store.js` (keep the switch across a world reset: do not list it as a runtime doc to clear; add a comment saying so)
- Test: `tests/gold-market-switch.test.mjs`

**Interfaces:**
- Consumes: gold wipe state (`store.loadGoldWipeState`, `completedAt`), `OWNER_EMAILS`, `audit`.
- Produces: `POST /admin/gold-market {enabled:boolean}` (owner-only outside local mode) → `409 wipe-not-finished` when enabling before the wipe completed, else `200 {goldMarket:{enabled,changedAt,by}}`; `GET /admin/gold-report` response gains `goldMarket`. Host sets `realm.goldMarketOpen` on boot (after authority) and on change; a lost authority/renew reloads it like the other runtime state.

- [ ] **Step 1: Write failing host tests**: enabling before the wipe → 409; after a completed wipe → 200 and `realm.goldMarketOpen===true`; survives host restart with the same store; disabling → false; non-owner refused when not in local mode (if the harness can run firebase mode; otherwise assert the same expression as `/admin/gold-wipe` by unit-testing the guard helper).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implement storage, routes and boot wiring.
- [ ] **Step 4:** `node --test tests/gold-market-switch.test.mjs tests/gold-wipe-host.test.mjs tests/market-gold-realm.test.mjs` → PASS.
- [ ] **Step 5:** Commit `Gold market switch: owner-only, needs a finished wipe, persisted`.

### Task 4: Market and admin UI

**Files:**
- Modify: `market-board-ui.js` (+ its CSS file), `admin.js`, `ayothaya-admin-9x7k.html` (bump `admin.js?v=`), `i18n-en.js`
- Test: `tests/market-gold-ui.test.mjs` (pure helpers only)

**Interfaces:**
- Consumes: `shopMine.goldMarket`, `marketResults.goldMarket`, rows' `currency`, `pouch.gold`, gold `escrow`; `/admin/gold-market`; wallet `normalizePetAccount(world.petCollection).balance`.

- [ ] **Step 1:** Extract and test a pure `price(amount, currency)` helper: coins → `"1,200 เบี้ย"`, gold → `"35 ทองแท่ง"` (the UI shows the gold-bars icon `assets/summon147/gold-bars.webp` beside gold prices).
- [ ] **Step 2:** Open-shop form: currency choice เบี้ย / ทองแท่ง shown only when `goldMarket` is true; send `shop.currency`; buy-shop escrow line shows the wallet that pays it.
- [ ] **Step 3:** Search tab: filter chips ทั้งหมด / เบี้ย / ทองแท่ง (gold chip only when the switch is on or when gold rows exist); every price via `price()`; reference price per currency.
- [ ] **Step 4:** Counter and "ร้านของฉัน": prices, escrow and pouch show the right currency; collect shows gold collected; error texts for `no-gold`, `gold-cap`, `gold-market-closed`, `server-busy`.
- [ ] **Step 4b:** Money explorer (`explorer.js`/`explorer-gold.js`): a fifth gold card "ทองในร้านตลาด" from `gold.shops` (hidden when the field is missing).
- [ ] **Step 5:** Admin ทองแท่ง tab: switch "เปิดทองแท่งในตลาด" with current state, disabled until the wipe has `completedAt`, owner-only message on 403, confirm before turning on.
- [ ] **Step 6:** `node scripts/i18n-missing.mjs` → 0 missing; `node --test tests/market-gold-ui.test.mjs tests/i18n.test.mjs` → PASS.
- [ ] **Step 7:** Commit `Market UI: gold-priced shops and the admin gold market switch`.

### Task 5: End-to-end check and release

- [ ] **Step 1:** Local realm (`farm-warp-realm`, `AUTH_MODE=local`): two local characters with gold (admin mail, claim), run the gold wipe first if needed, then give gold again; turn the switch on; character A opens a gold sell shop, B buys; A opens a gold buy shop, B sells; A collects → balances, tax and `/economy` gold `marketTax` match; switch off → B's buy refused, A can still collect.
- [ ] **Step 2:** Screenshots of the open form, search with a gold row, and "ร้านของฉัน" at desktop and phone width.
- [ ] **Step 3:** New release id, freeze, commit, `npm run release:check` → "Ready to push"; report to the owner; push only on their go-ahead (both branches).
