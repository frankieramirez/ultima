<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="apps/docs/public/brand/ultima-logo-light.svg">
    <img src="apps/docs/public/brand/ultima-logo-dark.svg" alt="--ultima: wordmark" width="420">
  </picture>
</p>

<p align="center">
  Tokens and React components on Base UI and StyleX, installed as source through a shadcn registry.
</p>

<p align="center">
  <a href="https://github.com/frankieramirez/ultima/actions/workflows/ci.yml"><img src="https://github.com/frankieramirez/ultima/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/frankieramirez/ultima/actions/workflows/smoke-install.yml"><img src="https://github.com/frankieramirez/ultima/actions/workflows/smoke-install.yml/badge.svg" alt="Smoke install"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-171717.svg" alt="MIT license"></a>
</p>

Ultima is a design system for React projects that compile StyleX. The shadcn CLI copies each component's source into your project, and you own it from there. Dark is the default color mode. Light is a full peer: every semantic token, contrast check, and demo exists in both.

Ultima has no version number. The registry serves the latest build, and every installed file carries a stamp the `ultima-design` CLI reads for drift.

## Install

Vite:

```bash
npx shadcn add https://ultima.systems/r/setup-vite.json
npx shadcn add @ultima/button
```

Next.js App Router:

```bash
npx shadcn add https://ultima.systems/r/setup-next.json
npx shadcn add @ultima/button
```

The setup item writes `components.json` and the StyleX compiler config, and never overwrites a file your scaffold already owns. Installing Button pulls in the tokens and the shared component helpers. The steps you still do by hand are on the [install page](https://ultima.systems/install).

```tsx
import { Button } from '@/components/ui/button';

<Button variant="solid" size="md" tone="accent">Save</Button>
```

## What ships

- **Fifty-four components**, one file each, from Button and Field to Combobox, Sidebar, and Toast. See the [catalogue](https://ultima.systems/components).
- **Tokens** for color, space, radius, type, and motion, as StyleX variables. Six twelve-step palette scales with a dark and a light value per step. See [tokens](https://ultima.systems/tokens) and the [palette](https://ultima.systems/palette).
- **Tokens as CSS** at [`/tokens.css`](https://ultima.systems/tokens.css), for consumers that cannot run StyleX.
- **An agent guide** at [`/llms.txt`](https://ultima.systems/llms.txt): principles, conventions, component list, and token names in one plain Markdown file. Ultima installs no documentation into your repository, so this is how a consumer's agent learns the system.
- **The registry** at [`/r/registry.json`](https://ultima.systems/r/registry.json), one item per component.
- **Elements** at [`/elements/ultima.js`](https://ultima.systems/elements/ultima.js): the report set as custom elements for hosts that cannot run React. Each element also ships as a registry item: `ult-badge`, `ult-button`, `ult-card`, `ult-code`, `ult-meter`, `ult-stat`, `ult-table`, `ult-tabs`, and `ult-tooltip`.
- **The `ultima-design` CLI**, which verifies your setup, checks your edits against the consumer rules, and reports installed items' drift. See the [CLI page](https://ultima.systems/cli).

## How it is built

- Components take a `style` slot of StyleX styles and have no `className`. There is no second styling system to fall back to.
- Tokens are the only source of raw values. A literal in component code is a bug, and a new need becomes a new token.
- Semantic token names are stable. You re-skin at the semantic layer and nothing renames underneath you.
- Contrast is a build gate. Every pairing passes WCAG 2.2 AA in both modes or the palette does not ship. APCA is reported beside the pairings.
- The fantasy theme lives in the brand layer only: the name, the six scale names (mithril, arcane, mana, verdant, ember, ruin), page titles, and the 404. Component, part, prop, and semantic token names stay conventional.

The [rationale](https://ultima.systems/rationale) page and the [ADRs](docs/adr) hold the reasoning. The [specification](docs/spec/ultima.md) holds the rules.

## Stack

- [Base UI](https://base-ui.com) for the primitives.
- [Zag.js](https://zagjs.com) for the element primitives, bundled inside each vendored artifact.
- [StyleX](https://stylexjs.com) for styling.
- A [shadcn](https://ui.shadcn.com/docs/registry) registry for distribution.
- Vite and TanStack Router for the docs site, which also serves the registry, the token exports, and the agent guide.

## Repository

```text
apps/docs          The docs site, its MDX content, and the component demos.
packages/analysis  The architecture checker's engine: scopes, rules, and the dependency policy.
packages/cli       The ultima-design consumer CLI: install, doctor, check, status, diff.
packages/elements  The custom-element re-implementations and the bundle the registry serves.
packages/tokens    Token sources, themes, the palette generator, and the generated tokens.css and tokens.json.
packages/ui        One file per component in src/, shared helper types in src/lib/, tests in src/__tests__/.
registry/          Build output, apart from the authored static/ and metadata/ descriptors.
scripts/           The catalogue generator, the registry build, verification helpers, and smoke-install.
skills/            Ultima's own agent skills. forge authors and revises a component.
verification/      Feature and scenario records, one JSON file each.
docs/              The specification, ADRs, and research notes.
```

## Develop

Requires Node 22 or later and pnpm 10.

| Command | Runs |
| --- | --- |
| `pnpm install` | Install the workspace. |
| `pnpm dev` | The docs site, in development. |
| `pnpm build` | Every package, the registry, and the docs site. |
| `pnpm test` | The Vitest suites, including the axe sweep. |
| `pnpm typecheck` | Typecheck every package. |
| `pnpm registry:build` | Regenerate `registry/`, `/r/*.json`, the token exports, and `/llms.txt`. |
| `python3 packages/tokens/scripts/palette.py` | Regenerate `palette.json`. `--check` fails on a hand edit. |
| `scripts/smoke-install.sh` | Install every setup target from the registry and build it. |

Read the [principles](docs/spec/ultima.md#principles) before changing anything. [AGENTS.md](AGENTS.md) lists the rules that are easy to break.

## Brand

The wordmark is `--ultima:` in IBM Plex Mono SemiBold, with a compact `u:` mark for icons. The identity uses neutral ink and paper; color belongs to the components and themes. [Brand guidelines](docs/brand.md) cover the SVG and PNG exports, social image, avatar, and regeneration command.

## Related

[mana](https://github.com/frankieramirez/mana) is the audit toolkit whose report is the first consumer of the tokens CSS export.

## License

[MIT](LICENSE)
