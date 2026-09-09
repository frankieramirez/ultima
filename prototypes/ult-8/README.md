# ULT-8 prototype: registry install end to end

PROTOTYPE. Throwaway. Two fresh consumer apps that install the ULT-7 Button
from a shadcn-compatible registry served by this monorepo. Nothing here sets
a convention; ULT-12 reacts to it and decides the real registry layout.

## Pieces

| Piece | Where |
|-------|-------|
| Registry source | `registry/registry.json` plus `registry/ultima/{lib,ui,setup}` |
| Built registry | `apps/docs/public/r/*.json` (`pnpm registry:build`) |
| Vite + TanStack Router consumer | `prototypes/ult-8/consumer-vite` |
| Next.js 16 App Router consumer | `prototypes/ult-8/consumer-next` |

Items: `tokens` (registry:lib, the provisional token files), `button`
(registry:ui, depends on `@ultima/tokens`), `setup-vite` and `setup-next`
(universal registry:item bundles of config files targeted at `~/`).

## Reproduce

```bash
pnpm registry:build
(cd apps/docs/public && python3 -m http.server 8765 --bind 127.0.0.1)
```

Vite, from a fresh `npm create vite@9 -- --template react-ts`:

```bash
npx shadcn@4.21.0 add http://localhost:8765/r/setup-vite.json --yes --overwrite
# hand step: add "paths": { "@/*": ["./src/*"] } to tsconfig.json and tsconfig.app.json
# hand step: tsconfig.node.json -> module esnext, moduleResolution bundler
npx shadcn@4.21.0 add @ultima/button --yes
npm run build
```

Next.js, from a fresh `npx create-next-app@16.3.4 --ts --app --no-tailwind --no-src-dir --import-alias "@/*"`:

```bash
npx shadcn@4.21.0 add http://localhost:8765/r/setup-next.json --yes
# hand step: import "./ultima.css" in app/layout.tsx
# hand step: wrap the scaffold's `* { padding: 0 }` reset in @layer
npx shadcn@4.21.0 add @ultima/button --yes
npm run build
```

Dev servers: `.claude/launch.json` has `ult8-vite` (port 5175) and
`ult8-next` (port 3001). Both render the Button in a dark and a light panel.

## Findings

Recorded on the ticket in Linear (ULT-8). Short list:

1. `shadcn build` resolves `files[].path` from the cwd, not from the
   `registry.json` directory its error message names. Run it with `-c registry`.
2. Universal `registry:item` bundles install config files and npm deps into a
   Tailwind-free project with no prompt and no `components.json` requirement.
   An existing `vite.config.ts` needs `--overwrite` or an interactive prompt.
3. `@ultima/tokens` namespace resolution, `registry:lib` placement into
   `aliases.lib`, and `@/registry/ultima/lib/...` import rewriting all worked.
4. Vite: without a `paths` alias in `tsconfig.json`, the CLI writes files into
   a literal `./@/` directory and reports success. create-vite ships none.
5. Vite: create-vite's `tsconfig.node.json` uses `nodenext`; the unplugin's
   `import` export condition has no `.d.mts`, so `stylex.vite` fails to type.
   Runtime is fine. Bundler resolution fixes it.
6. Next.js: Turbopack picked up `babel.config.js` on its own, PostCSS
   extracted the CSS into `ultima.css`, nothing in `next.config.ts` changed.
   Setup was four files and zero hand edits beyond importing the stylesheet.
7. Both: `useCSSLayers: true` puts every StyleX rule in a layer, so any
   unlayered consumer reset (`* { padding: 0 }` in create-next-app's
   `globals.css`) beats component styles, including the Button's own padding.
   Layering the reset restores it. Vite's scaffold has no such reset.
8. The `rsc: true` config did not insert `"use client"`; the Button rendered
   from a server component page because Base UI's own boundary covers it.
