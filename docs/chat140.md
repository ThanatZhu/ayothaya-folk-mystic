# Desktop chat drawer

Desktop players now begin with an illustrated chat launcher at the bottom left,
with an Enter caption and an unread badge. Clicking it or pressing Enter opens a
left-side conversation drawer and focuses the existing chat input. Enter sends;
the input stays focused for the next message. Escape or the close button collapses
the drawer without clearing an unsent draft. Opening another HUD utility closes
the desktop drawer. Other text fields, open dialogs, modifier keys and IME
composition do not trigger the global Enter shortcut.

The drawer has a vertical channel rail, independently scrolling messages, sender
initials, message bubbles, times and a fixed input footer. The room/world/party/
guild/system filters, whisper command, transport, server validation and rate limits
are unchanged. User messages remain text nodes. No chat messages are sent by
opening, closing or switching layouts. Touch and small screens retain the mobile
chat presentation. The breakpoint matches the desktop quest journal (>900 px,
fine pointer); crossing it collapses chat and preserves the draft.

`assets/ui-chat140/chat.webp` is a 256 px transparent export of newly generated
built-in image_gen artwork. Its original prompt and provenance are in
`assets/ui-chat140/prompt.json`. The original PNG is kept in the local outputs
folder and the image generator's original save location. It is not a drawn SVG
substitute or a screenshot of the reference game.

Browser verification: `scripts/check-chat140.mjs` runs two isolated real WebSocket
players at 1920×945, 1440×900, 1280×720, 1024×768, 1280×600 desktop and 932×430,
667×375, 390×844 touch, in Thai and English. It exercises Enter/click, Escape/close,
send/receive, whisper prefix retention, unread badges, draft persistence, world/
system filters, literal user markup, other dialogs, modifier/composition guards,
breakpoint transitions, viewport fit and unchanged inventory/quest state.

Additional checks: static build, root module parsing, full translation coverage,
world chat, social permissions and multiplayer WebSocket tests.
