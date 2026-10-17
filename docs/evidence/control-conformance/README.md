# Control conformance at 43fd834

This directory holds the evidence for [Refresh Ultima reference-control conformance evidence](https://github.com/frankieramirez/mana/issues/102) (frankieramirez/mana#102), under mana's [project readiness plan](https://github.com/frankieramirez/mana/blob/383fa4b43e9c70479fe76a81629f6f19a9f3ca94/docs/plans/project-readiness.md). It reruns mana's portable control checker against Ultima's `pnpm verify` control at one named revision, statically and dynamically, in disposable snapshots.

It refreshes two older records. Mana's plan holds the 2026-09-24 inspection at `7b479d4` (9 errors and 3 warnings; one `verify feature dialog --json` run, incomplete with exit 3 in 139 seconds, its report lacking `contract`). [PR 556](https://github.com/frankieramirez/ultima/pull/556) then reported static conformance with 2 warnings and left `pnpm test` and dynamic conformance unrun. Those stay historical. Nothing below claims a pass that did not happen.

**Result.** Static conformance passes with the same 2 warnings. Every dynamic run is incomplete in this environment, because the locked Playwright Chromium is absent and an external registry host is denied by the egress proxy. The checker's baseline probe is therefore blocked, and so are break, restore and parallel. The break patch still applies and reverts exactly; its effect on the scenario could not be observed. The checker found four of its own gaps, listed under [Checker defects](#checker-defects-for-mana). They are reported to mana for a separate repair; nothing here changes the checker.

## Identity

| Field | Value |
| --- | --- |
| Tested revision | `43fd8346b0fc5589b95ba24006ff51e2acdd8ed7` (main, "Design pass: give Color Field's hue slider Slider's thumb (#910)"). Every run captured this HEAD with a clean index unless a row says otherwise |
| Source manifest at HEAD | SHA-256 `1b573d37c247307d7976e446f30887e162c9022233361499c340413fe7eb8d79`, 3033 files, as each clean run's report records it |
| Lockfile | `pnpm-lock.yaml` SHA-256 `5f39fa5c11210e15aefe108f8d214a6cb588032e30de9fa31376b69d8852a812` |
| Control pointer | `AGENTS.md`: `Control: .agents/skills/testing-ultima-docs/SKILL.md` |
| Control keys | `Command: node --experimental-strip-types scripts/verify.ts` (the body of the `pnpm verify` script), `Prepare: pnpm install --frozen-lockfile --offline`, `Features: verification/features`, `Scenarios: verification/scenarios`, `Bindings: packages, apps`, `Breaks: verification/breaks` |
| Checker | mana `383fa4b43e9c70479fe76a81629f6f19a9f3ca94` (plugin 0.43.0), `skills/leyline/scripts/conform.sh` SHA-256 `31ba9b797d97afbfd2831c37a332abd35814d4a269ecf55ab86ded5293be357a`. Byte-identical to the vendored `.agents/skills/leyline/scripts/conform.sh` here |
| Date | 2026-10-17, 22:21 to 22:56 UTC |
| Implementer | Claude (Claude Code, Opus 5.5), a worker session for @frankieramirez |
| Reviewer | Pending: the maintainer reviewing the pull request |

## Environment and prerequisites

| Prerequisite | Observed |
| --- | --- |
| Host | Linux 6.18.44 VM, 4 CPUs, 15 GiB RAM. Other agents' workloads shared the machine, so durations are indicative only |
| Node | v22.22.0 (`engines` asks for >=22) |
| pnpm | 10.33.0, the `packageManager` pin. The host's pnpm 10.28.0 switched to it on first use inside the repo |
| Python, git | Python 3.13.16, git 2.43.0 |
| Package store | Empty at first. `Prepare:` is offline, so it fails until a store holds all 343 packages. A dedicated store was seeded with `pnpm fetch --frozen-lockfile` (4 s, 254 MB; [`raw/store-seed.stdout`](raw/store-seed.stdout)) and passed to every later command as `npm_config_store_dir` |
| Chromium | **Missing.** Playwright 1.63.0 locks Chromium revision 1243 (153.0.8010.12) at `/opt/pw-browsers/chromium-1243/`. The host has only revision 1194 under `/opt/pw-browsers`. No browser was installed or substituted, so every check that needs Chromium is unavailable |
| Network | `registry.npmjs.org` resolves and installs work. `ui.shadcn.com` is refused by the egress proxy (403 on CONNECT), which stops the three `consumer-lint-*` scaffolds at `shadcn add` |
| Loopback port | Present |

## Results

Raw outputs are under [`raw/`](raw/), each run's report and logs under [`runs/`](runs/). Every saved control report was validated with `conform.sh report <report.json> --exit <actual exit>`; all five are valid ([`raw/report-check-*.json`](raw/)).

| # | Exercise | Command | Outcome |
| --- | --- | --- | --- |
| 1 | Static conformance | `bash conform.sh static <checkout>` | Conformant, exit 0. 11 features, 14 scenarios, 17 bindings, 1 break patch. Warnings: `dialog` and `motion` have empty `sourceRoots` because the CLI derives sources from catalogue items. [`raw/static.json`](raw/static.json) |
| 2 | Dynamic, empty store (missing prerequisite) | `bash conform.sh dynamic <checkout> --trust --feature dialog --timeout 900` | Checker exit 3. `prepare` blocked: `Prepare: exited 1`, 2.5 s. pnpm's reason, `ERR_PNPM_NO_OFFLINE_TARBALL`, went to stdout and is missing from the probe ([`raw/prepare-empty.stdout`](raw/prepare-empty.stdout), defect 1). [`raw/dynamic-1-empty-store.json`](raw/dynamic-1-empty-store.json) |
| 3 | Dynamic, seeded store | same, `--timeout 1800` | Checker exit 3 in 250 s. `prepare`, `list`, `describe` and `unknown` (exit 2) passed. `baseline` blocked: exit 3 after 239 s. `break` and `parallel` blocked because the baseline did not pass; no `restore` probe is printed. The checker keeps no run id or report from the baseline (defect 3). [`raw/dynamic-2-seeded.json`](raw/dynamic-2-seeded.json) |
| 4 | Baseline run | `verify feature dialog --json --output <dir>` | Run `20261017T222304-935c888d`, **incomplete, exit 3**, 216 s. Chromium `missing`. Passed: architecture (14 cases), catalogue-freshness (67), typecheck (8), registry-build (16), docs-build (19). The two checks that expect the dialog scenario, `ui-tests` (2 cases) and `production-scenarios` (4), are unavailable with 0 executed. 19 more consumer checks are unavailable for Chromium. The 3 `consumer-lint-*` checks are `failed` with failure kind `incomplete` after the denied `ui.shadcn.com` request; the run summary says nothing failed validation. 12 checks are outside the scope. [`runs/manual-baseline/report.json`](runs/manual-baseline/report.json) |
| 5 | Known break | `git apply verification/breaks/dialog.keyboard-dismissal.patch`, then the baseline command | The patch applies at HEAD (hunk offset 4 lines; [`raw/break-apply-check.txt`](raw/break-apply-check.txt)). Run `20261017T223153-5e523c19`, **incomplete, exit 3**, 548 s, with the same check outcomes as the baseline. No failed check names `dialog.keyboard-dismissal`, because the only checks that exercise it could not run. The break is not proven; it stays blocked. [`runs/manual-break/report.json`](runs/manual-break/report.json) |
| 6 | Restoration | `git apply -R` of the same patch, then the baseline command | The patch reverts and `packages/ui/src/dialog.tsx` returns to its pre-break SHA-256. Run `20261017T224110-e4a4d897`, **incomplete, exit 3**, 501 s. Restoration to HEAD bytes is proven by the manifest digest, which equals the baseline's. A passing restore is not established. [`runs/manual-restore/report.json`](runs/manual-restore/report.json) |
| 7 | Source attribution | read from the reports of rows 4 to 6 | Each report records `head` `43fd834`, the index digest and the manifest digest. The break run lists `packages/ui/src/dialog.tsx` as `modified`, `unstaged`, and its manifest digest is `737a740699dabe3657496b25df0d681c32840842d5ea1ee5a2163719627fcd5e`. The clean runs list no status entries and carry `1b573d37…` |
| 8 | Source change during a run | `verify feature first-screen --json`, appending a line to `CONTEXT.md` once the first check started | Run `20261017T224946-b4c20285`, incomplete, exit 3. `sourceChanged: true`, completion `changed` with digest `ef81ae2e…`, and the summary names the changed checkout. Chromium was also missing, so the field, not the exit code, distinguishes this case. [`runs/manual-source-change/report.json`](runs/manual-source-change/report.json) |
| 9 | Cancellation | the same command, SIGINT during `typecheck` | Run `20261017T225504-6749c3fc`, **cancelled, exit 130**, 53 s. Two checks `cancelled`, one `not_run`, the finished catalogue-freshness kept as passed. Cleanup reports no survivors and no errors. [`runs/manual-cancel/report.json`](runs/manual-cancel/report.json) |
| 10 | Blocked stays blocked under the judge | `conform.sh report` on altered copies of the row 4 report | Claiming `passed`/0 is rejected (`report.judge-prerequisite`, `report.judge-state`). Claiming a pass with `sourceChanged: true` adds `report.judge-source`. Deleting the manifest digest is rejected (`report.source`). Deleting `source.identity.head` is **accepted** (defect 4). [`raw/altered-reports/`](raw/altered-reports/) |

Discovery outputs from the same snapshot are retained as well: `list --json`, `describe feature dialog --json`, `describe scenario dialog.keyboard-dismissal --json`, the unknown-feature usage error (exit 2) and the dialog `--plan`.

## Preservation

- **Checkout.** [`raw/state.sh`](raw/state.sh) fingerprints HEAD, the index, `git status`, every tracked file and every untracked file. The tested checkout was identical before the first dynamic run, after each one, and at the end ([`raw/state-*.txt`](raw/)). Every run executed in a disposable `git worktree` or in the checker's own temporary worktree. The control's `--output` placed run directories outside both.
- **Worktrees.** The checker removed its worktree after each dynamic run. The two manual snapshots were removed with `git worktree remove` after the last run. The remaining worktree count includes one that belongs to a concurrent session.
- **Retained artifacts.** [`raw/retained-manifest.txt`](raw/retained-manifest.txt) lists SHA-256 for all 121 files the five runs retained. Every hash verified again after the snapshots were removed. This directory commits 107 of them. It leaves out the 5 `source-manifest.json` files and the 9 `consumer-lint-*/report.json` files, 10.5 MiB of per-file listings whose digests the reports already carry. Their hashes stay in the manifest.

## Launch profile and control instructions

The [launch profile](../../../.claude/launch.json) and the control skill describe two separate profiles. Neither was changed.

- `.claude/launch.json` defines one `docs` configuration: `pnpm --filter @ultima/docs dev --port 5174 --strictPort`, `port: 5174`, `autoPort: false`. It pins a strict port for an editor preview.
- The control skill's "Dev server" section describes `pnpm dev` at `http://localhost:5173`. That is Vite's default: `apps/docs/vite.config.ts` sets no `server.port`.
- Neither is a verification surface. Production proof binds loopback port 0 inside the runner, per [Agent infrastructure](../../spec/agent-infrastructure.md).

The ports differ because the profiles differ. A correction needs the maintainer to say which instruction should name which profile.

## Checker defects for mana

Reproduced at mana `383fa4b` with the synthetic fixture in [`checker/repro.sh`](checker/repro.sh) (`bash checker/repro.sh <conform.sh> <out-dir>`; outputs in [`checker/`](checker/)). They are reported for a separate mana repair; this pull request does not touch the checker.

1. **A blocked probe drops stdout.** `dynamic` keeps only a stderr tail for a probe that does not pass. pnpm prints `ERR_PNPM_NO_OFFLINE_TARBALL` on stdout, so row 2's blocked `prepare` says only `Prepare: exited 1`. Expected: the probe retains the tail of stdout and stderr, so a blocked prerequisite names its cause.
2. **An incomplete break run counts as a failed probe.** With a passing baseline and a break patch whose run returns a valid incomplete report (exit 3), the `break` probe is `failed` ("expected exit [1], got 3") and the checker exits 1. Expected: `blocked`, as for an incomplete baseline. An incomplete run under the patch establishes nothing about the control. Covered by none of mana's `test-leyline.sh` modes.
3. **Dynamic mode keeps no report.** The output records no run id, report path or report content for any probe, then removes its worktree with `--force`, taking any reports the control retained inside it. Expected: each feature probe records the run id and copies or links the report outside the worktree before removal, so challenge evidence survives teardown.
4. **A report without `source.identity.head` validates.** `check_report` treats a missing `head` key like an explicit `null`. The contract requires the field: a commit, or `null` outside git. Expected: `report.source` when the key is absent.

Minor: when the baseline is blocked, `dynamic` prints `break` and `parallel` as blocked but omits `restore`, so a reader cannot tell that restore was skipped.

## Observations about Ultima's control

These were observed and left unchanged; each needs its own ticket if wanted.

- `Prepare:` installs with `--offline`, so a machine with an empty pnpm store cannot prepare a fresh worktree. The run's own preparation uses `--prefer-offline` and worked.
- The `network` prerequisite probe resolves only `registry.npmjs.org`. A denied scaffold host (`ui.shadcn.com`) surfaced as three `failed` checks with failure kind `incomplete`, not as a missing prerequisite. The run status stayed incomplete, so nothing passed on it.

## Limits

- No dynamic probe passed, and no feature run passed. This establishes the control's honest incomplete, cancelled and source-changed reporting at `43fd834` in this environment. It does not establish that the dialog scenario detects its break.
- A complete challenge needs the locked Chromium revision 1243 and egress to `ui.shadcn.com`. With both, rerun rows 3 to 6 at the then-current revision.
- Durations come from one shared VM with other workloads running; they are not performance measurements.
