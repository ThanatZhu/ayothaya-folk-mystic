# Movement stop reconciliation

Stopping previously eased the local character toward a buffered snapshot that
still described walking. A newer stopped position could then reverse that
correction; the correction itself also set `player.moving`, restarting walk art.
The minimal reproduction moved x=1 to 0.953944 and then forward to 0.961015.

The transport now sends both starts and stops immediately. The server echoes
`self.inputAck` only after a tick has applied validated movement input. Until a
stop is acknowledged, stale walking snapshots do not pull the released player
backwards. Idle settling does not set the locomotion flag. Input timestamps are
bounded to 64 entries and provide a capped age allowance for prediction while
steering, avoiding false teleports caused by ordinary round-trip delay.
Large authoritative corrections and knockback remain supported. Older hosts
without input acknowledgments use a bounded 500 ms stop fallback; old clients
ignore the added self field. Reconnect resets the client and authority counters.

Validation: 50 focused tests covering authority, combat timing, movement,
postures, input throttling, i18n and syntax; 30/60/144 FPS simulations with
30/100/200 ms one-way latency and the actual 120 ms presentation buffer.
`scripts/check-movement146.mjs` runs the real game and local authority through
60/180 ms one-way WebSocket delays. It verifies keyboard releases, rapid taps,
click-walk arrival, idle avatar art and convergence to the server position.
The browser traces include both real walk and idle art frames, not only flags.
