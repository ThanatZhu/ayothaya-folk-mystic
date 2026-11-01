# Event hub design preview 242

Direction selected by the owner: Genshin-inspired event navigation and large illustrated feature area, adapted to Ayothaya. On 2 November the owner approved publishing this together with multiple inventory stacks. The same component now serves the review page and in-game event entry points; this is not a new window theme.

Open `event-hub-lab242.html`. Reuses the unified-menu236 renderer and matte-jade/gold frame, existing event artwork and generated button assets. No third-party game artwork is included.

- Desktop: event list on the left, large artwork on the right, schedule and benefits beneath, expandable rules.
- Portrait: horizontally scrolling event tabs and vertically scrolling content. Landscape retains a compact side rail.
- Keyboard: arrow keys/Home/End switch tabs; Escape closes; focus returns to the reopen button.
- Festival and weekend bonus values come from events.js. CBT reward example comes from cbt-event.js and remains explicitly a proposal; there are no writes or reward claims.
- The festival image is existing Ayothaya river artwork. A dedicated festival illustration can replace this asset once the layout is approved.
- The in-game seasonal/events/frenzy chips open this hub. CBT chip and its existing one-time login prompt open the CBT tab; the detailed reward dialog remains accessible. Other events retain the existing live schedule/rules renderer, refreshed while visible. No invented progress, new claim endpoint or travel action is introduced.
- Festival dates/status and weekend status use events.js and Thailand time. Existing server-owned bonuses/rewards are unchanged. CBT remains a proposal with no reward claims enabled.
- CSS is scoped to #event-hub so the new screen cannot restyle other game menus. Thai and English copy are included.

Validation: isolated real local server with headless Edge at 1440×900, 390×844 and 844×390. Visual screenshots inspected. Seasonal/CBT entry, tabs, rules expansion, detailed CBT rewards, other live schedules, close/reopen and mailbox -> multistack bag -> reconnect passed with no page errors. Evidence in outputs/event242/live-check.log and live-*.png. Physical phones have not been tested.
