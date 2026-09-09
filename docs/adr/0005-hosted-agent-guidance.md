# 5. Agent guidance is hosted, never installed

Date: 2026-09-09

## Context

Ultima is registry-first: a consumer runs `npx shadcn add`, source lands in their repository, and they own it. An agent-first surface is in scope, which raised the question of what an agent in that consumer's repository reads to use Ultima correctly. Three options were on the table: install an `AGENTS.md` or `DESIGN.md` at their root, install a guide file under the component directory, or ship no document and host the guidance instead. A design-system rationale document distributed as a registry item was proposed directly.

## Decision

Nothing documentary is installed into a consumer's repository. Guidance lives on three hosted surfaces: the `docs` field on each registry item, printed once by the CLI at install time; `/llms.txt`, generated build output holding the conventions, component list, and token names as plain Markdown at one fetchable URL; and the docs site's own pages for a human reader. `/tokens.json` publishes the tokens in machine-readable form alongside the CSS export.

## Consequences

Guidance cannot go stale in a consumer's repository, because there is none there to rot. A copied document would have had no update path: the consumer has no reason to re-run `add` on prose, and unlike a component they have edited, nothing in their workflow surfaces the drift. It also avoids overwriting a root-level file their scaffold owns, which the registry rules already forbid.

The cost is that guidance requires network access at the moment an agent needs it, and an agent working offline or behind a proxy gets only what the `docs` field printed at install time. `/llms.txt` and `/tokens.json` become part of the public contract: their URLs and shapes cannot move without breaking whatever reads them, and they must stay generated from the specification rather than hand-written, or Ultima acquires the second copy this decision exists to prevent.
