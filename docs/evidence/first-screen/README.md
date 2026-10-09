# First-screen exercise

This directory holds the evidence for [Run the first-screen exercise with fresh agents in three layouts](https://github.com/frankieramirez/ultima/issues/774), slice S9 of the [adoption delivery plan](../../spec/adoption-delivery.md#first-screen-exercise). It covers the agent run only. The human run, publication and the live-domain stranger path are out of scope.

## Inputs

- [`brief.md`](brief.md): the fixed product brief. Larder, a pantry inventory screen, with the brand color `#A3237F`. Its accent hue (342) is at least 46 degrees from every preset's accent and action hue. The bound docs test checks that gap and the screen's required parts.
- The candidate's docs build, registry, Theme Studio worker and packed CLI, served by [`scripts/first-screen.ts`](../../../scripts/first-screen.ts) at a loopback origin that stands in for the public host. Every `https://ultima.systems` in a served page, registry item and the CLI bundle reads as that origin. The exception is the generated DESIGN.md link: the theme item and the CLI's freshness check both digest that text, so it stays verbatim. Unmatched page paths get `index.html`, as Cloudflare Pages serves a build with no `404.html`. `/npm/` answers `ultima-design` with the candidate tarball and redirects every other package to npm, so `npx ultima-design@latest` resolves to the candidate.
- The theme: the harness opens the served Theme Studio and starts from Neutral. It enters the brand as the Accent seed, generates the Accent palette, sets the accent fill to Hue, then copies Export theme's URL install command. The spec lists the Studio theme as an input. An agent without a browser cannot operate Studio, so the harness makes it and the prompt hands the agent the copied command.
- The executor: Claude Code `claude -p` in `--safe-mode` with `--strict-mcp-config` and `--permission-mode auto`. It starts in a new empty directory under `~/.cache/ultima-first-screen/<run-id>/work`, outside every checkout. Safe mode loads no CLAUDE.md, memory, skill, plugin, hook or MCP server. Settings deny WebSearch, the live host and reads of the machine's other checkouts. Each run has its own npm cache and TMPDIR. Each prompt (`<run-id>/prompt.md`) is the brief plus the host, the documented `init` command for the layout and Studio's install command.

## What each run records

`runs/<run-id>.json` is the record, and `runs/<run-id>.stream.jsonl.gz` is the full stream-json transcript. `runs/<run-id>/` holds:

- the prompt and the operator's review;
- the served-request log;
- `ultima-design check --json` and `doctor --json`;
- the Studio export screenshot;
- the runner's external-mode `report.json`, with per-case values and screenshots.

The record carries:

- the candidate commit and source manifest, the registry manifest hash, the packed and served CLI tarball digests, and the draft digest and fingerprint;
- the agent's model, turns, cost and duration;
- the Bash commands and fetched URLs from the transcript, and any reference to the live host or another checkout;
- the agent's own notes;
- check, doctor, lint, the raw-paint scan of consumer-authored styles, and the production assertions.

`verdict` is computed from that evidence by [`scripts/first-screen-record.ts`](../../../scripts/first-screen-record.ts). Interventions and decisions stay `pending-review` until the operator reads the transcript and applies `review`. A review can only add interventions and decisions; it cannot pass a failed check. The docs test recomputes every stored verdict.

The review counts an **intervention** as any action on the project or its tooling that the guidance or the CLI output did not print or link. It counts a **decision** as any choice about setting up, theming or styling with Ultima that the guidance did not settle and that changed the output. Product choices the brief leaves open (data, copy, arrangement, Select or Dialog) and choices between documented options are not decisions.

## Runs

| Run | Revision | Layout | Result | Failed conditions |
| --- | --- | --- | --- | --- |
| `2026-10-09-vite-fab8a6` | `6f5dd16` + harness | Vite | invalid | Harness defect: the CLI was packed unbuilt, so `init`, `check` and `doctor` could not run. Kept as evidence. |
| `2026-10-09-vite-159ea9` | `6f5dd16` + harness | Vite | failed | interventions, decisions, production (`axe-open`: `region`, `aria-hidden-focus`) |
| `2026-10-09-next-app-5cc880` | `6f5dd16` + harness | Next root `app` | failed | interventions, decisions, production (`axe-open`: `region`) |
| `2026-10-09-next-src-6facce` | `6f5dd16` + harness | Next `src/app` | failed | public guidance only (harness defect, below), interventions, decisions, production (`axe-open`: `region`) |
| `2026-10-09-vite-bd8866` | `0a3fff7` | Vite | failed | interventions, decisions, production (`required-error-name`: the runner defect fixed in `7a574ba`) |
| `2026-10-09-vite-ee220e` | `7a574ba` | Vite | failed | interventions, decisions, production (`axe-open`: `region`) |
| `2026-10-09-next-app-3aecfb` | `7a574ba` | Next root `app` | failed | interventions, decisions, production (`axe-open`: `region`) |

The runs stopped before Next `src/app` on `7a574ba`. Its earlier run failed the same way. No layout passes, and the S9 acceptance criterion is not met. Two of the three shared failures are fixed below; the third, [#810](https://github.com/frankieramirez/ultima/issues/810), still blocks a full pass, so the layouts have not been rerun.

In every valid run, `init`, `ultima-design check`, `doctor`, the StyleX lint and the raw-paint scan were clean. The Dialog-form app from `vite-bd8866` passes every external assertion under the fixed runner.

Three harness defects surfaced and are fixed in this slice:

- The CLI was packed before it was built.
- Deep page paths answered 404 to a non-HTML `Accept` header, where Cloudflare Pages serves `index.html`.
- The origin rewrite changed the DESIGN.md link that the theme item and the CLI's freshness check both digest. The Next `src/app` agent's `sed` over that link, while diagnosing the mismatch, is the live-host reference its record flags.

One runner defect is fixed too: external mode looked for the required field only in the page, so a form opened in a Dialog could never pass.

## Defects

| Defect | State |
| --- | --- |
| The docs pages linked from `/llms.txt` have no content over HTTP, and a lesson's Code tab offers only its first file. | [#810](https://github.com/frankieramirez/ultima/issues/810). It blocks a full pass: every agent needed a headless browser to read the guidance. |
| `init`, the lint walkthrough and doctor disagreed on the StyleX version. | Fixed here. StyleX is 0.19.1 everywhere: `init`'s recipes, the existing-project band, the workspace lockfile (so doctor's tested ceiling), both specs and the install page. Doctor's ULT-LINT-003 moves an older runtime up to the tested plugin instead of the plugin down. Every UI, block and token source lints with 0 errors under plugin 0.19.1. |
| A portalled Select could not pass external mode's `axe-open`. axe flagged only the open Select's `role="option"` rows, whose ancestry is `div[role=option] < div[role=listbox] < div[role=presentation] < div[role=presentation] < div[data-base-ui-portal] < body`. | Fixed here, in external mode. The Select is unchanged. axe's `region` rule exempts a dialog; external mode exempts a listbox or menu popup the same way when an expanded control names it with `aria-controls` or `aria-owns`. An orphaned element outside every landmark still fails (`scripts/verification/consumer-external.test.ts`). |
| `init`'s Next output keeps create-next-app's Geist font loading and discards `.next` route types. | [#811](https://github.com/frankieramirez/ultima/issues/811) |
| `init`'s preview puts `colorScheme.system` on the screen root. | [#812](https://github.com/frankieramirez/ultima/issues/812) |
| The Toggle Group's pressed row is hard to see in dark mode and inside a Card. | [#813](https://github.com/frankieramirez/ultima/issues/813) |

`runs/2026-10-09-next-app-3aecfb/external-rerun/` shows the region fix on a real agent app. The app was rebuilt by replaying that run's transcript: its file writes, edits and setup commands, without its browser checks or servers. External mode then ran on the result with both fixes, on top of `f2eb117`, and every assertion passed in all four cases. That includes `axe-open` with the Select's listbox open, and `required-error-name`. The run's own record keeps its original measurement.

## Reproduce

```bash
pnpm --filter @ultima/docs build
node --experimental-strip-types scripts/first-screen.ts run --layout vite   # or next-app, next-src
node --experimental-strip-types scripts/first-screen.ts review <run-dir>/record.json <review.json>
node --experimental-strip-types scripts/first-screen.ts retain <run-dir>
node --experimental-strip-types scripts/first-screen.ts clean <run-dir>
```

Run one layout at a time. A run needs Claude Code signed in, network access to npm, and Chromium for Playwright.
