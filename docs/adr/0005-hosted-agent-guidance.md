# 5. Agent guidance is hosted, never installed

Date: 2026-09-09

## Context

Ultima is registry-first: a consumer runs `npx shadcn add`, source lands in their repository, and they own it. An agent-first surface is in scope, which raised the question of what an agent in that consumer's repository reads to use Ultima correctly. Three options were on the table: install an `AGENTS.md` or `DESIGN.md` at their root, install a guide file under the component directory, or ship no document and host the guidance instead. A design-system rationale document distributed as a registry item was proposed directly.

## Decision

Nothing documentary is installed into a consumer's repository. Guidance lives on three hosted surfaces: the `docs` field on each registry item, printed once by the CLI at install time; `/llms.txt`, generated build output holding the conventions, component list, and token names as plain Markdown at one fetchable URL; and the docs site's own pages for a human reader. `/tokens.json` publishes the tokens in machine-readable form alongside the CSS export.

## Consequences

Guidance cannot go stale in a consumer's repository, because there is none there to rot. A copied document would have had no update path: the consumer has no reason to re-run `add` on prose, and unlike a component they have edited, nothing in their workflow surfaces the drift. It also avoids overwriting a root-level file their scaffold owns, which the registry rules already forbid.

The cost is that guidance requires network access at the moment an agent needs it, and an agent working offline or behind a proxy gets only what the `docs` field printed at install time. `/llms.txt` and `/tokens.json` become part of the public contract: their URLs and shapes cannot move without breaking whatever reads them, and they must stay generated from the specification rather than hand-written, or Ultima acquires the second copy this decision exists to prevent.

## Amendment (2026-09-22)

The consumer CLI is an update path, and that answers the objection this decision rests on for tooling, though not for prose. `install` may write **managed files** into a consumer's repository: files the CLI stamps with its own version, rewrites byte for byte on every re-run, and removes with `uninstall`. There are two kinds, the consumer skill and hook entries in each harness's hook file. The skill carries the version stamp. A hook entry carries only the `ultima-design` marker, because its command is the same in every release and the behavior lives in the CLI the consumer pins ([Which events each harness hook fires on, what it runs, and what runs in CI](https://github.com/frankieramirez/ultima/issues/480)). Conventions stay hosted. A managed skill points at `/llms.txt` and the CLI's commands and restates no convention, so the only thing that can drift in the consumer's repository is a pointer the next `install` refreshes. Root documents stay forbidden: no `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, rules file, or README, whether written whole or merged into.

Two alternatives lost. Hooks wired by hand from the docs still land in the consumer's repository, as a copy with no update path, which is the failure this ADR exists to prevent. A global-only install cannot reach Codex, whose hooks load from the trusted project `.codex/` layer, or Copilot's cloud agent, which reads only `.github/hooks/` on the default branch (`docs/research/2026-09-22-harness-skill-and-hook-registration.md`). It would also run a CLI version that no lockfile in the consumer's repository pins. The rule and the write set are in the Consumer CLI section of `docs/spec/ultima.md`, decided on [Whether install writes into the consumer's repository](https://github.com/frankieramirez/ultima/issues/474).

## Amendment (2026-09-26): public skill installers

The consumer skill can also be installed through skills.sh and the Ultima Claude Code marketplace when the repository becomes public. Both use the existing source at `packages/cli/skill/ultima-design/SKILL.md`; the marketplace manifest declares its location without copying the instructions. Its version follows the CLI package.

These copies belong to the installer that creates them. They carry no CLI-managed stamp, and the CLI preserves them during install and uninstall. Consumers update or remove them through skills.sh or Claude Code. External skill installation adds neither the CLI dependency nor project hooks. The CLI remains the installation route for a managed project skill and hooks together.

Conventions remain hosted. This amendment permits distribution of the same pointer skill through additional installers and keeps the prohibition on installed root guidance documents until the DESIGN.md amendment below.

## Amendment (2026-09-29): consumer-owned design artifact

Theme Studio now exports a `DESIGN.md` from the current theme draft. Its theme registry item installs that file beside the stylesheet and editable JSON draft. A separate `design-md` registry item installs the default Ultima design document. Both writes are explicit shadcn installs. The consumer owns the result and can edit it; reinstalling may replace it through the CLI's overwrite flow.

This is an exception for a theme-specific design artifact. Studio export values come from the same draft as the CSS; the default document comes from the compiled token values. The hosted guide remains the source for Ultima conventions and component APIs. The consumer CLI still neither writes nor manages root documents, and setup items still avoid them. Consumers should regenerate or revise `DESIGN.md` when they change the theme.

## Amendment (2026-10-07): reviewed project initialization

[Decide the supported project bootstrap experience](https://github.com/frankieramirez/ultima/issues/726) accepts a dedicated `init` command for implementation. It may create a supported project through an official framework scaffold, invoke registry installation and perform the bounded application/configuration edits in [Consumer project bootstrap](../spec/consumer-setup.md), after showing a plan. A machine applies an inspected plan explicitly. Original bytes, input/output hashes and recovery records protect consumer edits; unsupported configuration requires manual setup.

These files become consumer-owned application source and configuration. They do not join `install`'s managed file set. `install` and `uninstall` keep their current skill/hook scope; `init` delegates that portion to them. The initializer neither writes nor merges root guidance documents, and preserves existing themes and design artifacts. Shared conventions stay hosted. Separate starter repositories were set aside because they would duplicate the framework scaffold and Ultima's integration recipes; a manual-only entry leaves the current alias/compiler/reset assembly burden intact.

## Amendment (2026-10-07): local product-theme discovery

Decided on [Decide how agents discover and maintain a product theme](https://github.com/frankieramirez/ultima/issues/727), accepted for implementation. An agent reads applicable product instructions and local design intent, traces active imports and theme boundaries, and associates a compatible draft before regenerating artifacts. Local consumer choices remain authoritative for the product. Hosted guidance defines Ultima's conventions and APIs.

The pointer skill may include a short discovery step and offline branch. The specification owns the detailed workflow, which the hosted guide will publish through its generator. If hosted guidance is unavailable, known local contracts and the pinned offline checks permit work whose requirements are established; unavailable facts stay unresolved. Remote registry comparisons retain their network requirement.

Future design exports delimit their generated content and identify its source. Agents preserve consumer prose and reconcile consumer edits even inside that region before updating it. The CLI's planned opt-in local freshness report is read-only. This adds no CLI-managed root document or automatic brand-selection authority. Legacy documents and saved drafts retain their values and ownership. Whole-file replacement through an explicit registry overwrite remains a consumer choice.

## Amendment (2026-10-11): generated Markdown guidance

[Serve Markdown versions of guidance pages and copy bundles linked from /llms.txt](https://github.com/frankieramirez/ultima/issues/810) adds generated hosted exports under `/guides/`. `/llms.txt` stays the compact index, within 64 KiB, and links the browser pages alongside their Markdown instructions and complete consumer-copy bundles. An HTTP client can read the install journey, Build a screen, support evidence, Recipes and every referenced lesson or recipe without rendering the docs application. Theme Studio remains an interactive editor.

The registry build generates `/guides/install.md`, `/guides/install/update.md`, `/guides/build-a-screen.md`, `/guides/support.md`, `/guides/recipes.md`, `/guides/lessons/<id>.md` and `/guides/recipes/<id>.md`. Authored MDX owns the prose. Setup descriptors own the manual steps, shared framework data owns the install commands, the composition projection owns copied paths, imports and dependencies, and the support manifest owns version and evidence claims. Required dynamic content must have a Markdown projection; an unknown component or missing bundle fails generation. Browser routes keep their current behavior.

These URLs join the hosted guidance contract. The production docs build checks their HTTP responses, discoverability, internal guidance links and source parity. The exports are build output and have no independently authored copy. Consumer installation and root-document ownership retain their existing boundaries.

## Amendment (2026-10-16): product pattern records

Decided on [Decide how a consumer records its own product patterns for the next agent](https://github.com/frankieramirez/ultima/issues/853). Ultima's hosted guidance cannot describe the compositions a product builds from Ultima, and an agent with no record of them copies the nearest file or reads raw registry source. A consumer agent records reusable compositions as one-line entries under `## Patterns` in the product's existing `DESIGN.md`, outside its generated region, as [Record product patterns](../spec/ultima.md#record-product-patterns) specifies.

This is consumer prose written by the consumer's agent, not a managed or installed file. No CLI command, export or registry item writes it, and an agent never creates `DESIGN.md` to hold it. Entries name files and purposes; conventions stay hosted and values stay in tokens, so the record adds no second copy of anything Ultima owns. The CLI's root-document prohibition and `init`'s preservation rules are unchanged.

## Amendment (2026-10-16): live specimen

Decided on [Decide whether the consumer app gets a live specimen of its installed items](https://github.com/frankieramirez/ultima/issues/854), accepted for implementation after [#774](https://github.com/frankieramirez/ultima/issues/774) closes. An `ultima-design specimen` command prints, or with `--write <path>` writes, one React module that renders every docs demo of each installed React item under the product's own theme, as [Specimen](../spec/ultima.md#specimen) specifies.

The module is consumer source written on request, like `init`'s preview. It is not a managed file: it carries no stamp, nothing refreshes it, and `install`, `uninstall` and `status` ignore it. The command edits no router or entry file and writes over nothing without `--force`. Its content is rendered examples generated from the docs demos, not conventions, so guidance stays hosted. The managed set stays the consumer skill and the hook entries, and `init`'s preview is unchanged.
