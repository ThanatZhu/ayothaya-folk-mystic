# Rainbow crafting and conquest fragments

All existing rainbow crafting ingredients remain at their original quantities. Each rainbow item additionally requires **100 Ayothaya Conquest Seal Shards (`conquest-shard`)** and **1,000,000 cowries** per output. For example:

- Boss-set weapon: 40 soul shards, 25 gem shards, 10 divine shards, 100 conquest shards, 1,000,000 cowries.
- Boss-set head/armor/garment/shoes: 20 soul shards, 12 gem shards, 5 divine shards, 100 conquest shards, 1,000,000 cowries.
- Five rainbow amulets also have a crafting alternative (100 conquest shards + 1,000,000 cowries); their existing gacha source remains.

The server enforces the same recipes shown in the UI. Failed crafting consumes nothing. Orange/red equipment and normal recipes are unchanged.

## Fragment sources

- Every eligible MVP/world-boss loot award grants a uniformly random 1–3 fragments. Existing kill/party eligibility still applies. Extra loot rolls never multiply this award. Ordinary monsters and bosses without an MVP/world-boss flag do not drop the fragment.
- Guild War: rank 1 is the final fortress holder. Other podium places use guardian-stone damage, then captures, then player knockouts, then guild ID as a stable final tie-breaker.
- Every actual participant from the top three guilds receives a separate random 1–3-fragment mail. Attacking the stone, dealing/receiving rival damage, or casting a valid skill in the active war map records participation. Observers, suspended players and idle guild members are excluded. A character's first participating guild is locked for that round.

## Durable rewards

Active participation, completed round IDs and pending mail live in the server-specific `guild-war:<realm>` leaderboard document. The random quantity and immutable mail ID are persisted before profile delivery. Online delivery uses the serialized, durable inventory/mail path; offline delivery checks the account lease in a transaction. Full mailboxes, active leases and transient errors retry. Existing mailbox receipts prevent replay duplication. A server resuming after war closing time settles the saved round.

A completed round's public standings contain guild-level figures only; player identities remain private. The pre-existing fortress-holder chest remains separate from the new mailed fragment reward.

## Artwork and frame

`assets/rainbow-crafting/conquest-shard.webp` is the generated transparent inventory icon (256×256, 23,512 bytes). The PNG master, exact image-generation prompt and runtime metadata are alongside it. The top crafting ornament now retains its aspect ratio while only straight gold rails expand.

## Validation

`tests/rainbow-crafting.test.mjs` covers all 44 rainbow recipes, preservation of previous ingredients, atomic costs, real source restrictions, quantity bounds, loot multipliers, podium and participation rules, restart recovery, mail persistence/replay and a new round starting during payout. `tests/guild-war-mail-host.test.mjs` checks actual online/offline profile saves and a failed journal write. Browser QA covers 1440×900, 1330×795, 844×390 and 390×844, including crafting, source help and close controls.
