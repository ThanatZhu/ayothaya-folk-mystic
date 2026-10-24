# Painted boss browser and bulk mail actions

The boss encyclopedia and mailbox use newly generated gold-lotus/jade window borders and a shared painted button surface. Frames are sliced for responsive scaling; labels retain the existing Mali font and translation. The inner surface stays inside the frame. Mail controls remain visible below the independently scrolling list/detail area, with a two-column layout in small landscapes and stacked content in narrow portraits.

`mailClaimAll` computes the player's pending gifts on the server. Each letter is claimed completely or left untouched. Letters blocked by bag space, coin cap or wallet cap stay available; other letters can still succeed. One durable checkpoint commits the batch before acknowledgement. Repeated claims cannot credit attachments twice. Results report claimed and remaining letter counts.

`mailDeleteAll` deletes only read letters with no gifts or with all gifts already claimed. Unread announcements and unclaimed gifts are preserved. Broadcast deletion is private to that character. Personal deleted-delivery IDs remain as compact tombstones so retries of an admin delivery cannot resurrect gifts; those IDs must not be reused for new deliveries. Deleting the selected letter returns the detail area to a selection prompt rather than silently reading the next letter.

Generated with **builtin imagegen**, preserving library originals. Runtime assets are `assets/ui-panels150/boss-frame.webp`, `mail-frame.webp`, and `button.webp` (about 120 KB combined). Full generation/edit prompts and source provenance: `assets/ui-panels150/prompts.json`. Existing painted close-ring artwork is reused. No payment functionality changed.

Validation: 23 focused tests passed across mailbox state and real host persistence, translations, boss behaviour, announcement regressions, and persistent destination walking after integration. Native Edge QA (`scripts/check-mail150.mjs`) verified desktop mouse and phone touch claims/deletions, partial claims with a full stack followed by retry, protected unread/pending letters, boss tabs, close controls, and window/footer bounds. Desktop sizes: 1440×900, 1920×1080, 1024×768. Phone sizes: 844×390, 932×430, 568×320, 390×844. No page errors; static build passed. QA screenshots and reports: `outputs/mail150/`.

Backend capability: `/health` now includes `mailboxBulk: 1`; existing `mailboxSchema: 1` remains compatible with additive deletion fields.
