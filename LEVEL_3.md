# Level 3 — The Giant Worm

Section One finale. The mushroom men return, the dash gaps widen, and a giant
worm erupts out of the ground in a wide arena before the door. The player climbs
for the lettuce, survives the saw descent, crosses the worm's arena, and escapes.

## Stats

| | |
|---|---|
| Map | 200 × 40 tiles (6400 × 1280 px) |
| Ingredient | Lettuce |
| Spawn | `(3, 36)`, feet on row 37 |
| Door | `(197, 36)` |
| Enemies | 9 mushroom men |
| Hazards | 5 land mines, 33 spike tiles |
| Moving parts | 4 moving platforms, 7 saws, 3 cannons |
| Boss arena | columns 40–193, ground row 37 |

Level 2 is 180 × 36, so Level 3 is both longer and taller. The extra height is
used for the tower climb and the descent.

## Route

1. **Meadow (0–30).** A one-tile step after the spawn keeps the first mushroom's
   patrol from walking back onto an idle player. Then a readable mine/mushroom
   gauntlet: mine at 10, mushroom at 14, mushroom at 24, mine at 27.
2. **First dash chasm (31–37).** A 7-tile gap over spikes. A running jump alone
   cannot clear it; jump + `Shift` dash can, and the double jump makes it a much
   safer hop.
3. **Shuttle landing (38–50).** A 13-tile spike chasm crossed on a shuttle
   platform that slides 8 tiles horizontally. One mushroom and one mine guard the
   landing.
4. **Cannon corridor (64–95).** A fixed cannon fires left down the corridor, a
   tracking cannon aims at the player, a saw sweeps vertically, and mushrooms,
   spikes and a mine break up the run.
5. **Tower base and lifts (100–132).** A short spike-bottomed gap with a saw,
   then three lifts climb the tower. Each lift's high point is one tile below the
   next ledge, so the hand-offs are simple jumps rather than blind leaps.
6. **Tower top (125–132, row 13).** The lettuce floats at `(128, 12)`. A saw
   crosses the lift gap on the way up.
7. **Descent (133–165).** Three floating ledges step back down to the ground.
   Three saws guard the drop, and a mine sits on one of the ledges. A cannon near
   the bottom punishes a careless landing.
8. **Final dash gap (166–172).** Another 7-tile spike pit, clearable with a dash
   or a well-timed double jump. This is the last execution check before the boss.
9. **Worm arena (173–199).** Two mushrooms patrol the arena floor. The door is at
   column 197, just outside the worm's eruption zone.

## The Giant Worm

The worm is an avoidance boss, not a damage sponge. It cannot be stomped; the
player survives by reading the telegraph and moving.

### States

| State | Duration | Behaviour |
|---|---|---|
| `burrowed` | 2.2–3.1 s | Hidden. Picks the next eruption point from the player's position. |
| `warning` | 680 ms | A cracked dirt mound and dust puffs appear at the eruption point. Harmless. |
| `surface` | 1.4–1.9 s | The body erupts and holds. Contact is fatal. |
| `submerging` | 260 ms | The body sinks back into the ground. Harmless. |

The boss is **dormant until the player crosses column 175**, so it does not cycle
in the distance while the player is still climbing. Crossing the threshold shows
the "The Giant Worm!" toast and wakes it.

The **first eruption is faster** (0.9–1.2 s burrow, 800 ms telegraph). Without
that, a straight sprint across the 18-tile arena would reach the door before the
first burrow finished.

### Enrage

After the worm's first two eruptions, it enrages:

| | Normal | Enraged |
|---|---|---|
| Burrow | 2.2–3.1 s | 1.1–1.6 s |
| Telegraph | 680 ms | 460 ms |
| Surface | 1.4–1.9 s | 1.9–2.4 s |

This gives the arena a two-phase feel: the opening crossings are readable, then
the worm speeds up for the rest of the fight.

### Fairness rules

- The eruption point is the player's x clamped to the arena; there is no random
  offset, so the correct answer is always "keep moving".
- The telegraph is drawn at the exact eruption x. Even the enraged 460 ms window
  is enough to run clear at 260 px/s.
- Only the surfaced body hurts. The mound and the submerge are safe.
- The hurtbox is 44 × 78 px against a 64 × 96 px sprite, so near-misses feel fair.
- The door sits outside the arena, so the player is never trapped against it.
- Death resets the boss to dormant along with the rest of the level.

### Speedrun notes

- The tower climb is the biggest fixed time sink because the lifts are periodic.
  Learning the phases is the main route optimisation.
- The descent can be free-falled; the saw under the tower edge is the gate.
- The boss can be baited to one side of the arena, then dashed past while it
  submerges.
- Best time is stored per level, so Level 3 has its own record.

## Implementation

- `src/game/level/levels.ts` — the 200 × 40 map, moving-platform/saw/cannon specs,
  and the `boss` arena spec (`left`, `right`, `groundRow`).
- `src/game/actors/WormBoss.ts` — procedural body and warning sprites, the state
  machine, target clamping, enrage timings, hitbox, and `reset()`.
- `src/game/scenes/LevelScene.ts` — builds the boss from the level spec, feeds it
  the player's x every frame, wakes it on arena entry, announces the enrage after
  two strikes, resets it on death, and shows its state in the F1 debug overlay.
- `tests/level.test.ts` — dimensions, uniform row widths, lettuce position,
  hazard counts, and the boss arena spec.

## Future ideas

- A short boss-health variant where three stomps drive the worm away.
- Breakable arena pillars that give the player safe spots to bait eruptions.
- A dedicated boss music cue and a louder eruption sound.
