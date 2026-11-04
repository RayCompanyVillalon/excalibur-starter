# Excalibur Starter

A minimal game starter built with **Excalibur.js 0.32**, **TypeScript**, **Vite** and **pnpm**.
Same toolchain and folder conventions as [NatTuck/drunk-panda](https://github.com/NatTuck/drunk-panda),
without the game content — a clean base to build on.

- One `Engine`, one `Scene`, one keyboard-driven actor.
- Strict TypeScript (`noUnusedLocals`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` off).
- Pure, engine-free helpers in `src/game/math.ts` covered by Vitest.
- Static build with relative asset paths (`base: './'`), so `dist/` can be served from any subpath.

## Run it

```bash
pnpm install
pnpm dev        # prints a local URL
```

```bash
pnpm test       # headless Vitest run
pnpm typecheck  # tsc --noEmit
pnpm build      # typecheck + static build into dist/
pnpm preview    # serve the production build
```

Node `>= 20.19` is required. The pnpm version is pinned in `package.json`
(`packageManager: pnpm@11.7.0`), so Corepack or pnpm will use it automatically.

## Controls

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` or arrow keys |
| Reset position | `R` |

## Structure

```
src/
  main.ts                     engine setup, scene registration
  game/
    config.ts                 tunables (viewport, player speed/friction, colors)
    math.ts                   pure helpers: clamp, approach, deadzone
    actors/Player.ts          keyboard movement with acceleration + friction
    scenes/MainScene.ts       background, title label, live position readout

tests/
  math.test.ts                unit tests for the pure helpers
```

## Debugging

The engine and scene are exposed on `window.__game` for devtools poking:

```js
__game.scene.player.pos.x = 480;
__game.engine.goToScene('main');
```

## Deploying

`pnpm build` emits a fully static `dist/`. Host it on GitHub Pages, Netlify,
Cloudflare Pages or any static host — no backend, no environment variables.

## Next steps

- Add sprite sheets and an asset loader under `src/assets/`.
- Replace the fixed viewport with `DisplayMode.Fixed` or a camera that follows the player.
- Grow `config.ts` into per-system sections as gameplay is added.
