# How can a generated Ultima theme be installed with preview parity?

Research for [#205](https://github.com/frankieramirez/ultima/issues/205), 2026-09-19. This establishes capabilities and constraints; it does not choose the product's export contract. Current shadcn source inspected at commit `a87a63b2ca25143d26c8bd0903e4e9bc77b3f824`. No consumer installation or browser parity test was run for this note.

## Findings

An arbitrary generated theme can be delivered as CSS custom-property declarations or generated StyleX source, with a self-contained shadcn registry item carrying either file. A static browser application can generate downloadable files. Current shadcn supports installing a downloaded item with `npx shadcn@latest add ./ultima-theme.json`. A copyable HTTP installation URL for a newly generated theme needs additional infrastructure to make that exact JSON available to the CLI. Existing registry hosting serves build artifacts, not arbitrary browser-created items. [Registry resolver][resolver], [local file loader][fetcher], [Ultima registry builder](../../scripts/build-registry.ts).

### Theme values and precedence

Ultima deliberately gives StyleX variables literal `--ult-*` names, shared by its CSS export. Both consumers can therefore use the same resolved semantic values. Runtime-themeable groups are color, space, text, font, radius, shadow, and motion durations. Border widths, motion easings, and z-index are compiled constants; exporting CSS cannot change them in existing components. [Specification](../spec/ultima.md#tokens), [token source](../../packages/tokens/src/tokens.stylex.ts).

`createTheme` generates an override for a variable group, applied through `stylex.props` on an element. It is a build-time declaration, not an API for evaluating arbitrary editor values after deployment. Generated source can contain literal values and compile in the consumer. Live editing can update the underlying custom properties, or use predeclared StyleX dynamic styles; the editor needs an adapter from validated theme data to that mechanism. [Creating themes](https://stylexjs.com/docs/learn/theming/creating-themes), [dynamic styles](https://stylexjs.com/docs/learn/styling-ui/defining-styles/).

Two StyleX themes for the same variable group do not merge token by token. Omitted members revert to their group defaults; merge the resolved input values before generating one theme per group and mode. Merely appending an accent-only theme to a dark theme will not preserve the intended full dark mapping. [StyleX merge recipe](https://stylexjs.com/docs/learn/recipes/merge-themes).

Custom properties inherit through DOM ancestors. A declaration on a descendant establishes its value there even if the ancestor's rule has higher specificity. On the same element, cascade origin, importance, layers, specificity and order decide precedence. Normal unlayered declarations beat normal layered declarations; inline declarations beat normal stylesheet declarations. Ultima's Vite and Next extraction configurations use CSS layers. Consequently, an unlayered theme stylesheet can override their variables on the same root, but a nested StyleX theme can still establish different values in its subtree. “Import last” alone is not a complete contract. [CSS variables](https://www.w3.org/TR/css-variables-1/#defining-variables), [cascade](https://www.w3.org/TR/css-cascade-5/#cascade-sort), [Vite setup](../../registry/static/setup-vite/ultima.vite.ts), [Next extraction](../../registry/static/setup-next/postcss.config.js).

A feasible CSS artifact uses explicit selectors scoped to a chosen theme root, mode blocks, and reduced-motion overrides. It must specify how it interacts with existing Ultima mode classes and existing token CSS. This is a design option, not an existing generated-theme API.

### Exact mode, shadow, and portal limits

The existing CSS export emits dark `:root` defaults, an OS-light media override, explicit `[data-theme="dark"]` and `[data-theme="light"]` blocks covering **every** variable group, and a final reduced-motion block. Its explicit mode attributes therefore pin shadow values too. [CSS serializer](../../packages/tokens/scripts/build-tokens.ts).

The existing StyleX `darkTheme` and `lightTheme` override **only color**. `colorScheme` separately sets the CSS `color-scheme` property. Shadow defaults still use `prefers-color-scheme: light`; setting `color-scheme: dark` does not rewrite that media query. Thus, on a light OS with explicitly selected dark mode, current StyleX consumers can retain light shadow alpha while the CSS export chooses dark shadow alpha. This follows directly from [themes.ts](../../packages/tokens/src/themes.ts), [shadow variable definitions](../../packages/tokens/src/tokens.stylex.ts), and the serializer above. A generated-theme implementation must resolve and apply all mode-dependent groups consistently rather than reusing color-only mode themes as the entire contract.

The docs `ThemeRoot` applies classes to `document.documentElement`, which lets body-mounted overlays inherit the chosen global theme. It also replaces the root class attribute when preference changes, so a generated theme class added independently could be lost. A local studio preview requires its own theme application boundary. [Docs theme provider](../../apps/docs/src/theme.tsx).

Base UI Dialog portals append to `body` by default and accept a `container` prop. Ultima exposes that Portal directly; Select wraps its Portal and forwards other props. A preview panel's CSS variables will not reach an overlay appended outside it. [Base UI Portal](https://base-ui.com/react/components/dialog#portal), [Dialog](../../packages/ui/src/dialog.tsx), [Select](../../packages/ui/src/select.tsx).

Two feasible arrangements require implementation and browser verification:

- Mount each preview's portals into a container within its theme boundary. Test menu positioning, fixed overlays, focus handling and modal inertness; containment alone does not prove modal behavior is confined to the preview.
- Render each preview in its own same-origin document/iframe, apply theme to that document's root, and mount its portals in that document. This also gives responsive media queries a real preview viewport. It requires document/style/font loading and state synchronization.

In either arrangement, test a dark preview on a light OS and the inverse, concurrent light/dark previews, an opened overlay, and reduced motion. Motion overrides must retain the current reduced-motion durations (`1ms`, and `0s` for loops); unconditional inline duration values could otherwise beat the media-based overrides. [Token motion contract](../spec/ultima.md#motion), [token source](../../packages/tokens/src/tokens.stylex.ts).

### Delivery into Vite and Next.js applications

| Mechanism | Verified capability | Remaining integration |
| --- | --- | --- |
| Download CSS | Existing components read the stable custom properties | Import the file from the application's entry/root layout; specify root/mode precedence |
| Download StyleX source | `createTheme` compiles semantic overrides | Import the installed token groups and apply generated themes at the application root; consumer compilation must include the file |
| Download registry JSON | CLI accepts local `.json` and schema-valid item content | Browser must embed generated file contents and the user downloads before running the command |
| Hosted registry JSON | CLI fetches URL items | New generated items must be published or served by a dynamic endpoint |

The smallest framework-independent registry package is `type: "registry:item"` with files of `type: "registry:file"`, each having an explicit target, for example `~/ultima-theme.css`, and inline `content`. This qualifies for the universal-item path and avoids requiring `components.json` merely to copy a CSS artifact. It does not install or configure StyleX compilation automatically. `~/` in an item's target means project root; a `~/` argument to the local JSON loader instead means the user's home directory. [Universal-item predicate][utils], [file schema](https://ui.shadcn.com/docs/registry/registry-item-json), [local loader][fetcher].

Existing Ultima React apps should already have the setup item's compiler and aliases. Vite requires the installed `ultimaStylex()` plugin in its Vite configuration; Next requires importing `app/ultima.css`. A StyleX theme file must sit within the compiler's included paths; Next's current include list covers `app`, `components`, and `lib`, so an arbitrary root-level theme module would need configuration changes. [Install guide](../../apps/docs/src/content/install.mdx), [Next PostCSS setup](../../registry/static/setup-next/postcss.config.js).

shadcn's `cssVars` updater follows its own theme conventions: light maps to `:root`, dark to `.dark`, and it edits the configured `tailwind.css` file. Those conventions do not directly reproduce Ultima's dark-first, OS-aware, `data-theme` export. Shipping exact CSS as a file avoids relying on that conversion. `registry:theme` is a supported item type, but its name alone does not implement Ultima mode semantics. [CSS updater][css-updater], [registry schema](https://ui.shadcn.com/docs/registry/registry-item-json).

### Fonts and static hosting

Font-family token strings do not install fonts. Ultima intentionally loads no fonts in its tokens or components; the docs separately self-host IBM Plex faces using `@font-face`. Matching preview and installed output requires delivering or documenting the chosen faces, weights, styles and loading behavior, or choosing system stacks. A package dependency can be declared in registry JSON, but importing its CSS or connecting a framework font loader remains part of the integration. [Typeface contract](../spec/ultima.md#typefaces), [docs font declarations](../../apps/docs/src/styles.css), [registry dependency fields](https://ui.shadcn.com/docs/registry/registry-item-json).

The docs currently build with Vite and copy registry JSON into public output. Client-side serialization and downloads fit that architecture; they need no theme database. Browser-local state or a URL fragment can restore editor data, but neither makes that data readable by an external CLI HTTP fetch. A browser `blob:` URL is likewise not an externally hosted registry endpoint. A URL query only becomes a generated registry item if a server interprets it. These are architecture deductions from the static build and CLI fetch model, not existing Ultima services. [Docs build](../../apps/docs/package.json), [registry builder](../../scripts/build-registry.ts), [fetcher][fetcher].

Alternatives remain open: downloadable local registry items; users hosting their own generated JSON; a new storage-backed publish endpoint; a stateless endpoint that validates encoded configuration and emits JSON; or a new CLI that accepts serialized theme data. Only the download/local-file path combines arbitrary themes with the existing static deployment without another execution service. Fixed prebuilt preset URLs also work, but cannot represent arbitrary edits.

## Facts later tickets need

- Decide the root/mode application contract alongside export format. CSS and StyleX must resolve identical full mode values, including shadow and reduced motion.
- Resolve values before calling `createTheme`; independent themes for the same group do not merge.
- The supported static-host command is `npx shadcn@latest add ./ultima-theme.json` after download. Hosted custom URLs are additional infrastructure.
- A universal file item can copy CSS without Tailwind or `components.json`; installing a file does not activate its import or install the React compiler.
- Portals and fonts are part of visual parity. A themed `<div>` and a font-family string alone are insufficient.

## Sources

- [Ultima specification](../spec/ultima.md): principles, semantic variables, constants, typefaces and motion.
- [Token source](../../packages/tokens/src/tokens.stylex.ts), [themes](../../packages/tokens/src/themes.ts), [CSS serializer](../../packages/tokens/scripts/build-tokens.ts): exact current mode behavior.
- [Docs theme provider](../../apps/docs/src/theme.tsx), [font CSS](../../apps/docs/src/styles.css), [build manifest](../../apps/docs/package.json): current application integration.
- [StyleX createTheme](https://stylexjs.com/docs/api/javascript/createTheme/), [creating themes](https://stylexjs.com/docs/learn/theming/creating-themes), [merge semantics](https://stylexjs.com/docs/learn/recipes/merge-themes), [dynamic styles](https://stylexjs.com/docs/learn/styling-ui/defining-styles/): supported styling mechanisms.
- [CSS variables](https://www.w3.org/TR/css-variables-1/), [CSS cascade](https://www.w3.org/TR/css-cascade-5/): inheritance and precedence.
- [Base UI Dialog](https://base-ui.com/react/components/dialog#portal): default portal target and container override.
- [shadcn registry schema](https://ui.shadcn.com/docs/registry/registry-item-json), [resolver][resolver], [fetcher][fetcher], [universal items][utils], [CSS updater][css-updater]: file delivery and CLI behavior at the inspected commit.

[resolver]: https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/registry/resolver.ts
[fetcher]: https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/registry/fetcher.ts
[utils]: https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/registry/utils.ts
[css-updater]: https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/packages/shadcn/src/utils/updaters/update-css-vars.ts
