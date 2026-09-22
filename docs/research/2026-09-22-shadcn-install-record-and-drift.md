# Does shadcn 4.21.0 record what it installed, and how do copy-source CLIs detect drift?

## Findings

**No. `npx shadcn add @ultima/button` leaves no lockfile, manifest, hash, version, or source URL anywhere in the consumer.** `add` writes the transformed `files[].content`, package-manager changes for `dependencies`, an optional `.env.local` merge, an optional CSS merge for `cssVars`/`css`, and, in two narrow cases, `components.json`. Every other item field (`title`, `description`, `docs`, `meta`, `categories`, `author`, `extends`) is consumed at install time and discarded. shadcn's drift surfaces (`add --diff`, `--dry-run`, the deprecated `diff`) all take *the current registry* as the baseline, so they cannot tell a local edit from an upstream change; impeccable and jsrepo share that limit. Only updaters that persist an upstream commit (copier, cruft) separate the two, by regenerating both baselines and three-way merging.

Verified against `shadcn@4.21.0` (pinned in `scripts/build-registry.ts`, tag commit `5563a46`) by reading its published `dist/` and confirming the source paths below exist at that tag.

### What `add` writes

- **Component files.** For each `files[]` entry: resolve the target, run the transformer chain unless the file `type` is `registry:file` or `registry:item` (those are copied byte for byte), then classify. If the path exists, the CLI reads it, normalises CRLF, trims, and tests **strict string equality** against the transformed content (`Kn` in `update-files.ts`; `ignoreImports` is only on for workspaces). Equal means `skip (identical)`. Different means the prompt `The file X already exists. Would you like to overwrite?` (default no), or overwrite with `--overwrite`; a non-interactive run without `--overwrite` skips silently.
- **`components.json`, case 1.** `ensureRegistriesInConfig` writes only when an item address names a namespace absent from `registries` and the CLI can discover it from `package.json` or the public namespace index. Ultima's setup items already ship `registries["@ultima"]`, so `add @ultima/button` never touches it.
- **`components.json`, case 2.** `registry:base` / `registry:style` / `registry:theme` items rewrite `style`, `tailwind.baseColor`, `cssVariables`, `iconLibrary`, `rtl`, `menuColor`, `menuAccent`. Not reachable from a `registry:ui` item.
- **Nothing else.** `docs` is printed in the install summary. `meta` is read only by `shadcn docs` (`meta.links`) and `shadcn view`/`open` (`meta.importSpecifier`, `meta.moduleSpecifier`). No code path serialises `meta`, `categories`, `author`, or `extends`. The schema has no version, hash, or provenance field.

Consequence: the only provenance channel that survives install is the file body. A header comment or exported constant carrying the item name and a hash of the staged source is all Ultima can count on afterwards, and it lasts only until the consumer edits it.

### What `transformImport` and its siblings change

Order in `update-files.ts`: `transformImport`, `transformRsc`, `transformCssVars`, `transformTwPrefix`, `transformIcons`, `transformJsx` (when `tsx: false`), plus a Next 16 `middleware.ts` to `proxy.ts` rename.

`transformImport` (`transform-import.ts`) rewrites every import string literal: `@/registry/<style>/ui/x` to `aliases.ui`, `.../lib/utils` to `aliases.utils`, `.../lib/x` to `aliases.lib`, `.../components/x` to `aliases.components`, `.../hooks/x` to `aliases.hooks`, any other `@/registry/<x>` to `aliases.components`; plain `@/components/ui`, `@/components`, `@/hooks`, `@/lib` map to their aliases; `#/` and `#registry/` prefixes are normalised first. For Ultima's staged `@/registry/ultima/lib/*` and `@/registry/ultima/ui/*` this means every cross-item import changes. `transformRsc` also deletes a `"use client"` line whenever `config.rsc` is false, which the Vite setup item sets.

So a hash of the installed file never equals a hash of `registry/ultima/ui/button.tsx`. A comparison must re-run the transforms on the staged source with the consumer's `components.json` (what `add --diff` does), or hash a canonical form: import specifiers normalised, directives dropped, CRLF and trailing whitespace normalised.

### How shadcn's own drift commands work

- **`shadcn diff`** still exists in 4.21.0 but is labelled `[DEPRECATED] Use add [component] --diff instead.` It fetches the **shadcn** registry index only, treats an item as installed when any of its files exists under `resolvedPaths.components`, transforms the registry content, and runs `diffLines(transformed, local)`; more than one hunk means "updates available". It cannot see `@ultima/*` and cannot tell who changed the file.
- **`add --diff [path]` / `--dry-run` / `--view`.** Resolves items from any registry, runs the same create/overwrite/skip classification, and prints a `structuredPatch` of on-disk versus transformed content, with a "Formatting-only changes (spacing, quotes, semicolons)" short-circuit when the two match after whitespace and quote normalisation. This works for `@ultima/button`, but the baseline is still whatever the registry serves today.

### Comparable tools

- **impeccable `check` / `update`** (Rust CLI, `crates/skills/src/bundle.rs`). No manifest. Both download the latest signed bundle and compare the installed skill tree with it: file list equality, then per-file SHA-256. Any difference, local edit or upstream release, returns "Updates available", and `update` removes and recopies the skill directory, so local edits inside the tree are lost. The version comes from `version:` in the installed `SKILL.md`; `DESIGN.md` and `PRODUCT.md` survive only because they sit outside the tree.
- **jsrepo `update`.** No lockfile. With no arguments it fetches every configured registry manifest, resolves each item's target path from `jsrepo.json` `paths`, and counts the item as installed if any target file exists. It then fetches the remote file and shows `diffLines(oldContent, content)` for interactive accept or reject. Same upstream-only baseline.
- **copier / cruft.** Both persist the template's git commit (`_commit` in `.copier-answers.yml`; `commit` in `.cruft.json`), regenerate the project from the old and new template versions, and apply that delta as a three-way merge with inline conflict markers or `.rej` files. `_skip_if_exists` and cruft's `skip` list exclude files. This is the only pattern of the four that separates "you edited it" from "upstream changed".

### Facts later tickets will need

1. shadcn writes no record; a provenance marker must live inside the staged file content.
2. Equality at install is strict after CRLF/trim normalisation; any content difference triggers the overwrite prompt.
3. `registry:file` and `registry:item` files bypass every transform, so setup items are hash-stable; `registry:ui` and `registry:lib` files are not.
4. `add --diff` is the sanctioned diff surface for third-party registries; `diff` is deprecated and shadcn-registry-only.
5. Detecting a local edit requires a baseline shadcn does not keep: either the install-time hash embedded in the file or a per-version snapshot the docs site serves.

## Sources

- `/home/f/orca/workspaces/ultima/murre/scripts/build-registry.ts` line 29: `const SHADCN = 'shadcn@4.21.0'`.
- `/home/f/orca/workspaces/ultima/murre/docs/spec/ultima.md` "Registry and install", steps 1 and 5 of Generation: staged specifiers `@/registry/ultima/lib/*` and `.../ui/*`, and the setup items' `components.json` with `registries["@ultima"]` and `rsc` false for Vite.
- https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/packages/shadcn/src/utils/updaters/update-files.ts (read via the published `dist/` of 4.21.0): create/overwrite/skip classification, `Kn` strict comparison, the overwrite prompt, `--overwrite` gating, `.env` merge, raw copy for `registry:file`/`registry:item`, transformer order.
- https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/packages/shadcn/src/utils/transformers/transform-import.ts: the alias rewrite table quoted above.
- https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/packages/shadcn/src/utils/add-components.ts: `docs` printed, not written; `ensureRegistriesInConfig` is the only `components.json` write for a `registry:ui` add.
- https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/packages/shadcn/src/commands/diff.ts: deprecation text, shadcn-index-only lookup, `existsSync` as the installed test, `diffLines` comparison.
- https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/packages/shadcn/src/commands/add.ts: `--diff [path]`, `--view [path]`, `--dry-run`, `--overwrite` options; dry-run path sets `writeFile: false`.
- https://ui.shadcn.com/schema/registry-item.json: `meta` "any key value pairs", `docs` markdown string, `categories`, `extends` (style items only); no version, hash, or provenance property.
- https://ui.shadcn.com/docs/cli: `add` options and `--diff [path]` "show diff for a file".
- https://github.com/pbakaus/impeccable/blob/main/crates/skills/src/bundle.rs `is_up_to_date`: file-list equality then per-file `hash_skill_file` SHA-256 against the freshly downloaded bundle. https://github.com/pbakaus/impeccable/blob/main/crates/skills/src/commands.rs `check` and `update`: "Skills are up to date" / "Updates available" from that boolean. https://github.com/pbakaus/impeccable/blob/main/docs/CLI-CONTRACT.md: refresh removes and recopies skill dirs; version read from `SKILL.md`.
- https://github.com/jsrepojs/jsrepo/blob/main/packages/jsrepo/src/commands/update.ts: installed test is `existsSync` on the resolved target path, no lockfile. https://github.com/jsrepojs/jsrepo/blob/main/packages/jsrepo/src/utils/add.ts: `oldContent` from disk, `diffLines(file.oldContent, file.content)`. https://jsrepo.dev/docs/cli/update: options `--all`, `--expand`, `--max-unchanged`, `--overwrite`.
- https://copier.readthedocs.io/en/stable/updating/: `_commit` baseline, regenerate old and new, three-way merge, inline conflict markers or `.rej`, `_skip_if_exists`.
- https://cruft.github.io/cruft/: `.cruft.json` `template`, `commit`, `skip`; `cruft check` compares the stored commit against the template repo; `cruft diff` shows project-vs-template changes.
