# Development Report — Nov 12–13, 2026

## Wednesday Nov 12 — Sections 1–2 core mechanics

### 0637e30 — Add dash + Level 2
- **Shift dash**: 700 px/s for 170 ms, 420 ms cooldown, one air dash per airtime, flat trajectory, wall/ceiling cancels, cyan afterimages
- **Level 2 "Mushroom Men"** (180x36) rebuilt: minefield ledges, two 7-tile dash gaps, shuttle island, cannon corridor, three-lift tower to the tomato, saw descent, spike valley, summit door
- **New art**: tomato, mushroom with stomp/squash states, land mine with trigger lamp
- Fix land mines spawning inside ground
- Fix mushroom patrols binding to their own flat run
- Add ?level=N boot param, N key for next level, Level 2 test suite

### 8aea3c2 — Stomp mushrooms + universal dash
- Falling on mushroom cap squashes it (bounce); side/underside is fatal
- Flattened mushroom sprite with X eyes and fade-out
- Dash verified everywhere including Level 1

### 3c8e2fe — Level 3 "The Giant Worm" (200x40)
- Worm that burrows and erupts across the arena
- Full gauntlet: meadow to dash chasm to shuttle over spikes to cannon corridor to three-lift tower (lettuce) to saw descent to dash gap to worm arena to door

### c42c4c1 — Parry mechanic (F key)
- Timed parry window (170 ms) with cooldown (650 ms) and invulnerability grace (300 ms)
- Mushrooms: fling away at 420 px/s
- Cannon projectiles: reflect back at 1.15x speed
- Land mines: disarm
- Worm boss: force submerge
- Spikes/saws: negate contact
- Visual parry ring + sound

### 0042d84 — Parry respawn fix + debug tools
- Bug fix: parried actors were killed, causing null refs on respawn — switched to hide-instead-of-kill pattern
- **K key**: skip to next level (debug)
- **J key**: flight mode (click to teleport the player, debug only)

### 5e97897 — Extended worm arena
- Worm arena bounds widened to columns 40-193 so it erupts through the entire gauntlet

---

## Thursday Nov 13 — Sections 2-3 refinements + Levels 4 and 5

### 4fcb111 — Double jump + auto-advance
- Air jump at 720 px/s, one per airtime
- Auto-advance: 2.2 s after clearing a level, loads the next one
- Speedrun timer starts on first input

### 6f9000b — Lettuce art, audio fix, terrain cache
- Cut Level 3 land mines: 10 to 5
- **Lettuce sprite**: dedicated canvas art (34x26, green ruffled leaves), routed by ingredient name (not the bread fallback)
- **Audio freeze fix**: WebAudio was never unlocked before manual preload — suspended AudioContext leaked Sound instances. Fix: unlock on first gesture, gate playback on ready, cap at 6 overlapping instances
- **Terrain freeze fix**: rendering 6400x1280 px terrain into one canvas per frame was hitting 32 MB RGBA per load. Fix: composite into 2048 px wide chunks, reuse chunk textures on reload, cache generated sprites to stop GPU texture churn

### b2727ca — Cache bust + bread placeholder
- Removed hardcoded ? Bread from index.html (now says ? Ingredient until level loads)
- Added no-cache meta tags for faster deploy propagation

### 02732d8 — Level 4 "The Dark Caves" (Stage 2!)
- **New file**: LEVEL_4.md
- **New file**: src/game/graphics/DarknessPostProcessor.ts — Excalibur ScreenShader post-processor with radial lamp, gentle flicker, and ambient floor
- **New file**: src/game/actors/Spider.ts — ceiling anchor, web descent, strand patrol, parry fling, stomp squash
- **New file**: src/game/actors/Stalactite.ts — triggers when player walks underneath, falls with gravity, shatters on terrain, parryable
- **New file**: src/assets/tiles/underworld.png — cave tile atlas (48x112, 3x7 grid matching overworld)
- **Cheese ingredient**: 34x26 yellow wedge with holes
- **Level 4 map**: 56x56 tight vertical cave with spider web gauntlets, stalactite corridors, cheese in lower-left, door lower-right
- **TerrainOptions/CAVE_TERRAIN**: decoration system updated so cave surfaces only get sparse rock (atlas row 4), not opaque dirt fill (row 3)
- Clouds skipped in caves, moving platforms use cave sheet, background #04060a

### e682ab0 — Spiders seek the player on the ground
- Rewrote spider state machine: descending to grounding (finds ground below) to seeking (chases player horizontally)
- Player position injected into each spider every frame
- Solids list fed to each spider so it detects ground surfaces
- Parry/stomp still work identically
- Web visuals extend to ground height

### 6c095b2 — Level 5 "Goblin Thieves"
- **New file**: LEVEL_5.md
- **New file**: src/game/actors/Goblin.ts — chases player horizontally, grapples on contact (mash E 6x to escape), parryable (F stuns them)
- **New file**: src/game/actors/BearTrap.ts — floor hazard, instant kill, parryable (F disarms)
- **Pickles ingredient**: 34x26 green spear with bumps
- **Level 5 map**: 100x34 wide horizontal cave with two parallel routes, pillars for cover, 20 goblins, 4 bear traps, 8 spiders, 10 stalactites
- **New markers**: K (goblin), B (bear trap) in the level parser
- **Darker caves**: lamp radius 320, darkness 0.82 (up from 0.65)

### d3d2b01 — Bear trap reduction
- Bear traps cut from 21 to 4 (strategic only: spawn entrance, upper route, near pickles, final approach)

---

## Stats

| Metric | Value |
|--------|-------|
| Commits since Wednesday | 13 |
| Files changed | 29 |
| Lines added | about 2,493 |
| New files | 8 |
| Tests | 103 passing (up from 58) |
| Levels | 1-5 complete |
| Live URL | https://raycompanyvillalon.github.io/excalibur-starter/ |

## Bugs Fixed

1. **Audio freeze**: suspended AudioContext leaked Sound instances leading to 49 land, 18 death instances after 90 seconds. Fixed by unlocking on first gesture, gating playback, capping at 6 instances.
2. **Terrain freeze**: full-level canvas was 32 MB, rebuilt every load. Fixed by chunking at 2048 px and reusing textures.
3. **Parry respawn NPE**: killed actors caused null refs on reset. Fixed by hiding instead of killing.
4. **Land mine spawn**: mines placed one tile inside the ground. Fixed by scanning downward for the solid surface.
5. **Mushroom patrols**: walked off raised steps. Fixed by checking same-surface adjacency before extending patrol bounds.
6. **Pages cache**: stale index.html served old bundle for up to 10 minutes. Added no-cache meta tags and removed hardcoded bread placeholder.

### Current commit — Death counter + cumulative score
- **New**: death counter (☠) and cumulative score displayed in the top-right corner
- Score persists across levels via localStorage
- Scoring: -50 per death, +500 for collecting ingredient, +1000 for clearing level + time bonus
- Score/death tracking wired into HUD and scene controller
- Shifted timer box down to make room for score box above it
- Debug overlay now shows `score` and `deaths`
- Renamed report to REPORT.md in project root
