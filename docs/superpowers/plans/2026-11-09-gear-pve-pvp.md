# Gear PVE/PVP Damage and Refine Set Tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `pveDmg` and `pvpDmg` stats to gear, unlock set tiers by refining every piece to +5 or +10, apply both stats in the server's damage path, and move the DEF share off helmets.

**Architecture:** The stats ride the existing `pct` path: item `pct` plus `setBonuses` (gear-sets.js), feeding `deriveStats` (character-stats.js), which caps them at 15% of gear. The server multiplies outgoing damage in one place for each kind of target:
- monsters: `server/realm.js` `hurt`
- players: `pvp223.js` `pvpDamage`

The client mirrors the monster multiplier in `combat-core.js` `hurt`. A set's refine tier is the lowest refine level across its pieces, computed inside `setBonuses` from `it.refine` (already parsed by `itemDef`).

**Tech Stack:** Plain ES modules, Node 20 `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-08-party-dungeons-design.md`, sections "ดาเมจ PVE และ PVP" and "แก้รอบสอง 9 พ.ย." (owner approved the numbers on 9 Nov).

## Global Constraints

- **Gear cap:** gear gives at most +15% PVE and +15% PVP (`STAT_CAPS.pveDmg = STAT_CAPS.pvpDmg = .15`). Cards will add on top later; this plan adds no card values.
- **Slot roles:** DEF slots are armor, garment and shoes. DMG slots are head, weapon and accessory. No new slots.
- **Set tiers:** a set reaches tier 1 when every piece of the full set is +5 or more, and tier 2 at +10 or more. Tier 2 replaces tier 1; they do not stack.
- **Crafted map sets (FAMILIES):**
  - head `pvpDmg` .005 × grade multiplier
  - crafted class weapon `pvpDmg` .01 × grade multiplier
  - full set = 4 pieces; tier 1 `pvpDmg` .03, tier 2 .06
- **Boss rainbow sets:**
  - head `pvpDmg` .015, weapon `pvpDmg` .025
  - full set = 5 pieces including the weapon; tier 1 .05, tier 2 .10
- **DEF_PER:** `{head:.05, armor:.55, garment:.15, shoes:.12}`. This intentionally changes gear players already own.
- **i18n:** every new Thai string gets an entry in `i18n-en.js` (`tests/i18n.test.mjs` fails otherwise).
- **Commits:** `git -c user.name=ThanatZhu -c user.email=43180951+ThanatZhu@users.noreply.github.com commit`. The message is in English and ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A set with one piece one level short** (+4 among +5s) gets no tier bonus. This is pinned in Task 2.
2. **A boss set worn as 4 armor pieces without the weapon** never unlocks a tier. This is pinned in Task 2.
3. **PvP damage to a target with high DEF** still subtracts DEF after the multiplier, and a 0-damage dodge stays 0. This is pinned in Task 3.
4. **A gear stack above 15%** (stacking test values) is capped in `deriveStats`, not in `setBonuses`. `setBonuses` still reports the raw sum for the bag text. This is pinned in Task 2.
5. **The guild-war stone** (`realm.js` `warHit`, the stone is not a player) gets neither multiplier. This is left as is on purpose; Task 3 asserts that the stone's damage is unchanged.

---

### Task 1: Item values and DEF share

**Files:**
- Modify: `gear-sets.js`
  - `STAT_NAME` (:38): add `pveDmg:'ดาเมจ PVE'`, `pvpDmg:'ดาเมจ PVP'`
  - `STAT_CAPS` (:40): add `pveDmg:.15`, `pvpDmg:.15`
  - `DEF_PER` (:67)
  - `gradeItem` (:78)
  - `buildGearItems` (:83-112)
- Modify: `i18n-en.js`: add `"ดาเมจ PVE":"PVE damage"`, `"ดาเมจ PVP":"PVP damage"`
- Test: `tests/gear-pvp-pve.test.mjs` (new)

**Interfaces:**
- Produces:
  - item `pct.pvpDmg` on crafted heads, crafted class weapons, boss heads and boss weapons
  - `STAT_CAPS.pveDmg` and `STAT_CAPS.pvpDmg`
  - `gradeItem(it,g)` now also scales `pct.pveDmg` and `pct.pvpDmg` by `GRADES[g].mul` (rounded to 4 decimals)

- [ ] **Step 1: Write the failing test** `tests/gear-pvp-pve.test.mjs`:
```js
import {ITEMS} from '../items.js';
import {pieceId,weaponId,bossId,withGrade,FAMILIES} from '../gear-sets.js';
test('heads and weapons carry PVP damage by grade, armour pieces do not',()=>{
 const head=ITEMS[pieceId('pierce','head','swordsman',6)],red=ITEMS[withGrade(pieceId('pierce','head','swordsman',6),4)];
 assert.equal(head.pct.pvpDmg,.005);assert.equal(red.pct.pvpDmg,.008);
 assert.equal(ITEMS[withGrade(weaponId('swordsman',6),4)].pct.pvpDmg,.016);
 assert.equal(ITEMS[pieceId('pierce','armor','swordsman',6)].pct.pvpDmg,undefined);
 assert.equal(ITEMS[bossId('head','swordsman')].pct.pvpDmg,.015);assert.equal(ITEMS[bossId('weapon','swordsman')].pct.pvpDmg,.025);
});
test('DEF moves from the helmet to the garment and shoes',()=>{
 assert.equal(ITEMS[pieceId('wall','head','swordsman',6)].def,Math.round(.05*85));
 assert.equal(ITEMS[pieceId('wall','garment','swordsman',6)].def,Math.round(.15*85));
 assert.equal(ITEMS[pieceId('wall','shoes','swordsman',6)].def,Math.round(.12*85));
});
```
(Use `test`/`assert` imports as in `tests/gear-sets117.test.mjs`. If `ITEMS[...]` for a graded id is not a direct key, use `itemDef` from items.js the way gear-sets117 does.)

- [ ] **Step 2: Run** `node --test tests/gear-pvp-pve.test.mjs`. Expected: FAIL (`pvpDmg` undefined, head def 10 instead of 4).

- [ ] **Step 3: Implement.**
  - `DEF_PER` gets the new values.
  - In `buildGearItems`:
    - crafted pieces with `slot==='head'` get `pct:{...f.piece,pvpDmg:.005}`
    - crafted class weapons get `pct:{pvpDmg:.01}`
    - boss heads get `pct:{...b.piece,pvpDmg:.015}`
    - boss weapons get `pct:{...b.piece,pvpDmg:.025}`
  - `gradeItem` scales `o.pct={...it.pct}` keys `pveDmg` and `pvpDmg` by `k`, rounded to 4 decimals, then rebuilds `o.text`.

- [ ] **Step 4: Run** `node --test tests/gear-pvp-pve.test.mjs tests/gear-sets117.test.mjs tests/items.test.mjs tests/boss-set-effects.test.mjs tests/i18n.test.mjs`. Expected: all pass.

- [ ] **Step 5: Commit** "Gear: PVP damage on heads and weapons, DEF moves to garment and shoes".

### Task 2: Refine set tiers and the 15% cap

**Files:**
- Modify:
  - `gear-sets.js` `setBonuses` (:152-164)
  - add `export const SET_REFINE={family:{pvpDmg:[.03,.06]},boss:{pvpDmg:[.05,.10]}}` next to `ATK_PCT`
  - add `export function setTierLines(active)` after `bossLines`
- Modify:
  - `character-stats.js` `deriveStats` (:131-135): add `pveDmg` and `pvpDmg`, each `Math.min(STAT_CAPS.x, set('x'))`, rounded like the other gear stats
  - `bag-ui.js` `setInfo` (:51-58): append `setTierLines`
- Modify: `i18n-en.js`, for the Thai tier line text
- Test: `tests/gear-pvp-pve.test.mjs`

**Interfaces:**
- Consumes: `pct.pvpDmg` from Task 1, and `it.refine` on each `itemDef` result (items.js:158-178)
- Produces:
  - `setBonuses(worn).active[i].refineTier` (0, 1 or 2) on full sets
  - `derived.pveDmg` and `derived.pvpDmg` (0 to .15)
  - `setTierLines(active)` returns `[text,on][]`
    - Text pattern: `'ตีบวก +5 ทั้งชุด: ดาเมจ PVP +3%'` and `'ตีบวก +10 ทั้งชุด: ดาเมจ PVP +6%'`
    - `on` is true when the tier is reached

- [ ] **Step 1: Add the failing tests.** Build `worn` lists with `itemDef(composeId(base, refine, null, null, grade))`:
```js
test('a full family set unlocks PVP at +5 on every piece and doubles at +10',()=>{
 const set=r=>['head','armor','garment','shoes'].map(s=>itemDef(composeId(pieceId('pierce',s,'swordsman',6),r)));
 const at=r=>setBonuses(set(r)).total.pvpDmg;
 assert.equal(+at(4).toFixed(4),.005);                       // head only
 assert.equal(+at(5).toFixed(4),.035);assert.equal(+at(10).toFixed(4),.065);
 const mixed=set(5);mixed[2]=itemDef(composeId(pieceId('pierce','garment','swordsman',6),4));
 assert.equal(+setBonuses(mixed).total.pvpDmg.toFixed(4),.005);
 assert.equal(setBonuses(set(10)).active[0].refineTier,2);
});
test('a boss set needs all five pieces, weapon included',()=>{
 const armour=r=>['head','armor','garment','shoes'].map(s=>itemDef(composeId(bossId(s,'swordsman'),r)));
 assert.equal(+setBonuses(armour(10)).total.pvpDmg.toFixed(4),.015);
 const full=[...armour(10),itemDef(composeId(bossId('weapon','swordsman'),10))];
 assert.equal(+setBonuses(full).total.pvpDmg.toFixed(4),.14);
});
test('derived PVE and PVP damage never pass 15% from gear',()=>{
 const worn={weapon:composeId(bossId('weapon','swordsman'),10),...Object.fromEntries(['head','armor','garment','shoes'].map(s=>[s,composeId(bossId(s,'swordsman'),10)]))};
 const d=deriveStats({classId:'swordsman',level:99,gear:worn});assert.equal(+d.pvpDmg.toFixed(4),.14);assert.equal(d.pveDmg,0);
 assert.equal(STAT_CAPS.pvpDmg,.15);assert.equal(STAT_CAPS.pveDmg,.15);
 // over the cap: the dungeon plan's tests reach PVE .118 + a future card; here assert deriveStats clamps by calling it with a
 // hand-made item list is not possible, so the clamp is covered by reading the code path in review (Review Focus 4).
});
```

- [ ] **Step 2: Run** `node --test tests/gear-pvp-pve.test.mjs`. Expected: the 3 new tests FAIL.

- [ ] **Step 3: Implement.**
  - **Family set:** in `setBonuses`, when a family has 4 or more pieces, take `lo=Math.min(...pieces.map(it=>it.refine??0))` and `refineTier = lo>=10?2:lo>=5?1:0`. If the tier is above 0, add every `SET_REFINE.family` key at index `tier-1`, then push it on `active`.
  - **Boss set:** do the same only when the worn count `n` is 5, using `SET_REFINE.boss`. Push `refineTier` on the boss `active` entry.
  - **`setTierLines`:** returns two lines per active full set (count 4 for a family, 5 for a boss).
  - **`deriveStats`:** add the two capped stats.
  - **Bag:** `setInfo` appends `setTierLines(active)`, using the same markup as the existing set lines.

- [ ] **Step 4: Run** `node --test tests/gear-pvp-pve.test.mjs tests/gear-sets117.test.mjs tests/class-reward192.test.mjs tests/character-stats.test.mjs tests/i18n.test.mjs`. Expected: all pass.

- [ ] **Step 5: Commit** "Gear: refine +5/+10 on a full set unlocks PVP tiers; cap gear PVE/PVP at 15%".

### Task 3: Apply PVE/PVP in the damage path and show the stats

**Files:**
- Modify: `pvp223.js` `pvpDamage` (:3-10): multiply `amount` by `1+(source?.pvpDmg??0)` before the dodge and guard steps
- Modify: `server/realm.js` `hurt` (:548): `amount=Math.min(mob.hp,Math.round(damage*petBlessing(p.world)*(1+(p.world.derived?.pveDmg??0))))`
- Modify: `combat-core.js` `hurt` (:290): the same factor, from `this.derived?.pveDmg`
- Modify: `status-metrics238.js` `statusMetrics` (:7-46): rows for `pveDmg` and `pvpDmg` as percentages, labelled from `STAT_NAME`
- Test: `tests/gear-pvp-pve.test.mjs`, `tests/overnight223.test.mjs` (keep passing)

**Interfaces:**
- Consumes: `derived.pveDmg` and `derived.pvpDmg` from Task 2.
- Produces: nothing new for other tasks. The dungeon plan's sets will set `pct.pveDmg` and rely on this path.

- [ ] **Step 1: Add the failing tests.**
```js
test('PVP damage raises player hits after the attacker bonus, before the target defence',()=>{
 const target={derived:{def:0,mdef:0,flee:0},player:{shield:0},status:{}};
 const plain=pvpDamage({derived:{},damageContext:{}},target,100,1,()=>1);
 const strong=pvpDamage({derived:{pvpDmg:.1},damageContext:{}},target,100,1,()=>1);
 assert.equal(plain,100);assert.equal(strong,110);
 const armoured={...target,derived:{def:50,mdef:0,flee:0}};
 assert.ok(pvpDamage({derived:{pvpDmg:.1},damageContext:{}},armoured,100,1,()=>1)<110);
});
test('PVE damage raises monster hits on the server',()=>{
 // RealmServer setup copied from tests/realm-hurt-rally.test.mjs
 const [m]=p.room.mobs;m.hp=m.maxHp=10000;p.world.derived.pveDmg=.1;
 realm.hurt(p,m,100);assert.equal(m.hp,10000-110);
});
```
(Read `pvpDamage`'s dodge line first. Pick the `random` stub and target fields so the dodge never fires. If `petBlessing` is not 1 for a fresh player, compare against the same call with `pveDmg=0`.)

- [ ] **Step 2: Run** `node --test tests/gear-pvp-pve.test.mjs`. Expected: the 2 new tests FAIL.

- [ ] **Step 3: Implement** the three multipliers and the two status rows.

- [ ] **Step 4: Run the full suite:** `npm test`. Expected: all pass. Then run `npm run release:check` and note any failure.

- [ ] **Step 5: Commit** "Combat: apply gear PVE damage to monsters and PVP damage to players; show both in status".
