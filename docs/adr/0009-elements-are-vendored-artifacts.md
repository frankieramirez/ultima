# 9. Elements are vendored artifacts, not copy-source

Date: 2026-09-18

## Context

ADR 0003 made the registry copy-source: the CLI installs each component's source into the consumer's project and the consumer owns it from there. The element catalogue breaks the premise. Its hosts cannot run React and cannot compile StyleX, which is why they are element hosts at all, so there is no source form they could build and a generated file is the only artifact that reaches them. The same hosts still hold ADR 0004's re-skin promise, which is why the elements render into light DOM: a shadow boundary would seal them off from `data-theme` and consumer `--ult-*` overrides.

The alternatives were copy-source elements, which the host has no toolchain to build; an npm package, which ADR 0003's deferral already declines and no consumer has asked for; and wrapping the React catalogue, ruled out when the element map was charted because it drags React into hosts that chose not to run it.

## Decision

Elements ship as generated artifacts, never as installed source. Two surfaces, one build: a universal `registry:item` per element embeds the bundle bytes for hosts that can run the CLI, and the same file is served at a stable URL beside `/tokens.css` for hosts that cannot. The customization surface is tokens, attributes, and `part=` targets; a consumer who needs different behavior forks the repository. Possession is the pin: the served URL always carries the latest build, vendoring the file is the pin, an upgrade overwrites local edits, and each bundle carries a build stamp so drift is a diff away. ADR 0003 stands unchanged and continues to govern the React catalogue.

## Consequences

The registry now ships two artifact kinds, copy-source and vendored, and the difference has to stay legible: an element item's `dependencies` stay empty, its `registryDependencies` is a manifest-declared URL to `tokens-css`, and nothing derives an element's contents from hand-editable source the way a component item does.

A consumer cannot fix an element's bug by editing the installed file; fixes ride the next build. The mutable-latest URL means a host that hot-links follows every change without choosing to, the same contract `/tokens.css` already runs.

Zag.js, the element primitive layer under ADR 0008, travels inside the artifact and a consumer never installs it: a vendored bundle may contain dependencies a copy-source item never could.

Recorded on [Where the spec section and ADR land, and which release the element catalogue belongs to](https://github.com/frankieramirez/ultima/issues/160).
