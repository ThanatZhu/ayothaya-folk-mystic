# Arena lobby artwork

Created with the built-in `image_gen.imagegen` tool. Four independent transparent assets; complete prompts and original generated file names are in [prompts.json](prompts.json). Originals remain in the Codex generated-images directory. Preparation only trims transparent margins and exports resized WebP files with alpha preserved.

- [Window frame](frame.webp)
- [Primary button](button-primary.webp)
- [Secondary button](button-secondary.webp)
- [Close button](button-close.webp)

Consumed by `arena-skin168.css`, scoped to `#arena-lobby`. Frame and rectangular buttons use nine-slice borders so text remains live and the artwork adapts to different window sizes. The dark interior is inset behind the generated frame. The close symbol is live text over the generated round button.

The header remains fixed while long room lists scroll inside the frame. Existing room creation/join/refresh callbacks remain the owners of button behavior.

Validation: browser render checks at 1920×1080, 1440×900, 1280×720, 1024×768, 844×390, 667×375 and 390×844; live game screenshots at desktop and mobile widths; primary/refresh button callbacks checked. QA screenshots are in untracked `outputs/skin168/`.
