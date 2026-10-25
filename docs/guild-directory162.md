# Guild directory and desktop social window 162

The Guild tab now opens a searchable directory for unaffiliated players, with
a separate Create Guild button. Search accepts a whole name or substring,
normalizes NFC and case, and returns at most 24 public summaries from the same
realm across all maps/channels. A summary contains the emblem, name, level,
leader, member/seat counts, online count and notice. It never contains account
keys, member records, treasury balances or other players' applications.

Creating a guild opens its own name/emblem form with a selected-emblem preview
and the existing 3,000-cowrie fee. The existing server validation, names,
currency deduction, invitations, ranks, progression and guild hall remain in
use. Members can return to the directory through a fourth guild sub-tab.

Applicants can apply/cancel directly from search. Applications are saved on
the guild document, deduplicated by character key, capped at 50 per guild and
five per applicant, and expire after seven days. Duplicate submissions do not
cause another guild write. Only leaders/deputies receive application details
and may accept/reject; they see opaque request IDs rather than account keys.
Approval works while the applicant is offline and rechecks membership/capacity
to prevent joining two guilds. Creating/joining a guild clears other pending
requests. Directory and application acknowledgements are private realm events.

On desktop (900px+ without mobile-play), the window is centred, up to
1000x740px with 32px clearance per edge. Its title, close button and main tabs
stay outside the scrolling body. Directory cards, overview and treasury use
two columns; creation pairs the preview/fee with the form and 24 emblem
choices. Mobile retains a single column inside the visible viewport. Search
and creation drafts, focus and selection survive incoming guild events.

Validation on 2026-10-25:

- `node --test tests/guild-directory162.test.mjs tests/social.test.mjs
  tests/guild101.test.mjs tests/guild-network101.test.mjs`: 17 passed, including
  real WebSockets, file persistence, private delivery, permissions, expiry,
  capacity, cancellation and offline membership.
- `node scripts/check-guild162.mjs`: search, draft/caret preservation, applying,
  creating with the selected emblem and correct fee, approving, member tabs
  and closing at 1920x1080, 1440x900, 1280x720, 1024x600, 844x390 touch and
  390x844 touch. No horizontal/page overflow or JavaScript errors.
- Two actual game/realm smoke cases (capital desktop-high and touch-mid)
  search, apply and create through the real multiplayer client, then check
  original actor picking, bag opening and movement. No page/GLSL errors.
- `node build-vercel.mjs` passes. Frontend cache chain advances to guild162;
  backend `/health` reports `guildDirectory: 1`.

Browser screenshots and measurements are under untracked `outputs/guild162/`.
