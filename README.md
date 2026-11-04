# Excalibur Platformer

A small single-player 2D platformer built with **Excalibur.js 0.32**, **TypeScript**,
**Vite** and **pnpm** — same toolchain and folder conventions as
[NatTuck/drunk-panda](https://github.com/NatTuck/drunk-panda).

It has hand-rolled kinematic physics (no engine collision bodies), one hand-authored
level, and a deadzone camera. Art is placeholder vector rectangles for now, so the
whole thing is playable without an asset pipeline.

**Play it:** https://raycompanyvillalon.github.io/excalibur-starter/

## Controls

| Action | Keys |
| --- | --- |
| Move | `A` / `D` or `←` / `→` |
| Jump | `Space`, `W` or `↑` (hold for height) |
| Respawn | `R` |
| Mute / unmute | `M` |
| Debug readout | `F1` |

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
    input/InputMap.ts         keyboard state -> { moveX, jumpPressed, jumpHeld }
    audio/Sfx.ts              music start, jump/step/land/death routing, mute
    physics/aabb.ts           AABB overlap / containment helpers
    physics/kinematic.ts      sub-stepped, axis-separated move + collide
    player/controller.ts      pure player state machine (run, gravity, jump)
    level/level.ts            ASCII map -> solids, spawn, goal
    level/LevelScene.ts       builds the world, camera, goal, respawn
    camera/follow.ts          deadzone follow + world clamping
    actors/Player.ts          thin Excalibur wrapper around the controller
    ui/hud.ts                 debug overlay and toast messages
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
- jump impulse `720 px/s` (~3.7 tiles of height);
- releasing the button early cuts upward velocity to 45 % (variable height);
- **coyote time** 100 ms and **jump buffering** 120 ms.

All of it is tunable in `src/game/config.ts`.

### Level

`LEVEL_MAP` in `src/game/level/level.ts` is ASCII: `#` solid, `.` air, `P` spawn,
`G` goal. Rows may be shorter than the widest row (they are padded with air).
Horizontal runs of `#` are merged into single rectangles, so a 60 × 24 tile level
becomes a few dozen collision boxes. Falling below the world respawns you.

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
- one Excalibur sprite for the result, so the terrain is a single draw call.

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

`pnpm test` runs 58 tests over the engine-free modules:

- `tests/aabb.test.ts` — overlap edges, containment
- `tests/kinematic.test.ts` — landing, walls, ceilings, tunnelling, ledges
- `tests/player.test.ts` — run speed, gravity, jump, jump cut, coyote, buffer
- `tests/camera.test.ts` — deadzone, clamping, small worlds
- `tests/level.test.ts` — parsing, spawn/goal, run merging, validation
- `tests/terrain.test.ts` — autotile neighbour rules, decoration stability
- `tests/math.test.ts` — clamp, approach, deadzone

## Deploying

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/`
to GitHub Pages. `base: './'` keeps the build usable from any subpath.

## Credits

See `src/assets/CREDITS.md`. C32 art has no license file in the supplied pack; the
Cam Tatz pack is public domain and the music is CC0.

## Next steps

- Add coins, enemies and hazards (the Cam Tatz character pack is available).
- Add one-way platforms and a second biome (Underworld/Nukalands atlases).
- Convert the FLAC effects to WAV/OGG for Safari.
