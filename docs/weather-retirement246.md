# Weather retired — 2 November 2026

Owner decision: remove automatic weather from the game. New clients do not load a weather renderer, rain geometry, fog/dimming modifiers, lightning, weather announcements, countdown or HUD button. URL weather overrides and legacy server weather snapshots have no effect. Base map lighting, distance haze, water/wind motion and skill effects remain independent.

The admin weather page and its controls are removed. Saved admin navigation to weather falls back to Players. Historical admin-weather audit records remain readable. The legacy shared weather model/API are retained solely for compatibility with already-running archived clients; this frontend release does not replace the game server. Old clients adopt this change when they update or next enter the game. Do not reintroduce weather rendering or controls without the owner's request.

No separate rain/thunder cue is connected to this renderer in the current audio system. Music, ambient map sounds and combat SFX are unchanged.
