# Exercise plans

These are the paired-attempt plans for the discovery and authoring exercises in [Workloads and comparable coverage](../../spec/agent-infrastructure.md#workloads-and-comparable-coverage). The baseline attempts recorded in [`exercises/`](exercises/) are this plan's baseline side. [Compare efficiency and performance](https://github.com/frankieramirez/ultima/issues/465) runs the candidate side.

`scripts/measure/exercise.ts` runs every attempt. The task text, answer keys and scoring rules live in its `EXERCISES` table, so the two revisions get byte-identical prompts. Each record stores the task's SHA-256 so a later attempt can prove it used the same text.

## Conditions shared by every attempt

| Condition | Value |
| --- | --- |
| Checkout | A new `git worktree add --detach` at the attempted revision, at a fresh temporary path, then `pnpm install --frozen-lockfile`. The worktree is removed afterwards. |
| Entry point | The repository root, with no files open and no prior conversation. |
| Agent | `claude -p --output-format stream-json --verbose --model sonnet`. The record keeps the resolved model ID from the session's init event. |
| Tools | Discovery: `Bash,Read,Grep,Glob`. Authoring: those plus `Edit,Write`. `--strict-mcp-config` with no servers and `--setting-sources project`, so no connectors, user settings, user hooks or user skills take part. |
| Permissions | `--permission-mode bypassPermissions`, confined to the disposable worktree. |
| Learning | Naive. A new session and a new worktree path mean no project memory or earlier transcript carries the answer. A later attempt in the same session would be a learned-condition observation and could not stand in for a naive one. |
| Recorded | Model, tools, session ID, wall time and the agent's own reported duration, turns and cost. Also every search (Grep, Glob, and `grep`/`rg`/`find`/`ls` in Bash), every file opened, failed commands and edits. The raw stream is kept gzipped beside the record. |

## Counterbalancing

The candidate slice runs three attempts per exercise on each revision, alternating which revision goes first: attempt 1 baseline then candidate, attempt 2 candidate then baseline, attempt 3 baseline then candidate. Model behavior drifts over time. So the candidate slice also reruns the baseline side in the same window, with the same model alias and the same harness hash, and it reports the attempts recorded here as an earlier, separate series rather than pairing them with candidate attempts made months later.

Three attempts is a small sample. Their results are descriptive and cannot establish agent productivity.

## Discovery: "Dialog Escape leaves focus behind"

| Field | Value |
| --- | --- |
| Exercise ID | `dialog-escape` |
| Task | The user report, verbatim, inside the fixed discovery task: find the owning source file and one command, run from the root, that runs the existing checks covering it. Change nothing. End with `OWNER:` and `COMMAND:` lines. |
| Answer key | Owner `packages/ui/src/dialog.tsx`. The coverage must run `dialog.test.tsx`. |
| Success | The owner matches, and the command exits 0 while its output names a covering test file. A plausible owner with a failing command fails the exercise, per the measurement contract. |
| Candidate target | `pnpm verify` `list` plus `describe` return the owner, route and scoped command for `dialog.keyboard-dismissal`. |

## Discovery: "Reset theme undo lost my override"

| Field | Value |
| --- | --- |
| Exercise ID | `reset-undo` |
| Answer key | Owner is one of `apps/docs/src/theme-studio-store.ts`, `apps/docs/src/routes/theme-studio.tsx`, `apps/docs/src/theme-studio-actions.tsx`, `packages/tokens/src/theme/history.ts`. The coverage must run `theme-studio.test.tsx` or `history.test.ts`. |
| Success | As above. |
| Candidate target | `list` plus `describe` return the owner, route and scoped command for `theme-studio.draft-history`. |

## Discovery: "the picker broke"

| Field | Value |
| --- | --- |
| Exercise ID | `picker` |
| Answer key | Deliberately ambiguous. Any of `packages/ui/src/date-picker.tsx`, `color-field.tsx` or `calendar.tsx`, with a command that runs that owner's test file. |
| Success | One picker owner and a passing command that runs its tests. `candidatesNamed` records whether the answer surfaced the ambiguity rather than guessing silently. |
| Candidate target | Discovery states the catalogue-only matches and their registration limit instead of inventing a scenario. |

## Authoring: synthetic component addition and removal

| Field | Value |
| --- | --- |
| Exercise ID | `stepper-add-remove` |
| Contract | Synthetic Stepper, item `synthetic-stepper`, on `@base-ui/react/number-field`. Parts Root, Group, Decrement, Input, Increment. One `size` axis, `sm \| md`, default `md`. Joins v0.2, last in catalogue order. One live demo on its page. Proof: renders, ArrowUp increments, axe. |
| Why this dependency | `@base-ui/react/number-field` is absent from both browser optimizer lists at this revision (see [`inventory/optimizer.json`](inventory/optimizer.json)). So the exercise exposes the optimizer wiring an ordinary addition needs, alongside the barrel, router page map, catalogue and registry description. |
| Phase 1 | Add it, then list changed files. The harness then runs `pnpm typecheck`, `pnpm registry:build`, the new test file and the docs axe and catalogue suites, and checks the served registry for the item. |
| Phase 2 | In the same session (a learned condition by design), remove it completely. Then the registry build runs again, and the harness checks `git status` against the pre-exercise tree and greps tracked and generated files for leftovers. |
| Counted | Distinct files and edit operations in the wiring set (`packages/ui/src/index.ts`, `apps/docs/src/components.ts`, `router.tsx`, `navigation.ts`, `elements.ts`, `registry/items.config.ts`, both `vitest.config.ts` optimizer lists), separately from authored behavior, docs and proof. Also Bash writes, failed commands and proof outcomes. |
| Candidate target | Zero manual edits to the barrel, router/page map, catalogue adapters or optimizer lists, using the descriptor and scaffold. |
