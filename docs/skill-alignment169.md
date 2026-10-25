# Skill aim and presentation alignment

The reported recording shows a Shaman changing targets after movement. Local
movement prediction retains its previous facing while stationary; buffered cast
events already contain the new caster/target endpoints. Rendering the body from
the former and particles from the latter can point them in opposite directions.

Local and remote role, basic and legacy cast presentation now take aim from the
cast endpoints. A role cast retains that aim during its body animation, including
when a newer movement snapshot changes facing. Self casts retain current facing;
ordinary movement keeps its existing turning hysteresis.

Local role poses now sample the same bounded presentation clock as the painted
effect manager, instead of the simulation clock that network snapshots can reset.
The clock advances before event delivery; newly delivered effects sample on that
same frame. Expired role poses clear their old simulation deadline so a backward
time correction cannot leave a generic cast pose behind.

The world-space mapper previously stretched every offset along the entire attack
distance. A zero-distance self cast therefore flattened an orbit into a line, and
a ranged target stretched the same orbit. Only travel between anchors now scales
with range. Local auras, rings, walls and hit offsets preserve their world size;
ground planes rotate with the same direction as those offsets. Preview-only target
push/pull is omitted from live contact positioning, while lab choreography stays
unchanged. These are presentation changes; server damage, timing, MP, cooldowns,
movement and saved skill allocations are unchanged.

Regression coverage includes all 84 active role skills, stale facing, immutable
cast aim, zero/melee/ranged aura radii, actual atlas renderer placement, ground
orientation, preview isolation, resource disposal and simulation-time corrections.
Native Edge QA compares the old source and patched source against an isolated
WebSocket host, then checks every profession, local/remote aim and touch layouts.
