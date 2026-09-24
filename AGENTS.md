## Principles

Read the [Principles](docs/spec/ultima.md#principles) section of the specification before touching anything. It holds what decides the next choice.

Contributor-tooling plans and rollout live in [Agent infrastructure](docs/spec/agent-infrastructure.md). Its proposed commands become usable when their implementation lands.

## Layout

- `packages/tokens` — the token sources and themes, the palette generator, and the generated `dist/tokens.css` and `dist/tokens.json`.
- `packages/ui` — one file per component in `src/`, the shared helper types in `src/lib/`, the tests in `src/__tests__/`.
- `apps/docs` — the docs site, its MDX content, and the demos its component pages render.
- `registry/` — build output, apart from the authored `static/` and `metadata/` (one descriptor per item) and the generated `items.config.ts`.
- `packages/analysis` — the architecture checker's engine: scopes, rules, the dependency and runtime-variable policy, the value grammar, typed exceptions in `exceptions.ts`, and deliberately invalid fixtures under `fixtures/`.
- `verification/` — feature and scenario records, one JSON file each; `scripts/verification/` validates them and holds the registration helpers.
- `scripts/catalogue/` — the catalogue model and the generator for the committed wiring: `registry/items.config.ts`, `packages/ui/src/index.ts`, `apps/docs/src/generated/` and `scripts/generated/`.
- `skills/` — Ultima's own agent skills; [`forge`](skills/forge/SKILL.md) authors and revises a component.

## Rules that are easy to break

- [One file per component](docs/spec/ultima.md#one-file-per-component), and one registry item of the same name.
- [The `style` slot, and no `className`](docs/spec/ultima.md#props-every-component-accepts).
- [No raw values in component code](docs/spec/ultima.md#tokens-in-component-code); a new need becomes a new token.
- [Palette values come from the generator](docs/spec/ultima.md#generation-recipe) and are never hand-edited.
- [`registry/` is regenerated](docs/spec/ultima.md#generation) by `pnpm registry:build`.
- [Generated wiring is never hand-edited](docs/spec/agent-infrastructure.md#generated-wiring): change a descriptor or the source, then `pnpm catalogue:generate`.
- [Tests live in `packages/ui/src/__tests__/`](docs/spec/ultima.md#what-a-build-ticket-proves), never beside the component.

## Commands

| Command | Runs |
| --- | --- |
| `pnpm install` | Install the workspace. |
| `pnpm dev` | The docs site, in development. |
| `pnpm build` | Every package, the registry, and the docs site. |
| `pnpm test` | The Vitest suites, including the axe sweep. |
| `pnpm typecheck` | Typecheck every package. |
| `pnpm registry:build` | Regenerate `registry/`, `/r/*.json`, the token exports, and `/llms.txt`. |
| `pnpm catalogue:generate` | Rewrite the generated wiring from `registry/metadata/` and the sources. |
| `pnpm check:architecture` | The static architecture check: source layout, import boundaries, primitive sources, token values, the styling engine, the public `style`-slot API and registry metadata. `--format json` for the versioned report. Exit 1 on a violation, 2 on an invalid or incomplete run. |
| `pnpm catalogue:check` | Fail on stale generated wiring or an invalid feature map, read-only. `dev`, `build`, `test`, `typecheck` and `registry:build` run it first. |
| `pnpm scaffold <kind> <id> --from <request.json>` | Plan a React, element or recipe item as a dry run; `--write` creates its files, never over existing ones, and regenerates the wiring. |
| `pnpm verify list [--search <text>]` | Discover features, scenarios and catalogue items, read-only. `describe scenario <id>` and `describe feature <id>` give owners, routes, steps and commands. |
| `pnpm verify component\|feature\|changed\|release --plan [--json]` | The ordered check plan for a scope, read-only: selection with reasons, prerequisites, locks and deadlines. `changed` defaults to `--base origin/main`, never fetches, and broadens to release when the base or a dependency is unknown. Reports `planned`, never a pass. Without `--plan` a mode runs in an isolated snapshot under `.scratch/verify/<run-id>/` and writes `report.json`; no check adapter is registered yet, so it exits 3 with every check `unavailable`. |
| `python3 packages/tokens/scripts/palette.py` | Regenerate `palette.json`; `--check` fails on a hand edit. |

## Agent skills

Issue tracker: GitHub frankieramirez/ultima. See `docs/agents/issue-tracker.md`.
Roadmap: https://github.com/frankieramirez/ultima/issues/161
Validation: `pnpm test`
