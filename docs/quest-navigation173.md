# Quest navigation readiness and map landing

The reported recording repeatedly loads Ayutthaya and Rice Fields. Between loads, a level-four character briefly sees t1 before the real straw-hunt progress appears.

Reproduced with the real `createStoryUI` and a missing first server snapshot: after the old 1,600 ms timeout, a pending hunt in Rice Fields starts a portal walk to Ayutthaya because `normalizeStory(undefined)` becomes t1. This can affect any quest using the shared cross-map resume path.

## Fix

- Declare expected networking synchronously, before asynchronous save/join work. An expected network session is never treated as an offline story.
- Wait for an online connection and an applied story snapshot matching the rendered map. The tracker, guide, journal and NPC story confirmation show no invented t1 progress while waiting.
- Consume cross-map resume once from the update loop after readiness; remove the timer. Keep the intent across slow joins, redirects and hidden rendering. Scope new intent keys by server/character slot and migrate the old single key once.
- Manual steering, joystick use or a new map/ground destination cancels a waiting resume. Failed travel clears the stored intent. Menus do not cancel the existing destination route.
- Render the valid URL destination first, with the saved map as fallback. The server still chooses the actual map on join and authorizes all travel. A stale browser/public save can no longer reopen the old scene ahead of every welcome redirect. Invalid/absent map IDs fall back to saved map, then capital.
- Copy the objective step before assigning temporary farming/training map targets, avoiding mutation of shared quest definitions.

No server progress, reward, kill count, inventory, travel permissions or save migration rules are changed.

## Validation

- Unit coverage for pending joins, reconnection, matching maps, offline guests and requested/saved destination precedence.
- Browser regression through the real story UI: a two-second missing snapshot emits zero routes/travel; correct hunt/NPC/travel resumes exactly once after readiness; manual override wins; failed travel leaves no marker.
- Actual game with an isolated realm/store and genuine WebSocket transport: delayed first welcome during a 4/5 straw hunt causes zero map changes; returning to town with a deliberately stale browser map loads exactly one destination document; mobile travel into Rice Fields advances the enter step and resumes toward the correct NPC without bouncing back.
- Existing story progression/reward-once, dialogue, world paths and server-owned background walking checks pass.

Local QA artifacts: `outputs/quest173/`; no production saves are accessed by these tests.
