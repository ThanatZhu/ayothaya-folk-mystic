# Ground loot and companion collection — owner rule, 30 October 2026

## กฎหลัก

**ใส่สัตว์เลี้ยง / พาติดตาม = สัตว์เลี้ยงวิ่งเก็บของให้อัตโนมัติทันที** ไม่ต้องกดเก็บ ไม่ต้องเปิด AUTO ต่อสู้ ไม่ต้องเปิดสกิล AUTO ของสัตว์เลี้ยง และไม่ต้องมีสวิตช์เก็บของอีกอัน

สัตว์เลี้ยงต้องเดินหรือบินตามชนิดของมันไปถึงของก่อน เซิร์ฟเวอร์จึงให้ของเข้ากระเป๋า แล้วสัตว์เลี้ยงกลับมาหาเจ้าของ ห้ามทำเป็นดูดของเข้ากระเป๋าจากระยะไกลทันที

มีสัตว์เลี้ยงในคลังอย่างเดียวแต่ยังไม่ได้พาติดตาม หรือสัตว์อัญเชิญจากสกิล ไม่ถือว่ามีสัตว์เลี้ยงช่วยเก็บของ เมื่อให้พักหรือถอดสัตว์เลี้ยงออกจึงหยุดเก็บ ผู้เล่นไม่มีสัตว์เลี้ยงแตะ/คลิกของหรือกด F เพื่อเดินไปเก็บเองได้

การปิด AUTO ต่อสู้หรือสกิล AUTO ของสัตว์เลี้ยง **ห้ามหยุดการเก็บของ** ทั้งสามระบบแยกหน้าที่กัน

## Authority and gameplay contract

- All monster rolled loot, cowries and existing MVP ember rewards land on the ground. Existing drop tables, amounts, EXP, class/gender eligibility and combat/economic balance stay unchanged.
- An owned equipped/following premium companion automatically collects on its own, regardless of combat AUTO and pet skill AUTO. All 10 species, all classes, genders and star ranks share this rule.
- The realm checks equipped ownership, player health, observer/suspension state, transaction locks, room, reserved priority, distance and unobstructed reach. Never accept client-supplied rewards, amounts, position or claims of pet ownership.
- Existing eligible killers retain their per-player loot rolls. Their captured party roster shares first-pick access for 8 seconds, then bundles are public. Exactly one collector can consume a bundle.
- Pets collect within 12 metres of the owner and physically travel at 6 m/s on a walkable route. Hand pickup requires 1.8 m. Unequip/rest, death, observer mode, disconnect, active transaction lock or leaving the room stops collection.
- Ground items expire after 90 seconds; room memory is capped at 512 bundles. The nearest 96 bundles within 40 m stream by deltas. Ground state is transient, not saved each tick to Firestore. Existing durable save intervals remain unchanged.
- Online bag overflow uses existing mailOverflow. Quest/login/craft/mail rewards remain direct. No free pet, extra gold, new prices, odds or reward multiplier is introduced.
- Boss victory reports initially show rare loot as on the ground, then resolve to its actual collector/mail delivery or expiration. Never describe uncollected items as received.
- Offline guests follow the same companion rule. Full guest bags leave the uncollected remainder on the ground because guest mail is unavailable.
- Reuse transparent existing item art. No rectangular rarity plates, new full-screen flash, additional renderer or permanent per-item motion.
- F picks a collectible drop if one is present; otherwise the original combat AUTO shortcut applies. The main key handler dispatches once, so the same press never toggles AUTO and picks up.
- Before changing this system, read this document and run tests/ground-loot219.test.mjs plus item, pet, mailbox and boss receipt regression checks.

## Implementation and verification

Prepared from main commit 73168ea in work/pet-ground-loot. The owner authorized pushing this feature on 30 October, then clarified that following pets collect with combat AUTO OFF. That clarification supersedes the earlier combat-AUTO-gated draft.

The collector uses shared route planning and authority-owned coordinates; rendering only interpolates these coordinates and existing move poses. No new animation loop, renderer, package or generated art is added. Normal-motion video and desktop/touch screenshots were visually reviewed before the final independence clarification.

Verification is recorded in outputs/ground-loot219 (never commit outputs). Existing hunter/shaman boss-auto201 failures are documented by the prior handoff and are not fixed through balance changes here. Baseline audio180 generic-cue 404s are recorded separately from new loot assets.

## Release preflight — 30 October 2026

Final owner rule verified: equipped/following pets collect while combat AUTO stays OFF, without a pickup key or another switch. All three real-game browser scenarios passed (desktop, landscape touch, reduced-motion touch); desktop F pickup preserves combat AUTO and F with no drops retains its original AUTO action. No new page errors or changed-asset failures.

Final build passed. Whole suite: 921 tests, 905 passed, 14 skipped, only the 2 previously documented hunter/shaman boss-auto201 failures remain. Translation coverage: 0 of 5153 strings missing. Outputs, local test accounts and recordings are excluded from the commit.

## Ground presentation — 225

Ground loot is world geometry, never a screen-space inventory icon. Reuse the existing transparent item artwork, crop atlas padding, lay the cutout flat on the sampled terrain, and keep a small contact shadow. World lights, fog, depth occlusion and camera perspective apply naturally. Do not add bobbing, perpetual spins, inventory frames or inventory rarity halos to normal ground drops.

The HTML layer contains only transparent 44/48 px mouse/touch targets, accessible labels and focus/hover hints. It must not draw a second visible copy of the item. Reserved bundles remain dimmed and explain ownership. Ground positions and pickup permissions still come from the realm; the presentation must not change rates, rewards or pet collection.

Repeated artwork shares an instanced draw call, with one instanced contact-shadow batch. Geometry and image materials update when bundles change; there is no new renderer, animation loop or per-item light. Release instance buffers, materials and cropped textures when the last reference disappears.

Verification: 32 focused loot/item/pet/mail tests pass. Real local realm + WebGL checks pass at 1440×900, 844×390 touch, and reduced-motion touch: manual pickup, F pickup, pet travel/return with combat AUTO off, no duplicate rewards, no changed-asset 404s or page errors. Camera orbit leaves world item matrices unchanged; scene-light checks preserve item material colours. Actual desktop/phone/rotated screenshots and local evidence are in outputs/ground-loot225 (untracked). The known 19 generic audio180 missing cues remain separate from this visual change. Phone checks are emulation, not a physical-device claim.
