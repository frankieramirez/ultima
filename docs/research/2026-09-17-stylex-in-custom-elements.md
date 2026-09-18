# How does StyleX output reach a custom element, across a shadow boundary and without React?

## Findings

Plain answers first, one per sub-question. Everything marked "run here" was executed against `@stylexjs/babel-plugin` 0.19.0 and `@stylexjs/stylex` 0.19.0 as installed in this repo, and the browser cases ran in the Playwright 1.63.0 Chromium (build 1243) that `packages/ui` already uses, with `prefers-color-scheme: dark` emulated so the dark default (`#8394ff`) and the light theme (`#565fde`) are distinguishable. Scratch files lived under the session scratchpad and are not in the repo.

1. **`stylex.props` has a runtime, and a non-React class can call it; the compiler also inlines it.** The runtime `props()` and `attrs()` are the only two non-throwing functions in `@stylexjs/stylex`; every other export (`create`, `defineVars`, `createTheme`, ...) throws `Unexpected 'stylex.<name>' call at runtime`. Both are a thin wrapper over `styleq` that merges compiled `{ $$css: true, <propKey>: '<class>' }` objects into a class string. In a `class extends HTMLElement`, a call whose arguments the compiler can resolve is replaced with a literal `{ class: "x3nfvp2 x115q45z ..." }` (`attrs`) or `{ className: ... }` (`props`); a `cond && styles.x` argument compiles to a lookup table indexed by the condition; a style picked out of a map by a runtime key is left as a runtime `stylex.attrs(map[tone])` call, which then works because the compiled style objects are plain data. React is nowhere in the runtime. `attrs()` exists specifically for this: the 0.18.2 changelog reads "Bring back `stylex.attrs` for SSR and non-React frameworks."

2. **The compiler emits a static stylesheet plus class-name strings; that is its normal output, not a special mode.** The Babel plugin returns rules in `metadata.stylex`; `processStylexRules(rules, { useLayers })` turns them into one CSS string, which is exactly how `packages/tokens/scripts/build-tokens.ts` already works. The CLI writes the same thing to a named file (`cssBundleName`), and `@stylexjs/unplugin` appends it to the bundler's CSS asset or writes `stylex.css` when none exists. There is a second, runtime path (`runtimeInjection: true`) that emits `_inject({ ltr, priority })` calls into the module; it appends a `<style data-stylex>` to `document.head` only, cannot target a shadow root, and uses `:not(#\#)` specificity chains instead of `@layer`. It is off by default (`options.runtimeInjection ?? false`) and the docs say it "should be disabled in production".

3. **Atomic classes in the document stylesheet reach light-DOM children of a custom element and do not reach shadow-DOM children.** Run here: the same `<span class="x115q45z">` computed `background-color: rgb(131, 148, 255)` as a light-DOM child and `rgba(0, 0, 0, 0)` inside a shadow root, and a slotted light-DOM child under a themed host painted with the theme's value. This is CSS Scoping: selectors do not see across the boundary in either direction, and the StyleX maintainer's own answer on shadow DOM is "You must *NOT* use shadow DOM: Shadow DOM is inherently incompatible with atomic CSS. If you *have* to use shadow DOM, you can configure Stencil to treat the generated StyleX CSS file as Global Styles."

4. **`defineVars` custom properties inherit into the shadow tree; `defineConsts` never reach runtime; `createTheme` classes work on the host or any light-DOM ancestor, and do nothing on an element inside the shadow unless the sheet is inside too.** Run here: a shadow child read `--ult-color-accent: #8394ff` from the document's `:root` rule with no sheet in the shadow; with `lightTheme`'s classes on the host it read `#565fde`; with the same classes on a wrapper *inside* the shadow (no sheet inside) it stayed `#8394ff`. CSS Variables says custom properties are `Inherited: yes`, and CSS Scoping says "The top-level elements of a shadow tree inherit from their host element." `defineConsts` values are inlined at compile time (`border.hairline` became `.x5g0gaz{border-width:1px}`), so there is nothing to cross a boundary. A theme is a class carrying a `.hash, .hash:root{--ult-*:...}` rule, so it obeys rule 3: it applies wherever that rule is in scope.

5. **`adoptedStyleSheets` needs the StyleX CSS as a string, one shared `CSSStyleSheet`, and an answer to `:root`.** Run here: the 9.5 KB layered output parsed into a constructed sheet as 4 rules (`@layer priority1, priority2, priority3;` plus three layer blocks), and inside the shadow the atomic class and the theme class both applied. But `:root, .xj3ftdf{--ult-*}` matches nothing in a shadow tree, because `:root` "represents an element that is the root of the document" and the shadow root is not one. With no StyleX CSS in the document, `--ult-color-accent` computed empty inside the shadow and the button painted transparent; adding the var-group class to a wrapper inside, or rewriting `:root, .` to `:host, .` in the adopted text, restored it. So an element that must work in a page with no Ultima CSS at all has to either carry the var-group class on its shadow's top element or rewrite `:root` to `:host` at build time. Constructed sheets reject `@import` (StyleX emits none), `@layer` is kept, and layers are scoped per tree scope so the shadow's `priority1` never collides with the document's.

6. **Tokens-CSS-only styling in the element is a token contract, not a component authoring path, by ADR 0001's own words.** It works mechanically: run here, a shadow button with hand-written `.btn{background:var(--ult-color-accent)}` painted from `tokens.css` in the document, and `data-theme="light"` on the host switched it. But ADR 0001 decides "Components in Ultima are authored in StyleX only" and rejected a mixed system because it "would carry two styling models, two token sources, and two sets of conventions for agents to learn"; its consequence line already places this path: "Tailwind-only consumers can adopt the tokens CSS export but not the components." An element whose rules are hand-written CSS over `--ult-*` shares the token source (one, generated from the StyleX source) but not the styling model or conventions, so it is the second engine the ADR named. The path that stays inside the ADR is: author the element's styles in `stylex.create` as today, compile them to a static sheet plus class strings with the compiler that already runs in this repo, and change only delivery (constructed sheet into the shadow root, or light DOM with the document sheet). Choosing that path is a delivery decision the ADR does not yet describe and should be recorded as an amendment, not a new ADR.

### 1. What `stylex.props` and `stylex.attrs` are at runtime

The full runtime is `node_modules/.pnpm/@stylexjs+stylex@0.19.0/node_modules/@stylexjs/stylex/lib/cjs/stylex.js`. Its export list, read with `node -e`:

```
attrs create createTheme defaultMarker defineConsts defineMarker defineVars env
firstThatWorks keyframes legacyMerge positionTry props types unstable_conditional
unstable_createThemeNested unstable_defineConstsNested unstable_defineVarsNested
viewTransitionClass when
```

Every one of those except `props`, `attrs`, `legacyMerge`, `env` and `types` is a function that throws ``new Error(`Unexpected 'stylex.${name}' call at runtime. Styles must be compiled by '@stylexjs/babel-plugin'.`)``. `props` is:

```js
function props(...styles) {
  const [className, style, dataStyleSrc] = styleqExports.styleq(styles);
  const result = {};
  if (className != null && className !== '') result.className = className;
  if (style != null && Object.keys(style).length > 0) result.style = style;
  if (dataStyleSrc != null && dataStyleSrc !== '') result['data-style-src'] = dataStyleSrc;
  return result;
}
```

and `attrs` calls `props` then renames `className` to `class` and serialises `style` to a `key:value;` string. `styleq` (bundled into the file) walks the argument list right to left, keeps the first class seen for each property key, and treats any object without `$$css` as an inline style. Nothing in the file imports React or touches the DOM.

Run here, calling the runtime directly on compiled-shape objects, outside any framework:

```
> stylex.attrs({ kWkggS: 'x1gok9ik', $$css: true })
{ class: 'x1gok9ik' }
> stylex.attrs({ kWkggS: 'x115q45z x1ruedau', kMwMTN: 'xmfs69f', $$css: true }, { kWkggS: 'x1gok9ik', $$css: true })
{ class: 'xmfs69f x1gok9ik' }
> stylex.props({ kWkggS: 'x1gok9ik', $$css: true }, { '--ult-color-accent': 'red' })
{ className: 'x1gok9ik', style: { '--ult-color-accent': 'red' } }
> stylex.create({ a: { color: 'red' } })
Error: Unexpected 'stylex.create' call at runtime. Styles must be compiled by '@stylexjs/babel-plugin'.
```

The second call shows the per-property merge: the later `danger` background replaced `root`'s `x115q45z x1ruedau` for key `kWkggS`. The third shows the escape hatch a custom element could use to set a custom property inline.

The docs say the same thing in fewer words. `props`: "Takes a StyleX style or array of StyleX styles, and returns a props object", and "For Solid, Svelte, Qwik, Vue" use `stylex.attrs()`, which "provides `class` and a string `style` value directly." `attrs`: "returns DOM attributes for environments that expect `class` instead of `className`, and a serialized `style` string instead of a style object. This is useful for SSR output and for frameworks such as Solid, Svelte, Vue, and Qwik." The "Thinking in StyleX" page: "StyleX is a CSS-in-JS solution, not a CSS-in-React solution."

### 2. What the compiler does to a custom element file

Run here. A scratch `element.ts` imported this repo's `tokens.stylex.ts` (copied unmodified), declared a `stylex.create` with `root` and `danger`, and defined `class UltButton extends HTMLElement` whose `connectedCallback` called `attrs`/`props` four ways. Compiled with `@babel/core` + `@babel/preset-typescript` + `styleXPlugin.withOptions({ dev: false, runtimeInjection: false, useCSSLayers: true, unstable_moduleResolution: { type: 'commonJS', rootDir } })`, the same shape as `packages/tokens/scripts/build-tokens.ts`:

```js
const styles = {
  root: { k1xSpc: "x3nfvp2", kWkggS: "x115q45z x1ruedau", kMwMTN: "xmfs69f", kg3NbH: "xa4w50p", kaIpWk: "x1lufrj1", $$css: true },
  danger: { kWkggS: "x1gok9ik", $$css: true }
};
class UltButton extends HTMLElement {
  static styles = styles;
  connectedCallback() {
    // fully static: the compiler can resolve every argument
    const staticAttrs = { class: "x3nfvp2 x115q45z x1ruedau xmfs69f xa4w50p x1lufrj1" };
    const staticProps = { className: "x3nfvp2 x115q45z x1ruedau xmfs69f xa4w50p x1lufrj1" };
    // runtime-conditional: variant chosen from an attribute at runtime
    const tone = this.getAttribute('tone');
    const cond = {
      0: { class: "x3nfvp2 x115q45z x1ruedau xmfs69f xa4w50p x1lufrj1" },
      1: { class: "x3nfvp2 xmfs69f xa4w50p x1lufrj1 x1gok9ik" }
    }[!!(tone === 'danger') << 0];
    // opaque: styles picked from a map by a runtime key; the compiler cannot resolve it
    const map = { root: styles.root, danger: styles.danger };
    const opaque = stylex.attrs(map[tone]);
  }
}
```

Three shapes, three outcomes. Static arguments become a literal. A `test && style` argument becomes a table of every permutation keyed by a bitmask of the conditions (`transformStylexProps` in the plugin, `lib/index.js:8058` onward: `parseNullableStyle` per argument, `ConditionalStyle` for `&&` and ternaries, `makeStringExpression` builds the permutation table). Anything `parseNullableStyle` returns `'other'` for sets `bailOut` and the call is left in place, with the `import * as stylex` kept, which is the runtime path from section 1. A `classList`-driven element would most naturally use the second shape (attributes read in `attributeChangedCallback`, then `this.className = ...`).

The `create` call compiled to a plain object with a `$$css` marker; `static styles = styles` on the class is ordinary data. A `defineConsts` read compiled to its value: `borderWidth: border.hairline` emitted `.x5g0gaz{border-width:1px}`, no `var()`.

**The stylesheet.** `processStylexRules` over the metadata from `tokens.stylex.ts`, `themes.ts` and `element.ts` (174 rules) produced 9,532 bytes:

```
@layer priority1, priority2, priority3;
@layer priority1{
:root, .xj3ftdf{--ult-color-surface:#101011;--ult-color-surface-raised:#141516;...}
:root, .x1h2m1tz{--ult-space-1:0.125rem;...}
@media (prefers-color-scheme: light){:root, .xj3ftdf{--ult-color-surface:#fdfdff;...}}
@media (prefers-reduced-motion: reduce){:root, .x1popc0p{--ult-motion-fast:1ms;...}}
.x1kx834m.x1kx834m, .x1kx834m.x1kx834m:root{--ult-color-accent:#565fde;...}
.x179umr6.x179umr6, .x179umr6.x179umr6:root{--ult-color-accent:#8394ff;...}
}
@layer priority2{ .xa4w50p{padding-inline:var(--ult-space-4)} .x1lufrj1{border-radius:var(--ult-radius-md)} ... }
@layer priority3{ .x115q45z{background-color:var(--ult-color-accent)} .x1ruedau:hover{...} ... }
```

The raw rules are `:root, .xj3ftdf{...}` at priority 0.1 (vars), 0.2 (var at-rule variants) and `.x1kx834m, .x1kx834m:root{...}` at 0.5 (themes); `processStylexRules` doubles the theme class (`lib/index.js:9539`, a `replace` of `.a, .a:root` with `.a.a, .a.a:root`) and wraps each priority group in `@layer priorityN{...}` when `useLayers` is on (`:9545`). This is the file a custom element has to get into scope somehow, and it is the same file the docs app already ships.

**Which hashes are stable across builds.** This matters because a shipped element would carry class strings compiled in one place and a stylesheet compiled in possibly another. Run here: compiling the repo's own `packages/ui/src/button.tsx` with the repo's `rootDir` produced the same atomic classes as the scratch build (`.x115q45z{background-color:var(--ult-color-accent)}`, `.x1ruedau:hover{...}`, `.xmfs69f`, `.xa4w50p`, `.x1lufrj1`), because an atomic class is a hash of its rule text and Ultima's `--ult-*` names are verbatim. The theme override classes matched too (`x179umr6`, `x1kx834m`: a hash of the override contents). The **var-group hash did not**: `xj3ftdf` in the scratch tree and `x1szldgk` in the repo, because it is derived from the file's path relative to `rootDir`. It appears in the `:root, .<hash>` selector and as the second class of a theme object (`lightTheme` compiled to `{ x1szldgk: "x1kx834m x1szldgk" }` here and `{ xj3ftdf: "x1kx834m xj3ftdf" }` there). So an element that ships class strings must ship them from the same compile as its stylesheet, and any path that puts the var-group class on a shadow element (section 5) is tied to `rootDir`.

### 3. The runtime injection path, and why it cannot serve a shadow root

`runtimeInjection: true` changes the compiled module. Run here, the head of `element.ts`:

```js
import _inject from "@stylexjs/stylex/lib/stylex-inject";
var _inject2 = _inject;
_inject2({ ltr: ".x3nfvp2{display:inline-flex}", priority: 3000 });
_inject2({ ltr: ".x115q45z{background-color:var(--ult-color-accent)}", priority: 3000 });
_inject2({ ltr: ".x1ruedau:hover{background-color:var(--ult-color-accent-hover)}", priority: 3130 });
...
```

`registerStyles` in the plugin inserts one call per rule before the statement that produced it (`lib/index.js:665`-`700`). The target, `lib/cjs/inject.js`:

- `inject(args)` has no root parameter. Its type is `inject(args: { ltr, rtl?, priority, constKey?, constVal? }): string`.
- It writes to a module-level `const sheet = createSheet();` and `createSheet` hard-codes `const rootNode = document;`, ignoring its own declared `root?: HTMLElement` parameter.
- `createCSSStyleSheet(rootNode, textContent)` would accept a non-document node (`container = root.nodeType === Node.DOCUMENT_NODE ? root.head : root`), but nothing reachable passes one. The style element is `<style data-stylex="true">` inserted as the first child of `document.head`.
- Ordering is by `addSpecificityLevel(text, Math.floor(priority / 1000))`, which appends `:not(#\#)` once per level; the runtime never emits `@layer`, so `useCSSLayers` does not apply to it and the cascade guarantee in the spec's "What a component may assume about the consumer's CSS" would not hold.

So the half-built plumbing for a non-document root exists in one helper and is dead. The plugin default is `options.runtimeInjection ?? false` (`lib/index.js:429`), and the option docs say "This may be useful during development but should be disabled in production." It is not a path for shipping an element.

### 4. Light-DOM and shadow-DOM children, tested

Run here in Chromium with the section 2 stylesheet in a document `<style>`. `ult-light` is an undefined element (light DOM only); `ult-shadow` attaches an open shadow root containing `<span class="x115q45z">` and a `<slot>`.

| Case | `background-color` | `--ult-color-accent` |
| --- | --- | --- |
| light-DOM `<span class="x115q45z">` | `rgb(131, 148, 255)` | `#8394ff` |
| the same span inside the shadow root | `rgba(0, 0, 0, 0)` | `#8394ff` |
| shadow span, host carries `x1kx834m xj3ftdf` (lightTheme) | (no class rule) | `#565fde` |
| slotted light-DOM span under that host | `rgb(86, 95, 222)` | |
| shadow span under a wrapper carrying `x1kx834m xj3ftdf`, no sheet in the shadow, host untouched | | `#8394ff` |
| light-DOM span under a wrapper carrying the same classes | | `#565fde` |

The class rule stopped at the boundary; the custom property did not; the theme class worked exactly where the class rule was in scope. `getComputedStyle` on `documentElement` confirmed `--ult-space-4: 0.5rem` was set by the document's `:root` rule.

The spec sentences these rest on. CSS Scoping §3.3.2: "The top-level elements of a shadow tree inherit from their host element." CSS Variables §2: custom properties are "Inherited: yes" and are "ordinary properties, so they can be declared on any element, are resolved with the normal inheritance and cascade rules." CSS Scoping on selectors: "Ordinary, selectors within a shadow tree can't see elements outside the shadow tree at all", and the host is "not selectable by any means except for the :host and :host-context() pseudo-classes" from inside. CSS Scoping §3.3.1 (shadow cascading): "for normal rules the declaration from the outer document wins, and for important rules the declaration from the shadow tree wins." Run here as a check: an adopted `:host{color:red}` lost to a document `ult-el{color:blue}` (`rgb(0, 0, 255)`).

The maintainer position is on record on facebook/stylex#381, from nmn (2024-01-26), closing a request for Stencil docs: "You must *NOT* use shadow DOM: Shadow DOM is inherently incompatible with atomic CSS. If you *have* to use shadow DOM, you can configure Stencil to treat the generated StyleX CSS file as Global Styles." That is a description of section 5: the generated file, placed in every shadow root. Nothing in the docs content or the CHANGELOG mentions shadow DOM, web components, or custom elements.

### 5. What `adoptedStyleSheets` needs from the build

Run here, three variants.

**(a) Document has the StyleX CSS, shadow root adopts the same text.** `new CSSStyleSheet().replaceSync(css)` gave `sheet.cssRules.length === 4`: `@layer priority1, priority2, priority3;` then three `@layer` blocks. Inside the shadow, `.x115q45z` painted `rgb(131, 148, 255)`, and `x1kx834m xj3ftdf` on an inner wrapper switched a child to `#565fde` / `rgb(86, 95, 222)`. Everything StyleX emits parses in a constructed sheet, layers included.

**(b) Shadow root adopts the text, document has nothing.** `--ult-color-accent` computed empty on the shadow span and `background-color` was `rgba(0, 0, 0, 0)`. The `:root, .xj3ftdf{...}` rule is in the sheet but `:root` "represents an element that is the root of the document" (Selectors 4 §13.1) and a shadow root is not the document root. Two fixes both worked: putting `.xj3ftdf` on a wrapper inside the shadow (the second selector in the same rule) painted `rgb(131, 148, 255)`; rewriting `:root, .` to `:host, .` in the adopted text set `--ult-color-accent: #8394ff` on the host and painted the same. The first fix depends on the path-derived var-group hash from section 2; the second is a text rewrite at build time, the same kind `build-tokens.ts` already does to theme selectors.

**(c) `tokens.css` only, in the document.** A shadow `.btn{background:var(--ult-color-accent)}` painted `rgb(131, 148, 255)`, and `data-theme="light"` on the host switched the inner value to `#565fde`. The export's `[data-theme]` blocks work on a host for the same inheritance reason.

What a build has to produce, then:

- **The CSS as a JS string**, because `CSSStyleSheet.replaceSync` takes text, and it must be the output of the same compile that produced the element's class strings (section 2). The repo already has the mechanism in `build-tokens.ts`: Babel + `styleXPlugin.withOptions(stylexOptions(...))`, then `processStylexRules` (exported as `styleXPlugin.processStylexRules`, `lib/index.js:9548`). The unplugin path writes the CSS to an asset (`vite.js:129`-`178`: append to the asset chosen by `cssInjectionTarget`, else `stylex.css`); its `__stylexCollectCss` hook is an internal, not an option. The CLI writes `cssBundleName` and "inserts an import for the generated CSS file into every file that was transformed", which is a document-level import, not a string.
- **Only the element's own rules plus the token and theme rules.** `processStylexRules` takes whatever rule array it is given; a custom-element bundle should not carry the docs app's rules. Note the `defineConsts` substitution runs inside `processStylexRules`, so any file that reads a const must be in the same batch or its `var(--x…)` placeholder is left dead (the mode `docs/research/2026-09-09-stylex-responsive.md` §4(a) documents).
- **A decision on `:root`.** Either the element relies on the document carrying Ultima's variables (the StyleX build's `:root` rule, or `tokens.css`) and inherits them across the boundary, or the shadow sheet's `:root, .<hash>` is rewritten to `:host, .<hash>` so the element is self-contained. The rewrite also makes the `@media (prefers-color-scheme: light){:root, ...}` and reduced-motion variants land on the host. A self-contained element re-declares every token on every host, which is the "two token sources" cost only if the values could drift; here they come from the same compile, so they cannot.
- **One `CSSStyleSheet` per module, shared.** The spec permits one constructed sheet in many shadow roots of the same document and MDN's `adoptedStyleSheets` page states "the same constructed stylesheet can be shared with one or more `ShadowRoot` instances"; edits propagate to all adopters. A sheet may only be adopted by roots whose node document is its constructor document (CSSOM), so an element used in an iframe needs its own sheet per document.
- **No `@import`** (constructed sheets throw `SyntaxError` on one, and `replace`/`replaceSync` strip them). StyleX emits none; the export's `FORBIDDEN` list already bans it. `@layer` is fine, and Cascade 5 §6.4.3 says "the ordering of layers in the light DOM has no impact on the order of identically-named layers in the shadow DOM (and vice versa)", so the shadow's `priority1..3` never interleaves with the document's.
- **Browser floor.** MDN lists `adoptedStyleSheets` as Baseline "available across browsers since March 2023" (the Safari 16.4 release).

`::part` is the other outbound route and is orthogonal to StyleX: CSS Shadow Parts lets "an author style specific, purposely exposed elements in a shadow tree from the outside page's context", and StyleX has no way to author a `::part()` rule (the responsive note lists the supported at-rules and pseudo forms; `::part` is not among them). If Ultima wants consumers to restyle shadow internals, that is hand-written consumer CSS on the consumer's side, which is already the plain-CSS override path the spec allows.

### 6. ADR 0001 and the tokens-CSS-only path

Mechanically the path works (5c). The question is whether it is Ultima styling. ADR 0001's decision sentence is "Components in Ultima are authored in StyleX only. Tokens are defined once with StyleX variables. A build step emits the same tokens as CSS custom properties for consumers that cannot run StyleX." Its context names what a mixed system costs: "two styling models, two token sources, and two sets of conventions for agents to learn." Its consequences already sort the tokens export into a bucket: "Tailwind-only consumers can adopt the tokens CSS export but not the components." ADR 0004 adds that the export exists so "one override works for every consumer."

Read against that text, an Ultima custom element styled with hand-written CSS over `--ult-*`:

- keeps one token source (the export is generated from the StyleX source by `build-tokens.ts`, and the build fails if they disagree), so that cost is avoided;
- introduces a second styling model and a second set of conventions (a `.btn{...}` stylesheet with its own state selectors, its own variant scheme, its own cascade position outside `@layer priority*`), which is the thing the ADR rejected;
- is a component, so it is not covered by the "tokens CSS export but not the components" carve-out; that sentence describes a consumer building their own UI on Ultima's tokens, which is what the element would be doing from inside Ultima's own package.

So under the ADR's own words it is a second engine, and calling the element "Ultima" would need an amendment that says so. The path that needs no amendment to the decision sentence, only to the delivery sentence, is section 2 plus 5: author the element in `stylex.create` exactly as `button.tsx` is authored (same tokens, same `':is([data-*])'` state conventions, same variant tables), run the repo's compiler over it, and ship the compiled class strings with the compiled sheet, adopted into the shadow root or relied on from the document for a light-DOM element. Authoring stays StyleX-only; what changes is that the consumer does not run the compiler, which is the same relationship `tokens.css` consumers already have to the tokens. The one thing that is genuinely new is that the element's stylesheet becomes a build artifact Ultima publishes rather than something the consumer's bundler emits, so the registry's "copy source, consumer compiles" story does not apply to it.

A light-DOM custom element (no shadow root) needs none of section 5: the document sheet reaches it (section 4), themes apply on any ancestor, and the only requirement is that the document carries the StyleX CSS, which for a non-StyleX host means shipping the compiled sheet as a file the host links. That is the smallest change and the one the StyleX maintainer recommends outright.

## Sources

### Run in this repo

- Scratch `element.ts` (a `stylex.create` plus `class UltButton extends HTMLElement`) importing an unmodified copy of `packages/tokens/src/tokens.stylex.ts` and `themes.ts`, compiled through `@babel/core` + `@babel/preset-typescript` + `@stylexjs/babel-plugin` 0.19.0 `withOptions({ dev: false, runtimeInjection: false, useCSSLayers: true, unstable_moduleResolution: { type: 'commonJS', rootDir } })`: static `attrs`/`props` calls inlined to `{ class: "..." }` / `{ className: "..." }`; a `&&` argument compiled to a permutation table; a map lookup left as a runtime `stylex.attrs(map[tone])`; `border.hairline` inlined to `.x5g0gaz{border-width:1px}`; `processStylexRules(rules, true)` over 174 rules produced the 9,532-byte layered sheet quoted in section 2.
- Same file with `runtimeInjection: true`: `import _inject from "@stylexjs/stylex/lib/stylex-inject"` and one `_inject2({ ltr, priority })` per rule.
- `node -e` over `@stylexjs/stylex` 0.19.0: the export list; `attrs`/`props` on compiled-shape objects returning `{ class }` / `{ className, style }` with per-property merge; `create()` throwing at runtime.
- `packages/ui/src/button.tsx`, `packages/tokens/src/tokens.stylex.ts` and `themes.ts` compiled with the repo `rootDir`: atomic classes and theme override classes identical to the scratch build; var-group hash `x1szldgk` versus scratch `xj3ftdf`.
- Playwright 1.63.0 Chromium (`~/.cache/ms-playwright/chromium-1243`) with `emulateMedia({ colorScheme: 'dark' })`: the tables and values in sections 4 and 5 (document sheet with light-DOM and shadow-DOM children; theme classes on host, on light-DOM wrapper, on shadow wrapper; adopted sheet with and without document CSS; `:root` to `:host` rewrite; `tokens.css` with `[data-theme]` on the host; `:host` versus outer rule).

### Installed source read directly

- `node_modules/.pnpm/@stylexjs+stylex@0.19.0/node_modules/@stylexjs/stylex/lib/cjs/stylex.js`: `props`, `attrs`, the throwing stubs, bundled `styleq`.
- Same package `lib/cjs/inject.js`: `inject(args)` with no root; `createSheet` hard-coding `const rootNode = document` and ignoring its `root` parameter; `createCSSStyleSheet(rootNode, textContent)` appending `<style data-stylex>` to `root.head` or `root`; `addSpecificityLevel` appending `:not(#\#)` per priority level; `resolveConstants` for `defineConsts` at runtime. `lib/cjs/inject.d.ts`, `stylesheet/createSheet.d.ts`, `stylesheet/createCSSStyleSheet.d.ts` for the signatures.
- `node_modules/.pnpm/@stylexjs+babel-plugin@0.19.0/node_modules/@stylexjs/babel-plugin/lib/index.js`: `:429` `options.runtimeInjection ?? false`; `:665`-`:700` `registerStyles` inserting `inject` calls; `:8058` onward `transformStylexProps`, `parseNullableStyle`, `ConditionalStyle`, `makeStringExpression`; `:5527` theme rule `.${overrideClassName}, .${overrideClassName}:root{...}`; `:5537`-`:5539` theme object `{ [__varGroupHash__]: "override group" }`; `:9426` `processStylexRules`; `:9539` the `.a, .a:root` to `.a.a, .a.a:root` rewrite; `:9535`-`:9545` `addSpecificityLevel` only when layers are off, `@layer priorityN{}` when on; `:9548` `styleXTransform.processStylexRules = processStylexRules`.
- `node_modules/.pnpm/@stylexjs+unplugin@0.19.0_unplugin@2.3.11/node_modules/@stylexjs/unplugin/README.md` and `lib/vite.js:129`-`178`, `lib/consts.js`: CSS appended to the asset picked by `cssInjectionTarget`, else `stylex.css`; dev virtual modules `/virtual:stylex.css` and `virtual:stylex:runtime`; `__stylexCollectCss` as an internal hook.

### Repo files

- `docs/adr/0001-stylex-only-styling.md`: the decision sentence, "two styling models, two token sources, and two sets of conventions", and "Tailwind-only consumers can adopt the tokens CSS export but not the components."
- `docs/adr/0004-stable-semantic-token-names.md`: verbatim `--ult-*` names so "one override works for every consumer"; palette as `defineConsts` never reaching CSS.
- `docs/spec/ultima.md`, "Tokens CSS export", "Color mode", "Overriding", "What a component may assume about the consumer's CSS".
- `packages/tokens/scripts/build-tokens.ts`: the compile-and-collect pattern, the `FORBIDDEN` list (`@import`, `url(`, ...), the selector rewrite from hashed theme classes to `[data-theme]`.
- `packages/tokens/dist/tokens.css`: the four-block export used in run 5(c).
- `packages/ui/src/button.tsx`: the `stylex.create` conventions an element would keep.
- `stylex.options.ts`: `runtimeInjection: false`, `useCSSLayers: true`.
- `docs/research/2026-09-08-stylex-capabilities.md`: `attrs` removed in 0.13.0 and restored in 0.18.2; compiled shapes of `defineVars` and `createTheme`.
- `docs/research/2026-09-09-stylex-responsive.md` §4(a): the silent dead `var(--x…){}` when a consts file is missing from the `processStylexRules` batch.

### StyleX documentation and upstream

- https://stylexjs.com/docs/api/javascript/props/: signature, "returns a props object", and "For Solid, Svelte, Qwik, Vue" use `stylex.attrs()`.
- https://stylexjs.com/docs/api/javascript/attrs/: "returns DOM attributes for environments that expect `class` instead of `className`, and a serialized `style` string ... useful for SSR output and for frameworks such as Solid, Svelte, Vue, and Qwik."
- https://stylexjs.com/docs/learn/thinking-in-stylex/: "StyleX is a CSS-in-JS solution, not a CSS-in-React solution."
- https://stylexjs.com/docs/api/configuration/babel-plugin/: `runtimeInjection` "may be useful during development but should be disabled in production", default `false`; `processStylexRules` "takes an array of CSS rules collected from the babel plugin and returns the final CSS string"; `useLayers`.
- https://stylexjs.com/docs/learn/installation/cli/: "pre-transform an entire directory of files to compile away StyleX and generate a static CSS file"; `cssBundleName`; "The CLI inserts an import for the generated CSS file into every file that was transformed."
- https://stylexjs.com/docs/learn/theming/creating-themes/: a theme "can be applied to an element using `props()` to override variables for that element and all its descendants."
- https://raw.githubusercontent.com/facebook/stylex/main/CHANGELOG.md: 0.13.0 "The `attrs` API is removed due to low usage and redundancy with the `props` API"; 0.18.2 "Bring back `stylex.attrs` for SSR and non-React frameworks"; no entry mentions shadow DOM or web components.
- https://github.com/facebook/stylex/issues/381: nmn, 2024-01-26, "You must *NOT* use shadow DOM: Shadow DOM is inherently incompatible with atomic CSS. If you *have* to use shadow DOM, you can configure Stencil to treat the generated StyleX CSS file as Global Styles." The only shadow-DOM issue in the tracker.

### Specifications and platform references

- https://www.w3.org/TR/css-scoping-1/ §3.3.2 "The top-level elements of a shadow tree inherit from their host element"; §3.3.1 outer document wins for normal rules, shadow tree wins for important; selectors inside a shadow tree "can't see elements outside the shadow tree at all"; the host "is not selectable by any means except for the :host and :host-context() pseudo-classes."
- https://www.w3.org/TR/css-variables-1/#defining-variables: custom properties `Inherited: yes`; "ordinary properties ... resolved with the normal inheritance and cascade rules."
- https://drafts.csswg.org/selectors-4/#the-root-pseudo: "The :root pseudo-class represents an element that is the root of the document."
- https://drafts.csswg.org/css-cascade-5/#cascade-sort: the Context step, and §6.4.3 "Cascade layers are scoped to their origin and context, so the ordering of layers in the light DOM has no impact on the order of identically-named layers in the shadow DOM (and vice versa)."
- https://drafts.csswg.org/cssom-1/#extensions-to-the-document-or-shadow-root-interface: `adoptedStyleSheets`, `CSSStyleSheet()` and `CSSStyleSheetInit`, `replace`/`replaceSync` stripping `@import`, `SyntaxError` on inserting `@import` into a constructed sheet, and the constructor-document requirement for adoption.
- https://drafts.csswg.org/css-shadow-1/ §5: `::part()` "allows an author to style specific, purposely exposed elements in a shadow tree from the outside page's context"; "only matches anything when the originating element is a shadow host."
- https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets: Baseline "available across browsers since March 2023"; "the same constructed stylesheet can be shared with one or more `ShadowRoot` instances."
