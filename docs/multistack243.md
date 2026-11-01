# Multiple inventory stacks (243)

Owner request: when an ordinary item reaches 999, use another available bag slot.

## Rules

- Keep persisted counts aggregated by canonical item ID. No save migration or duplicate item identities are introduced.
- `bagSlotsUsed` counts `ceil(total / stackLimit(id))`; `bagStacks` expands totals into visible tiles. Bag categories and storage usage report physical stacks.
- `itemRoom` counts partial-stack room plus empty slots. Receiving, trading, storage, crafting, card removal and equipment return use the same capacity rule.
- Ordinary stacks remain 999. The existing conquest-shard exception remains 999,999 per stack to preserve old saves and the 50,000-shard recipe. It can also roll over if slots remain.
- Consume/sell/discard amounts act on the total for that canonical ID. The detail/quantity dialogs show that total; quick slots also show totals.
- Mail remains atomic per letter: all attachments fit or the letter stays unclaimed. A successful retry cannot duplicate attachments. Bulk mail retains its existing per-letter behavior.
- Pet pickup policy, drop rates, crafting ingredients, prices and storage size are unchanged.
- The short-screen bag slot minimum must follow its square artwork, not a generic 44px button minimum, so rows and stack quantities do not overlap.

## Verification

- 91 focused tests passed, including `tests/multistack243.test.mjs`.
- Full suite: 992 tests, 976 passed, 14 skipped, 2 failed outside this change (authored novice attack artwork assertion and missing English translations). Do not represent the full suite as green.
- Isolated real local server and headless Edge: a 40/70 bag with 100 of each item receives Lek Lai x999 and Anti-Break Talisman x999. It becomes 42/70 with tiles 999 + 100 for each item; the server save and reconnect retain 1099 each.
- Desktop 1440x900 and landscape 844x390 screenshots inspected; no page errors. Evidence: `outputs/multistack243/`.

## Publication

This is a shared-rule/backend change, not frontend-only. Coordinate authority and frozen frontend publication under AGENTS.md and docs/releases223.md. Old clients still clamp their displayed counts to 999; only the updated client displays all stacks. The authority remains the source of truth. Do not force-reload players or claim a backend replacement is zero-disconnect. Do not roll back to the old normalizer after players have accumulated multiple stacks without a lossless data plan.

No production deployment is included in this local validation.
