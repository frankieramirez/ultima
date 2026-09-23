# Efficiency baseline and migration inventory

This directory holds the durable evidence for [Capture baselines and migration inventory](https://github.com/frankieramirez/ultima/issues/449), slice A of [Build: Verified contributor infrastructure for Ultima](https://github.com/frankieramirez/ultima/issues/447). It follows the measurement contract in [Efficiency and performance](../../spec/agent-infrastructure.md#efficiency-and-performance). It records the revision before any contributor-tooling change, so later slices can compare against it. It proposes no budget and claims no speedup; timing stays report-only.

[`results.md`](results.md) and [`baseline.json`](baseline.json) are generated from the raw files here by `scripts/measure/report.ts`. This page explains what they contain and what they cannot show.

## Identity

| Field | Value |
| --- | --- |
| Before revision | `901e286ff3539325ba485ae8bd0ecf35684a9b2e` (main, "Hook entries in install and uninstall (#507)") |
| Tested source revision | `d552fd1e518a4ea4d3615ff23d45b29d6bc6342a`: the before revision plus the measurement harness only |
| Harness patch | `git diff 901e286 d552fd1`, SHA-256 `61839611b13697beee31609244e88591ff7376dff4d7c40b871566975aea471c`. It adds `scripts/measure/` and a root `playwright@1.63.0` devDependency, the version already locked for the docs; the lockfile gains three importer lines and no packages. |
| Harness tree hash | `c66d38c9d5f3776828310f781180666171f9681faba88a82e5f8a5443fc380e5` for every command and Studio series. The discovery exercises ran at `1dcc0ba`, which changed only exercise scoring and report reading; each exercise record carries its own harness hash. |
| Lockfile at the tested revision | SHA-256 `0d81ed7f53b3f8f339af91ba97eae74237861baec8279f9ef3f95645b6df59db` |
| Studio fixtures | Set hash `146550b4d310a540208656ff95f897b140c4f9dcc6323aae19fe50ebec9ac562`; per-fixture hashes and contents in [`studio/studio-fixtures.json`](studio/studio-fixtures.json) |
| Tested docs UX revision | `901e286`. Every ticket of [Build: Docs site UX refinement](https://github.com/frankieramirez/ultima/issues/424) (#425–#434) was open on 2026-09-23. [#431](https://github.com/frankieramirez/ultima/issues/431) changes the Studio preview canvas, so its landing makes the Studio workload a new version that needs a new comparable pair. |
| Implementer | Claude (Claude Code, Opus 5.5), in a session driven by @frankieramirez |
| Reviewer | Pending: the maintainer reviewing the pull request |

## Environment and runner

One local series, runner class `local:12th-Gen-Intel-Core-i7-12700F:20c:47g:unknown-power`.

| Field | Value |
| --- | --- |
| Machine | Intel i7-12700F, 20 logical CPUs, 47 GiB RAM, Linux 7.2.5 (Omarchy). The platform profile read `performance` from a shell at the start of the session, but the harness could not read sysfs from its sandbox and recorded it as unknown. |
| Runtimes | Node v26.8.1 (CI uses Node 22), pnpm 10.33.0, Python 3.14.7, Playwright 1.63.0, Chromium 153.0.8010.12 headless |
| Concurrency | One workload at a time, phases serial. The host is a shared workstation. Other projects' processes kept the load average between 2.3 and 3.6 during the batch. Nothing was throttled. |
| Filesystem | The measurement worktree, its outputs and every run-owned TMPDIR sit on the root disk under `~/.cache/ultima-measure/449`. |
| Setup cost | `pnpm install --frozen-lockfile` 0.9 s against a warm store; `playwright install chromium` 0.5 s, a verification of already-cached binaries rather than a download. See [`setup/`](setup/). |

A first attempt at this batch ran in a tmpfs `/tmp` and stopped when the smoke install's consumer apps hit its quota. Its series were discarded, and every series here comes from the on-disk rerun. The same quota also explains a failure reported early in this ticket's session: the full `packages/ui` suite failing with "Cannot connect to the iframe" was the session's tmpfs TMPDIR, not the repository. With TMPDIR on disk the suite passed 55/55, and `pnpm test` passed in all eleven full-release runs.

## Cache policy

Application-cold clears exactly the paths in `COLD_PATHS` in [`scripts/measure/workloads.ts`](../../../scripts/measure/workloads.ts) before every cold sample. Those are every Vite and Vitest cache directory, `dist/` of tokens, elements, CLI and docs, and every generated registry, token and `llms.txt` output, each checked as gitignored before removal. Each sample records what it actually cleared. Warm runs one unmeasured priming sample, then retains everything. Installed dependencies, Playwright binaries, the npm and pnpm caches the smoke install reads, and the OS page cache are retained in both conditions. A fresh process is not a cold machine.

## Command workloads

Every workload has five valid runs in both conditions. The argv arrays, working directories, prerequisite phases, and executed, omitted and unsupported coverage are in `WORKLOADS`. Each series JSON repeats them beside its raw samples and gzipped phase logs.

| Workload | Cold median (range) | Warm median (range) | What dominates |
| --- | --- | --- | --- |
| `dialog-edit` | 7.0 s (6.9–7.0) | 6.6 s (6.6–6.6) | ui typecheck 3.8 s, the Dialog suite about 3 s |
| `studio-history` | 30.1 s (29.9–30.3) | 29.8 s (29.5–30.0) | three docs Studio suites 20 s |
| `token-edit` | = `full-release` | = `full-release` | No narrower plan exists at this revision. Its argv equals full-release, so it takes those samples instead of a second identical batch. |
| `ult-button` | 13.6 s (13.4–13.7) | 12.6 s (12.3–12.6) | docs fixture suites 6.6 s |
| `setup-recipe` | 73.9 s (70.5–79.9) | 71.4 s (68.8–72.2) | smoke install 60 s |
| `full-release` | 174.8 s (170.7–179.1) | 172.9 s (170.3–175.5) | `pnpm test` 95 s, smoke install 61 s |

The warm/cold gap is small everywhere. The cold paths hold little that is expensive to rebuild, and the heavy phases (browser suites, npm scaffolds, the Next.js build) run fresh in both conditions. Per-phase medians are in [`results.md`](results.md#phases).

Not covered by any command workload, and so unavailable rather than passing:

- **Planned selectors.** `pnpm verify` component, feature, changed and release plans do not exist at this revision, so every selector comparison is unavailable.
- **Production browser scenarios.** No production runner exists. The Studio observer below times the built app but asserts no product behavior and is not a scenario inventory.
- **Remote CI.** CI on main has not executed for at least the twelve most recent pushes. Each `check` job completes in about two seconds with no steps (for example run 35892428303 at `901e286`). A clean remote run and required-check enforcement are therefore unavailable, not failed.
- **Smoke install versions.** The smoke install scaffolds with `npm create vite@latest`, `npx create-next-app@latest` and `npx shadcn@latest`. Those resolve from the network at run time and print no versions, so the consumer toolchain is not pinned across revisions. Disclose this on any comparison.

## Studio interactions

`scripts/measure/studio.ts` builds the docs (6.1 s), serves `dist/` from `127.0.0.1` on port 0 and drives `/theme-studio` in Chromium. Its four cells are dark and light at 1280×720 and 390×844. Each cell gets five browser-cold sessions of twenty measured sequences after one priming sequence. A sequence reloads with the fixture written to the autosave key and runs 21 interactions across three fixtures (customized, max-overrides, failing-contrast). All 84 cell × interaction series are complete, with no missing observations. [`results.md`](results.md#studio-interactions) has every session median and nearest-rank p95.

The duration is application-observed update latency. It runs from a capture-phase listener on the triggering input to the next animation frame after the committed draft (the autosave write) and the mode pane's token variables have both changed. Downloads end at export activation producing the file, and preview-mode switches end when the expected panes appear. After each event the runner checks coherence: the pane's variables and the contrast summary must match `resolveDraft` and `gate` for the committed draft, and each export must be byte-identical to the model's output. A mismatch counts as missing, never as a fast sample. These are laboratory observations of scripted input, not a field INP score.

What the numbers say at this revision:

- Most single edits settle in 12–17 ms, which is about one frame. The frame wait dominates, so these cannot resolve changes smaller than a frame.
- Larger work shows above that floor:
  - A ten-key hue burst settles in 75–78 ms.
  - Shuffle exhaustion (100 failing attempts) takes 23–27 ms.
  - Reset on the 202-override fixture takes 28 ms.
  - Undo after that reset takes 42 ms on desktop but 14 ms at 390 px. Desktop renders every editor group, the phone layout only one.
- First navigation to readiness takes 205–274 ms.

Unavailable, and recorded in the series:

- **Internal marks.** The unchanged application exposes no marks for `resolveDraft` or `gate`.
- **Work attribution.** The Chromium traces of one extra sequence per cell were captured, but the production build is minified without source maps, so work cannot be attributed to the resolver, the gate, React or layout. The traces total 10.7 MB, so they are not committed; [`studio/traces.sha256`](studio/traces.sha256) names them.
- **Observer overhead.** It was not measured separately. The same observer text runs in every compared build.

One product observation for #424, not changed here: at 390×844 the Studio preview pane lays out with zero block size under the editor. The observer therefore waits for the pane to be attached rather than visible.

## Exercises

Plans, prompts, answer keys and counterbalancing are in [`exercise-plans.md`](exercise-plans.md). The raw agent streams and records are in [`exercises/`](exercises/).

Discovery, three naive attempts per prompt with `claude-sonnet-5`, at `901e286` with harness `1dcc0ba`:

| Prompt | Owner found | Valid command | Wall time | Turns | Searches | Files opened |
| --- | --- | --- | --- | --- | --- | --- |
| "Dialog Escape leaves focus behind" | 3/3 `dialog.tsx` | 3/3 | 114, 67, 13 s | 9, 11, 8 | 4, 4, 6 | 1, 1, 1 |
| "Reset theme undo lost my override" | 3/3: `history.ts` twice, `theme-studio-store.ts` once | 3/3, after adjudication | 55, 178, 97 s | 21, 27, 23 | 12, 16, 14 | 5, 8, 7 |
| "the picker broke" | 3/3 `date-picker.tsx` | 2/3 | 3, 14, 7 s | 2, 5, 5 | 1, 2, 4 | 0, 1, 0 |

No attempt changed a file, and no tool call failed.

- **The adjudicated attempt.** The harness scored `reset-undo-2` as failed. Its command named `theme-studio.test.tsx` and exited 0 after running that one file (37 tests), but vitest's default reporter prints no file names on a passing non-TTY run, so the coverage match found nothing. The scorer now also accepts a command that names the covering file. The raw record keeps the original score.
- **The real miss.** `picker-3` ran `pnpm --filter @ultima/elements test -- date-picker`: the elements suite, which has no date-picker test.
- **Ambiguity.** No picker attempt surfaced the ambiguity. All three named Date Picker without mentioning Color Field or Calendar, one after a single search.
- **Over-broad commands.** Four of the nine valid commands used `pnpm --filter <pkg> test -- <file>`. pnpm passes the `--` through, so vitest runs the whole package suite (about 43 s for ui) instead of the one file.

[`exercises/superseded-scoring/`](exercises/superseded-scoring/) keeps an earlier batch of the same nine prompts. Its scorer compared file names against colour-coded output, so its three narrow-command attempts scored as failed although their commands ran the covering file. The records are kept, but they are not the baseline.

Synthetic Stepper addition and removal, three naive attempts with `claude-sonnet-5`:

| Attempt | Add time | Wiring files edited by hand | Optimizer lists | Proofs | Removal |
| --- | --- | --- | --- | --- | --- |
| 1 | 17.1 min | 3: catalogue, ui barrel, registry descriptions | untouched | typecheck, registry build, own test, docs axe and catalogue suites all pass; item served | clean, 0.5 min |
| 2 | 18.7 min | 4: those plus the router page map | untouched | all pass; item served | clean, 0.9 min |
| 3 | 17.0 min | 6: those plus both `vitest.config.ts` optimizer lists | both edited | all pass; item served | clean, 0.9 min |

Every attempt also edited the catalogue order test, `apps/docs/src/__tests__/components.test.ts`, which repeats the full catalogue list. That is a coordination edit even though the harness classes it as authored proof. Attempt 1 left the router map alone, so its page would render the placeholder: the proofs the harness ran do not cover the page. The removal counts come from the final tree, because the agents removed files through the shell rather than edit tools. The first changed path in each record is missing its leading character (`pps/docs/...`) because of a status-parsing bug, fixed after these runs. The paths are unambiguous, and the raw records are left as recorded.

## Migration inventory

[`inventory/`](inventory/) snapshots the public outputs the later slices must preserve. [`inventory/index.json`](inventory/index.json) hashes each file.

| Snapshot | Holds |
| --- | --- |
| `exports.json` | Package export maps, and every value and type export of the ui barrel (438 symbols), both lib entries, each component file and the tokens index, via the TypeScript checker |
| `routes.json` | Static routes, 54 component pages (all written), MDX content, demo directories, public static files |
| `catalogue.json` | Release order of 54 components and 9 elements, and in-package dependents (`dialog` ← `sidebar`, `popover` ← `color-field`) |
| `registry.json` | 68 items in order (54 `registry:ui`, 9 elements, 5 support), with title, description, docs prose and hash, dependencies and files; served `/r` files; the `llms.txt` hash |
| `elements.json` | Docs entries, tags each element source defines, fixture page hash, served bundles |
| `optimizer.json` | The docs (56) and ui (40) Vitest `optimizeDeps.include` lists; the docs Vite config has none |
| `commands.json` | Every package script, both workflows verbatim with their timeouts, every test file per package, and the planned commands that do not exist yet |

The 54/9/5 counts match the cross-check in [Migration and proof](../../spec/agent-infrastructure.md#migration-and-proof).

## Aggregation checks

`node --experimental-strip-types --test scripts/measure/protocol.test.ts` runs the fixtures for median, MAD and nearest-rank p95, five-run summaries, a failed run that must not count, a documented exclusion and its replacement, unreasoned exclusions, missing baseline or candidate, mismatched conditions, an incomplete side, a seeded +50 ms regression reported `slower`, a change within MAD and conflicting pair directions reported `inconclusive`, and interaction sessions with a missing observation.

## Reproducing

```sh
pnpm install --frozen-lockfile
pnpm registry:build
node --experimental-strip-types scripts/measure/inventory.ts --out <dir>/inventory
node --experimental-strip-types scripts/measure/commands.ts --workload <id> --cache cold|warm --runs 5 --out <dir>/commands
node --experimental-strip-types scripts/measure/studio.ts --out <dir>/studio
node --experimental-strip-types scripts/measure/exercise.ts --exercise <id> --attempt <n> --revision <sha> --out <dir>/exercises
node --experimental-strip-types scripts/measure/report.ts --dir <dir>
```

Set `TMPDIR` to a directory on a real disk: the smoke install and the browser suites write there, and a small tmpfs fails them. A comparison needs the same harness hash, fixture hash, workload versions and runner class on both sides. [Compare efficiency and performance](https://github.com/frankieramirez/ultima/issues/465) captures its own parent and candidate pair rather than reusing these samples across months of drift.
