# Author guidance and release handoff

This directory holds the durable evidence for [Complete author guidance and release handoff](https://github.com/frankieramirez/ultima/issues/466), slice 19 of 19 of [Build: Verified contributor infrastructure for Ultima](https://github.com/frankieramirez/ultima/issues/447), under [Adoption and maintenance](../../spec/agent-infrastructure.md#adoption-and-maintenance). It records what shipped, the release runs at one named revision, and the obligations that remain open.

## Identity

| Field | Value |
| --- | --- |
| Base revision | `6030b6f` (main) |
| Tested source revision | `b24e222`, the guidance commit; all three release runs snapshot that tree. The commit adding this file lands on top and is documentation only |
| Tested docs UX revision | `6030b6f`. [Build: Docs site UX refinement](https://github.com/frankieramirez/ultima/issues/424) is open. This change touches no shared docs source, Studio fixture or locator; the testing skill's control-location guidance was verified against `color-mode-toggle.tsx`, `header.tsx` and `site-footer.tsx` at this revision |
| Implementer | Devin, in a session driven by @frankieramirez |
| Reviewer | Pending: the maintainer reviewing the pull request |

## What landed

- `docs/agents/canonical-examples.md`: the canonical-example index — Button, Dropdown Menu, Dialog, Date Picker, Toast, `ult-button`, `ult-tabs`, the `command-dialog` recipe, the `setup-vite`/`setup-next` setup items, and Studio history/export. Each entry names its contract anchor, source symbol, demo or fixture, and proof file; every cited path, symbol and anchor was validated against the tested revision.
- `skills/forge`: scenario/feature discovery through `pnpm verify list`/`describe` before touching behavior, the `pnpm check:architecture` and `pnpm catalogue:check` gates, scenario registration beside a behavior change, scoped versus full verification, and the corrected rule that an isolated rerun is diagnostic evidence and never overrides a failed required check. React scope and the eight-item proof bar are unchanged.
- `.agents/skills/testing-ultima-docs`: starts from `verify list`/`describe`, separates exploratory dev-server work from production proof, and corrects the stale claim that the mode control lives in the header — `ColorModeToggle` renders in the header at `breakpoints.WIDE` and in the site footer below it.
- `AGENTS.md`: indexes `docs/agents/` alongside the other layout entries.

## Clean-checkout exercise

The documented commands were exercised from a disposable worktree of the tested revision (`git worktree add`, `pnpm install`):

- `pnpm verify --help` lists the modes, per-check deadlines and the exit contract.
- `pnpm verify list --search "picker"` returns Date Picker as the top candidate with `packages/ui/src/date-picker.tsx`, route `/components/date-picker`, the `pnpm verify component date-picker` command and the catalogue-only caveat — matching the planned acceptance example.
- `pnpm verify describe scenario dialog.keyboard-dismissal` prints the contract anchor, routes, fixtures, preconditions, the three accessible steps, both bindings with case identities, and names the broader feature scope explicitly.
- `pnpm verify describe scenario bogus-id` exits 2 and lists the seven registered scenario IDs.
- Missing prerequisite: on a checkout without `pnpm install`, `pnpm verify` fails at module resolution (`ERR_MODULE_NOT_FOUND`), which the testing skill now documents as a missing prerequisite rather than a result.

## Release evidence at one revision

A passing complete report exists: `pnpm verify release` at `f6698af` (main after #558, #559 and #560) exited 0 with all fifteen checks passed — run `20260924T212435-3a98a78e`, retained under `.scratch/verify/`. An earlier run at `b49aa4f` also passed every check; its manifest carried one unstaged assertion-message edit, so `f6698af` is the clean one to cite.

Before the flake fixes landed, three full `pnpm verify release` runs against `b24e222` each failed on a different harness flake, all retained:

| Check | Run 1 `20260924T170917-2a7f90c8` | Run 2 `20260924T171842-dcdc3c6d` | Run 3 `20260924T172540-162fdde4` |
| --- | --- | --- | --- |
| architecture | passed | passed | passed |
| catalogue-freshness | passed | passed | passed |
| typecheck | passed | passed | passed |
| tooling-tests | passed (351) | failed — SIGINT cancellation test, marker ENOENT | passed (351) |
| analysis-fixtures | passed | failed — `source.test.ts` aborted mid-file | passed (141) |
| palette | passed | passed | passed |
| tokens-tests | passed | passed | passed |
| ui-tests | failed — `context-menu.test.tsx` iframe disconnect, `radio-group.test.tsx` module fetch | failed — `color-field.test.tsx` | failed — `collapsible.test.tsx` |
| elements-tests | passed (251) | passed (251) | passed (251) |
| docs-tests | failed — 1 assertion flake (`theme-studio-export` busy announcement) plus module-fetch flakes | failed — `not-found.test.tsx` | failed — `kicker.test.tsx` |
| cli-tests | passed (249) | passed (249) | passed (249) |
| registry-build | passed | passed | passed |
| docs-build | passed | passed | passed |
| consumer-smoke | passed (39) | passed (39) | passed (39) |
| production-scenarios | passed — all 26 cells | passed — all 26 cells | passed — all 26 cells |

Every failure was an infrastructure flake, not a contract violation: the Vitest browser orchestrator lost a test file's iframe (`Cannot connect to the iframe`) or a module fetch, the SIGINT cancellation test raced run preparation, and one production-runner cell died on a browser that never started. The failing file moved each run, and the same signature reproduced outside the snapshot. Filed as [#554](https://github.com/frankieramirez/ultima/issues/554); fixed by #557, #559 and #560, and the retained `f6698af` run above is the passing report those fixes enabled.

## CI and enforcement

Not confirmed — unchanged from [#464](https://github.com/frankieramirez/ultima/issues/464)'s closing record, re-verified read-only on 2026-09-24: `repos/frankieramirez/ultima/branches/main/protection` returns 404, `rules/branches/main` is `[]`, and Actions jobs do not start ("recent account payments have failed or your spending limit needs to be increased" on both `check` and `production`). The four maintainer actions stand: fix billing, re-run CI on a merged commit, add a `main` ruleset requiring `check` and `production`, confirm with `gh api`. Local success cannot substitute for pending remote checks, so this obligation stays open and the build effort cannot close with the gap unresolved.

## Disposition by area

| Area (Completion evidence) | Disposition |
| --- | --- |
| Architectural enforcement | `architecture` green in all three runs at `b24e222`; per-family slice evidence in #453, #454, #455, #456 |
| Metadata and authoring | `catalogue-freshness` green in all three runs; scaffold and generation evidence in `../catalogue/` |
| Repeatable verification | The run lifecycle, isolation, locks and honest failure states all exercised by these runs — including `incomplete` classification doing its job on the flakes |
| Production and scenarios | 26/26 production cells green in all three runs; consumer smoke green (Vite, Next.js, sidebar, element). CI enforcement **open** above |
| Efficiency and responsiveness | Measured in #465 (`../comparison/`): every same-command workload slower beyond the noise, priced as the cost of the added gates |
| Maintained conventions | This slice: the index, the skill updates, the exercised commands, the filed flake ticket |

## Open obligations and deferrals

- **Passing release report** (resolved after this file first landed): the flake surface was fixed by #557 (Chromium garbage collection between browser test files), #559 (SIGINT test waits for the check to start) and #560 (retry a browser that never started); #554 is closed. The retained passing run is named above.
- **CI enforcement** (in scope, unresolved): maintainer actions on billing and the `main` ruleset, per #464.
- **#551**: its symptom no longer reproduces — `tooling-tests`, including `production-gate.test.ts`, passed in runs 1 and 3 — consistent with the snapshot Git work-tree fix in #545. Confirm and close.
- **Optional deferrals**: Forge stays a React authoring skill — element files remain hand-authored against the Web components contract and parity gate, by spec. No Studio download/share-link scenario until that behavior is the subject of a change ([Pilot and reuse](../../spec/agent-infrastructure.md#pilot-and-reuse)).
- **Correction-to-proof ownership**: recurring mistakes file a maintenance ticket naming the smallest reproduction and violated contract; the fix is a type constraint, a precise rule, a scenario or a repaired example — not duplicated prose. `canonical-examples.md` owns exemplar drift and is revisited when a listed contract changes.
