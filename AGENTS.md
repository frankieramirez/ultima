## Principles

Read the [Principles](docs/spec/ultima.md#principles) section of the specification before touching anything. It holds what decides the next choice.

## Layout

- `packages/tokens` — the token sources and themes, the palette generator, and the generated `dist/tokens.css` and `dist/tokens.json`.
- `packages/ui` — one file per component in `src/`, the shared helper types in `src/lib/`, the tests in `src/__tests__/`.
- `apps/docs` — the docs site, its MDX content, and the demos its component pages render.
- `registry/` — build output, apart from `static/` and `items.config.ts`.
- `skills/` — Ultima's own agent skills; [`forge`](skills/forge/SKILL.md) authors and revises a component.

## Rules that are easy to break

- [One file per component](docs/spec/ultima.md#one-file-per-component), and one registry item of the same name.
- [The `style` slot, and no `className`](docs/spec/ultima.md#props-every-component-accepts).
- [No raw values in component code](docs/spec/ultima.md#tokens-in-component-code); a new need becomes a new token.
- [Palette values come from the generator](docs/spec/ultima.md#generation-recipe) and are never hand-edited.
- [`registry/` is regenerated](docs/spec/ultima.md#generation) by `pnpm registry:build`.
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
| `python3 packages/tokens/scripts/palette.py` | Regenerate `palette.json`; `--check` fails on a hand edit. |

## Agent skills

Issue tracker: GitHub frankieramirez/ultima. See `docs/agents/issue-tracker.md`.
Validation: `pnpm test`
