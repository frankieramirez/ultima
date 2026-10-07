# Adoption delivery plan

Decided on [Decide the adoption delivery order and first-screen acceptance test](https://github.com/frankieramirez/ultima/issues/731), under [Make Ultima a plug-and-play StyleX design system](https://github.com/frankieramirez/ultima/issues/725). Status: accepted for implementation. This is a plan. It does not mean any slice has landed or that any acceptance suite has run.

The plan orders delivery of the map's five new decisions together with the work those earlier decisions accepted but never built. It defines the first-screen exercise, which is the acceptance test for the whole effort. It does not change Neutral, Tight, source ownership or [the accepted support matrix](consumer-support.md).

## Inventory at `f842ced`

Closed planning tickets are not implementation receipts. This table records what the source held when this plan was written. Recheck it before starting a slice.

| Obligation | Decided on | State at `f842ced` | Slice |
| --- | --- | --- | --- |
| Neutral base defaults, Ultima opt-in preset, saved-draft compatibility | [#614](https://github.com/frankieramirez/ultima/issues/614) | Studio starts with Neutral and has the Ultima preset, and legacy drafts resolve through the frozen v1/v2 table. Installed base tokens (`packages/tokens/src/tokens.stylex.ts`, `themes.ts`), `stockDraft()`, `/tokens.css` and the registry token exports still ship indigo/cyan. No update guidance page exists. | S1 |
| Tight base radius, Shape presets | [#644](https://github.com/frankieramirez/ultima/issues/644) | Studio's `default` shape is Tight (1/2/4/6). The installed base radius is still 2/4/10/12, and `scripts/smoke-next-styles.ts` asserts `10px`. | S1 |
| Theme adoption guidance across entry points | [#616](https://github.com/frankieramirez/ultima/issues/616) | The install page covers the theme walkthrough. The consumer skill lacks the brand-preservation and Studio pointers that [Guidance ownership](ultima.md#guidance-ownership) requires. | S5 |
| Rendered consumer proof, four delivery paths | [#617](https://github.com/frankieramirez/ultima/issues/617) | Not implemented. `scripts/smoke-theme.ts` covers preset values on hand-written fixtures, and nothing runs it. | S2 |
| 54-cell support matrix | [#618](https://github.com/frankieramirez/ultima/issues/618) | Not implemented. No consumer check runs Firefox or WebKit. | S8 |
| Project bootstrap (`init`) | [#726](https://github.com/frankieramirez/ultima/issues/726) | Decision files are uncommitted on branch `726-supported-project-bootstrap`. No `init` command exists. | S0, S7 |
| Product theme discovery and maintenance | [#727](https://github.com/frankieramirez/ultima/issues/727) | Decision files are uncommitted on branch `727-discover-and-maintain-product-theme`. Nothing is implemented. | S0, S5 |
| Screen composition guide and recipe discovery | [#728](https://github.com/frankieramirez/ultima/issues/728) | Decision files are uncommitted on branch `728-complete-screen-composition`. No `/build-a-screen` or `/recipes` page exists. | S0, S6 |
| `theme-mode` and `theme-scope` recipes | [#729](https://github.com/frankieramirez/ultima/issues/729) | Specified in [Mode and scope packaging](ultima.md#mode-and-scope-packaging). No registry item exists. | S3 |
| Consumer StyleX lint | [#730](https://github.com/frankieramirez/ultima/issues/730) | Specified in [consumer-lint.md](consumer-lint.md). Ultima ships no fragment and doctor has no lint diagnostics. | S4 |
| Token override example defect | [#723](https://github.com/frankieramirez/ultima/issues/723) | Fixed by #738. | done |
| Agent guidance "no documentation installed" defect | [#724](https://github.com/frankieramirez/ultima/issues/724) | Fixed by #736. | done |

## Assessment recommendations

The October 7 assessment named six gaps. Each one maps to a slice.

| Gap | Delivered by |
| --- | --- |
| Manual setup wiring | S7, the `init` command |
| Installed and Studio defaults differ | S1, the Neutral/Tight base rollout |
| Local theme discovery | S5, agent theme discovery and `doctor --theme` |
| Complete-screen guidance | S6, Build a screen and recipe discovery |
| Mode and portal recipes | S3, `theme-mode` and `theme-scope` |
| General StyleX linting | S4, the consumer lint fragment |

## Slices

Each slice becomes one or more build tickets in a single build effort. That build ticket is the slice's owner. The spec column names the document its implementation must satisfy and update. A slice's acceptance includes `pnpm test`, `pnpm typecheck`, `pnpm check:architecture` and the PR gates below. The table lists only what that slice adds.

| Slice | Delivers | Spec | Depends on | Acceptance |
| --- | --- | --- | --- | --- |
| S0 | Merge the uncommitted decision files for #726, #727 and #728 from their existing branches. | each decision's own files | none | `consumer-setup.md` and `screen-composition.md` exist on `main`, along with the ultima.md, theme-studio.md, ADR 0005 and CONTEXT amendments. This slice is a planning prerequisite, not a build ticket. |
| S1 | The Neutral/Tight base rollout: base tokens, `themes.ts`, `stockDraft()`, generated `tokens.css`/JSON and registry token exports move to Neutral with Tight radius. The Ultima preset revision stays unchanged. Add an update page to the install docs: what changes on reinstall, and how to keep the old look with the Ultima preset theme item. Fix `smoke-next-styles.ts` to assert against the token source, not a literal. | [Consumer default theme](ultima.md#consumer-default-theme), [theme-studio.md](theme-studio.md) | none | Every valid v1, v2 and v3 draft, autosave and fragment resolves to identical values in both modes. Neutral and Ultima pass all pairings at full precision. A fresh install's accent button and focus ring are neutral and danger keeps its role. `status` reports the base-token change to an existing consumer. `smoke-install` passes. |
| S2 | The shared installed-consumer runner from [consumer-proof.md](consumer-proof.md), in Chromium: the shared scene, the four delivery paths, and Vite plus Next root and `src`. Build it from `smoke-theme.ts` and the scaffold and registry-serve code in `smoke-install.sh`, extracted into shared helpers (see [Harness reuse](#harness-reuse)). Add an external-project mode for the first-screen exercise. | [consumer-proof.md](consumer-proof.md) | S1 for its expected default values. Building the runner can start in parallel, against the draft-derived oracle. | All four delivery paths and every browser pass condition pass in Chromium for the three layouts. Each report records source identity and is retained. The runner is a registered verifier check. |
| S3 | The `theme-mode` and `theme-scope` copy-source items, their docs page, and the doctor advisory for a missing root `[data-theme]` CSS. | [Mode and scope packaging](ultima.md#mode-and-scope-packaging) | S2 for its installed first-paint cases | The acceptance list in that section, run as S2 cases. |
| S4 | The consumer lint fragment, `ultima.eslint.mjs`, the install walkthrough and doctor's lint diagnostics. | [consumer-lint.md](consumer-lint.md) | S2 | The lint proof cases in [consumer-proof.md](consumer-proof.md#stylex-lint-proof) pass per layout. Exact combinations are published only once they pass. |
| S5 | Agent theme discovery: the consumer skill's local pointer and offline branch, the hosted guide section, export provenance and draft digest, delimited DESIGN.md generated regions, and read-only `doctor --theme`. | #727's ultima.md and theme-studio.md sections (after S0) | S0, S1 | #727's twelve verification scenarios. Legacy exports stay usable as `unlinked`. Ordinary doctor and hooks stay unchanged. |
| S6 | `/build-a-screen` with its six lessons, `/recipes`, catalogue-derived consumer copy bundles, and the Projects screen as S2's shared scene. | `screen-composition.md` (after S0) | S0, S1, S2 | The copied bundles compile and exercise their documented states in installed Vite and both Next layouts. |
| S7 | `ultima-design init` for new and existing projects. | `consumer-setup.md` (after S0) | S0, S1, S2. S3 and S4 only if their guidance is linked from init's output. | #726's acceptance: six framework/layout/manager paths, production paint and interaction, Next hydration, stale plans, interruption and rollback, harness preservation. |
| S8 | Expand S2 to the full 54-cell matrix, including Firefox, WebKit and the element lifecycle cells, with the named real-device gaps. | [consumer-support.md](consumer-support.md) | S2 | The full matrix runs green on one revision. Named gaps stay listed as gaps. |
| S9 | The first-screen exercise, as defined below, plus its verification scenario record. | this document | S1 to S7. S8 for a release result. | The pass conditions below. |

The order is S0, then S1 and S2 together, then S3 and S4 together, then S5 and S6, then S7, then S8 and S9. S7 comes late because #726 makes the Neutral/Tight base a prerequisite and because init's output should link finished guidance.

## Harness reuse

Keep one consumer runner and one matrix.

- `scripts/smoke-install.sh` stays the catalogue-breadth smoke: every item, block and element app builds and the CLI runs from its tarball. Its scaffold, registry-serve and tarball steps move into shared helpers that the runner also calls. It is not a second rendered matrix.
- `scripts/smoke-next-styles.ts` becomes one case inside the runner's Next layouts, asserting values derived from the token source.
- `scripts/smoke-theme.ts` becomes the runner's preset and delivery-path cases. Its hand-written fixtures give way to freshly scaffolded projects, as consumer-proof.md requires.
- The runner registers with the verifier, so it reuses the verifier's source identity: head commit and sha256 manifest. Each report adds the registry manifest hash, the CLI tarball digest and the draft digest. Reports go under `.scratch/consumer-proof/<run-id>/`. CI keeps them as artifacts for 90 days on every run, not only on failure.
- The browser dimension is a parameter. PRs run the affected Chromium cells. S8 adds engines to the same runner.
- Doctor and check results are inputs to the report. They are never rendered proof.

## First-screen exercise

The question is whether an unfamiliar person or agent can reach a correctly themed first screen using only public guidance.

### Inputs

- An empty directory on a supported toolchain: Node 22 or later with npm or pnpm. One run per layout: Vite, Next root `app`, Next `src/app`.
- A fixed product brief, committed with the S9 scenario record. It names a small product, a brand color that no preset provides, and one complete screen: a responsive list or detail view with a labelled form that has a required field, plus a portalled Dialog or Select.
- Public guidance only: the hosted docs, `/llms.txt`, Theme Studio, the CLI's printed output and the installed skill. The executor gets no repository checkout, internal spec or maintainer help. For a candidate before publication, the registry and docs are served from the candidate build at a loopback host that the executor treats as the public host.
- A custom theme made in Theme Studio from the brief's brand color, exported and installed through the documented path.

### Executors

- **Agent run:** a fresh coding agent with no Ultima context, given only the brief and the documented entry command. Run all three layouts for each release candidate.
- **Human run:** someone who has not worked on Ultima, on one layout, before the first public recommendation and after any change to S7's journey.

### What is recorded

- The full transcript or screen recording, with the commands run.
- **Manual interventions:** every action the guidance did not print or link, with the step and the reason it was needed.
- **Undocumented decisions:** every choice the executor had to make that the guidance did not settle and that changed the output.
- **Emitted styling:** `ultima-design check` and the S4 lint results, plus every raw color, length or shadow in consumer-authored styles outside the consumer's theme and token modules.
- **Production behavior:** the S2 runner in external-project mode, against the production build of the result. It checks computed root and portal values against the installed draft in both modes, `color-scheme`, required-field error naming, keyboard open and Escape on the portalled control, focus return, axe with the overlay open and closed, no horizontal overflow at 375, 768 and 1280 pixels, and for Next, no hydration warning. It uses only roles, accessible names and semantic tokens, never scene-specific test IDs.
- Source identity: candidate commit, registry manifest hash, CLI tarball digest and draft digest.

### Pass conditions

A run passes when it has no manual interventions outside printed hand steps, no undocumented decisions, a clean check and lint error count, no raw paint outside the consumer's theme modules, and every production assertion passing in Chromium. With S8, the agent runs' results also pass the cross-engine cells for their layout. Any failure files a defect against the guidance or the product. It is never waived for a release. The record lists the run IDs.

## Gates

- **Pull request:** each slice runs its own acceptance plus the affected installed-consumer cases under [Gates and cost](consumer-proof.md#gates-and-cost). `smoke-install` keeps its path filter.
- **Adoption recommendation:** S1 to S8 merged, then on one source revision: the full 54-cell matrix, all four delivery paths, `smoke-install`, the Studio pairing and parity gates, `pnpm verify release`, and passing agent runs in all three layouts. The first public recommendation also needs a passing human run.
- **Public claims:** until S9 passes, docs and README describe what each slice delivered and make no plug-and-play or "first screen in minutes" claim. Supported combinations are only those that passed. After publication, the public-domain stranger path from [the launch effort](https://github.com/frankieramirez/ultima/issues/587) reruns one agent exercise against the public host. That rerun belongs to the launch work, not to this plan.

## Compatibility and migration

- S1 changes what a reinstall or the live `/tokens.css` URL delivers. Installed sources and theme files are never rewritten. The update page and `status` name the change and offer the Ultima preset to keep the old look.
- Saved drafts, autosaves and fragments of every supported version resolve unchanged. The Ultima preset revision is frozen.
- Exports from before S5 stay usable without provenance and appear as `unlinked`.
- `theme-mode`, `theme-scope` and the lint fragment are opt-in. No existing consumer gains a provider, a new dependency or a rewritten config.
- `init` never runs on an existing project without a reviewed plan, and the existing `install` scope stays as it is.

## Exclusions

Publishing, deployment and launch announcements. Portfolio case-study work. Docs visual redesign. New catalogue components. CLI upstream-update and merge behavior. Real-device gaps beyond those [consumer-support.md](consumer-support.md) names. Rebuilding the docs `ThemeBoundary` on `ThemeScope` stays an optional follow-up.
