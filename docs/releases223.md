# Versioned frontend releases (223)

A new frontend is announced, never forced. The running game keeps its existing WebSocket and runtime URLs until the player chooses Update when ready. Saving must succeed before navigation. Root game/play HTML and release.json are no-store; next entry loads the current release.

## Release procedure
1. Finish source changes, translations, reference export and tests.
2. Choose a new ID in release.json. Never reuse an archived ID.
3. Commit current source and assets/maps/vendor first: the freeze script records that source commit to recover old bytes later.
4. Run node scripts/freeze-release223.mjs. It snapshots JS/CSS/webmanifest/maps metadata and asset hashes. Modified/deleted old assets are retained as sparse overrides. Unchanged assets use the versioned fallback route; do not duplicate the 750 MB asset pack.
5. Commit the releases changes. Run npm run build and the runtime/retention tests. Vercel publishing without a frozen current release fails.
6. Push the reviewed commit. Keep all retained releases and sparse overrides while clients may still use them. Do not edit frozen files.

Any import or navigation added later must respect the release base. Cross-page navigation goes to a root HTML entry, never another archived page. Keep wire protocol changes backward compatible.

## Hosting limitation requiring operational access
Frontend continuation is implemented and testable without restarting the game authority. DigitalOcean currently auto-deploys main too; replacing that container ends its TCP sockets. A reconnect is not zero-disconnect.

Separate frontend publishing from authority deployment: disable deploy_on_push on the DigitalOcean service or use a separate authority-release branch; perform backend rollouts deliberately. Changing repository files alone cannot change that live App Platform setting.

This task could not inspect/change DigitalOcean settings: Computer Use stopped because it could not verify the current Windows browser URL. No deployment API token or repository deployment secret was configured. No browser workaround was used. Consequently no promise that pushing backend changes preserves existing TCP sessions is made.

First adoption: users must enter this release once before they can see its new-update notice on later frontend releases. The code cannot inject that notice retroactively into an already-running older frontend.

Cross-platform rule: frozen files are marked -text in .gitattributes. Pin textual asset metadata alongside code so checkout line endings cannot alter archived URLs. Source comparison ignores only CRLF/LF differences; archived byte hashes remain exact. Binary assets still use sparse retention and unchanged-image fallback.

Pinned text detection uses actual non-NUL file bytes plus known binary formats, not a short extension whitelist. This covers asset-pack build notes/scripts as well as JSON/JS metadata. Older snapshots receive missing exact-byte text overrides on the next freeze.
