---
name: testing-ultima-docs
description: How to run and end-to-end test the Ultima docs site (apps/docs) when asked to verify a component page, demo, or docs change in a browser. Covers dev server startup, page structure, scenario discovery, color mode switching, and how to verify component states.
---

# Testing the Ultima docs site

Two kinds of work happen here, and they are not interchangeable. **Exploratory** runs — the dev server, hand-driven browser checks — answer "does this look right" during development. **Production proof** — registered scenarios executed against a production build — is the only run that counts as evidence. Label which environment a result came from when you report it.

## Control

Command: `node --experimental-strip-types scripts/verify.ts`
Prepare: `pnpm install --frozen-lockfile --offline`
Features: verification/features
Scenarios: verification/scenarios
Bindings: packages, apps
Breaks: verification/breaks

## Start from the records

Before driving the site by hand, find the registered obligation for the behavior. These commands run in the installed workspace — on a checkout without `pnpm install` they fail at module resolution, which is a missing prerequisite, not a result:

- `pnpm verify list --search "<term>"` lists features, scenarios and catalogue items, with match reasons.
- `pnpm verify describe scenario <id>` gives the owning contract, route, fixtures, preconditions, ordered reproduction steps, required variants and the executable binding's location.
- `pnpm verify describe feature <id>` gives the feature's contract, source roots, scenarios and supporting suites.

The scenario's recorded steps are the reproduction. If the site and the record disagree, the record or the code has drifted — fix the pair together, don't work around one. Records live in `verification/scenarios/<feature>/<scenario>.json`; they, not this file, own control names and step order.

## Dev server

- Node is not on PATH by default: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"` (node v24, pnpm via corepack).
- From the repo root: `pnpm dev` serves the docs site at http://localhost:5173. Log to a file (e.g. /tmp/docs-dev.log) when backgrounding.
- Component pages live at `/components/<item>` where `<item>` is the kebab-case `item` field of the catalogue that `apps/docs/src/components.ts` re-exports from `apps/docs/src/generated/catalogue.ts` (e.g. `/components/toggle`).

## Page structure

- Sidebar nav (`apps/docs/src/navigation.ts`) renders `@components` group with labels `--<item>` for every catalogue entry; `::root` holds top pages. New components appear once their descriptor under `registry/metadata/react/` exists and `pnpm catalogue:generate` has rewritten `apps/docs/src/generated/`.
- `/components` is the catalogue index, grouped by release set (v0, v0.1, v0.2); the newest component is the last card of the last set.
- The color-mode control is `ColorModeToggle` (`apps/docs/src/color-mode-toggle.tsx`), a `ToggleGroup` labelled "Color mode" with Dark / Light / System. Where it renders depends on viewport: the header carries it at `breakpoints.WIDE` (≥48rem) and `apps/docs/src/site-footer.tsx` carries it below that — on the narrow production viewport the switch is in the footer, not the header. Preference persists in localStorage key `ultima-theme`.
- Each component MDX page embeds live demos from `apps/docs/src/demos/<item>/` inside `<figure>` elements, each followed by its source code and a Copy button.

## Verifying component state

- Components are Base UI primitives: pressed toggles carry `aria-pressed` and `data-pressed`; disabled carries `data-disabled`. Query `main figure button` in the console to inspect demo controls; `read_dom` output strips these attributes, so use `browser_console` + `getComputedStyle`/`getAttribute` for definitive state checks.
- Focus ring appears on `:focus-visible` (accent outline). Reach a demo toggle by clicking it once (sets focus), then press Tab to move to the next toggle with a visible ring.
- Accent tokens flip between light and dark modes; verify pressed/accent states in both via the "Color mode" control, then restore System.

## Production proof

- When production evidence is required, run `pnpm --filter @ultima/docs test:production`. It captures the checkout into `.scratch/verify/<run-id>/`, builds the docs in production mode there and runs every registered production case at 1280×720 and 390×844 in both modes: navigation and color mode, the catalogue and copy, Dialog, Studio history and Compare panes, the element fixture and Spinner under reduced motion. Each binding lives in `apps/docs/tests/production/<scenario-id>.ts` and its steps in `verification/scenarios/`. The report is `<run>/report.json`; per-case screenshots, failure traces and the server log are under `<run>/artifacts/production/`.
- A scoped run — `pnpm verify component <item>` or `pnpm verify feature <id>` — executes the same production cases inside a verification run alongside the checks its plan selects. A dev-server pass is never a substitute for either.
- Report prerequisites honestly: the production runner needs Chromium and a loopback port, and a missing one leaves the check unavailable (incomplete), not passed or failed.
