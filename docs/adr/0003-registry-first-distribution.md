# 3. Registry-first distribution

Date: 2026-09-08

## Context

Ultima should be usable in any of the author's projects and shareable publicly. Options were an npm package, a shadcn-compatible registry that copies source into the consumer, or both.

## Decision

Distribution is registry-first. Consumers install from Ultima's hosted registry with the shadcn CLI and own the installed code. The docs site hosts the registry. A published npm package for tokens is deferred until a consumer needs it.

## Consequences

Consumers can customize freely, including with coding agents, which is the point. There is no upgrade path beyond re-installing an item, so versioning policy for a copy-source registry is fog on the map. Hosting the registry means the docs site is a v0 deliverable, not an afterthought.

## Amendment (2026-09-09)

The entry point is `npx shadcn add` of a per-target setup item, not `npx shadcn init`: `init` refuses a project without Tailwind on disk (see `docs/research/2026-09-08-shadcn-registry-non-tailwind.md`). The decision stands; only the command changed. The install flow is in the Registry and install section of `docs/spec/ultima.md`.

## Amendment (2026-09-22)

The npm gate opens for one package, the consumer CLI `ultima-design`. The CLI is a tool the consumer runs, not code they own, so publishing it leaves registry-first distribution in place. Tokens, components, the shared lib, and elements still reach a consumer only through the registry. The CLI inlines the private `@ultima/analysis` engine at build, so no `@ultima/*` package is published. The deferred tokens package stays deferred until a consumer asks for it. Decided on [Where the CLI lives in the workspace and what it consumes from the contributor engine](https://github.com/frankieramirez/ultima/issues/476); the package is specified under Consumer CLI in `docs/spec/ultima.md`. The name this amendment first recorded was a scoped one; it became the unscoped `ultima-design` when claiming an npm org was declined, on [Confirm the npm scope and first-publish access for the CLI](https://github.com/frankieramirez/ultima/issues/566).

## Amendment (2026-09-22): versioning and drift

The versioning policy this ADR left as fog is decided, on [The copy-source registry's versioning and update policy, and what status and diff compare against](https://github.com/frankieramirez/ultima/issues/468). The registry stays a moving latest with no versioned URLs, and possession stays the pin. Every served file now carries an item stamp: a one-line comment naming the item, the catalogue revision it was built at, and a content hash of its canonical form. The same values sit in each item's `meta.ultima`. shadcn keeps no install record, so the stamp inside the file is the only baseline that survives into the consumer's repository, and comparing the installed, local, and served hashes is what separates a consumer's edit from an upstream change. The canonical form ignores formatting, comments, the consumer's import aliases, and the `"use client"` directive, so shadcn's transforms and a consumer's formatter do not register as edits.

Alternatives set aside: a revision alone, which marks every item as moved on every deploy; a lockfile, which the Ultima CLI cannot write because shadcn performs the install; and versioned snapshot URLs, which the per-deploy rebuild of `apps/docs/public/` cannot keep. The element bundles join the same stamp in place of their bare build stamp (ADR 0009 is otherwise unchanged). The upgrade path is still reinstalling an item. What is new is that the consumer CLI's `status` and `diff` show when that is safe. The policy is in the Versioning and drift section of `docs/spec/ultima.md`.
