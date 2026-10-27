# Class weapon crafting lesson and colour progression

The new `t17-craft` lesson follows class advancement (`t17`). Master Saen Daab introduces crafting, the player must actually craft a blue weapon for their current class, then return to hear how colour advancement works. Owning a gift weapon, crafting a potion, or opening/skipping the cinematic cannot satisfy this action. The preceding quest supplies 15 Ricefield Weapon Fragments and 2 iron ore alongside its existing rewards.

Story schema 4 maps schema 2/3 saves by their previous quest identity. Characters already past the insertion retain their current objective; completed stories stay complete. No old quest rewards are replayed.

All seven classes and six weapon tiers now have explicit recipes: blue → purple → orange → red. Colour is guaranteed. Each advancement consumes one clean previous-colour weapon from the bag and the level-band's Weapon Fragments, ore, and existing additional materials. Ingredient quantities are 1×/2×/3×/4× the blue recipe's materials; cowrie fees are 1×/2×/4×/8×. Refined, carded, affixed, equipped or different-tier weapons cannot be silently substituted. Existing green drops remain usable.

Six fragment materials use the matching existing map-material icon cells. Monster level bands are 1–24, 25–35, 36–56, 57–71, 72–86 and 87+. Normal monsters drop one at 45%, elites two at 75%, bosses three at 90%. Existing boss relic materials and rainbow recipes retain their ingredients and quantities.

Rainbow recipe visibility and the authoritative craft action require a valid non-Novice class. Boss-set weapons/armour must match that class; acolyte armour follows the saved gender's monk/nun look. Universal rainbow amulets remain available after choosing a class. The server rejects forged foreign/Novice requests before spending anything. Recipe selection is revalidated after class changes.

## Story art

`assets/story160/t17-craft.webp` was generated with built-in image_gen using the existing `t8.webp` as style, layout and NPC-identity reference. It uses the same portrait atlas with three vertically stacked landscape shots, separate live narrative text, NPC-only automatic entry, tap-to-accelerate and a single Skip button. No new playback interface is introduced.

The original generated panel boundaries are unequal. Explicit 2:1 `frames` in the storyboard crop the correct top/middle/bottom scene without stretching or panel bleed. `assets/story124/craft-workshop.webp` is the workshop crop for NPC dialogue. The exact final prompt is in `assets/story160/t17-craft.prompt.txt`; the original generation remains under Codex generated_images.

## Validation

`tests/weapon-crafting188.test.mjs` covers all 168 class/tier/colour recipes, atomic progression, source level bands, protected modified items, class restrictions, save migration and authoritative quest completion. Existing recipe/cinematic/story tests cover the updated definitions. `scripts/check-weapon188.mjs` plays the NPC cinematic and accepts the lesson, opens the correct blue recipe from the tracker, crafts through all four colours via a real local realm, and reports back. Desktop/mobile screenshots and isolated local profiles remain in untracked `outputs/weapon188/`.
