# Bridge movement 164

Walking reused `lineClear`, which checks a 0.05 m sight/projectile radius. Player movement checks a 0.28 m body radius. A clear sight line grazing the marsh boardwalk therefore produced a straight route that movement could not complete; the stuck retry selected the same shortcut again. AUTO pursuit used the same sight shortcut. Among 191 valid lane pairs spanning all eight authored lotus-marsh bridges, 55 old routes crossed blocked body space.

`walkLineClear` checks the full movement body, including route endpoints, at half a movement substep. Click movement and AUTO use it for direct shortcuts; A* checks every connecting edge, the real starting position before grid rounding, and the final approach. Projectile/sight clearance is unchanged. Existing bridge meshes, terrain and water collision data are unchanged.

The shared core and route walker serve offline movement, client prediction and authoritative server destinations. Browser import versions are bumped through game.html → game-boot → viewer-world → game-controls → core/route-walk. The multiplayer host must run the updated shared files for online play; a frontend-only deployment cannot update server movement.

Validation:

- Four new regressions cover the former clipping shortcut, all 191 valid lane pairs in both directions at speeds 3.4, 7 and 12 (1,146 simulated crossings), authoritative destination movement and melee AUTO pursuit. All pass.
- 33 movement/map/combat regressions pass; another 15 authoritative movement/boss tests pass with localhost/temp-file access. Static build and content validation pass.
- `scripts/check-bridge164.mjs` boots the real lotus-marsh scene against a disposable local WebSocket realm and calls the game's actual destination action. Outbound and return routes arrive; client positions stay within 0.7 m of the targets, with no browser errors. Combat is disabled in that test realm to isolate walking. Screenshots and browser-report.json live under outputs/bridge164.

This change is local and has not been pushed or deployed. Existing unrelated CBT preview and daily-quest illustration work remains in the workspace.
