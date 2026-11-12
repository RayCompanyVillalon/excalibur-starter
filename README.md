# Excalibur Platformer

A small single-player 2D platformer built with **Excalibur.js 0.32**, **TypeScript**,
**Vite** and **pnpm** — same toolchain and folder conventions as
[NatTuck/drunk-panda](https://github.com/NatTuck/drunk-panda).

The goal is a sandwich speedrun: find the ingredient hidden in each level, then
reach the exit as fast as possible. Section One (Grassland) is in progress. Level 1
spans 140 × 32 tiles with moving islands, saw blades and cannons; Level 2 stretches
to 180 × 36 with mushroom patrols, land mines, a tower of lifts and two gap jumps
that require the new dash. A clock in the top-right tracks each run.

**Play it:** https://raycompanyvillalon.github.io/excalibur-starter/

## Controls

| Action | Keys |
| --- | --- |
| Move | `A` / `D` or `←` / `→` |
| Jump | `Space`, `W` or `↑` (hold for height) |
| Dash | `Shift` (one air dash per jump) |
| Next level | `N` (after the ingredient is secured) |
| Respawn / restart run | `R` |
| Mute / unmute | `M` |
| Debug readout | `F1` |

The clock starts on your first movement, jump or dash input. Dying or pressing `R`
resets the run, and your best time for the level is stored in `localStorage`.

## Run it

```bash
pnpm install
pnpm dev        # local server with hot reload
```

```bash
pnpm test       # headless Vitest run
pnpm typecheck  # tsc --noEmit
pnpm build      # typecheck + static build into dist/
pnpm preview    # serve the production build
```

Node `>= 20.19` is required. The pnpm version is pinned in `package.json`
(`packageManager: pnpm@11.7.0`).

## How it works

```
src/
  main.ts                     engine setup, fixed 60 Hz updates
  game/
    config.ts                 every tunable: gravity, run speed, jump, camera, colors
    math.ts                   pure helpers: clamp, approach, lerp, damp
    input/InputMap.ts         keyboard state -> { moveX, jumpPressed, jumpHeld, dashPressed }
    audio/Sfx.ts              music start, jump/step/land/death routing, mute
    physics/aabb.ts           AABB overlap / containment helpers
    physics/kinematic.ts      sub-stepped, axis-separated move + collide
    player/controller.ts      pure player state machine (run, gravity, jump, dash)
    level/level.ts            ASCII map -> solids, spawn, goal, hazards
    level/levels.ts           level maps + moving-platform/saw/cannon specs
    level/LevelScene.ts       builds the world, hazards, camera, timer, respawn
    camera/follow.ts          deadzone follow + world clamping
    actors/Player.ts          thin Excalibur wrapper around the controller
    actors/MovingPlatform.ts  sliding island; carries the player
    actors/Saw.ts             patrolling buzzsaw
    actors/Cannon.ts          telegraphed straight-line projectiles
    actors/Projectile.ts      cannon shot with a limited range
    ui/hud.ts                 timer, best time, debug overlay and toasts
    ui/time.ts                m:ss.mmm formatting
    assets.ts                 image + sound manifest
  assets/                     C32 pixel art and audio
tests/                        Vitest coverage for the pure modules
```

### Movement

Excalibur handles rendering, input and the camera; collisions are ours. The player is
a `KinematicBody` moved by `moveAndCollide`, which:

- splits each frame into ≤ 8 px substeps, so fast falls cannot tunnel through a tile;
- resolves X first, then Y, which gives clean wall slides and flat landings;
- reports `onGround` (including a 1 px ground probe) for the controller.

Jump feel lives in `src/game/player/controller.ts`:

- gravity `2200 px/s²`, terminal fall `900 px/s`;
- jump impulse `780 px/s` (~4.3 tiles of height);
- releasing the button early cuts upward velocity to 45 % (variable height);
- **coyote time** 100 ms and **jump buffering** 120 ms;
- **dash** `Shift` bursts to 700 px/s for 170 ms with a 420 ms cooldown. Gravity is
  suspended for the burst, so a jump + dash keeps its height and clears a 7-tile
  gap. You get one air dash per airtime; landing refreshes it, and hitting a wall or
  ceiling ends the dash early. A cyan streak trails the dash.

All of it is tunable in `src/game/config.ts`.

### Level

`LEVELS` in `src/game/level/levels.ts` holds the maps and their moving-hazard
specs. Maps are ASCII: `#` solid, `.` air, `P` spawn, `G` goal, `S` spikes,
`C` ingredient, plus `M`/`L` markers for the later mushroom and land-mine levels.
Rows may be shorter than the widest row (they are padded with air).
Horizontal runs of `#` are merged into single rectangles. Falling below the world
kills you.

Level 1 is a linear speedrun route:

1. spike gardens and a 3-tile climb;
2. a shuttle island across a bottomless pit;
3. a cannon gauntlet with a vertical saw in the gap;
4. a two-stage platform lift up to the bread;
5. a descent across floating islands, two more saws and an aimed cannon;
6. the final hill climb to the door.

Moving platforms are advanced by the scene before the player step, so a player
standing on one is carried by the platform's frame delta. The per-frame solids
list is the static terrain plus the current platform rectangles.

Level 2 — Mushroom Men — is the difficulty step up:

1. a spike-and-mine opening that immediately asks for clean jumps;
2. stepping ledges over a minefield;
3. a 7-tile dash chasm, then a shuttle island over a second pit;
4. a cannon corridor with a sweeping saw, mushroom patrols, spikes and a mine;
5. a three-lift tower climb to the tomato, with a saw crossing the gaps;
6. a saw-and-mushroom descent across floating islands;
7. the final 7-tile dash gap, a spike-lined valley and the summit door.

Append `?level=2` to the URL to boot straight into Level 2 for playtesting. After
securing the ingredient, `N` loads the next level.

### Hazards

- **Spikes** kill on contact and are drawn from the C32 palette as red brick teeth.
- **Mushroom men** patrol the flat run they spawn on, turning at the edges.
- **Land mines** sit on the surface and detonate on contact; they re-arm on respawn.
- **Moving platforms** ping-pong on a triangle wave (`periodMs`), so they are
  periodic and learnable rather than random.
- **Saws** sweep a fixed track and kill on contact.
- **Cannons** flash amber for a short telegraph, then fire. Fixed-direction
  cannons guard corridors; aimed cannons lock onto the player when they charge.
- Shots expire after 3 s or when they hit terrain, and all hazards reset when a
  run restarts.

### Camera

`followCamera` keeps the player inside a 60 × 40 px deadzone, then clamps the focus
to the world bounds so the view never leaves the level. It uses exponential smoothing
(`1 - e^(-rate · dt)`), so it behaves the same at any frame rate.

### Art

The terrain and player come from **C32 Platformer Tiles** (16 × 16 pixel art). Source
art is drawn at 2× so one tile fills the 32 px world cell, with `pixelArt: true` keeping
it crisp.

`src/game/level/terrain.ts` composites the whole level into a single canvas at startup:

- a 3 × 3 block autotile (grass top, dirt middle/bottom, grass side edges) picked from
  the solid neighbours of each cell;
- deterministic grass tufts, rocks and plants on exposed surfaces (rows 3–6 of the atlas);
- split into 2048 px-wide chunks, keeping each texture under the 4096 px GPU limit
  while still being only a handful of draw calls.

### Sound

`src/game/audio/Sfx.ts` routes effects and handles the browser autoplay rules:

- **music** — Juhani Junkala's *Chiptune Adventures: Stage 1*, looping at 30 % volume;
  it starts on the first key press or click (a gesture is required by browsers);
- **jump** — alternating jump clips, trimmed to 350 ms;
- **footsteps** — alternating squish impacts every 200 ms while running on the ground;
- **landing** — impact volume scales with fall speed;
- **death** — a lower-pitched impact when you fall out of the world;
- **`M`** mutes everything and restarts the music when unmuted.

Audio is preloaded explicitly before the scene starts, because Excalibur's default
loader skips `Sound` resources when the play button is suppressed. The effects are
FLAC, which Chrome and Firefox decode; Safari may need WAV/OGG conversions.

## Tests

`pnpm test` runs 76 tests over the engine-free modules:

- `tests/aabb.test.ts` — overlap edges, containment
- `tests/kinematic.test.ts` — landing, walls, ceilings, tunnelling, ledges
- `tests/player.test.ts` — run speed, gravity, jump, jump cut, coyote, buffer, dash
- `tests/camera.test.ts` — deadzone, clamping, small worlds
- `tests/level.test.ts` — parsing, spawn/goal, run merging, validation, Level 2
- `tests/terrain.test.ts` — autotile neighbour rules, decoration stability
- `tests/math.test.ts` — clamp, approach, deadzone, ping-pong
- `tests/time.test.ts` — speedrun clock formatting

## Deploying

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/`
to GitHub Pages. `base: './'` keeps the build usable from any subpath.

## Credits

See [ASSET_CREDITS.md](ASSET_CREDITS.md) for the full list of art and audio sources.

## Next steps

- Add the S/A/B/C/F grading screen at the end of a section.
- Finish Section One: mushroom enemies and the Giant Worm boss (Levels 2–3).
- Add Section Two (Caves): darkness/lamp, spiders, goblins, Mothman.
- Add Section Three (Volcano): lava, demons, the Devil chase, cage puzzle.
- Convert the FLAC effects to WAV/OGG for Safari.
