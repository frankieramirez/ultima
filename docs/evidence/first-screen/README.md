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

| Run | Layout | Result | Failed conditions |
| --- | --- | --- | --- |
| `2026-10-09-vite-fab8a6` | Vite | invalid | Harness defect: the CLI was packed unbuilt, so `init`, `check` and `doctor` could not run. Kept as evidence. |
| `2026-10-09-vite-159ea9` | Vite | failed | interventions, decisions, production (`axe-open`: `region`, `aria-hidden-focus`) |
| `2026-10-09-next-app-5cc880` | Next root `app` | failed | interventions, decisions, production (`axe-open`: `region`) |
| `NEXT_SRC_RUN` | Next `src/app` | NEXT_SRC_RESULT | NEXT_SRC_FAILURES |

No layout passes, so the S9 acceptance criterion is not met. In the valid runs, `init`, `ultima-design check`, `doctor`, the StyleX lint and the raw-paint scan were clean. The failures come from the defects below, none of which this slice could fix as a small change.

## Defects

1. **The docs pages linked from `/llms.txt` have no content over HTTP.** The site renders client-side, so a plain fetch of `/install`, `/build-a-screen` or `/cli` returns the empty app shell. `/llms.txt` sends agents to those pages for the lint fragment's config and tested versions, the theme steps and every lesson's copy-bundle files. A lesson's Code tab also offers only its first file for download. Every agent ran a headless browser to read the pages. Proposed fix: serve plain Markdown for the guidance pages and the copy bundles, linked from `/llms.txt` (an amendment to [ADR 0005](../../adr/0005-hosted-agent-guidance.md)'s guidance surfaces), or carry that content in `/llms.txt` itself.
2. **init, the lint walkthrough and doctor disagree on the StyleX version.** `init` pins `@stylexjs/stylex` 0.19.0. The install page installs `@stylexjs/eslint-plugin` 0.19.1, and doctor's ULT-LINT-003 says the plugin must equal the runtime. Following doctor's repair to plugin 0.19.0 makes the installed `select.tsx` fail `valid-styles` on `gridColumn: 2`. Moving the runtime to 0.19.1 instead raises ULT-SETUP-017. Proposed fix: decide one StyleX line for `init`, the lint pins and the support matrix ([consumer-setup.md](../../spec/consumer-setup.md) says 0.19.0; [consumer-lint.md](../../spec/consumer-lint.md) says 0.19.1). Also make the shipped Select pass the plugin at the runtime version `init` installs.
3. **A portalled Select cannot pass external mode's `axe-open`.** axe's best-practice `region` rule exempts dialogs but not listboxes. A Select popup portalled to `<body>` therefore always fails it, and portalling it inside a landmark fails the runner's `overlay-portalled` check. One run also reported `aria-hidden-focus` on Base UI's tabbable focus-guard spans. The runner's own scene opens a Dialog, so it never meets this. All three agents chose the Select, which the brief allows. Proposed fix: decide whether external mode treats listbox and menu popups as axe treats dialogs (`regionMatcher`), or whether the Select changes. This slice keeps the assertion as it is.
4. **`init` leaves create-next-app's font loading.** The Next root agent removed the scaffold's `next/font/google` Geist loading by hand, because no guidance says whether to keep it alongside the theme's stacks. Proposed fix: have the Next recipe drop it, or have the theme steps say what to do with scaffold fonts.
5. **The Toggle Group's pressed row is hard to see in dark mode.** Both Vite agents overrode it with accent roles. This is reported as component feedback, not counted as a condition.

## Reproduce

```bash
pnpm --filter @ultima/docs build
node --experimental-strip-types scripts/first-screen.ts run --layout vite   # or next-app, next-src
node --experimental-strip-types scripts/first-screen.ts review <run-dir>/record.json <review.json>
node --experimental-strip-types scripts/first-screen.ts retain <run-dir>
node --experimental-strip-types scripts/first-screen.ts clean <run-dir>
```

Run one layout at a time. A run needs Claude Code signed in, network access to npm, and Chromium for Playwright.
