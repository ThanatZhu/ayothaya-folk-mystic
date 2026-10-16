# Equipment 0.41

Open the character portrait → **อุปกรณ์ · เสื้อผ้าและอาวุธ**, or press **I**.
Choose a weapon or outfit separately. The window previews idle, walking and basic
attacks using the same painted frames as the in-world character. Escape closes it.

## Art and current scope

- All eight professions, including Novice; both genders and existing Master branches.
- Two weapon appearances per profession: the original and a newly painted variant.
- Eight base costume silhouettes; each has original, indigo, crimson and ivory fabric choices.
  These are dye variants, not thirty-two independently drawn costume designs.
- 16 new transparent character sheets, 320 usable whole-body frames (20 per gender
  per profession), and a 24-cell inventory icon atlas. Every new weapon has authored
  idle/action frames and eight walking samples. Existing animation/skill timing stays intact.
- `assets/equipment41/` holds PNGs, per-class crop/anchor metadata and `prompts.json`.
  Built-in image_gen produced the PNGs. Metadata analysis does not edit image pixels.
- `equipment-gallery.html` is a public preview only; it never changes account equipment.

Starter equipment is granted according to profession. Novices cannot equip another
profession's weapons. Equipment is currently visual: it does not grant combat stats,
inventory loot, trading or crafting. Clothes retain the original silhouette; this is
not a modular armor/boots/hat paper-doll system. Outfit Original restores saved cosmetics.
The standard experimental eight-direction pilot is disabled for changed equipment.

## Persistence and networking

Guest selections are stored independently in each of the five local character slots.
Online gear is stored in the server-owned private character profile, not in localStorage
or user-editable character fields. The server validates item IDs and profession, saves
before acknowledgement, includes equipment in self and remote snapshots, and carries it
through travel/reconnect/advancement. Clients cannot supply equipment stats.

Cloud lobby mirrors retain their existing Firestore schema and omit equipment.
Consequently the Google-account lobby shows the base costume until entering the online
world, which retrieves the authoritative loadout. Guest lobby previews use saved gear.
If the online server is unavailable, cloud equipment changes report failure; they do
not pretend to save locally. Production Render readiness must be checked separately.

## Validation

Equipment tests cover class restrictions, novice progression, slot isolation, face
appearance preservation, image bounds, already-known remote players and real WebSocket
equip/save/reconnect with two clients. The full suite passed 136 tests after integration with the chapter-one story and click-to-move updates.
