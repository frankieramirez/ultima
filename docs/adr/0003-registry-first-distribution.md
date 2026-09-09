# 3. Registry-first distribution

Date: 2026-09-08

## Context

Ultima should be usable in any of the author's projects and shareable publicly. Options were an npm package, a shadcn-compatible registry that copies source into the consumer, or both.

## Decision

Distribution is registry-first. Consumers run `npx shadcn init` against Ultima's hosted registry and own the installed code. The docs site hosts the registry. A published npm package for tokens is deferred until a consumer needs it.

## Consequences

Consumers can customize freely, including with coding agents, which is the point. There is no upgrade path beyond re-installing an item, so versioning policy for a copy-source registry is fog on the map. Hosting the registry means the docs site is a v0 deliverable, not an afterthought.
