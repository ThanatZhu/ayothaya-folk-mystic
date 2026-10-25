# Daily bounty illustrations 163

The prior task-scene resolver routed nearly all daily targets to story quest t5, the scarecrow scene. Leader bounties passed no monster ID and fell through the same resolver. This change supplies a distinct illustrated three-shot atlas and target-specific introduction for all 13 monster IDs in BOUNTY_POOL plus the any-map leader objective.

`bounty-storyboards163.js` maps exact target IDs. Leader events explicitly carry `leader: true`. Unknown targets return no scene instead of an unrelated picture. Training and main story scenes retain their own original content. Viewing a scene has no reward or quest-progress side effects.

Daily and weekly task rows put reward text and the watch button in one wrapping flex row, with an explicit gap and a minimum button hit area. It stays beside the text when room permits and wraps below when narrow. Claim controls remain separate.

Original generated artwork is preserved in outputs/bounty163/sources; optimized runtime artwork and the exact built-in image_gen prompt set live under assets/bounty163. The gallery at bounty-story-lab.html uses the actual cinematic player, including accelerated Thai letter reveal and Skip.

The 14 atlases contain 42 shots. Measured panel rectangles in bounty-art-frames163.js exclude the scene cuts and crop to 2:1 without stretching or showing neighboring panels. The original main-story atlas sampling is unchanged. Short mobile screens use the same safe-area dialog width as the album for daily and weekly tasks; rows wrap claim controls rather than letting them escape the frame.

Validation: 19 targeted Node tests passed, static build and content validation passed. Edge browser checks played all three shots of every target, verified instant Skip and inspected a 42-shot contact sheet. A disposable local realm checked daily controls at 1920×1080, 1440×900, 1024×768, 844×390, 667×375, 568×320 and 390×844, including unchanged story/bounty progress after viewing. Screenshots and the integration report are in outputs/bounty163. Real iOS/Android hardware was not used for these checks.
