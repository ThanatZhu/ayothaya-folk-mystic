# Hire field adventurers

All three wandering adventurers on each of the nine outdoor hunting maps can be spoken to through the normal NPC interaction (body/name click, touch or nearby Space). The conversation shows the same painted class/gender as the actor, the fixed fee and the contract conditions. One helper per player, 20 minutes, this map session only; leaving the map or ending the game session ends the contract. Disconnect resume keeps the existing short realm grace period. Towns, party instances, guild halls and the arena do not spawn hireable adventurers.

| Map | Bia / 20 min |
| --- | ---: |
| Rice Fields | 200 |
| Old Orchard | 400 |
| Moonlit Mill | 400 |
| Lotus Marsh | 800 |
| Bamboo Grove | 1,500 |
| Ruined Temple | 2,500 |
| Himmapan Edge | 2,500 |
| Naga Cave | 4,000 |
| Kailash Peak | 4,000 |

`field-adventurers177.js` derives difficulty from the highest regular monster level, excluding bosses/elites. That level chooses the fee band and helper damage (`10 + 2 × level`, 1.4 seconds between attacks). Names, class, gender and body-safe patrols are seeded by map. Online clients display realm-supplied patrol positions rather than independent random walks.

The realm validates map, identity, proximity, line of sight, living employer, existing helper and sufficient Bia; client-supplied price/power/duration are ignored. `hired` is a private receipt. Only the authoritative bag changes online. The normal player damage/reward path credits monster damage to the employer; helpers cannot attack duel opponents or guild-war targets. New helper hits land after a 250 ms wind-up instead of at swing start. Legacy mercenary commands remain compatible with old clients.

The selected adventurer becomes the owner's local following actor, preserving class/gender/name and showing remaining time. Its template is hidden for that owner until expiry. Helpers are currently private visual companions; the authoritative monster damage is visible to nearby players. No new account/save fields or payments are introduced. The health endpoint reports `adventurerHire: 1`; a client disables hiring until it receives `adventurerSchema: 1` from the realm.

Checks: `tests/adventurer177.test.mjs`, existing mercenary and full game tests; isolated actual-game browser/realm fixture under untracked `outputs/hire177/`. Fixtures and tokens are not shipped.
