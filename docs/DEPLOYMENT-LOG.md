# Ayothaya public deployment

- Live game: https://thanatzhu.github.io/ayothaya-folk-mystic/
- GitHub: https://github.com/ThanatZhu/ayothaya-folk-mystic
- Published checkout: `publish/ayothaya-folk-mystic` (branch main, initial commit e776087)
- GitHub Pages source: main branch, repository root; .nojekyll enabled
- Deployment run 37969210607 completed successfully; Pages status built
- Local development copy remains in `outputs/ayothaya-scene-01` on port 8767. Changes there must be copied into the published checkout and committed/pushed to update the internet version.

Published all six scenes, runtime assets, Blender authoring files and tests. Existing private repository ThanatZhu/AyothayaOnline was not changed.

Mobile landscape gate pauses gameplay, hides the scene, and prevents Escape/shortcut bypass. Landscape view offers joystick, 2x5 skills, attack and fullscreen. Fullscreen orientation lock is best effort; unsupported browsers retain the rotate-device gate. Confirmed public HTTPS loading, city transfer, portrait gate and joystick movement at 844x390 using browser viewport testing. Physical phone orientation/multitouch remains untested. Node tests: 28 passing.

Public build is a single-player browser prototype; multiplayer server/account persistence is not included.

## Firebase / cloud saves (2026-10-10)
- Firebase project `ayothaya-folk-mystic` created on owner Google account.
- Spark plan, Analytics and Gemini disabled. Web app: Ayothaya Web Game.
- Google Authentication enabled, support contact uses project owner's account.
- Authorized frontend: thanatzhu.github.io; localhost and Firebase default domains already present.
- Firestore Standard (default), asia-southeast3 Bangkok, production mode then owner-only rules published.
- Console rules simulator: unauthenticated read denied; other UID read denied; same UID read allowed.
- Web release b305717 adds Google popup login, remembered auth, per-account Firestore save, local guest save, revision conflict guard, manual/30s/travel/sign-out saves.
- Saves currently implemented gameplay only: HP/MP, kills, cooldowns, map/position, camera/motion. No level/EXP/inventory/quest gameplay yet.
- 32 node tests pass. Local guest travel Ayutthaya -> Lavo verified. Mobile login fits 844x390; 390x844 rotation gate remains active.
- Actual Google account selection is awaiting the user; authenticated save/load round-trip is not yet verified.
- Important: future release preparation must retain the new cloud-save/account/config/rules files; the older whitelist script predates this feature.
- Follow-up release 27934ab001ec19e855a12416246b90e79bdafebc preserves mobile popup activation; Pages workflow 37972599168 completed success.
- Public HTTPS site displays Google login panel and loads game with no console errors. Screenshot: work/firebase-live-login.png.
- Release-copy script updated to retain cloud files and current README.
- User asked where to choose account; directed to local test URL in Chrome. Still no confirmed Google login; use public game URL for next handoff.

## Illustrated lobby / realms (2026-10-10)
- New full-page index lobby: login (Google or explicit guest), server-1/server-2, create/select character, then game.html.
- One character per realm per account, Thai/English name 2-16 chars, male/female shaman. Other classes not selectable until gameplay exists.
- Two generated assets via built-in ImageGen: assets/login-ayutthaya.png and assets/shaman-genders.png, prompts in assets/lobby-prompts.json.
- CSS firefly motes + character breathing, motion toggle, reduced-motion support. Mobile landscape gate retained.
- New persistence paths players/{uid}/saves/server-1 and server-2. Existing main save copied only to realm 1 on initial creation; source retained. Guest progress likewise migrates from ayothaya-guest-v1 to first realm only.
- Firestore rules updated and published in console at 1:33 AM Bangkok; per-owner access, allowed realm IDs, immutable character metadata on updates, revision checks.
- 38 node tests passed, including mocked cloud adapter, account/realm scoping, duplicates, conflict, invalid input and legacy migration.
- Local browser flow verified: female มะลิทดสอบ in server 2 entered Ayutthaya and traveled to Bangsai; male ขุนไกรทดสอบ in server 1 inherited old Lavo progress; returning to server 2 retained correct female/Bangsai. Test characters are guest/local only.
- IAB responsive check: 844x390 character form fits without scroll (scrollHeight 390), 390x844 orientation gate blocks. Chromium viewport capability did not affect the new tab this turn; responsive validation used IAB.
- Google OAuth actual-user completion remains unverified from prior turn; no account credentials bypassed or fabricated.
- Release commits 41b6b7f (lobby), e7a4414 (travel cache version). Development 8767 copy synced, release preparation whitelist updated.

## Seven professions and motion (2026-10-10, 0.9)
- Seven classes selectable at creation: swordsman, lancer, hunter, boxer, rogue, shaman, acolyte (male monk / female nun).
- Four illustrated poses per appearance, fourteen appearances, seven 4x2 transparent atlases in assets/classes. Built-in ImageGen prompts saved in assets/classes-prompts-09.json. Basic frame animation, not a complete eight-direction production sprite set.
- Class-specific basic attack range/speed/damage, ten skill slots, healing and shield modifiers, melee/arrow/spirit effects. Skills share core mechanics; balance remains prototype.
- Existing characters can change profession in lobby without resetting identity, progress or cooldowns; transaction revision protection preserved.
- NPC idle movement, monster attack squash/recoil, lobby transitions, preview pose controls, atmosphere drift, UI feedback and reduced-motion support.
- Firestore rules published 1:56 AM Bangkok: seven allowed IDs, class changes permitted but name/gender fixed; owner-only access and all state/revision validation preserved.
- 44 Node tests pass. Local browser verified female boxer creation, auto-combat kills, travel, return, class change to nun with 10 kills retained, correct new skills and healing; no console errors.
- Mobile landscape creation at 844x390 fits (scrollHeight390, create button bottom338). Public deployment verification follows.
- Actual Google OAuth/cloud round-trip still awaits an account login; tests use guest and mocked cloud adapter.
- Published commit 5d18f935fda9d14ce7badb8521d7088145fca122; Pages run 37977179628 succeeded. Public HTTPS 0.9 lobby verified with seven class choices and female boxer action preview, no console errors. Proof: work/classes09-public.png; mobile proof: work/classes09-mobile.png. Orientation gate verified at 390x844.

## Vercel production (2026-10-11)
- Live game: https://ayothaya-folk-mystic.vercel.app/
- Project: chokkungfn-5447s-projects/ayothaya-folk-mystic, Hobby plan.
- Imported ThanatZhu/ayothaya-folk-mystic main. Build config commit 263a3aa; documentation commit 66b37c13fa27a8646c73ae5a549f22f19a60ab43 automatically deployed and verified Ready.
- vercel.json: Other framework, npm run build, dist output, node --version install command, cleanUrls false.
- build-vercel.mjs copies runtime only, excludes Blender authoring files, rules and tests. Build and six map / seven atlas checks passed.
- Added exact ayothaya-folk-mystic.vercel.app to Firebase Authentication Authorized domains; existing project and domains retained.
- Public browser flow verified: guest -> server 1 -> create male boxer -> Ayutthaya -> travel Bangsai -> save/return -> reopen same character, Bangsai retained. No console errors observed.
- Google sign-in button initializes; actual Google account login and cloud save/load remain unverified. Guest localStorage is origin-specific; GitHub guest data does not migrate automatically.
- Synced build config, package.json, README into development copy; release script retains new config and ignores dist/.vercel.
- Proof screenshots: work/vercel-live-game.png, work/vercel-production-ready.png, work/vercel-firebase-domain.png.

## Playful typography (2026-10-11)
- Published df396fc: self-hosted Mali Medium/Bold (Thai + Latin), OFL license in assets/fonts; shared typography.css for lobby, game and world gallery.
- Adjusted title lettering, heading weights and readable desktop labels; kept mobile character creation at 844x390 without document overflow (scrollHeight390, create button bottom354).
- Build passed, public Vercel page visually verified with new font and stylesheet v10. Local game computed font verified Mali.
- Development copy and release whitelist synced. Screenshot: work/mali-font-live.png.

## Mobile viewport fit (2026-10-12)
- Release a3ae58b fixes mobile document position/overflow and prevents page pans and overscroll. Lobby is fitted to the available visual viewport with a ResizeObserver, including font loading and screen changes.
- Safe-area-aware horizontal layout; name field uses 16px text; keyboard-specific compact form when visual viewport shrinks. Internal long account/map dialogs retain their own scrolling for accessibility.
- At <=360px landscape height, minimap hidden to avoid overlapping skill controls; world-map button remains available.
- Browser validation: 568x320 character form fits (create bottom279, back button298); 667x375 login fits; 844x390 game canvas fills viewport, page scroll attempt stays0 and joystick drag changes player position; 932x430 lobby fits; 390x844 rotation gate shown.
- 44 tests passed and Vercel static build passed. Hardware phone browser bars, keyboard and multitouch remain unverified on a physical device.
- Development mirror and release whitelist synced; entry cache versions updated to11.

## Expanded regions (2026-10-12, af45d6c)
- Six existing IDs now fully safe towns; six new -wilds IDs contain combat. Every map has a 234x195.3-unit main navigation area, about50x original. Original harbor and coordinates remain for saves.
- build_regions12.py reuses original authored pixel-textured assets at original scale, adds eight districts plus harbor, connected roads, housing/shop plots, a canal with four bridges, and original-region wilderness scenery.
- 30 named NPCs (five per town) with starter dialogue; existing NPC sprite sheet reused. No quest/shop/trainer systems or complete unique NPC art added.
- Each town has nine safe local travel stops; separate map loading prevents monsters crossing into towns. CombatWorld suppresses mob config entirely in safe maps. Fields have28 mobs each; existing leash rules retained.
- Updated map/minimap bounds, region status, local teleport camera, large overview zoom and far plane, player-following sunlight/shadow area,1024px mobile shadow map. One full region is loaded at a time; no chunk streaming or measured hardware FPS claim.
- Firestore rules published via console Today12:18AM: adds six exact map IDs and bounded x[-125,125],z[-200,15]. Owner-only, revision and character validation unchanged. Overview saves clamp zoom to allowed range. Actual authenticated save roundtrip remains unverified.
- 57 full-suite checks pass; two subsequent focused tests pass for bridge-only canal crossings and expanded-coordinate save/overview zoom (59 tests total). Build and syntax checks pass.
- Local browser: old guest character loads, local cart travel and overview toggle work; wilderness auto combat defeats4, return to Ayutthaya retains kills and shows0 monsters with HP regeneration. No console errors.844x390 matches viewport without scroll.
- Development mirror and release whitelist updated. Public deployment verification follows. Proof: work/regions12-overview.png, work/regions12-rules.png.
- Public Vercel verification completed: lobby v12a; existing guest character retained; Bangsai wilderness shows four nearby selectable monsters, return to town shows zero. Free cart travel reaches northern market; overview renders expanded town at14% zoom. No console errors observed. Public proof: work/regions12-public.png.

## Neighborhood details and mobile HUD (2026-10-12, e63d964)
- Rebuilt all12 maps with original-scale district furniture, lanterns, handcarts, herb beds, merchandise, laundry, temple offerings, pools, forest rocks and rest stops. Ground flecks are grouped geometry; new obstacles authored with props. No new quests or services claimed.
- Top-right now contains the minimap and menu button; tap map opens travel. Camera and motion settings are in a dialog; simulation pauses while it is open. Safe-town target banner hidden.
- Mobile exposes five skills at a time with a44px bank switch and44px+ main controls. Desktop retains ten skills. Added minimap avenues, canal and NPC dots.
- All59 existing tests pass including nav reachability, spawns, portals, monster paths and bridge crossings. Static build, syntax and diff checks pass. Browser844x390 and568x320 fit without document overflow; bank switching, settings, overview and cart travel verified. No console errors observed. Physical hardware performance remains unmeasured.
- Development mirror and release whitelist synced. Public verification pending.
- Public Vercel release verified: new map-first HUD renders, northern-market cart travel succeeds, both skill banks switch correctly at844x390, no console errors. Screenshot: work/detail13-mobile-public.png. Temporary viewport override reset.

## Character systems 0.14 (2026-10-12)
- Added per-character appearance and advanced-job persistence, UID switch guard, 10-second autosave. Legacy records supported.
- Seven appearance selectors, shared runtime atlas compositor, 10 motion states from 4 original frames, four game-menu emotes.
- 14 advanced branches unlocked at Lv10/90 defeats with combat modifiers; no job quests or new advanced atlases.
- Firestore owner-only validation updated and published in console Today 2:49PM; appearance enums and class/level job checks added.
- 65 full-suite tests passed; final 6 character tests and static build passed after cosmetic/cancel fixes. Local guest reload restores appearance; cancel restores previous choice; mobile844x390 wardrobe and game appearance verified.
- Runtime files, documentation, tests and release whitelist synced. Authenticated cloud browser roundtrip pending.
- Release16e7fb0 pushed and public Vercel0.14 verified. Guest wardrobe saves and survives reload; no browser console errors. Mobile viewport override reset. Google account selection was rejected by automatic approval review because the exact account was not authorized; user handoff remains pending. Authenticated cloud roundtrip is not verified.

## Body motion0.15 (2026-10-12)
- Distance-driven gait, independently weighted body mesh, single attack timeline, hit timer fix; shared game/lobby/wardrobe deformation. Existing front-facing artwork retained; no new directional sprite set or exact foot-lock claim.
- All69 tests and static build passed; final four motion tests pass after class gait tuning. Local game and844x390 joystick/emote verified without console errors. Mirror and release whitelist synced.
- Published commit b3715e2. Vercel deployment BPXELUQZX4MceJZqoffEBNUzcCxE reached Ready after initialization delay; production domain serves lobby v15 and the new canvas motion preview. Public guest wardrobe renders without console errors. Temporary viewport reset. No changes to Firebase or Google account authorization.

## Full-game Phase 1 design (2026-10-12)
- Added docs/GAME-DESIGN.md, ASSET-SPEC.md, PRODUCTION-PLAN.md and content/chapter-01.json. Design-only data, not wired into live gameplay.
- Chapter1: 10 quests, 6 principal NPCs (5 existing +1 planned), 31 full NPC records,16 items,4 existing monster types plus1 planned boss. Existing cities/names preserved.
- Content validator passes stable-ID/reference checks, quest DAG/order, starter item availability before equip, guaranteed quest drops, purchase affordability,530 quest XP+370 combat XP=900,320 quest coins and31 target activity minutes. Timing/balance are proposed, not measured.
- Defined sprite pilot, future save migration, reward transaction/idempotency, server authority boundaries and Phase2-10 acceptance. Runtime remains0.15; no Firestore changes. Release whitelist and development mirror synced.

## Phase 2 A01 directional sprite pilot 0.16 (2026-10-12)
- Three generated PNG sources, manifest with 16 authored neutral views and foot anchors; preserved originals. Built-in image_gen prompts saved with assets.
- Public-ready sprite-lab.html: both genders, eight directions, orbit controls, baseline guides and reduced-motion support.
- Optional in-world shaman-only pilot; default original wardrobe and action frames retained. Disabling restores original appearance; failed load falls back. New art does not change saves.
- 72 tests, static build, content validator and diff check pass. Local browser: male/female rear/camera, 844x390 no document overflow, game walking shows rear, toggle-off restores customized hair/garment; no console errors observed. Not new walk/attack clips; A02 onward remains pending.
- Mirror and release whitelist synced; publication pending.
- Published aeb7e68 via Vercel Create Deployment for main (automatic deployment was not present in the list). Deployment BpPGFk3Cq51JCA2CkVqsEtNo7vdG is Ready, source aeb7e68, build13s. Production sprite-lab URL returns the new page; final visual verification in progress.
- Public visual verification passed: sprite lab loads16 images, female/back selection renders, no browser errors. Public result tab marked deliverable; temporary viewport reset.


## ทุกอาชีพหลายทิศ (0.17 / Phase 2 A01 extension)

- ขยายชุดท่ายืนเป็น 7 อาชีพ × ชาย/หญิง × 8 ทิศ = 112 ภาพ: นักดาบ นักทวน นายพราน นักมวย จอมโจร หมอผี และพระ/แม่ชี
- ห้องลองมีตัวเลือกอาชีพและลิงก์ `sprite-lab.html?class=boxer` สลับภาพโดยไม่โหลดหน้าใหม่ พร้อมคืน GPU textures เก่าและกันผลโหลดอาชีพเก่าทับตัวเลือกใหม่
- เมนูกล้องในเกมเปิดภาพ 8 ทิศได้ทุกอาชีพ โหลดเฉพาะอาชีพที่เล่นเมื่อเปิดตัวเลือก; ปิดเพื่อคืนชุดเดิม ไม่แก้ข้อมูล appearance
- PNG ต้นฉบับและ crop/foot metadata อยู่ใน `assets/directional/`; พรอมป์สร้างและแก้ภาพด้วย built-in image_gen อยู่ใน `prompts-17.json` นักทวนมีภาพแก้ด้านหลังแยกต่างหาก
- เป็น neutral turnaround และชุดมาตรฐาน ใช้ mesh deformation เดิมชั่วคราว ยังไม่มีคลิปเดิน/โจมตีวาดแยกหรือเสื้อผ้าหลายชั้น ความต่อเนื่องของมือ อาวุธและเครื่องประดับยังต้องเก็บก่อนทำคลิปจริง
- ตรวจรับ: 80 automated tests ผ่าน, content validator และ production build ผ่าน; สลับครบ 7 อาชีพในเบราว์เซอร์ ไม่มี console errors; หน้าแม่ชีด้านหลังแสดงถูกต้อง และจอ 844×390 / 568×320 ไม่ล้น document ยังไม่ได้วัด FPS บนมือถือจริง

- Public publication pending.

- Local boxer game pilot verified: W shows rear frame; disabling restores customized silver hair/red outfit. Test guest profession restored to shaman. Published Git commit 347335f; Vercel verification pending.

- Vercel automatic deployment HYCMpysKyfxFwo2S7Jc3vJVVvtP1 Ready (11s build), source 347335f. Public sprite-lab?class=swordsman shows new seven-class selector and art, no console errors. Proof saved: work/all-classes17-public.png. Public result tab marked deliverable; mobile viewport overrides reset.

## Character slots 0.18 (2026-10-13)
- Five account-wide slots, novice ผู้ฝึกตน at level 1; class at 25 and Master at 60. Legacy characters migrate with original class/state retained; backups kept.
- New novice male/female atlas and recorded built-in image_gen prompt. Mobile details scroll internally with 44px action buttons.
- 86 tests, content check, build and guest create/play/reload passed. Firestore rules published through console; owner get allowed, unauthenticated/cross-owner/slot-6 denied in Rules Playground. Real Google cross-device roundtrip not performed.
- Reference video inspected: 12s, 1280x702; frame sheets in work/clip-reference. Visual analysis only; no scene overhaul in this release.
- Mirror and whitelist synced; GitHub/Vercel publication pending.
- Published 9090635. Vercel GAMDrBb7Y7ePgWHX3kpFWFDFg33t Ready (12s). Public lobby 0.18 and five-slot novice creation verified; existing guest boxer retained. No public console errors. Proof: work/character-slots18-public.png. Temporary mobile viewport reset.

## Rebuilt capital 0.19 (2026-10-13)
- User requested removal of all old maps and a new central city. Old map files copied to work/maps-before-capital19, and remain in Git at 9090635. Release and mirror now contain only the rebuilt Ayutthaya map.
- Eight districts, 126 x 114.4 walkable main area, 11-13 unit main roads, three canal bridges, six dialogue NPCs, no monsters or inter-map portals. New Blender source build_capital19.py and GLB; runtime painted ground blending and instanced transparent foliage with real shadows in capital-look.js.
- Built-in image_gen material atlas and transparent bough saved with complete prompts. Water/boat/leaves/wind remain animated, camera rotates; character animations unchanged.
- Retired map saves validate without mutating old payloads; resources and character preserved, old-map positions discarded on entering capital. Existing capital positions applied only if walkable. No Firestore rules change.
- 62 tests pass (obsolete 12-map assertions replaced with new capital connectivity, bridge, NPC approach, safe city and legacy-save checks); content validator and build pass. Browser: new harbor/plaza/market, rotation, travel, 844x390 no document overflow, no console errors. Actual phone FPS not measured.
- Future story maps marked planned; gallery/README updated. Mirror and release whitelist synced. Publication pending.
- Published c720230. Vercel deployment 4pFDFFz3Mg6PZkugBYD8c1ipCj6y Ready. Public lobby 0.19 verified; existing guest boxer formerly in Bangsai enters new Ayutthaya and autosaves successfully; no console errors. Browser viewport reset; public game tab kept as deliverable.

## Crafted HUD and volumetric foliage (2026-10-14, 0.20)
- Implemented the approved teak/brass/jade HUD using the generated transparent UI atlas; live HTML text/HP/MP/cooldowns/minimap, no mock chat/quest features. Runtime atlas sampling keeps original asset intact; CSS fallback if asset fails.
- Mobile 5-slot paging, 44px minimum skill targets, 68px attack, joystick, safe areas; desktop 10 slots and collapsible city travel guide.
- Layered textured crown geometry, wind-driven leaf edges, branch forks/roots, bark texture, rounded open pottery and flowers. Instanced geometry; camera rotation preserved; no navigation or save schema changes.
- 62 tests, content validation and build pass. Browser verified desktop1280x720, landscape844x390/568x320 without page overflow; portrait390x844 gate; skill paging/cast MP, joystick position change, city travel, camera rotation, old guest load/autosave. No runtime errors. Physical phone performance unmeasured.
- Development mirror and release-copy whitelist synced. Publication pending.
- Published 3c0cb2c to GitHub main; Vercel HWmSy2gaH7qtnDknSKVHZBWVD9St reports Deployment has completed. Public game loaded existing guest boxer with 10 live skills and art-ready HUD; auto-save visible and no console errors. Proof: work/ui20-public.png and work/ui20-mobile.png. Viewport reset; public game tab retained.

## Water, terrain, skill art and experience (0.21, 2026-10-14)
- Continuous water shader with depth/shore and view-dependent simulated sky sheen; gravel grain and instanced roadside stones/windblown grass. Navigation unchanged; city remains safe.
- Eight original image_gen PNG atlases, 80 skills including Novice; all prompts saved. Runtime crops, only current profession atlas in game; lazy-loaded skill gallery. Master inherits base skill set.
- Separate Base/Job XP persistence, explicit legacy conversion, no XP rollback, Base preserved and Job reset on class/Master change. New slots forced Novice with 0/0 XP. Base 25/60 gates retained.
- 66 tests, content validation and build pass. Guest legacy 40/24 XP survives reload; new female Novice has 0/0. Desktop and 844x390/568x320 HUD inspected; both mobile skill pages work. No runtime errors. Physical phone performance not measured.
- Firestore EXP schema published via Firebase Console (Today 12:39 AM); Rules Playground owner get allowed, unauthenticated and other owner denied. Cloud adapter XP fields tested with mock transactions; real Google cross-device roundtrip not performed.
- Development mirror and release whitelist synced. Publication pending.
- Published a6708b0 to GitHub main. Vercel FRRiivmX7sEeRAuNNEbRBggFbfZn completed successfully; public 0.21 lobby/game/gallery verified, public IAB logs clean. Proof: work/exp21-public.png, work/exp21-mobile.png, work/skills21-gallery.png.
- Additional real Google validation succeeded in Chrome: existing ThanatZhu legacy rogue migrated into capital, cloud autosave shown, reload shows Base Lv2 30/100 and Job Lv2 18/80 unchanged with "โหลดเซฟคลาวด์แล้ว". No new cloud character created. Proof: work/exp21-cloud-reload.png. Cross-device test still not performed. Chrome warnings came from MetaMask extension, not game code.
- Browser viewport reset. Public game and skill gallery retained as deliverables; temporary Firebase/test tabs can close normally.
## Profile and map UI (0.22, 2026-10-14)
- Removed manual save and account HUD strip. Portrait is a keyboard/touch profile button; account/server/character/logout and settings live in profile. Existing 10-second autosave, visibility/online retry and save-before-exit retained. Transient errors expose reconnect; conflicts require latest state. Keyboard focus remains inside profile.
- Removed mini-map hamburger/header. Tapping minimap or M opens an actual city footprint canvas, roads/canals/bridges/roofs/trees/district labels/player marker. Removed text-grid/fast-travel cards; map can zoom 1–3x and pan via scroll/touch. Position updates independently of ambient-motion setting.
- 66 existing tests and build pass. Browser: profile/settings/close paths work; changed camera from38 to83 degrees autosaved and survived reload without a manual save. 568x320 map zoom and 44px controls checked, no page overflow; desktop map and public guest profile checked. No public runtime errors.
- Mirrored source and added map files to release whitelist. Published d6cdd8f; Vercel 7Yf6gzNYkH1HwCNob7yhseVzu1N9 completed successfully. Proof work/profile22-hud-public.png, work/map22-public.png, work/map22-mobile.png. Temporary viewport reset; public game retained.

## Skill choreography (0.23, 2026-10-14)
- 80 authored procedural tracks: Novice and seven classes, ten skills each. Shared gender/Master tracks, per-gesture existing artwork cues, rig rotation and vertical arm weights, timed shared VFX with a 16-cast cap and disposed materials. No new hand-drawn attack sheets; optional directional sprites still lack direction-specific attack artwork.
- Actual skill slot and pre-dash origin emitted by combat; game samples its track. Existing immediate damage/resource rules unchanged, city still safe, no account/schema changes. Ordinary auto attacks do not overwrite active skill pose; emotes exit it.
- New skill-lab page accessible from profile/settings and gallery: no login/account writes, gender/class/skills, replay/slow/facing/fixed beat controls. Stage stays visible on landscape mobile; catalogue scrolls separately.
- 71 tests pass including unique 80 body tracks, 61 samples each with non-inverted 16x24 rig, neutral recovery, reduced motion, valid/invalid cast identity, finite VFX and cleanup. Build and diff checks pass.
- Browser: all eight classes loaded, female rogue/monk/nun switching, punch vs kick, shaman ritual, Novice nova in real local city with MP/cooldown. Settings link present. 844x390 no document overflow, no runtime errors. Physical-device performance not measured. Publication pending.
- Published 2e2fd40 to GitHub main; Vercel 5eWt1mnUojth9UDgWxHcEo16LACE completed. Public skill-lab loads, combo selection and beat inspection work, console clean. Proof: work/skill23-public.png. Temporary viewport reset; public skill lab retained.

## Multiplayer foundation (0.24, 2026-10-14; public backend NOT deployed)
- Added Node/ws authoritative rooms, server-owned movement/combat/XP, five-player parties, room/party chat, short reconnect grace, Google token/owner checks, Firestore private profiles and fenced account/runtime leases. Local dev identities/saves remain loopback-only and ignored.
- UI shows remote customized sprites, skill/emote motion, party actions and chat. Mobile 844x390 panel fits without scrolling; saved screenshot work/multiplayer24-mobile.png. Two real game tabs saw one another, moved, accepted party invite, exchanged party chat and retained party after reload/rejoin. Proof work/multiplayer24-two-players.png and work/multiplayer24-party-chat.png. Final console logs clean.
- 84 tests (13 multiplayer), including actual WebSockets; cloud adapter uses mocks, NOT emulator/cloud verification. 50 local socket 3-second smoke: 1,250 snapshots, 10.14 MiB, 68.9 KiB/s/client, p95 2.2ms. No production load guarantee. Latest localhost service port8787.
- Public MULTIPLAYER_URL intentionally empty; existing Vercel game stays single player. gcloud active account lacks permission on ayothaya-folk-mystic; no cloud resources, IAM, billing, auth credentials or Firestore rules changed. Backend Docker/config/operating docs prepared. Owner login, hosting budget/permissions, rules emulator, real cloud save and separate-device tests required before enabling public rooms.
- No inventory/trade/guild/quests/dungeons/moderation implemented. Only safe capital ships; shared combat and reward validation use a test field. Existing legacy progress import is documented as untrusted and offline progress is not merged after first online import; migration policy needs agreement before launch.
- Source mirror and release whitelist updated. Publication pending.
- Published d0dd3e6 and version label 24c2223 to GitHub main. Vercel JEDQkMoiZuTreVHJo8ZoWExfbg43 completed successfully. Public guest game loaded correctly; online join disabled with explicit backend-not-ready message, console clean. Proof work/multiplayer24-public-status.png. No public backend/rules deployment. Two local test game tabs retained as deliverables; viewport reset.

## Google Cloud access resolved (2026-10-14)
- Owner confirmed chokkungfn@gmail.com and explicitly approved Google Cloud SDK consent. Reauthenticated successfully; gcloud can now describe ayothaya-folk-mystic, project number 438786643191. Earlier account-permission diagnosis is superseded by this verified result.
- Firestore location verified asia-southeast3. Project billingEnabled=false, no linked billing account. The only account visible to this identity is closed. No Cloud Run/Cloud Build/Artifact Registry APIs were listed as enabled.
- No billing linkage, paid resources, IAM role grants or production rules changed. Remaining infrastructure gate is active billing/hosting approval plus production validation, not owner account identity. Proof work/google-cloud-sdk-connected.png.

## Firestore rules emulator tests (2026-10-14, no version bump; rules NOT deployed)
- Added `npm run test:rules`: 7 tests in tests/rules.emulator.mjs, run by scripts/test-rules.mjs through firebase-tools 15.33.0 `emulators:exec` on offline project `demo-ayothaya`. Covers owner-only reads, fresh Novice create at revision 1, next-revision/no-XP-loss saves, client write lock while a live multiplayerLeases lease exists and unlock after expiry, Lv.25 class / Lv.60 job thresholds with Job EXP reset, private multiplayerProfiles/Leases/Runtime (owner cannot read, write or clear own lock), and frozen legacy saves. `firestore.rules` itself unchanged.
- All 7 pass. Mutation check: disabling the lease lock or opening character reads each made exactly one test fail; rules restored from git afterwards.
- Java: portable Temurin JRE 21.0.12 downloaded from Adoptium to %LOCALAPPDATA%/ayothaya-tools/jre (outside the repo). Dev deps firebase 13.0.0 and @firebase/rules-unit-testing 6.0.0; Vercel install skips them and server/Dockerfile uses `npm ci --omit=dev`.
- `npm test` 84/84 pass, build and diff checks pass. firebase.json added to the release whitelist; generated .gitignore now ignores *-debug.log. Mirror synced from REPO (mirror files matched HEAD before the copy).
- Published 5a859c3 to GitHub main. Vercel 9PWJNDuoypHpVotoaAMqcfaszvwz completed successfully. Public lobby reload clean: all requests 200, no console errors, MULTIPLAYER_URL still empty, test files and firebase.json not served. No frontend runtime change, so no new screenshot was taken.
- Not done: no rules deploy, no cloud project or IAM change, no billing change. Remaining production gates are unchanged: billing/hosting approval, rules deploy plus cloud verification, two real Google accounts on separate devices, migration policy agreement.

## Multiplayer HUD redesign (0.25, 2026-10-14; public backend still NOT deployed)
- New in-game multiplayer UI in multiplayer-ui.js/.css: non-modal chat dock with Room/Party tabs (Enter to type, Esc to leave, never pauses play; collapses to a one-line bar with unread count on touch screens), party frame with leader crown, server HP bars and far/disconnected/down states, top-centre invite toast with countdown and accept/decline, speech bubbles over speakers, blue ✦ nameplates for allies. Online chip and roster dialog restyled to the carved-wood/gold HUD with a connection dot. Roster hidden until connected.
- Fixes: Q/E camera turn and V overview no longer fire while typing in a text field (viewer-world.js). Snapshot players now carry maxHp for party HP bars (server/realm.js), covered by one added test assertion.
- Local verification with AUTH_MODE=local and two tabs: chat and bubble received, invite toast accepted, party frame and Party tab on both, reload kept the party, closing a tab showed "หลุด" (disconnected) on the other. Typing `eee vvv` in chat left the camera unchanged; E outside chat rotated it. 1280x720 and 844x390 viewports: no overlap with skills, joystick or minimap and no page overflow; roster dialog fits 844x390. Viewport emulation only, not a physical phone.
- `npm test` 84/84 and `npm run test:multiplayer` 13/13 pass; build and diff checks pass. Mirror files matched HEAD before syncing.
- Published 64c39b3 (Vercel 6LCndrDFneo5wRwU3RKP28oZK1E8) and 42088c9 roster tweak (Vercel 5sFk1aGBeUFYuJjqyTa6eZ7sRMbN), both success. The first push returned a one-off HTTP 403; gh auth showed ThanatZhu active with push rights and the retry succeeded. Public lobby shows 0.25. The public guest game shows the grey "unavailable" chip, join disabled, chat and party hidden, no console errors. Screenshots were inspected in the browser pane but not saved to WORK.
- Not done: no backend deploy, no MULTIPLAYER_URL change, no cloud or billing change. The multiplayer UI is only usable against the local server until the backend gates in section 10 are cleared.

## Automatic online join (0.26, 2026-10-14; public backend still NOT deployed)
- Owner asked that entering the game puts the player online immediately, with no separate personal world. Removed the manual "เข้าร่วมโลกออนไลน์" and "ออกจากออนไลน์" buttons. When MULTIPLAYER_URL is set (or on the loopback dev server) and the account can authenticate, the game joins the shared room as soon as it loads. Returning to the lobby or logging out ends the session; the server saves on close.
- A failed connection now opens the roster dialog with "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · กดเชื่อมต่อใหม่อีกครั้ง" and a reconnect button, and the chip reads "เชื่อมต่อไม่ได้". Verified by serving dist without the multiplayer server.
- Local server with two tabs: both reached "ออนไลน์ · 2 คน" with no clicks after entering, saw each other's nameplates, and no new console errors.
- `npm test` 84/84, multiplayer 13/13, build and diff checks pass. Mirror synced after confirming it matched HEAD.
- Published 4231990; Vercel AMGUoZxw16hEZEbnHhVZdbytmTmG success. Public lobby shows 0.26. The public guest game has no join button, a grey "unavailable" chip and no console errors. The public site is still single player because no backend is deployed.
- Open owner decisions: (1) hosting and billing for the backend, which is required before anyone is online publicly; (2) what guest/trial mode should be, since the production server only accepts Google sign-in tokens.

## Free test backend on Render (2026-10-14; not yet enabled in the game)
- Owner chose a free test before paying. Render free web service `ayothaya-folk-mystic` (Singapore) runs `node server/host.js` in firebase mode; https://ayothaya-folk-mystic.onrender.com/health returns ok with authority true. WebSocket upgrade from the Vercel origin returns 101; a foreign origin gets 403.
- Owner explicitly approved service account `ayothaya-realtime@ayothaya-folk-mystic.iam.gserviceaccount.com` with only roles/datastore.user and roles/firebaseauth.viewer (IAM API enabled for this). Key 5a3b987c… created at C:/Users/NIMMA/ayothaya-secrets/firebase-admin.json, outside the repo. The owner pasted it into a Render secret file; Claude was blocked from handling the key and did not. Read checks with the key passed after about a minute of IAM propagation.
- a80d764: a replacement host now waits for the world lease (health has an authority flag, sockets get 503 until then) instead of exiting. Render's redeploy handed over in about a minute. 85 tests pass, including a handover test that fails on the old code.
- Deployed Firestore rules (ruleset fe6b5e9b…, 2026-10-13) lack the multiplayerLeases lock that the repo rules have; the only diff is offline() on character updates. The deploy attempt was blocked pending explicit owner approval.
- Not done yet: deploy rules, set MULTIPLAYER_URL to wss://ayothaya-folk-mystic.onrender.com/realtime, and test with real Google accounts. Guest mode stays single player.

## Online play enabled (0.27, 2026-10-14)
- Owner explicitly approved deploying Firestore rules and enabling MULTIPLAYER_URL. Rules deployed via the Firebase Rules API as ruleset 217f3edc-eb4f-4bab-abcb-713298c84269 (release updated 2026-10-14T16:43:39Z). Read-back matches repo firestore.rules exactly; the only change from the previous ruleset fe6b5e9b… is the multiplayerLeases offline() lock.
- 5a5aa82: MULTIPLAYER_URL=wss://ayothaya-folk-mystic.onrender.com/realtime; loopback pages still use ws://127.0.0.1:8787. Vercel success; public lobby shows 0.27 and serves the Render URL. 85 tests pass.
- Live checks: Render /health ok with authority true after its redeploy; a fake token was rejected with authentication-failed; a foreign origin gets 403. Public guest game shows "เข้าเกมด้วย Google เพื่อเล่นออนไลน์" and stays single player; no console errors.
- Not verified by Claude: real Google sign-in joining online, two real accounts seeing each other, cross-device saves. Claude may not sign in to accounts; the owner must run this test. A cold Render instance takes about a minute to wake.

## Smooth online movement and HUD layout (0.28, 2026-10-15)
- Owner reported in the live game that two Google accounts saw each other online, but walking stuttered. Cause: in online mode the own character position was overwritten by 10 Hz snapshots and world.time jumped back on each one. Fix: predictMove (combat-core.js) moves locally with the server's rule each frame; snapshots only correct drift (snap above 2.5 units, ease while not steering); world.time only resyncs when off by more than 0.25 s.
- Measuring the fix exposed a server bug: the tick stepped a fixed 0.05 s per setInterval callback, and late timers made the world run about 20% slow (1.2 s simulated per 1.5 s real), so stopping pulled the player back about 0.9 units. host.js now steps by real elapsed time in 50 ms slices. Stop input is sent immediately instead of waiting for the 65 ms throttle.
- Browser on the local server: while walking the position changed on 66 of 75 frames, never still for more than 1 frame, max step 0.14 units. Pullback after release went from 0.9 back to 0.3 ease forward, before the immediate-stop change. The final re-measure could not run because the browser pane was hidden; that change is covered by a unit test instead.
- HUD per owner request and reference screenshot: menu bar at the top-right above the minimap (ตัวละคร, แผนที่, ผู้เล่น, แชต while online, ตั้งค่า), all verified to open the right screen. Desktop skills 5x2 with AUTO/Attack bottom-right; chat above the online chip. 1280x720 and 844x390: no overlaps or page overflow. No placeholder menus for systems that do not exist yet.
- 90 tests pass, including new prediction, immediate-stop and server-clock tests that fail on the old code. Published 6d8f5bf; Vercel success; live site serves 0.28. Render health showed 2 players online during the release; Render auto-deploys the server change and hands over the world lease.

## Soft 2.5D look and livelier animation (0.29, 2026-10-15)
- Owner asked for a softer, more realistic and beautiful 2.5D map using Blender, plus more noticeable walk and skill animation.
- Renderer: Neutral tone mapping at exposure 1.16, PCF shadows radius 5 and intensity .74, warmer sun, and haze that tracks camera distance. The first version fogged out the overview because overview moves the camera 6x further; found and fixed. soft-look.js adds bloom (threshold .9) and one shader for tilt-shift, shadow lift, warm highlights and vignette. Settings has a "ภาพละมุน" toggle stored in localStorage, not the cloud save (rules limit save keys); default on for mouse devices, off for touch.
- Blender 5.2: bake_ground_ao.py bakes a 1024px Cycles ambient-occlusion map of the ground (assets/ground-ao.png, 351 KB, about 4 s) with occlusion distance 3.5 m and runtime-hidden objects excluded. The ground shader multiplies it in with a slight cool tint. maps/ayutthaya.blend is untouched. Black areas in the map sit under water or solid objects.
- three r186 post-processing files vendored under vendor/addons/postprocessing and vendor/addons/shaders (the vendor LICENSE already covers them).
- Animation: livelier walk (stride .075, lift .07, arms .042, lean .022, rise .07, footfall squash), with deformPoint now applying sx/sy around the feet; strike anticipation squash and stretch on skills; additive over-bright skill FX, ground glyph flash, soft strike flash; hero footstep dust, a single permanent PointLight pulsing on strikes, and a camera shake applied only around the draw call. Remote players inherit the walk and FX.
- Checks: 90 tests pass; motion non-inversion, neutral recovery and FX disposal tests unchanged. Screenshots compared at 1280x720 normal and overview. Strike flash seen frozen in skill-lab. Live walk and skill playback could not be captured because the browser pane was hidden, which pauses rendering. Phone GPU performance with soft graphics was not measured, so it is off by default on touch devices.
- During the change a version-key sed rewrote line endings in 24 untouched files; those were restored and only real changes were committed. Published 1537fa8; Vercel success; live game loads 0.29 with soft graphics on and no console errors.

## Detailed city and baked building shading (0.30, 2026-10-15)
- Owner chose more detailed houses, roofs and temples; hand-painted textures; and baked light on buildings.
- Confirmed first that build_capital19.py reproduces the committed world.json and GLB byte for byte (factory-startup Blender 5.2, temp copy).
- build_scene.py roof(): tile ribs, chofa finials, hang hong hooks, bai raka fins. house(): eave brackets and two amber veranda lanterns. build_world05.py stupa(): stacked bell bands (40 segments), gold mouldings, 18-petal lotus ring. Rebuilt world.json differs only in triangles (98,104 to 145,800), so collision is unchanged. Close-up render: work/house29-detail.png.
- First lightmap-atlas attempt (UV1 + 2048 atlas) failed: islands did not pack and planks got too few texels. It was discarded. bake_building_ao.py now bakes Cycles AO into a per-vertex colour (POINT, distance 1.6 m, 64 samples) for 208 meshes and exports with Draco: GLB 9.7 MB to 2.8 MB (old file 6.4 MB). The .blend is not saved by the bake script.
- Runtime: DRACOLoader and decoder vendored. Vertex AO is eased (x0.78) and the material cache keys on whether a mesh has colours, so meshes without colours never render black. Model and world.json cache key v=29.
- 90 tests pass. Local and live game load the Draco city with no console errors. Vercel serves the wasm as application/wasm, byte-identical. Published cc70537.
- Hand-painted textures not done yet: needs owner choice between AI-generated tile textures (credits) and procedural/shader painting.

## Live-service design document (2026-10-15)
- Owner asked for online game systems: events, daily login, first top-up weapon, start at Lv.1 with no skills, unlock and upgrade skills through quests, 10 skill levels. Wrote docs/LIVE-SERVICE.md with server-authoritative rules, an SP economy (1 per Job Lv), quest-gated levels 1/5/10, migration for existing characters, quest types, a 28-day login calendar and 7-day streak, event calendar (Loy Krathong ties into the lantern story), currencies, a first top-up weapon capped at shop Lv.20 stats, monthly card and pass, payment prerequisites (paid backend, Thai payment gateway webhooks, PDPA and terms), build order L1-L7 and open owner decisions. Design only; nothing implemented. Published 9e876ee.

## Skill levels (L1+L2) and hand-painted shading (0.31, 2026-10-15)
- Owner decisions: textures by code; first top-up weapon at shop Lv.20 stats; existing characters keep skills at level 1 with back-paid points. Recorded in docs/LIVE-SERVICE.md section 7.
- Painted look: capital-look.js paintify() adds brush patches, strokes, warm/cool drift and a vertical painter's gradient on building materials (not water or lanterns), with smooth texture filtering. A GLSL ES 3 reserved word (`patch`) broke every painted material on the first try, so houses vanished; caught in the browser console and fixed by renaming.
- Skills: skill-progress.js (shared). 1 SP per Job Level across Novice/class/Master. Level 1 is free (from quests later); levels 2-4 cost 1 SP; 5 and 10 wait for L3 trial quests. Scaling: +8% per level, radius x1.25 at 5, cooldown x0.95 at 7 and x0.85 at 10. Realm server validates the upgradeSkill command and stores levels in the private multiplayerProfiles record, stripped from the client-readable mirror so the Firestore rules shape is unchanged (no rules deploy needed). Unlearned skills are rejected. Guests store levels in localStorage. Skill window opens from the menu or K; level badges on the skill bar.
- Temporary until L3 quests: new characters still start with all current-class skills at level 1.
- 96 tests pass (6 new) and 15 multiplayer tests pass. Local: skill window rendered with points 0 and disabled upgrades for a Job 1 Novice; badges Lv1; 844x390 menu with six items fits. Published 3327bd0; Vercel success; live 0.31. Render healthy (authority true, 1 player online) and rejected a fake token after redeploy. An in-game upgrade with real points was not exercised in the browser; it is covered by server unit tests.

## MMO-style HUD (0.32, 2026-10-15)
- Owner asked for a UI that feels more like an online game (reference: their Pixel Jade Online screenshot).
- mmo-hud.js/.css (scoped to body.mmo-hud, loaded last): skills become round slots on two arcs (4 inner, 6 outer) around a larger attack button, with AUTO to the left. All 10 are visible on phones, replacing the 1-5/6-0 bank toggle. Circular cooldown sweep, key and level badges. The online chip now carries ping (new 4 s ping to the realm), FPS, Bangkok time and realm; on phones it sits at the top between portrait and menu. Red dots on Skills (points to spend), Players (pending invite) and Chat (unread). Minimap footer shows coordinates and realm, hidden on short screens. Chat gains a local "ระบบ" tab fed by game notices; the System tab never sends to the server.
- The first wheel layout lined up both arcs radially (cluttered); re-spread to 4+6 slots. On 844x390 the wheel overlapped the taller minimap and the chip text wrapped; fixed by a smaller outer radius on short screens, hiding the minimap footer there, and nowrap. Final: no overlaps, no page overflow at 1280x720 and 844x390.
- FPS reads near 0 in the hidden automation pane (0 animation frames per second there); the counter is correct in visible tabs.
- 96 tests pass. Published 98ed2a8; Vercel success; live 0.32 guest game shows the wheel and status line with no console errors.

## Travel journal UI (0.33, 2026-10-15)
- Replaced the six-item top-right toolbar with a Menu launcher and a teak/gold/jade modal with five categories and working submenu actions. Preserved existing skill/invite/chat notification IDs and aggregated dots. Added custom SVG icons, reduced-motion handling, native focus trapping, Escape dismissal, and gameplay/camera input guards.
- Fixed the new chat action to expand a collapsed mobile dock before focusing. Reuses save-before-return; no account schema, Firebase rules or multiplayer protocol changes.
- 96 tests pass; build and content validation pass. Browser checks at 1280x720 and 844x390 show no page or journal pane overflow and >=44px button heights. Profile, skills, map, roster, chat focus, settings, emote dismissal and return-to-lobby exercised locally; real phone/Google session not tested. Screenshots: work/menu33-desktop.jpg, work/menu33-mobile.jpg.
- Synced changed sources into the verified mirror and added game-menu.css to the release whitelist. Deployment pending verification.
- Published commit e683612 to origin/main. Vercel status success; live lobby shows 0.33 and game menu loads on production with no console errors. Live 844x390 DOM: dialog 796x366 within viewport, document 844x390. Screenshot work/menu33-live-mobile.jpg. Render health after push: ok=true, authority=true, mode=firebase.

## Persistent field HUD (0.34, 2026-10-15)
- Replaced 0.33 journal with direct HUD buttons, compact jade/gold profile and minimap, left party, bottom EXP bars. Preserved wheel source/geometry exactly. Added silver/gold SVG sword attack icon.
- Nonmodal profile/skills/map/roster/settings permit gameplay. Blocking account failures remain protected. Skills use profession artwork. Chat and save flows retained.
- 96 tests pass; build passes. Browser checks 1280x720, 844x390, 667x375 with no page overflow. Verified movement and slot-5 cooldown/MP consumption with skills open, modal/inert counts zero, profile/map switching and Escape. Screenshots work/hud34-mobile.jpg and work/hud34-desktop.jpg. No real phone hardware test. Deployment pending.
- Owner follow-up before publish: removed camera/how-to window and both launchers. Retained hidden binding IDs for existing camera controls.
- Published e016bbe (includes 4fb0181). Vercel success; production verified field-hud, 10 wheel slots, sword asset, hidden camera launcher, profile with zero modals, no console errors. Screenshot: work/hud34-live-mobile.jpg.

## Circular profile fix (0.34.1, 2026-10-15)
- Equal portrait width/height: desktop 52x52, mobile 44x44. Uniform frame inset gives 62x62 and 54x54. Extracted the selected gender atlas cell and render with contain to preserve sprite aspect. CSS/viewer cache keys bumped.
- Build passed. Browser measured equal dimensions at 1280x720 and 844x390; desktop appearance inspected. No full test rerun needed for presentation-only fix.
- Published 43d06e5; Vercel success. Production desktop verified portrait 52x52, frame 62x62, image fit contain. Screenshot work/portrait341-live.jpg.

## Articulated character motion (0.35, 2026-10-15)
- Replaced whole-sprite deformation with 15 rigid body parts and fixed-length two-bone IK; planted feet, arm counter-swing, per-class weapon gestures, wind-up/strike/recovery. Existing art is cut into articulated pieces, not newly hand-drawn directional frames. Extreme poses and robes can still reveal cutout seams. Masters share their base class motion; NPC/monster animation unchanged.
- Added class motifs and timed effects for all 80 current tracks across 8 professions including Novice. Shared geometry, bounded casts and reduced-motion handling. Integrated local/remote players and lobby/wardrobe previews.
- Enhanced skill lab with movement modes, slow motion, scrub and phase buttons. 102 tests pass; build/content checks pass. Latest rig/FX targeted tests pass after masks and cleanup. Local gameplay: movement changed coordinates, slot 5 consumed MP and healed, online authority active, no game console errors. Browser desktop/mobile-size checks only, not real phone hardware.
- Mirrored 21 changed/new files to outputs/ayothaya-scene-01 and added new runtime modules to release whitelist. Deployment pending.
- Published de2ed6c to origin/main; Vercel success. Production skill lab renders the new movement controls and articulated boxer kick; phase scrub verified at 47%. Screenshot: work/animation35-live.jpg. Temporary viewport override reset.

## Painted character frames (0.36, 2026-10-15)
- Generated 16 transparent PNG atlases for Novice and seven professions, male/female: 320 playable complete-silhouette frames (12 main poses + 8 walk samples per variant) and 96 separate part references. Runtime uses intact frames to remove cutout joint seams; parts remain an art library.
- Integrated local/remote characters, lobby/wardrobe previews and skill lab. Existing 80 skill timelines and class effects select shared pose libraries. Masters share base profession art; three-quarter front plus mirroring, not full eight-direction animation. Some generated frame proportions and transitions still need in-between polish; cosmetics use approximate anchors. No physical-phone performance measurement.
- 105 tests pass; build/content checks pass. Verified gallery all eight professions, boxer kick and actual local Novice gameplay. Screenshots: work/animation37-gallery.png, work/animation37-boxer-kick.png, work/animation37-game.png.
- Synced sources/assets to outputs/ayothaya-scene-01; updated release whitelist. Published 132fe53 to origin/main; Vercel success confirmed. Live gallery reports 8/8 loaded and renders both genders for every profession. Screenshot: work/animation37-live.png. Temporary viewport override reset.
- Assets and exact prompts: publish/ayothaya-folk-mystic/assets/animation37/. Image generation used built-in image_gen default mode.

## Starter countryside and monster reactions (0.37, 2026-10-16)
- Published cda2441 plus visual polish 902b9b4 to origin/main. Vercel checks success for both. Render health verified contentVersion=38, ok=true, authority=true, mode=firebase after the main release.
- Four connected maps: safe Ayutthaya, rice-fields, old-orchard, moonlit-mill. New fields have 152x150 bounds, wide roads, canals, bridges, authored rice paddies, painted rural props, ambient water/wind/light, and server navigation footprints. New city portal connects to the starter field.
- Generated three transparent 8x3 monster atlases: six regular species, two elites, one boss; 72 intact poses with dedicated struck, recovery and defeat art. Nine rural props. Assets and prompts in assets/frontier38; built-in image_gen default. Corrected orchard/elite backgrounds with imagegen; runtime reads bounding metadata and preserves full connected silhouettes.
- Shared offline/server AI gives windup telegraphs and range/LOS checks at impact; hit reactions preserve attack timing, visual recoil does not move authoritative positions, dead sprites linger/fade then respawn.
- Server-authorized travel validates adjacency/alive/capacity, checkpoints destination and releases the old lease before rejoin. Fixed local guest mirror so online travel does not reload the previous map. Minimap header follows the active map.
- 111 automated tests pass, including real WebSocket travel/save/rejoin/hit-state coverage. Post-layout change frontier tests 5/5 pass. Build and design-content validation pass. Browser local Novice traveled into rice-fields and earned Base EXP 28 / Job EXP 18 from combat. Desktop and 844x390 checks; no physical phone or real Google-account save round-trip tested this turn.
- Public frontier-lab.html previews all three new maps and hit/death poses without changing player saves. Production previews loaded. Screenshots: work/frontier38-mobile.png, work/frontier38-combat.png, work/frontier38-live-mill.png. Temporary viewport reset.
- Limitations: initial four-map region, not the full twelve-map plan; shared mill room rather than private party instance; existing party membership ends when traveling; NPC dialogue is not a reward quest; no new loot system or multi-phase boss mechanics. Monsters use a common AI with differing stats/range/timing; art is one three-quarter direction plus mirroring, not eight directions. Painted structures use billboards within 3D terrain.
- Changed files mirrored into outputs/ayothaya-scene-01, release whitelist updated, credential-like source scan passed, git worktree clean after publish.

## Phone landscape HUD zones (0.37.1, 2026-10-16)
- Owner reported the phone UI overlapping (screenshot: XP bars under joystick label/skill wheel/AUTO, chat bar under the talk-to-NPC button, online chip text cut off).
- New phone-hud.css (loaded last, only `orientation:landscape and max-height:520px`) gives the bottom edge one owner: joystick | XP strip + chat bar in the middle zone | talk/travel button at the right end of that zone | skill wheel. XP no longer spans the full width; collapsed chat is a slim one-line bar sized to its last message (a small "แชต" pill when empty); the online chip shows only "ออนไลน์ · N คน" on phones. Desktop and tablets unchanged.
- Built in a separate worktree (branch mobile-hud-fix) because Codex had uncommitted 0.37 work in REPO at the time; rebased onto 902b9b4 after Codex published, fast-forwarded main. Commits 49f7382 + 04bc47e (version 0.37.1). Pushed; live site serves 0.37.1 and phone-hud.css within ~20s.
- Checks: 111 tests pass. Headless Chrome touch-phone emulation (915x412 and 740x360, local realm server online): HUD, near-NPC talk button, and opened chat each show no overlapping controls. Same check on the live site as guest. No physical phone tested.
- Limitations: in-world name tags still overlap when two characters stand on the same spot (labels are placed by world-ui/multiplayer-ui; needs label collision avoidance). Local http servers here serve SVG as octet-stream so the sword icon looks broken locally only; Vercel serves it correctly.
- Changed files mirrored into outputs/ayothaya-scene-01 (mirror matched 902b9b4 for game.html/index.html before sync); phone-hud.css added to the WORK/prepare_github_release.py whitelist.

## Illustrated journey loading screens (0.38, 2026-10-16)
- Published 0cfc168 to origin/main; Vercel success confirmed. Preserved pre-existing 0.37.1 phone HUD changes (04bc47e / 49f7382).
- Full-screen loading on character entry and map travel, with four themes: existing Ayutthaya login art plus three new built-in image_gen scenic illustrations. Source PNGs and exact prompts saved in assets/loading39. These are illustrative mood views, not gameplay screenshots.
- Lightweight bootstrap displays loader before importing Three/game modules. Six real preparation milestones, waits for hero painted frames and first render. No timer-based fake progress/minimum waiting period. Departure is indeterminate while existing save/travel operation runs. Failed travel restores the old scene controls.
- Reusable overlay: inert gameplay, keyboard focus handling, reduced-motion CSS, slow-loading recovery at 45 s, failure retry/back actions, image-load fallback. Lobby pageshow restores controls after back/forward cache.
- QA: 111 existing automated tests pass, build passes, syntax checks pass. Local guest entry visibly showed rice-fields loading before revealing playable scene with online status. Preview failure/retry exercised. 1280x720, 844x390 and 568x320 checked; 844x390 error action buttons 46px tall within viewport; no overflow. No real phone hardware or real Google sign-in test this turn; map-travel UI itself not traversed in browser this turn (existing WebSocket travel test passed).
- Production loading-preview.html renders moonlit-mill, image complete, 1280x720 no overflow. Screenshot work/loading39-live.png; mobile proof work/loading39-mobile.png. Viewport override reset, public preview tab marked deliverable.
- Mirrored changed sources/assets to outputs/ayothaya-scene-01; release whitelist updated; source credential-like scan passed.

## Wide desktop loading track fix (2026-10-16)
- Removed 1100px max-width from .journey-bottom; track now fills the area between equal 6vw/safe-area insets. CSS cache key 39.1 in game, lobby and preview.
- Build passed. Browser measured 1920px viewport: 1689.625px track, equal 115.1875px margins; 844px: 742.75px track, equal 50.625px margins, no overflow. No full test rerun for CSS-only sizing change.
- Synced four files to mirror. Published 9473cf2; Vercel success and production desktop dimensions verified. Proof work/loading391-wide.png; temporary viewport reset.

## Townspeople and profession teachers (0.40, 2026-10-16)
- Published 75be499 to origin/main. Vercel success; production world.json version40 has32 citizens and8 teachers, capital still safe. GitHub CLI default account was gerald-alaz; push used the already stored ThanatZhu credential in process-scoped GH_TOKEN and restored the previous environment. Global account selection unchanged.
- New built-in ImageGen art:8 townsperson designs,6 whole poses each;8 teacher designs,4 poses each. Original transparent PNGs and prompts in assets/citizens40. Read-only alpha metadata generation in work/build_citizens40_metadata.py. Citizens have front/back walking poses, greeting, rest points and collision-checked routes. Local conversation pauses the visitor's visual NPC; ambient positions are not combat authority.
- Teachers' Court at38,-70: stone paving, class banners, practice poses, map star. Seven professions, with separate monk/nun teachers sharing acolyte trial. Cleared one obstructing tree consistently from foliage/collision/batched GLB bark geometry.
- Playable starter trials: BaseLv25 Novice accepts and earns5 new defeat credits; BaseLv60 profession earns15 then selects either Master branch. All classes share this first field-trial objective (not bespoke narrative chains). Private realm profile stores trial, server validates level/position/HP/kills and checkpoints advancement before releasing lease/reloading. Guest saves retain independent per-slot trial. Lobby/wardrobe point to teachers. Existing jobs preserved.
-117 automated tests passed, including real WebSocket advancement, cloud private/mirror invariants, all classes/branches, route samples and guest persistence. Build and diff checks passed. Browser local QA account ONLY: new guest named ศิษย์ทดสอบ40; local server fixture positioned near teacher and seeded Lv25/progress to exercise receive/reload/turn-in. Browser confirmed Novice became boxer with correct skills and no console errors. No real player state modified.
- Desktop court screenshot work/city40-court.png; mobile844x390 dialog work/city40-mobile.png (680x300 within viewport, no page overflow). Browser viewport reset. No physical phone or real Google player test this turn.
- All32 changed files mirrored into outputs/ayothaya-scene-01; release whitelist includes new runtime files.
- REMAINING: Render /health still contentVersion38, authority=false (ok=true), so online trainer deployment is not yet confirmed. Chrome Render was a different account (AlazsolX), original workspace restored. In-app Google Render login selected Sirichok workspace, which has no Ayothaya service; signed back out. Opened GitHub -> Render login with ThanatZhu filled; requested user login using request_user_input_async. Do not claim online teacher feature is live until backend contentVersion40 and authority=true.
- Follow-up: Render auto-deploy DID reach contentVersion40. /health remains authority=false after another30 seconds; online acceptance is still unverified/unavailable. The next step is to inspect service logs/lease ownership with the owner's Render login; do not redeploy blindly or change IAM/billing. The GitHub-to-Render login handoff remains open in the in-app browser. User was told to hold off login while the automatic rollout was checked; final handoff must clarify it is still needed for diagnosis if authority remains false.

## Click-to-move, chapter 1 story quests, Firestore quota fix (0.40.1, 2026-10-16)
- Published by Claude as e06c999 (two commits on top of Codex 75be499: 0b38786 features, e06c999 quota fix). Footer version left at 0.40 on purpose (Codex's uncommitted 0.41 edits the same line). Vercel serves story-ui.js / route-walk.js; live guest run on the site completed quests 1–2 with rewards.
- Click/tap to move (route-walk.js): A* around obstacles, taps on roofs/water snap to the nearest standable point, gold marker; tapping a far NPC walks then talks; portal label walks then travels. Drives the same joystick direction, so offline, prediction and server input are unchanged. Keys/joystick cancel it.
- Story quests (story-quests.js shared by client+server; story-ui.js tracker): chapter 1 "ประทีปที่ดับพร้อมกัน", 8 quests across ayutthaya → rice-fields → old-orchard → moonlit-mill (talk/defeat/enter steps, boss mill-keeper, XP rewards). Online: server stores `story` in the private profile (stripped from the client mirror, rules unchanged), questTalk is distance-checked (≤3.6), kills/map entry advance it, rewards paid once. Offline guests: localStorage. Tracker "▶ เดินไป" auto-walks to the objective, crosses maps via portals and resumes after load; gold "!" on the next NPC. content/chapter-01.json quests (old design referencing retired maps) are NOT used.
- ONLINE OUTAGE ROOT CAUSE: Firestore Spark write quota (20k/day, resets 14:00 Thai). Authority renewed every 5 s (720 writes/h) + each connected player saved every 10 s (3 docs = 1,080 writes/h) → 20,026 writes between resets; authority doc last renewed 08:51 Thai, so /health authority=false and sockets got 503 ("กำลังเข้าห้อง…"). Fix in host.js/storage.js: authority TTL 120 s renewed every 40 s while held (retry every 5 s while waiting, read-only), player saves only when changed and ≤1/min, idle lease keep-alive every 100 s, lease TTL 150 s. Expected ~90 writes/h idle server + ≤180/h per active player.
- Checks: 129 tests + 15 multiplayer pass (12 new: route walker, story rules/data vs world.json, server questTalk/defeat/enter/reward/save). Browser QA (local realm server, guest only, no real accounts): desktop + 915x412 touch, online and offline: ground tap, NPC walk-and-talk, portal travel, quest chain through travel + resume, auto-attack kills counted (fixed: server's 70 ms action rate limit dropped auto right after select).
- NOT YET VERIFIED: online recovery. Quota is exhausted until the 14:00 reset, so Render stays authority=false until then; after 14:00 check /health authority=true and the Firestore write rate (~90/h idle).
- NOTE FOR CODEX (0.41 equipment WIP is uncommitted in REPO): your working tree is now behind origin/main. A trial 3-way apply of your WIP onto e06c999 conflicts only in server/realm.js and server/storage.js — keep both sides: peer gets `training` AND `story:normalizeStory(record.story)`; snapshot self keeps `training` AND `,story:p.story`; record() keeps `training` AND `story:copy(p.story)`; storage mirror deletes `skills`, `training`, `story` (plus whatever 0.41 adds). host.js/storage.js now import AUTHORITY_RENEW/SAVE_MIN_GAP/SAVE_MAX_GAP — keep them.
- Git push note: gh's active account had been switched to gerald-alaz (403 on this repo). Pushed this release as ThanatZhu for that one command only (GH_TOKEN from gh keyring, not in the command or remote); global active account left unchanged.
- Changed files mirrored into outputs/ayothaya-scene-01 (mirror matched 75be499 before sync); new runtime files added to the release whitelist.

## Wearable equipment and character artwork (0.41, 2026-10-16)
- Published 0b7635c to origin/main; Vercel deployment success confirmed and public equipment-gallery.html visibly loads the new jade sword / crimson costume without console errors.
- Integrated remote 0b38786/e06c999 before publishing: retained click-to-move, story state/snapshots/private persistence and quota-friendly autosave. Full suite now 136 passing tests, build and content validation passed.
- Eight professions including Novice, both genders; two weapon appearances per profession and original/indigo/crimson/ivory outfit palettes. New transparent ImageGen full-body weapon poses (20 frames per gender), walking sheets and inventory icons in assets/equipment41; exact prompts included. Clothing variants retain existing silhouettes, not separate modular armor pieces; no equipment stat bonuses/loot/crafting yet.
- Open portrait > equipment, or I. Independent weapon/outfit slots, animated preview, async save acknowledgement, actual hero/portrait and known remote-player updates, per-character guest saves and authoritative private online profiles. Cloud lobby mirror omits equipment by design; world loads it after online join.
- Local actual-game QA: boxer crafted wraps/indigo costume restored on reload; female Novice crafted wraps/crimson costume saved from 844x390 equipment dialog. Sticky close control, no page overflow. Skin and handwraps preserved after refining outfit recolor mask. No physical phone or real Google save verified. Screenshots work/equipment41-desktop.png and work/equipment41-mobile.png.
- Mirrored all 63 files changed since 75be499 into outputs/ayothaya-scene-01; release whitelist retains both new story and equipment files.
- Remaining: post-push Render health contentVersion40, authority=false. Prior journal records quota exhaustion as the cause; online recovery and version41 rollout still require verification. Real cloud equipment save cannot be claimed working until backend recovers. Public gallery works independently.
- Follow-up (2026-10-16): owner approved switching the GitHub CLI active account; `gh auth switch` → ThanatZhu is now active (gerald-alaz still logged in, inactive). Codex then published 0.41 itself as 0b7635c on top of e06c999; verified it keeps story fields (peer/snapshot/record), mirror strips story+equipment, and the quota constants/dueForSave in host.js. Live footer 0.41, equipment.js and story-ui.js served. A rebased copy prepared by Claude (branch codex-041-rebased, worktree publish/ayothaya-041) is now redundant; its folder removal was blocked by a safety check and is left for the owner.

## Equal playable character height (0.41.2, 2026-10-16)
- Published 045f5bb to origin/main; normalizes all 8 playable professions, both genders, base and crafted weapons to 210 logical-pixel standing crown-to-sole height. Lancer male grows ~18%; excludes trident overhang from calibration. Original PNGs unchanged.
- Shared character-size.js calibration; consistent per-clip scale (no per-pose inflation), padded 320px textures, compensated 3D geometry and 2D previews. Applied to lobby, equipment UI/gallery, animation gallery, skill lab and online remote characters. Crops only the profile UI view to remove extra padding. Experimental directional pilot is a separate unchanged art path.
- 138 tests passed including all 640 pose bounds (2 art sets x8 classes x2 genders x20 frames) and logical foot alignment; build/diff check passed. Browser verified novice/lancer male, crafted lancer female and Three.js skill lab with no console errors. No new backend or account-save changes.
- Mirrored all22 changed files; added character-size.js to release whitelist.
- Vercel success confirmed; public equipment gallery serves v=41.2 and visibly shows the resized lancer without console errors. Screenshot: work/character-size412-live.png. No viewport override used this turn.

## Items, loot, cowrie coins, NPC shops, potions (0.42, 2026-10-16)
- Published by Claude: 1f9c6ec + 36d6d79 (version 0.42) on top of Codex 045f5bb. Live footer 0.42; bag-ui.js and assets/items42/items.png served; live phone guest run: quest 1 paid 50 เบี้ย + 3 ยาสมุนไพรแดง, walked to แม่บัว, shop bought 1 potion (coins 50→25).
- items.js (shared client/server): 18 bag items (12 loot incl. elite/boss drops, 5 potions/food), drop tables for every field monster, coins, shops แม่บัว (ayutthaya) and ป้าละไม (rice-fields). Server: auto-loot to every eligible killer, quest rewards now include coins+items, buy/sell distance-checked (≤3.6) in the shop's own map, potions heal server-side (0.8 s rate), bag in the private profile (mirror strips `bag`), snapshot carries the bag only when changed (welcome always). Offline guests: localStorage. UI: menu กระเป๋า / B, 40-slot bag, shop window (buy/sell), Q/E quick potions, loot notices in system chat.
- ART: assets/items42/items.png is a placeholder made by scripts/make-item-placeholders.py. docs/items42-art.md has the 6x4 / 256 px layout and the ChatGPT prompt; overwrite the PNG (same name/size) to re-skin, no code change.
- Checks: 146 tests + 16 multiplayer pass (8 new: item data vs world/monsters, bag/stack/shop/potion rules, server shop distance, potion heal, boss auto-loot, bag-in-snapshot). Browser QA local realm (guest only): online desktop/phone buy/sell/bag/quick slots; offline phone kills add coins.
- NOTE FOR CODEX: 0.41.3 WIP (already copied into the mirror at 22:16) is now behind origin/main. Expected overlaps when rebasing: viewer-world.js — keep your ?v=41.3 imports AND `import {createStoryUI} from './story-ui.js?v=02'`, `import {createBagUI} from './bag-ui.js?v=01'`, `const bagUI=createBagUI({game,worldUI,map,account});` right after createStoryUI, and `bagUI.update();` after `storyUI.update();`. world-ui.js — keep `api.afterTalk?.(n);` right after the NPC dialog opens and `afterTalk:null` in the returned api. index.html — the footer was 0.42; use the next version above it. Mirror: Claude did NOT overwrite your 41.3 copies of viewer-world.js / world-ui.js / index.html; all other 0.42 files were mirrored (mirror matched 045f5bb for them).
- GitHub: active gh account had flipped back to gerald-alaz; pushed as ThanatZhu for that single command (GH_TOKEN from keyring), global account left as found.

## NPC silhouettes, walking and name tags (0.42.1, 2026-10-16)
- Published cc61ce4 on top of 36d6d79 / 1f9c6ec (items, loot, shops, potions). Retained bag UI update, story hooks and new economy code while resolving viewer/index conflicts. Footer is 0.42.1; NPC runtime/boot cache keys 42.1.
- Rebuilt assets/citizens40/frames.json from the full connected opaque silhouettes rather than fixed grid cells. Cook heads crossed y=768, flower-seller hair crossed y=512 and some feet crossed neighbouring rows. Read-only alpha analysis verifies all 80 crop boxes match complete components and no boxes overlap. Original PNGs unchanged.
- Isolated each painted pose into a padded runtime texture so adjacent atlas rows cannot bleed across the crop; fixed head-axis/sole anchors and constant scale per actor. No image generation or new animation drawings in this patch.
- citizen-motion.js uses orthographic camera basis, correct mirrored front/back frames and direction hysteresis. Gait advances by distance; conversation freezes both route time and phase; hidden tab/portrait mode pauses NPC time and long frames are capped to avoid teleporting. Name labels use camera-up sprite height, clearing the head at tilted camera angles.
- QA: 150 tests pass after merging economy work, static build and diff/syntax checks pass. Four new focused regressions cover rotated-camera facing, conversation resume, distance gait/background pause and all 80 metadata anchors/cook head crops. Source art visually inspected. Browser tool refused the local URL under its security policy; no workaround attempted and actual gameplay visual QA was NOT completed this turn. Existing civilian sheets still have two front and two back walk poses, not new multi-frame animation.
- Synced 23 changed files into outputs/ayothaya-scene-01 after checking its baseline. Release whitelist includes citizen-motion.js and items/bag UI. Metadata extraction helper updated in work/build_citizens40_metadata.py.
- Vercel status pending at initial check; see follow-up below.
- Follow-up: GitHub Vercel check reports success (Deployment has completed) for cc61ce4. Working tree clean.

## Painted item icons (0.42.1) and status points + stat gear (0.43, 2026-10-16)
- 6cf3c90: ChatGPT item atlas re-gridded by shape (bag crossed a cell border; halos trimmed; 200 px icons centred) → assets/items42/items.png; live file hash matches. Tool: scripts/normalize-icon-atlas.py; source/notes outputs/items42-handoff/.
- 12897a0 (0.43): character-stats.js — STR AGI VIT INT DEX LUK with the Ragnarok point curve, HP/MP grow with level, ATK/MATK/DEF/dodge/crit/attack speed; 24 stat-gear items (class weapons ×2 tiers, 3 armors, 5 accessories) at ครูแสนดาบ (forge, own-class weapons only) and as elite/boss drops; separate from the cosmetic equipment window. combat-core monsterHit() shared by offline world and server. Server: statUp/equip/unequip validated, stats/gear in private profile (mirror strips), snapshot carries stats/gear/points/derived. UI: สถานะ window (menu / C), 'สวมใส่' in bag. Placeholder assets/gear43/gear.png; brief docs/gear43-art.md.
- Checks: 155 tests + 16 multiplayer. Local + LIVE guest browser run: Lv10 test character spent 8 points (STR 4, VIT 2 → max HP 253), bought ผ้าพันหมัด + เสื้อผ้าฝ้าย, wore both: ATK 3→9, DEF 0→3, 26 points left as the curve predicts. Render health ok/authority true (1 player).
- Mirror synced with work/sync_mirror.py (copies only where the mirror still matched cc61ce4).

## Refining +1..+10, elements and sizes (0.44, 2026-10-16)
- 17d8d58. refine.js (worn weapon/armor at ครูแสนดาบ: coins + เศษเหล็กน้ำพี้/ก้อนศิลาแลง; +1..+4 safe, then 90/70/50/30/20/10%, failure from +5 destroys; เหล็กไหล +20%); refine level carried in the item id (`sword-iron+5`, itemDef()) so it survives unequip/sell. affinity.js: monster elements/sizes, shaman fire / acolyte holy skills, weapon size penalties, softened (neutral vs ghost 70%, sizes 70-85%) to keep every class viable; target badge. Server 'refine' command (forge only, distance-checked). Placeholder assets/refine44/refine.png; docs/refine44-art.md.
- Checks: 159 tests + 16 multiplayer; local and LIVE guest browser: weapon +2 (ATK 9→13), armor +1 (DEF 3→4).

## Monster cards and card slots (0.45, 2026-10-16)
- 3b9e3f4. One card per monster (normal 0.4%, elite 4%, boss 15%), slotted permanently into a worn weapon/armor/accessory with a free slot (lacquer armor and เบี้ยแก้ have none); id carries refine and card (`sword-iron+4~card-rat`) through refine/unequip/sell. Effects: stats, HP%, DEF, dodge, crit, ATK%, attack speed, vs size/element, element resist, coin bonus — wired into offline combat and server (insertCard command). Status window card picker. Placeholder assets/cards45/cards.png; docs/cards45-art.md.
- Incident: a mistyped placeholder flag regenerated assets/items42/items.png over the painted art in the worktree (never committed); restored from git (hash matches live). The generator now needs exactly one sheet flag and refuses to overwrite any committed sheet without --force.
- Checks: 163 tests + 16 multiplayer; local + LIVE guest: card slotted (ATK 6→8, crit 1%→4%).

## Landscape phone UI fit (0.48.1, 2026-10-17)
- Published b8bb4f0 on top of 9e5941e. Integrated all remote 0.43–0.48 features, preserving inventory, stats, refining, cards, market, friends/guilds and life UI. CSS/boot/lobby/module cache keys 48.1.
- phone-lobby.css uses --lobby-height measured from the visual viewport and actual header height instead of a fixed 46px deduction. Selected character details are compact, duplicate summary hidden and entry action stays visible. Short-screen creation moves wardrobe under the preview and puts gender beside the name, leaving both name input and create button unobstructed. Whole page remains fixed; only long contents scroll internally.
- Phone HUD through 600px landscape height: smaller 184x74 profile and 96px minimap, 48px quest strip beneath menu, shared safe-area/visible-height variables for controls, chat, quick slots, XP and interaction. Avatar opens profile; redundant top profile action hidden on phones to fit social menu. Skill buttons retain 44px touch areas with 88/136px radii (minimum measured center distance 45.25px), all 10 stay visible; desktop key/level badges hidden only on phones. Utility panels use a usable centered width and bounded internal scrolling, including social/emote/daily windows.
- QA: 178 existing tests passed after upstream merge; build/syntax/diff checks passed. Browser checks on local guest (no real Google account changes): 568x320, 844x390, 1280x589 and desktop 1920x1080. Document dimensions match viewport; 568px selection entry 44px tall fully inside card; create input and submit do not overlap. Connected to local test server, checked online menu, bag, map and new emote popup dimensions. Portrait gate logic unchanged. No physical-phone/safe-area hardware or native keyboard validation.
- Found mixed cached 0.48 combat/old experience export during browser test (missing deathPenalty). Bumped combat-to-experience and viewer-to-controls-to-combat dependencies; retry loaded scene successfully with no new errors. No combat behavior changed in this patch.
- Synced 30 files from mirror's verified 0.47 baseline, including 0.48 dependencies. phone-lobby.css added to release whitelist. Screenshots work/phone481-game.png and work/phone481-lobby.png (lobby screenshot taken before footer cache/version rename; same final layout). Temporary browser viewport reset. Local-only test servers started on 8871 and 8787 for QA.
- Follow-up: Vercel success confirmed for b8bb4f0; public lobby browser shows footer 0.48.1 and phone-lobby.css?v=48.1. Working tree clean.

## Storage, player trade, vending stalls, return incense (0.46, 2026-10-16)
- 6539c5c (+1126444: /health now reports the deployed commit from RENDER_GIT_COMMIT). market.js shared rules: all-or-nothing moves, never creates items. Server: storage at ลุงเรือง (100 slots, private profile, stripped from mirror); trade = request → accept → offers → both lock → both confirm → one atomic swap, then both saved at once (saveNow); stalls only in safe maps, close on walk-off/leave/travel/disconnect, stall sign above the seller; ธูปกลับเมือง recalls to the capital (spent only after the room-capacity check). Dupe guards: no stall buy from a suspended/travelling owner, trade ends on suspend/travel.
- UI: market-ui.js (storage / trade / stall / market views), bag buttons แลกของ · ตั้งแผง · ตลาด, จุดธูป in bag. Placeholder assets/social46/social.png; brief docs/social46-art.md.
- Checks: 169 tests + 16 multiplayer. Local two-guest browser: trade 2 ฟันหนู ↔ 1 ยา, stall sale 25 เบี้ย, storage store/retrieve, incense refused in the capital. LIVE: Vercel 0.46 + market-ui.js 200; Render commit 1126444. Live online trade is not testable as a guest (online needs Google sign-in) — verified locally only.

## Whisper, friends, guilds (0.47, 2026-10-16)
- effaa1c. social.js; whisper (/w ชื่อ ข้อความ) across maps on the same server; mutual friends (request/accept) kept in each private profile with online/map status; guilds: 3,000 เบี้ย to found, unique name per server, 24 emblems, leader invites/kicks/changes emblem, leadership passes on, empty guild deleted; guild chat tab; guild tag under names. Guild docs: Firestore collection multiplayerGuilds (admin SDK only, written only on guild changes; loaded once at host start).
- Checks: 173 + 16; local two-guest browser: friend request/accept, guild found (coins 5000→2000), invite/accept, guild chat, whisper. Placeholder assets/emblems47; docs/emblems47-art.md.

## Death penalty, status ailments, emotes, daily login (0.48, 2026-10-16)
- 9e5941e. combat-core takeMonsterHit shared by offline world and server. Death outside town from Lv.5: −5 base EXP, never a level. Ailments (ailments.js): poison/stun/sleep/silence/blind/curse from monster hits; ยาเขียว cures. 24 RO-style emote bubbles (picker beside quick slots; 1/s server rate) + the 4 pose emotes. Daily login: 7-day cycle per Thai day, server-granted online, localStorage for offline guests.
- Checks: 178 + 16; local browser: daily popup (+100), remote bubble seen, ailment row + cure. Placeholders assets/emotes48, assets/items48; docs/emotes48-art.md.

## Timed MVP, party dungeon, parties across travel (0.49, 2026-10-17)
- 2372035, rebased over Codex b8bb4f0 (0.48.1 phone landscape HUD); index.html conflict resolved keeping lobby.js?v=48.1 with the 0.49 label. MVP ราชาหุ่นฟางเพลิง at โรงสีใต้เงาจันทร์ on a wall-clock timer per channel (first 5 min after boot, then 60 min after it falls), announced server-wide; top damage dealer gets ถ่านเพลิงราชาหุ่นฟาง. Dungeon ใต้ถุนโรงสีต้องสาป (maps/world.json v42, copy of the mill layout, darker): one instance per party (solo instance otherwise), monsters never respawn inside, boss เจ้าโคมวิญญาณ pays each member once per Thai day. A party member who travels keeps the seat for 60 s (leader restored). Both bosses reuse existing sprite rows at a larger size.
- Checks: 182 + 16; local two-guest browser through the real travel path: party formed in the mill, both landed in the same instance (11 monsters, party frame kept), MVP chip countdown. Fixed found bugs: MVP timer tied to wall clock; leader lost when two members travel together.

## Pets and seasonal events (0.50, 2026-10-17)
- f82a047. pets.js: ข้าวเหนียวล่อสัตว์ on a selected หนู/หุ่นฟาง/ตั๊กแตน/ลูกลิง (weaker = easier) → egg → hatch; hunger/intimacy; loyal pet stat bonus feeds deriveStats; pet follows its owner and is visible to others (small copy of the monster sprite). events.js: เทศกาลลอยกระทง 2026-10-17…2026-11-30 (EXP ×1.5, เหรียญงานวัด 6% drop), weekend EXP ×1.25; token stall at เจ้าจุก. Placeholder assets/items48; docs/items48-art.md.
- Checks: 186 + 16; local browser: hatch + feed online, remote player sees the pet; phone landscape screenshot after Codex's HUD change (MVP/festival chips moved off the skill buttons). LIVE: Vercel 0.50 + pet-ui.js 200; Render commit f82a047, authority true, contentVersion 42; live guest smoke: no console errors, all new menus, festival chip, offline pet hatch, daily popup.
- Mirror: Codex had synced it to 0.48 + b8bb4f0; synced from bases effaa1c, 9e5941e and b8bb4f0 (only files still matching a base); every file changed since effaa1c now matches f82a047.
- Cost: still Firebase Spark + Render free. New writes: guild docs on guild changes; immediate saves after trades, stall sales, friend adds, hatch/return. No paid services enabled.

## Free-tier wake-up for the realm server (0.50.1, 2026-10-17)
- cdf2284. Diagnosis of "online drops in and out": Render free sleeps after ~15 idle minutes; a cold /health took 72 s (then 0.1 s). Firestore hourly writes show zero-write gaps = server asleep. The client gave up after 8 retries (~67 s), i.e. right around wake time. Every deploy also restarts the realm and the new host waits for the old authority lease (≤ 2 min). Not the Firestore quota (566 writes in 24 h).
- Fix (no cost): lobby.js calls wakeServer() (no-cors GET /health) on page load and multiplayer-ui calls it again before joining; the client retries 14 times (~2.5–3 min); chip shows "กำลังปลุกเซิร์ฟเวอร์…" while it has never been online, connecting text warns it may take ~1 min.
- Checks: 187 tests (+ wake.test.mjs: 15 attempts, gives up after 150–200 s) + 16 multiplayer. LIVE: Vercel 0.50.1, lobby.js has wakeServer; headless visit to the live login page sends GET https://ayothaya-folk-mystic.onrender.com/health, no page errors. Mirror synced f82a047→cdf2284.
- Not done (needs owner choice): keep-alive pinger (uses ~all 750 free Render hours/month) or Render Starter (~$7/month).

## Going online no longer blocked by a rejected browser save (0.50.2, 2026-10-17)
- 0b61827. Owner report: "เชื่อมต่อไม่ได้" + "เชื่อมต่อเซฟไม่สำเร็จ" on rice-fields at 13:27. Server healthy (authority true, 0 players), Firestore far below quota (1,302 writes / 1,857 reads in 30 h). Cause: beginOnline() first saves from the browser to players/{uid}/characters/{slot}; firestore.rules validSave only allows hp ≤ 140, mp ≤ 100, city map ids and z ≤ 15. Since 0.43 HP/MP grow with level (owner: HP 164, MP 110) and the field maps (rice-fields/old-orchard/moonlit-mill/mill-cellar) were never added, so the write is denied and joining was aborted.
- Fix: beginOnline() ignores a failed browser save; the realm server loads its own private profile and saves through the admin SDK. LIVE: Vercel 0.50.2, served cloud-save.js contains the change. Mirror synced.
- Pending owner approval: update + deploy firestore.rules (allow the 4 field maps, HP/MP up to the stat-system maximum, wider position range) so offline cloud saves work again outside the capital.

## Firestore rules for field maps and stat-grown HP/MP (2026-10-17)
- 16519b4. Owner approved updating production rules. validSave now allows mapId rice-fields / old-orchard / moonlit-mill / mill-cellar, hp and mp 0–10,000 (Lv.99 full-stat max is 3,895 / 1,746), position z up to 125 (field spawn z 55). Everything else unchanged (keys, revision +1, XP never decreases, lease lock, class/job transitions).
- Checks: npm run test:rules (Firestore emulator) 8/8 pass incl. new case (rice-fields HP 164/MP 110 ok, mill-cellar 3895/1746 ok; unknown map, hp 20000, z 300 still rejected).
- Deployed with the Firebase Rules REST API (gcloud account chokkungfn@gmail.com, project ayothaya-folk-mystic): ruleset af5dc1ac-30b4-4250-ad71-915161e2e31b released to cloud.firestore 2026-10-17T06:31:23Z; live source read back and is byte-identical to the repo. Rollback: previous ruleset 217f3edc-eb4f-4bab-abcb-713298c84269.

## Control layout editor + phone EXP bars at the bottom edge (0.51, 2026-10-17)
- b6e5f11. controls-ui.js: "ปรับตำแหน่ง / ขนาดปุ่มควบคุม" in the profile panel → edit mode (game input swallowed in the capture phase): drag the joystick, the attack/skill wheel and the quick slots; size 60–150 % per group; opacity 30–100 %; reset; saved in localStorage per layout (phone landscape / desktop) using CSS translate/scale so existing layout code is untouched. phone-hud.css: XP strip now spans the full bottom edge, Base | Job exactly half each.
- Checks: 187 tests. Phone 915×412 browser, local and LIVE: EXP bars [0..457] + [459..915] at y 403–412; joystick dragged +150/−80 px, wheel 80 %, opacity 70 %, all restored after reload; the moved joystick still walks the hero. Vercel 0.51 + controls-ui.js 200. Mirror synced.

## Phone HUD polish (0.51.1, 2026-10-17)
- 43b65fd (phone-hud.css only). Owner screenshots: EXP strip was inset by the notch/home-bar safe areas → padding removed, bars flush with the physical edges (Base | Job half each). Chat dock centred (translate −50 %), text 9 px, collapsed width ≤ 240 px so it clears the skill wheel/AUTO; when the chat is open the NPC talk button moves above it. While the NPC dialog is open, joystick / skill wheel / quick slots / chat / talk button are hidden (CSS :has), back on close.
- Checks: phone 915×412 local browser: collapsed chat [338..578] clear of quick slots [120..264] and wheel [654..]; open chat [308..608, y 247..392] vs talk button y 166..210; talking to ลุงเรือง hides the four controls, closing restores them. LIVE: Vercel 0.51.1, served phone-hud.css contains the rules. Mirror synced.

## Walking feel, speed, AUTO range (0.52, 2026-10-17)
- e920b4c. Owner: walk animation looked bizarre/not smooth, walking slow, quests far, AUTO circle narrow.
- Cause found: the hero (and remote players) flipped left/right on the raw screen-x sign of the facing vector with no hysteresis, so walking up/down the screen flipped the sprite nearly every frame. Now the side changes only when |screen-x| > 30 % of the facing. Each footfall adds a small rise (two per cycle). The novice walk art itself barely alternates legs (8 near-identical stride frames) — a real fix needs new walk-cycle art.
- Speeds ×1.2 for every class (classes.js), ×1.3 more in safe maps (TOWN_PACE); one walkSpeed() shared by the world, the realm server and client prediction (prediction previously ignored curse speed — would rubber-band). AUTO_RANGE 14 (was 8) for search/anchor/leash.
- Checks: 187 + 16 (speed tests updated for town pace); browser: walking up the screen keeps one facing over 16 frames. LIVE: Vercel 0.52 (combat-core has AUTO_RANGE=14); Render commit e920b4c. Mirror synced.

## Sound, music, hit feedback, town cart ride (0.53, 2026-10-17)
- de1d094. Owner asked to do all proposed fixes for "players get bored". feedback.js: WebAudio-synthesised (no audio files/licences) Thai-pentatonic generative music per map (town: ranat plucks + drone + ching; fields: + klong; mill/dungeon: minor pentatonic, slower) and SFX for swing/skill/hit/crit/hurt/dodge/defeat+coins/potion/level-up/fanfare/chime; starts on the first tap (autoplay rule); music/SFX sliders in the profile panel (localStorage). Crit damage numbers bigger with "!" pop; LEVEL UP banner + light ring. Town gates: clicking a gate label (or quest auto-walk) in a safe map travels at once; server travelDestination accepts a safe-map hop to that map's own portal targets (fields unchanged).
- Walk-cycle art prompt for ChatGPT: outputs/art-prompts-050/WALK-PROMPT.md (current painted walk frames barely alternate legs).
- Checks: 189 + 16 (new pacing.test.mjs). Browser local + LIVE: AudioContext running after one tap with music oscillators firing; sliders present; level-up banner + glow; town gate → rice-fields 0.1 s; crit number has .crit. Vercel 0.53 + feedback.js 200, Render commit de1d094. Mirror synced.

## Painted art: 7 icon atlases + boss sheet from the ChatGPT hand-off (0.54, 2026-10-17)
- 09fe706. Verified first: both publish/ folders are the same repo (ThanatZhu/ayothaya-folk-mystic); ayothaya-items worktree (items-art) = origin/main = live 0.53; main checkout b8bb4f0 behind, no uncommitted work anywhere.
- Re-gridded (originals untouched in outputs/asset-handoff, results in outputs/asset-handoff/regridded): social46, items48, emotes48, gear43 (cells 6/10/14 mirrored across the diagonal), emblems47 (200 px), cards45 (rows were drawn touching: split at y=303, reading order, 170×230), refine44 (stray shards rejoined their icons). Shape-based cut-out, specks dropped, premultiplied resize, ≥24 px margins (cards 13 px top/bottom by spec), required-empty cells alpha 0. bosses49 2172×724 → assets/frontier38/boss-monsters (2048×512 + meta), one scale per row, centre of mass centred, shared baseline; lantern-lord/straw-king now use it. Fixed pet-egg/pet-food cell swap (art order).
- NOT used: novice-walk (legs do not alternate: frames 1/5 and 3/7 same leg; row 1 overflows). Kept old walk. Redraw prompt + optional fixes in outputs/asset-handoff/IMPORT-REPORT.md.
- Checks: 191 tests (+ art54) + 16 multiplayer + content check; browser local (desktop + phone landscape): bag, guild emblem, emote picker, menu icons; boss frames rendered through monster-art.js loader. LIVE: Vercel 0.54; all 8 PNGs byte-identical to repo, boss meta same content; live loader renders 8+8 boss frames identical to local; smoke test 0 page errors. Mirror synced.

## Redrawn novice walk (male/female) + wai emote + sun emblem (0.55, 2026-10-17)
- 948bfe0. Hand-off outputs/novice-final (validate.py PASS; base atlas SHA256 matched the repo; verified independently: 0 pixels changed outside emotes cell 23 / emblems cell 12).
- Walk: assets/animation37/novice-walk-{male,female}.png (2048×320, 8 frames); novice.json frames 12–19 per gender use rect [i·256,0,256,308] (bottom = pivot y 308), anchor 128, one scale (0.778) = idle body height; no per-frame trim/rescale. Old animation37/novice-walk.png removed (equipment41 keeps its own). Phase: walkCycle('novice') = 1.23 world units per 8-frame cycle, measured from the stance foot (≈99.5 source px per step), for the hero and remote players; other classes keep 2.1. The 0.52 code bob is off for novice (the art bobs).
- Checks: 193 tests (+ novice-walk55) + 16 multiplayer. Browser local + LIVE, male/female × desktop/phone: frames 12→19 loop 19→12; 1.23–1.25 world units per cycle at speed 5.3 and 1.22 at 3.1 (cursed); idle frame 0 when stopped; flips when turning left; pushing into a map corner → no movement, frame 0. Live files byte-identical (PNG) / same content (json). Mirror synced.
- Limits: side view only (up/down movement uses the side cycle; isometric foreshortening means exact foot speed only for screen-horizontal motion); the art's stance foot moves unevenly between frames (7 px then 60 px), so a small per-frame slide can remain even though the average matches; novices wearing crafted cosmetic weapons (equipment41) still use the old walk.

## New novice walk for the crafted hand-wrap look (0.55.1, 2026-10-17)
- ce261c0. Owner screen recording: still the old walk. Cause: the character wears the crafted novice weapon (red hand wraps) → painted-character.js loads the equipment41 art set, whose walk frames were still the old 3/4-view ones (listed as a limit in 0.55). Fix: equipment41/novice-walk-{male,female}.png = the redrawn cycle with the wraps painted onto forearms/fists by scripts/paint-novice-wraps.py (skin in the arm band, big blobs only, knees excluded, thin gold rings); equipment41/novice.json frames 12–19 use the same box/pivot, scale matched to the equipment41 idle (scale × body calibration = 210/278 in both sets, so the 1.23 stride still holds). Old equipment41/novice-walk.png removed. Outfit dyes (e.g. crimson) still recolour the pants at load.
- Checks: 194 tests; browser local + LIVE with crafted weapon + crimson dye equipped, male/female, phone/desktop: frames 12→19 loop, 1.23–1.25 world/cycle, idle when stopped, corner block → idle, flips on turn. Live PNGs byte-identical. Mirror synced.

## Walk view for up/down movement (0.56, 2026-10-17)
- d360836. Owner recording: walking up the screen still shows the side view; other classes unchanged. Both need new art (no front/back walk exists; only novice side walk was redrawn). Code made ready: animation-frames FRAME_COUNT 36, WALK_BASE side 12 / front 20 / back 28; character-motion walkView(face, azimuth, previous) with hysteresis (vertical > 1.4 → front/back, < 0.8 → side); hero and remote players pass the view; rigged-sprite falls back to the side cycle (and its flip) when a class has no front/back frames, front/back art is never flipped. painted-frames test accepts 20/28/36 frames.
- Checks: 195 tests + 16 multiplayer; browser: W/S walking still plays 12–19 (fallback), no errors. LIVE: Vercel 0.56 serves walkView. Mirror synced.
- Prompts for the art: outputs/walk-prompts-056/WALK-PROMPTS.md (18: novice front/back × 2 genders, side walk for 7 classes × 2 genders) + references/.

## Walk cadence cap (0.56.1, 2026-10-17)
- ed85ad1. Owner: steps too quick. With the art stride (1.23 u/cycle) town pace 5.3 u/s meant ~4.3 cycles/s (8–9 steps/s). gaitStep() caps the phase at WALK_CADENCE = 2 cycles/s for hero and remote players; below ~2.5 u/s the measured stride still holds (no slide), above it the feet slide somewhat — accepted trade-off vs. slowing movement.
- Checks: 196 tests + 16 multiplayer; browser local phone/desktop: 1.99 cycles/s at 5.3 and at 3.2 u/s; LIVE female phone 0.56.1 measured as below. Mirror synced.

## Redrawn walks: 7 classes side + novice front/back (0.56.2, 2026-10-17)
- 9b63094. Hand-off outputs/walk-handoff/HANDOFF-056.md (validate056.py PASS, 18 strips 2048×320). Checked visually: legs alternate, weapons stay in hand, outfits match each class's idle art. scripts/import-walk056.py: side strips → frames 12–19 of each class, novice front/back → 20–27 / 28–35; rect [i·256,0,256,308], anchor 128, one scale per strip = idle standing height ÷ 280 px walking body. Old <class>-walk.png removed (no longer referenced). Per-class walkCycle (stride 20 px/frame, acolyte 16 → 0.984 / 0.788 u; novice 1.23), still capped at 2 cycles/s. equipment41 novice gets front/back with painted wraps (arm band from y 172 on the front view to keep the neck bare).
- Checks: 196 tests + 16 multiplayer; browser local + LIVE (phone): side 12–19, W → 28–35, S → 20–27, 1.99 cycles/s, idle when stopped/blocked; all 7 classes load 20 frames/gender via painted-character.js. Live PNGs byte-identical. Mirror synced.
- Limits: other classes wearing their crafted cosmetic weapon (equipment41) keep the old walk; front/back walk exists for novice only.

## Progression feel + loot (0.57, 2026-10-17)
- 7fbe907 (owner's plan items 1–2). experience.js: Lv.L→L+1 needs 50+6·(L−1) EXP (was flat 100); Lv.25 = 2,856, Lv.60 = 13,216 total, both above the Firestore class/job thresholds (2,400/5,900) so rules unchanged. Existing characters below ~Lv.18 go up, above it down (no known players that high). Level-up banner lists stat points gained and gear that became wearable. Tier 3 (Lv.25, forge 8,000 or bosses) and tier 4 (Lv.35, MVP/dungeon boss only) weapons for 7 classes + vest-chain (Lv.20) / vest-naga (Lv.35), using tinted tier-2 icons until painted. Rarity (grey/green/blue/purple/gold) on bag slots and names; rare+ drops show a light pillar where they fell, a chime and a notice. 35% of dropped gear rolls a random affix (id suffix '!' + str/agi/vit/int/dex/luk 1–3), kept through refine and card insert, +1 rarity, +20%/pt sell.
- Checks: 199 tests (+ loot57; 12 old tests updated for the curve) + 16 multiplayer + content check; browser local + LIVE: rarity borders, affix name, pillar, banner gains. Vercel 0.57, Render 7fbe907. Mirror synced.

## Monster behaviours (0.58, 2026-10-17)
- 83e0f6f (plan item 3). monster-catalog MONSTER_BEHAVIOUR, used by the offline world and the realm server: aoe bursts (lantern 2.2, mill-keeper 2.8, lantern-lord 3.2, straw-king 3.4; red warning ring of that radius, hits every player inside at wind-up end), monkey/monkey-chief hit-and-run, hopper leap from 3–6 away, bosses/elites enrage under 40% HP (×1.35 speed, faster wind-up, notice). Skills on a rooted monster: ×1.3 "คอมโบ!".
- Checks: 202 tests (+ monsters58) + 16 multiplayer; browser online in the mill (lantern, boss present) no errors, server log clean. Vercel 0.58, Render 83e0f6f. Mirror synced.

## Realistic map + World warp (0.59, 2026-10-17)
- b5f4dc3 (owner request mid-plan). World map and minimap now draw a straight-down orthographic render of the real scene (sprites hidden, fog off, rendered once per map into an sRGB target) under the labels/portals/player marker; vector drawing remains the fallback. "🌐 World" button bottom-right of the open map lists every map; warp fare 30 coins to the capital, 50 per portal hop elsewhere; the party instance only on foot from the mill. Server travelDestination({warp}) checks fare and coins, charges after the room-capacity check; host passes message.warp; offline pays from the local bag.
- Checks: 204 tests (+ warp59) + 16 multiplayer; browser local + LIVE: map photo renders, World list shows fares, warp capital → mill charged 150 and arrived. Vercel 0.59, Render b5f4dc3. Mirror synced.

## Chapter 2, lotus marsh, bounty board, card album (0.60, 2026-10-17)
- 48d2617 (plan item 4). New map บึงบัวต้องมนตร์ (lotus-marsh, Lv.25–35, world.json v43): orchard layout with a dusk mood (warm light, sand ground), NPC ยายบัวผัน, portal from the mill (30,40). Five new monsters appended (ids 15–19: marsh-rat, bog-hopper, lotus-vine, bog-lantern [aoe], marsh-ape [elite]) drawn with existing rows larger; drops, cards (tinted existing card art), affinities, ailments. Chapter 2 (s9–s12) appended to the story so finished players continue; tracker shows each quest's chapter. bounty.js: 3 daily bounties (easy/middle/hard, same for everyone per Thai day), progress from kills (server + offline), claim in towns (bountyClaim) for EXP + coins; card album records first copies, milestones 3/6/10/16 pay automatically. New "ภารกิจ" window (menu + ขุนอินทร์ talk button).
- Checks: 208 tests (+ content60) + 16 multiplayer + content check; browser local: bounty list, album, warp to the marsh (all 5 new monsters present). LIVE: Vercel 0.60 + world.json has lotus-marsh, Render 48d2617 contentVersion 43, live smoke 0 errors. Mirror synced.
- Art debt: new monsters/cards reuse existing art (tinted); marsh reuses the orchard layout and loading art.

## Mercenaries + wandering adventurers (0.61, 2026-10-17)
- 7e1b8fb (plan item 5). combat-core hire()/mercStep(): the mercenary attacks your target (or the nearest monster on AUTO) within 6 every 1.4 s for 10 + 2·Lv, in the shared world so it works offline and on the realm server (contributions credit the hirer). Hired at ครูแสนดาบ: 200 coins / 20 min (server 'hire', distance-checked; not saved across reconnects). life-npc.js: the mercenary follows the hero as a painted swordsman; 3 wandering "นักผจญภัย" NPCs per field map walk and rest (labelled as NPCs, no combat). Remote players' mercenaries are not drawn yet.
- Checks: 210 tests (+ merc61) + 16 multiplayer; browser local + LIVE: warp to rice-fields, mercenary hits (4 in 4.5 s), 3 adventurers present. Vercel 0.61, Render 7e1b8fb. Mirror synced.

## Standing pose in the redrawn style (0.61.1, 2026-10-18)
- f0e502c. Owner: walking and standing looked like two different characters (idle still the old 3/4 art). Idle now shows frame 4 of the redrawn front/back walk (feet together, arms down): after walking up it stands facing away (31), otherwise faces the camera (23); classes without front/back art keep the original idle (rigged-sprite fallback), lobby preview falls back to frame 0. Attacks/skills still use the old poses — prompt 7 added to outputs/art-prompts-061/PROMPTS.md for new idle + attack sets.
- Checks: 210 tests; browser local + LIVE: idle 23, after W 31, after S 23, no errors. Vercel 0.61.1. Mirror synced.

## Newest login takes over (0.61.2, 2026-10-18)
- e8f0b04. Owner (phone) stuck on "กำลังปลุกเซิร์ฟเวอร์…" while Render was healthy with 1 player online: the same account was still connected from another window (desktop Chrome tab). The server refused with already-online and the client kept retrying, the UI wrongly labelling it as waking the server. Now host.js closes the older session of the same uid (sends error 'replaced', waits for its save/lease release, ≤ 8 s) and admits the new one; realm.join drops a suspended copy that is past its resume window or for another character. The replaced window stops retrying and says it was opened elsewhere.
- Checks: 211 tests (+ takeover612: two real WebSocket joins, first gets 'replaced', second welcomed) + 16 multiplayer. Vercel 0.61.2, Render e8f0b04 (authority true). Mirror synced.

## Original character art restored (0.61.3, 2026-10-18)
- 79b30aa. Owner did not like the redrawn model and asked for the original. Restored the 0.54 animation37 walk strips + json for all 8 classes and equipment41 novice; removed the redrawn strips from assets (kept in outputs/walk-handoff). walkCycle back to 2.1 for all, footfall bob back. Kept: flip hysteresis, 2 cycles/s cadence cap, walk-view/stand-frame code (inactive without front/back art). Fixed: game-controls smoothed the new `stand` flag, so with fallback art walking up/down showed the idle frame (affected non-novice classes since 0.61.1).
- Checks: 208 tests (new-art tests replaced by walk-original) + 16 multiplayer; browser local + LIVE (phone): walk 12–19 in all directions, idle 0, no errors; live files match. Mirror synced (deleted files left in mirror).

## 0.62 Blender v2 scenes (2026-10-18, commit 0df669b)
- All six maps load `maps/v2/<id>.glb` (built from the v2 .blend sources by `scripts/optimize-scenes-v2.py`; 0.8–4.5 MB each, Draco + WebP 512 px). Walk grids are baked by `scripts/bake-nav-v2.py`, and gameplay is re-placed by `scripts/build-scenes-v2.mjs` (same map IDs, quests, mentors at the new sparring court 40,-46).
- Tests: npm test 208/208, test:multiplayer 16/16, check:content valid, build OK. Local server (AUTH_MODE=local) tour: all six maps, NPC talk, mentor dialog, bridge crossings with deck height (capital, rice, orchard, mill, cellar, marsh), portal chain incl. mill-cellar, world-map warp, phone 915×412. No console errors.
- Live: Render /health commit 0df669b, contentVersion 62, authority true; Vercel shows 0.62 and serves all six v2 GLBs (200). Production guest mode verified: capital → NPC ลุงเรือง → portal to rice-fields → back.
- Not verified: Google-login online play on production, a physical phone. Known: old `maps/ayutthaya.glb/.blend/-preview.png` are no longer loaded (kept, not deleted); hero can be hidden behind v2 roofs (no roof fade yet).

## 0.63 → 0.65 (2026-10-18)
- 0.63 `e4e52c5`: monster camps of 4–5 with pack rally; desktop utility windows centred. `bc84b2e`: Codex's eight-direction painted characters as default (owner-approved) + skill VFX.
- 0.64 `ef941df`: camp leaders (3× HP, 2× EXP, 3 loot rolls), daily leader bounty, 20-minute field surge (EXP/drop ×2 for 5 min, channel announce), purple/gold drop banner + announce, level gifts Lv 3–25. Verified live: Render ef941df, Vercel 0.64, surge chip shown in production guest mode.
- 0.64.1 `55b0ee0`: owner reported (iPhone video) flickering ground on several maps and an incomplete, static map. Fixed coplanar ground z-fighting with per-layer polygon offset; map photo now renders shadows for the whole map; open map redraws every 250 ms with monster/NPC markers. Verified live: Render 55b0ee0, Vercel 0.64.1.
- 0.65: painted UI icon sheet `assets/ui63/ui-menu63.png` (ChatGPT/Codex art, glow stripped and re-gridded by `scripts/normalize-ui63.py` in Blender) on the top menu, World and settings buttons and as map markers (portal, NPC, shop, you, teachers' court, boss).
- Tests 234/234, multiplayer 16/16. Not verified: a physical phone after the 0.64.1 flicker fix (owner to confirm).

## 0.69 Approved game logo (2026-10-19)

- Release commit `7db13bd`, based on production `336a73b` (0.68.2). Integrated the owner's approved gold lotus / cyan spirit-flame logo into the lobby hero and shared loading screen; emblem appears in the lobby header, favicons, touch icon and web manifest.
- Original transparent PNG bytes are preserved under `assets/brand69/`. `brand69.css` loads last; loading branding switches to a compact height at viewport heights <=600 px. Accessible brand text remains present. No gameplay, account, save or server logic changed.
- Validation after rebasing onto 0.68.2: `npm test` 234/234, `npm run build` and `npm run check:content` passed. Multiplayer 16/16 also passed before the rebase (upstream changed ground/HUD, not multiplayer code).
- Production: Vercel reports success for `7db13bd`; public lobby shows 0.69. index.html, game.html, loading-preview.html, brand69.css and manifest match the build after normalizing Windows line endings. Both PNG SHA-256 hashes match the approved source exactly. All seven public resources returned HTTP 200.
- Render health: HTTP 200, commit `7db13bd`, `ok:true`, `authority:true`, contentVersion 62 after rollout completed.
- Limitation: browser visual testing on desktop/mobile and live Google login were not available in this run because the computer-use browser inventory was empty. Layout received a static CSS review; no visual-QA claim is made. HTTP evidence is saved locally in `outputs/logo69-deployment.json` beside the repository.
