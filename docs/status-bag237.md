# Status / bag layout 237–238

Uses the approved unified-menu236 gold frame and matte-jade surface.

- Status (C): allocation for STR/AGI/VIT/INT/DEX/LUK is on the left. The right shows actual derived totals grouped into attack, HP/MP and defense, skill/general bonuses, total attributes, monster sizes, offensive elements, and elemental resistance.
- The right column reads the authoritative online derived snapshot, never re-derives naked character values. Missing fields show a dash; a present bonus map without an entry means zero.
- Details appear on mouse hover, keyboard focus, or touch tap. Help is a simple rounded box clamped to the viewport, not a second ornate menu. Escape dismisses help first; outside tap, menu close, and content scroll dismiss it. Stat allocation remains stable during server updates and supports holding the plus button.
- Percent units are explicit: critical damage 150% means ×1.5, attack speed 200% means half the normal class attack interval, and MP recovery 100% means the normal recovery rate. Dodge chance is an estimate against a same-level monster; conditional combat effects may alter final outcomes.
- Equipment management remains exclusively in Bag (B): six proportional slots beside a larger complete character preview. Equipped-item actions include unequip and insert/remove-card actions. Right-click equip/unequip is preserved.
- Portrait phones stack allocation/totals and character/inventory with scrollable content. Landscape keeps the status columns independently scrollable.
- No changes to combat formulas, server authority, gear statistics, card rules/fees, currency, or character artwork.

Validation: tests/status-metrics238.test.mjs covers unit conversion, missing values versus zero bonuses, real derived data, and snapshot immutability. Existing stat, tooltip and reset tests remain passing. UI evidence belongs in outputs/status-totals238/.
