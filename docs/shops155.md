# 24-hour player shops

Consignment and buying shops close when their listing is empty or 24 hours have
elapsed since `createdAt`. The server supplies the fixed `expiresAt`; request
fields cannot extend it, and collecting proceeds does not renew it. Continuing
requires explicitly opening a new shop with a fresh ID/deadline. Online vending
stalls also close on sell-out or the same 24-hour limit.

Closed shops disappear from public map signs, counters and new searches. They
do not reserve positions or count toward the merchant's active shop limit.
Private claims remain in the shop record until the owner collects: sale proceeds,
unsold goods, goods received by buying stores, unused buying escrow and trade XP.
Collecting a closed shop returns everything atomically and removes the record;
bag/stack/coin capacity failures leave the complete claim unchanged. An already
empty record with no claims is deleted by cleanup. Private claims never enter
public shop payloads.

Cleanup runs once a second and before market actions, so purchases at the exact
deadline fail. Many closures in a server produce one batched shop-list update in
the capital and an IDs-only `shopsClosed` event to invalidate existing search
results elsewhere. No repeated events or writes occur for already-closed claims.
The browser removes sign sprites, posts, labels, materials, textures and geometry.
No client polling or per-second expiry packets are added.

Legacy saved shops use their original `createdAt`; expiry is not reset by restart.
Cloud hosts load the latest shop state only after acquiring world authority, so
a new deployment cannot close stale data from before the previous host's last
sales. Shop writes are ordered per shop; the local JSON snapshot is serialized
and atomically renamed. Shutdown flushes pending writes before releasing authority.

Validation:

```powershell
node --test tests/shop-lifecycle155.test.mjs tests/market.test.mjs tests/market70.test.mjs tests/multiplayer24.test.mjs tests/syntax.test.mjs
node build-vercel.mjs
node scripts/check-shops155.mjs <absolute-playwright-module-path>
```

The isolated real-game browser check opens shops, sells the last item, verifies
the sign/search row disappears, opens another shop while the old claim remains,
collects sale proceeds, advances the server clock to expiry, and returns unsold
items. It covers desktop and mobile. The health marker is `shopLifecycle:1`.
