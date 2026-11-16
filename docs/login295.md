# Cinematic login — r295, 16 November 2026

The owner approved the borderless centered login preview. The production entry now uses its human-versus-guardian illustrations, original Ayothaya logo and Mali typography. Login controls remain vertically stacked on desktop and phone; only the login screen is restyled. Character and server screens retain their existing styling and behavior.

Play Now and Continue use the existing lobby handlers and Firebase auth state. No preview/demo session key, placeholder sign-in dialog or simulated session control is shipped. Existing anonymous-account linking, terms/privacy consent, character selection and server authority remain in the original flow. Returning accounts see Continue as soon as Firebase auth restoration completes; the logo introduction never gates buttons. Reduced-motion users see a still logo.

Validation: scripts/check-login295.mjs runs the actual production entry and handlers with isolated Firebase/backend boundary fixtures. It checks 16 combinations (new, returning anonymous, signed-in and connection error, across four screen sizes), real consent UI, anonymous-auth invocation, actual local guest character save/reload, language and reduced motion. Desktop/phone screenshots were visually inspected. This fixture does not claim a live Google OAuth or production character-write test.

Run with an external playwright-core module path:
node scripts/check-login295.mjs <absolute-path-to-playwright-core/index.mjs>

Publication follows docs/releases223.md: source commit, new frozen release, retention/build tests, guarded push to frontend-live, then Vercel production deployment of that exact SHA. No backend or gameplay rule changes.
