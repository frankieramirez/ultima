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
