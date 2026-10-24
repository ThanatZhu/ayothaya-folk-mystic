# Announcements and character names

Live server announcements now appear one at a time in an upper-centre, translucent black ribbon. Text travels right to left toward a small messenger owl. Refine world announcements and system announcements (including boss spawns) use the existing authoritative messages; player chat and local EXP/loot notices are excluded. Existing refine thresholds are preserved: success +7 or above, and breakage on an attempt at +7 or above.

Weather transitions use the same ribbon and remain in local chat, without a second centre-screen toast. Queues are bounded to 24 pending messages, deduplicate deliveries for 60 seconds, and replace stale queued weather. Full chat history remains independent. Motion pauses in hidden tabs; reduced-motion preference displays static wrapped text. The ribbon fits desktop and phone widths and clears the visible quest/party panel and minimap.

Local and remote player labels now centre each title/name/guild line on one axis. Both project a camera-facing head anchor based on body scale and actual sprite position, including raised ground and root motion.

Generated asset: `assets/ui-announce149/owl.webp`, 160 × 160 with alpha, about 15 KB. Generated using **builtin imagegen**; prompt and provenance are in `assets/ui-announce149/prompts.json`. Original generated PNG is preserved in the Codex image library.

Validation: 13 focused tests passed across announcements/head projection, translations, movement, and summon-state regressions. `scripts/check-announcement149.mjs` passed against an isolated live realm using Edge: actual server refinement/boss chat, queued completion and hiding, actual weather override, local/remote name alignment, desktop 1920/1440/1024, phone 844/932/568/390, reduced motion, and no page errors. Screenshots and results: `outputs/announcement149/`. Static build passed.
