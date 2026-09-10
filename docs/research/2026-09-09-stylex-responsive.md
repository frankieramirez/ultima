# What can StyleX 0.19.0 do for responsive styling, can a breakpoint be a token, and what is Base UI's `unstable-use-media-query`?

## Findings

Short version: StyleX 0.19.0 does media queries, container queries, and `@supports` well, all as at-rule keys nested inside a property value, all composing with the pseudo-class and data-attribute conditions Ultima already writes, and all surviving `useCSSLayers: true` intact. The load-bearing question has a sharp answer, proven against this repo's own installed compiler: **a `defineConsts` value cannot be interpolated into an at-rule condition** — `'@media (min-width: ' + bp.md + ')'` and the template-literal form both fail with `Invalid media query syntax.` — but **a `defineConsts` value that holds the entire at-rule string can be used as the key**, which is the shape StyleX's own docs prescribe for breakpoints, and it compiles to correct CSS. That form carries two costs the literal form does not, one of them acknowledged upstream in a single-sentence aside: it forfeits `lastMediaQueryWinsTransform`, the default-on pass that makes overlapping `min-width` ranges mutually exclusive, so breakpoint order stops being guaranteed and has to be restored by hand-writing disjoint ranges; and it lands the rule in a much higher priority bucket (property + 3000 rather than property + 200), which moves it into a later cascade layer where it outranks every pseudo-class. A `defineVars` value cannot be used either way: interpolating it is the same compile error, and smuggling the whole at-rule through a custom property compiles but emits `var(--ult-bp-md-query){...}` into the stylesheet with no error and no warning, because CSS Custom Properties Level 1 confines `var()` to property values and StyleX's substitution pass only knows about `defineConsts`. There is no StyleX runtime API for reading a breakpoint, and no ecosystem convention for sharing one — StyleX's own docs site duplicates its sidebar breakpoint by hand. Base UI's `unstable-use-media-query` is MUI's hook with the theme integration removed; it strips a leading `@media ` from the query string it is given, which means one string can serve both the StyleX at-rule key and the hook.

Everything in sections 1 through 6 was run through `@babel/core` plus `@stylexjs/babel-plugin` 0.19.0 as installed in this repo, using `stylex.options.ts` (`useCSSLayers: true`, `runtimeInjection: false`, `dev: false`) with `unstable_moduleResolution.rootDir` pointed at the scratch directory — the same invocation `packages/tokens/scripts/build-tokens.ts` uses. Rule output is quoted as `[priority] <emitted CSS>` exactly as it came back in `result.metadata.stylex`. The scratch files were deleted.

### 1. Media queries inside `stylex.create`

The at-rule is a key inside a **property value**, never at the top level of a `create` call. Putting one at the top level is a compile error:

```
### 2-toplevel.ts: THREW
  Invalid pseudo or at-rule.
```

Inside a value it works, and it nests. Media inside media, pseudo-class inside media, and data-attribute inside media all compile:

```
### 2-nested.ts: 4 rule(s)
  [prio 3000] .x1e2nbdu{color:red}
  [prio 3200] @media (min-width: 48rem){.x1e83r8i.x1e83r8i{color:blue}}
  [prio 3330] @media (min-width: 48rem){.x1mpqw6k.x1mpqw6k:hover{color:green}}
  [prio 3240] @media (min-width: 48rem){.x1vgrgg2.x1vgrgg2:is([data-open]){color:teal}}

### 3-media-in-media.ts: 3 rule(s)
  [prio 3000] .x1e2nbdu{color:red}
  [prio 3200] @media (min-width: 48rem){.x1e83r8i.x1e83r8i{color:blue}}
  [prio 3400] @media (orientation: landscape){@media (min-width: 48rem){.xmvhgo7.xmvhgo7.xmvhgo7{color:green}}}
```

Note the class is repeated once per nesting level (`.x.x`, `.x.x.x`) to buy specificity, and that nested media queries emit as genuinely nested at-rules rather than being flattened into an `and` chain.

The docs cover this under "Media queries (and other `@` rules)" and "Combining conditions" — "Your Style Values can be nested more than one level deep when you need to combine Media Queries and Pseudo Selectors" — and **state no nesting depth limit**. Nor is one enforced: the compiler carries a message string `ILLEGAL_NESTED_PSEUDO = "Pseudo objects can't be nested more than one level deep."` that is never thrown, referenced only by a negative assertion in a test. The docs do carry one requirement worth noting for a responsive value: "The `default` case is required when authoring contextual styles. If you don't want any style to be applied in the default case, you can use `null` as the value."

The default-on `enableMediaQueryOrder` option (`enableMediaQueryOrder: true` in the plugin's defaults, `lib/index.js:336`) runs `lastMediaQueryWinsTransform` over the raw style object before flattening. It arrived in 0.15.0 behind the flag and was turned on by default in 0.16.3, and it is **absent from the babel-plugin options reference** — the only prose explaining it is the 0.15.0 release blog, which shows the same before/after this section demonstrates, and the 0.17.1 post announcing the default: "This config ensures that authored media query order is respected, with later queries taking precedence over earlier ones." This is the single most important thing about literal media queries in StyleX, and it is easy to miss: **it rewrites overlapping ranges so they cannot both match.** Writing `md` then `lg`:

```
### 2-literal-same.ts: 3 rule(s)
  [prio 1000] .x1ghz6dp{margin:0}
  [prio 1200] @media (min-width: 48rem) and (max-width: 63.99rem){.x1mbsapi.x1mbsapi{margin:9px}}
  [prio 1200] @media (min-width: 64rem){.x1qdfnb9.x1qdfnb9{margin:1px}}
```

The `48rem` rule gained an `and (max-width: 63.99rem)` upper bound it was never written with. Writing them in the other order, the shadowed query is neutralised outright:

```
### 1-reverse.ts: 3 rule(s)
  [prio 1000] .x1717udv{padding:0}
  [prio 1200] @media not all{.x1fvte4n.x1fvte4n{padding:1px}}
  [prio 1200] @media (min-width: 48rem){.x1rs2l5n.x1rs2l5n{padding:9px}}
```

Because the emitted ranges are disjoint, the final CSS is correct no matter what order `processStylexRules` happens to sort the rules into. That guarantee is what section 4 shows the `defineConsts` form giving up.

Two open bugs sit on this transform and both are output bugs rather than input ones, so they would show up in built CSS rather than at compile time: [#1859](https://github.com/facebook/stylex/issues/1859), a strict media range losing its excluded boundary in the unplugin/Vite production build, and [#1860](https://github.com/facebook/stylex/issues/1860), filed against 0.19.0, mixed responsive/print values emitting a non-matching nested media-type condition. Relying on the transform is the right default, but it is not a settled corner of the compiler.

### 2. Media queries alongside pseudo-classes and data attributes, and precedence

They coexist in one property value and each becomes its own rule. Precedence is not the CSS cascade's specificity — it is StyleX's own priority number, which decides sort order and, under `useCSSLayers`, which cascade layer the rule lands in. The arithmetic is a plain sum (`lib/index.js:4769`):

```js
const priority = getPriority(key)
  + pseudos.map(getPriority).reduce((a, b) => a + b, 0)
  + atRules.map(getPriority).reduce((a, b) => a + b, 0)
  + constRules.map(getPriority).reduce((a, b) => a + b, 0);
```

The tables (`lib/index.js:4558`, `4613`):

| Condition | Priority contribution |
| --- | --- |
| `@supports` | 30 |
| `@media` | 200 |
| `@container` | 300 |
| `:hover` | 130 |
| `:focus` | 150 |
| `:active` | 170 |
| anything not in `PSEUDO_CLASS_PRIORITIES` (the `?? 40` fallback) | 40 |
| `::before` / `::after` and other pseudo-elements | 5000 |
| a plain longhand property key | 3000 |
| a shorthand-of-shorthands (`padding`) | 1000 |

So for a `color` value (`3000`), the observed numbers fall straight out: base `3000`, `:hover` `3130`, `@media` `3200`, `@media` + `:is([data-open])` `3240`, `@media` + `:hover` `3330`.

**Two entries in that table are unreachable, and one of them is Ultima's focus ring.** `PSEUDO_CLASS_PRIORITIES` spells two keys in camelCase — `':focusWithin': 140` and `':focusVisible': 160` — which are not CSS pseudo-class names, so the real spellings miss the lookup and take the `?? 40` fallback:

```
### 1-focus.ts: 7 rule(s)
  [prio 3000] .xbutuof{outline-color:red}
  [prio 3130] .xhkhu1t:hover{outline-color:orange}
  [prio 3040] .xnlommz:focus-visible{outline-color:green}
  [prio 3160] .x1wu1lby:focusVisible{outline-color:teal}
  [prio 3040] .xmu753f:focus-within{outline-color:olive}
  [prio 3040] .xriohbi:is([data-disabled]){outline-color:gray}
  [prio 3200] @media (min-width: 48rem){.x1ttiw3o.x1ttiw3o{outline-color:blue}}
```

`':focus-visible'` gets 3040, not 3160. Writing the camelCase form to reach 160 emits `.x1wu1lby:focusVisible{...}`, which is not a valid selector and does nothing. `':hover'` and `':active'` are spelled identically in CSS and in the table, so those two are reachable. The practical ordering for the conditions Ultima's State styling section actually writes is therefore: `:focus-visible`, `:focus-within`, and `:is([data-*])` all tied at 3040, then `:hover` at 3130, then `:active` at 3170.

**The consequence worth naming: a bare media query outranks every one of them.** In one property value, `@media` at `3200` sorts after `:hover` at `3130` and well after `:focus-visible` at `3040`:

```
### 1-media-pseudo.ts: 3 rule(s)
  [prio 3000] .x1e2nbdu{color:red}
  [prio 3130] .x1ahxo3w:hover{color:orange}
  [prio 3200] @media (min-width: 48rem){.x1e83r8i.x1e83r8i{color:blue}}
```

Above 48rem the element is blue even while hovered. Ultima's state styling rests on `':hover'`, `':active'`, `':focus-visible'`, and `':is([data-...])'` inside the value, so any responsive value written as a sibling of those silently wins over all of them. The fix is to nest: put the pseudo-class *inside* the media query (`3330`), which is what the nested form in section 1 produces.

### 3. Container queries

Supported, not marked unstable, and **entirely undocumented**. `grep` over the docs content tree at tag 0.19.0 finds no mention of `@container`, `containerName`, `containerType`, or any container API, and the CHANGELOG has never mentioned the word. The only first-party acknowledgements that it works are one line in the LLM authoring reference — "Other supported @-rules include `@supports` and `@container` queries." — and the ESLint plugin's at-rule allowlist, which matches `/^@container/` (and, revealingly, labels it "a media query"). The priority-300 handling predates the CHANGELOG's coverage window entirely; it is already present in `@stylexjs/shared` 0.3.0. So this is a supported feature with no docs page, no release note, and no stability statement either way.

`@container` is a first-class entry in `AT_RULE_PRIORITIES` at 300, handled by `getAtRulePriority` alongside `@media` and `@supports`. The container is declared with the ordinary `containerName` and `containerType` properties in a `stylex.create` style — there is no separate API — and the `container` shorthand expands to `container` / `containerName` / `containerType` in the plugin's shorthand table (`lib/index.js:1095`). The query itself is an at-rule key inside a property value, same shape as `@media`:

```
### 4-container.ts: 4 rule(s)
  [prio 3000] .x4s5kx9{container-name:sidebar}
  [prio 3000] .x12h1iku{container-type:inline-size}
  [prio 3000] .x1e2nbdu{color:red}
  [prio 3300] @container sidebar (min-width: 20rem){.x4cgb45.x4cgb45{color:blue}}
```

`@container` at 300 outranks `@media` at 200, so a container query beats a media query for the same property.

**Overlapping container queries carry the same ordering bug that section 4 describes for const-keyed media queries, and here it bites literal source.** `lastMediaQueryWinsTransform` is a *media* transform; nothing rewrites `@container` ranges. Two overlapping container queries, written narrow-then-wide:

```
### 1-container-overlap.ts: 3 rule(s)
  [prio 1000] .x1717udv{padding:0}
  [prio 1300] @container sidebar (min-width: 20rem){.x1ey8ylj.x1ey8ylj{padding:9px}}
  [prio 1300] @container sidebar (min-width: 40rem){.x1jcp4aa.x1jcp4aa{padding:1px}}
```

```
@layer priority1{
.x1717udv{padding:0}
@container sidebar (min-width: 40rem){.x1jcp4aa.x1jcp4aa{padding:1px}}
@container sidebar (min-width: 20rem){.x1ey8ylj.x1ey8ylj{padding:9px}}
}
```

Equal priority, so the `localeCompare` tiebreak decides, and it emitted the 40rem rule first. At a 50rem container both match and `padding: 9px` wins where the author wrote `1px` for the wider case. Unlike the media-query equivalent, this needs no `defineConsts` to go wrong — plain literal source is enough. Any component using more than one breakpoint of the same container must write disjoint ranges by hand.

For Sidebar specifically, a container query is the one shape that needs no token and no runtime read at all: the sidebar declares itself the container and its parts query it. It also does not answer "is this a mobile layout", because the container is the sidebar, not the viewport.

### 4. A `defineConsts` value inside an at-rule condition

This is the load-bearing question. Two shapes, two different outcomes.

**Interpolation and concatenation are compile errors.** Both of these fail:

```ts
// 1-concat.ts
['@media (min-width: ' + bp.md + ')']: 'blue'
// 2-template.ts
[`@media (min-width: ${bp.md})`]: 'blue'
```

```
### 1-concat.ts: THREW
  Invalid media query syntax.

### 2-template.ts: THREW
  Invalid media query syntax.
```

The error comes from `flattenRawStyleObject` (`lib/index.js:4977`), which wraps `lastMediaQueryWinsTransform` in a `try` and rethrows anything it throws as `INVALID_MEDIA_QUERY_SYNTAX`; underneath, `validateMediaQuery` runs `MediaQuery.parser.parseToEnd(input)` and converts a parse failure into `MediaQueryErrors.SYNTAX_ERROR` (`lib/index.js:3453`-`3461`). The const has not been inlined into the key by that point — the compiler has replaced it with a `var(--hash)` placeholder — so the parser sees `@media (min-width: var(--x8h0yw))`, which is not a valid media feature. The at-rule key must be parseable as a media query *at the point the plugin sees it*, which in practice means a string literal or a value the compiler resolves to a complete, already-valid query string.

**A const holding the whole at-rule string works, and it is the documented pattern.** This is not a workaround discovered by poking at the compiler — `defineConsts.mdx` lists "Media queries" first among its common use cases and gives exactly this shape as its worked example:

```tsx
export const breakpoints = stylex.defineConsts({
  small: '@media (max-width: 600px)',
  medium: '@media (min-width: 601px) and (max-width: 1024px)',
  large: '@media (min-width: 1025px)',
});
// ...
color: { default: 'black', [breakpoints.small]: 'red', [breakpoints.medium]: 'blue' },
```

Note that the documented example writes **mutually exclusive ranges by hand** (`min-width: 601px` *and* `max-width: 1024px`), which is the tell for cost (b) below. The design intent is on the closed RFC that introduced the feature: "the media queries variables would be inlined with the actual value", and "Unlike CSS variables, the value of a custom at-rule needs to remain constant and cannot be overridden in a theme."

Move the entire query into the constant and use it as the computed key:

```ts
export const bp = stylex.defineConsts({
  '--ult-bp-md': '@media (min-width: 48rem)',
  '--ult-bp-lg': '@media (min-width: 64rem)',
});
// ...
[bp['--ult-bp-md']]: { default: 'blue', ':hover': 'green' },
```

Final CSS is correct, and it composes with pseudo-classes:

```
@layer priority1{
.x1e2nbdu{color:red}
.x1ahxo3w:hover{color:orange}
}
@layer priority2{
@media (min-width: 48rem){.xo5234z.xo5234z{color:blue}}
@media (min-width: 64rem){.x1l7b3jn.x1l7b3jn{color:purple}}
@media (min-width: 48rem){.xvcuj11.xvcuj11:hover{color:green}}
}
```

The mechanism is the `defineConsts` CSS-variable-override machinery added in 0.16.0, not a media-query feature. `defineConsts` emits a marker rule per key carrying the value:

```json
["x18f94kt", { "constKey": "x18f94kt", "constVal": "@media (min-width: 48rem)", "ltr": "", "rtl": null }, 0]
```

The consumer file emits a placeholder with the query slot filled by a `var()` reference:

```
[prio 6000] var(--x18f94kt){.xp1xyym.xp1xyym{color:blue}}
```

and `processStylexRules` textually substitutes it, building `constsMap` from the rules whose `constKey` and `constVal` are both set and then `replaceAll`-ing every `var(--key)` occurrence in every remaining rule (`lib/index.js:9443`-`9505`). With Ultima's `--`-prefixed naming grammar the placeholder is readable (`var(--ult-bp-md)`) because a `--`-prefixed key is used verbatim rather than hashed (`lib/index.js:5488`).

Three costs come with that form.

**(a) It fails silently if the consts file is not in the same `processStylexRules` batch.** The substitution is a lookup with `if (refValue == null) continue;`. Compiling only the consumer file:

```
--- CSS with ONLY the consumer file in the batch ---

@layer priority1, priority2;
@layer priority1{
.x1e2nbdu{color:red}
}
@layer priority2{
var(--x18f94kt){.xp1xyym.xp1xyym{color:blue}}
}
```

`var(--x18f94kt){...}` is not a valid selector, so the browser drops the block. No error, no warning, no build failure. This is the shape of open issue [#1497](https://github.com/facebook/stylex/issues/1497). For Ultima it matters at the consumer boundary: the Vite path collects the whole module graph and the tokens file is imported by every component, so it is present; but the Next.js setup item ships a `postcss.config.js`, and the PostCSS plugin's `include` globs decide what gets scanned. A glob that covers `components/**` but not the installed `lib/tokens.stylex.ts` would produce a build that succeeds and a stylesheet with dead rules in it.

**(b) It forfeits `lastMediaQueryWinsTransform`, and breakpoint order stops being guaranteed. Upstream documents this, in one sentence, in an aside.** `defineConsts.mdx` carries the line:

> _Note: `defineConsts` does not currently have `enableMediaQueryOrder` config support._

That is the whole of the official warning, and it does not say what the consequence is. The consequence is this. The transform runs on the raw style object, where the key is still the opaque `var(--ult-bp-md)`, so it cannot compute ranges. The queries stay overlapping. Here is the same author intent — 9px from 48rem up, then 1px from 64rem up — written both ways in one batch:

```
@layer priority1{
.x1ghz6dp{margin:0}
.x1717udv{padding:0}
@media (min-width: 64rem){.x1qdfnb9.x1qdfnb9{margin:1px}}
@media (min-width: 48rem) and (max-width: 63.99rem){.x1mbsapi.x1mbsapi{margin:9px}}
}
@layer priority2{
@media (min-width: 64rem){.x19gedof.x19gedof{padding:1px}}
@media (min-width: 48rem){.x1h5jy0g.x1h5jy0g{padding:9px}}
}
```

The literal form (`margin`) is correct however it is sorted, because the two ranges are disjoint. The const form (`padding`) is **wrong**: at a 70rem viewport both rules match, they have equal priority (4000) and equal specificity, and the `48rem` rule is emitted last, so `padding: 9px` wins where the author asked for `1px`.

The ordering between equal-priority rules is decided by a `localeCompare` tiebreak on the declaration text and then the whole rule text (`lib/index.js:9476`-`9494`). It is alphabetical, not numerical, so whether a set of const-keyed breakpoints comes out right depends on the values being styled. A `padding` of `48px` vs `4px` happens to sort correctly; `9px` vs `1px` does not.

The mitigation the docs example implies is to write disjoint ranges by hand, as `breakpoints.medium` above does. That works, and it is what a const-keyed breakpoint set has to do. It also means each breakpoint constant must know about its neighbour: adding a breakpoint between two existing ones requires editing the upper bound of the one below it, in the token layer, in a value no test currently checks.

**The two costs are traded against each other by one flag, and you cannot have both.** Turning `enableMediaQueryOrder` off makes the *interpolated* form of section 4 compile — and it compiles better than the whole-string const does:

```
===== enableMediaQueryOrder: false =====
  2-template.ts: 2 rule(s)
    [prio 3000] .x1e2nbdu{color:red}
    [prio 3200] @media (min-width: var(--x8h0yw)){.x1bkomr1.x1bkomr1{color:blue}}

@layer priority1{
.x1e2nbdu{color:red}
@media (min-width: 48rem){.x1bkomr1.x1bkomr1{color:blue}}
}
```

`` `@media (min-width: ${bp.md})` `` at priority **3200**, not 6000 — the placeholder sits inside the media condition where the key still starts with `@media`, so `getAtRulePriority` recognises it and the rule stays in the same layer as its siblings. The final CSS is correct. So the interpolated form is only blocked by the validator running before substitution; with the validator disabled it is the better-behaved of the two const shapes.

But the flag is global. Turning it off to buy that gives up `lastMediaQueryWinsTransform` for **every** media query in the build, not just the breakpoint ones — the disjoint-range rewriting in section 1 stops happening everywhere. That is a much larger loss than the thing it buys. This repo does not turn it off: `stylex.options.ts` sets neither the flag nor anything affecting it, so the default `true` applies in the build and in both test suites.

**(c) The priority number is inflated, which changes the cascade layer.** `getPriority` is called on the const placeholder string `var(--ult-bp-md)`. It does not start with `--`, `@supports`, `@media`, or `@container`; it is not a pseudo; it is not in any shorthand set. So it falls through to the final `return 3000` (`lib/index.js:4694`-`4707`). A const-keyed media query therefore contributes **3000** where a literal contributes **200**:

| Form | `color` rule | `padding` rule |
| --- | --- | --- |
| literal `@media` | 3200 | 1200 |
| const-keyed `@media` | 6000 | 4000 |

Layer assignment is `Math.floor(priority / 1000)` (`lib/index.js:9498`), so the const form lands in a strictly later `@layer` than everything it shares a file with — visible above as `priority1` vs `priority2`. Inside that later layer it beats every pseudo-class, every longhand-over-shorthand resolution, and every unrelated rule at a lower priority, regardless of what `property-specificity` resolution would have decided. This is not a documented behaviour; it is `getPriority` failing to recognise the placeholder.

### 5. A `defineVars` value inside an at-rule condition

**The CSS-level answer is no, and it is not a StyleX limitation.** CSS Custom Properties Level 1 §3 settles it in one sentence:

> The `var()` function can be used in place of any part of a value in any property on an element. The `var()` function can not be used as property names, selectors, or anything else besides property values.

A media feature in an at-rule prelude is not a property value, so `var()` is never substituted there. §2.2 defers the rest — "Non-property contexts will define their own behavior for the guaranteed-invalid value" — and the media-queries specs define no substitution behaviour, so the result is simply an unrecognised media condition and the block is dropped. No design could make `@media (min-width: var(--ult-bp-md))` work.

CSS does have a feature for exactly this gap, and it is not usable yet. Media Queries Level 5 §10 defines `@custom-media`, opening with the problem statement Ultima is facing:

> Repeating the same media query multiple times is an editing hazard; an author making a change must edit every copy in the same way, or suffer from difficult-to-find bugs in their CSS.

Its syntax is `@custom-media --narrow-window (max-width: 30em);` then `@media (--narrow-window) { … }`, and the spec is explicit that "The custom media query is evaluated logically, not treated as a textual substitution" and that the name "must be used in a boolean context". Implementation status: Chrome, Edge, Opera, and Safari are all `false` with open tracking bugs; Firefox has it from 148 but pref-gated behind `layout.css.custom-media.enabled`. MDN marks it Experimental with a Limited availability banner. So it is not an option for v0, but it is the thing that would eventually make shape (b) in section 9 coherent, and the shape a breakpoint token should be forward-compatible with if one is added.

StyleX's behaviour splits by how the attempt is made.

**Interpolating a var, or writing `var()` literally, is a compile error** — the same `Invalid media query syntax.` from the same parser, which is the correct outcome:

```
### 1-var-interp.ts: THREW
  Invalid media query syntax.
### 3-var-literal-in-media.ts: THREW
  Invalid media query syntax.
```

**Putting the whole at-rule string in a `defineVars` value fails silently.** This is the trap, because it is the exact shape that works for `defineConsts`:

```ts
export const bpv = stylex.defineVars({ '--ult-bp-md-query': '@media (min-width: 48rem)' });
// ...
[bpv['--ult-bp-md-query']]: 'blue'
```

```
@layer priority1{
:root, .xu6gjwu{--ult-bp-md:48rem;--ult-bp-md-query:@media (min-width: 48rem);}
}
@layer priority2{
.x1e2nbdu{color:red}
}
@layer priority3{
var(--ult-bp-md-query){.xy0zsid.xy0zsid{color:blue}}
}
```

Two bad things at once. The placeholder is never substituted, because `constsMap` is built only from rules carrying `constKey`/`constVal` and a `defineVars` rule carries neither — so the invalid `var(--ult-bp-md-query){...}` selector reaches the stylesheet and the browser drops it. And the at-rule string is also emitted as a real custom property, `--ult-bp-md-query: @media (min-width: 48rem);`, sitting in `:root` as permanent garbage. No error, no warning.

### 6. `@supports` and `@media` under `useCSSLayers: true`

They survive, and the nesting order is layer-outermost. `processStylexRules` groups rules by priority level and wraps each group as `@layer priorityN{ ... }` around whatever the rule text already is, at-rule and all (`lib/index.js:9545`: ``return useLayers && pri > 0 ? `@layer ${layerName(index)}{\n${collectedCSS}\n}` : collectedCSS;``). Nothing hoists an at-rule out of its layer. Observed, with `@supports`, `@media`, `@container`, and a nested `@supports`-inside-`@media` in one batch:

```
@layer priority1, priority2;
@layer priority1{
:root, .x17z0hqb{--ult-bp-md:48rem;}
}
@layer priority2{
.x1e2nbdu{color:red}
.x4s5kx9{container-name:sidebar}
.x12h1iku{container-type:inline-size}
@supports (color: oklch(0 0 0)){.x1dp0g53.x1dp0g53{color:oklch(.5 .1 200)}}
.x1ahxo3w:hover{color:orange}
@media (min-width: 48rem){.x1e83r8i.x1e83r8i{color:blue}}
@supports (color: color-mix(in srgb, red, blue)){@media (min-width: 48rem){.xdqh0hq.xdqh0hq.xdqh0hq{color:purple}}}
@media (min-width: 48rem){.x1vgrgg2.x1vgrgg2:is([data-open]){color:teal}}
@container sidebar (min-width: 20rem){.x4cgb45.x4cgb45{color:blue}}
@media (min-width: 48rem){.x1mpqw6k.x1mpqw6k:hover{color:green}}
@media (orientation: landscape){@media (min-width: 48rem){.xmvhgo7.xmvhgo7.xmvhgo7{color:green}}}
}
```

`@layer` wrapping `@media` is the correct nesting: a conditional group rule inside a layer keeps its layer membership, so a consumer's unlayered `@media` rule still beats an Ultima `@media` rule, which is the same promise the spec's "What a component may assume about the consumer's CSS" already makes for unconditional rules. Nothing about responsive styling weakens it.

The known escape is narrower than it sounds and Ultima already lives with it: [#1611](https://github.com/facebook/stylex/issues/1611), `create` rules that *set* custom properties land outside the layer. That is already the reason the spec closes the local-custom-property route for variant tables. It does not affect at-rule keys.

### 7. Reading a breakpoint at runtime

**StyleX has no runtime media API.** The full export surface of `@stylexjs/stylex` 0.19.0, read off the installed `lib/cjs/stylex.js`:

```
attrs create createTheme defaultMarker defineConsts defineMarker defineVars env
firstThatWorks keyframes legacyMerge positionTry props types unstable_conditional
unstable_createThemeNested unstable_defineConstsNested unstable_defineVarsNested
viewTransitionClass when
```

No `useMediaQuery`, no breakpoint reader, nothing that evaluates a query. `stylex.when` is relational selectors only (`ancestor`, `descendant`, `siblingBefore`, `siblingAfter`, `anySibling`), not conditions. The package declares `css-mediaquery` as a runtime dependency, but nothing under `lib/` references it — it is dead weight in the runtime; the media parsing all happens in the babel plugin.

**There is no established ecosystem convention either, and StyleX's own docs site is the evidence.** `packages/docs/src/components/sidebar.tsx` — a sidebar with a mobile breakpoint, the same problem Ultima is about to solve — writes the breakpoint twice, by hand, in two forms. Line 120 reads it at runtime with a third-party hook and a literal, `useMediaQuery('(width < 768px)')` from `fumadocs-core`; line 203 writes the matching StyleX condition independently as `'@media (max-width: 768px)'`. The same file uses `defineConsts` for animation durations, easings, and demo colors, and not for breakpoints. The maintainers hit this exact problem in their own product and duplicated the value.

**The convention for sharing one value between a media query and JavaScript** is therefore not a StyleX feature; it is the plain one: keep the query string in one `defineConsts` entry and hand the same string to whatever evaluates it. What makes this land cleanly here is a detail of Base UI's hook (section 8): it strips a leading `@media ` before calling `matchMedia`, so the *identical* string `'@media (min-width: 48rem)'` is both a valid StyleX at-rule key and a valid argument to the hook. One constant, two consumers, no second representation to keep in sync. That is the only place a compile-time breakpoint constant earns its keep over a literal — and note it does not require a *token*, only a shared module-level string.

### 8. Base UI's `unstable-use-media-query`

Read from `@base-ui/react` 1.8.0 as installed at `packages/ui/node_modules/@base-ui/react/unstable-use-media-query/`.

**API.** Verbatim from the shipped `index.d.ts`:

```ts
export declare function useMediaQuery(query: string, options: useMediaQuery.Options): boolean;
```

`options` is **required**, not optional — `useMediaQuery('(min-width: 48rem)')` is a type error and the call must pass at least `{}`. Four fields, all optional, with their shipped JSDoc:

| Field | Default | Purpose |
| --- | --- | --- |
| `defaultMatches` | `false` | "As `window.matchMedia()` is unavailable on the server, it returns a default matches during the first mount." |
| `matchMedia` | `window.matchMedia` when available, else `null` | "You can provide your own implementation of matchMedia. This can be used for handling an iframe content window." |
| `noSsr` | `false` | see below |
| `ssrMatchMedia` | `null` | "You can provide your own implementation of `matchMedia`, it's used when rendering server-side." |

The implementation's first act is `query = query.replace(/^@media( ?)/m, '');` — a leading `@media ` is accepted and stripped, which is the fact that lets one string serve both StyleX and the hook.

**What `unstable-` means.** Base UI publishes no versioning or stability policy: not in the docs' About or Releases pages, not in the README, not in any 1.x release body. The definitive statement is a maintainer review comment on the PR that introduced the prefix — "Added the unstable- prefix to NoSsr and useMediaQuery as they are not documented yet (and their API might change)." So: undocumented, and the API may change. There is no written semver carve-out.

The precedent is what should drive the decision. The prefix was introduced for *two* exports, `unstable-no-ssr` and `unstable-use-media-query`. `unstable-no-ssr` was **deleted outright** just before 1.0, with no CHANGELOG entry, no breaking-change label, and no major bump. `unstable-use-media-query` is the sole survivor and remains the **only** `unstable-`-prefixed export in the package. Against that: the API has not changed since 1.0.0 — eight minors — and 1.7.0 to 1.8.0 is byte-identical. It also has no docs page (`/react/utils/use-media-query` is a 404), no tests anywhere in the repo, and zero CHANGELOG mentions ever. It surfaces publicly only inside the Navigation Menu demo on base-ui.com, as `useMediaQuery('(min-width: 700px)', { defaultMatches: true })`.

**The SSR double render.** Documented only in the `noSsr` JSDoc, verbatim: "To perform the server-side hydration, the hook needs to render twice. A first time with `defaultMatches`, the value of the server, and a second time with the resolved value. This double pass rendering cycle comes with a drawback: it's slower."

The mechanism is `useSyncExternalStore` from `use-sync-external-store/shim` with an explicit server snapshot. With no options set, `getServerSnapshot` resolves to `() => defaultMatches`, so **the server render and the hydration render both return `defaultMatches`** — `false` by default, on every viewport — and the true value arrives on a second render after hydration. `ssrMatchMedia` replaces the constant with a server-side guess (UA parsing or client hints) so the two renders agree more often; `noSsr: true` reads real `matchMedia` on the first client render, correct immediately but a hydration mismatch against real server-rendered markup. Where `window.matchMedia` is missing (jsdom, or SSR) it degrades to a no-op subscription returning `defaultMatches`.

Two things that matter for Next.js App Router, which the spec lists as a supported target via `setup-next`:

- The published entry point carries **no `'use client'` directive** — `unstable-use-media-query/index.mjs` opens with `import * as React from 'react';`, while most of the package's files do carry it. The consumer's own file must declare `'use client'`. Base UI's own two internal callers both do.
- The double render means a component that picks its DOM structure from this hook renders the mobile branch (or whatever `defaultMatches` says) into the HTML, then swaps. For a Sidebar that is a visible layout flash on every first paint, not just a wasted render.

The hook is MUI's. `UseMediaQueryOptions` and its JSDoc are character-for-character identical to `packages/mui-system/src/useMediaQuery/useMediaQuery.ts`; Base UI dropped the theme integration and the React 17 fallback path. MUI's docs carry the SSR guidance Base UI's do not: "Server-side rendering and client-side media queries are fundamentally at odds. Be aware of the tradeoff. The support can only be partial. Try relying on client-side CSS media queries first."

### 9. The three shapes for a breakpoint in Ultima's token layer

Stated in this system's terms and not chosen. The Layers section defines two layers — palette scales as `defineConsts` and semantic tokens as `defineVars` — and the Token groups in v0 list splits exactly on whether a value reaches the CSS export. A breakpoint fits awkwardly into both, for the same reason: it is neither a color nor a value that appears in a declaration.

Both export questions were settled empirically, by copying `packages/tokens` to a scratch tree, adding a breakpoint group in each shape, and rerunning `scripts/build-tokens.ts` unmodified. The originals were untouched.

**(a) `defineConsts`, a compile-time constant.** Holds the whole at-rule string, `'@media (min-width: 48rem)'`, so it can be used as an at-rule key at all (section 4). Sits beside `easing`, `border`, and `z`, which is where the spec already puts compile-time-only groups. This is the shape StyleX documents for breakpoints.

- **Exports: neither.** The build ran clean and `grep` found the const breakpoints in neither `dist/tokens.css` nor `dist/tokens.json` — same as `easing`, `border`, and `z` today. No build-script change needed; nothing to explain in either published contract.
- Costs: the three from section 4 — silent dead CSS if the consts file misses the compile batch, loss of `lastMediaQueryWinsTransform`, and a priority of property+3000 that puts every responsive rule in a later cascade layer than the pseudo-class rules it should be losing to. The second is acknowledged upstream in a one-line aside and the third is not acknowledged anywhere.
- The ordering cost has a real mitigation, which the documented example itself uses: write mutually exclusive ranges by hand (`'@media (min-width: 48rem) and (max-width: 63.99rem)'`). That restores correctness and costs coupling — each breakpoint constant encodes its neighbour's boundary, so inserting a breakpoint means editing the one below it, in the token layer, in a value nothing currently tests.
- Gains: one string serves both the StyleX key and Base UI's hook (section 7), which is the only real argument for centralising it at all. Consumers writing their own StyleX can import it.
- Note that none of the gains require it to be a *token*. A module-level `const` in the component file, or a shared string in `packages/ui/src/lib/`, buys the same sharing without touching the token layer or either export — and the spec's naming grammar, which exists so StyleX emits custom property names verbatim, has nothing to say about a value that never becomes a custom property.

**(b) `defineVars`, a themeable token.** Holds the bare length, `'48rem'`, since the whole-at-rule form is the silent failure in section 5.

- **Exports: both.** The scratch build wrote `--ult-bp-md: 48rem;` into `dist/tokens.css` and an entry into `dist/tokens.json` with no build-script change. But look at what lands: the value is repeated in all four CSS blocks — `:root`, the `@media (prefers-color-scheme: light)` block, `[data-theme="dark"]`, and `[data-theme="light"]` — because the generator restates every token per mode, and a breakpoint has no mode. In JSON it gets the same treatment: `"dark": { "value": "48rem" }, "light": { "value": "48rem" }`. Both contracts would carry a value whose shape says "this varies by color mode" about something that does not.
- The decisive cost: **the token cannot be used for the thing it names.** Section 5 proves a custom property is invalid in a media feature at the CSS level, so `--ult-bp-md` can never appear in the query it exists to describe. The exported variable is documentation and a JS-readable number, not a usable value. Any actual media query would still be written literally somewhere, so the value would exist in two places with nothing enforcing they agree — the failure mode `build-tokens.ts` was written to prevent for colors.
- Gains: it is genuinely themeable, and it is the only shape that reaches `tokens.json`, which the spec describes as "for a tool or an agent that reasons about roles." A consumer could read the breakpoint without running StyleX.
- The one thing that would make this shape coherent is `@custom-media` (section 5), which lets a named breakpoint be used in a media condition. It is Chrome-, Edge-, Opera- and Safari-unimplemented and Firefox-pref-gated, so it is not a v0 option; but it is the direction CSS is going, and it is worth knowing that today's answer here is "not yet" rather than "never".

**(c) No token, breakpoint written literally at the use site.** The `'@media (min-width: 48rem)'` string appears as a literal at-rule key in the one or two components that need it.

- **Exports: neither**, and nothing to add to either contract.
- Gains: the only shape that keeps `lastMediaQueryWinsTransform`, so the compiler's own overlap handling stays intact and breakpoint order is guaranteed by construction. Priority stays at property+200 rather than property+3000, so a responsive rule sits in the same cascade layer as its siblings instead of jumping to a later one. No cross-package compile-batch dependency, so no silent-dead-CSS mode. No naming grammar to invent — the spec's grammar is `--ult-<group>-<name>` for things that are custom properties, and a breakpoint under shape (a) or (c) is not one.
- Not a gain: a media query still outranks `:hover` and `:focus-visible` in this shape too (section 2). That trap is a property of at-rule keys generally and is fixed by nesting the pseudo-class inside the query, not by choosing among these three shapes.
- Costs: the value is repeated at each use site, and nothing shares it with a runtime read, so a Sidebar that also calls `useMediaQuery` would restate the string. That cost is bounded by how many places actually need it — today, zero components write any at-rule, and the spec's Sidebar requirement is a single desktop/mobile split.

One fact that cuts across all three: Ultima's current streak is not "no `@media` in components" as an accident of scope. Motion tokens collapse to `1ms` under `prefers-reduced-motion` precisely so components never write the query, and the mechanism that makes that work — an at-rule condition inside a `defineVars` *value* — is available for any token, not just motion. It is not available for a breakpoint, because a breakpoint is not a value that appears in a declaration; it is the condition itself. That asymmetry is why the reduced-motion pattern does not generalise here, and it is the real reason Sidebar breaks the streak.

## Sources

Everything under "run in this repo" was executed against `@stylexjs/babel-plugin` 0.19.0 and `@stylexjs/stylex` 0.19.0 as installed here, via `@babel/core` + `@babel/preset-typescript` + `styleXPlugin.withOptions(stylexOptions({ dev: false }))`, mirroring `packages/tokens/scripts/build-tokens.ts`. Scratch files were removed after the runs.

### Run in this repo

- Compiler harness over `stylex.create` with at-rule keys: established that a top-level at-rule key throws `Invalid pseudo or at-rule.`; that media queries nest inside media, pseudo-class, and `:is([data-*])`; that classes are repeated per nesting level; and the exact priority numbers 3000 / 3130 / 3200 / 3240 / 3330 / 3400.
- Same harness, `defineConsts` at-rule cases: `'@media (min-width: ' + bp.md + ')'` and `` `@media (min-width: ${bp.md})` `` both throw `Invalid media query syntax.`; a const holding the whole at-rule string compiles to correct CSS via a `var(--key){...}` placeholder at priority property+3000.
- Same harness, consumer file compiled alone: emitted `var(--x18f94kt){.xp1xyym.xp1xyym{color:blue}}` into `@layer priority2` with no error — the silent-dead-CSS mode.
- Same harness, breakpoint ordering: literal queries emit `@media (min-width: 48rem) and (max-width: 63.99rem)` and `@media not all`, proving `lastMediaQueryWinsTransform` makes ranges disjoint; const-keyed queries stay overlapping and emit the 64rem rule before the 48rem rule, producing the wrong value above 64rem.
- Same harness, `defineVars` at-rule cases: interpolation and a literal `var()` in the condition both throw `Invalid media query syntax.`; a `defineVars` value holding the whole at-rule string emits both an unsubstituted `var(--ult-bp-md-query){...}` rule and a `--ult-bp-md-query:@media (min-width: 48rem);` declaration in `:root`.
- Same harness, `@supports` / `@media` / `@container` with `useCSSLayers: true`: every at-rule emitted inside `@layer priorityN{...}`; `@supports` nested inside `@media` emits as `@supports{@media{...}}`.
- Same harness, two overlapping `@container` queries on one property: no range rewriting, equal priority 1300, and the wider query emitted first — the same ordering bug as const-keyed media queries, reachable from plain literal source.
- Same harness, pseudo-class spellings on one property: `':focus-visible'` and `':focus-within'` take the `?? 40` fallback (3040) because `PSEUDO_CLASS_PRIORITIES` spells them `':focusVisible'` and `':focusWithin'`; the camelCase form emits the invalid selector `.x1wu1lby:focusVisible{...}` at 3160.
- Same harness run twice with `enableMediaQueryOrder` explicitly `true` then `false`: the template-literal const form throws `Invalid media query syntax.` under `true` and compiles under `false` to `@media (min-width: var(--x8h0yw)){...}` at priority 3200, substituted by `processStylexRules` to correct final CSS — establishing that the interpolated form is blocked only by the validator, and that it keeps the normal `@media` priority the whole-string const form loses.
- `packages/tokens` copied to a scratch tree and `scripts/build-tokens.ts` rerun unmodified with a breakpoint group added in each shape: `defineVars` breakpoints appear in `dist/tokens.css` at four sites (`:root`, the light media block, and both `[data-theme]` blocks) and in `dist/tokens.json` with identical `dark` and `light` values; `defineConsts` breakpoints appear in neither.
- `node -e` over `@stylexjs/stylex/lib/cjs/stylex.js`: the full runtime export list; `stylex.when` keys are `ancestor descendant siblingBefore siblingAfter anySibling`; `css-mediaquery` is declared in `dependencies` but referenced nowhere under `lib/`.

### Installed source read directly

- `node_modules/.pnpm/@stylexjs+babel-plugin@0.19.0/.../lib/index.js:336` — `enableMediaQueryOrder: true` in the plugin defaults; `:423` reads it from options with a `true` fallback; `:4980` gates `lastMediaQueryWinsTransform` on it.
- Same file `:1095` — the `container` shorthand expands to `container` / `containerName` / `containerType`.
- Same file `:3453`-`3461` — `validateMediaQuery` throws `MediaQueryErrors.SYNTAX_ERROR` when `MediaQuery.parser.parseToEnd(input)` fails; `:3092` defines the message as `'Invalid media query syntax.'`.
- Same file `:4558` (`PSEUDO_CLASS_PRIORITIES`), `:4613` (`AT_RULE_PRIORITIES` = `@supports` 30, `@media` 200, `@container` 300), `:4618` (`PSEUDO_ELEMENT_PRIORITY` 5000), `:4636` (`getAtRulePriority`), `:4694` (`getPriority`, with the fall-through `return 3000` that inflates const placeholders).
- Same file `:4769` — the priority sum over property key, pseudos, at-rules, and const rules.
- Same file `:4977` — `flattenRawStyleObject` rethrows any `lastMediaQueryWinsTransform` failure as `INVALID_MEDIA_QUERY_SYNTAX`.
- Same file `:5488` — `defineConsts` key naming: a `--`-prefixed key is used verbatim (`key.slice(2)`), otherwise hashed.
- Same file `:9443`-`9505` — `processStylexRules` splits constant from non-constant rules, builds `constsMap` from `constKey`/`constVal`, and `replaceAll`s `var(--key)` in every rule; `if (refValue == null) continue;` is the silent no-op.
- Same file `:9476`-`9494` — the equal-priority tiebreak: `localeCompare` on the declaration text, then on the whole rule.
- Same file `:9498` — layer grouping is `Math.floor(priority / 1000)`; `:9545` — `@layer priorityN{...}` wraps whatever the rule text is, at-rules included.
- `packages/ui/node_modules/@base-ui/react/unstable-use-media-query/index.d.ts` and `index.mjs` — the signature with required `options`, all four option fields and their JSDoc, the `query.replace(/^@media( ?)/m, '')` strip, and the `useSyncExternalStore` + `getServerSnapshot` mechanism. `index.mjs` has no `'use client'`.
- `packages/ui/node_modules/@base-ui/react/package.json` — `./unstable-use-media-query` is the only `unstable-`-prefixed export subpath in 1.8.0.
- `node_modules/.pnpm/@stylexjs+stylex@0.19.0/.../package.json` — dependencies are `css-mediaquery`, `invariant`, `styleq`.

### Repo files

- `stylex.options.ts` — `useCSSLayers: true`, `runtimeInjection: false`, `unstable_moduleResolution: { type: 'commonJS', rootDir }`, shared by every compile path.
- `apps/docs/vite.config.ts`, `packages/ui/vitest.config.ts`, `apps/docs/vitest.config.ts` — all three call `stylexOptions()`, so `useCSSLayers: true` is on in the build and in both browser test suites.
- `packages/tokens/scripts/build-tokens.ts` — the working compiler invocation this research copied; `collect()` fails the build on any `@media` condition in the token source it does not recognise, and `readTokenSource()` reads members only from `defineVars` calls, which is why `defineConsts` groups reach neither export.
- `packages/tokens/src/tokens.stylex.ts` — the `LIGHT` and `REDUCED_MOTION` at-rule constants used as `defineVars` value keys; `motion` durations collapsing to `1ms`; `easing`, `border`, `z` as `defineConsts`.
- `packages/tokens/dist/tokens.css`, `dist/tokens.json` — the two published contracts and the four-block CSS shape.
- `packages/ui/src`, `apps/docs/src` — grep confirms no `@media`, `@container`, `@supports`, `matchMedia`, `innerWidth`, or `ResizeObserver` anywhere in component or site source today.
- `docs/spec/ultima.md` — "Layers" (two token layers), "Naming grammar" (`--ult-<group>-<name>`, keys written as custom property names so StyleX emits them verbatim), "Token groups in v0" (the themeable/compile-time split, and why motion durations moved), "Tokens CSS export" and "Tokens JSON export" (the two contracts and their shape), "State styling" (pseudo-classes and `:is([data-*])` inside the value, `className` function form never used), "What a component may assume about the consumer's CSS" (nothing; StyleX rules sit in a layer), "Variants, sizes, and tones" (the local-custom-property route closed by #1611), and the Docs site section (Sidebar needs collapsible desktop navigation and a mobile drawer).
- `docs/research/2026-09-08-stylex-capabilities.md` — the versions, the `defineConsts`/`defineVars`/`createTheme` stack, the `useCSSLayers` priority scheme, and the open-issue list this note builds on rather than repeats.

### StyleX documentation and specs

- https://stylexjs.com/docs/learn/styling-ui/defining-styles/ (source `packages/docs/content/docs/learn/styling-ui/defining-styles.mdx` at tag 0.19.0) — "Media queries (and other `@` rules)" and "Combining conditions": at-rule keys inside a property value, "Your Style Values can be nested more than one level deep when you need to combine Media Queries and Pseudo Selectors", and the callout that `default` is required for contextual styles. States no nesting depth limit; the unused `ILLEGAL_NESTED_PSEUDO` message in `shared/messages.js` is referenced only by a negative test assertion and never thrown.
- https://stylexjs.com/docs/api/javascript/defineConsts/ — "Media queries" listed first among the common use cases; the `breakpoints` example storing whole at-rule strings and using them as computed keys; and the aside "_Note: `defineConsts` does not currently have `enableMediaQueryOrder` config support._" The example's own `medium` value writes a disjoint range by hand.
- https://github.com/facebook/stylex/issues/238 — the closed RFC behind `defineConsts` for media queries: "the media queries variables would be inlined with the actual value"; "Unlike CSS variables, the value of a custom at-rule needs to remain constant and cannot be overridden in a theme."
- https://stylexjs.com/blog/v0.15.0/ and the 0.15.0 CHANGELOG entry — `enableMediaQueryOrder` introduced behind a flag, with the before/after showing `(max-width: 1440px)` rewritten to `(max-width: 1440px) and (min-width: 1024.01px)`.
- CHANGELOG 0.16.3 "Turn `enableMediaQueryOrder` on by default", and https://stylexjs.com/blog/v0.17.1/ — "This config ensures that authored media query order is respected, with later queries taking precedence over earlier ones." The option is absent from https://stylexjs.com/docs/api/configuration/babel-plugin/.
- Container queries: the docs content tree and the CHANGELOG at tag 0.19.0 contain no mention of `@container`, `containerName`, `containerType`, or any container API. The only first-party acknowledgements are https://stylexjs.com/llm/stylex-authoring.md ("Other supported @-rules include `@supports` and `@container` queries.") and the ESLint plugin's at-rule allowlist `makeRegExRule(/^@container/, 'a media query')`. Priority-300 handling is already present in `@stylexjs/shared` 0.3.0.
- https://www.w3.org/TR/css-variables-1/#using-variables — "The `var()` function can not be used as property names, selectors, or anything else besides property values." §2.2 defers non-property contexts to their own specs, and the media-queries specs define no substitution.
- https://www.w3.org/TR/mediaqueries-5/#custom-mq — `@custom-media`, the editing-hazard motivation, the boolean-context restriction, and "evaluated logically, not treated as a textual substitution".
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@custom-media and the MDN compat data — Chrome/Edge/Opera and Safari/iOS `false` with open tracking bugs; Firefox 148 behind `layout.css.custom-media.enabled`; Experimental, Limited availability.
- `packages/docs/src/components/sidebar.tsx` at tag 0.19.0 — StyleX's own docs sidebar writes its breakpoint twice: `useMediaQuery('(width < 768px)')` from `fumadocs-core` at line 120, and `'@media (max-width: 768px)'` as a StyleX condition at line 203. The file uses `defineConsts` for durations, easings, and demo colors, not for breakpoints.

### External

- https://github.com/facebook/stylex/issues/1497 — `defineConsts` files not yet processed breaking CSS generation; the documented shape of the silent-substitution failure.
- https://github.com/facebook/stylex/issues/1859 and https://github.com/facebook/stylex/issues/1860 — open output bugs in `lastMediaQueryWinsTransform`: a strict media range losing its excluded boundary in unplugin/Vite production CSS, and mixed responsive/print values emitting a non-matching nested media-type condition (filed against 0.19.0).
- https://github.com/facebook/stylex/issues/1611 — `create` rules that set custom properties escape `@layer`; already load-bearing in the spec's variant-table decision, and confirmed here not to affect at-rule keys.
- https://github.com/mui/base-ui/pull/870 — the PR that added the `unstable-` prefix to `useMediaQuery` and `NoSsr`, with the maintainer comment "Added the unstable- prefix to NoSsr and useMediaQuery as they are not documented yet (and their API might change)."
- https://github.com/mui/base-ui/pull/3398 — `unstable-no-ssr` deleted before 1.0 with no CHANGELOG entry: the precedent for how Base UI treats an `unstable-` export.
- https://base-ui.com/react/components/navigation-menu — the only public appearance of the hook, in the nested-inline demo.
- https://mui.com/material-ui/react-use-media-query/ — the SSR guidance Base UI does not ship, for the hook Base UI copied: "Server-side rendering and client-side media queries are fundamentally at odds."
