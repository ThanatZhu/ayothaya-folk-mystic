# Existing Google account login — r296

The anonymous login screen previously offered only Link Google. Linking an already registered Google account fails with credential-already-in-use and leaves the player in the anonymous account, whose roster can be empty. This does not establish that the original account's characters were deleted.

The login screen now explicitly offers **เข้าสู่บัญชี Google เดิม** (Sign in to your existing Google account), separately from linking the current account. The recovery hint after a linking conflict directs players to this button. Returning sessions retain Continue, and mobile buttons remain centered and vertical.

Existing-account login uses signInWithPopup with the account picker, without signing out first. Anonymous sessions first read all five character slots and all three legacy saves (main, server-1 and server-2) from Firestore. Any existing record or failed read blocks switching and retains the current session; the player must first link a populated temporary account to an unused Google account. An empty temporary account can proceed through a fresh confirmation click. Cancellation and Escape preserve the original session. Approvals expire after 60 seconds and are bound to the current UID. No character migration, deletion, account merging, database rules or authority code changes are included.

Validation:
- Ten helper tests cover read-only preflight, current and legacy saves, failed reads, cancelled popups, stale/account-mismatched approvals and direct signed-out login.
- Browser checks use the actual UI and roster loader with isolated Firebase fixtures: existing character restored after login and reload, linking conflict recovery, cancellation, blocked temporary saves, read failures, zero save mutations; 18 responsive cases.
- Existing login checks cover 16 layouts, saved sessions, original online consent, offline character reload, translations and reduced motion.
- Desktop and phone screenshots inspected. Browser fixture results do not verify the owner's actual Google account or production character records; the owner selects their original Google account on the live page.

Publish through frontend-live and Vercel only, retaining all previous release bytes. Do not deploy main or restart the game authority for this change.
