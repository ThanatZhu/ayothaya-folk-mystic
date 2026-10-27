# Map chat and system history

`chat-channels191.js` defines message streams independently of their visual style. Only an authenticated server announcement (`actor: null`, name ประกาศ, system/world channel) can enter the announcement stream. A player using that name cannot bypass the channel filter.

- Room: conversation delivered by the current map/channel and server announcements.
- World: world conversation and server announcements.
- System: local system notices and server announcements.
- Party, guild and whisper: their own messages only.

The same visibility policy drives message rows and the collapsed preview. System notices cannot replace the preview of another channel. Existing global notifications for incoming player chat remain available. Each stream retains up to 80 rows, so a stream of walking/loot notices cannot evict map chat. Message IDs are deduplicated with a bounded cache large enough for retained rows.

On a server channel switch, the UI clears the previous room conversation and loads the authoritative new room history. Other streams stay available. Map changes normally reload the game page; the existing server transport isolates room chat by map, channel and server.

Validation: `tests/chat-channels191.test.mjs`, world-chat and announcement tests, and `scripts/check-chat191.mjs` with an isolated local realm on desktop and touch viewports. The browser check covers visible room/system/world/whisper rows, announcement spoofing, preview, system-message floods, deduplication and a real channel-switch reply. No production players receive test messages.

The browser fixture imports the production chat module and styles with a real local WebSocket host, without rendering the 3D map. It grants local-network-access only to its temporary browser context for the loopback test origin. Desktop and touch use separate local accounts.
