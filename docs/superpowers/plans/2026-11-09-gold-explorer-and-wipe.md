# Gold on the Money Explorer + Gold Wipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phases 1–2 of the gold market design: the money explorer shows ทองแท่ง (held, unclaimed in mail, daily in/out), and the admin can report and then wipe every gold bar handed out so far.

**Architecture:** The coin ledger (`server/economy-ledger.js`) becomes reusable with its own reason lists; a second instance books gold. The host books gold where records are persisted (`persistMail`, `persistPets`) by diffing `petCollection.balance`. A pure module `server/gold-wipe.js` counts holdings and strips gold from one record; a paged backfill (modelled on `server/class-reward-backfill192.js`) applies it to every character, online or offline.

**Tech Stack:** Node ESM, `node:test`, vanilla JS pages, JSON (local) / Firestore (production) store.

**Spec:** `docs/superpowers/specs/2026-11-09-gold-market-design.md` (sections ช่วง 1, ช่วง 2, สวิตช์)

## Global Constraints

- Gold lives only in `record.petCollection.balance` (read through `normalizePetAccount`), and in unclaimed mail as `attachments.goldBars` (personal `record.mailbox` and global `realm.mailAnnouncements`).
- Wipe = option ก: set the wallet to 0 and drop `goldBars` from unclaimed mail; never touch items, pets or amulets bought with gold.
- The wipe runs only after an admin report taken within the last 10 minutes and a typed confirmation `ล้างทองแท่ง`.
- Wiping is idempotent: a record carries `goldWipe:1` once wiped and is never wiped twice, so gold received after its wipe is kept.
- Every wiped character gets an evidence entry `goldWipe` {wallet, mail}; the wallet amount is booked in the gold ledger as sink `wipe`.
- Public `/economy` never exposes character names; the top-holder list is admin-only.
- Server changes ship to both `frontend-live` and `main`; run `npm run release:check` before offering a push. Windows paths; Mali font and 236 frame rules apply to any admin panel styling.

## Review Focus

- A player claims a gold mail while the backfill is between pages → gold claimed before their page is wiped, gold claimed after their wipe stays (Task 3 test `goldWipe flag protects gold received after the wipe`).
- Server restarts mid-wipe → the backfill resumes from its saved cursor and wipes nobody twice (Task 4 test `resumes from the saved cursor`).
- Player is online during the wipe → their live session is changed through `persistMail`, never overwritten by a later autosave (Task 4 deliver path test with a fake online session).
- Mail with gold plus items → only `goldBars` is removed; coins, items and pets stay claimable (Task 3 test `keeps other attachments`).
- Wipe pressed without a fresh report, or twice → refused with `report-stale` / no-op after `completedAt` (Task 4 tests).

---

### Task 1: Reusable ledger + gold reason lists

**Files:**
- Modify: `server/economy-ledger.js`
- Test: `tests/economy-gold.test.mjs`

**Interfaces:**
- Produces: `createLedger({now, saved, sources=ECON_SOURCES, sinks=ECON_SINKS})` (same methods as today), `ledger.setHeld(total, count, pending=null)`, `publicView()` adds `pending` (null unless set).
- Produces: `GOLD_SOURCES = {mail:{th:'แจกจากแอดมิน / จดหมาย',en:'Admin gifts / mail'}, topup:{th:'เติมเงิน',en:'Top-ups'}, other:{th:'อื่นๆ',en:'Other'}}`, `GOLD_SINKS = {gacha:{th:'กาชา',en:'Gacha'}, shop:{th:'ร้านค้า',en:'Item mall'}, wipe:{th:'ล้างทองแท่ง',en:'Gold wipe'}, other:{th:'อื่นๆ',en:'Other'}}`.

- [ ] **Step 1: Write failing tests** in `tests/economy-gold.test.mjs`:
  - `gold ledger books by its own reasons`: `const g=createLedger({sources:GOLD_SOURCES,sinks:GOLD_SINKS})`; `g.record(500,'mail')`, `g.record(-120,'gacha')` → `publicView().days[0]` has `in:{mail:500}`, `out:{gacha:120}`, `net:380`; `g.record(10,'monster')` throws `econ-reason`.
  - `coin ledger is unchanged`: `createLedger()` still accepts `'monster'` and rejects `'gacha'`.
  - `pending survives save and load`: `g.setHeld(900,3,250)`; `createLedger({saved:g.toJSON(),sources:GOLD_SOURCES,sinks:GOLD_SINKS}).publicView()` → `held 900, characters 3, pending 250`.
- [ ] **Step 2:** `node --test tests/economy-gold.test.mjs` → FAIL (`GOLD_SOURCES` not exported).
- [ ] **Step 3:** Implement: `record` validates against the instance's lists; `toJSON` keeps `pending`.
- [ ] **Step 4:** `node --test tests/economy-gold.test.mjs tests/economy*.test.mjs` → PASS.
- [ ] **Step 5:** Commit `Economy ledger: reusable reason lists and a gold book`.

### Task 2: Book gold flows on the host and publish them

**Files:**
- Modify: `server/host.js` (`persistMail` ~L439, `persistPets` ~L427, its callers ~L486–525, economy load/save ~L626–628, `/economy` route L179)
- Create: `server/gold-wipe.js` (holdings part only in this task)
- Test: `tests/gold-holdings.test.mjs`, extend `tests/economy-gold.test.mjs`

**Interfaces:**
- Consumes: Task 1 `createLedger`, `GOLD_SOURCES`, `GOLD_SINKS`.
- Produces: `goldOf(record) -> number` (wallet), `mailGoldOf(record, announcements) -> number` (unclaimed personal + unclaimed announcement gold for this character, using the same claimed/expired rules as `mailbox.js`), `goldHoldings(rows, announcements, top=20) -> {held, holders, mailGold, characters, top:[{uid, slotId, name, gold, mailGold}]}` in `server/gold-wipe.js`.
- Produces: `realm.goldEcon` ledger; `/economy` response gains `gold: goldEcon.publicView()` (no names); saved economy JSON gains `gold`.
- Produces: `persistMail(s, apply, applyLive, reason, goldReason='other')`; `persistPets` books `gacha` for `petDraw`, else `other`.

- [ ] **Step 1: Write failing tests** `tests/gold-holdings.test.mjs`:
  - `counts wallet and unclaimed mail gold`: rows with balances 0/300/50 and one unclaimed personal mail `goldBars:200` and one claimed mail `goldBars:999` → `held 350, holders 2, mailGold 200, characters 3`.
  - `announcement gold counts once per character who has not claimed it`.
  - `top list sorted by wallet+mail, capped at top`.
- [ ] **Step 2:** run → FAIL (module missing).
- [ ] **Step 3:** Implement `server/gold-wipe.js` holdings functions; reuse `normalizePetAccount` and the mailbox claimed-state helpers (read `mailbox.js` for how claims and announcement claims are recorded; do not duplicate a different rule).
- [ ] **Step 4:** Host wiring: `persistMail` reads `normalizePetAccount(before.petCollection).balance` and the same for the saved record, then `realm.goldEcon.record(after-before, goldReason)` when non-zero. Callers pass: `premiumBuy`→`'shop'`, `amuletDraw`→`'gacha'`, `renameBuy`/`revivalBuy`→`'shop'`, mail actions→`'mail'`. Same diff in `persistPets` after a non-replayed checkpoint. Load/save `gold` beside the coin books; the 6-hourly held job also calls `goldEcon.setHeld(h.held, h.holders, h.mailGold)` from `goldHoldings(rows, realm.mailAnnouncements)`; also run it once at authority start.
- [ ] **Step 5: Extend** `tests/economy-gold.test.mjs` with `host books a premium purchase as gold sink shop` using the existing host test harness pattern from `tests/premium-shop-host.test.mjs` (buy one `break-guard` → `/economy` `gold.days[0].out.shop===100`).
- [ ] **Step 6:** `node --test tests/gold-holdings.test.mjs tests/economy-gold.test.mjs tests/premium-shop-host.test.mjs` → PASS.
- [ ] **Step 7:** Commit `Gold books: host records gold in and out; /economy publishes gold holdings`.

### Task 3: Strip gold from one record

**Files:**
- Modify: `server/gold-wipe.js`
- Test: `tests/gold-wipe.test.mjs`

**Interfaces:**
- Produces: `wipeRecordGold(record) -> {record, removed:{wallet:number, mail:number}, skipped:boolean}`; `skipped` is true when `record.goldWipe===1`. Output record has `petCollection` balance 0, `goldBars` removed (set to 0) on every unclaimed personal mail, and `goldWipe:1`. Pure: input not mutated.
- Produces: `stripAnnouncementGold(messages) -> {messages, removed:number}` (removes `goldBars` from every announcement's attachments).

- [ ] **Step 1: Write failing tests** `tests/gold-wipe.test.mjs`:
  - `wipes wallet and unclaimed mail gold`: balance 750, unclaimed mail `goldBars:100` → balance 0, mail goldBars 0, `removed {wallet:750, mail:100}`, `goldWipe:1`.
  - `keeps other attachments`: unclaimed mail `{coins:50, goldBars:20, items:[{id:'hp-large',count:2}], pets:['x']}` → coins, items, pets unchanged and still claimable via `mailbox.js` claim (claim it in the test and check bag/pets).
  - `keeps what gold already bought`: `petCollection.collection`, bag items and amulets deep-equal before/after.
  - `goldWipe flag protects gold received after the wipe`: wipe, then set balance 40, wipe again → `skipped true`, balance 40.
  - `input record is not mutated` (structuredClone compare).
  - `announcement gold stripped, rest kept`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5:** Commit `Gold wipe: strip one record and announcement gold`.

### Task 4: Wipe backfill with report gate

**Files:**
- Modify: `server/gold-wipe.js`, `server/storage.js` (both stores: `loadGoldWipeState`, `saveGoldWipeState`, and a way to rewrite announcements — `replaceMailAnnouncements(messages)`), `server/host.js`
- Test: `tests/gold-wipe.test.mjs`, `tests/gold-wipe-host.test.mjs`

**Interfaces:**
- Consumes: Task 2 `goldHoldings`, Task 3 `wipeRecordGold`, `stripAnnouncementGold`; existing `store.classRewardPage` (generalise to `store.characterPage` or reuse it as is), `store.giveOffline`, `persistMail`.
- Produces: `initialGoldWipeState() -> {version:1, reportAt:null, report:null, startedAt:null, after:null, scanned:0, wiped:0, wallet:0, mail:0, announcement:0, completedAt:null}`; `goldWipeBackfill({store, deliver, canWrite, pageSize=100}) -> state` (one page per call, cursor saved after each page, like class reward).
- Produces admin routes in `server/host.js` (same auth as `/admin/mail`): `GET /admin/gold-report` → `{holdings: goldHoldings(rows, announcements), state}` and stores `reportAt`; `POST /admin/gold-wipe {confirm}` → `400 report-stale` if no report in the last 10 min, `400 bad-confirm` unless `confirm==='ล้างทองแท่ง'`, `200 {state}` and starts the drain loop; when `completedAt` is set, further POSTs return the finished state without work.
- Deliver path: online character → `persistMail(session, apply, undefined, 'other', 'wipe')`; offline → `store.giveOffline`, and book `goldEcon.record(-removed.wallet,'wipe')` yourself (persistMail books it on the online path). Evidence `realm.evidence(peer or {uid,name},'goldWipe',removed)`. After `completedAt`, recompute holdings and `goldEcon.setHeld`.

- [ ] **Step 1: Write failing tests**:
  - `resumes from the saved cursor`: fake store with 250 rows, run until a thrown `authority-lost` after page 2, reload state, finish → every row wiped exactly once (`wiped` equals holders, no row seen twice by deliver).
  - `report-stale and bad-confirm are refused` (host test): POST without report → 400 `report-stale`; with report but wrong text → 400 `bad-confirm`.
  - `online player is changed live`: host test with one connected test character holding 300 gold → after wipe its live `petCollection.balance` is 0 and a forced autosave keeps 0.
  - `finished wipe is a no-op`: second POST after completion → same state, deliver not called.
  - `after completion /economy gold.held is 0`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implement storage methods for the local JSON store and the Firestore store (Firestore: one doc `multiplayerRuntime/goldWipe`, announcements wherever `saveMailAnnouncement` writes them).
- [ ] **Step 4:** Implement backfill + routes + drain loop (re-run on the host tick like `drainClassRewards`, only while `startedAt && !completedAt`).
- [ ] **Step 5:** run tests → PASS.
- [ ] **Step 6:** Commit `Gold wipe: admin report, confirmed paged wipe for online and offline characters`.

### Task 5: Explorer gold section + admin wipe panel

**Files:**
- Modify: `explorer.html`, `explorer.js`, `admin.js` (+ its CSS file for the new panel), `i18n-en.js`
- Test: `tests/explorer-gold.test.mjs` (pure helpers), manual check

**Interfaces:**
- Consumes: `/economy` `gold` (Task 2), `/admin/gold-report`, `/admin/gold-wipe` (Task 4).

- [ ] **Step 1:** Export the chart/list helpers in `explorer.js` only if needed for a test; test `goldStats(view)` returns `{held, holders, mailGold, todayIn, todayOut}` and handles `gold` missing (old server) by returning null so the section stays hidden.
- [ ] **Step 2:** Explorer: new section "ทองแท่ง" under the coin stats: cards ทองแท่งที่ผู้เล่นถือ (with holder count), ทองในจดหมายที่ยังไม่รับ, ทองเข้าวันนี้, ทองออกวันนี้; a daily in/out chart reusing `chart()` with gold days (colors: in `#d9b45a`, out `#9a6a1c`; check contrast on the dark panel); source/sink lists from `gold.sources`/`gold.sinks`; a muted line "ตลาดแลกเบี้ย ↔ ทองแท่งยังไม่เปิด". Same 30 s refresh.
- [ ] **Step 3:** Admin: a "ทองแท่ง" panel with button ตรวจยอดก่อนล้าง (shows holders, held, mailGold, top 20 names), then a text field + button ล้างทองแท่ง enabled only after a report in the last 10 minutes, then progress (scanned / wiped / wallet / mail) until `completedAt`.
- [ ] **Step 4:** `node scripts/i18n-missing.mjs` → `0 of N strings missing` after adding English.
- [ ] **Step 5:** Commit `Explorer shows gold; admin gold report and wipe panel`.

### Task 6: End-to-end check and release

- [ ] **Step 1:** Local realm (launch config `farm-warp-realm`, `AUTH_MODE=local`, build or copy into `dist/`): create two local characters, send each gold by admin mail, claim one mail, buy one shop item with one character → explorer shows held gold, unclaimed mail gold and today's mail/shop rows.
- [ ] **Step 2:** Admin report → numbers match; wipe with one character online and one offline → both wallets 0, unclaimed mail keeps items but no gold, explorer held 0, bought item still in the bag.
- [ ] **Step 3:** Restart the realm mid-wipe once (stop/start the preview server between pages) → finishes without double work.
- [ ] **Step 4:** New release id in `release.json`, `node scripts/freeze-release223.mjs`, commit, `npm run release:check` → "Ready to push".
- [ ] **Step 5:** Report to the owner; push only on their go-ahead (both branches). On production the owner runs the report, sees the numbers, and confirms the wipe themselves.
