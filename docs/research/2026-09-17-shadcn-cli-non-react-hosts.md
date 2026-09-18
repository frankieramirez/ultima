# Can the shadcn CLI install a custom element into a host with no React and no components.json?

## Findings

**Yes, if the item is universal: `type: "registry:item"`, every file `type: "registry:file"` with an explicit `target`. No, for a `registry:ui` item.** A universal item installs from a raw `.json` URL or a local path into a directory that holds nothing but an `index.html`: no `package.json`, no `components.json`, no tsconfig, no framework, no React. Files land at the literal `target` under the project root, byte for byte, with no transformer touching them. A `registry:ui` item, with or without `target`, never reaches that path: without `package.json` the CLI offers to scaffold a whole new project; with `package.json` but no `components.json` it offers to run `init`, which refuses a project without Tailwind. `dependencies` on a universal item run the detected package manager (npm when nothing is detected), and npm creates a `package.json` in a bare directory rather than failing, so a custom-element item meant for a no-Node host must carry no `dependencies` and bundle whatever it imports. A host with no Node at all cannot run `npx` and must fetch a built bundle from a URL the docs site serves, which today means adding the file to `apps/docs/public/` and a stanza to `apps/docs/public/_headers`, exactly as `/tokens.css` is done. Verified against shadcn 4.21.0 (published 2026-09-04, the current `latest`) and repo HEAD `a87a63b` (2026-09-17), with the runs in section 6.

Conclusion for the ticket: the element catalogue can ride the existing registry for hosts that have Node, as universal `registry:item`s, but a static page cannot use the CLI, so a second surface is unavoidable for that host. The cheap version of the second surface is a bundle served from the docs site next to `/tokens.css`. Both surfaces can be fed from one build, since a universal item's `files[].content` is the same string the docs site would serve.

### 1. What `add` requires on disk, by item kind

Source: `packages/shadcn/src/commands/add.ts` (action body, lines 67-328) and `preflights/preflight-add.ts`.

The order of operations in `add`:

1. `getConfig(cwd)` reads `components.json`. If absent, a shadow config is built with `createConfig({ style: "new-york", resolvedPaths: { cwd } })` (`add.ts` lines 79-88). `createConfig` defaults `tsx: true`, `rsc: false`, empty `tailwind.css`, and alias paths under `cwd` (`utils/get-config.ts` line 345-370).
2. The first component address is fetched to learn its type (`add.ts` line 118). A raw `https://…/x.json` URL and a local `./x.json` path are both first-class addresses (`registry/address.ts` lines 46-53, `registry/utils.ts` `isUrl`/`isLocalFile`; docs: "components: name, url or local path to component", `apps/v4/content/docs/(root)/cli.mdx` line 75).
3. If `isUniversalRegistryItem(item)` and not a dry run, it calls `addComponents(...)` with the shadow config and returns (`add.ts` lines 127-130). `preFlightAdd` is never reached.
4. Otherwise `preFlightAdd` runs (`add.ts` line 167). It returns `MISSING_DIR_OR_EMPTY_PROJECT` when there is no `package.json` ("We assume if no package.json exists, the project is empty", `preflight-add.ts` lines 19-30), `MISSING_CONFIG` when there is no `components.json` (lines 32-46), and exits 1 when `components.json` exists but `getConfig` throws, which it does when no tsconfig/jsconfig loads or an alias cannot be resolved (`get-config.ts` `resolveConfigPaths` lines 47-70).
5. `MISSING_CONFIG` prompts "You need to create a components.json file to add components. Proceed?" then `promptForBase`, `promptForPreset`, and `runInit` with `skipPreflight: false` (`add.ts` lines 171-222), which is the Tailwind preflight documented in `docs/research/2026-09-08-shadcn-registry-non-tailwind.md` section 2. `--yes` does not skip this prompt (run T4b).
6. `MISSING_DIR_OR_EMPTY_PROJECT` prompts "Select a component library" and then `createProject`, which scaffolds a new Next/Vite app (`add.ts` lines 226-271).

So the minimum on disk:

| Item | Minimum on disk for `add` to write files |
|---|---|
| universal `registry:item` (all files `registry:file` + `target`) | the target directory. Nothing else. |
| `registry:ui`, `registry:lib`, `registry:component`, or `registry:item` with any file lacking `target` or typed other than `registry:file`/`registry:item` | `package.json`, a parseable `components.json`, and a loadable `tsconfig.json`/`jsconfig.json` with the aliases resolvable. Framework may be `manual`; React is never checked. |

`isUniversalRegistryItem` (`registry/utils.ts` lines 284-309): type must be `registry:item` or `registry:file`, and every file must have a truthy `target` and type `registry:file` or `registry:item`. An item with no files is universal too. Docs: "As of 2.9.0, you can create universal items that can be installed without framework detection or components.json. To make an item universal i.e framework agnostic, all the files in the item must have an explicit target." (`registry/examples.mdx` lines 988-1046).

No code path checks for React. `getProjectInfo` (`utils/get-project-info.ts` lines 46-91) globs for framework config files and reads `package.json`; when nothing matches, `framework` is `FRAMEWORKS["manual"]` and `add` proceeds. Run T7 installed a `registry:ui` `.js` custom element into a host whose `package.json` is `{"name":"t7","private":true}`.

### 2. What happens to the file contents

`utils/updaters/update-files.ts` lines 106-200:

- Files typed `registry:file` or `registry:item` skip the whole transformer chain: "Skip transformers for universal item files (registry:file and registry:item) to preserve their original content as they're meant to be framework-agnostic" (lines 166-176). Run T5a confirms: an `import { css } from '@/lib/utils'` line in a `registry:file` `.js` survived untouched.
- Files of any other type (`registry:ui` included) go through ts-morph `transformImport`, `transformRsc`, `transformCssVars`, `transformTwPrefixes`, `transformIcons`, `transformMenu`, `transformAsChild`, `transformRtl`, `transformFont`, `transformCleanup`, and `transformJsx` when `tsx: false` (lines 176-198). A `.js` custom-element file parses fine under ts-morph and most guards are off with a plain `components.json`, but `transformImport` will rewrite `@/registry/...`, `@/components/ui`, `@/lib` specifiers.
- **Gotcha:** before the universal check, `if (!config.tsx) filePath = filePath.replace(/\.tsx?$/, ...)` renames `.ts` to `.js` and `.tsx` to `.jsx` for every file, universal or not (lines 131-135). The content is not converted. Run T6: a universal item carrying both `ult-button.js` and `ult-button.ts` into a host whose `components.json` says `tsx: false` tried to write the `.ts` source to `ult-button.js` and hit the overwrite prompt against the real `.js`. With no `components.json` the shadow config has `tsx: true`, so this only bites hosts that have a `components.json` with `tsx: false`. Ship `.js` for custom elements, or never pair `.ts` and `.js` of the same basename in one item.
- `updateFiles` skips a file whose `content` is empty (line 108). `content` is what `shadcn build` embeds from `path` (`registry/loader.ts`), so a hand-written item JSON can carry `content` inline, which is what the local runs in section 6 did.

### 3. Can `files[].target` place a file at an arbitrary path?

Yes, anywhere inside the project root, and only there.

- `resolveFilePath` (`update-files.ts` lines 386-450): `~/x` resolves to `path.join(cwd, "x")` and returns before any alias or `src/` logic (lines 419-422). A target without `~/` goes through `resolveAliasTarget` for `@ui/`, `@components/`, `@lib/`, `@hooks/` placeholders, then `src/` is added or stripped by `projectInfo.isSrcDir` (lines 442-444). Docs: "Use `~` to refer to the root of the project e.g `~/foo.config.js`" (`registry-item-json.mdx` line 238). Nested targets such as `~/vendor/ultima/ult-button.js` create the directories (`update-files.ts` lines 264-267; run T5a).
- `validateFilesTarget` (`utils/add-components.ts` lines 451-471) runs `isSafeTarget` (`utils/is-safe-target.ts`) on `target ?? path` for every file before anything is written. It rejects any `..`, `~` combined with `../`, URL-encoded traversal, null bytes, control characters, Windows drive letters, and absolute paths outside `cwd`. Runs T5b (`~/../outside.js`) and T5c (`/tmp/abs.js`) both aborted with `We found an unsafe file path "…" in the registry item. Installation aborted.`
- `-p, --path <dir>` on `add` overrides placement for the whole item: a directory puts every file's basename in it, a file path applies to the first file only (`update-files.ts` lines 398-417; `cli.mdx` line 82).
- The zod schema makes `target` required for `registry:file` and `registry:page`, optional otherwise (`registry/schema.ts` lines 100-114). A `registry:ui` file with a `~/` target is honoured (run T7b wrote `vendor/ultima/ult-card.js`), but the item is still not universal because the file type is `registry:ui`, so it still needs `package.json` + `components.json` (run T5e).

### 4. Does a raw URL work without `components.json`?

Yes. `add.ts` line 79 tolerates a missing `components.json` (shadow config), `ensureRegistriesInConfig` does nothing for a plain URL, and `getRegistryItems([url])` fetches it with the shadow config. Runs T1 and T2 installed `https://ultima.systems/r/tokens-css.json` and `https://ultima.systems/r/setup-vite.json` into directories with no `components.json`. Run T5a did the same for a local `./reg/ult-button.json`.

Two caveats:

- `registryDependencies` written as `@ultima/...` need the `@ultima` namespace in `components.json` `registries`. Run T7c: `add https://ultima.systems/r/button.json` into a host with a `components.json` that lacks `registries["@ultima"]` failed with `Unknown registry "@ultima"`. The served `button.json` lists `@ultima/tokens` and `@ultima/lib` (`https://ultima.systems/r/registry.json`). A custom-element item aimed at a host with no `components.json` must either have no `registryDependencies` or write them as full URLs (`https://ultima.systems/r/<name>.json`), which resolve without a namespace (`registry-item-json.mdx` lines 162-170).
- `--dry-run`, `--diff`, `--view` fall through the universal short-circuit (`add.ts` line 127 requires `!isDryRun`) and hit `preFlightAdd`, so they are not usable in a bare directory.

### 5. How `dependencies` behave with no `package.json`

`addProjectComponents` calls `updateDependencies` before `updateFiles` on every path, universal included (`add-components.ts` lines 104-130). Inside `updateDependencies` (`utils/updaters/update-dependencies.ts` lines 13-100):

- `getPackageInfo(cwd, false)` returns `null` when there is no `package.json` (`utils/get-package-info.ts`, `throws: false`), so nothing is deduped against installed packages.
- `getPackageManager(cwd)` uses `@antfu/ni` `detect`; with no lockfile or `packageManager` field it returns `"npm"` (`utils/get-package-manager.ts` lines 5-23).
- It then runs `npm install -- <deps>` and `npm install -D -- <devDeps>` in `cwd` via `execa` (lines 373-400). npm creates a `package.json` when none exists. Run T2: `add https://ultima.systems/r/setup-vite.json` in a directory holding only `index.html` produced `package.json`, `package-lock.json`, and `node_modules/` with `@stylexjs/stylex ^0.19.1`, `@stylexjs/unplugin ^0.19.1`, `unplugin ^2.3.11`. If npm is not on PATH the `execa` call throws and nothing is written, since files come after dependencies.
- With no dependencies on the item the whole updater returns early (line 35) and nothing runs. Run T1 (`tokens-css`, no `dependencies`) wrote only `ultima-tokens.css`.

So `dependencies` is not ignored in a bare host; it drags a Node project into existence. A custom-element item for a no-Node host must list no `dependencies` and no `devDependencies` and ship self-contained modules (bare specifiers in an ESM module would also fail to resolve in a browser without an import map).

### 6. Runs

All with `CI=1`, stdin from `/dev/null`, `npx -y shadcn@4.21.0`, under the session scratchpad. Output stripped of ANSI codes.

**T1** empty directory, `add https://ultima.systems/r/tokens-css.json`

```
- Checking registry.
✔ Checking registry.
- Updating files.
✔ Created 1 file:
  - ultima-tokens.css
Import './ultima-tokens.css' once, from your root layout or entry stylesheet, then read the tokens with var(--ult-color-surface) and friends. Set data-theme="dark" or "light" on <html> to pin a mode; without it the file follows the operating system.
```

Directory afterwards: `ultima-tokens.css` only.

**T2** directory with only `index.html`, `add https://ultima.systems/r/setup-vite.json`

```
- Checking registry.
✔ Checking registry.
- Installing dependencies.
✔ Installing dependencies.
- Updating files.
✔ Created 2 files:
  - components.json
  - ultima.vite.ts
Ultima on Vite, three steps: …
```

Directory afterwards: `components.json index.html node_modules package.json package-lock.json ultima.vite.ts`; `package.json` is `{"dependencies":{"@stylexjs/stylex":"^0.19.1"},"devDependencies":{"@stylexjs/unplugin":"^0.19.1","unplugin":"^2.3.11"}}`.

**T3** directory with only `index.html`, `add https://ultima.systems/r/button.json` (`registry:ui`)

```
? Select a component library › - Use arrow-keys. Return to submit.
❯   Base UI (Recommended)
    React Aria
    Radix UI
```

Stalled on the prompt; nothing written.

**T4 / T4b** `package.json` + `index.html`, no `components.json`, `add [--yes] https://ultima.systems/r/button.json`

```
? You need to create a components.json file to add components. Proceed? › (Y/n)
```

Same with `--yes`. Nothing written.

**T5a** directory with only `index.html`, local `./reg/ult-button.json`: `registry:item` with three files, `elements/ult-button.js` (`registry:file`, target `~/vendor/ultima/ult-button.js`), `elements/ult-button.ts` (`registry:item`, target `~/vendor/ultima/ult-button.ts`), `elements/ult-tokens.css` (`registry:file`, target `~/vendor/ultima/tokens.css`), no `dependencies`

```
- Checking registry.
✔ Checking registry.
- Updating files.
✔ Created 3 files:
  - vendor/ultima/ult-button.js
  - vendor/ultima/ult-button.ts
  - vendor/ultima/tokens.css
Add <script type=module src=/vendor/ultima/ult-button.js> to the page.
```

`vendor/ultima/ult-button.js` content identical to the item, including the untouched `import { css } from '@/lib/utils';` line. No `package.json`, no `components.json` created.

**T5b** same directory, target `~/../outside.js`

```
We found an unsafe file path "~/../outside.js" in the registry item. Installation aborted.
```

**T5c** same directory, target `/tmp/abs.js`

```
We found an unsafe file path "/tmp/abs.js" in the registry item. Installation aborted.
```

**T5d / T5e** same directory, `registry:ui` item with a `.js` file, without and with a `~/` target: both stall on `Select a component library`, nothing written.

**T6** `package.json` + `jsconfig.json` + `components.json` with `tsx: false`, local `./reg/ult-button.json` (T5a's item)

```
- Updating files.
? The file ult-button.ts already exists. Would you like to overwrite? › (y/N)
```

`vendor/ultima/ult-button.js` had been written from the `.js` source first; the `.ts` file was renamed to `.js` and collided.

**T7a / T7b / T7c** `package.json` (`{"name":"t7","private":true}`, no React), `tsconfig.json` with `@/*` → `./src/*`, `components.json` (`style: base-ultima`, `tsx: true`, no `registries`)

- T7a `add --yes ./reg/ult-ui.json` (`registry:ui`, `.js`, no target): `Created 1 file: src/components/ui/ult-card.js`.
- T7b `add --yes ./reg/ult-uitarget.json` (`registry:ui`, `.js`, target `~/vendor/ultima/ult-card.js`): `Created 1 file: vendor/ultima/ult-card.js`.
- T7c `add --yes https://ultima.systems/r/button.json`: `Unknown registry "@ultima". Make sure it is defined under "registries" in your components.json or package.json file`.

### 7. The served registry

`https://ultima.systems/r/registry.json` returned 200 `application/json` on 2026-09-17: name `ultima`, homepage `https://ultima.systems`, 47 items. `tokens` and `lib` are `registry:lib`; 41 components are `registry:ui` with one file each, `dependencies` `@base-ui/react` + `@stylexjs/stylex` (Skeleton and Spinner list only `@stylexjs/stylex`), `registryDependencies` `@ultima/tokens` + `@ultima/lib` (Sidebar adds `@ultima/dialog`); `setup-vite`, `setup-next`, `tokens-css` are `registry:item` with every file `registry:file` and a `~/` target, so they are the only universal items today. `https://ultima.systems/r/setup-vite.json` returned 200.

`https://ultima.systems/tokens.css` returned `HTTP/2 200`, `content-type: text/css; charset=utf-8`, `access-control-allow-origin: *`, `cache-control: public, max-age=14400, must-revalidate`, `etag`, `server: cloudflare`. The repo's `apps/docs/public/_headers` declares `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=0, must-revalidate` for `/r/*`, `/tokens.css`, `/tokens.json`, `/llms.txt`, and says Content-Type is left to Cloudflare Pages ("Pages types these from the file extension"). The live `max-age=14400` differs from the file's `max-age=0`; either the deployed `_headers` predates the committed one or the edge is layering its own cache header. Note for whoever ships a bundle: check the live header after deploy.

`scripts/build-registry.ts` copies `packages/tokens/dist/tokens.css` into the registry stage (line 206) and into `apps/docs/public/` (`TOKEN_EXPORTS`, line 23), and synthesises the `tokens-css` item with `target: '~/ultima-tokens.css'` (lines 226-228). `apps/docs/public/r/*.json`, `tokens.css`, `tokens.json`, `llms.txt` are gitignored build output; `_headers` is committed.

### 8. What a static HTML page has to do instead

Nothing in the CLI helps a host without Node: `npx` is Node. The CLI also never emits a URL a browser can load; it writes files into a checkout. So for that host the docs site has to serve the element bundle directly, the way `/tokens.css` is served:

1. Build the element module(s) to a self-contained ESM file (no bare specifiers, or an import map shipped beside it) and, if wanted, an IIFE for `<script>` without `type="module"`.
2. Copy it into `apps/docs/public/` during `registry:build`, alongside `tokens.css` (`scripts/build-registry.ts` step 6 in `docs/spec/ultima.md`, "Publish the exports").
3. Add a `_headers` stanza for the path with `Access-Control-Allow-Origin: *` so a page on another origin can `<script type="module" src>` or `fetch` it; module scripts are CORS-checked, classic scripts are not.
4. The consumer writes `<script type="module" src="https://ultima.systems/<path>"></script>` and uses the tag. `/tokens.css` stays a separate `<link>` unless the bundle injects its own custom properties.

Cache policy is the open question: `/tokens.css` is `must-revalidate` with a short or zero max-age, which means the URL is mutable and a page always gets the latest. A component bundle probably wants a versioned path (`/elements/v1/ultima.js`) plus a moving `latest`, since a behaviour change under an unversioned URL is a live-site break; `tokens.css` gets away with it because tokens are additive.

The same `content` string can feed both surfaces: `shadcn build` embeds `files[].path` content into the item JSON, and the docs site can serve the same staged file at a plain URL. One build, two addresses.

### Facts later tickets will need

- shadcn `4.21.0` is `latest` (npm `time.modified` 2026-09-04T05:34Z); source HEAD `a87a63b2ca25143d26c8bd0903e4e9bc77b3f824` (2026-09-17) still reads `4.21.0` in `packages/shadcn/package.json`.
- Universal item definition: `packages/shadcn/src/registry/utils.ts` `isUniversalRegistryItem` lines 284-309; short-circuit in `commands/add.ts` line 127; transformer skip in `utils/updaters/update-files.ts` lines 166-176.
- Shape of a no-Node-host item: `type: "registry:item"`, every file `type: "registry:file"` with `target: "~/…"`, no `dependencies`, no `devDependencies`, `registryDependencies` empty or full URLs, `.js` not `.ts`, `docs` string as the only install-time message.
- `preFlightAdd` needs `package.json` (else `MISSING_DIR_OR_EMPTY_PROJECT` → scaffold prompt) and `components.json` (else `MISSING_CONFIG` → init prompt, not skipped by `--yes`): `preflights/preflight-add.ts` lines 19-46, `commands/add.ts` lines 167-271.
- `isSafeTarget` (`utils/is-safe-target.ts`) rejects `..`, absolute paths outside cwd, and `~` with `../`; enforced by `validateFilesTarget` in `utils/add-components.ts` lines 451-471.
- `tsx: false` in a consumer `components.json` renames `.ts`→`.js` and `.tsx`→`.jsx` for every file including universal ones, without converting content (`update-files.ts` lines 131-135).
- `updateDependencies` runs before `updateFiles`; with no `package.json` it runs `npm install` and npm creates one (`update-dependencies.ts`, `add-components.ts` lines 104-130; run T2).
- `--dry-run`/`--diff`/`--view` bypass the universal short-circuit and need `package.json` + `components.json`.
- The served `registry:ui` items list `@ultima/*` registryDependencies, so a raw-URL install into a host whose `components.json` has no `@ultima` namespace fails with `Unknown registry "@ultima"` (run T7c); the setup items are what write that namespace.
- Docs site headers live in `apps/docs/public/_headers` (committed); CORS `*` is already set for `/r/*` and `/tokens.css`; the live edge returned `max-age=14400` rather than the file's `max-age=0`.

## Sources

- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/commands/add.ts: shadow config when `components.json` is missing (lines 79-88), universal short-circuit (127-130), `MISSING_CONFIG` init prompt (171-222), `MISSING_DIR_OR_EMPTY_PROJECT` scaffold (226-271), dry-run fallthrough.
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/preflights/preflight-add.ts: `package.json` and `components.json` checks, `getConfig` failure exit.
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/registry/utils.ts: `isUniversalRegistryItem` (284-309), `isUrl`/`isLocalFile` (264-275).
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/registry/address.ts: URL and local-path addresses (46-53).
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/registry/schema.ts: `registryItemTypeSchema` (81-98), `registryItemFileSchema` target rules (100-114).
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/updaters/update-files.ts: `.ts`→`.js` rename (131-135), universal transformer skip (166-176), `resolveFilePath` and `~/` handling (386-450), directory creation (264-267).
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/add-components.ts: install order (85-152), `validateFilesTarget` (451-471).
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/is-safe-target.ts: traversal and absolute-path rejection.
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/updaters/update-dependencies.ts: `getPackageInfo(cwd,false)`, package-manager dispatch, `npm install -- …`.
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/get-package-manager.ts: `@antfu/ni` `detect`, `npm` fallback.
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/get-package-info.ts: `throws: false` returns null without `package.json`.
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/get-config.ts: `createConfig` defaults (345-370), `resolveConfigPaths` tsconfig requirement (47-70).
- https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/get-project-info.ts: `manual` framework fallback, no React check (46-91).
- https://ui.shadcn.com/docs/registry/examples (`apps/v4/content/docs/registry/examples.mdx` lines 988-1046): universal items "installed without framework detection or components.json", all files need an explicit target, universal item with `dependencies`.
- https://ui.shadcn.com/docs/registry/registry-item-json (`registry-item-json.mdx`): `registry:item` "Use for universal registry items" (119), `dependencies` are npm packages (133-160), `registryDependencies` address forms including URL and `./local.json` (162-170), `~` is project root (238), alias placeholders (240-244).
- https://ui.shadcn.com/docs/cli (`(root)/cli.mdx` lines 59-87): `add` accepts "name, url or local path", `-p, --path`, `--dry-run`, `--yes`.
- https://ultima.systems/r/registry.json, https://ultima.systems/r/setup-vite.json, https://ultima.systems/tokens.css (fetched 2026-09-17): item types and dependencies, response headers.
- /home/f/Projects/private/ultima/apps/docs/public/_headers: CORS and cache stanzas for `/r/*`, `/tokens.css`, `/tokens.json`, `/llms.txt`.
- /home/f/Projects/private/ultima/scripts/build-registry.ts (lines 23, 206, 226-228, 246): token export copy, synthesised `tokens-css` item, `shadcn build` invocation.
- /home/f/Projects/private/ultima/docs/spec/ultima.md "Registry and install": catalogue, entry point, tokens CSS export, generation steps.
- /home/f/Projects/private/ultima/docs/research/2026-09-08-shadcn-registry-non-tailwind.md: `init` Tailwind preflight, transformer chain, placement rules.
- `npm view shadcn version time.modified` on 2026-09-17: `4.21.0`, `2026-09-04T05:34:07.315Z`.
- Runs T1-T7 under `/tmp/claude-1000/-home-f-Projects-private-ultima/8cf8d4fc-2bb2-4122-8188-1e91f873bf8e/scratchpad/t*` with `npx -y shadcn@4.21.0`, `CI=1`, stdin closed.
