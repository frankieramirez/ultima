# Generated catalogue wiring

Evidence for [Generate catalogue wiring and migrate consumers](https://github.com/frankieramirez/ultima/issues/451), slice C of [Build: Verified contributor infrastructure for Ultima](https://github.com/frankieramirez/ultima/issues/447), under [Generated wiring](../../spec/agent-infrastructure.md#generated-wiring) and [Generation and freshness](../../spec/agent-infrastructure.md#generation-and-freshness).

## Identity

| Field | Value |
| --- | --- |
| Base revision | `5198e47` (main, "Validate typed catalogue metadata (#511)") |
| Tested source revision | The commit that adds this file. The pull request names its SHA. |
| Tested docs UX revision | `5198e47`. [Build: Docs site UX refinement](https://github.com/frankieramirez/ultima/issues/424) is open, and all ten of its tickets (#425–#434) were open and unassigned when this change was tested on 2026-09-24. This change touches no docs UX behavior. It edits `router.tsx` only to import the page map, and edits no Studio fixture or locator. [#429](https://github.com/frankieramirez/ultima/issues/429) will edit the breadcrumb in the same `ComponentNamePage`, so whichever lands second needs a rebase. |
| Implementer | Claude (Claude Code, Opus 5.5), in a session driven by @frankieramirez |
| Reviewer | Pending: the maintainer reviewing the pull request |

## What landed

- `scripts/catalogue/projections.ts` plans the six owned outputs from the catalogue model in memory. `scripts/catalogue/browser.ts` derives the browser-test optimizer sets. `scripts/catalogue/optimizer-policy.ts` is the authored policy for those sets, and every entry in it carries a reason and a source.
- `pnpm catalogue:generate` and `pnpm catalogue:check` run `scripts/catalogue/generate.ts`. Its `provenance` command names the file behind each optimizer entry. Its `--out <dir>` option is the comparison mode.
- The committed outputs are `registry/items.config.ts`, `packages/ui/src/index.ts`, `apps/docs/src/generated/{catalogue,component-pages,elements}.ts` and `scripts/generated/browser-dependencies.ts`. Each starts with the ownership header.
- The consumers switched:
  - `apps/docs/src/components.ts` and `elements.ts` are now thin adapters.
  - `router.tsx` imports the page map. A registered page with no module now renders the not-found route instead of the placeholder.
  - Both Vitest configs import their include list.
  - `scripts/build-registry.ts` takes items, prose, npm dependencies and registry edges from the model. Its regex import scan and its reads of `items.config.ts` are gone.
  - `packages/elements/scripts/build.ts` builds the model's validated family inventory. It no longer lists the directory.
- `scripts/catalogue/preflight.ts` is the shared preflight. It runs the read-only check and then its command, which inherits `ULTIMA_CATALOGUE_FRESH=1`, so nested package scripts skip a repeated check. It never generates. It wraps these scripts:
  - root: `dev`, `build`, `test`, `typecheck` and `registry:build`
  - `@ultima/ui`: `test` and `typecheck`
  - `@ultima/docs`: `dev`, `build`, `test` and `typecheck`

  CI runs `pnpm catalogue:check` before typecheck.

## Comparison mode

Before any consumer switched, `node --experimental-strip-types scripts/catalogue/generate.ts --out <tmp>` planned all six files into a scratch directory. They were then compared with the committed hand-written files:

```
same: registry items (title, description, docs, element registryDependencies)
same: setup items (dependencies, devDependencies, handSteps, checks)
same: release order
same: release labels
same: docs catalogue order, names, slugs, visitor prose and releases
same: element catalogue presentation, in docs family order
same: UI barrel: public names, owning files and type modifiers
same: component page map: route slug to MDX module
ui optimizer: all 40 current entries kept; added @stylexjs/stylex, axe-core, vitest-browser-react
docs optimizer: all 56 current entries kept; added @zag-js/date-picker, d3-array, d3-format, d3-scale, embla-carousel-react
```

The committed barrel's 438 public symbols agree with the implementation exports name for name, `type` modifiers included, so no reconciliation was needed. The barrel is now grouped per component in id order rather than authoring order; its public set is unchanged. `node --experimental-strip-types scripts/catalogue/compare.ts` still reports agreement with the #449 inventory at `d552fd1`: 68 registry items, 54 React entries, 9 element families, 438 public exports and 9 recipes.

The first real run used `--adopt registry/items.config.ts --adopt packages/ui/src/index.ts`. Without that flag the generator refuses to replace an owned path that holds an authored file. The pull request diff for those two files is the reviewed conversion.

## Registry and element equivalence

`pnpm registry:build` ran on the base revision and again after the switch, both at the same `HEAD` so the stamps carry the same revision. `diff -r` found no difference in any of these:

- `registry/registry.json`
- the staged `registry/ultima/`
- the served `apps/docs/public/r/*.json`
- `apps/docs/public/llms.txt`
- the element bundles in `apps/docs/public/elements/`

That covers titles, descriptions, install docs, dependency and registry-edge order, artifact stamps and `meta.ultima` hashes. The element build still enforces its gzip budgets (`ult-button` 3.7 of 5 KB, `ult-tabs` 16.2 of 17, `ult-tooltip` 25.0 of 26, `ultima.js` 36.9 of 40). The build's `verifyStamps` passed, so the served, staged and embedded element artifacts agree.

## Optimizer sets

Discovery follows each project's tests and setup files through local imports, `@ultima/*` package exports, the in-memory barrel and page plan, MDX imports and literal `import.meta.glob` calls. It skips type-only imports, `?raw` and other queries, `node:` builtins and non-code assets. Each candidate must be declared by the workspace package whose file imports it. Otherwise it fails as `unresolved-dependency` and names the importer.

The policy keeps `react` out of both sets, because `@vitejs/plugin-react` prebundles it. It keeps `vitest` and `vitest/browser` out, because Vitest serves them itself. It adds `react-dom/client` to docs, because `vitest-browser-react` imports it late. A policy entry that discovery already covers, or that names nothing discovered, fails as `stale-policy`.

No current entry was dropped. The additions are real runtime imports of the tests: `@stylexjs/stylex`, `axe-core` and `vitest-browser-react` in UI, and the chart, carousel and date-picker packages in docs. The docs set already prebundled the first three. On a cold `node_modules/.vite`, `DEBUG=vite:deps` reported "the scanner found every used dependency", with no dependency discovered mid-run.

## Fixtures

`scripts/catalogue/generate.test.ts` has 19 cases. They build an independent fixture from `fixture.ts` plus two browser projects. The expected barrel, page map, release order, element values and optimizer sets are written out by hand, not derived from the catalogue:

- planning is identical with the projections absent, stale or current
- generation with every projection absent writes all six, and a second run writes nothing and leaves every byte unchanged
- an invalid input (a duplicate order) writes nothing
- an authored file at an owned path is refused until adopted
- `check` reports an added, a changed and a stale path without touching them
- an input edited during generation, and a new input file appearing, both abort with nothing written
- a held lock refuses a second generation and leaves the lock in place
- a failed write partway (the target is a directory) reports the three paths written and the three not written, and `check` keeps failing afterwards
- an undeclared import is rejected, and stale policy entries are rejected

Each of these mutations fails exactly the cases meant to catch it:

- removing the input recheck (2 cases)
- the authored-file guard (1)
- the exclusive lock (1)
- the stale-path report (1)
- the invalid-input abort (1)
- the declared-dependency check (1)
- counting type-only imports, or following `?raw` globs (9 and 10 cases)

`apps/docs/src/__tests__/components.test.ts` no longer repeats the full catalogue order. It checks that each release is one contiguous run in release order, and keeps the manifest, page and demo reference checks. `scripts/catalogue/repository.test.ts` checks the committed wiring byte for byte through `check`, in place of its four agreement tests.

## Freshness preflights

`apps/docs/src/generated/catalogue.ts` was given one hand-edited line. Every wrapped entry point then exited 1 with `catalogue: the generated wiring is stale`, and the hand edit was still on disk afterwards:

- `pnpm catalogue:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dev` and `pnpm registry:build`
- `pnpm --filter @ultima/ui test` and `pnpm --filter @ultima/ui typecheck`
- `pnpm --filter @ultima/docs dev`, `build`, `test` and `typecheck`

```
catalogue: the generated wiring is stale; run `pnpm catalogue:generate` (remove a stale path by hand)
  changed: apps/docs/src/generated/catalogue.ts
```

## Validation

| Check | Outcome |
| --- | --- |
| `pnpm catalogue:check` | Passed: 6 generated files are fresh. |
| `pnpm typecheck` | Passed. |
| Catalogue suites (`node --test scripts/catalogue/*.test.ts`) | 113 passed. |
| `pnpm registry:build` | Passed, byte-identical to the base build (above). |
| `pnpm --filter @ultima/ui test` | Failed with the Vitest browser disconnect recorded in [README](README.md#validation): "Failed to fetch dynamically imported module", then "Cannot connect to the iframe", after two or three files. The base revision's optimizer list failed the same way on two cold runs here. |
| UI suite, one file per Vitest run | 55 of 55 files, 749 tests passed. This is diagnostic coverage. It does not replace the full run. |
| Docs suite, one file per Vitest run | 24 of 25 files, 518 tests passed. `surfaces.test.ts` fails on `src/coming-soon.tsx`, from #509. A clean worktree at `5198e47` fails the same assertion. |
| `scripts/smoke-install.sh` | Passed: "every target passed" for the Vite, Next.js, Sidebar and element targets against the local registry and production docs build. Each React target installed all 60 stamped files, built, and passed `doctor`, `status` and `diff`. The first attempt ran out of `/tmp` quota during the Next.js install, so the rerun used `TMPDIR` under the home directory. |
| `pnpm --filter @ultima/docs build` (inside the smoke) | Passed with the preflights, production Vite build. |

The full browser suites could not complete on this workstation. CI on the pull request is the complete run, and its result is the one that counts.
