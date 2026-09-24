---
name: testing-ultima-docs
description: How to run and end-to-end test the Ultima docs site (apps/docs) when asked to verify a component page, demo, or docs change in a browser. Covers dev server startup, page structure, theme switching, and how to verify component states.
---

# Testing the Ultima docs site

## Dev server

- Node is not on PATH by default: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"` (node v24, pnpm via corepack).
- From the repo root: `pnpm dev` serves the docs site at http://localhost:5173. Log to a file (e.g. /tmp/docs-dev.log) when backgrounding.
- Component pages live at `/components/<item>` where `<item>` is the kebab-case `item` field of the catalogue that `apps/docs/src/components.ts` re-exports from `apps/docs/src/generated/catalogue.ts` (e.g. `/components/toggle`).

## Page structure

- Sidebar nav (`apps/docs/src/navigation.ts`) renders `@components` group with labels `--<item>` for every catalogue entry; `::root` holds top pages. New components appear once their descriptor under `registry/metadata/react/` exists and `pnpm catalogue:generate` has rewritten `apps/docs/src/generated/`.
- `/components` is the catalogue index, grouped by release set (v0, v0.1, v0.2); the newest component is the last card of the last set.
- Theme switcher is a `ToggleGroup` in the header with Dark / Light / System buttons (`apps/docs/src/header.tsx`); preference persists in localStorage key `ultima-theme`.
- Each component MDX page embeds live demos from `apps/docs/src/demos/<item>/` inside `<figure>` elements, each followed by its source code and a Copy button.

## Verifying component state

- Components are Base UI primitives: pressed toggles carry `aria-pressed` and `data-pressed`; disabled carries `data-disabled`. Query `main figure button` in the console to inspect demo controls; `read_dom` output strips these attributes, so use `browser_console` + `getComputedStyle`/`getAttribute` for definitive state checks.
- Focus ring appears on `:focus-visible` (accent outline). Reach a demo toggle by clicking it once (sets focus), then press Tab to move to the next toggle with a visible ring.
- Accent tokens flip between light and dark themes; verify pressed/accent states in both via the header Dark button, then restore System.

## Production proof

- The dev server above is for exploration; it is not production evidence. Start from `pnpm verify list` and `pnpm verify describe scenario <id>` for the owner, route and recorded steps of a registered scenario.
- When production proof is required, run `pnpm --filter @ultima/docs test:production`. It captures the checkout into `.scratch/verify/<run-id>/`, builds the docs in production mode there and runs every registered production case at 1280×720 and 390×844 in both modes: navigation and color mode, the catalogue and copy, Dialog, Studio history and Compare panes, the element fixture and Spinner under reduced motion. Each binding lives in `apps/docs/tests/production/<scenario-id>.ts` and its steps in `verification/scenarios/`. The report is `<run>/report.json`; per-case screenshots, failure traces and the server log are under `<run>/artifacts/production/`.

