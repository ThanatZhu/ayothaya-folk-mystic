# Hold allocation and Path Renewal Talisman

The Status stat buttons support mouse/touch hold. The first increment is immediate, followed by a 350 ms delay and a 150 ms repeat interval. Online repeats wait for an authoritative stat change before sending another request. The server keeps its own 100 ms stat cooldown, stat cap and increasing point costs; equipment keeps its existing cooldown. Release, moving outside the button, pointer cancellation, closing Status, hiding the page, blur, disconnection, insufficient points and stat cap stop the hold. Keyboard activation still adds one increment. Stat buttons survive render updates so capture and keyboard focus stay valid.

`stat-reset-scroll` (ยันต์คืนวิถี) costs **100 gold bars** in Premium Store → Character. One item resets allocated STR/AGI/VIT/INT/DEX/LUK to 1. Available points are derived from the existing earned-minus-spent formula, including rebirth point budgets. It preserves levels/XP, class, rebirth and its permanent bonuses, gear, cards, refinement, pets and quest progress. The bag opens a confirmation with the refund amount. Empty allocations do not consume an item. It cannot be mistaken for recall incense.

Online use is `statResetUse`, serialized through the existing durable identity transaction. The host consumes one item and stores the reset and private request receipt before changing live stats or returning success. Repeating a request ID after reconnect returns the current state without consuming/resetting again, even after further allocation. Failed saves close the session and reload durable state. Existing duel restrictions apply. The client retains an ambiguous request ID for checking the original result.

Art: built-in ImageGen; transparent source and 256 px WebP in `assets/stat-reset189/`; exact prompt saved alongside it. No filled square or frame in the icon.

Validation: pure reset/purchase tests, durable host tests including reconnect and injected checkpoint failure, and `node scripts/check-stat189.mjs` for real-game mouse/touch hold, stopping, cap, purchase and reset.
