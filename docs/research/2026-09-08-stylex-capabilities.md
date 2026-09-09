# What can StyleX do today for a design system: versions, token and theme APIs, Next.js and Vite integration, and plain CSS variable export?

## Findings

Short version: StyleX is at 0.19.0 (published 2026-06-16), shipping a minor roughly every two to three months and still pre-1.0. The token stack for a design system is `defineConsts` (compile-time primitives, no CSS emitted) feeding `defineVars` (semantic tokens, emitted as `:root` custom properties) with `createTheme` producing override classes; a nested three-tier variant exists but is `unstable_` and undocumented. Color modes are switched either by putting a media query inside the token value, by applying a theme object at any subtree root with `stylex.props(theme)`, or by `light-dark()` plus `colorScheme`; there is no built-in data-attribute switch. Next.js App Router is served by the official Babel plugin plus the PostCSS plugin (Next.js 16 runs Babel under Turbopack automatically); the old `@stylexjs/nextjs-plugin` is deprecated. Vite is served by the official `@stylexjs/unplugin`. `stylex.props` returns a plain `{className, style}` object, so it spreads onto any component that takes those two props, but it does not merge foreign class strings. Every compiler path (PostCSS, unplugin, CLI, or `processStylexRules` called directly) already emits the variables as ordinary `:root {--x…}` CSS, so a variables-only stylesheet for non-StyleX consumers is a matter of feeding the compiler only the `.stylex.ts` files and using `--`-prefixed keys for stable names.

### 1. Versions and cadence

Current `latest` on npm as of 2026-09-08 (all published 2026-06-16 unless noted):

| Package | Version | Note |
| --- | --- | --- |
| `@stylexjs/stylex` | 0.19.0 | runtime; deps are `styleq`, `invariant`, `css-mediaquery` |
| `@stylexjs/babel-plugin` | 0.19.0 | the compiler; everything else wraps it |
| `@stylexjs/postcss-plugin` | 0.19.0 | replaces an `@stylex;` directive in a CSS file |
| `@stylexjs/unplugin` | 0.19.0 | Vite/Rollup/Rolldown/Webpack/Rspack/esbuild/Farm/Bun adapters; peer `unplugin ^2.3.11`; bundles `lightningcss` |
| `@stylexjs/rollup-plugin` | 0.19.0 | still published |
| `@stylexjs/eslint-plugin` | 0.19.0 | ESLint 10 compatible since 0.19 |
| `@stylexjs/cli` | 0.19.0 | directory-to-directory precompiler |
| `@stylexjs/atoms` | new in 0.19.0 | inline atomic styles, compiles to the same output as `create` |
| `@stylexjs/nextjs-plugin`, `webpack-plugin`, `esbuild-plugin`, `dev-runtime` | 0.11.1 (2026-01-27 repub) | npm shows `deprecated: 'Package no longer supported'`; deprecated in CHANGELOG 0.12.0 (Apr 2025) |
| `@stylexjs/shared` | 0.19.0 | deprecated in 0.13.0 but still published |

Cadence from the npm `time` field: 0.15.0 (2025-08-01), 0.16.0 (2025-09-26), 0.17.0 (2025-11-18), 0.18.0 (2026-03-04), 0.19.0 (2026-06-16), with one to five patch releases between minors. The GitHub Releases page stops at 0.17.5; `CHANGELOG.md` at the repo root is the maintained release record and the release blog posts live under `packages/docs/content/blog`. A tracking issue for v1.0.0 (#1356, opened 2025-12-03) exists but has no date.

Things that changed in the last year and matter here:

- 0.13.0: `defineConsts` added; `attrs` removed (brought back in 0.18.2 for SSR and non-React).
- 0.14.0: `styleResolution` default became `property-specificity`.
- 0.16.0: descendant and shared selectors; CSS variable overrides with `defineConsts`.
- 0.17.0: `@stylexjs/unplugin` introduced as the bundler plugin; `defineMarker`.
- 0.17.4: "Fix named exports detection on Turbopack."
- 0.18.0: `stylex.env` compile-time constants; `npm create @stylexjs`; Bun support.
- 0.18.1: `sx={}` JSX prop shorthand on host elements (default on, `sxPropName` to rename or disable).
- 0.18.2: `useCSSLayers` accepts `{before, after, prefix}` to order StyleX layers against other layers.
- 0.18.3: experimental nested APIs (`unstable_defineVarsNested`, `unstable_defineConstsNested`, `unstable_createThemeNested`); derived (function) values in `defineVars`; browserslist respected.
- 0.19.0: `@stylexjs/atoms`; fix for aliased theme file resolution.

### 2. The token APIs

**`stylex.create(styles)`** takes a map of style objects (or arrow functions for dynamic styles) and returns compiled style objects that map keys to class names. Media queries and pseudo-classes nest inside property values (`color: { default, ':hover', '@media …' }`), never at the top level.

**`stylex.defineVars(vars)`** creates CSS custom properties. Rules the compiler enforces:

- must be a named export in a file ending `.stylex.js|.mjs|.cjs|.ts|.tsx|.jsx` (override with `unstable_moduleResolution.themeFileExtension`);
- the file may contain nothing but `defineVars`/`defineConsts` exports;
- values must be static; a value may be a plain string, a `{default, [atRule]: …}` object (media and `@supports` queries), a typed wrapper (`stylex.types.color(...)` etc., which emits an `@property` rule), or since 0.18.3 a zero-arg function referencing sibling keys (evaluated at compile time; missing and cyclic references are compile errors);
- requires `unstable_moduleResolution: { type: 'commonJS' }` in the Babel config.

Compiled output (from the plugin's own tests): the export becomes `{ color: "var(--xwx8imx)", …, __varGroupHash__: "xop34xu" }` and the CSS is `:root, .xop34xu{--xwx8imx:red;…}` at priority 0.1, with each at-rule variant wrapped, e.g. `@media (prefers-color-scheme: dark){:root, .xop34xu{--xaaua2w:lightblue;}}` at priority 0.2. Variable names are `classNamePrefix + hash(exportId + '.' + key)`; a key that starts with `--` is used verbatim (`'--color': 'red'` emits `--color:red`), at the cost of no uniqueness guarantee. Typed values emit `@property --xwx8imx { syntax: "<color>"; inherits: true; initial-value: red }`.

**`stylex.createTheme(varGroup, overrides)`** returns a style object (`{ xop34xu: "x10yrbfs xop34xu", $$css: true }`) that you apply with `stylex.props(theme)` on any element; the CSS is `.x10yrbfs, .x10yrbfs:root{--xwx8imx:green;…}` at priority 0.5 (0.6 and up for at-rule variants), so a theme always beats the `:root` defaults. Overrides may be partial: keys you omit are not emitted and inherit from the enclosing scope (documented in "Theme overrides"; the older "Merge Themes" and "Reset Theme" recipes describe omitted keys as reverting to the `defineVars` default, which is the effect you see when the nearest ancestor is `:root`). Two themes for the same group on the same element: last applied wins. `createTheme` may be called in any file, not just `.stylex.ts`. Typed variables must be re-wrapped in the theme (`stylex.types.color(...)`) for type-checking. `VarGroup<Shape, uniqueSymbol>` and `Theme<typeof vars, Tag>` give nominal typing when two groups share a shape.

**`stylex.defineConsts(consts)`** is the compile-time sibling: same file rules as `defineVars`, but values are inlined at build time and no CSS variable is generated. Intended for media query strings, z-index scales, durations, easings, and "static spacing, font sizes, or colors that don't need theming." Since 0.16.0 consts can be used as computed keys in `create` to override a variable. Not themeable.

**`stylex.env.*`** (0.18.0, marked experimental) exposes arbitrary values and pure functions set in the Babel config (`env: {...}`), substituted before compilation. The release post says it "is not suitable for defining constants as part of a library," so it is a per-app convenience, not something to ship in a registry.

**Layering a palette → semantic → component stack.** The official `examples/example-nextjs/app/ds-demo/tokens.stylex.ts` does exactly this with the nested APIs and the comment "XDS-style three-tier token architecture": Tier 1 primitives via `unstable_defineConstsNested` (no CSS vars), Tier 2 semantic tokens via `unstable_defineVarsNested` whose values reference the primitives and carry `{default, [DARK]}` pairs, Tier 3 brand themes via `unstable_createThemeNested(tokens, {color: {accent: primitives.color.purple[600]}})`. That file is `// @ts-nocheck` because "nested APIs are experimental and lack TS type definitions," and there is no docs page for them. The same shape with the stable flat APIs is:

```ts
// palette.stylex.ts   (tier 1, compile-time only, flat keys)
export const palette = stylex.defineConsts({ blue600: '#2563eb', gray50: '#f9fafb', /* … */ });

// tokens.stylex.ts    (tier 2, emitted as :root custom properties)
export const color = stylex.defineVars({
  accent: { default: palette.blue600, [DARK]: palette.blue500 },
  accentHover: () => `color-mix(in srgb, ${color.accent}, black 10%)`, // derived, 0.18.3+
});

// themes.ts           (tier 3, anywhere)
export const purple = stylex.createTheme(color, { accent: palette.purple600 });

// Button.tsx          (component styles reference tier 2 only)
const styles = stylex.create({ root: { backgroundColor: color.accent } });
```

If the palette itself must be themeable (a consumer swapping a whole scale), make tier 1 a `defineVars` group too; imported `.stylex` exports evaluate to `var(--hash)` strings at compile time, so a semantic var can hold `var(--palette-hash)`. The consts→vars path is the one the maintainers' example exercises; a vars→vars chain across files is consistent with the compiler's evaluation of `.stylex` imports but I did not find a dedicated test for it.

### 3. Switching color modes

Three documented mechanisms, all built from the primitives above:

1. **Media query inside the token value.** `primaryText: { default: 'black', [DARK]: 'white' }` where `DARK = '@media (prefers-color-scheme: dark)'`. Emits a media-wrapped `:root` rule. Follows the OS; no user toggle.
2. **Theme objects at a root.** The "Light and Dark Themes" recipe defines `light`, `dark`, and `system` themes with `createTheme` and applies one via `stylex.props(themes[mode])` on a subtree root (the `<html>` or `<body>` element in the Next.js example's `layout.tsx`, or any nested div). Because a theme is a class on an element, the toggle is whichever element you spread it on; nesting works and inner themes inherit unspecified tokens.
3. **`light-dark()` + `colorScheme`.** Define `primaryColor: 'light-dark(black, white)'` once, then flip `colorScheme: 'light' | 'dark' | 'light dark'` with a `create` style on the root. Colors only, and needs `light-dark()` browser support. The Next.js example's layout sets `colorScheme: 'light dark'` on `<html>`.

There is no first-party `data-theme="dark"` attribute switch. `stylex.when` gained attribute selectors in 0.18.0, but that is for `create` styles reacting to an ancestor or sibling's attribute, not for scoping a `VarGroup`. If a data attribute is required (for example for a non-React shell), the practical route is to write that selector in plain CSS against the stable `--`-prefixed variable names (see section 6).

### 4. Next.js App Router

The official path (docs "Installation → Next.js", mirrored by `examples/example-nextjs`, which pins `next ^16.2.6` and `@stylexjs/stylex 0.19.0`):

- devDeps: `@stylexjs/babel-plugin`, `@stylexjs/postcss-plugin` (+ `autoprefixer`).
- `babel.config.js`: `presets: ['next/babel']`, plugin options `{ dev, runtimeInjection: false, enableInlinedConditionalMerge: true, treeshakeCompensation: true, aliases: { '@/*': [path.join(__dirname, '*')] }, unstable_moduleResolution: { type: 'commonJS' } }`.
- `postcss.config.js` imports the Babel config and configures `@stylexjs/postcss-plugin` with `include` globs (`app/**`, `components/**`, `src/**`), `babelConfig: { babelrc: false, parserOpts: { plugins: ['typescript','jsx'] }, plugins: babelConfig.plugins }`, and `useCSSLayers: true`.
- One global CSS file imported from the root layout containing `@stylex;` (once), typically after an `@layer resets {…}` block.
- `next.config.js` needs nothing StyleX-specific (the example exports `{}`).

Turbopack: the StyleX docs say "Since Next.js 16.0.3, this works with both Webpack and Turbopack," and the PostCSS page says the Next.js example "uses the same setup to integrate StyleX with Turbopack, which doesn't yet have a plugin API." Next.js's own Turbopack reference confirms the two mechanisms this relies on: "Starting in Next.js 16, Turbopack uses Babel automatically if it detects a configuration file" (files in `node_modules` excluded unless you configure `babel-loader` manually), and PostCSS config files are processed automatically. It also states "Turbopack does not support webpack plugins," which is why the old plugin was retired. Constraints to plan around:

- Sources are transformed twice (Babel loader for JS, PostCSS plugin re-scanning the same files to collect CSS). Maintainers of the community SWC plugin call this out on issue #1140 as a build-time and HMR cost; it is the accepted trade-off until Turbopack exposes an asset API.
- The PostCSS `include` globs must cover every file that calls `stylex.create`, including any StyleX-using dependency under `node_modules`; when `include` is omitted the plugin auto-discovers source files and direct dependencies that declare StyleX. `STYLEX_POSTCSS_DEBUG=1` prints what it resolved.
- `@stylexjs/nextjs-plugin` is deprecated on npm; do not use it.

Community alternative: `@stylexswc/nextjs-plugin` 0.18.6 (Rust/SWC compiler, tracks StyleX 0.19.0, last push 2026-09-08, "not affiliated with Meta"). Its Turbopack entry (`@stylexswc/nextjs-plugin/turbopack`) compiles only and still relies on `@stylexswc/postcss-plugin` for extraction, and drops `useCSSLayers`, `nextjsMode`, `transformCss`, `extractCSS` under Turbopack. Faster per-file transform, same double-pass shape.

### 5. Vite

The official integration is `@stylexjs/unplugin` (introduced 0.17.0). Setup: `plugins: [stylex.vite({ useCSSLayers: true, dev, runtimeInjection: false, lightningcssOptions }), react()]`, with the StyleX plugin placed before `@vitejs/plugin-react` to keep Fast Refresh, and at least one CSS file imported from the app root so Vite emits an asset the plugin can append to (otherwise it emits `stylex.css`). Dev server exposes virtual modules `/virtual:stylex.css`, `virtual:stylex:runtime`, `virtual:stylex:css-only`; HTML-entry apps need nothing extra, React-entry and SSR/RSC setups need a small client shim (documented). Options beyond the Babel plugin's: `importSources` (also used to auto-exclude from `optimizeDeps`), `externalPackages` (transform StyleX-shipping `node_modules` as app code), `devPersistToDisk` (share rules across RSC/SSR dev environments), `devMode`, `cssInjectionTarget`, `treeshakeCompensation` (defaults to true for Vite/Rollup). Framework pages exist for Vite+React, Vite RSC, React Router, RedwoodSDK, SvelteKit, Waku, each with an example directory. The v1.0 roadmap says examples "should be updated to use the unplugin whenever possible."

Known gaps, from open issues as of 2026-09-08: the Vite adapter leaks a `setInterval` and file handles under Vitest so test runs hang on exit (#1533, #1836, #1857); the internal Babel pass picks up a root `babel.config.*` with no opt-out (#1792); `externalPackages` missing from the TS types (#1563); `.vue` SFCs not handled in `vite dev` (#1562); `defineConsts` files not yet processed can crash CSS generation in dev (#1497); two fresh media-query output bugs in production CSS (#1859, #1860); and `create` rules that set custom properties escape `@layer` when `useCSSLayers: true` (#1611, affects any bundler).

`vite-plugin-stylex` (HorusGoul) is the pre-unplugin community plugin: npm 0.13.0 last published 2024-11-06, repo last pushed 2024-11-06, README still says "This plugin is in early development." Treat it as superseded.

### 6. Composing `stylex.props` with a third-party `className` / `style`

Runtime contract (from `packages/@stylexjs/stylex/src/stylex.js`): `props(...styles)` accepts compiled style objects, `false`/`null`/`undefined`, nested arrays, and `[CompiledStyles, InlineStyles]` pairs from dynamic styles, and returns an object with `className` (only if non-empty), `style` (only if it has keys; used for dynamic values and CSS variable assignments), and `data-style-src` (debug mode). Merging is deterministic, last-applied wins per property, longhand beats shorthand under the default `property-specificity` resolution. `attrs(...)` returns `{class, style: 'k:v;…'}` for non-React targets.

What that means for a Base UI (or any) component that exposes `className` and `style` props:

- Spreading works directly: `<Switch.Root {...stylex.props(styles.root, style)} />` sets both props. Base UI additionally accepts `className` and `style` as functions of component state; `stylex.props` returns values, not functions, so the state-dependent form would be `className={(state) => stylex.props(styles.root, state.checked && styles.checked).className}` and likewise for `style`. Base UI's documented preference is to style state through its data attributes (`[data-checked]`), which StyleX can target with `stylex.when` attribute selectors (0.18.0) or the `:is([data-checked])`-style pseudo syntax inside a value.
- `stylex.props` does not accept foreign class strings. Passing a plain string or a non-StyleX object into `props` is a type error and at runtime `styleq` would treat an object as inline style. The maintainers' authoring guide is explicit: "Do not apply `style` or `className` props on an element with a `stylex.props()` spread." So a component that must accept an external `className` (a registry consumer's Tailwind class, say) has to concatenate strings itself: `const sx = stylex.props(styles.root, style); <div {...sx} className={[sx.className, className].filter(Boolean).join(' ')} />`. External classes then compete in the cascade normally; with `useCSSLayers: true` StyleX rules sit in layers and any unlayered external CSS wins, which is the documented intent.
- The idiomatic StyleX way to let callers restyle a component is a `style?: StyleXStyles` (or constrained `StyleXStyles<{color?: string}>` / `StyleXStylesWithout<…>`) prop merged after local styles. For a registry that also promises `className` compatibility, both props are needed.

### 7. Emitting the variables as a plain CSS custom-properties file

Yes, and there is no separate "export" feature because the normal output already is that file. Every `defineVars` group compiles to `:root, .<groupHash>{--name:value;…}` plus media-wrapped variants and any `@property` rules; every `createTheme` compiles to `.<themeHash>, .<themeHash>:root{…}`. Those rules land in the same CSS bundle as the atomic classes via whichever collector you run:

- **CLI** (`@stylexjs/cli`): `stylex --config .stylex.json5` compiles an input directory and writes `stylex_bundle.css` (name via `styleXBundleName`) through `processStylexRules`. Point `input` at a directory containing only the `.stylex.ts` token files and the bundle contains only variable, theme, and `@property` rules.
- **PostCSS plugin**: set `include: ['tokens/**/*.stylex.ts']` in a dedicated `postcss.config` and process a CSS file containing `@stylex;`; the directive is replaced with just the token CSS.
- **Direct**: run `@babel/core` with `@stylexjs/babel-plugin` (with `unstable_moduleResolution` set) over each token file, collect `result.metadata.stylex` (an array of `[className, {ltr, rtl}, priority]` triples), and call `styleXTransform.processStylexRules(rules, { useLayers })` from `@stylexjs/babel-plugin` to get the CSS string. This is what the CLI and the plugins do internally and is the cleanest way to script a `tokens.css` artifact in a registry build.

Two things to decide up front because they change the emitted names: use `--`-prefixed keys (`'--ultima-color-accent': '#2563eb'`) so the custom property names are stable and readable for consumers who never run StyleX (the hashed names change with file path and key); and note that with `useCSSLayers` the `:root` block is emitted at priority 0.1, i.e. inside the lowest StyleX layer, so a consumer's unlayered `:root { --ultima-color-accent: … }` override wins by cascade without needing `!important`. Themes are classes, so a non-StyleX consumer switches modes by adding the theme's generated class (stable only if you fix `classNamePrefix` and keep the override object identical) or, more robustly, by redefining the `--`-named variables under their own selector.

## Sources

- https://www.npmjs.com/package/@stylexjs/stylex (via `npm view … version time dist-tags`, 2026-09-08): 0.19.0 latest, published 2026-06-16; full version/date list for cadence.
- `npm view` on `@stylexjs/babel-plugin`, `postcss-plugin`, `unplugin`, `rollup-plugin`, `eslint-plugin`, `cli`, `shared` (all 0.19.0); `@stylexjs/nextjs-plugin`, `webpack-plugin`, `esbuild-plugin`, `dev-runtime` (0.11.1, `deprecated` field set); `vite-plugin-stylex` (0.13.0, 2024-11-06); `@stylexswc/nextjs-plugin`, `unplugin`, `rs-compiler` (0.18.6, 2026-09-08).
- https://github.com/facebook/stylex/blob/main/CHANGELOG.md: release notes 0.12.0 through 0.19.0, including plugin deprecations (0.12.0), `defineConsts` (0.13.0), `property-specificity` default (0.14.0), unplugin (0.17.0), Turbopack named-export fix (0.17.4), `stylex.env` (0.18.0), `sx` prop (0.18.1), layer ordering options (0.18.2), nested APIs and derived vars (0.18.3), atoms (0.19.0).
- https://github.com/facebook/stylex/tree/main/packages/@stylexjs: current package list (atoms, babel-plugin, cli, create-stylex-app, devtools-extension, eslint-plugin, postcss-plugin, rollup-plugin, shared, stylex, unplugin).
- https://github.com/facebook/stylex/blob/main/packages/docs/content/blog/2026-04-19-Release-v0.18.x.mdx and `2026-06-14-Release-v0.19.0.mdx`: `stylex.env` scope ("not suitable for defining constants as part of a library"), `attrs` return, `sx` prop, derived vars "particularly useful for design systems," atoms.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/api/javascript/defineVars.mdx, `createTheme.mdx`, `defineConsts.mdx`, `create.mdx`, `props.mdx`, `attrs.mdx`, `env.mdx`: API signatures, `--` custom names, function values, `sx` shorthand limited to host elements.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/learn/theming/defining-variables.mdx, `using-variables.mdx`, `creating-themes.mdx`, `variable-types.mdx`: file-extension and named-export rules, `unstable_moduleResolution` requirement, media queries in values, theme application via `props`, last-theme-wins, `@property` typing.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/learn/recipes/light-dark-themes.mdx, `shareable-tokens.mdx`, `merge-themes.mdx`, `reset-themes.mdx`: the three color-mode mechanisms, partial overrides and nesting, `light-dark()` limits.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/api/types/VarGroup.mdx and `Theme.mdx`: nominal typing via unique symbols, value constraints.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/learn/styling-ui/using-styles.mdx and `learn/static-types.mdx`: merge order, styles-as-props idiom, `StyleXStyles`, `StyleXStylesWithout`.
- https://github.com/facebook/stylex/blob/main/packages/docs/static/llm/stylex-authoring.md (lines 506-518): "Do not apply `style` or `className` props on an element with a `stylex.props()` spread."
- https://github.com/facebook/stylex/blob/main/packages/@stylexjs/stylex/src/stylex.js: `props` and `attrs` implementations and return shapes; `unstable_*Nested` exports.
- https://github.com/facebook/stylex/blob/main/packages/@stylexjs/babel-plugin/__tests__/transform-stylex-defineVars-test.js and `transform-stylex-createTheme-test.js`: compiled output (`:root, .hash{…}`, `.theme, .theme:root{…}`, priorities 0.1/0.2 vs 0.5/0.6, `--` keys verbatim, `@property` emission).
- https://github.com/facebook/stylex/blob/main/packages/@stylexjs/babel-plugin/src/shared/stylex-define-vars.js and `stylex-create-theme.js`: hashing (`classNamePrefix + hash(exportId.key)`, `--` keys sliced), selectors.
- https://github.com/facebook/stylex/blob/main/packages/@stylexjs/babel-plugin/__tests__/validation-stylex-defineVars-test.js: static-value, named-export, cyclic and missing reference errors.
- https://github.com/facebook/stylex/blob/main/packages/@stylexjs/babel-plugin/__tests__/evaluation-import-test.js: `.stylex` imports evaluated at compile time, `--` names preserved across files.
- https://github.com/facebook/stylex/blob/main/packages/@stylexjs/babel-plugin/src/index.js: `processStylexRules` export on the default transform object.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/api/configuration/babel-plugin.mdx: option list (`aliases`, `classNamePrefix`, `dev`, `runtimeInjection`, `styleResolution`, `sxPropName`, `env`, `treeshakeCompensation`, `unstable_moduleResolution` incl. `themeFileExtension`), `processStylexRules` config and layer output.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/api/configuration/unplugin.mdx and `packages/@stylexjs/unplugin/package.json`: adapters, options, virtual modules, peer `unplugin ^2.3.11`.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/api/configuration/postcss-plugin.mdx: `include` auto-discovery, `importSources` inference, `useCSSLayers`, `STYLEX_POSTCSS_DEBUG`.
- https://github.com/facebook/stylex/blob/main/packages/docs/content/docs/learn/installation/index.mdx, `nextjs.mdx`, `postcss.mdx`, `vite/index.mdx`, `vite/vite-react.mdx`, `cli.mdx`: setup steps, "Since Next.js 16.0.3, this works with both Webpack and Turbopack," Turbopack "doesn't yet have a plugin API," plugin ordering before `@vitejs/plugin-react`.
- https://github.com/facebook/stylex/tree/main/examples/example-nextjs (`babel.config.js`, `postcss.config.js`, `next.config.js`, `package.json`, `app/layout.tsx`, `app/app.css`, `app/darkMode.stylex.ts`): the reference App Router wiring; `next ^16.2.6`; light/dark `createTheme` pair; `colorScheme: 'light dark'` on `<html>`.
- https://github.com/facebook/stylex/blob/main/examples/example-nextjs/app/ds-demo/tokens.stylex.ts: "XDS-style three-tier token architecture" using the nested APIs, `@ts-nocheck` because they lack types.
- https://github.com/facebook/stylex/blob/main/packages/@stylexjs/cli/README.md and `src/transform.js`: `styleXBundleName`, `modules_EXPERIMENTAL`, CSS bundle written from `processStylexRules`.
- https://nextjs.org/docs/app/api-reference/turbopack (v16.3.4, updated 2026-08-03): "Starting in Next.js 16, Turbopack uses Babel automatically if it detects a configuration file"; PostCSS config auto-processed; "Turbopack does not support webpack plugins"; `node_modules` excluded from Babel unless `babel-loader` configured.
- https://github.com/facebook/stylex/issues/1140 and https://github.com/facebook/stylex/issues/1364: Turbopack support thread (double-transform cost, PostCSS as interim), "NextJS 16.0.3 supports PostCSS use with Turbopack."
- https://github.com/facebook/stylex/issues/1356: v1.0.0 roadmap; examples to move to unplugin.
- Open issues https://github.com/facebook/stylex/issues/1533, 1836, 1857, 1792, 1563, 1562, 1497, 1611, 1859, 1860: current unplugin/Vite gaps and the custom-property `@layer` escape.
- https://github.com/HorusGoul/vite-plugin-stylex (repo last pushed 2024-11-06, README "early development"): community Vite plugin, superseded.
- https://github.com/Dwlad90/stylex-swc-plugin and `packages/nextjs-plugin/README.md` (branch `develop`): community SWC compiler, StyleX 0.19.0 compatible, Turbopack entry compiles only and needs `@stylexswc/postcss-plugin`, unsupported options under Turbopack.
- https://base-ui.com/react/handbook/styling: `className` and `style` accept a function of component state; state exposed as data attributes such as `[data-checked]`.
