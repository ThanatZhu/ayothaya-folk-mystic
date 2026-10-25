# Destination sprint reconciliation

The reproduced problem was a pace mismatch: game-controls predicted running while
the authority's destination walker unconditionally supplied `run:false`. In a
10-second Shaman town simulation, walk/walk had zero backward corrections while
run/walk snapped backward eight times. Both sides now use the same shared
`walkSpeed(run)` calculation, including class, town and ailments.

The authority advertises `walkRunSchema:1` only when running is enabled by server
policy. `walkTo` accepts a validated boolean pace; `walkPace` updates that pace for
the exact active route ID without cancelling/replanning the destination. Manual
steering still cancels. Idle keepalives, menus and background suspension do not
reset the pace. The saved private route retains it across reconnect/checkpoint.
`clearInput` now releases keys/touches without cancelling the local route walker;
otherwise opening a menu left the server moving while the local predictor stopped.
WASD/joystick input explicitly cancels the destination instead.
Older clients omit the field and continue walking; new clients predicting an
older host's route use walking pace until support is advertised.

Sprint endpoints are handled as part of the same path:

- Route steering limits a step to its next waypoint. Fast characters cannot
  bounce across a small stop radius forever.
- A locally completed destination waits for the server arrival rather than
  easing backward onto an old moving snapshot. Arrival callbacks still wait
  for the authoritative arrival and an available visible UI.

The transport remembers the route request time as well as input times, so high
latency before the first route snapshot is accounted for. During run-to-walk
changes, correction tolerance includes the faster pace in the in-flight
snapshot; genuine large corrections, knockback and respawns still work.
Online prediction uses up to 250 ms of elapsed frame time instead of discarding
everything beyond 50 ms. Collision movement already subdivides into 0.12 m steps.
Prediction advances in at most 50 ms slices and re-steers at waypoints between
slices. Collinear interior grid cells are removed from the path without changing
its geometry, preventing tick-dependent fractional stride losses every metre.
Offline simulation keeps its existing 50 ms cap and hidden pages predict no motion.

Validation:

```powershell
node --test tests/running153.test.mjs tests/movement146.test.mjs tests/character-life-state.test.mjs tests/route-walk.test.mjs
node build-vercel.mjs
node scripts/check-running153.mjs <absolute-playwright-module-path>
```

Unit simulations cover all eight professions, town/field speed, validated and
gated pace changes, saved routes, small-radius fast Rogue arrival, and
10/15/20/30/60/144 fps with 30/100/200 ms latency each way plus the 120 ms presentation
buffer. Browser checks use the actual quest and city-map buttons, keyboard Shift,
the run toggle, bag/skill menus and page freeze, with 60/180 ms latency each way
and an older-host compatibility case. Accounts and saves are isolated locally.
The health endpoint exposes `routeRunSchema:1` for deployment verification.
