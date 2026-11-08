# Party Dungeons + Lv35 Krasue House Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a menu-entered party dungeon system for up to 5 players, with matchmaking, ready check, instanced rooms, daily chests, shards and a rainbow exchange, and ship the first dungeon, "เรือนกระสือริมคลอง" (Lv35).

**Architecture:**
- **Shared rules:** one data module, `dungeons.js`, holds the dungeon catalog, difficulty table, party scaling, rewards and exchange. The server and the window both import it.
- **Runs:** a server module, `server/dungeon-runs.js`, owns runs, modelled on `server/arena-rooms166.js`. A run reserves a private room, keyed like the arena (`realm.js:118`). Players reach it through the normal travel → join flow, via a new `travelDestination` branch. The run remembers each player's map and position from before entry and sends them back.
- **Room script:** `server/dungeon-script.js` runs the room each realm tick: waves, the lantern puzzle, the mid-boss summon, the boss phase swap, door teleports and wipes.
- **Matchmaking:** `server/dungeon-queue.js`.
- **Client:** a `dungeon-ui.js` window, opened by a new `#game-menu` button, plus a small in-dungeon tracker.

**Tech Stack:** Plain ES modules, Node 20 `node --test`, Blender (headless) for the pixel strips, `cwebp` or the existing webp step for icons.

**Spec:** `docs/superpowers/specs/2026-11-08-party-dungeons-design.md`. Read the whole file. The sections "คำตอบเจ้าของเกม 9 พ.ย." and "แก้รอบสอง 9 พ.ย." override the earlier reward text.

**Depends on:** `docs/superpowers/plans/2026-11-09-gear-pve-pvp.md`, which must be merged first. It supplies `pveDmg`, `STAT_CAPS`, refine set tiers (`SET_REFINE`, `refineTier` on `active`) and the damage multipliers.

## Global Constraints

- **Entry:** dungeons are entered from the menu. `mill-cellar` stays exactly as it is.
- **Party and level:** parties have up to 5 players and solo entry is allowed. Any level at or above the dungeon level may enter (no maximum).
- **Dungeons:** only Lv35 `krasue` ships now. The others (45, 55, 65, 80) must be addable with data plus art only.
- **Difficulty:** `normal` ×1, `hard` ×1.6, `hell` ×2.5. The multiplier applies to monster HP and damage. Hell adds boss moves.
- **Party HP scale:** [.45, .6, .75, .9, 1] for 1 to 5 players, counted at run start.
- **Chests:** 3 per dungeon per Thai day, counted across all difficulties. After that the run still plays, without a chest.
- **Chest content:** one dungeon set piece.
  - Set-piece chance by party size: [.5, .6, .7, .85, 1].
  - Grade odds: normal blue 60 / green 30 / purple 10; hard green 50 / purple 35 / orange 15; hell purple 50 / orange 40 / red 10.
  - Grade indexes follow `GRADES`: 0 blue, 1 green, 2 purple, 3 orange, 4 red.
- **Shards:** every clear gives 1 / 2 / 3 shards (normal / hard / hell) to every member, outside the chest limit. 500 shards buy one rainbow piece of the chosen slot. Shards and all dungeon items are tradeable.
- **Dungeon set (all classes, slots head / armor / garment / shoes):**
  - DEF = `defStats(slot, level)` × colour multiplier.
  - Head `pveDmg` .01 × colour multiplier.
  - 2 pieces: `hpPct` .05.
  - 4 pieces: `atkPct` and `matkPct` = base × colour multiplier, using the lowest piece colour. Base is 35 → .05, 45 → .055, 55 → .065, 65 → .07, 80 → .08.
  - Colour multipliers: 1, 1.1, 1.25, 1.4, 1.6, rainbow 1.8.
  - Refine tier 1 (all 4 pieces at +5) `pveDmg` .05. Tier 2 (all at +10) `pveDmg` .10.
- **Death in a dungeon:** a dead player stays down. No free travel, and no item respawn to the map spawn.
  - Revival: an ally's revive skill, or automatic when the room is cleared (back to full HP, placed at the next room's start).
  - Everyone down = wipe: all members revive at the current room start, and the room's monsters return to full.
- **Disconnects:** a player's seat lasts for the whole run. Pressing "ออกจากดัน" is final for that run.
- **Story scenes:** a short scene at entry and another before the boss room. Anyone may skip.
- **Mid-run:** nobody refills a seat once the run has started.
- **UI:** Mali via `var(--font-game)`. Dialogs are skinned automatically by `unified-menu236.js`. Every Thai string gets an entry in `i18n-en.js`.
- **Commits:** `git -c user.name=ThanatZhu -c user.email=43180951+ThanatZhu@users.noreply.github.com commit`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Never** `git add outputs/`. Art comes from the owner's zip `D:\Codex\2026-10-18\files-pasted-by-the-user-ayothaya\outputs\dungeon35-krasue-all-9-2026-11-08.zip`. Unzip it into a scratch folder.

## Review Focus

1. **The leader starts while a member is on another map or dead:** only members who pressed ready within 20 s go in. The rest stay in the party but are not in the run. This is pinned in Task 4.
2. **A player reconnects after the run ended:** they land at their saved return spot, not in an empty instance or a fresh copy. This is pinned in Task 4.
3. **The party wipes in the boss room after phase 2 began:** the boss resets to phase 1 at full HP, and no stray head-form mob stays alive. This is pinned in Task 5.
4. **The last monster of a room dies while the boss phase swap is in flight:** the room must not count as cleared early. `realm.js:559` `dungeonClear` must never fire for dungeon maps. This is pinned in Task 5.
5. **The bag is full when a chest or shards are granted:** they overflow to mail through `grantLoot`, never lost. This is pinned in Task 6.

---

### Task 1: Dungeon catalog, monster types and pixel art

**Files:**
- Create: `dungeons.js`
- Modify: `monster-catalog.js`: append 6 types to `MAP_VARIANTS`, or the append-only list nearest the end (keep `vision-straw-guardian` last in `MONSTER_TYPES`), and add `MONSTER_BEHAVIOUR` entries
- Modify: `scripts/pixel-monster-types.json`, `assets/pixel/monsters.json`
- Create: `assets/pixel/pm-dg35-*.png` (6 strips, built)
- Test: `tests/dungeons.test.mjs` (new)

**Interfaces:**
- Produces, from `dungeons.js`:
  - `DUNGEONS` = `[{id:'krasue',name:'เรือนกระสือริมคลอง',level:35,map:'dg-krasue',cover:'assets/dungeon-krasue/cover.webp',set:'krasue',shard:'shard-krasue',atkBase:.05,rooms:[...],story:{enter:[...],boss:[...]}}]`
  - `DIFFICULTY` = `{normal:{name:'ปกติ',mul:1,shards:1,grades:[[0,.6],[1,.3],[2,.1]]}, hard:{name:'ยาก',mul:1.6,shards:2,grades:[[1,.5],[2,.35],[3,.15]]}, hell:{name:'นรก',mul:2.5,shards:3,grades:[[2,.5],[3,.4],[4,.1]]}}`
  - `PARTY_HP=[.45,.6,.75,.9,1]`, `PIECE_CHANCE=[.5,.6,.7,.85,1]`, `CHESTS_PER_DAY=3`, `SHARDS_PER_PIECE=500`, `MAX_PARTY=5`
  - `dungeonById(id)`
  - `monsterScale(difficulty, partySize)` → `{hp, damage}`. For example, `('hell',2)` → `{hp:2.5*.6, damage:2.5}`. Damage is not party-scaled.
  - `rollGradeFor(difficulty, rand)` → a grade index from `DIFFICULTY[d].grades`
  - `canEnter(dungeon, level)` → `level>=dungeon.level`
- Room script data in `rooms`, used by Task 5:
  - `{kind:'waves', waves:[[type,count]...], start:{x,z}, door:{x,z,to:1}}`
  - `{kind:'lanterns', lanterns:[{x,z}×4], hold:3, spawn:{type:'dg35-krahang', every:8, max:4}, start, door}`
  - `{kind:'miniboss', boss:'dg35-krahang-chief', summonAt:.5, summon:['dg35-krahang',2], start, door}`
  - `{kind:'boss', boss:'dg35-mae-krasue', phase2:'dg35-mae-krasue-head', at:.5, adds:{type:'dg35-krasue-wisp', every:12, max:3}, hellAdds:{type:'dg35-khamot', every:10, max:2}, start}`
- New monster type ids: `dg35-krasue-wisp`, `dg35-khamot`, `dg35-krahang`, `dg35-krahang-chief`, `dg35-mae-krasue`, `dg35-mae-krasue-head`

- [ ] **Step 1: Write the failing tests** in `tests/dungeons.test.mjs`:
  - `dungeonById('krasue').level===35`
  - `monsterScale('hell',2)` deep-equals `{hp:1.5,damage:2.5}`
  - `monsterScale('normal',5)` deep-equals `{hp:1,damage:1}`
  - `rollGradeFor('hell',()=>.95)===4` and `rollGradeFor('normal',()=>.0)===0`
  - every room monster type id resolves in `MONSTER_TYPES`
  - every new type has a pixel strip entry in `assets/pixel/monsters.json` whose png exists
  - `canEnter(dungeonById('krasue'),34)===false`

- [ ] **Step 2: Run** `node --test tests/dungeons.test.mjs`. Expected: FAIL (module missing).

- [ ] **Step 3: Write the monster types.** Levels and roles:
  - wisp L33, fast, `leap`
  - khamot L34, `magic`, `aoe:2.2,windup:.9`, `skirmish:1.4`
  - krahang L35, `skirmish:1.2`
  - chief L38, `elite:true`, `slam` (copy the parameter shape of an existing slam entry)
  - mae-krasue L40, `boss:true`, `aoe:3,windup:1`
  - head L40, `boss:true`, `leap:true,aoe:2.6,windup:.8`

  HP and damage should follow the curve of nearby same-level types in `monster-catalog.js`. Use `bodyHeight` from the prompt heights: 40, 36, 52, 84, 112, 108. **Never** set `summoned`, `worldBoss` or `mvp`.

- [ ] **Step 4: Write `dungeons.js`.** Use the exports listed above. Put the story captions in Thai, from the spec's "เรื่องย่อ" (outputs/dungeon35-prompts-2026-11-08.md). Use 3-4 short captions per scene.

- [ ] **Step 5: Build the strips.**
  - Unzip the owner's zip into a scratch folder.
  - Map the 6 ids in `scripts/pixel-monster-types.json`.
  - Run `blender -b -P scripts/build-pixel-monsters.py -- <scratch folder> assets/pixel`.
  - Confirm that `assets/pixel/monsters.json` gained 6 entries and that the 6 pngs exist.

- [ ] **Step 6: Run** `node --test tests/dungeons.test.mjs tests/pixel-world.test.mjs tests/monster*.test.mjs`. Expected: PASS.

- [ ] **Step 7: Commit** "Dungeons: catalog, difficulty rules and the six krasue monsters".

### Task 2: Dungeon set items, shards and set bonus

**Files:**
- Modify:
  - `gear-sets.js`: add `DUNGEON_GRADE_MUL=[1,1.1,1.25,1.4,1.6]`, `DUNGEON_RAINBOW=1.8`, `dungeonPieceId(set,slot)` → `'dg-'+set+'-'+slot`, `dungeonRainbowId(set,slot)` → `'dg-'+set+'-'+slot+'-r'`
  - `buildGearItems`: emit the dungeon items from `DUNGEONS`
  - `setBonuses`: add a dungeon branch with `SET_REFINE.dungeon={pveDmg:[.05,.10]}`
  - `setLines`: add dungeon lines
- Modify: `items.js`: the shard item `shard-krasue` (kind `material`, tradeable, icon from gear sheet cell 6)
- Create: `assets/dungeon-krasue/gear-0.webp`…`gear-5.webp` (cut from `dungeon-krasue-gear.png`, 3×2 cells of 512; clamp alpha ≥224 to 255), `assets/dungeon-krasue/cover.webp`, `assets/dungeon-krasue/menu.webp` (remove the stray red specks: drop alpha components smaller than 40 px)
- Modify: `i18n-en.js`
- Test: `tests/dungeon-set.test.mjs` (new)

**Interfaces:**
- Consumes: `DUNGEONS[i].set`, `.level` and `.atkBase` (Task 1); `SET_REFINE` and `refineTier` (gear plan).
- Produces:
  - Graded items `dg-krasue-{head,armor,garment,shoes}` (`graded:true`, `dungeonSet:'krasue'`, `level:35`, `kind:'gear'`, no class lock)
  - Rainbow items `dg-krasue-*-r` (`rainbow:true`, not graded)
  - `setBonuses().active` entry `{dungeon:'krasue',count,grade,refineTier}`, where `grade` is the lowest grade and 5 means rainbow

- [ ] **Step 1: Write the failing tests:**
  - A red head (`withGrade('dg-krasue-head',4)`) has `pct.pveDmg===.016` and `def===Math.round(round(.05*35)*1.6)`. Use the new `DEF_PER` head .05.
  - A rainbow head has `pveDmg .018`.
  - Four blue pieces give `atkPct .05` and `hpPct .05`.
  - 4 red pieces give `atkPct .08`.
  - 3 red plus 1 blue give `atkPct .05` (lowest colour).
  - 4 rainbow pieces give `.09`.
  - 4 pieces at +10 add `pveDmg .10` (not .15).
  - Through `deriveStats`, 4 rainbow pieces at +10 give `pveDmg` = min(.15, .018+.10) = `.118`.
  - `itemDef('shard-krasue')` exists and `itemDef('shard-krasue').kind==='material'`.

- [ ] **Step 2: Run** `node --test tests/dungeon-set.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement** the items, the set branch, the lines and the assets (a small script, kept in `scripts/cut-dungeon-art.mjs`, using the same webp encoder the repo already uses; check `scripts/` for it).

- [ ] **Step 4: Run** `node --test tests/dungeon-set.test.mjs tests/gear-sets117.test.mjs tests/items.test.mjs tests/i18n.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit** "Dungeons: krasue set, shards and set bonuses".

### Task 3: The dungeon map

**Files:**
- Modify: `maps/world.json`: append map `dg-krasue` (hand-authored, no `scene`, so the procedural `createFrontierScene` draws it)
- Modify: `world-ui.js`, `boss-browser-ui.js` and atlas/warp lists: hide maps with `dungeon:true`, the way `instance` maps are hidden
- Modify: `tests/world.test.mjs:9`, `tests/frontier38.test.mjs:10`, `tests/guide169.test.mjs:19`: count dungeon maps separately (`maps.filter(m=>!m.dungeon).length===20`) instead of bumping numbers
- Test: `tests/dungeon-map.test.mjs` (new)

**Interfaces:**
- Produces: map `{id:'dg-krasue', name:'เรือนกระสือริมคลอง', kind:'instance', instance:true, dungeon:'krasue', safe:false, levels:[35,40], mobs:[]}`
  - `spawn` = room 0 start
  - `nav.zones`: 4 rectangles laid out along x with gaps of 6 m (not walk-connected): courtyard 24×18, under-house 20×16, kitchen 16×14, bedroom 18×18
  - Decor props from the existing prop set used by procedural maps (look at `mill-cellar`'s `decor`), with `color`/mood matching the night cellar
- `mobs` stays empty: the room script spawns everything.

- [ ] **Step 1: Write the failing test.** The test checks that:
  - `dg-krasue` exists with `instance` and `dungeon:'krasue'`
  - each room's `start`, `door` and the 4 lanterns from `dungeons.js` are `walkable` on its nav (`walkable` from combat-core.js)
  - the 4 zones are pairwise not connected (no `lineClear` from room i start to room j start)

- [ ] **Step 2: Run** `node --test tests/dungeon-map.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Author the map** and fill the coordinates in `dungeons.js`. Update the three count tests and the hide filters.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** "Dungeons: krasue house map".

### Task 4: Runs, entry, ready check, return and reconnect

**Files:**
- Create: `server/dungeon-runs.js`
- Modify: `server/realm.js`
  - `allowed` (:81): add `'dungeon'`
  - `receive`: route `{type:'dungeon',action}`
  - `travelDestination` (:1030-1060): allow `map.dungeon` only with a reservation
  - `join` room id (:116-120): add a dungeon branch
  - `hurt`/clear (:559): skip `dungeonClear` when `room.map.dungeon`
  - `leave`: keep the seat
  - `step`: call `tickDungeonRuns(realm,dt)`
- Modify: `server/host.js:565`: on dungeon travel, write the reserved room's start, not `spawn`
- Test: `tests/dungeon-runs.test.mjs` (new; RealmServer setup like `tests/boss.test.mjs:9-16` and the travel helper in `tests/helpers/ranked223.mjs`)

**Interfaces:**
- Produces, from `server/dungeon-runs.js`:
  - `startReadyCheck(realm,p,{dungeon,difficulty})`: leader or solo. Solo starts immediately; with a party, every party member on the same server gets a `dungeonReady` event and has 20 s.
  - `answerReady(realm,p,yes)`
  - `dungeonReservation(realm,uid)` → `{run,returnTo}` or null
  - `leaveRun(realm,p)`: final for that run
  - `endRun(realm,run,{cleared})`
  - `tickDungeonRuns(realm,dt)`: ready-check timeouts, empty-run cleanup after 10 minutes with nobody connected
- Run shape: `{id, dungeon, difficulty, size, uids:Set, returns:Map(uid→{mapId,position}), roomIndex, state:{}, room:null|Room, startedAt}`
- Room id: `${serverId}:dg:${map.id}:${run.id}`
- Commands (`{type:'dungeon', action}`): `enter {dungeon,difficulty}`, `ready {yes}`, `leave`. Replies go through `world.emit`:
  - `dungeonReady {dungeon,difficulty,leader,deadline}`
  - `dungeonEnter {run}`: the client then travels
  - `dungeonError {reason}`, with reasons `level`, `busy` (in war/duel/arena/another run), `not-leader`, `day-limit-none` (never blocks; informational)
- Add `dungeonReady`, `dungeonEnter`, `dungeonError` and `dungeonRun` to the private event list at `realm.js:611`.

- [ ] **Step 1: Write the failing tests:**
  - Solo enter → `dungeonEnter` → travel → join lands in room `…:dg:dg-krasue:<run>` at room 0 start.
  - A party of 3: the leader enters, 2 answer yes and 1 never answers → after 20 s the run holds 2 uids plus the leader. The silent member keeps the party but has no reservation.
  - Two separate solo players get two different rooms.
  - A member disconnects mid-run and rejoins 5 minutes later → back in the same room.
  - After `leaveRun`, a join puts the player at `returns` (their old map and position), and `dungeonReservation` is null.
  - After `endRun`, a reconnecting member is sent to `returns`.
  - Killing the last mob of a room never emits `dungeonClear`.
  - A level 34 player gets `dungeonError {reason:'level'}`.

- [ ] **Step 2: Run** `node --test tests/dungeon-runs.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement** the module and the realm/host hooks. Return travel reuses the server-decided map path: set `record.state.mapId/position` from `returns`. The client's `welcome` check (`multiplayer-ui.js:251-253`) reloads to the right map.

- [ ] **Step 4: Run** `node --test tests/dungeon-runs.test.mjs tests/boss.test.mjs tests/arena166.test.mjs tests/warp59.test.mjs tests/multiplayer24.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit** "Dungeons: runs, ready check, private rooms and return travel".

### Task 5: Room script

**Files:**
- Create: `server/dungeon-script.js`
- Modify:
  - `server/realm.js` `step` (:593-608): call `runScript(realm,room,dt)` for dungeon rooms; mob damage to players uses `m.power`
  - player death in dungeon rooms: block `respawn` travel and `returnToSpawn` (:354-355) with `itemFail(p,'dungeon-down')`
  - snapshot: include `room.dungeon` (objective, lanterns lit, phase)
- Modify: `combat-core.js` `monsterHit` callers, or the single place monster damage to a player is computed: multiply by `m.power??1` (grep `monsterHit(`)
- Test: `tests/dungeon-script.test.mjs` (new)

**Interfaces:**
- Consumes: run (Task 4), `DUNGEONS[].rooms` and `monsterScale` (Task 1).
- Produces:
  - `runScript(realm,room,dt)`
  - `spawnInRoom(room,typeId,at,scale)` → mob: pushes a new mob with the next id, `maxHp=hp=type.hp*scale.hp` and `power=scale.damage`, and never sets `summoned`
  - snapshot field `room.dungeon={room:i, kind, text, lanterns?:[0..1]×4, phase?}`. `text` is Thai, for example `'จุดตะเกียง 2/4'`, `'ระลอก 2/3'`.
  - in-map teleport `teleport(p,{x,z})`: reuse the wind-wing path at `realm.js:295`

Behaviour:
- **waves:** spawn the next wave when the current one is dead. After the last wave, open the door.
- **lanterns:**
  - A living member within 1.5 m adds dt to that lantern. At `hold` (3 s) it is lit.
  - Spawn a krahang every 8 s while fewer than 4 are alive.
  - When all 4 are lit, despawn the krahang (mark them dead) and open the door.
- **miniboss:** spawn the chief at room start + 4 m. At ≤50% HP it summons 2 krahang once. Its death opens the door.
- **boss:**
  - Spawn on arrival, after a 3 s delay.
  - At ≤50% HP, mark phase 1 dead and spawn the head form with `hp = type.hp*scale.hp*.5` at the same spot, with `phase=2`.
  - Adds come every 12 s (up to 3). Hell also adds a khamot every 10 s (up to 2), and phase 2 uses `leap` twice in a row (set `m.leapCD` to 0 after the first leap once).
  - The head's death clears the run, via Task 6 `grantRunRewards` then `endRun(..,{cleared:true})`.
- **door:** when open, a member standing within 1.6 m of the door moves the whole run's living and down members to the next room `start`. Down members revive at full HP.
- **Wipe:** all members in the room are down (`player.hp<=0`), or nobody is connected for more than 60 s. Then:
  - mark the room's live mobs dead
  - re-run the current room from its start (boss back to phase 1)
  - revive everyone at full HP at `start`
  - lanterns reset to 0

- [ ] **Step 1: Write the failing tests** (drive time by calling `realm.step(dt)`):
  - Wave 2 appears only after wave 1 dies.
  - A lantern lights after 3 s of standing, not 2.9.
  - 4 lit lanterns open the door and stepping on it moves all members.
  - The chief summons exactly 2 krahang once.
  - The boss swaps to the head at 50% and the room never clears in between.
  - A hell run spawns khamot adds and a normal run does not.
  - A wipe in phase 2 resets to phase 1 at full HP with no head alive.
  - A down player cannot use `respawn` travel.
  - A run of 2 players gives monsters `maxHp = type.hp*.6*mul`.

- [ ] **Step 2: Run** `node --test tests/dungeon-script.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** `node --test tests/dungeon-script.test.mjs tests/death178.test.mjs tests/boss.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit** "Dungeons: krasue room script, wipes and boss phases".

### Task 6: Rewards, daily chests and the rainbow exchange

**Files:**
- Create: in `server/dungeon-runs.js`, `grantRunRewards(realm,run)` and `exchangeShards(realm,p,{dungeon,slot})`
- Modify: `server/realm.js`: persist `p.dungeonChests={day,counts:{}}` next to `dungeonDay` (:129, :1061); add the command action `exchange`
- Test: `tests/dungeon-rewards.test.mjs` (new)

**Interfaces:**
- Consumes: `DIFFICULTY`, `PIECE_CHANCE`, `CHESTS_PER_DAY` and `SHARDS_PER_PIECE` (Task 1); dungeon item ids (Task 2); `grantLoot` (`realm.js:974`).
- Produces:
  - event `dungeonReward {shards, piece?:id, chestsLeft, coins, exp}`
  - `exchangeShards` → grants `dungeonRainbowId(set,slot)` and takes 500 `shard-…`; errors `not-enough`, `bad-slot`
- Coins and EXP per clear: `coins = level*30`, `exp = mobXp`-style using the boss's `baseXp`. Use the existing `mobXp` helper.

- [ ] **Step 1: Write the failing tests:**
  - A hell clear gives every member 3 shards.
  - A 5-player run with `rand` 0 gives each member one piece with grade from `rollGradeFor`.
  - A solo run with `rand` .6 gives no piece (.6 ≥ .5) but still shards.
  - The 4th clear in a Thai day gives shards and no chest, and `chestsLeft` is 0.
  - The day rolls over at Thai midnight.
  - A full bag sends the piece to mail.
  - Exchanging with 499 shards fails `not-enough`.
  - Exchanging with 500 gives `dg-krasue-head-r` and leaves 0.

- [ ] **Step 2: Run** `node --test tests/dungeon-rewards.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** `node --test tests/dungeon-rewards.test.mjs tests/dungeon-runs.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit** "Dungeons: chests, shards and the rainbow exchange".

### Task 7: Find-players queue

**Files:**
- Create: `server/dungeon-queue.js` (copy the `valid()`, timeout and clean pattern from `server/arena-queue223.js`)
- Modify: `server/realm.js`: actions `queue` and `unqueue`; `step` calls `tickDungeonQueue`
- Test: `tests/dungeon-queue.test.mjs` (new)

**Interfaces:**
- Produces: `queueFor(realm,p,{dungeon,difficulty})` and `unqueue(realm,p)`, both queueing as a whole party (leader only) or solo; `tickDungeonQueue(realm,dt)`; event `dungeonQueue {state:'waiting'|'offer'|'matched', size, since}`.
- **Matching:** within one `dungeon+difficulty` key, take groups oldest first and add whole groups while the total stays ≤ 5. At exactly 5:
  - form one party with the existing party code, keeping the oldest group's leader
  - run `startReadyCheck`
- **Offer:** after 90 s, if the oldest group has a total of ≥2 available players, send them an `offer`. Answering yes starts with those groups.
- **Removal:** a group leaves the queue on travel, on joining a war, duel or arena, or after `unqueue`.

- [ ] **Step 1: Write the failing tests:**
  - 5 solos match into one party with a ready check.
  - A party of 3 plus 2 solos match, and the leader stays the party's leader.
  - A party of 4 plus a party of 2 do not match (would be 6).
  - At 91 s two solos get an offer.
  - Travelling removes you from the queue.
  - Different difficulties never match.

- [ ] **Step 2: Run** `node --test tests/dungeon-queue.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** `node --test tests/dungeon-queue.test.mjs tests/arena166.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit** "Dungeons: find-players queue".

### Task 8: Dungeon window, tracker and story

**Files:**
- Create: `dungeon-ui.js`, `dungeon-ui.css`, `dungeon-window-state.js` (a pure module)
- Modify:
  - `viewer-world.js:262`: create `createDungeonUI({game,catalog,map,worldUI})`
  - `hud-63.js:12-13`: `'menu-dungeon'` in `PRIMARY`
  - `multiplayer-client.js` / `game-controls.js`: send `{type:'dungeon',…}` through `world.market('dungeon',data)` (`client.command`)
  - `game.html`: link the css
  - `i18n-en.js`
- Test: `tests/dungeon-window-state.test.mjs` (new; pattern from `party-ui-state.js` / `tests/party130.test.mjs`)

**Interfaces:**
- Consumes: the events from Tasks 4, 6 and 7; `room.dungeon` from the snapshot (Task 5); `DUNGEONS` and `DIFFICULTY` (Task 1).
- Produces:
  - `dungeonActions({level, party, selfId, queue, inRun, dungeon, chestsLeft})` → `{enter:{on,reason}, queue:{on,reason}, exchange:{on}, label}`
  - Reason text in Thai: `'เลเวลไม่ถึง'`, `'หัวหน้าปาร์ตี้เป็นคนกดเข้า'`, `'กำลังหาคน'`, `'อยู่ในดันแล้ว'`

**Window (`<dialog id="dungeon-window">`, opened with `openHudPanel`):**
- A list of dungeon cards: the cover image, name, `Lv.35`, and a lock when the level is too low.
- The selected card shows:
  - 3 difficulty buttons
  - "drops" icons for the chosen difficulty (set piece icons with the grade colours in odds order, plus the shard icon)
  - `หีบวันนี้ เหลือ N/3`
  - the shard count and an **แลกชุดรุ้ง** row: 4 slot buttons, each `500` and disabled when there are not enough shards
- Buttons: **เข้าดัน** (solo or leader), **หาคน** / **ยกเลิกหาคน**.
- The ready-check popup shows the dungeon, difficulty and a 20 s countdown, with **พร้อม** and **ไม่พร้อม**.
- The queue offer popup asks **เข้าเลยไหม (N คน)**.

**In the dungeon:**
- A small tracker under the quest tracker shows `room.dungeon.text` and an **ออกจากดัน** button, which asks for confirmation.

**Story:**
- On the first `dungeonRun` snapshot in room 0, and when arriving in the boss room, dispatch `quest-cinematic-request` with `captions` from `DUNGEONS[].story`, using `art.src` = the cover.
- The boss spawns 3 s after arrival (Task 5), so `danger()` does not block the scene.

**Narrow screens:** follow `boss-browser-ui.css:9-10` (`calc(100vw - 16px)`). Cards stack in one column below 700 px.

- [ ] **Step 1: Write the failing tests** for `dungeonActions`:
  - Level 34 → enter off with reason `'เลเวลไม่ถึง'`.
  - A party member who is not the leader → enter off.
  - Solo at level 35 → enter on.
  - While queued → queue shows cancel.
  - In a run → both off.

- [ ] **Step 2: Run** `node --test tests/dungeon-window-state.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement** the state module, the window, the tracker, the HUD button (icon `assets/dungeon-krasue/menu.webp`) and the i18n entries.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Play it locally.**
  - Use the `class-test` launcher on port 8789. Its config lives in `.claude/launch.json`; recreate it if missing.
  - Enter solo on normal and play through all 4 rooms.
  - Take a screenshot of the window, the lantern room and the boss phase 2.

- [ ] **Step 6: Commit** "Dungeons: window, ready check, tracker and story scenes".

### Task 9: Release gate

- [ ] **Step 1:** Run `npm test` and `npm run release:check`. Both must pass. Fix any failure in the task that owns it.
- [ ] **Step 2:** Report to the owner with screenshots. Do not push: a push needs the owner's approval, and it is a server change, so it goes through main and restarts the realm.
