# Ayothaya project instructions

Read AGENTS.md and docs/ground-loot219.md before changing drops or companion collection.

Owner rule (30 October 2026): equipping/following an owned pet automatically collects ground drops. Combat AUTO and pet skill AUTO are independent and may stay OFF. No extra key or collection toggle. The pet physically travels to the drop and returns. Ownership in the collection alone or class skill summons do not count. Preserve manual pickup, server authority, party priority, exactly-once collection, overflow mail and existing rewards.

Push or deploy only when explicitly requested by the owner.

## S companion build rule (30 October 2026)

Read docs/pet-stat-build220.md before changing S pet bonuses. Keep player-chosen primary/secondary/support stats character-wide, preserve each star rank’s total bonus and pet-specific skills, and keep server-owned durable/idempotent saves. Never replace this with class-locked presets. Ground collection remains independent of combat AUTO.

## Frontend update continuity (223)
Never auto-reload on release discovery. Preserve active WebSockets and retained runtime/asset URLs. Follow docs/releases223.md: choose a new release ID, commit source/assets, freeze, commit archives, then build and push. Never edit archived files or publish modified runtime under an old ID. Backend container replacement is separate and cannot be described as zero-disconnect without hosting evidence. Premium benefits and profanity filtering remain deferred by the owner.
