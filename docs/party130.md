# Party controls and collision-free HUD — 130

The party frame now has Add player and Leave party buttons. Only an online leader with fewer than five members can invite. Every connected member can leave. Clicking the heading opens the party roster; leaders can transfer leadership and remove members. Invite mode searches available players in the same channel, including other maps, using the existing authoritative party protocol.

`party-layout.js` owns placement using measured rectangles of the profile, buffs, online chip, chat, quick slots, desktop actionbar, movement/skill controls, map and quest column. It finds a free rectangle, limits the member list to scroll when needed, and falls back to a compact heading or the Party menu when no frame fits. Font loading, buff wrapping, root HUD offsets and visual viewport changes trigger measurement. Root offset changes are resolved in the same mutation checkpoint so the online chip and party frame do not paint at different positions.

The management window is centered on desktop and layered above the desktop actionbar. Phone layouts retain the existing mobile panel behavior. The original font, member HP bars and ally selection remain. All invitations, departures, removals and leadership changes use existing server commands and permissions.

Verification:

- `tests/party130.test.mjs`: placement, viewport offsets, compact/hidden fallback, leader/full/offline permissions and roster search.
- `scripts/check-party130.mjs <absolute Playwright module>`: a temporary local store, a real WebSocket host, one rendered player and five synthetic peers. Exercises invitations, search, leadership transfer, a full party, removal and departure. Checks 36 combinations of nine desktop/phone viewports and 0/2/12/24 buffs, plus mobile management. Uses no production accounts.
- Full regression suite: 498 passed. Static build and translation checks passed.

Party state and capacity still belong to the server. This release adds no new backend protocol or database migration.
