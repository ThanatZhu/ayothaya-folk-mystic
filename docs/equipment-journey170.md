# Equipment progression guide

`equipment-journey.html` is a read-only, illustrated progression page. It separates
seven recommended Base-level bands, equipment grades, refinement Tiers and card
slots. All eight professions can be selected, with level jumps and a searchable
item catalog. Selecting an item opens its actual quest rewards, NPC shops, drop
monsters/maps, baseline drop chances and exact recipe/material sources. It does
not load or modify an account, save, inventory or live game session.

`equipment-journey-data170.js` reads the gameplay definitions directly, including
balance overrides, and joins monster spawn indices to `maps/world.json`. Quest
starter rewards distinguish the initial Novice weapon from class-change rewards.
Featured chapters are curated explanations, while item details, prices, crafting
quantities and card-slot counts come from the corresponding source definitions.
The page labels recommended levels separately from actual equip requirements;
boss levels can exceed the level of their dropped gear.

Important progression distinctions are explicit: common/fine bracket weapons have
no card slot; elite weapons do. Fine bracket gear is craftable, elite gear is not.
Craft recipes consume plain base IDs, not refined/carded/affixed variants. The
highest main weapon/armor bracket is Himmapan Lv.80; the Lv.85/Lv.99 relics are
accessory alternatives. No set bonus or additional Lv.99 weapon set is invented.
The first four relic materials currently only drop from their map bosses; later
relic materials also drop from normal monsters. Boss timers remain in game.

The homepage, world atlas and general handbook link to this guide. The old world
atlas message claiming that later maps lack monsters is corrected to match the
current content. The public URL is `/equipment-journey.html`; `class`, `level` and
chapter/endgame anchors can be shared.

Validation covers all 284 gear items, 49 cards, 84 equipment recipes, source and
class coverage, real map locations, starter reward resolution and image paths.
Native Edge checks cover nine desktop/mobile sizes, all profession selections,
level jumps, crafting/material drill-down, card quest rewards, search/pagination,
modal overflow, deep links, missing assets and navigation.
