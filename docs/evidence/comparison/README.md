# Efficiency and performance comparison

This directory holds the durable evidence for [Compare efficiency and performance](https://github.com/frankieramirez/ultima/issues/465), slice 18 of [Build: Verified contributor infrastructure for Ultima](https://github.com/frankieramirez/ultima/issues/447). It follows the measurement contract in [Efficiency and performance](../../spec/agent-infrastructure.md#efficiency-and-performance). Timing is report-only and gates nothing; this slice proposes no budget and makes no optimization claim.

[`results.md`](results.md) and [`comparison.json`](comparison.json) are generated from the raw files here by `scripts/measure/compare.ts`. This page explains what they contain and what they cannot show.

## Identity

| Field | Value |
| --- | --- |
| Baseline | `d552fd1e518a4ea4d3615ff23d45b29d6bc6342a`: `901e286` plus the measurement harness as uncommitted files, patch SHA-256 `744ab42ca01c3ab9814d186b5cbe74cbd2222868f6e8a654056dc4e75a9fac00`, the same tested revision as [`../baseline`](../baseline/) |
| Candidate | `580bf440b86c2d27353463caccf7057c6972994b`: `dabc230` plus this branch's paired-measurement commits, which touch only `scripts/measure/` |
| Harness | SHA-256 `8536826d97b13d376267f4d383a26797e9b234b894e9ca0f6ae3a897f9aab5f5` on every command and Studio series of both sides |
| Lockfile | SHA-256 `0d81ed7f53b3f8f339af91ba97eae74237861baec8279f9ef3f95645b6df59db` at the baseline, `6a6d4c2202ad90a65dfdf35bdbaddae5411adbfb240a6e8366e6c3d3cee843a1` at the candidate. They differ because main gained the CLI publish work and its dependencies between the revisions. |
| Studio fixtures | Set hash `146550b4d310a540208656ff95f897b140c4f9dcc6323aae19fe50ebec9ac562` at baseline, `53c46225b233710a2594ac1db769cf658fee28f616b89e1f1afa09f44cdd7f35` at candidate. `stock`, `customized` and `failing-contrast` are byte-identical across revisions; `max-overrides` differs (`0286b5e3c8c8` vs `e97195e26c32`) because that fixture follows the override schema, which grew. Each interaction compares only when its own fixture is byte-identical, so the seven `*-max` interactions report unavailable and the rest still compare. |
| Exercises | Disposable worktrees at `901e286` (baseline) and `dabc230` (candidate), no harness patch, per [`../baseline/exercise-plans.md`](../baseline/exercise-plans.md) |
| Implementer | Claude (Claude Code) and Devin sessions driven by @frankieramirez |
| Reviewer | Pending: the maintainer reviewing the pull request |

## Environment and runner

One local series, runner class `local:12th-Gen-Intel-Core-i7-12700F:20c:47g:unknown-power`, host `pc1`. Same machine and conditions as the baseline slice: Node v26.8.1, pnpm 10.33.0, Python 3.14.7, Playwright 1.63.0, Chromium 153.0.8010.12 headless, Omarchy Linux. One workload at a time on a shared workstation, load average roughly 2.5-4.6 across the batch, nothing throttled. Both checkouts, all run outputs and TMPDIR sat on the root disk under `~/.cache/ultima-measure/465`.

The baseline side is the same tested revision as the earlier slice, but every series here is a fresh paired run from 2026-09-24 rather than the earlier slice's samples. The two sides alternated within each pair.

## Command workloads

Five valid runs per side, workload and cache condition, alternating which side goes first; cold clears the `COLD_PATHS` from `scripts/measure/workloads.ts` before every sample. Every one of the twelve same-command comparisons came out slower beyond the larger MAD:

| Workload | Cold change | Warm change |
| --- | --- | --- |
| `dialog-edit` | +0.6 s | +0.6 s |
| `studio-history` | +2.5 s | +2.9 s |
| `token-edit` | +42.3 s | +45.2 s |
| `ult-button` | +1.0 s | +0.9 s |
| `setup-recipe` | +4.8 s | +7.6 s |
| `full-release` | +42.3 s | +45.2 s |

The candidate runs the identical argv on a heavier pipeline: `pnpm test` now covers `packages/analysis` and the verification suites, and `pnpm typecheck` covers the same additions. `token-edit` and `full-release` share argv and samples, so they show the same change. This is the cost of the added gates, priced in absolute seconds with raw series beside it; it buys the checks the effort added, and the report separates that cost from the new coverage below.

## New coverage and selected scope

Commands that exist only at the candidate. Each names the baseline workload it widens or selects from; none claims a faster suite.

| Command | Cost | Notes |
| --- | --- | --- |
| `pnpm verify <scope> --plan` | ~1.0 s | dialog, studio-history, ult-button, release scopes |
| `pnpm verify list` / `describe` | ~2.6 s for the five-call discovery workload | |
| `pnpm check:architecture` | ~3.2 s | |
| `pnpm catalogue:check` | ~0.8 s | already runs inside `dev`, `build`, `test`, `typecheck` |
| `pnpm verify component dialog` | ~166 s | runs the selected checks, not the suite |
| `pnpm verify feature theme-studio` | ~134 s | |
| `pnpm verify release` | all 10 measured runs failed | see below |
| `test:production` (26-cell matrix) | ~53 s | |

`pnpm verify release` is the one incomplete series. All ten sampled runs exited 1 after about four minutes inside their isolated `.scratch/verify/` snapshot: fourteen checks passed and `tooling-tests` failed on `production-gate.test.ts`, whose cases spawn a nested verification run that cannot complete the registered production checks inside that snapshot (`15 not_run`, `run selected checks []`). The same test files pass under `pnpm test` in the `full-release` workload on the same revision, so the failure is the nesting, not the gate logic. The retained `verify.log.gz` files show the full report. Scoped follow-up: [#551](https://github.com/frankieramirez/ultima/issues/551).

## Studio interactions

Four cells (dark/light x desktop/narrow), five browser-cold sessions of twenty measured sequences each, per the production Studio contract. The first batch resolved six interactions and left the rest inconclusive, so the noise screen ran its one complete repeat batch (`studio-repeat/`). Verdicts over both batches:

- **6 slower, 6 faster** where both batches or the first batch agree (for example `undo` slower +1.1 ms at dark-narrow, `preview-single` faster -1.7 to -2.9 ms at light cells).
- **30 inconclusive**: both batches within noise or unavailable.
- **14 unstable**: the first batch inconclusive and the repeat conclusive in one direction; the batches disagree, so no change is claimed.
- **28 unavailable**: the seven `max-overrides` interactions in all four cells, because that fixture differs between revisions (see Identity).

Application-observed update latency stays in the same 10-20 ms band on both sides for ordinary edits; nothing here supports or rules out a sub-frame regression. The seven `max-overrides` cells stay unavailable until a fixture set that is byte-identical on both revisions exists.

## Exercises

Three paired attempts per exercise, counterbalanced order, naive `claude-sonnet-5` sessions in disposable worktrees, plans in [`../baseline/exercise-plans.md`](../baseline/exercise-plans.md). Small-sample descriptive evidence only.

Discovery (wall seconds, owner located, scoped command valid):

| Prompt | Baseline | Candidate |
| --- | --- | --- |
| "Dialog Escape leaves focus behind" | 106, 19, 86; all `dialog.tsx`, all valid | 21, 15, 20; all `dialog.tsx`, all valid |
| "Reset theme undo lost my override" | 127, 125, 207; all valid owners, all valid | 111, 185, 147; valid owners; attempt 1's command exited 1 |
| "the picker broke" | 7, 12, 5; all `date-picker.tsx`, all valid | 7, 15, 10; all `date-picker.tsx`, all valid |

Five candidate attempts used `pnpm verify list`/`describe` for the lookup (dialog-escape 1, picker 1 and 3, reset-undo 1 and 2); the rest searched the tree directly, the same shape as baseline attempts.

Synthetic Stepper add/remove:

| Side | Attempt | Add wall | Manual projection edits | Removal |
| --- | --- | --- | --- | --- |
| baseline | 1, 2 | 16.7, 24.1 min | 5 and 9 hand edits across barrel, items.config, router, optimizer lists | clean, ~0.5 min |
| baseline | 3 | failed at 8.3 min | 8 | not clean |
| candidate | 1, 2 | 22.6, 21.8 min | 0 real edits; `pnpm scaffold` plus `catalogue:generate` regenerated all five projections | rebuilt clean; see scorer note |
| candidate | 3 | environment failure | 0 | environment failure |

Scoring disclosures, kept visible rather than rescored:

- candidate-1's two recorded "manual projection edits" are read-only `grep`/`sed` inspections of `vitest.config.ts` files; the scorer counts any shell command that touches a projection path. No candidate attempt edited a generated file.
- `removalClean` is false on candidate-1 and candidate-2 only because the scorer's stale-reference grep matches the committed baseline evidence under `docs/evidence/baseline/`, which names `synthetic-stepper` in the exercise plan and old records. `leftoverStatus` is empty and the rebuild passed on both.
- candidate-3 ran while the operator's agent CLI was at its weekly rate limit: the session exited 1 after one turn with `out_of_credits`, and the record is retained as a failed attempt. The baseline-side attempt 3 also failed its addition, so the paired set is two complete attempts on each side.

## Discovery through list and describe

All three fixed prompts resolve through `pnpm verify list` plus `describe` at the candidate: each returns the owning scenario or item, its route and a scoped command that passes. See `discovery.json` and the last table of [`results.md`](results.md).

## Aggregation checks

`node --experimental-strip-types --test scripts/measure/protocol.test.ts` runs the fixtures for summaries, pairing, exclusions, seeded regressions and unavailable states. The screen itself is exercised by the real `studio-repeat` batch in this directory: inconclusive first-batch verdicts resolve against the repeat, and disagreeing batches report `unstable`.

## Reproducing

```sh
# paired command workloads, alternating sides, into <dir>/batch-<n>
node --experimental-strip-types scripts/measure/pair.ts --baseline <co> --candidate <co> --workload <id> --cache cold|warm --out <dir>/batch-<n>
# Studio cells, one cell per run, into <dir>/studio[-repeat]/<side>/<cell>
node --experimental-strip-types scripts/measure/studio.ts --out <dir>/<batch>/<side>/<cell> --cells <cell>
# exercises and the discovery proof
node --experimental-strip-types scripts/measure/exercise.ts --exercise <id> --attempt <n> --revision <sha> --out <dir>/exercises
node --experimental-strip-types scripts/measure/discover.ts --out <dir>/discovery.json
# the report
node --experimental-strip-types scripts/measure/compare.ts --dir <dir>
```

Chromium diagnostic traces of one sequence per cell were captured on both batches but not committed (about 30 MB gzipped); [`studio/traces.sha256`](studio/traces.sha256) and [`studio-repeat/traces.sha256`](studio-repeat/traces.sha256) name them. Minified production builds have no source maps, so the traces cannot attribute work anyway.
