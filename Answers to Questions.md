# Answers to Questions

## 1. What did the agent do, and what did you do yourself?

### The agent (OpenCode)

- Found the existing `excalibur-starter` scaffold, finished the missing GitHub push, made the repo public, and enabled GitHub Pages with an Actions workflow.
- Measured all 230 files in `Public Game ASSETS`: dimensions, frame grids, palette swaps, decoded memory, audio durations, and licenses.
- Copied the C32 art into `src/assets/`, built the asset manifest, and wrote the terrain compositor with 3 × 3 autotiling and deterministic surface decorations.
- Replaced the placeholder rectangles with the C32 player sprites (walk/jump/fall animations, facing flips), the door goal, and clouds.
- Rebuilt the level layout for the new tiles and verified reachability (jump height, gaps, platform climb).
- Added audio: looping Stage 1 music, jump effects, footsteps, landing, death, and `M` mute.
- Added tests for the autotiler, kept the existing physics/camera/level tests green (58 total), and updated the README and credits.
- Verified everything in headless Chrome over the DevTools protocol: movement, jump arcs, camera clamping, respawn, goal completion, audio playback, mute, and the deployed build.

### You (the user)

- Set the goal and scope: a 2D single-player platformer with movement, jump, one level, and a camera, then level-first, then audio.
- Supplied the asset packs and told the agent where they were.
- Made the product decisions: make the repo public, start from the C32 tiles plus the Cam Tatz pack, and keep going with the level.
- Supplied `Game Assets Credits.txt`, which resolved the licensing question.
- Reviewed the links and asked for changes; anything you did outside this chat (local testing, manual play, edits) is not visible to me.

## 2. What did the agent get wrong about the assets — grid, path, anchor, license — and how did you fix it?

| Area | What went wrong | How it was fixed |
| --- | --- | --- |
| **Grid** | Assumed “C32” meant 32 px tiles. The art is actually 16 × 16: `docData.json` says `tileWidth: 16`, and the walk sheet is 64 × 16 (four 16 px frames). | Measured every PNG before coding, then rendered the 16 px art at 2× into the existing 32 px world cells (`pixelArt: true`). This kept the physics, level grid, and tests unchanged. |
| **Grid (cloud)** | Treated `Cloud.png` (32 × 16) as two animation frames and sliced it into 16 px cells. It is one cloud split into left/right halves, so half-clouds appeared. | Draw the whole 32 × 16 image as one 64 × 32 sprite; no sheet slicing for clouds. |
| **Path** | The Desktop folder is `Public Game ASSETS`, not “Public Game Assets”, and its file names contain spaces and brackets. The first lookup failed. | Located it with `find`; quoted every copy path. |
| **Path (loading)** | Assumed Excalibur’s default `Loader` would preload `Sound` resources. With `suppressPlayButton: true` it skipped them, so `Sound.play()` silently warned “resource is not loaded yet” and nothing played. | Preload images and sounds explicitly with `Promise.allSettled([...image.load(), ...sound.load()])` before `engine.start()`. |
| **Anchor** | The player frame is 16 × 16 with a 12 × 12 body and feet on the frame’s bottom edge; the original 24 × 40 hitbox and top-left drawing put the art in the wrong place. | Set the hitbox to 16 × 24 and `graphics.offset = (-8, -8)`, so the 32 × 32 scaled frame centres on the body and the feet sit on the body’s bottom edge. The door needed the same treatment: a 16 × 32 sprite (32 × 64 at 2×) bottom-aligned to the goal tile. |
| **License** | Initially reported that C32 had no license file and that the SFX licenses were unstated. That was true of the downloaded folders, but wrong as a conclusion. | You supplied `Game Assets Credits.txt`; I followed the OpenGameArt links and verified that **all five packs are CC0**. Replaced the caveat with `ASSET_CREDITS.md`. |
| **Atlas layout (assumption, not a bug)** | Guessed the 3 × 7 ground atlas was a 3 × 3 autotile plus decorations. | Sampled the colour at each tile edge to confirm: rows 0–2 are grass-top / dirt-middle / dirt-bottom, columns 0/1/2 are left/centre/right, rows 3–6 are tufts, rocks, plants, and grass. |

## 3. What licenses are your assets under, and what do they require you to do?

All five are **CC0 1.0 (public domain dedication)** according to their OpenGameArt pages:

| Asset | Author | License | Attribution |
| --- | --- | --- | --- |
| C32 Platformer Tiles | R3tr0BoiDX (GamePlace) | CC0 | Not required; author says credit is appreciated |
| Platformer Asset Pack 3 | CTatz (Cam Tatz) | CC0 | Not required; author asks for a link only if you want to |
| 4 Chiptunes (Adventure) | Subspace Audio | CC0 | Not required |
| Jump sounds | rudy85 | CC0 | Not required |
| 8 Wet Squish, Slurp Impacts | Independent.nu | CC0 | Not required |

**What CC0 requires:** nothing, legally. You may use, modify, and redistribute the assets, including commercially, without attribution or share-alike. You may not imply the author endorses your project, and the assets come with no warranty. Keeping `ASSET_CREDITS.md` is voluntary good practice, not an obligation.

One detail worth recording: the music’s `INFO.txt` names **Juhani Junkala**, while the OpenGameArt credit is **Subspace Audio**. They are the same artist (Subspace Audio is Junkala’s alias); the credits file follows the OpenGameArt listing.

## 4. What did you learn about the asset pipeline that you didn’t know before?

- **Measure, don’t trust the pack name.** “C32” is a palette/format label, not a tile size. The 16 px grid only became obvious after reading `docData.json` and the frame dimensions.
- **Compressed size ≠ runtime size.** The Cam Tatz pack is 1.55 MB on disk but 53 MB decoded at native resolution (13.9 MP); downscaling to a 64 px cap drops it to about 1 MB. Always estimate decoded memory before loading a pack.
- **Palette swaps are free.** All six C32 player colours have identical alpha channels, and the Cam Tatz colour variants do too, so one animation set plus recolours is enough.
- **Excalibur specifics:** `ImageSource` starts loading in its constructor, but `Sound` only loads when asked; `SpriteSheet.fromImageSource` slices grids; `Animation.fromSpriteSheet` needs `scale` applied per frame; `graphics.offset` is the clean way to align oversized art to a smaller hitbox; `pixelArt: true` gives crisp 2× scaling.
- **Compositing beats thousands of actors.** Drawing the 5,760 tiles into one 1920 × 768 canvas and wrapping it in a single sprite is one draw call, versus 5,760 sprites.
- **Autotiling is neighbour logic.** A 3 × 3 core selected by “solid above/below/left/right” produced correct grass tops and side edges without a Tiled dependency.
- **Audio has two separate gates:** the browser’s autoplay gesture (solved by starting music on the first key/click) and Excalibur’s loader (solved by explicit preload). Also, `duration` on a `Sound` is a cheap way to trim a 2-second clip to a 350 ms effect without editing the file.
- **Vite + Pages:** imported asset URLs are hashed automatically, and `base: './'` is what makes the build work under `/excalibur-starter/`.
- **Licenses live on the source page, not in the download.** The C32 and SFX folders shipped without license text; the OpenGameArt pages had the answer (CC0) in seconds.

## 5. How much did you spend on tokens?

From OpenCode’s session record for this conversation:

| Metric | Tokens |
| --- | ---: |
| Input | 2,408,504 |
| Output | 77,179 |
| Reasoning | 114,167 |
| Cache reads | 32,804,736 |
| **Recorded cost** | **$0.7161** |

The large input count is cumulative across every turn and includes all tool output (measurements, test runs, screenshots, and build logs). Cache reads are reported separately by the provider and are much cheaper than fresh input. The figure is OpenCode’s own accounting and may differ by a few cents from the provider’s invoice.
