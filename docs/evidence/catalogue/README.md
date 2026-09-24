# Typed catalogue metadata

Evidence for [Validate typed catalogue metadata](https://github.com/frankieramirez/ultima/issues/450), slice B of [Build: Verified contributor infrastructure for Ultima](https://github.com/frankieramirez/ultima/issues/447), under [Component metadata and scaffolding](../../spec/agent-infrastructure.md#component-metadata-and-scaffolding).

## Identity

| Field | Value |
| --- | --- |
| Base revision | `166fe87` (main, "Name the copyright holder in the coming-soon footer (#510)") |
| Tested source revision | The commit that adds this file. The pull request names its SHA. |
| Tested docs UX revision | Not applicable: no shared docs source, Studio fixture or locator changed. |
| Implementer | Claude (Claude Code, Opus 5.5), in a session driven by @frankieramirez |
| Reviewer | Pending: the maintainer reviewing the pull request |

## What landed

- 77 data-only descriptors under `registry/metadata/<kind>/<id>.ts`: 54 `react`, 9 `element`, 2 `setup`, 2 `source-bundle`, 1 `artifact` and 9 `recipe`. Also `schema.ts` and `releases.ts`. The root typecheck checks every `satisfies`.
- `scripts/catalogue/`: the pure model (`model.ts`), the literal-only descriptor loader (`descriptors.ts`), the shared syntax-tree source analysis (`source.ts`) and a file scope (`files.ts`). `loadCatalogue` returns the joined catalogue and every diagnostic. It never reads a generated projection.
- `pnpm test` now starts with the catalogue suites (`node --test scripts/catalogue/*.test.ts`).

Existing consumers are unchanged. The registry build, docs site, barrel and CLI still read `registry/items.config.ts`, `apps/docs/src/components.ts`, `apps/docs/src/elements.ts` and `packages/ui/src/index.ts`. `scripts/catalogue/repository.test.ts` keeps the descriptors in agreement with those files until [#451](https://github.com/frankieramirez/ultima/issues/451) switches them to generated projections.

## Evidence

**Real repository.** `loadCatalogue` reports no diagnostic for the checkout.

`node --experimental-strip-types scripts/catalogue/compare.ts` compares the model with the #449 inventory captured at `d552fd1`:

```
catalogue: 68 registry items, 54 React entries, 9 element families, 438 public exports and 9 recipes agree with the baseline at d552fd1e518a4ea4d3615ff23d45b29d6bc6342a
```

That covers every registry item's title, description, install docs, npm dependencies and registry dependencies in their existing order (tokens and lib first). It also covers the docs catalogue's release order and visitor prose, and every element's tags, attributes, source-read values and example. For exports, it compares each component file's value and type exports and the barrel's full public set, `InputOTP` and the exported hooks included.

**Barrel reconciliation.** The migration step requires comparing the current barrel with the implementation exports before generation. The explicit exports of the 54 component files and the 438 re-exports in `packages/ui/src/index.ts` agree name for name, including `type` modifiers. A directly declared `export type` counts as a type export. No mismatch needed review.

**Fixtures.** `scripts/catalogue/fixture.ts` is an independent in-memory repository. It has a plain component with an aliased export, a compound with a hook and a behavior-composition import, a Zag React component, and a primary export that is not the id in Pascal case. It also has an element family, a setup item with a nested file, both source bundles, an artifact, a recipe with a local import, and a deliberately stale barrel. `model.test.ts` holds 89 cases: the valid catalogue per kind, plus one negative mutation for each rule:

- runtime imports, calls, spreads, getters, computed keys, identifiers and a missing `satisfies` in descriptors
- unknown and missing fields, wrong kind directory, id and file-name mismatch, non-kebab ids, unexpected descriptor files
- duplicate ids across kinds, duplicate releases, duplicate order within a release and among elements, undefined releases
- broken, missing and out-of-spec contract anchors, including a heading inside a code fence
- missing source, page, test, demo, element source and test, setup file, recipe demo and release file
- component source, page, element source, setup directory and setup file without metadata
- invalid primary exports (absent, type-only, re-exported import), `export *`, undeclared exports, duplicate public names
- relative sibling imports, the barrel, unknown components and helpers, computed dynamic imports, registry cycles, contributor tooling in installed source, a source-bundle import leaving its bundle
- unregistered, missing, non-root-first and computed tags, attributes outside the family, comma-joined names, missing and non-table enum symbols
- setup paths and install targets outside their areas, invalid hand steps, artifact outputs outside their producer, unknown producers
- recipe install guidance (the leak into the registry), missing sections, non-React pages, demos the page does not import, demos outside the page's directory, unknown barrel names, unresolved local imports

The same suite shows that the catalogue is identical whether the barrel and `registry/items.config.ts` are stale or absent. It also shows that a relative import of the barrel resolves through the in-memory plan. Breaking the duplicate-export and root-tag checks in the model fails exactly their two cases.

## Decisions taken within the contract

- **Setup install docs.** A setup record carries `handSteps` and `checks` rather than `installDocs`. Its registry `docs` are rendered from `handSteps` today ([#500](https://github.com/frankieramirez/ultima/pull/500)), so a separate `installDocs` would be a second owner of the same text.
- **Recipes.** Nine checklist recipes have records: React Hook Form (Field), Data Table and Chart (Table), Sheet (Dialog), Command dialog (Command), Carousel (Aspect Ratio), Item (Card), and Kbd and Typography (Code). Scroll Area's always-visible bar is called a recipe in its MDX but is not a checklist entry, so it has no record. The derived dependencies of Data Table match the specification's list: `table`, `button`, `checkbox`, `dropdown-menu`, `input`, `select` and `pagination`, plus `tokens` and `lib`.
- **Element values.** `ult-tabs` wrote its `orientation` and `dir` values inline. They are now the module-scope tables `ORIENTATIONS` and `DIRECTIONS`, so the descriptor can reference them. Behavior is unchanged, and the `ult-tabs` browser suite passes.
- **Dependencies.** Type-only imports still count toward an installed item's dependencies, as the registry build counts them today. Copied source needs those packages to typecheck. Each import keeps its `typeOnly` flag for the browser optimizer in #451.
- **Where analysis lives.** The shared source analysis is `scripts/catalogue/source.ts`, beside the model that consumes it. `packages/analysis` belongs to [#453](https://github.com/frankieramirez/ultima/issues/453), which builds its rules on this module rather than a second implementation.

## Validation

| Check | Outcome |
| --- | --- |
| `pnpm typecheck` | Passed. |
| Catalogue suites | 96 passed (89 fixture, 7 repository). |
| `pnpm --filter @ultima/elements test` | Passed on its own, all 12 files, `ult-tabs` included. |
| `pnpm test` | Failed in `@ultima/elements` with a Vitest browser disconnect ("Cannot connect to the iframe", "Browser connection was closed") before the UI and docs suites ran. The same command on a clean checkout of the base revision failed the same way, at `ult-meter`. The failure is not from this change, so the UI and docs suites were run separately below. |
| `pnpm --filter @ultima/ui test` | Incomplete: 108 of 108 executed tests passed, then the run stopped on the same browser disconnect (`toast` could not load, then `table` could not reach the iframe). This change touches no UI source. |
| `pnpm --filter @ultima/docs test` | Incomplete: its `registry:build` prerequisite passed, including element gzip budgets with the `ult-tabs` change. 81 of 81 executed tests passed, then the run stopped on the same disconnect at `data-table` and `theme-studio-parity`. |

The elements disconnect is reproduced on the base; the UI and docs stops show the same symptom but were not rerun there. The browser suites could not complete on this workstation, where other sessions share Chromium and a 79%-full `/tmp`. CI on the pull request is the complete run.
