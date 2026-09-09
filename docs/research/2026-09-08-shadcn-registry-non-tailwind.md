# Can the shadcn registry distribute StyleX-authored, non-Tailwind items?

## Findings

**Yes for `add`, no for `init`.** The registry payload is content-agnostic: a registry item is a list of text files plus npm dependencies, registry dependencies, optional CSS variables, optional CSS at-rules, env vars and a docs string. Nothing in `registry.json`, `registry-item.json`, the `shadcn build` loader, or the `shadcn add` install path checks for Tailwind. A `registry:ui` item whose files are StyleX (`stylex.create`, `.stylex.ts` token files, `@stylexjs/stylex` in `dependencies`) installs cleanly into any project that has a parseable `components.json`. The catch is the consumer bootstrap: `components.json` has a required `tailwind` object, and `npx shadcn init <url>` runs a preflight that exits 1 unless it finds `tailwindcss` in `package.json` and a CSS file containing `@import "tailwindcss"` or `@tailwind base`. So a Tailwind-free consumer must get a `components.json` some other way (hand-written, or installed by a universal `registry:item`), after which `add` works without Tailwind on disk. Versions checked: `shadcn` 4.21.0 (published 2026-09-04), repo HEAD `3ba91b1` (2026-09-08), `@stylexjs/stylex` 0.19.0, `@base-ui/react` 1.8.0, `tailwindcss` 4.3.3, `cn` 0.2.6.

### 1. What the registry format requires

**`registry.json`** (schema `https://ui.shadcn.com/schema/registry.json`, zod in `packages/shadcn/src/registry/schema.ts` `registrySchema`):

- Root must have `name` and `homepage` (strings) and at least one of `items` or `include`. Included chunk files may omit `name`/`homepage`.
- `include` entries must be relative paths ending in `registry.json` inside the same repo; remote includes are rejected by `shadcn build` (`registry/loader.ts` lines 466-504).
- Item names must be unique across the resolved registry (`loader.ts` `validateDuplicateItems`).
- Optional `pagination` object for dynamic-search registries.

**`registry-item.json`** (schema `https://ui.shadcn.com/schema/registry-item.json`; public JSON schema requires only `name` and `type`):

| Field | Type | Behaviour on install |
|---|---|---|
| `name`, `type` | required | `type` picks the default target directory for files that lack `target` |
| `title`, `description`, `author`, `categories`, `meta` | metadata | not used by the installer (`meta` is free-form) |
| `dependencies` | `string[]`, `name@version` allowed | installed with the detected package manager (`updateDependencies`) |
| `devDependencies` | same | installed as dev deps |
| `registryDependencies` | item addresses: bare `button` (always shadcn's own registry), `@ns/item`, `owner/repo/item[#ref]`, `https://…/x.json`, `./local.json` | resolved recursively, topologically sorted, files deduped by target (last wins), `cssVars`/`css`/`tailwind` deep-merged |
| `files[]` | `{path, type, target?, content?}` | see section 4 |
| `cssVars` | `{theme?, light?, dark?}` maps | written into the file at `components.json` `tailwind.css` via postcss (`update-css-vars.ts`) |
| `css` | nested object of at-rules/selectors (`@layer`, `@utility`, `@keyframes`, `@plugin`, `@import`, plain selectors) | appended/merged into the same CSS file (`update-css.ts`) |
| `tailwind` | deprecated (`config.theme/plugins/content`) | only touched when a v3 `tailwind.config.*` exists |
| `envVars` | `Record<string,string>` | appended to `.env.local`/`.env`; existing keys not overwritten |
| `docs` | markdown string | printed with `logger.info` after install (`add-components.ts` line 149) |
| `extends` | string, `registry:style`/`registry:base` only | `"none"` skips installing shadcn's own `index` style item during init (`preset/presets.ts` line 274) |
| `config` | `registry:base` only, `rawConfigSchema.deepPartial()` | deep-merged into the consumer's `components.json` at init (`commands/init.ts` line 763-765) |
| `font` | `registry:font` only | Google fonts wiring |

**Item types** (`registryItemTypeSchema`): `registry:lib`, `registry:block`, `registry:component`, `registry:ui`, `registry:hook`, `registry:page`, `registry:file`, `registry:theme`, `registry:style`, `registry:item`, `registry:base`, `registry:font` (plus internal `registry:example`, `registry:internal`). Docs table: `registry:base` "Use for entire design systems", `registry:style` "Use for registry styles. eg. new-york", `registry:theme` "Use for themes", `registry:item` "Use for universal registry items".

### 2. What `npx shadcn init <url>` does in a consumer project

`commands/init.ts` + `preflights/preflight-init.ts`:

1. If the first argument is a URL it is treated as the init item. `resolveRegistryBaseConfig` fetches it with a shadow config; if `type === "registry:base"` its `config` becomes `registryBaseConfig`, and `installStyleIndex = item.extends !== "none"`.
2. `preFlightInit` runs unconditionally for existing projects: fails if `components.json` already exists (without `--force`), fails on unsupported framework (`manual`), then **fails with `TAILWIND_NOT_CONFIGURED` when `getTailwindVersion` returns null** (no `tailwindcss` in deps/devDeps) **or no CSS file contains `@import "tailwindcss"` / `@tailwind base`** (`get-project-info.ts` lines 221-291; error branch in `preflight-init.ts` prints "Install Tailwind CSS then try again." and `process.exit(1)`). It also requires a tsconfig/jsconfig path alias or `package.json#imports` prefix.
3. `getProjectConfig` returns null without a Tailwind CSS file, which falls back to the full interactive prompt that asks for `tailwind.config.js` and global CSS paths.
4. Writes `components.json` = prompted/derived config, deep-merged with the backup (unless `--force`) and then with `registryBaseConfig`. `rtl` from CLI wins.
5. Calls `addComponents([ ...(installStyleIndex ? ["index"] : []), <init url>, ...components ])`. shadcn's `index` item for `base-nova` (`https://ui.shadcn.com/r/styles/base-nova/index.json`) depends on `class-variance-authority`, `cn`, `lucide-react`, `@base-ui/react`, dev `tw-animate-css` + `shadcn`, registry dep `utils`, and injects `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"` and `@layer base { * { @apply border-border outline-ring/50 } body { @apply bg-background text-foreground } }`. `extends: "none"` is the only way to keep that out.
6. Base resolution: `--base` > preset/URL `?base=` > `getBase(existingConfig.style)` > default `"base"` when initialising from a registry item. `PRESET_BASES = ["radix","base","aria"]`; `parsePresetStyle` strips a `base-`/`radix-`/`aria-` prefix from `style` to find the base (`preset/preset.ts` lines 13-30). The July 2026 changelog says: "Building a registry? Ship a `registry:base` config if you want to pin a specific library. Items without one now init as Base UI."

Net: `init` cannot bootstrap a Tailwind-free project today, regardless of what the `registry:base` item says. The `config` field can rewrite `style`, `aliases`, `tailwind.css`, `iconLibrary`, `rsc`, `tsx`, `registries`, but it is applied after the preflight has already required Tailwind.

### 3. What `npx shadcn add <url>` does

`commands/add.ts` + `preflights/preflight-add.ts` + `utils/add-components.ts`:

1. Reads `components.json` (`getConfig`); if absent, builds a shadow config with `style: "new-york"`.
2. Fetches the first item to learn its type. If `isUniversalRegistryItem` (type `registry:item` or `registry:file`, and every file has a `target` and is of type `registry:file`/`registry:item`), it installs immediately with the shadow config, **skipping the components.json requirement and all transformers**. Docs: "universal items ... can be installed without framework detection or components.json."
3. Otherwise `preFlightAdd` only checks that `package.json` exists and `components.json` exists and parses (`getConfig` → `resolveConfigPaths`, which needs a loadable tsconfig/jsconfig and resolvable `aliases.components`/`aliases.utils`). **No Tailwind check.** `resolvedPaths.tailwindCss = path.resolve(cwd, config.tailwind.css)`.
4. If `components.json` is missing (non-universal item), it prompts "You need to create a components.json file to add components. Proceed?", prompts for base and preset, and calls `runInit` with `skipPreflight: false`, which re-enters the Tailwind preflight from section 2.
5. Order of writes in `addProjectComponents`: `updateDependencies` → `updateTailwindConfig` (no-op without a v3 config object) → `updateEnvVars` → `updateFonts` → `updateFiles` → `updateCss` (cssVars then css; skipped when both are empty, otherwise reads and rewrites `tailwind.css`) → print `docs`.
6. `updateFiles` runs a ts-morph transformer chain on every `.ts/.tsx/.js/.jsx` file that is not a universal file or `.env`: `transformImport` (rewrites `@/registry/<style>/{ui,lib,hooks,components}/…`, `@/components/ui`, `@/components`, `@/hooks`, `@/lib`, `@/lib/utils` to the consumer aliases), `transformRsc` (adds `"use client"` when `rsc: true`), `transformCssVars` (only when `tailwind.cssVariables: false`; rewrites string literals through the base-colour map), `transformTwPrefixes` (only when `tailwind.prefix` set), `transformIcons` (only `<IconPlaceholder>`), `transformMenu`, `transformAsChild` (only when `style` starts with `base-`; rewrites `asChild` JSX to Base UI `render` props), `transformRtl` (only when `rtl: true`; rewrites Tailwind physical → logical class tokens in string literals), `transformFont`, `transformCleanup`, then `transformJsx` when `tsx: false`. It also rewrites alias imports that resolve to other files being installed (`rewriteResolvedImportsInContent`); relative imports are left untouched.
7. `style`/`theme`/`base` items go through a confirm prompt ("Existing CSS variables and components will be overwritten"). A `registry:style` installed via `add` into an existing project does not re-run init and does not pull `index`.

### 4. File placement rules (what constrains Ultima's layout)

From `update-files.ts` `resolveFilePath`/`resolveFileTargetDirectory`/`resolveNestedFilePath`, `registry-item-json.mdx`, and `registry/loader.ts`:

- **Source side (`shadcn build` / `loadRegistryItem`)**: every `files[].path` must be relative, without `..`, not a URL, and inside the directory of the `registry.json` chunk that declares it. Content is read from disk and embedded as `content` in the built JSON; the root `registry.json` is copied to the output directory with `include` flattened. Default output is `public/r/<name>.json`; `--output` changes it. `shadcn registry validate` checks a source registry before publishing.
- **Consumer side, by file `type`** when no `target` is set: `registry:ui` → `aliases.ui` dir (defaults to `<components>/ui`); `registry:lib` → `aliases.lib` dir (defaults to the parent of `aliases.utils`); `registry:component`/`registry:block` → `aliases.components`; `registry:hook` → `aliases.hooks`; anything else → `aliases.components`. The written relative path is whatever follows the **last path segment that equals the target dir's basename** (`ui`, `lib`, `hooks`, `components`); if no segment matches, only the basename is kept. So `registry/ultima/ui/button/button.tsx` lands at `<ui>/button/button.tsx`, and `registry/ultima/button.tsx` lands at `<ui>/button.tsx`.
- **`target`**: required for `registry:file` and `registry:page`. `~/x` is project root. `@components/`, `@ui/`, `@lib/`, `@hooks/` placeholders resolve to the consumer's alias dirs and must stay inside them; `@utils/` is not supported; unknown `@foo/` is written literally as `foo/`. `src/` is stripped/added according to whether the consumer uses `src/`.
- `-p, --path` on `add` overrides placement for the whole item.
- File basenames are preserved, so StyleX's requirement that `defineVars` live in `*.stylex.ts` files (and export nothing else) survives installation.
- Imports inside registry files should use `@/registry/[style]/...` (docs: "Imports should always use the `@/registry` path") or `@/components/ui/...`, `@/lib/...`, `@/hooks/...`; these are rewritten to the consumer's aliases. Relative imports are not rewritten, so two files of different `type` (e.g. a `registry:ui` component importing a `registry:lib` token file relatively) will break after placement. Either give all files of an item the same type/target, or use alias imports.
- Directory listing (optional): flat registry, `/registry.json` and `/<name>.json` at the root, no `content` in `files`, open source; submitted by PR to `apps/v4/registry/directory.json`.

### 5. `components.json` on the consumer side

`schema.json` at `https://ui.shadcn.com/schema.json` requires `style`, `tailwind`, `rsc`, `aliases`; inside `tailwind`, `config`, `css`, `baseColor`, `cssVariables` are required (`prefix` optional); inside `aliases`, `utils` and `components` are required (`ui`, `lib`, `hooks` optional). The zod `rawConfigSchema` is `.strict()` and only requires `style`, `tailwind.css`, `tailwind.baseColor`, `aliases.components`, `aliases.utils`; it also accepts `iconLibrary`, `rtl`, `menuColor`, `menuAccent`, `registries`, `$schema`. The public schema enumerates `style` (`new-york`, `default`, and `{base,radix,aria}-{vega,nova,maia,lyra,mira,luma,sera,rhea}`) but the CLI accepts any string. The docs say `style`, `tailwind.baseColor` and `tailwind.cssVariables` "cannot be changed after initialization". `tailwind.css` is "Path to the CSS file that imports Tailwind CSS into your project"; the CLI only uses it as the file it writes `cssVars`/`css` into, and reads it with `fs.readFile` (it must exist if any item ships `cssVars` or `css`). `tailwind.config` blank means v4 to the CLI.

A minimal hand-written Tailwind-free `components.json` that satisfies both schemas: `{"$schema":"https://ui.shadcn.com/schema.json","style":"base-ultima","rsc":true,"tsx":true,"tailwind":{"config":"","css":"app/globals.css","baseColor":"neutral","cssVariables":true},"aliases":{"components":"@/components","utils":"@/lib/utils","ui":"@/components/ui","lib":"@/lib","hooks":"@/hooks"},"registries":{"@ultima":"https://<host>/r/{name}.json"}}`. `cssVariables: true` matters: `false` turns on `transformCssVars`, which rewrites string literals.

### 6. Hosting and namespacing

- Any HTTP host serving JSON: `/r/registry.json` (catalog) + `/r/<name>.json` (items), static from `shadcn build` or dynamic via `loadRegistry()`/`loadRegistryItem()` from `shadcn/registry` (runtime dep on `shadcn`).
- Content negotiation lets the domain root serve JSON to the CLI (`Accept: application/vnd.shadcn.v1+json, application/json;q=0.9`, `User-Agent: shadcn`) and HTML to browsers.
- GitHub as registry: `registry.json` at repo root, addresses `owner/repo/item[#ref]`; public anonymous, private via `gh` credentials / `GH_TOKEN` (August 2026 changelog). GitHub Enterprise hosts not supported.
- Namespaces: `components.json` `registries` map, keys must start with `@` and match `^@[a-zA-Z0-9][a-zA-Z0-9-_]*$`; value is a URL template that must contain `{name}` (optional `{style}`), or `{url, headers, params}` with `${ENV_VAR}` expansion. `npx shadcn registry add @ultima=https://…/r/{name}.json`. Items in `registryDependencies` can point across registries; open-source namespaces can be listed in `https://ui.shadcn.com/r/registries.json` so the CLI auto-configures them.
- Built-in namespaces are stripped from written config; `@shadcn` bare names always mean shadcn's own registry.

### 7. How ui.kitze.io structures its items

Fetched `https://ui.kitze.io/registry.json` (name `kitze-ui`, 76 items): 64 `registry:component`, 11 `registry:ui`, 1 `registry:base`. The `base` item (`/r/base.json`) has no files and only `config: {style: "base-nova", rsc: true, tsx: true, iconLibrary: "lucide"}`; it does not set `extends`, so an init from it still installs shadcn's `index`. `registry:ui` items (e.g. `accordion`) ship one file at `components/ui/accordion.tsx` with `target: "components/ui/accordion.tsx"`, depend on `@base-ui/react` + `lucide-react`, import `cn` from `@/lib/utils`, and style with Tailwind utility classes; 3 items depend on `tailwind-variants`. Component pages show `npx shadcn@latest add https://ui.kitze.io/r/<name>.json`; the guide describes it as "built on shadcn, Tailwind CSS, and Base UI". So kitze proves Base UI + registry works, but not non-Tailwind. I could not locate the shadcn post that cites ui.kitze.io; none of the 2026 changelog entries or `/docs/directory` mention it.

### 8. Constraints the registry imposes on Ultima (checklist)

1. Ship `registry.json` at the repo root (or the served root) with `name`, `homepage`, and `items`/`include`; item names unique; `$schema` pointers optional but recommended.
2. Every `files[].path` relative to its declaring `registry.json`, no `..`, inside that directory; build embeds content. Keep a `registry/<style>/<item>/…` layout with `ui`, `lib`, `hooks`, `components` segments so the nested-path rule places files predictably.
3. Choose file `type` per file, not per item: StyleX component files as `registry:ui`; shared `*.stylex.ts` token/theme files as `registry:lib` (or `registry:ui` with `@ui/…` target) and import them via `@/registry/<style>/lib/...` or `@/lib/...`, never relatively across types.
4. Every StyleX item must list `@stylexjs/stylex` (and Base UI packages) in `dependencies`; the compiler packages (`@stylexjs/babel-plugin`, `@stylexjs/postcss-plugin`, `@stylexjs/unplugin`, `@stylexjs/nextjs-plugin`, …) belong in `devDependencies` of a setup item.
5. StyleX needs consumer build config (Babel/bundler plugin, PostCSS `@stylex;` marker in a global CSS file). The registry can only deliver that as files: a universal `registry:item` whose files are `registry:file` with `~/` targets (e.g. `~/babel.config.js`, `~/postcss.config.js`, `~/components.json`) installs without `components.json` and without transformers; it cannot run scripts or edit an existing bundler config.
6. `cssVars`/`css` write into `tailwind.css`; that file must exist. Global `:root` custom properties can be delivered this way if wanted, but StyleX `defineVars` is the native path and does not need them. `@theme inline` is only emitted when the CLI detects Tailwind v4, so do not rely on `cssVars.theme`.
7. Provide a `registry:base` item with `extends: "none"` and a `config` that sets `style` (prefix with `base-` if Ultima wants Base UI `render`-prop transforms and Base UI defaults; otherwise the CLI still defaults to `"base"`), `aliases`, `tailwind.css`, `iconLibrary`, `rsc`, `tsx`, and `registries.@ultima`. Document that `init` still requires Tailwind in the consumer project today; the supported non-Tailwind route is "write/install `components.json`, then `add`".
8. Installed source is rewritten by ts-morph: keep `@/registry/<style>/...` imports, expect `"use client"` insertion when `rsc: true`, avoid `asChild` (rewritten for `base-*` styles), and prefer `cssVariables: true` in the recommended `components.json` so string literals are left alone.
9. Namespace template must contain `{name}`; catalog and item URLs are separate; if listing in the shadcn directory, serve a flat registry without `content`.
10. `docs` is the only install-time messaging channel; use it on the setup item to explain the StyleX compiler step.

### Facts later tickets will need

- `shadcn` CLI 4.21.0; schema source `packages/shadcn/src/registry/schema.ts`; public schemas at `/schema/registry.json`, `/schema/registry-item.json`, `/schema.json`.
- `init` preflight Tailwind check: `preflight-init.ts` (`TAILWIND_NOT_CONFIGURED`), detection in `get-project-info.ts` `getTailwindVersion`/`getTailwindCssFile`.
- `add` preflight has no Tailwind check: `preflight-add.ts`.
- Universal items bypass `components.json`: `registry/utils.ts` `isUniversalRegistryItem`, `commands/add.ts` line 127, transformers skipped in `update-files.ts` line 166-176.
- `extends: "none"` semantics: `preset/presets.ts` line 274 → `installStyleIndex`.
- Placement rules: `update-files.ts` `resolveFilePath` (line 386) and `resolveNestedFilePath` (line 540).
- StyleX 0.19.0 requires `defineVars` in `*.stylex.{js,ts,tsx,…}` files with named exports only; compiler via `@stylexjs/babel-plugin` + `@stylexjs/postcss-plugin` or bundler plugins (`@stylexjs/unplugin` 0.19.0, `@stylexjs/rollup-plugin` 0.19.0, `@stylexjs/nextjs-plugin` 0.11.1, `@stylexjs/webpack-plugin` 0.11.1).
- shadcn's own components import `cn` from the `cn` package (0.2.6) since 2026-09-03; `utils` item is now `export { cn } from "cn"`.

## Sources

- https://ui.shadcn.com/docs/registry/registry-item-json (repo `apps/v4/content/docs/registry/registry-item-json.mdx` @ 3ba91b1): field definitions, item type table, `target` placeholders, `envVars`/`docs`/`font` semantics, deprecated `tailwind`.
- https://ui.shadcn.com/docs/registry/registry-json (`registry-json.mdx`): root fields, `include`, uniqueness.
- https://ui.shadcn.com/schema/registry-item.json, https://ui.shadcn.com/schema/registry.json, https://ui.shadcn.com/schema.json: required fields, `type` enum, `style` enum, `registries` pattern.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/registry/schema.ts: zod schemas for `rawConfigSchema`, `registryItemSchema`, `registry:base` `config`, `extends`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/preflights/preflight-init.ts and `utils/get-project-info.ts` (lines 221-291, 530-600): Tailwind detection and hard failure in `init`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/preflights/preflight-add.ts: `add` only requires `package.json` + parseable `components.json`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/commands/init.ts (lines 393-590, 600-830): URL handling, base resolution, `registryBaseConfig` merge, `installStyleIndex`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/preset/presets.ts (`resolveRegistryBaseConfig`) and `preset/preset.ts` (`PRESET_BASES`, `parsePresetStyle`).
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/commands/add.ts (lines 60-335): shadow config, universal short-circuit, style/theme confirm, init fallback.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/utils/add-components.ts (lines 85-152): install order, `docs` printing.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/utils/updaters/update-files.ts (lines 140-200, 386-566, 702-830): transformer chain, target resolution, nested-path rule, alias-import rewriting.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/utils/updaters/update-css-vars.ts and `update-css.ts`: writes into `resolvedPaths.tailwindCss`; v4 vs v3 plugin paths.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/utils/transformers/ (`transform-import.ts`, `transform-css-vars.ts`, `transform-aschild.ts`, `transform-rtl.ts`, `transform-icons.ts`, `transform-tw-prefix.ts`): guards and rewrite rules.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/registry/utils.ts (`isUniversalRegistryItem`), `registry/loader.ts` (lines 466-630): universal item definition; build path constraints.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/packages/shadcn/src/utils/get-config.ts (`resolveConfigPaths`): alias and `tailwindCss` resolution, `BUILTIN_REGISTRIES` merge.
- https://ui.shadcn.com/docs/registry/getting-started (`getting-started.mdx`): requirements, `include`, build output, dynamic loaders, content negotiation, namespace setup, guidelines (`@/registry` imports, `registry/[STYLE]/[NAME]`).
- https://ui.shadcn.com/docs/registry/examples (`examples.mdx`): `registry:style` with `extends: "none"`, `registry:base` from scratch, `registry:theme`, universal items.
- https://ui.shadcn.com/docs/registry/namespace: `registries` config, `{name}`/`{style}`, auth headers, dependency resolution.
- https://ui.shadcn.com/docs/registry/github (`github.mdx`): GitHub registry addresses and requirements.
- https://ui.shadcn.com/docs/registry/registry-index (`registry-index.mdx`): directory submission requirements (flat, no `content`).
- https://ui.shadcn.com/docs/registry/faq (`faq.mdx`): complex item example, cssVars colour guidance.
- https://ui.shadcn.com/docs/components-json (`components-json.mdx`): field semantics, "cannot be changed after initialization".
- https://ui.shadcn.com/docs/cli (`cli.mdx`): `init`/`add`/`build`/`registry validate` options.
- https://ui.shadcn.com/docs/changelog/2026-03-cli-v4, /2026-05-registry-include, /2026-07-base-ui-default, /2026-08-private-github-registries, /2026-09-cn: `registry:base`, `include`/`validate`, Base UI default and the "ship a registry:base config" guidance, private GitHub, `cn` package.
- https://ui.shadcn.com/r/styles/base-nova/index.json: what shadcn's `index` style item installs (Tailwind imports, `tw-animate-css`).
- https://ui.shadcn.com/r/styles/index.json: styles list returned by `getRegistryStyles()`.
- https://ui.kitze.io/registry.json, https://ui.kitze.io/r/base.json, https://ui.kitze.io/r/accordion.json, https://ui.kitze.io/guide, https://ui.kitze.io/component/checkbox: kitze item types, `registry:base` config, Tailwind + Base UI file contents, install commands.
- https://stylexjs.com/docs/learn/installation/ and https://stylexjs.com/docs/learn/theming/defining-variables/: required packages, config files, `@stylex;` marker, `*.stylex.*` file rule.
- `npm view` on 2026-09-08: `shadcn` 4.21.0, `@stylexjs/stylex` 0.19.0, `@stylexjs/unplugin` 0.19.0, `@stylexjs/nextjs-plugin` 0.11.1, `@base-ui/react` 1.8.0, `tailwindcss` 4.3.3, `cn` 0.2.6.
