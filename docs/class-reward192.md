# Full equipment set advancement reward (192)

Each changed-class character receives one private letter (class-red-set-lv55-v1),
containing class-red-set-box. Novices are excluded. Master advancement does not
grant a second box. Claimed/deleted IDs remain protected.

Select pierce, exec, mantra, wall or wind. The server derives current class and
gender and delivers five red Lv55 pieces: weapon, headgear, armor, cloak, shoes.
Female acolytes receive nun armor; male acolytes receive monk armor. Both use
the acolyte weapon. The weapon counts toward the family's existing set bonuses.
All five pieces and consumption of one box are saved atomically. Full bags never
consume the box or receive a partial set. The client sends only family and replay ID.

## Retroactive delivery

Production Firebase hosts enable the campaign automatically. Local fixtures opt
in with createHost({classRewards:true}). The authoritative host pages through all
private profiles (100 per page, without the admin directory's 2000-profile limit).
Offline gifts use fenced transactions; online gifts use the session's durable
mail mutation. multiplayerRuntime/classReward192 stores the cursor and deferred
identities. Busy/full inboxes retry without blocking later profiles. Completed
scans stop reading pages. Joining and later mail mutations also grant missing
rewards, including trusted legacy saves imported on login.

/health exposes aggregate counts only under classRewardBackfill. After deploy,
verify classReward:192, authority:true, scanComplete:true, pending:0. No identities
are public. The generated chest and exact built-in ImageGen prompt are in
assets/class-reward192. Browser verification: scripts/check-class-reward192.mjs.
Pure and host tests cover 5 families, 7 classes, both genders, replays, full bags,
save failures, atomic five-piece delivery and retroactive mail.
