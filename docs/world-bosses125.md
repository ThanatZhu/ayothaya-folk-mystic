# World monsters and map bosses — release 125

This release connects the approved creature art to authoritative online combat,
loot, the world atlas and the existing back office. Safe towns stay safe.
Existing story, awakened and rotating MVP bosses remain separate.

## Map progression

| Map | Suggested level | Map boss | HP |
| --- | --- | --- | ---: |
| Rice Fields | 1–12 | ขุนฟางพิทักษ์นา | 500,000 |
| Old Orchard | 10–22 | พญาวานรหมากทอง | 1,000,000 |
| Moonlit Mill | 20–30 | อสุรโรงสีจันทรา | 1,500,000 |
| Lotus Marsh | 25–35 | พญาเต่าบัวทมิฬ | 2,000,000 |
| Bamboo Grove | 35–45 | ปอบเจ้าดง | 2,500,000 |
| Ruined Temple | 45–55 | อาถรรพ์ระฆังร้าง | 3,000,000 |
| Himmapan Edge | 55–70 | คชสารพฤกษา | 3,500,000 |
| Naga Cave | 70–85 | นาคพิทักษ์บาดาล | 4,000,000 |
| Kailash Peak | 85–99 | ยักษ์เมฆาคุ้มขุนเขา | 4,500,000 |

The five newly populated hostile maps have 27 common monsters, one elite and
one map boss each. Common monsters have ordinary tier-scaled HP; the 500,000
ladder applies to map bosses. Boss attack damage, level, rewards and mechanics
also rise with the map order. Bosses are optional group encounters, including
the boss in the starter field. Boss spawns are away from entry and NPC areas;
all new spawn positions and routes are checked against map navigation.

## Respawn contract

Each natural boss gets a wall-clock deadline exactly 3,600 seconds after death.
The key is realm + channel + map. Empty rooms, changing maps and server restart
do not erase the deadline. Local hosting uses an atomic JSON store; Firebase
hosting uses an authority-fenced transaction in the private multiplayerRuntime
collection. The active host loads deadlines before it accepts players. Failed
writes stay dirty and are retried; shutdown flushes outstanding writes.
Simultaneous legacy-room copies cannot award the same natural boss twice.
Manual admin summons use the selected channel and do not reset natural timers.

## New loot

47 item definitions: 9 map materials, 9 boss-seal accessories and 29 monster
cards. Every new monster has its own card and a complete drop table.

- Natural map boss: 5 map materials guaranteed; seal accessory 8%.
- Material chance: common 45%, elite 85%.
- Card chance: common 0.04%, elite 0.1%, boss 0.2%.
- Boss: lek-lai 65%, breakguard 12%; higher maps also drop appropriate fine
  equipment at 1% per piece and elite equipment at 0.4% per piece.
- Nine craft recipes offer a guaranteed material route to the seal accessory.

Accessories have required levels and ascending defense/stats. All entries are
available in existing item, monster, recipe and drop administration. The new
map-boss page shows HP, attack, realm/channel and the server respawn deadline.
Its fixed one-hour respawn is not editable through the general monster editor.

## Art and animation

29 original monsters, each with eight authored key poses (232 poses):
idle, two alternating movement poses, wind-up, strike, hurt, recovery and down.
These are key-pose sprites, not high-frame-count skeletal animations. Shared
scale and foot anchors preserve relative size, including crouched/down poses.
Online snapshots carry the gait phase and strike timer.

Art is in assets/monsters-chapter2/animations/. The new materials and seals use
world-drops-v1.png (18 icons in a transparent 6×4 sheet). Cards use the matching
monster's idle cell with a UI border. The active map loads its own creature art;
admin summons load their art on demand.

Generation mode: built-in image_gen, no external image API or CLI.
Exact prompts: world-boss-designs.json, world-drops-prompt.json,
animation-prompts-v1.json and production-prompts-v2.json in the same asset folder.
Original PNGs are retained. The inspection script only reads pixels and writes
frame metadata, including connected-component masks where silhouette bounds
overlap neighboring cells.

## Verification

- tests/map-boss125.test.mjs: HP ladder, navigation, loot/crafting, all 29 atlases,
  exact deadline boundary, realm/channel separation, persisted re-entry, retry,
  authority fencing, protected admin endpoint and online pose serialization.
- scripts/check-world125-live.mjs: real local server, nine maps, authored textures,
  online wind-up/strike, mobile layouts and the admin boss/drop views.
- Full repository node tests, static build, content validation and diff checks.

Publish requires both the frontend world.json version 125 and the backend
/health contentVersion 125, mapBossSchema 1 and monsterTypes 53. A frontend-only
deployment cannot enable authoritative monster combat.
