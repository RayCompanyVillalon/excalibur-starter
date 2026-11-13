# Level 4 — The Dark Caves

- **Section:** Caves
- **Ingredient:** Cheese
- **Size:** 56 × 56 tiles (1792 × 1792 px)
- **Tileset:** Underworld (`src/assets/tiles/underworld.png`)
- **Darkness:** Yes (lamp post-processor shader)

## Overview

The first cave level. A tight, vertical descent through a pitch-black cavern
lit only by the player's lamp. Giant spiders descend from ceiling webs and
stalactites break loose when you walk under them.

## Route

1. **Entry ledge** (top-left) — spawn in the small lit alcove.
2. **Spider dash gap** — a cave spider hangs from the ceiling; slip past or
   parry it, then jump the gap to the descending ledges.
3. **Descending ledges** — a sequence of platforms winding down the cave shaft.
   Each ledge has a spider web overhead and a stalactite that drops when
   triggered.
4. **Cheese chamber** (lower-left) — the hidden cheese wedge rests on a ledge
   guarded by spikes.
5. **Final pit** — traverse the bottom of the cave past the last stalactite to
   reach the exit door on the right.

## Hazards

| Type | Count | Behavior |
|------|-------|----------|
| Spiders (`M`) | 6 | Descend from ceiling on webs, patrol the strand. Parryable and stompable. |
| Stalactites (`T`) | 7 | Drops when the player walks underneath. Parryable into rubble. |
| Spikes (`S`) | 10 | Standard one-shot pit spikes. |

## Ingredient

The Cheese is at `(10.5, 47.5)` in the lower-left chamber, hidden behind spikes
and a ledge drop. Once collected, backtrack to the door at `(40, 47)` on the
lower-right.

## Jump stats

| Move | Height | Horizontal |
|------|--------|------------|
| Standing jump | ~4.3 tiles | ~2.5 tiles |
| Running jump | ~4.3 tiles | ~5.7 tiles |
| Dash-jump | ~4.3 tiles | ~8 tiles |

## Design notes

- Cave tiles share the same 3×7 atlas layout as the grassland sheet; the
  autotiler uses row 0 for ceiling, 1 for walls, and 2 for floor edges.
- Cave decorations use only atlas row 4 (loose rocks); row 3 (dirt fill) is
  skipped to avoid stamping opaque tiles above surfaces.
- The background is near-black (`#04060a`) and clouds are omitted.
- The darkness shader (`DarknessPostProcessor.ts`) is a WebGL 300 es fragment
  shader applied as an Excalibur `PostProcessor`. It draws a soft radial
  gradient centred on the player's screen position with a gentle flicker.
- Spider webs are drawn as separate `SpiderWeb` actors seeded from each `M`
  marker.
- There are no moving platforms, saws, cannons, land mines, or boss in this
  level.
