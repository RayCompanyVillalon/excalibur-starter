# Level 5 — Goblin Thieves

- **Section:** Caves
- **Ingredient:** Pickles
- **Size:** 100 × 34 tiles (3200 × 1088 px)
- **Tileset:** Underworld (`src/assets/tiles/underworld.png`)
- **Darkness:** Yes (lamp post-processor shader, radius 320, intensity 0.82)

## Overview

A wide horizontal cave patrolled by goblin thieves. Unlike other enemies,
goblins don't kill — they **grapple** the player. When caught, mash **E**
repeatedly to break free. Bear traps replace spike pits as the floor hazard,
while spiders and stalactites still patrol the ceiling.

## Route

1. **Entry chamber** (left) — spawn on the ledge with a bear trap nearby.
2. **Upper route** — run along the top ledges past pillars, bear traps and
   goblins. Spiders drop from above; stalactites fall when triggered.
3. **Lower route** — an alternative path through the centre of the cave; the
   pickles are hidden here.
4. **Right ascent** — navigate past the final bear trap gauntlet to reach the
   door.

## Hazards

| Type | Marker | Count | Behavior |
|------|--------|-------|----------|
| Goblins | `K` | 13 | Chase + grapple player. Mash E to escape. Parry (F) stuns them. |
| Bear traps | `B` | 12 | Floor hazard — instant kill. Parry (F) disarms harmlessly. |
| Spiders | `M` | 6 | Descend from ceiling, seek player on the ground. Parry/stomp. |
| Stalactites | `T` | 10 | Drop when player walks underneath. Parry into rubble. |

## Controls

- **Parry (F)** — stuns goblins, disarms bear traps, flings spiders, shatters
  stalactites
- **Mash E** — break free from a goblin's grapple (6 presses)

## Ingredient

The Pickles are at `(55.5, 18.5)` in the mid-level lower route. The door is on
the far right at `(90, 29)`.

## Design notes

- Bypasses the coin-steal mechanic: goblins grapple instead, creating an E-mash
  skill check without the coin system overhead.
- Two parallel routes (upper and lower) encourage varied play for speedrunning.
- Pillars between the routes provide cover and escape lines from goblins.
- The darkness matches Level 4: lamp at radius 320, darkness at 0.82.
