# First-screen exercise

This directory holds the evidence for [Run the first-screen exercise with fresh agents in three layouts](https://github.com/frankieramirez/ultima/issues/774), slice S9 of the [adoption delivery plan](../../spec/adoption-delivery.md#first-screen-exercise). It covers the agent run only. The human run was dropped when [#775](https://github.com/frankieramirez/ultima/issues/775) closed as not planned. Publication and the live-domain stranger path are out of scope.

## Inputs

- [`brief.md`](brief.md): the fixed product brief. Larder, a pantry inventory screen, with the brand color `#A3237F`. Its accent hue (342) is at least 46 degrees from every preset's accent and action hue. The bound docs test checks that gap and the screen's required parts.
- The candidate's docs build, registry, Theme Studio worker and packed CLI, served by [`scripts/first-screen.ts`](../../../scripts/first-screen.ts) at a loopback origin that stands in for the public host. Every `https://ultima.systems` in a served page, registry item and the CLI bundle reads as that origin. The exception is the generated DESIGN.md link: the theme item and the CLI's freshness check both digest that text, so it stays verbatim. Unmatched page paths get `index.html`, as Cloudflare Pages serves a build with no `404.html`. `/npm/` answers `ultima-design` with the candidate tarball and redirects every other package to npm, so `npx ultima-design@latest` resolves to the candidate.
- The theme: the harness opens the served Theme Studio and starts from Neutral. It enters the brand as the Accent seed, generates the Accent palette, sets the accent fill to Hue, then copies Export theme's URL install command. The spec lists the Studio theme as an input. An agent without a browser cannot operate Studio, so the harness makes it and the prompt hands the agent the copied command.
- The executor: Claude Code `claude -p` in `--safe-mode` with `--strict-mcp-config` and `--permission-mode auto`. It starts in a new empty directory under `~/.cache/ultima-first-screen/<run-id>/work`, outside every checkout. Safe mode loads no CLAUDE.md, memory, skill, plugin, hook or MCP server. Settings deny WebSearch, the live host and reads of the machine's other checkouts. Each run has its own npm cache, and its own TMPDIR at `/tmp/ultima-fs-<suffix>`, short enough for Chromium's singleton socket. Each prompt (`<run-id>/prompt.md`) is the brief plus the host, the documented `init` command for the layout and Studio's install command.

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

The initial runs stopped before Next `src/app` on `7a574ba`. Its earlier run failed the same way. None of those runs passed S9. The #810 reruns below preserve these original measurements.

In every valid run, `init`, `ultima-design check`, `doctor`, the StyleX lint and the raw-paint scan were clean. The Dialog-form app from `vite-bd8866` passes every external assertion under the fixed runner.

Three harness defects surfaced and are fixed in this slice:

- The CLI was packed before it was built.
- Deep page paths answered 404 to a non-HTML `Accept` header, where Cloudflare Pages serves `index.html`.
- The origin rewrite changed the DESIGN.md link that the theme item and the CLI's freshness check both digest. The Next `src/app` agent's `sed` over that link, while diagnosing the mismatch, is the live-host reference its record flags.

One runner defect is fixed too: external mode looked for the required field only in the page, so a form opened in a Dialog could never pass.

## Defects

| Defect | State |
| --- | --- |
| The docs pages linked from `/llms.txt` have no content over HTTP, and a lesson's Code tab offers only its first file. | [#810](https://github.com/frankieramirez/ultima/issues/810) adds generated Markdown guides and complete copy bundles. See the reruns below for executed evidence. |
| `init`, the lint walkthrough and doctor disagreed on the StyleX version. | Fixed here. StyleX is 0.19.1 everywhere: `init`'s recipes, the existing-project band, the workspace lockfile (so doctor's tested ceiling), both specs and the install page. Doctor's ULT-LINT-003 moves an older runtime up to the tested plugin instead of the plugin down. Every UI, block and token source lints with 0 errors under plugin 0.19.1. |
| A portalled Select could not pass external mode's `axe-open`. axe flagged only the open Select's `role="option"` rows, whose ancestry is `div[role=option] < div[role=listbox] < div[role=presentation] < div[role=presentation] < div[data-base-ui-portal] < body`. | Fixed here, in external mode. The Select is unchanged. axe's `region` rule exempts a dialog; external mode exempts a listbox or menu popup the same way when an expanded control names it with `aria-controls` or `aria-owns`. An orphaned element outside every landmark still fails (`scripts/verification/consumer-external.test.ts`). |
| `init`'s Next output keeps create-next-app's Geist font loading and discards `.next` route types. | [#811](https://github.com/frankieramirez/ultima/issues/811) |
| `init`'s preview puts `colorScheme.system` on the screen root. | [#812](https://github.com/frankieramirez/ultima/issues/812) |
| The Toggle Group's pressed row is hard to see in dark mode and inside a Card. | [#813](https://github.com/frankieramirez/ultima/issues/813) |

`runs/2026-10-09-next-app-3aecfb/external-rerun/` shows the region fix on a real agent app. The app was rebuilt by replaying that run's transcript: its file writes, edits and setup commands, without its browser checks or servers. External mode then ran on the result with both fixes, on top of `f2eb117`, and every assertion passed in all four cases. That includes `axe-open` with the Select's listbox open, and `required-error-name`. The run's own record keeps its original measurement.

## Markdown guidance reruns (#810)

The run-start candidate is `54d1a40` plus the #810 working-tree implementation. All three run-start source manifests match `466fd90a233aa300aa79b4630ddbd9c6f50db28c283a25c1d0b9acbe58326f3a`, as do their registry manifest and packed CLI digests. Next src's later [production report](runs/2026-10-11-next-src-def696/production/report.json) records source manifest `c9a6791501c3dfc5591b4570a2390f4be6ef6d06027bca72bcc19e596bef2ef5`, so the common source-tree claim applies only at run startup.

| Run | Layout | Guidance/source retrieval | Production | Overall verdict |
| --- | --- | --- | --- | --- |
| [2026-10-11-vite-b5cd4f](runs/2026-10-11-vite-b5cd4f.json) | Vite | HTTP Markdown | passed | failed: interventions, decisions |
| [2026-10-11-next-app-8132c2](runs/2026-10-11-next-app-8132c2.json) | Next root | HTTP Markdown | passed | failed: interventions, decisions |
| [2026-10-11-next-src-def696](runs/2026-10-11-next-src-def696.json) | Next src | HTTP Markdown | passed | failed: interventions |

Each run fetched the install, update, screen-building, support and Recipes exports through links in `/llms.txt`. All three fetched complete lesson bundles; Next root also fetched the Item recipe. None rendered documentation pages, decoded data links or extracted a JavaScript bundle. The Theme Studio browser requests in each request log belong to the harness exporting the input theme. Consumer-app browser checks follow the install guide.

All three runs passed `check`, StyleX lint, the raw-paint scan and every external production assertion. The operator reviews retain separate problems: Next font cleanup and route-type regeneration (#811), the selected-row workaround (#813), a Chromium Unix socket path failure under the long exercise TMPDIR, and an ambiguity between the brief's token-only lengths and the documented media-condition exception. Vite and Next src both inspected CRM 01's raw registry source. Vite also used an undocumented help probe, and its nested pressed-hover selector needed a lint repair. The self-reports remain intact; reviews exclude product choices and documented alternatives from their counts.

The production Markdown check fetched 21 documents with zero failures and verified source parity and reachable guidance anchors. An independent check matched all 21 projected copy-file occurrences against their destination paths and complete source bytes in the production artifacts. Installed-consumer `copy-bundles` checks passed in Vite, Next root and Next src. These checks establish the local candidate's export and consumer behavior. The full S9 gate remains unmet. The deployed domain and publication remain unverified.

## Reruns on `1eefbfa` (#774)

The candidate is `1eefbfa`, after `8c8721f` and after the #806, #807, #811, #812 and #813 fixes. All three run-start source manifests and the release report's manifest match `1862afc2edd94398cbaf0aa72cfa5ca30e3c8c00fa3ecb1154ecdb9b89fe140f`. So do the registry manifest (`f1229628…`) and the packed CLI digest (`487cae1c…`). The executor is `claude -p` on `claude-opus-5-5`.

| Run | Layout | Interventions | Decisions | Check, lint, raw paint, production | Verdict |
| --- | --- | --- | --- | --- | --- |
| [2026-10-16-vite-0106c2](runs/2026-10-16-vite-0106c2.json) | Vite | 1: read CRM 01's raw registry source (#834) | 0 | passed | failed: interventions |
| [2026-10-16-next-app-07d7af](runs/2026-10-16-next-app-07d7af.json) | Next root | 3: init retry and staging cleanup after ECONNRESET (#835), CRM 01 source (#834), Chromium TMPDIR workaround (harness, fixed here) | 0 | passed | failed: interventions |
| [2026-10-16-next-src-b9f58c](runs/2026-10-16-next-src-b9f58c.json) | Next src | 2: pinned shadcn@4.21.4 to match init (#836), Chromium TMPDIR workaround (harness, fixed here) | 1: breakpoint in a token module (#837) | passed | failed: interventions, decisions |

No layout passes, so S9 is still unmet. In every run, `init`, doctor, `check`, StyleX lint (0 errors), the raw-paint scan and all four external production cases passed. No run rendered documentation, decoded a data link, extracted a bundle or referenced the live host. The #811, #812 and #813 problems did not recur: init's Next layout loads no Geist and the agents made no selected-row workaround.

The browser check follows the install guide's printed hand step, so installing playwright-core for it is not counted. Each Chromium TMPDIR workaround is counted. The harness had set TMPDIR under the run directory, which overflows Chromium's socket path; runs from this revision of the harness use a short `/tmp` directory instead. The Vite run's browser check did not hit the failure.

### Adoption recommendation gate

`pnpm verify release` on the same tree (report `20261016T143524-b5418ac6`) failed: 36 checks passed and 5 failed.

- **54-cell matrix:** `consumer-bundles-vite` (36 cells), `consumer-bundles-next-app` (6), `consumer-bundles-next-src` (6) and `consumer-elements` (6). All 18 Chromium cells and all 18 Firefox cells passed. The 18 WebKit cells could not launch on this machine because Playwright's WebKit is missing host libraries. The runner reports those cells as not executed, so the checks are incomplete. The named gaps stay explicit in the Vite report: `tabs-indicator` and `date-picker-glyphs` in the direction-locale cells, and Firefox `drawer-backdrop-dismiss` (#807, emulation-only per #818). The Installed consumer proof workflow on `1eefbfa` ([run 38915259426](https://github.com/frankieramirez/ultima/actions/runs/38915259426)) ran every cell, WebKit included, and passed. That CI run is a different execution of the same commit, not this gate's run.
- **Four delivery paths:** css, stylex-subtree, registry and cli passed in Vite, Next root and Next src.
- **`smoke-install`:** `consumer-smoke` passed.
- **Studio pairing and parity:** `palette`, `tokens-tests` and `docs-tests` passed.
- **`production-scenarios`:** 42 of 44 cases passed. Both narrow `site-navigation.route-and-mode` cases fail axe `target-size` on the `/tokens` page's `brand-boundary.tsx` Copy button (#838). A second local `test:production` failed the same way, while CI's production job on `1eefbfa` passed.

The gate is unmet on this revision: no agent run passes, WebKit did not execute locally, and #838 fails.

### Defects filed

| Defect | Found in |
| --- | --- |
| [#834](https://github.com/frankieramirez/ultima/issues/834) No selectable list-and-detail pattern in the guidance; agents read CRM 01's raw registry source | Vite, Next root (and Next src without the read) |
| [#835](https://github.com/frankieramirez/ultima/issues/835) init on a new directory prints no retry or cleanup step after a failed install step | Next root |
| [#836](https://github.com/frankieramirez/ultima/issues/836) Studio and the guides print unversioned shadcn while init pins shadcn@4.21.4 | Next src |
| [#837](https://github.com/frankieramirez/ultima/issues/837) The brief's token-only lengths conflict with the lesson's in-file breakpoint constants | Next src (and the #810 Vite and Next root runs) |
| [#838](https://github.com/frankieramirez/ultima/issues/838) `/tokens` fence Copy button fails axe `target-size` at the narrow viewport | `pnpm verify release` |

## Reruns on `074af87` on macOS (#774)

The candidate is `074af87`, after the #834 to #838 fixes and #844's single pinned shadcn version. The machine is a MacBook Pro (mbp1) on macOS 27.0.1, because pc1 could not launch WebKit. All three run-start source manifests and the release report's manifest match `4f37c6d28a8f66e38838d0df0c39272e7ee60815eacab36eba042254e81bb685`. So do the registry manifest (`31d12620…`) and the packed CLI digest (`0b144aaa…`). The executor is `claude -p` on `claude-opus-5-5`.

| Run | Layout | Interventions | Decisions | Check, lint, raw paint, production | Verdict |
| --- | --- | --- | --- | --- | --- |
| [2026-10-16-vite-b1c28a](runs/2026-10-16-vite-b1c28a.json) | Vite | 0 | 0 | passed | **passed** |
| [2026-10-16-next-app-7972c7](runs/2026-10-16-next-app-7972c7.json) | Next root | 0 | 1: grid track templates moved into an app `defineVars` module (#845) | passed | failed: decisions |
| [2026-10-16-next-src-470362](runs/2026-10-16-next-src-470362.json) | Next src | 0 | 1: the lesson's `minBlockSize: '100dvh'` dropped as a length outside a token module (#845) | passed | failed: decisions |

The Vite run is the first to pass S9: Next root and Next src still fail it, so S9 remains unmet. In every run, `init`, doctor, `check`, StyleX lint (0 errors), the raw-paint scan and all four external production cases passed. No run rendered documentation, decoded a data link, extracted a bundle, read CRM 01's registry source or referenced the live host or another checkout. All three built the stock list from the list-detail lesson (#834 holds). Each used the shadcn@4.21.4 that init, Studio and the guides now all print (#836 holds). Each kept its breakpoint as a named constant in the screen file (#837 holds). Next root's init applied with no failed step, so #835 was not exercised. No run hit the Chromium socket failure.

Both decisions come from one gap. The brief allows no lengths outside the theme and token modules, with a breakpoint as the only exception. The lessons write other layout values as literals in `stylex.create`, such as `minmax(0, 1fr)` track templates and `100dvh`. Vite kept the lesson's literals; Next root moved its track templates into a token module; Next src deleted `100dvh`. The reviews count each undocumented choice that changed the output.

The browser check follows the install guide's printed hand step, so the reviews do not count the playwright-core it needed. Next root used a copy from the machine's `~/.npm/_npx` cache instead of installing one. That shows the per-run npm cache does not hide the user's npx cache. It is a harness isolation note, not a guidance problem.

### Adoption recommendation gate

`pnpm verify release` on the same tree (report `20261016T174610-16279cea`, manifest `4f37c6d2…`, no source change) failed: 35 checks passed and 6 failed. Two environment settings were needed on this Mac; neither changes the tree:

- `XUL_APP_FILE` points Playwright's Firefox at a copy of its `application.ini` with `Profile=PlaywrightFirefox`, saved in the bundle's `Contents/Resources/browser/`. macOS 27 reserves `~/Library/Application Support/Firefox` for the installed Firefox, so Playwright's ad hoc signed Firefox otherwise exits with "Could not find profile folder". HOME, `XRE_PROFILE_PATH` and `-profile` do not help. Playwright passes `-app` after its own arguments, so Firefox ignores it.
- `TMPDIR=/private/tmp/…`, because macOS's default tmpdir is a symlink, and the verification tests' fixtures under it fail (#846).

Results:

- **54-cell matrix:** all 54 cells executed, the 18 WebKit and 18 Firefox cells included. `consumer-bundles-next-app`, `consumer-bundles-next-src` and `consumer-elements` passed. `consumer-bundles-vite` failed 6 of its 36 cells on assertions that depend on the platform (#847). Chromium and Firefox fail RTL `select-layout`: macOS's narrower Arabic font fails the option-text midpoint heuristic. WebKit fails RTL `navigation-keyboard`: macOS WebKit's Tab key skips links. The named gaps `tabs-indicator` and `date-picker-glyphs` stay explicit.
- **Four delivery paths:** css, stylex-subtree and cli passed in Vite, Next root and Next src. The registry path failed in all three on `axe-open` and `axe-switched-open` in Chromium: axe reports the Cinder Dialog description's contrast as incomplete (#848).
- **`smoke-install`:** `consumer-smoke` passed.
- **Studio pairing and parity:** `palette`, `tokens-tests` and `docs-tests` passed.
- **`production-scenarios`:** 43 of 44 cases passed. #838's narrow `target-size` cases now pass. `site-landing.without-field` at light/desktop failed axe `color-contrast` on `.xsgp5dn > .x1vroxvg`. A standalone `test:production` on the same commit passed all 44 cases right afterwards, so the failure is intermittent (#849).
- **`tooling-tests`:** one test still fails on macOS. It assumes Linux's `/proc` when it counts a check's leftover processes (#846).

The gate is unmet on this revision: Next root and Next src fail on decisions (#845), and `pnpm verify release` fails on macOS (#846, #847, #848, #849).

### Defects filed

| Defect | Found in |
| --- | --- |
| [#845](https://github.com/frankieramirez/ultima/issues/845) The brief's token-only lengths leave lesson literals (grid track templates, `100dvh`) unsettled | Next root, Next src |
| [#846](https://github.com/frankieramirez/ultima/issues/846) Verification tests fail on macOS: tmpdir is a symlink, and the leftover-process test assumes `/proc` | `pnpm verify release` |
| [#847](https://github.com/frankieramirez/ultima/issues/847) consumer-bundles RTL `select-layout` and WebKit `navigation-keyboard` fail on macOS | `pnpm verify release` |
| [#848](https://github.com/frankieramirez/ultima/issues/848) Registry consumer proofs fail axe on macOS: the Cinder Dialog description's contrast is incomplete | `pnpm verify release` |
| [#849](https://github.com/frankieramirez/ultima/issues/849) `site-landing.without-field` fails axe `color-contrast` intermittently | `pnpm verify release` |

## Reruns on `ec6c1b4` on macOS (#774)

The candidate is `ec6c1b4`, which carries #851: the brief and Build a screen step 4 now keep arrangement values literal (#845). Only the #850 evidence separates it from #851's tree. The machine and executor are the same as the `074af87` reruns. All three run-start source manifests and the release report's manifest match `91c0ec1d…`. So do the registry manifest (`a79a8a09…`) and the packed CLI digest (`0be80eee…`). A Vite run started on `d3a9844`, #851's branch head, was stopped partway when #851 merged, and is not evidence.

| Run | Layout | Interventions | Decisions | Check, lint, raw paint, production | Verdict |
| --- | --- | --- | --- | --- | --- |
| [2026-10-16-vite-71bebd](runs/2026-10-16-vite-71bebd.json) | Vite | 0 | 0 | passed | **passed** |
| [2026-10-16-next-app-32d74a](runs/2026-10-16-next-app-32d74a.json) | Next root | 1: `init --help` probe (#857) | 0 | production failed: `axe-open` (#858) | failed: interventions, production |
| [2026-10-16-next-src-b6cb18](runs/2026-10-16-next-src-b6cb18.json) | Next src | 1: `init --help` probe (#857) | 0 | passed | failed: interventions |

Vite passes again, and Next root and Next src still fail, so S9 remains unmet. #845 holds in all three runs. Each keeps `minBlockSize: '100dvh'` and its `minmax(0, …)` track templates literal, keeps the breakpoint as a named constant in the screen file, and puts only `--app-size-content-max` in its token module. No run rendered documentation, decoded a data link, extracted a bundle, read CRM 01's registry source or referenced the live host or another checkout.

Both Next agents ran `npx ultima-design@latest init --help` before `--plan`. The CLI rejects the flag (`Unknown option '--help'`) and then prints its usage. No guidance prints a help command, so the reviews count the probe, as the #810 Vite review did (#857).

Next root's app fails `axe-open` in all four external cases. axe reports `aria-hidden-focus` on Base UI's four focus-guard spans around the open Select. In every other run, axe reports the same spans as an incomplete, and the runner's focus-cycle review resolves it. axe's `isModalOpen` heuristic needs a fixed element of at least 75% of the viewport at five sample points. Base UI's Select backdrop leaves the trigger exposed, and this app's Category trigger sits on the bottom-right sample point at 1280×800. So axe concludes no modal is open. Two re-measures of a copy of the app failed the same way. The failure comes from layout and the runner, not from the agent's choices (#858).

### Adoption recommendation gate

`pnpm verify release` on the same tree (report `20261016T193624-6cdd0770`, manifest `91c0ec1d…`, no source change), with the macOS settings under Reproduce, failed: 36 checks passed and 5 failed.

- **54-cell matrix:** all 54 cells executed, 18 each in Chromium, Firefox and WebKit. `consumer-bundles-next-app`, `consumer-bundles-next-src` and `consumer-elements` passed. `consumer-bundles-vite` failed the same 6 of 36 cells as on `074af87` (#847). The named gaps `tabs-indicator` and `date-picker-glyphs` stay explicit.
- **Four delivery paths:** css, stylex-subtree and cli passed in all three layouts. The registry path failed in all three on `axe-open` and `axe-switched-open` in the Cinder cases (#848).
- **`smoke-install`:** `consumer-smoke` passed.
- **Studio pairing and parity:** `palette`, `tokens-tests` and `docs-tests` passed.
- **`production-scenarios`:** all 44 cases passed. #849 did not recur, which fits an intermittent failure.
- **`tooling-tests`:** the leftover-process test that assumes `/proc` failed again (#846).

The gate is unmet on this revision: Next root and Next src fail on interventions (#857), and Next root also fails production (#858). `pnpm verify release` fails on macOS (#846, #847, #848).

### Defects filed

| Defect | Found in |
| --- | --- |
| [#857](https://github.com/frankieramirez/ultima/issues/857) `ultima-design` rejects `--help`, so agents probing for usage count as an intervention | Next root, Next src |
| [#858](https://github.com/frankieramirez/ultima/issues/858) External `axe-open` fails when the Select trigger sits on one of axe's modal sample points | Next root |

## Reruns on `3a6fa37` on macOS (#774)

The candidate is `3a6fa37`: main after #862, #867, #870, #872 and #873, plus the design-pass merges. The machine and executor are the same as the `074af87` reruns. All three run-start source manifests and the release report's manifest match `ffeee539f71d46fc7a030e65bb7ddcc9b9d12b284b57c45b972bbf603a158c79`. So do the registry manifest (`5df5e352…`) and the packed CLI digest (`dc986f61…`).

| Run | Layout | Interventions | Decisions | Check, lint, raw paint, production | Verdict |
| --- | --- | --- | --- | --- | --- |
| [2026-10-17-vite-7fe3de](runs/2026-10-17-vite-7fe3de.json) | Vite | 0 | 0 | passed | **passed** |
| [2026-10-17-next-app-551511](runs/2026-10-17-next-app-551511.json) | Next root | 0 | 0 | passed | **passed** |
| [2026-10-17-next-src-27671b](runs/2026-10-17-next-src-27671b.json) | Next src | 0 | 0 | passed | **passed** |

All three layouts pass S9 on one revision. #845 holds: each run keeps `minBlockSize: '100dvh'` and its `minmax(0, …)` track templates literal and puts only `--app-size-content-max` in its token module. #856 holds: each declares its breakpoint as a named constant in the screen file, DESKTOP in all three and WIDE as well in Next src. #857 holds: each agent ran `init --help`, which the install guide now prints, and the CLI printed its usage. No run rendered documentation, decoded a data link, extracted a bundle, read CRM 01's registry source or referenced the live host or another checkout. The reviews did not count these: Next src's `--yes` on the printed `shadcn add`, which copies init's own invocations; Vite's repeat of the printed component install, where shadcn skipped all 11 files as identical; Next src's repeat of that install at step #20 with `--overwrite=false`, which wrote nothing; summarizing the init plan and reading the built CSS, which carry out the printed review and cascade steps; deleting init's setup-check preview after replacing the page, which follows the starter comment; and the browser check, which follows the printed hand step.

Three earlier runs on `25dc6bf` also passed with 0 interventions and 0 decisions, but its gate failed the overall-deadline test under its own parallel load twice, which #872 fixed after that commit, so the evidence moved to `3a6fa37` and those runs are not retained.

### Adoption recommendation gate

`pnpm verify release` on the same tree (report `20261017T071847-66bc65a5`, manifest `ffeee539…`, no source change) passed: 41 of 41 checks, exit 0, on darwin arm64 with node v22.23.2. Only `XUL_APP_FILE` was set, for Firefox.

- **54-cell matrix:** all 54 cells executed and passed, 18 each in Chromium, Firefox and WebKit. `consumer-bundles-vite` passed 36 of 36, and `consumer-bundles-next-app`, `consumer-bundles-next-src` and `consumer-elements` passed 6 of 6 each. #847 now passes on macOS. The named gaps `tabs-indicator`, `date-picker-glyphs` and `drawer-backdrop-dismiss` stay explicit.
- **Four delivery paths:** css, stylex-subtree, registry and cli passed in Vite, Next root and Next src. #848 now passes on macOS.
- **`smoke-install`:** `consumer-smoke` passed 83 cases.
- **Studio pairing and parity:** `palette`, `tokens-tests` and `docs-tests` passed.
- **`production-scenarios`:** all 44 cases passed. #873 fixed #849.
- **`tooling-tests`:** 505 cases passed. #846 is fixed.

S9 is met on `3a6fa37`: all three layouts pass with 0 interventions and 0 decisions, and `pnpm verify release` passes on the same revision with every cell executed.

## Reproduce

```bash
pnpm --filter @ultima/docs build
node --experimental-strip-types scripts/first-screen.ts run --layout vite   # or next-app, next-src
node --experimental-strip-types scripts/first-screen.ts review <run-dir>/record.json <review.json>
node --experimental-strip-types scripts/first-screen.ts retain <run-dir>
node --experimental-strip-types scripts/first-screen.ts clean <run-dir>
```

Run one layout at a time. A run needs Claude Code signed in, network access to npm, and Chromium for Playwright.

On macOS 27, `pnpm verify release` needs Playwright's Firefox pointed away from the reserved profile folder:

```bash
FF=~/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/Resources
awk '{print} /^Name=Firefox$/{print "Profile=PlaywrightFirefox"}' $FF/application.ini > $FF/browser/application.ini
XUL_APP_FILE=$FF/browser/application.ini pnpm verify release
```
