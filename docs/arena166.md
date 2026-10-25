# Arena rooms and rename vouchers — 166

## Playing

- Open **ประลอง** in the top menu (inside Menu on touch screens), create a room or join an open one. A room has two seats and belongs to one realm.
- Both players enter the small circular **ลานประลองอโยธยา** and press **พร้อมประลอง**. The existing 90-second duel rules apply, including scaled PvP damage, weekly scoring limits, and no death/EXP penalty. A knockout leaves the loser at 1 HP.
- Press **กลับอยุธยา** to leave; leaving an active bout forfeits it. Both players can ready again for a rematch.
- Press the generated pen beside the HUD name. Buy a **บัตรเปลี่ยนชื่อ** for **1,000 gold bars**, then enter a name and use one voucher. The card also opens this dialog from the bag.
- Names use the existing 2–16-character validation. Successful renames preserve UID, character slot, profession, progression and equipment.

## Authority and persistence

- Arena reservations are transient and last two minutes before entry. Actual occupants retain seats while connected; existing reconnect grace applies. Rooms are private simulation instances, cannot be entered through arbitrary travel/warp commands, and are removed when empty. The circle boundary is enforced on the server and client with body clearance.
- The normal ready/start handshake is required inside the arena. Status, pending damage and spawned role effects reset between bouts. Decorative wandering NPCs are excluded.
- After a server restart or an expired reservation, a saved arena occupant returns to the capital. The authoritative map ID is sent explicitly; room IDs are not used as map identifiers when that field is available.
- Voucher purchase and use share the existing serialized, leased server checkpoint flow. Gold, bag, character and private receipt are committed together before acknowledgment. Loot is queued while the bag transaction is in progress. Retries of the same request cannot debit twice; a save failure disconnects the stale runtime copy rather than overwriting durable state.
- Private identity receipts are never imported from or exposed in the client-writable mirror. Existing name validation applies; this does not introduce a global unique-name registry.
- Guild membership, current shop owner labels, leaderboards, live friends and player labels refresh by stable character key after rename. No real money payment flow was added.

## Generated art

All three icons were created with the built-in image generation tool, with real transparent alpha, then resized and exported to WebP. Originals remain in the generation output directory. Full prompts and source file names: [prompts.json](../assets/arena166/prompts.json).

- [Arena menu](../assets/arena166/arena.webp)
- [Rename pen](../assets/arena166/pen.webp)
- [Rename voucher](../assets/arena166/rename-card.webp)

## Validation

- Rules and real WebSocket host tests cover separate realms/rooms, two-seat limits, readiness, rematch, leaving, reservation expiry, restart fallback, wallet/receipt behavior, full bags, invalid names and failed persistence.
- Real game browser checks exercise purchase/use, two simultaneous players entering the same private arena, readiness, exit, six screen sizes from 390×844 to 1920×1080, plus touch emulation and expired-room return. These are browser emulation checks, not physical iPhone testing.
- Existing market, pet wallet, guild directory, save and multiplayer suites remain green. QA artifacts are under ignored/untracked `outputs/arena166/` and are not shipped.
