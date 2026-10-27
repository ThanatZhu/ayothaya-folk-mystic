# Quest tracker scrolling

The recorded issue is in the left activity dock, over the expanded completed teacher-trial requirements. The outer `activity-content` has real overflow, but the nested `training-details` was also an auto scroll container with `overscroll-behavior: contain` and no overflow of its own. The training journal also clipped its contents. Wheel and native touch gestures over those rows never reached the outer scroller.

Inside the dock, both training wrappers now have visible overflow. The activity content alone scrolls vertically, with native touch panning and keyboard focus. Standalone teacher journals retain their original internal scroll behavior. No custom gesture handler intercepts quest buttons, summaries, joystick input or camera controls.

Rebuilding trial requirements on a bag/kill snapshot retains the current trial's completed-section expansion and outer scroll position. A different trial starts collapsed at the top.

`node scripts/check-quest-scroll190.mjs` seeds a local realm with all six requirements complete, expands them, and reproduces wheel and CDP touch swipes over actual completed rows. It checks that scrolling advances without moving the player and that a live bag update preserves expansion and position. Mobile viewports 844×390, 1068×480 (the recording), and 720×320 are also checked.
