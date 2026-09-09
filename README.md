![Ultima wordmark with a cyan and violet crystal spell emblem](docs/assets/ultima-banner.svg)

A fantasy-themed design system built with React, Base UI, and StyleX. Ultima is being built around a shadcn-compatible registry so consumers can own the component source in their projects.

## Status

Ultima is in early development. The repo has semantic tokens with dark and light themes, a local docs application, and Button and Card authoring prototypes. The production component catalogue and registry generation pipeline are still being built. The main `@ultima/ui` entry point does not export components yet.

The [release roadmap](docs/spec/ultima.md#release-scope-and-core-coverage) tracks the planned scope. Installation examples in the docs describe the intended workflow; they are not a published release guide yet.

## What Ultima provides

| Area | In this repo |
| --- | --- |
| Design tokens | Semantic colors, typography, spacing, and motion in `packages/tokens`, with dark and light themes. |
| React components | Base UI and StyleX authoring prototypes in `packages/ui`; production components are planned. |
| Source registry | Registry items and setup prototypes for Vite and Next.js in `registry`; the complete distribution pipeline is planned. |
| Documentation | A Vite app in `apps/docs` for exploring the palette and tokens, with component documentation still in progress. |

## Local development

Use Node.js 22 or newer and pnpm 10.33.0. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite to explore the docs.

Other workspace commands:

```sh
pnpm build       # Build the docs application
pnpm typecheck   # Typecheck all workspace packages
```

Component tests run in Chromium. Install the browser once, then run the tests:

```sh
pnpm exec playwright install chromium
pnpm test
```

See the [component package guide](packages/ui/README.md) for browser test details.

## Documentation

- [Specification and release roadmap](docs/spec/ultima.md#release-scope-and-core-coverage)
- [Project glossary](CONTEXT.md)
- [Component package guide](packages/ui/README.md)
- [Architecture decisions](docs/adr)
