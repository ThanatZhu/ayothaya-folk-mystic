# Quest journal: desktop layout

The quest menu previously retained a 400 px phone-style column on large desktop
screens. The desktop journal now uses a centred window up to 1080 × 740 px, capped
to the usable viewport. Its header and category tabs remain visible. Completed
quests and the current quest occupy a scrollable left column; the selected quest's
objective, artwork and recap occupy an independently scrollable right column.
The current objective appears before the illustration so it is visible immediately.

The wide layout requires a fine pointer and a viewport wider than 900 px. Touch
screens retain the compact window with a collapsible quest list. Resizing across
the breakpoint updates that list without reopening the window. Bounties, weekly
quests and the card album share the wider desktop window. Existing claim handlers,
quest progression, rewards, the HUD quest/party dock and MVP bestiary are unchanged.

`scripts/check-journal139.mjs` uses isolated local-realm characters. It checks Thai
and English at 1920×945, 1440×900, 1280×720, 1024×768 and 1280×600 with a mouse, and
932×430, 844×390, 667×375, 568×320 and 390×844 with touch. It verifies viewport fit,
desktop columns and objective visibility, tab navigation, completed recaps,
first/final quest states, opening from the quest dock, breakpoint transitions and
unchanged server progress, XP and inventory while reading the journal.

Validation: production build; story quest, dialogue and server tests; complete
root-module syntax checks; English translation coverage; the above browser matrix.
