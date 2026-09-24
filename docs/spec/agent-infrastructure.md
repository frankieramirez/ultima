# Agent infrastructure

This document holds the contributor-infrastructure decisions from [Map: Make Ultima efficient and verifiable for agents](https://github.com/frankieramirez/ultima/issues/435). It specifies work for a later build effort. The checks and commands described below are not implemented by this document.

Public component APIs and copy-source installation contracts stay unchanged. The [Ultima principles](ultima.md#principles), per-component contracts and ADR amendments remain authoritative. This document owns how contributor tooling enforces them.

## Architectural checks

Decided on [Architectural checks: coverage, exceptions, and repair diagnostics](https://github.com/frankieramirez/ultima/issues/436).

### Engine and command

Implement a repository-owned checker using the existing TypeScript compiler API. Parse TypeScript and TSX through syntax trees, resolve import symbols and aliases, and use the type checker for public prop contracts. Do not add ESLint solely to host these rules or extend the existing source-text scanners into another parser.

The entry point is `scripts/check-architecture.ts`, exposed as `pnpm check:architecture`. Rule implementations live in the private workspace package `packages/analysis` (`@ultima/analysis`), with fixtures under `packages/analysis/fixtures/` kept out of its typecheck, so the [consumer CLI](ultima.md#package-and-engine) imports the same engine through a consumer scope. Rules read files only through a scope object and never name workspace paths or aliases directly. Placed on [Where the CLI lives in the workspace and what it consumes from the contributor engine](https://github.com/frankieramirez/ultima/issues/476). This is a static check: it requires the installed workspace dependencies, but no browser, running server, generated registry, or docs build. Use the repository's supported Node runtime and TypeScript execution convention.

The default run examines all authored files in scope. Provide `--format text` and `--format json`; both represent the same diagnostics. Exit 0 means the run completed with no blocking findings, 1 means architectural violations, and 2 means invalid invocation or an incomplete run such as unreadable source, invalid configuration or parser failure. Advisory findings may accompany exit 0. Output must distinguish advisories from blocking findings and list unsupported analysis explicitly. A run with both an established violation and an incomplete analysis exits 1 and still lists what it could not analyze, the precedence the consumer CLI uses; a rule family not yet delivered is listed as unsupported rather than counted as a pass.

Changed-file selection and aggregate verification results belong to the [Verification CLI](#verification-cli); production-browser orchestration belongs to [Production browser verification](#production-browser-verification). This checker supplies the full static check they can invoke.

### Authority and source scopes

Maintain an explicit inventory of production React components and helpers, element sources, token sources, docs application code, demos/content, and build tooling. Derive membership from existing file conventions and metadata until the component-metadata decision supplies its adapter. Do not create a competing component catalogue here. Fail on an unclassified new production source file rather than silently omitting it.

Test fixtures, generated output and vendored dependencies are separate scopes. Deliberately invalid checker fixtures must never enter production discovery or ordinary package typechecking. Test-only raw values and parity tests reading another target's source do not violate production rules. Such scope exclusions are structural and documented; they are not exceptions for a production file.

Check executable JSX in MDX using the existing MDX parser pipeline, retaining locations in the original document. Markdown fences and printed source are examples, not executed controls. Demos keep their distinct role: native form elements and layout may be necessary to demonstrate composition. They still obey applicable dependency and API rules. The docs-chrome control rule does not blanket-ban native elements in demos.

The specification and ADR amendments decide whether a pattern is permitted. Existing code is evidence to inspect, not permission to allow every pattern it contains. Forge is procedural guidance and must not override a newer component contract, such as Avatar's supported `keepMounted` behavior or the bounded Zag React integrations.

### Rule catalogue

Rule IDs are stable strings. Their wording may improve without changing the ID. A change in meaning requires a documented scope change and updated fixtures.

| ID | Scope | Blocking contract |
| --- | --- | --- |
| `ULT-TOKEN-001` | React and element component declarations | Design values use the allowed semantic token or compile-time constant source. Reject raw design values, invented token names, palette reads, and aliases that hide a token value. Apply the value policy below. |
| `ULT-STYLE-001` | Production components and docs styling | StyleX remains the styling engine. Reject imports of alternative styling engines, injected authored stylesheets used to bypass the contract, and undeclared inline design styles. Respect existing docs global styles, theme application and runtime style contracts. |
| `ULT-PRIMITIVE-001` | Production React and element components | Enforce the primitive source by target and component contract. React uses Base UI with the ADR 0002 Zag allowance; elements use their ADR 0008 layer and stay React-free. |
| `ULT-API-001` | Public React wrappers and styled parts | Forbid public `className` and native React `CSSProperties` as styling escape hatches; require the declared StyleX style slot. Verify documented `render`/`ref` capabilities by part category and detect `any` or index-signature escapes that defeat these checks. |
| `ULT-API-002` | Code consuming the caller's StyleX slot | Merge the caller's slot last in the StyleX composition. Detect a later spread or class assignment that discards the result. Preserve primitive prop-getter and documented runtime-style merges. |
| `ULT-DOCS-001` | Docs application layout and chrome | Enforce the existing surface and scrollbar policy through syntax analysis, with declaration-scoped exceptions replacing whole-file exemptions. |
| `ULT-DOCS-002` | Docs application layout and chrome, including executable page JSX | Reject direct native interactive controls that replace the kit's controls, and explicit interactive-role substitutes. Preserve semantic markup and supported composition through `render`. |
| `ULT-IMPORT-001` | Production workspace imports and re-exports | Enforce dependency direction, staged module paths and declared component composition. Resolve aliases and relative paths before classifying the target. |
| `ULT-REGISTRY-001` | Authored source and registry metadata | Detect missing or stale item metadata, missing staged dependencies, and source/item shape mismatches before the registry build. Reuse the builder's source inventory and dependency logic. |
| `ULT-SOURCE-001` | Component source layout | Enforce one source file per component, the React client directive, module-scope StyleX tables, and test placement under the package's `src/__tests__/`. Reject incomplete scaffold markers. Respect element file conventions and documented helper modules. |
| `ULT-EXCEPTION-001` | Checker configuration | Reject malformed, broad, stale, duplicate or unmatched exception entries and invalid authority links. |
| `ULT-ANALYSIS-001` | Expressions relevant to a blocking rule | Report constructs the checker cannot resolve; do not interpret an unresolved spread, computed property or dependency as a successful check. |

The first implementation covers every family in this table. Rule internals may land in separate build slices, each cleaning and validating its own scope before becoming blocking. Heuristic interaction findings use a distinct advisory ID, `ULT-DOCS-REVIEW-001`; they do not pretend to prove that arbitrary application code implements a widget.

### Values and runtime styles

`ULT-TOKEN-001` classifies declarations by property and expression provenance. It does not reject every number or string.

- Colors, typography scales, design spacing, radii, shadows, motion timing and stacking levels use their declared semantic groups or compile-time constants. Validate the token key against the actual source group. A token-containing expression must still reject an added undeclared design literal, such as a pixel offset hidden inside `calc()`.
- Structural CSS has an explicit property-specific grammar: keywords such as `none`, `auto`, `inherit` and `transparent`; zero resets; layout fractions and percentages; and unitless values such as opacity or flex factors in their appropriate properties. `fontSize: '100%'` is not automatically allowed because `width: '100%'` is structural. The initial rule implementation must document and fixture-test the grammar rather than use a global number/string allowlist.
- SVG path and view-box geometry, glyph `1em` sizing and `currentColor`, and the specified overlay scale/opacity recipe are valid in those contexts. A number allowed inside SVG geometry does not authorize the same number as component padding.
- Permit direct semantic token reads and supported token-based calculations. Distinguish imported group names from local aliases of a token value. Follow symbols so renaming the StyleX import cannot bypass analysis.
- Primitive-owned variables and component runtime variables are permitted where the owning contract names their purpose. Validate their location and property instead of accepting every `var(...)` expression. Preserve Toast's geometry, primitive anchor/panel measurements, and other documented dynamic styles.
- Media conditions are a different syntactic context from declarations. Preserve the named breakpoint constant pattern and the documented reduced-motion handling for loops. Preserve Drawer Backdrop's zero transition while swiping and Navigation Menu Positioner's instant-state cancellation from [State styling](ultima.md#state-styling). New exceptions require an owning decision rather than copying those allowances elsewhere.
- A runtime inline value such as Aspect Ratio's `ratio` or an indicator's measured width is allowed only on the documented property and part. Preserve any style injected by StyleX or a primitive when merging it. Arbitrary inline colors and lengths remain violations.

The initial grammar uses these categories:

| Category | Allowed literal forms |
| --- | --- |
| Enumerated CSS behavior | Valid property keywords for display, positioning, alignment, overflow, appearance, borders, cursor, selection and similar non-scale behavior; CSS-wide keywords remain property-checked. |
| Reset or absence | Zero lengths where CSS accepts them, including unit-bearing zero fallbacks in primitive measurements; `none` and `transparent` where they remove a property. This does not permit a zero transition duration outside its explicit contract. |
| Structural layout | Percentages and viewport-relative bounds on box dimensions, insets and translations; grid line/count numbers and fractional tracks; unitless flex factors and layout ordering. Fixed design offsets in those expressions still require tokens. |
| Unitless visual behavior | Opacity in its valid range, and the documented scale, rotation and animation-iteration behavior. Typography numbers such as font weight and line height remain token-governed. |
| Local layering | Local `zIndex` 0/1 for a component's own positioned parts, separate from popup/toast layer values; Toast's specified intra-stack arithmetic. Cross-component or portal stacking still reads the declared `z` constants. |
| Glyph geometry | SVG geometry and `1em` dimensions in a glyph or glyph-only slot, with inherited color. A component's general layout does not inherit this permission. |

The checker must reject an unknown declaration category with an analysis diagnostic until its policy is classified. Nonzero absolute lengths, font-relative design spacing, literal colors, durations and font scales cannot become structural merely by moving them into a local constant. Local expressions combining token reads with runtime geometry can be analyzed recursively; a direct alias of a token value remains prohibited by the source convention. The build slice records the inventory and exact accepted expressions as fixtures before enabling the rule.

StyleX `create` and `keyframes` declarations are both in scope. Analyze nested selectors and conditions, aliased calls, statically resolvable object spreads and computed keys. Unsupported computed code at a checked declaration produces `ULT-ANALYSIS-001` with the expression location and a supported alternative. This failure means the checker could not establish the contract, not that it proved the value is wrong. A rule-relevant parse failure makes the run incomplete.

### Value grammar

The grammar `ULT-TOKEN-001` applies, as delivered on [Enforce token and styling contracts](https://github.com/frankieramirez/ultima/issues/454). It lives in `packages/analysis/src/grammar.ts`, and its fixtures under `packages/analysis/fixtures/tokens/`. Every checked property maps to one category; a property with no category is an `ULT-ANALYSIS-001` finding until it is classified here and in the grammar. A value is evaluated into literal text, token reads, runtime values and keyframes references, through local constants, template literals, conditionals, `stylex.firstThatWorks`, statically resolvable spreads and computed keys. Literal text is tokenized as CSS and each piece is judged by the category of the property or of the function it sits in. The CSS-wide keywords are accepted everywhere, and a CSS named color, a hex color or a color function is rejected everywhere.

| Category | Properties | Accepted |
| --- | --- | --- |
| `color` | `color`, `backgroundColor`, the border and outline colors, `caretColor`, `accentColor` and similar | `color` tokens, `transparent`, `currentColor` |
| `paint` | `fill`, `stroke` | as `color`, plus `none` |
| `length` | box dimensions, insets, padding, margin, gaps, `flexBasis`, `textUnderlineOffset` | `space` tokens and `border` constants, zero, percentages, viewport units, `auto`, `none` and the content-sizing keywords, `fit-content()` |
| `radius` | `borderRadius` and its corners | `radius` tokens, zero |
| `border-width` | border and outline widths | `border` constants, zero |
| `outline-offset` | `outlineOffset` | `border` constants, zero |
| `border` | `border`, `outline` and the side shorthands | `border` constants, `color` tokens, zero, line-style keywords |
| `shadow` | `boxShadow`, `textShadow` | `shadow` tokens; a ring from zero, `border` constants and `color` tokens; `none`, `inset` |
| `font-size` | `fontSize` | `text` tokens |
| `font-weight` | `fontWeight` | font weight tokens |
| `line-height` | `lineHeight` | font leading tokens, `normal` |
| `letter-spacing` | `letterSpacing`, `wordSpacing` | font tracking tokens, zero, `normal` |
| `font-family` | `fontFamily` | `--ult-font-sans`, `--ult-font-mono` |
| `duration` | `transitionDuration`, `animationDuration` | `motion` tokens; never a literal, and never zero outside a typed exception naming its contract |
| `delay` | `transitionDelay`, `animationDelay` | `motion` tokens, zero |
| `easing` | the timing functions | `easing` constants, `linear` |
| `z-index` | `zIndex` | `z` constants, a local `0` or `1`, `auto` |
| `opacity` | `opacity` and the SVG opacities | a unitless number from 0 to 1 |
| `transform` | `transform` | `none`, and the functions below |
| `translation` | `translate`, `translate*()`, `inset()` | `space` tokens and `border` constants, zero, percentages |
| `scale` | `scale`, `scale*()` | unitless factors |
| `angle` | `rotate`, `rotate*()`, `skew*()` | angles, zero |
| `origin` | `transformOrigin`, the background and object positions | position keywords, zero, percentages, `space` tokens |
| `filter` | `filter`, `backdropFilter` | `filter` tokens, `none` |
| `keyword` | display, positioning, alignment, overflow, appearance, cursor, selection, text behavior, line styles, `transitionProperty` and similar enumerated behavior | any keyword and string; a runtime value, because the property takes nothing a design value could hide in |
| `content` | `content` | strings, keywords, `attr()` |
| `count` | `flexGrow`, `flexShrink`, `order`, `animationIterationCount`, line clamps | unitless numbers, keywords |
| `flex` | `flex` | unitless factors, zero, percentages, `space` tokens, sizing keywords |
| `grid-template` | the grid template and auto track properties | `fr`, percentages, zero, unitless counts, keywords, strings, `space` tokens, `repeat()`, `minmax()` |
| `grid-placement` | `gridColumn`, `gridRow`, `gridArea` and their lines | line numbers, spans, keywords |
| `aspect-ratio` | `aspectRatio` | unitless ratios, `auto`, a runtime value |
| `animation-name` | `animationName` | a `stylex.keyframes` binding in the same file, `none` |
| `image` | `backgroundImage`, `maskImage` | `none`, and gradients |
| `gradient` | the arguments of a gradient | `color` tokens, direction keywords, zero, percentages, angles |
| `clip` | `clipPath`, `clip` | `none`, `auto`, zero, and `inset()` or `rect()` as `translation` |
| `custom-property` | a `--*` declaration | any semantic token or constant, a runtime variable its policy places here, zero, percentages, keywords |

Inside `calc()`, `min()`, `max()` and `clamp()`, a unitless number in a dimensioned category only scales a token or a runtime value, so `calc(2 * ${space['--ult-space-2']})` passes and `calc(${space['--ult-space-4']} + 2px)` fails at the `2px`. In a unitless category, such as `z-index`, the numbers stay checked. Two contexts carry their own geometry. A glyph box, a namespace applied to an inline `<svg>` or one sized `1em` by `1em`, may use `1em` on its dimensions, following Iconography. The clip-hidden recipe, a declaration block that clips with `inset(50%)`, may use its `1px` box and `-1px` margin, following Live regions. Neither permission reaches another declaration.

A token read is checked against the group the import resolves to through the scope: the key must exist in that group, the group must not be a palette scale, and the token's family must be one the category accepts. A local constant holding nothing but one token read is an alias that hides the token value and fails at its use; a constant that combines token reads with other terms is evaluated. A `var(--*)` read of a variable that is not a token must name a runtime variable in the policy (`RUNTIME_VARIABLES` in `packages/analysis/src/policy.ts`), which records the variable's writer, the registry items that may read it, the categories it may feed and its authority. A parameter of a dynamic style, or any other value computed at run time, passes only where its category accepts runtime values, or where a unit shows its category: `${x}%` is a percentage.

`ULT-STYLE-001` judges inline styles with the same grammar. An inline style must be the `style` that `stylex.props` or `stylex.attrs` returned, passed through, or declarations whose values pass the grammar without a token read, such as Aspect Ratio's `ratio` or a measured percentage. A token read inline is a design style and belongs in a table. A custom property set inline may bridge a primitive's variables. `style` on an Ultima component is the StyleX slot and is not an inline style. Stylesheet imports are limited to the docs global stylesheet from the docs entry modules, and runtime stylesheet injection is rejected.

The repository's remaining sites are typed exceptions in `packages/analysis/exceptions.ts`, each naming its part, property, condition and, where it has one, its exact value: the Drawer and Navigation Menu zero durations, Toast's intra-stack `z-index`, Avatar's container-query initials, Native Select's chevron room, Color Field's hue, area and swatch paints, and the Theme Studio preview's draft variables.

### Target and API distinctions

Read the bounded React Zag allowance from ADR 0002 and the per-component contracts. Calendar, Date Picker and Resizable are existing cases; do not allow arbitrary future Zag usage simply because the package is installed. Element production code cannot import React or Base UI. Recipe engines permitted by ADR 0007 belong in recipe/demo scope and must not become hidden component dependencies. Installed registry components cannot import an icon package where the contract requires private glyphs.

Public API checking operates on resolved types and the category of each exported part. Hooks, namespaces, plain slots, styled wrappers, and unchanged primitive pass-throughs are different categories. Unstyled primitive exports retain the primitive contract; the checker must not wrap or rewrite them just to make every exported value look alike. Zag prop-getter components retain their documented fixed-element and `render` differences. Internal `className` produced by StyleX or a primitive is permitted. The delivered rule reads a part's category from the element that receives its merged caller slot: a Base UI part is a styled wrapper, `useRender` a plain root, a native element a plain slot and a Zag `mergeProps` a Zag part. It requires `ref` where the part renders its own element and `render` where Base UI or `useRender` honours it, and rejects `render` on a fixed element, where the prop would reach the DOM and do nothing. A part re-exported from another item is checked in that item's file.

Use compile-time positive and negative assignments to prove public prop restrictions. A test that runs a no-op type assertion in a browser does not establish a compiler failure. The checker tests must show that an invalid consumer program actually receives the expected TypeScript diagnostic and a valid one compiles.

Syntax checks establish caller-slot placement for supported composition forms. Existing browser tests remain responsible for override behavior in the rendered cascade, focus management, keyboard handling, and CSS a primitive reads. Retain and reuse the element parity gate, including its declared Base UI-to-Zag state mapping and negative tests. This checker does not replace that mapping with identical attribute names.

### Docs controls and surfaces

Port the existing docs surface checks to the syntax engine. Cover backgrounds, border colors/widths/radii, shadows, and the existing scrollbar restriction, including static spreads and computed keys. Preserve the specification's distinction between page layout and painted component surfaces. Ordinary layout scrolling does not require Scroll Area in every case.

For direct controls, block native `button`, `input`, `select`, `textarea`, `option` and `summary` elements used as application controls outside declared composition cases. Block native elements assigned explicit interactive roles such as `button`, `switch`, `checkbox` or `tab` when they stand in for the kit. Ordinary anchors, headings, labels, forms, tables of prose, and layout containers are not controls solely because their tags can carry events or receive focus. Existing painted-table and component-contract rules still apply independently.

Resolve imported component identities when allowing `render` composition. A native element handed to a supported Ultima component must retain the component's behavior and styles; putting arbitrary JSX inside a prop named `render` is not proof. Ambiguous handler-driven widgets get an advisory with the owning rule and a review question. The diagnostic must explain which behavior static analysis cannot establish.

Inventory the current file-wide exemptions in `surfaces.test.ts`. For each matched declaration, either remove the duplication, encode an existing specification-backed exception, or obtain a new decision. Do not automatically convert every line of an exempt file into approved code. Legitimate Swatch painting, Studio chrome and specimen presentation must remain functional while their precise scopes are recorded.

Delivered on [Enforce docs controls and surface rules](https://github.com/frankieramirez/ultima/issues/455), in `packages/analysis/src/rules/docs.ts`:

- **Scope.** Docs chrome (`apps/docs/src` outside `demos/`) and executable MDX pages. Demos, tests and generated wiring are separate scopes.
- **`ULT-DOCS-001`** reads every StyleX `create` and `keyframes` declaration through the shared walker in `packages/analysis/src/stylex.ts`, the one `ULT-TOKEN-001` uses. That covers any import spelling, dynamic style functions, pseudo-class and at-rule blocks, condition objects, local const spreads and computed keys, including a condition key read from another module's exported `defineConsts` group, such as the docs `breakpoints`. It reports each painting branch of a condition object with its condition. It rejects `background`, `backgroundColor`, `backgroundImage`, `boxShadow`, every `border*` property except the `*Style` ones, `borderCollapse` and `borderSpacing`, `scrollbarWidth`, `scrollbarColor` and a `::-webkit-scrollbar` block. A value that removes the property is not paint: `0`, `0px`, `none`, `transparent` or `null`, and for the scrollbar properties only `auto`. A spread or computed key the checker cannot follow is `ULT-ANALYSIS-001`. `overflow` is page layout and is never read.
- **`ULT-DOCS-002`** rejects a native `button`, `input`, `select`, `textarea`, `option` or `summary`, in JSX, in `createElement` or on an MDX page, and a plain element carrying an ARIA widget role. A native element handed to a component through `render` passes only when that component's import resolves to an Ultima component source, directly or through the generated barrel. A computed `role` is `ULT-ANALYSIS-001`.
- **`ULT-DOCS-REVIEW-001`** is advisory. It asks about a plain element other than `a`, `label` or `form` that carries a pointer or key handler or a non-negative `tabIndex`.
- **Exceptions.** Each recorded branch is one typed entry that also pins its `selector` and `expression`, linked to [Painted declarations the docs keeps](ultima.md#painted-declarations-the-docs-keeps).
- **Comparison with the old scanner.** `packages/analysis/src/__tests__/docs.test.ts` runs the retired scanner, kept verbatim as an oracle, beside the new rule. Counted one per declaration, as the old scanner counts, the repository results differ in two ways: seven resets the old scanner counted as paint, and one `backgroundImage` it could not see. On the retired test's own cases they agree exactly. The old scanner misses every spelling in the invalid fixture, because it reads the literal text `stylex.create(`. The extra coverage is `backgroundImage`, border shorthands, `scrollbarColor`, the scrollbar pseudo-element, `keyframes`, renamed imports, spreads, computed keys and MDX pages.

### Import and registry boundaries

Token production sources cannot depend on UI, elements, docs or repository build scripts. UI production sources may depend on tokens, declared helpers and approved runtime packages. Element production sources may depend on tokens, element helpers and their approved runtime packages. Neither target may import docs, test fixtures or build tooling. Docs and build/test tooling may depend on the lower layers for their stated jobs, including parity tests reading both render targets.

Analyze static imports, export-from declarations and statically resolvable dynamic imports. A nonliteral dynamic import in staged component code must produce an analysis error because installation dependencies cannot be established. Resolve workspace aliases and relative paths to prevent an alternate spelling from bypassing a boundary. External dependency categories are explicitly declared and spec-linked; a new unclassified production dependency requires review of that policy rather than an automatic allowance.

React component-to-component behavior composition remains valid through `@ultima/ui/<item>` and its derived registry dependency. Reject relative sibling imports and workspace barrels the registry cannot stage. Do not impose a zero-sibling-dependency rule. Keep private appearance restatement and the current helper-item model.

Extract reusable pure inventory/dependency checks from the registry builder as needed. The static command must not invoke generation or maintain its own list of what the builder stages. It validates source-side completeness; registry builds and fresh consumer installs still prove generated output and installation. Setup items and vendored element items keep their distinct dependency rules. Broader catalogue ownership and generated-output freshness policy are decisions for the metadata ticket.

### Exceptions

Store exceptions as typed repository data under `packages/analysis/exceptions.ts`, read only by the workspace scope. Each entry contains an ID, rule ID, exact repository-relative path, symbol or part, declaration/property or import target, selector/condition when relevant, allowed expression shape, reason, and owning specification section or ADR amendment. Use source structure rather than line numbers so moving a declaration does not invalidate an otherwise identical exception.

An entry must match exactly the intended site and expected occurrence count. Zero matches, unexpected additional matches, duplicate entries and missing authority targets fail `ULT-EXCEPTION-001`. The reported location comes from the current syntax tree. A migration cannot add an exception just to hide an existing violation; the owning decision must authorize the pattern first.

Do not allow directory globs, whole-file suppression, `disable-all` comments, or a permanent grandfathered baseline. Genuine reusable allowances belong in the property/target policy with fixtures, rather than thousands of repeated exceptions. Temporary advisory rollout of an unvalidated new rule is permitted during its implementation slice, but its final delivery requires a clean blocking run. The Adoption and maintenance section determines the slice order.

### Diagnostics

Each diagnostic contains rule ID, severity, repository-relative file, one-based line/column and end position, symbol/part when available, the failed condition, a repair suggestion, and an owning-spec link. Include the exception ID when relevant. Sort by file, position and rule ID for deterministic output. JSON adds a schema version, run status, analyzed scopes and advisory/error counts.

Example wording: `ULT-TOKEN-001: Dialog.Popup borderRadius uses an undeclared length. Read the semantic radius token; see docs/spec/ultima.md#tokens-in-component-code.` Suggest an exact token only when the component contract determines it. Do not silently choose a design value, rewrite behavior, or apply fixes during a check.

No findings means only that the completed static checks found no violations in their declared scopes. Output must not call that full accessibility, performance, visual or interaction verification.

### Proof and delivery requirements

Use the TypeScript API and a lightweight Node test runner for the checker fixtures. These tests require no browser. The component proof-bar suites remain in their current package test directories.

Every rule must have valid fixtures drawn from current contracts and prohibited mutations that fail for the expected rule and location. Required cases include:

- Raw design values hidden behind aliases, spreads, computed keys and mixed token/literal calculations; valid SVG, structural CSS, motion and runtime-value cases.
- Allowed React Zag components and React-free elements; rejected third-library, icon and target-crossing imports; valid recipe dependencies.
- Rejected public `className`/native style assignments and valid styled, plain, pass-through and Zag part contracts; a caller slot moved before defaults.
- Native controls and painted surfaces in docs chrome; legitimate anchors, `render` composition, demos and specifically authorized paint; advisory treatment of ambiguous widgets.
- Missing/stale registry metadata and a relative sibling import; valid behavior composition and setup/element dependencies.
- Removed, broadened, duplicated and unmatched exceptions; parser failures and unresolved rule-relevant expressions; an unclassified source or dependency.

Each rule slice inventories the entire applicable source scope, fixes violations or resolves legitimate exceptions, and records a clean blocking run with its fixture results. Newly discovered product-contract questions remain visible decisions; they must not be disguised as checker exceptions. A fixture suite alone does not prove the existing repository passes.

The source inspection for this decision sampled the existing contracts and checks; it was not a full violation count. It found literal local layering in Tabs/Select, token-derived local expressions in Toast, and Navigation Menu's documented instant-state zero duration alongside the Drawer case. The local-layering policy above preserves the first pattern. Direct token aliases must be expanded while preserving output; derived runtime expressions remain analyzable. Navigation Menu's instant-state duration has its own authority in State styling and an existing browser assertion, so its allowance stays distinct from Drawer's. Any genuinely unsettled product behavior uncovered by the implementation inventory requires a decision before that rule slice can ship.

Before the implementation effort completes, run all architectural checks and the existing typecheck, browser suites, palette check, registry build, docs build and applicable consumer smoke installs. Retain the full validation bar while adding a fast static failure path. [Verification CLI](#verification-cli) specifies orchestration, and [Adoption and maintenance](#adoption-and-maintenance) specifies staged delivery.

## Component metadata and scaffolding

Decided on [Component metadata: ownership, generated wiring, and scaffolding](https://github.com/frankieramirez/ultima/issues/437). This section specifies a migration. The descriptors, generated wiring and freshness checks have landed ([#450](https://github.com/frankieramirez/ultima/issues/450), [#451](https://github.com/frankieramirez/ultima/issues/451)), and so has the scaffold ([#452](https://github.com/frankieramirez/ultima/issues/452)). `ULT-SOURCE-001`, which rejects its incomplete marker, has not.

### Ownership

Give each item one authored descriptor at `registry/metadata/<kind>/<id>.ts`. Use data-only default exports checked with `satisfies` against discriminated types in `registry/metadata/schema.ts`. Permit type-only imports; reject runtime imports, calls, getters, computed execution and filesystem access in descriptors. The loader validates the shape at runtime as well as through TypeScript. Shared release definitions live in `registry/metadata/releases.ts` as data under the same restrictions.

Use one file per item to avoid requiring every component addition to edit a shared manifest. `registry/items.config.ts` becomes a generated compatibility projection with its existing `items` export and item-description shape. Existing consumers can continue importing it; browser code receives plain generated data and never imports the metadata loader, filesystem APIs or the TypeScript compiler.

Authority is split by fact:

| Fact | Authoritative owner | Derived or checked uses |
| --- | --- | --- |
| Behavioral contract, parts, defaults, accessibility and permitted primitive | Specification and ADR amendments | Source review, checker policy, scaffold preconditions and proof-bar assertions |
| Item identity, title, shared summary, release placement, specification reference and install guidance | Item descriptor | Registry prose, docs catalogue, navigation inputs and agent-guide descriptions |
| Code, explicit public exports and actual imports | Authored implementation | Barrel exports, runtime dependencies, component registry edges and optimizer discovery |
| Documentation explanation and component demos | Authored MDX and demo modules | Generated page imports; existing live/source demo pairing |
| Element registrations and finite attribute values | Element source | Generated tag/enum data, checked documentation references and existing parity proof |
| Element attribute explanations and examples | Element descriptor | Docs presentation; semantic behavior still needs authored tests |
| Setup files and their install destinations | Authored `registry/static/` files and setup descriptor | Setup registry records and install smoke tests |

The metadata chooses how settled facts are presented and connected. It cannot approve a new component contract merely by pointing at a document. Every descriptor names the owning local specification section, and the scaffold requires a settled contract supplied by the author. Missing or contradictory contracts fail with a named precondition; semantic completeness remains a review responsibility.

A mismatch between source and specification is an error to resolve. A mismatch between a generated projection and its inputs is stale output. Do not choose whichever copy happens to be newer. Metadata must not duplicate prop unions, default values, or imported dependency lists that the source already owns.

### Descriptor variants

All records have a unique kebab-case `id`, `kind`, `title`, `description`, and a local `contract` path with heading anchor. Installable kinds also have authored `installDocs`. A React record may declare `docsDescription` when the visitor summary intentionally differs from the registry summary; absent that field, both use `description`. Unknown fields are errors, so misspellings do not silently disappear. Paths resolve from the repository root and must remain within their owning source areas.

| Kind | Required distinctions |
| --- | --- |
| `react` | `id` matches the source basename and registry item. `primaryExport` names the actual root function/namespace; it is validated against source rather than guessed from spelling. `release` and integer `order` place the item in the docs catalogue. Source, MDX, test and demo-directory paths follow existing conventions and are derived. |
| `element` | `id` is the root `ult-*` item and `reactItem` references its React counterpart. `order` owns its docs-family placement. Source and per-family bundle paths follow current conventions. Declare the vendored artifact's registry dependency IDs, attribute documentation and example markup. No React barrel or component-page entry is created. |
| `setup` | Declares its authored static files with registry file types and install targets, plus npm/dev dependencies and any registry dependencies that cannot be inferred from compiled source. Vite and Next.js remain separate records. |
| `source-bundle` | Describes the `tokens` or `lib` source group using the existing inventory and exclusions; dependencies come from the grouped sources. It is not a UI component and gets no component route. |
| `artifact` | Describes generated non-element files such as `tokens-css`, including the producing build, output path, file type and install destination. It is not copied source or a component. |
| `recipe` | Names the owning component page and section anchor, release/checklist authority and demo modules. Has no install guidance field, registry item, component barrel export or independent route. Component and engine dependencies are derived from its executable demos; the MDX explains the consumer's installation steps. |

The loader scans these descriptor directories and rejects duplicate IDs across kinds, unexpected descriptor files, missing referenced items and cycles in derived registry dependencies. It reconciles descriptors with source discovery in both directions: every component source has a descriptor, and every descriptor has its required authored files. An unregistered source cannot disappear from the published catalogue silently. Source-bundle inventory names, artifact producers and file roles are validated enum values, not arbitrary commands that metadata can execute.

Element attribute documentation uses an array of actual attribute names and a target tag reference, rather than a comma-separated name masquerading as one attribute. This preserves presentations such as “value, min, max” while validating each name. Finite-value documentation references a source enum/table symbol; free-form attributes keep authored explanatory text. Registered tags are extracted without executing the element module. If docs need a different tag order, metadata holds ordered references to those tags, checked for exact coverage and root-first placement. Do not infer runtime semantics from the presence of a `getAttribute` call.

Recipe records cover specification/checklist recipes only. An ordinary documented composition remains MDX and demos without its own metadata record. Helpers and generated artifacts also remain outside the component count.

### Ordering and compatibility

The ordered release definitions own the release IDs and labels once. React descriptors carry a unique integer `order` within their release; gaps are allowed, duplicate positions are errors. Docs sort by release position and then this order. Do not resolve collisions alphabetically or renumber unrelated entries during scaffolding. If no position is supplied, report the available append position in the dry-run and require the author to accept it in the scaffold request.

Preserve the current docs order and all route slugs during migration. The inspected baseline has 54 React entries in groups of 18, 14 and 22, and nine element families. These are migration observations, not permanent ceilings. Registry staging keeps its existing alphabetical ordering and the tokens/lib precedence in derived dependencies. Element build ordering remains alphabetical; docs-family order is separate.

Preserve public export names exactly, including `InputOTP` and exported hooks. `primaryExport` identifies the main API for documentation without relying on the first exported value. Generate explicit named re-exports, preserving aliases and type-only modifiers, from the component's explicit export declarations. Do not use `export *`, infer `RootProps`, or export unexported declarations. Duplicate public names fail before writing the barrel. The existing wildcard component subpath export in `packages/ui/package.json` remains; new component metadata does not add a package-export entry.

Before switching to generated exports, compare the current barrel's public symbols against the implementation exports. Any mismatch must be reviewed against the component contract, rather than allowing generation to add or remove public symbols accidentally. Record that reconciliation as migration evidence.

### Generated wiring

Implement a shared, pure catalogue model under `scripts/catalogue/`. It combines validated descriptor data with source discovery and the TypeScript syntax/type analysis already chosen for architecture checks. Registry building and architectural validation consume that model; neither grows a second membership list. Builders retain their own target-specific transforms and checks.

Generated projections are never authoritative inputs to this model. When an import traverses the UI barrel or a generated docs module, resolve it against the in-memory export/page plan. Generation must work when all owned projections are absent, and a stale barrel cannot change which exports the generator discovers. Tooling stays repository-local and adds no runtime metadata dependency to installed consumer source.

Generate these small source projections and commit them with the inputs:

| Output | Contract |
| --- | --- |
| `registry/items.config.ts` | Existing registry description shape, with installable records only; authored setup and vendored-artifact dependency declarations retained. |
| `apps/docs/src/generated/catalogue.ts` | React entries and release definitions. Existing `components.ts` becomes a small adapter for helpers such as `componentsInRelease`, without a second authored item list. |
| `apps/docs/src/generated/component-pages.ts` | Explicit eager MDX imports and the component-page map. `router.tsx` retains route construction, breadcrumbs and navigation behavior, and imports this map. |
| `apps/docs/src/generated/elements.ts` | Element catalogue presentation assembled from descriptors and source-derived tag/enum data. The existing `elements.ts` keeps a thin compatibility export. |
| `packages/ui/src/index.ts` | Explicit public value/type exports from the authored component files. Helper subpaths and package export policy stay authored. |
| `scripts/generated/browser-dependencies.ts` | Separate UI and docs browser-test optimizer include arrays, with each dependency's source provenance available from the generator diagnostics. |

For registered React components, a missing MDX module is a generation error. Keep the router's existing unknown-route handling; do not let a placeholder turn missing registered documentation into successful validation. The route structure stays code-based and loading remains eager in this migration. Lazy loading is a separate performance decision.

The static model also exposes source/demo/test paths and recipe membership to future verification selection. The Verification CLI and Executable feature map sections below own command discovery and scenario identity.

Element builds consume the model's validated family inventory and retain per-family classic bundles, the aggregate `ultima.js`, build stamps and existing gzip budgets. There is no element npm barrel to generate. Continue verifying that the staged, served and embedded element artifacts agree.

### Dependencies and browser optimization

Use one import-analysis implementation to derive runtime npm packages and registry edges. Resolve local/workspace imports and distinguish type-only imports, runtime imports, re-exports and statically resolvable dynamic imports. Preserve current consumer-provided package treatment and dependency ordering. Unknown dynamic dependencies in installable code fail the analysis rather than creating an incomplete item.

Copied React source derives its own npm/registry dependencies. Setup records keep explicit dependency declarations because their authored configuration files have different roles. Element bundles retain declared artifact dependencies, including `tokens-css`; do not infer a bundled dependency list from a file whose imports have already been removed. Store those references as registry item IDs and let the existing registry adapter serialize them to the currently supported URL/specifier form.

Derive browser optimizer candidates from the runtime import closure of each browser-test project's source, tests and setup files. Follow local and workspace source and executable MDX imports; skip printed `?raw` content, type-only imports, Node-only suites and non-JavaScript assets. Preserve package subpaths such as Base UI entry points. UI and docs keep separate root sets, so docs engines and testing utilities do not become UI registry dependencies.

Use a small authored optimizer policy for runtime/tooling-specific additions and exclusions, each with a reason and source reference. Automatic discovery proposes candidates; the adapter classifies which bare runtime specifiers Vite should prebundle. Reject unresolved candidates with an actionable diagnostic instead of silently dropping them or prebundling Node modules. Preserve the currently required sets during migration and justify removals with a real browser run. Do not add an optimizer list to the production Vite configuration merely because test configuration has one.

### Generation and freshness

Add `pnpm catalogue:generate` for explicit regeneration and `pnpm catalogue:check` for a read-only freshness check. Both use the same in-memory output plan; `catalogue:check` compares expected output names and exact bytes and reports added, changed or stale generated paths. Stable ordering, fixed newlines and the absence of timestamps/absolute paths make generation deterministic across supported hosts.

Generated source files carry an ownership header naming the command and input locations. The generator owns a fixed set of output paths, including the existing UI barrel and registry compatibility file. During migration, converting those currently authored files requires an explicit reviewed diff. Subsequent runs may replace only generator-owned outputs; a broad directory deletion is prohibited.

Validate the entire input model and prepare all outputs before writing. Use a per-worktree generation lock and recheck the observed input/output hashes before replacements. Abort on stale inputs or concurrent edits; multi-file writes are not an atomic Git transaction. If a write fails partway, report every changed path and leave the next read-only check failing until repaired. Never report partial generation as success or overwrite an authored source, MDX or demo file.

Keep large build artifacts ignored as they are today: staged registry sources, served registry JSON, token exports, agent guide, docs build and element bundles. A freshness check does not require committing them. Release validation rebuilds those outputs from the validated inputs and checks consumer installation. Any timestamp/build-stamp fields use the existing artifact contract when comparing builds.

CI checks freshness before expensive browser/build steps and fails on stale committed projections. Normal validation must not regenerate those files silently and erase the evidence. Root dev/test/typecheck/build and registry commands, plus direct package entry points that consume the projections, must reject stale input before use through a shared nonrecursive preflight. The Verification CLI section defines how repeated preflights are consolidated. No generation command may recursively invoke itself through those hooks.

`ULT-REGISTRY-001` uses the shared model to report membership/reference failures; freshness diagnostics identify the stale path and `pnpm catalogue:generate` as the repair. The architecture checker remains static and does not trigger registry or element builds. What the build stages and which items it writes live in `scripts/catalogue/staging.ts`, which `scripts/build-registry.ts` and the checker both read.

### Scaffolding

Add `pnpm scaffold <kind> <id> --from <request.json>`. Its default is a dry-run. `--write` applies the displayed plan after revalidating its preconditions. Support `react`, `element` and `recipe` initially. Support/setup records are infrequent packaging work and are authored against their schema; the scaffold must report that limitation rather than guessing install destinations.

The request contains the descriptor fields and a transient authoring brief: settled contract reference, primary export where relevant, primitive/part shape, axes/defaults and the applicable proof-bar requirements. This brief drives template selection; it is not a new persistent owner of those facts. Reject absent contract answers before any write. In particular, do not invent a `RootProps` type, choose a primitive by similarity, assign a release position silently, or guess an element parity mapping.

A React scaffold creates one metadata descriptor, one component file, its correctly located test file, its MDX page and an initial demo module. The MDX imports that same demo as live JSX and `?raw` source. An element scaffold creates its descriptor, element source and correctly located tests, and reports the required authored parity/fixture coverage. A recipe scaffold creates its descriptor and demo modules; if its page already exists, output an unapplied insertion snippet for the author rather than rewriting the page.

Generated skeletons visibly mark incomplete work with an `@ultima-scaffold-incomplete` marker. `ULT-SOURCE-001` rejects that marker until the author completes the contract and removes it. Scaffolding is not proof-bar coverage, and it must not create passing tests that merely assert the scaffold exists. The dry-run names the remaining behavioral and accessibility work.

Scaffolding regenerates the small wiring projections through the same catalogue model. It does not edit the router, package exports or optimizer config by string substitution. Before writing, check all intended authored paths, metadata IDs, public export names and release positions for collisions, as well as the generated-output plan. A request targeting an existing authored item fails without changing it. There is no overwrite or force mode.

The request is one JSON object, `{ "descriptor": …, "brief": … }`. `descriptor` holds the kind's descriptor fields apart from `id` and `kind`, which come from the command. The brief is per kind:

| Kind | Brief | Creates |
| --- | --- | --- |
| `react` | `primitive` (`{ kind: 'native', element }`, `{ kind: 'base-ui', module, export }` or `{ kind: 'zag', module, element }`), `shape` (`plain` or `compound`), `parts` for a compound (`name`, `styled`, and `element` when native or Zag), `axes` (`{}` or `variant`/`size`/`tone` with `values`, `default` and, on a compound, `part`), and `proofBar`, the eight answers. | Descriptor, `packages/ui/src/<id>.tsx`, `packages/ui/src/__tests__/<id>.test.tsx`, `apps/docs/src/demos/<id>/basic.tsx` and the MDX page importing it live and `?raw`. |
| `element` | `enums`, the values of every attribute `symbol`; `parity`, the `axes`, `parts` and `stateMap` entry for the parity test; and `proof`, what the element tests must prove. | Descriptor, `packages/elements/src/<id>.element.ts` registering exactly its `tags`, and `packages/elements/src/__tests__/<id>.test.ts`. The parity entry is printed, not applied. |
| `recipe` | `proof`, what the recipe's tests must prove. | Descriptor, each demo in `demos`, and `apps/docs/src/__tests__/<id>.test.tsx`. The page imports and section are printed, not applied; generation waits until the author applies them. |

Every created test is `test.todo` per requirement, so a scaffolded item reports todos, never passes. The manifest and lock live under the ignored `.scaffold/`.

Use exclusive creation for new authored files. After an interrupted write, a rerun identifies the partial files and stops with recovery instructions. It must not delete or overwrite them to simulate idempotence. Concurrent edits invalidate the plan, and operations leave a manifest of paths they created or updated so recovery can inspect the exact scope.

### Migration and proof

1. Capture the existing catalogue/release order, registry prose and dependency edges, routes, public exports, element documentation and required optimizer sets at a named revision. The observed 54 React/9 element/5 support-item counts provide a cross-check, not a hardcoded future rule.
2. Add the schemas, per-item descriptors and pure model with bidirectional source checks. Reconcile descriptions that differ today: preserve the installed CLI text and visitor wording by explicitly naming a docs-only override where their purposes differ. Share the summary by default; do not silently rewrite either audience's prose during migration.
3. Generate projections in a temporary comparison location. Require semantic equivalence to the captured public outputs, preserving release order and explicit exports. Keep independent fixture expectations and mutation tests; generating a test's expected answer from the same catalogue cannot prove the catalogue is correct.
4. Switch the existing adapters and builders to the model, remove superseded authored lists and replace the catalogue order test's repeated full lists with ordering/reference tests plus fixed generator fixtures. Keep behavioral assertions authored, including element parity and browser checks. Update Forge's wiring instructions and the repository layout/generated-file guidance in the same change.
5. Deliver the dry-run/write scaffold, freshness preflights and interrupted-write tests. Validate actual Vite/Next.js registry installation, element distribution and browser optimizer startup, alongside the existing full checks.

Required negative fixtures cover duplicate IDs/order positions, missing source/page/demo/test files, source without metadata, stale descriptors, broken contract anchors, invalid primary exports, duplicate public exports, unresolved dependency candidates, invalid element enum references, recipe records leaking into the registry, stale generated output, authored-file collisions and concurrent/stale scaffold plans. Valid fixtures cover a plain component, a compound with hooks, a Zag React component, an element family, a setup item and a recipe. Preserve separate source-bundle/artifact tests for token exports and helpers.

Prove authoring improvement with the same synthetic component-addition exercise in disposable baseline and migrated checkouts. Keep the contract, dependency, demo and required proof identical; record commands, manual coordination edits, discovery time and failures. After migration, the author should edit the descriptor and authored behavior/docs/tests, with **zero manual edits to the barrel, router/page map, catalogue adapters or optimizer lists for an ordinary component addition**. New dependency-policy decisions and element behavioral parity work remain explicit exceptions to that target. Record wall-clock measurements without inventing a speedup percentage. The Efficiency and performance section defines the shared benchmark protocol.

Delete the synthetic component after the exercise and prove regeneration leaves no stale membership. Repeat generation without input changes and require zero diff. Repeating a scaffold write against an existing item must fail without altering any authored bytes.

## Verification CLI

Decided on [Verification CLI: selection, failure behavior, and evidence contract](https://github.com/frankieramirez/ultima/issues/438). This section specifies tooling to implement. Existing package commands and CI remain in use until the implementation passes the acceptance cases below.

Planning shipped with [Plan conservative verification coverage](https://github.com/frankieramirez/ultima/issues/458): `component`, `feature`, `changed` and `release` accept `--plan`, the check DAG and its CI mapping live in `scripts/verification/checks.ts`, and `scripts/verification/plan.test.ts` proves selection on fixture repositories.

The run lifecycle shipped with [Isolate verification runs and process lifecycle](https://github.com/frankieramirez/ultima/issues/459). A mode without `--plan` captures the checkout (`scripts/verification/source.ts`), plans from the captured bytes and executes the DAG in its own run directory (`scripts/verification/run.ts`), with owned process groups (`process.ts`) and nonce-checked loopback servers (`ports.ts`). `scripts/verification/run.test.ts` proves the lifecycle with controlled subprocesses.

The static, type and unit adapters shipped with [Execute static, type and unit checks](https://github.com/frankieramirez/ultima/issues/460), in `scripts/verification/adapters.ts`: architecture, catalogue freshness, typecheck, the tooling and checker fixtures, the palette gate and the tokens and CLI suites. Each runs the check's existing command and adds only the flag that makes the tool write a report it already knows how to write: `--format json` for `check:architecture`, `--json` for `catalogue:check` (added for this), Vitest's JSON reporter, a `node --test` reporter (`scripts/verification/node-test-reporter.ts`), `-v` for `palette.py`, and the prefixed `pnpm -r` log for typecheck. `scripts/verification/tool-reports.ts` reads those reports; it recomputes nothing. A whole-suite run expects every test file the runner's configuration covers, so a file the runner stops collecting is missing coverage. A skipped or todo test in a required suite is incomplete. A failing assertion, compiler diagnostic, blocking rule, stale projection or failing pairing is a validation failure; a file that never loaded, an unhandled error or an exit the report does not explain is incomplete. Each check writes `artifacts/<check>.evidence.json` with the planned and executed argv, the hashed configuration it depends on, the discovered files, the tool report and the CI obligations it carries. Checks that build in the snapshot declare `after` on architecture and freshness, so those read the captured bytes before any build or generator writes; `after` orders without blocking. The run's TMPDIR sits under the system temporary directory rather than the run directory, because a scratch repository inside the checkout would join its Git work tree and pnpm workspace. Browser, build, install and production checks remain `unavailable` until #461 to #463, so a release run still exits 3.

Decisions the contract left open, as implemented: an adapter reports a verdict and coverage, and the runner decides the state. A crash, launch failure, unreadable tool report or missing coverage is `failed` with failure kind `incomplete`, which exits 3; only failure kind `validation` exits 1. A run removes its `source/` and its TMPDIR at the end and keeps `artifacts/source-manifest.json`, `logs/` and `report.json`, which is rewritten as `unfinished` after each check so an abrupt stop leaves a readable partial manifest. Descendants are found through their process group and an ownership token in their environment (`ULTIMA_VERIFY_OWNER`), which also finds one that left the group; on platforms without `/proc` only the group is reached. A server reads its port from `ULTIMA_VERIFY_PORT` and answers `/__ultima-verify/identity` with the `ULTIMA_VERIFY_NONCE` it was given. `--output` must be new or empty and outside the checkout, apart from `.scratch/`, so evidence never becomes source. Dependency preparation runs `pnpm install --frozen-lockfile --prefer-offline` in `source/`, and only when a selected check can execute.

### Commands and discovery

Expose `scripts/verify.ts` as `pnpm verify`. Use the repository's supported Node runtime and TypeScript execution convention. Keep selection and planning pure, with execution adapters for the existing checks.

```sh
pnpm verify component button
pnpm verify component ult-button
pnpm verify feature theme-studio
pnpm verify changed --base origin/main
pnpm verify release
pnpm verify changed --base origin/main --plan --json
pnpm verify --help
pnpm verify list --json
```

Exactly one mode is required. `component` accepts one or more validated catalogue IDs, including setup items and recipes; the descriptor kind determines coverage. `feature` accepts one or more registered feature IDs. The Executable feature map section owns their definitions, including `theme-studio`; registration must precede use. Unknown explicit IDs and malformed options exit 2 with available choices. They cannot produce an empty successful run.

`list` discovers catalogue IDs, feature IDs, check IDs and their scopes from the shared model and check registry. Each mode supports `--help`. `--plan` resolves inputs and prints the complete ordered plan without running checks or installing prerequisites. Its status is `planned`, including when it exits 0. `--json` writes one versioned JSON document to stdout; progress and child output go to stderr and log files. Human output summarizes the same data. Offer `--output <directory>` for retained evidence and `--timeout <seconds>` for a positive overall deadline. Help states the repository-owned default deadline and per-check deadlines; measurements may tune these later.

Do not expose arbitrary shell commands in item or feature metadata. Adapters own argument arrays and invoke subprocesses without shell interpolation. Paths and IDs cannot become executable arguments by concatenation. A local partial result always names its scope. Full CI remains authoritative for merging and release, even after a local release run passes.

### Selection and dependency expansion

Use the catalogue model selected in the metadata decision, source import analysis and the feature/scenario registry specified below. Build a reverse dependency graph as well as each selected item's forward prerequisites. Follow re-exports, workspace aliases and runtime/type dependencies where they affect the relevant check. Include React consumers, shipped element counterparts and parity tests, docs demos, recipes and feature scenarios reached by those edges. Global check inputs have explicit broad scope. Unsupported analysis expands coverage; it never silently discards an edge.

| Input | Required expansion |
| --- | --- |
| React component | Own proof-bar suite, affected component dependants, element counterpart/parity where shipped, consuming demos and feature scenarios; global static/freshness checks and full typecheck. Include registry/production/install checks for affected distributed items. |
| Element family | Family browser and lifecycle tests, parity gate and bundle assertions, consuming docs/scenarios, tokens dependency and served/embedded bundle checks. |
| Recipe | Owning demos, composed components and consumer dependencies, both-mode axe and relevant scenarios. It has no registry item; install validation applies to its composed installable inputs. |
| Setup item | Full consumer smoke across the existing supported targets, registry build and docs install guidance checks, plus static/freshness/type checks. |
| Shared token source, palette recipe or token export | Full release plan, covering both render targets, contrast, all demos, production output and consumer installation. |
| Shared helper | Transitive consumers in both targets and docs, registry helper installation and shared suites. If the closure cannot be established, full release plan. |
| Lockfile, package manifests, TypeScript/StyleX/Vite/Vitest config, workflow, verification tooling or generator | Full release plan. An execution or dependency change can affect every item. |
| Metadata or generated output | Include owner and reverse consumers using source-derived projections. Unowned/stale output remains a check failure; regeneration cannot conceal it. |
| Unmapped path or unresolved dependency | Full release plan with the path and fallback reason recorded. |

Start with full-repository architecture and catalogue freshness checks plus `pnpm typecheck` in every executable mode. Narrow browser suites and scenarios only when their discovery proves complete coverage of the affected set. A selector adapter must report discovered test/scenario IDs and the IDs it actually ran. An absent expected suite is incomplete verification. When a current suite has no supported selector, run that entire suite and record the expansion. Never rely on a filename substring or zero-test success as selection proof.

The planner draws a few lines the table leaves open. Docs chrome, a global stylesheet or a served asset renders on every route, so a change to one selects every production scenario; a route table reached only through its imports does not. A reached Vitest binding selects that target's cases, not the scenario's production cells. A test file that reads the file system, fetches or names a served URL cannot be narrowed by imports and joins every run of its suite. Prose under `docs/`, root Markdown and agent configuration select only the common checks, which own their links and anchors; `docs/spec/ultima.md` feeds the registry and agent guide, so it selects release. Metadata that cannot be read leaves ownership unknown and selects release; other catalogue findings keep the scope and are listed for the freshness check to fail on.

A component/feature mode selects that named scope; it does not imply coverage of unrelated dirty files. Report dirty paths outside the selected scope and recommend `changed` or `release`. Full CI runs the complete release policy independently of local selectors. There is no user skip option that can turn a required check into a pass.

### Changed files and source identity

`changed` defaults to the local `origin/main` ref, and records the resolved base commit plus merge base with HEAD. Union changes from merge-base to HEAD with staged, unstaged and untracked non-ignored paths. Use NUL-delimited Git output. Analyze both base and current inventories: deleted paths retain their former owners/dependants, and a rename includes its old and new identities. A deleted test also selects checks proving its required coverage still exists. If the base inventory is unavailable or either side is ambiguous, broaden to release.

A missing base ref, absent merge base or shallow history chooses release and reports the reason. Do not fetch or mutate Git refs automatically. Explicit unknown component/feature IDs remain usage errors, distinct from unknown changed-path mappings. A genuinely empty changed set still runs the common static/freshness/type checks and reports that no behavioral changes were selected.

Verify a frozen snapshot of the current filesystem contents, including dirty tracked files and untracked non-ignored files. Record HEAD, base/merge-base where applicable, staged and unstaged status, renames/deletions, submodule state if present, and a deterministic SHA-256 manifest of source paths, file types/modes and bytes. Record the index identity separately from the tested worktree bytes. Capture paths with spaces and non-ASCII names losslessly. Exclude only declared generated, dependency, Git-internal and evidence directories; expose that exclusion list in the report. Required ignored inputs or uninitialized submodules make the run incomplete unless an adapter explicitly supplies and hashes them.

Check source stability during snapshot creation; retry a bounded number of times and fail incomplete if a coherent snapshot cannot be captured. All checks consume that same snapshot. Hash the originating source again at completion. If it changed, retain results as evidence for the captured identity, report `sourceChanged: true`, and exit incomplete rather than asserting the current checkout passed. Generated build outputs within the execution directory are recorded as artifacts, separate from the input identity. Freshness checks run before any generator can repair those outputs.

### Check composition

Use an explicit check DAG with prerequisites, required scope, resource locks and deadlines. Continue independent checks after a failure, while marking dependent checks `blocked` with the failing prerequisite. Deduplicate a prerequisite only when input identity, command, configuration and outputs match. Retain nested command information when a package script itself runs a build.

| Check | Existing command or planned adapter |
| --- | --- |
| Architecture and metadata | `pnpm check:architecture` and `pnpm catalogue:check`, with their fixture suites included in release validation. |
| Types | `pnpm typecheck`, including the root TypeScript project. |
| Unit/browser/axe/parity | Release composes `pnpm test`. Scoped execution invokes existing Vitest projects with explicit validated file/scenario selection, preserving each package's preparation steps. Tokens use their existing suite; elements need token and element builds; docs need the registry build. |
| Contrast and palette freshness | `python3 packages/tokens/scripts/palette.py --check`; reuse its prerequisites and behavior. |
| Registry and bundles | `pnpm registry:build`, retaining token/element production builds, bundle limits and registry assertions. |
| Production docs | `pnpm --filter @ultima/docs build`, retaining its registry prerequisite. `pnpm build` remains supported but is not an additional duplicate proof obligation. |
| Consumer install | `scripts/smoke-install.sh --keep` against the run's own built registry. Preserve its Vite, Next.js and element checks; scoped runs use the full smoke until a validated selector exists. |
| Production browser scenarios | Required adapter settled by the production-browser decision; consumes the same run's production build and reports scenario IDs. Development Vitest results cannot satisfy it. |

The release plan includes every row, all registered scenarios and tooling fixtures. Required adapters must exist before the final CLI can report release success. During staged implementation, an absent adapter reports `unavailable` and an incomplete run. Existing CI remains operational while those pieces land. Check discovery tests must prove that every required CI validation obligation maps to a release check, including the separately defined consumer-smoke workflow. Network access needed for consumer installation is a prerequisite; a network failure yields incomplete evidence unless an executed test establishes a product failure.

The current docs `test` and `build` scripts regenerate the registry, and the elements `test` script builds tokens and elements. Preserve those steps until the implementation extracts a reusable preparation adapter with equivalent tests. Keep full package suites when a granular adapter cannot establish equivalence. Avoid duplicating palette calculations, registry dependency logic or smoke assertions in the runner.

### Isolation and cancellation

Create a unique run directory under ignored `.scratch/verify/<run-id>/`, containing `source/`, `artifacts/`, `logs/` and `report.json`. A caller-supplied output directory must be new or empty. Place the frozen source in the private execution directory and direct generated registry, token, element and docs outputs there through that directory's normal relative paths. Never run generators against the caller's authored checkout or reuse another run's output. Prepare dependencies from the matching lockfile inside the execution directory; a shared package-manager content store is allowed, writable workspace dependency/build directories are not. Installation output and duration remain visible as preparation.

Allocate loopback ports per run and pass them explicitly to owned servers. Use dynamic allocation with bounded bind retries and server identity/readiness checks; neither probe-then-assume nor attaching to an existing server establishes isolation. Record the actual URLs and ports. Reuse the smoke script's existing dynamic port allocation and `TMPDIR` support; place its consumers under the run directory and record its actual server URL. Its local path rebuilds assets, so it also runs inside the private execution directory. A deployed `--host` result cannot count as evidence for the local snapshot. Record resolved versions of network-fetched scaffold and CLI tools. Inability to establish ownership or isolation yields incomplete verification.

Keep `fileParallelism: false` for the current browser suites. Run browser projects serially within a run while they share viewport, pointer or document state. Serialize commands that write the same generated directories, including nested package preparation. Separate runs may proceed only through their private source/build directories and allocated ports. Further browser parallelism requires an isolation test proving independent state and outputs.

On timeout, SIGINT or SIGTERM, stop owned process groups, allow a bounded graceful shutdown and then terminate remaining owned descendants. Never kill by port or process name. Always attempt to flush the partial report and retain failure logs/screenshots/traces. Release listeners and temporary consumer processes; retain referenced artifacts and remove only run-owned disposable files. The next invocation diagnoses an abandoned run without treating its partial files as completed evidence. Abrupt termination that prevents report finalization leaves an explicitly unfinished manifest.

### Evidence and exits

Version the report schema. Record run ID, mode and original selectors, requested/effective scopes, source identity, tool versions, platform, prerequisite results, timestamps, monotonic durations and final status. The ordered check records contain stable check ID, argv/cwd, dependency IDs, selection/expansion reason, expected and executed test/scenario IDs, status, exit code/signal, duration and repository/run-relative evidence paths. Include skipped checks with scope reasons and blocked checks with prerequisites. Logs are artifacts; screenshots and traces prove only the scenario and state that produced them.

Check states are `passed`, `failed`, `unavailable`, `timed_out`, `cancelled`, `blocked`, `skipped` and `not_run`. A passed check requires successful execution and validated completion/coverage evidence. Missing prerequisites, runner crashes, unreadable reports and unexecuted checks cannot pass. Unexpected test skips within required coverage make the check incomplete; explicitly inapplicable cases need declared reasons in the scope contract. A zero exit code alone cannot turn zero executed required tests into success.

| Exit | Meaning |
| --- | --- |
| 0 | All required checks completed and passed for the stated snapshot/scope; or successful help/list/plan with its non-execution status explicit. |
| 1 | At least one executed check proved a validation failure; report also preserves any incomplete checks. |
| 2 | Invalid CLI input or explicit selector. |
| 3 | Incomplete run: missing prerequisite/adapter, timeout, runner failure, capture failure or source changed during the run, with no established validation failure. |
| 130 / 143 | Cancellation by SIGINT / SIGTERM; retain all results reached before cancellation. |

Cancellation takes precedence for a cancelled run; otherwise an established validation failure takes precedence over incomplete execution. Every other required check must still show its own outcome. There is no aggregate pass when a required check is incomplete. Distinguish a tool's structured validation failure from launch/infrastructure failures instead of mapping every child nonzero exit to a product defect. A report is evidence of one execution, never a reusable pass cache in the initial implementation.

### Acceptance examples

Prove the selector with fixture repositories and exercise execution adapters with controlled subprocesses, then run representative real repository checks. Implementation must demonstrate:

- `component button` selects the React suite, its shipped element/parity coverage and consuming demos, with every extra selection explained. A recipe selects its executable composition without inventing a registry item; a setup change selects consumer installation.
- A shared token edit selects the complete release plan, including both color modes, both targets, palette and installation. An unknown non-ignored file chooses the same safe fallback and names that path.
- A shared helper edit follows reverse dependencies; a deliberately unresolved edge falls back. Renames, deleted owners/tests, staged-only edits and untracked source remain in selection. A missing base chooses release without fetching.
- An explicit misspelled ID exits 2. An empty diff performs the common checks and reports its limited scope. An expected but missing suite, zero-test run, skipped required test or absent production adapter exits incomplete.
- A failing assertion exits 1; a missing browser, unavailable network prerequisite or timeout exits 3. A dependent build is blocked when its prerequisite fails. Successful independent checks keep their evidence.
- Two dirty worktrees run concurrently with distinct source snapshots, generated paths and ports. Each report matches its own bytes; mutation during capture fails or retries, and mutation after capture produces `sourceChanged` with incomplete exit.
- Cancel a run with live server and child processes. Verify process cleanup, released ports and readable partial evidence. A stale output or foreign server cannot satisfy a new run's checks.
- Human and JSON modes describe identical selection/outcomes. JSON stdout parses as one document; every retained artifact path exists and resolves inside its run. A plan runs zero check processes and never reports a pass.
- Compare the release plan against CI and execute it end to end after all required adapters land. Preserve full proof-bar and both-mode coverage; measurement of speedup belongs to the measurement decision.


## Production browser verification

Decided on [Production browser verification: scenarios, isolation, and CI gates](https://github.com/frankieramirez/ultima/issues/439). These requirements describe planned tooling. The current CI builds production docs after development-transformed Vitest tests; this decision adds browser execution against those built files.

### Runner and build identity

Add a small Node runner using the Playwright library already declared by `apps/docs`, with its adapter under `apps/docs/scripts/` and authored scenarios under `apps/docs/tests/production/`. Expose `pnpm --filter @ultima/docs test:production` for the full production matrix. Its standalone entry delegates snapshot preparation and evidence to the verification infrastructure; the verification check calls the runner's internal adapter without recursively invoking the standalone command. Keep the package's existing Vitest command and every applicable item of the eight-item component proof bar.

Use the normal production Vite build and its real entry point, stylesheet order, fonts and route tree. Reuse the existing registry/token/element preparation through the check DAG. Execute against the run's isolated source/build directory, and never import component source through a development server for this check. Share an already completed production build only within the same run and matching input identity. The adapter requires a build manifest containing source identity, production mode, build command and hashes of the served files. A missing manifest, stale file or failed build prevents browser execution from passing.

Serve the built docs from an owned loopback HTTP server bound to port 0. Use a small static-server adapter with explicit HTML-navigation fallback for client-side routes, correct MIME types, and 404 responses for missing assets. Scope files to the build root and reject path traversal. A missing JavaScript file must never receive index.html as a successful asset response. The server exposes a run-only identity response outside the published build; verify its nonce and manifest identity before launching scenarios. Record the actual URL. An arbitrary external URL or already-running server cannot satisfy this local production check.

The runner navigates through the shipped application. Its own scripts may read DOM state, inject the installed axe runtime and seed declared storage preconditions. They must not replace application code, inject corrective CSS or mock production behavior to make assertions pass. Do not introduce a second demo site. Stable internal locator hooks are allowed only where accessible roles/names and existing fixture boundaries cannot identify a repeated specimen.

### Initial matrix

Use the repository's locked Playwright Chromium version, headless, at 1280×720 and 390×844 with device scale factor 1. Run each row below in dark and light at both widths, except the explicitly desktop-only row. Each cell gets a fresh context. Viewport coverage here does not claim real mobile hardware or touch-device coverage. Browser expansion requires its own scoped decision and evidence; Firefox and WebKit are outside this first gate.

| Scenario group | Required production assertions |
| --- | --- |
| Site navigation and color mode | Direct-load `/`, `/install` and `/components/button`; navigate using real links and browser back/forward; assert URL, heading and current-page semantics. At narrow width, open the site menu with the keyboard, dismiss with Escape and verify trigger focus, then reopen and select a destination to verify menu closure. Change color mode using the visible control and reload to prove persistence and the computed theme. |
| Catalogue and documentation | On `/components`, filter to an existing component, exercise empty results and clear the filter; open a result with the keyboard. On `/components/button`, verify the live demo and source are present and copy writes the expected displayed source through the real clipboard API. Assert visible keyboard focus and required control geometry from the computed production CSS. |
| Compound overlay | On `/components/dialog`, scope one canonical demo, open it by keyboard, verify its accessible name and initial focus, cycle focus within the modal, dismiss with Escape and assert focus return. Assert the visible popup/backdrop and contracted computed positioning/overflow. Existing exhaustive component tests retain other axes. |
| Studio draft history | Direct-load `/theme-studio`; commit a deterministic valid edit, assert a known preview token changes, reload and verify autosave restoration through the real production entry point, then reset the whole draft and undo that reset. Verify the pre-reset draft returns, including its lock/override state where seeded through supported controls. Assert the site header follows the chosen mode and the editor stays stock dark. At narrow width, use the shipped editor sheet controls and verify preview/editor reachability. |
| Studio pane boundaries, desktop only | At 1280×720 in both site modes, enter Compare and open an overlay in each pane. Check pane ownership, popup containment and resolved per-pane theme. Editing one draft updates both pane views while preserving their dark/light distinction; the surrounding editor remains unchanged. |
| Shipped elements | Load `/elements.html` with its built aggregate bundle and token CSS, wait for every tag used by the fixture to be defined, and verify each catalogue family appears. Exercise a button activation, Tabs keyboard selection and Tooltip focus/dismissal behavior; assert the resulting semantic state and computed token styling in each mode. The fixture already renders separate `data-theme` sections; scope each mode cell to its matching section and check document-level errors across the full page. Add any missing family specimen to this existing fixture as part of implementation, preserving it as a consumer of built files. |

This defines 22 required cells before feature registration expands their internal steps. The Executable feature map section defines stable IDs, source/route links and discovery; its registry must describe these obligations and drive selection, with no second handwritten runner inventory. Until that registry lands, the production gate cannot claim complete feature discovery. Additional required scenarios declared there join the full PR/release run.

Assert route-level horizontal fit at both widths with a documented one-CSS-pixel rounding tolerance. An intentional scroll container may overflow internally; it must remain usable and must not widen the document. Verify the target before checking geometry so an absent control or empty page cannot pass. Preserve long-page document scrolling and Studio's separate shell contract.

For computed styles, compare against resolved semantic tokens and explicit component contracts. Check focus outline visibility/width/style, popup positioning and required control/scroll dimensions where relevant. Avoid hashed class names, full computed-style snapshots or copied palette RGB literals. A production stylesheet-order regression must fail a semantic style assertion even if all development-mode tests pass.

Coordinate labels, control location and layout with [Build: Docs site UX refinement](https://github.com/frankieramirez/ultima/issues/424). The inspected checkout still calls its install header link “Documentation” and places its mode control in the footer. Do not assert proposed header controls, install tabs or canvas layout until the corresponding implementation is in the tested revision. When that build changes a contract, update the owning scenario in the same change. Do not use optional selectors or skip-on-missing logic to accept both a shipped regression and a future design.

### State, readiness and deadlines

Launch one browser per run and execute production cells serially. Create a new context/page for every cell, with explicit viewport, mode, locale `en-US`, timezone `UTC` and motion preference. Start with empty cookies, cache and browser storage; seed only each scenario's declared preconditions before loading the application. Grant clipboard permissions only to the local origin for the copy scenario. Use deterministic valid draft values and avoid unseeded shuffle as a prerequisite. Reset by closing the context even after failure. Preserve existing Vitest serialization independently.

Wait for the owned server identity, successful document/assets, the expected accessible application landmark and loaded application behavior. A 200 response alone is insufficient. Await `document.fonts.ready` and verify the expected self-hosted faces loaded; font fallback cannot count as screenshot readiness. Wait for custom-element definitions on element routes. Use bounded condition polling for layout and transition completion; do not rely on network-idle or fixed sleeps. Required same-origin asset failures, uncaught page errors and unexpected console errors fail the scenario. Any intentional diagnostic allowance must name an exact scenario, message and owning reason; broad console suppression is prohibited.

Run interaction/cascade checks with `reducedMotion: no-preference`, and wait for their expected end states. Add four explicit reduced-motion cells, at both widths/modes on the existing Spinner demo route: verify the looping animation stops under the actual media preference. This makes the initial minimum 26 cells. Keep the exhaustive motion assertions in Vitest. Capture evidence only after fonts and the relevant state settle. If an unrelated infinite animation must be suppressed for a supplementary image, label that image and retain the unmodified assertion result; it cannot prove motion behavior.

Initial operational limits are 15 minutes for build/preparation, 30 seconds for server readiness, 15 seconds per navigation, 5 seconds per asserted condition, 60 seconds per cell including readiness, and 10 minutes for the production matrix after build. Overall verification deadlines may shorten these limits. Record effective values; later baseline measurements may tune them through a reviewed configuration change. These are hang limits, not performance budgets. A build assertion/compiler failure is a validation failure; missing browser/dependency, launch failure or expired deadline is incomplete evidence under the verification exit contract.

Run once for gating, with no automatic retry converting a failed attempt to pass. An explicit diagnostic rerun keeps both attempts and the first failure visible. On assertion failure, finish evidence capture under a separate bounded teardown allowance, close the context and continue independent cells where the browser/server remains healthy. A browser crash marks the interrupted cell incomplete and remaining cells not run; a controlled later run is separate evidence.

Always close owned browser contexts, browser and server in a `finally` path. On cancellation or overall timeout, follow the verification runner's process-group shutdown contract, with five seconds of graceful shutdown before terminating remaining owned descendants. Record cleanup failures as incomplete and retain partial evidence. Never attach to or kill another run's browser/server by port or process name.

### Accessibility and evidence

Run the installed axe version after each row's principal ready state, in both modes/widths, with the repository's current applicable WCAG A/AA rules and color contrast enabled. For overlays also check the open state; for narrow navigation check the open menu. Reuse explicit, contract-backed exclusions from existing tests only where they still apply to the production DOM. Record rule IDs, affected nodes and the reason for any scoped exclusion. An inaccessible visible application shell cannot be excluded merely to make a demo pass. The existing full demo axe sweep and generated palette contrast gate remain required.

Every cell reports expected/executed scenario ID and parameters, assertion outcome, source/build identity, URL and duration through the verification schema. Retain server/build logs plus per-cell console/network errors. Start traces before navigation; retain a trace, screenshot and relevant DOM/accessibility diagnostics for failures where the page remains usable. Failure to capture an image must preserve the original error and report the missing artifact. Keep a settled screenshot for each passing cell as review evidence, labelled with revision, mode, viewport and scenario state. Images do not establish keyboard behavior or an accessibility pass.

Store artifacts inside the run's evidence directory, with a versioned machine-readable report and paths that exist. CI uploads the report and logs on every completed or interrupted job where teardown can run, and traces/screenshots when available, retaining them for seven days initially. Forced termination may leave an unfinished run manifest; it can never become a pass. Screenshots have no automatic pixel-diff gate in this first version. Interaction durations and traces are diagnostic; the measurement ticket defines repeatable performance evidence and any future budgets separately.

### Local, PR and release policy

Local component/feature/changed verification selects production scenarios through the proven dependency graph. If selection cannot establish complete affected coverage, run the full production matrix. The standalone package command runs the full matrix, and a direct internal adapter invocation is meaningful only with the verified run/build manifest. Help names build/browser prerequisites and links the report path.

After this gate's implementation passes its acceptance cases, every pull request and push to main runs the full required production matrix against its own production docs build. Do not use changed-path filters for this gate. Preserve existing typecheck, Vitest, contrast and registry checks. Budget CI job time for build plus matrix and upload/cleanup; splitting jobs is allowed only with a verified immutable build artifact and matching source manifest. An absent required cell, skip, unavailable prerequisite or missing report prevents the required job from succeeding. Branch protection configuration must be checked during rollout rather than inferred from workflow YAML.

Release validation runs all registered production scenarios plus full existing proof-bar suites and consumer installation for the same revision. Production docs prove deployed application behavior; consumer smoke separately proves registry copy-source dependencies and compilation in Vite/Next.js, as well as its existing element distribution assertions. Neither check substitutes for the other. Keep weekly/manual consumer smoke, and extend its PR input coverage to element sources and builds, authored catalogue metadata and generators as those become inputs. The final verification release plan always includes full consumer smoke even when a legacy workflow path filter would not trigger it.

### Acceptance evidence

Implementation must demonstrate the matrix on a named revision and retain the report. Inject a production-only stylesheet/order defect and show a computed-style assertion fail while a build still completes. Restore it and confirm a clean run. Separately break a required asset and a fixture bundle reference to prove readiness cannot accept an HTML fallback or an undefined element.

Exercise storage leakage between cells, a stuck readiness condition, absent required scenario, foreign server identity, browser launch failure, assertion failure and cancellation with live child processes. Show the correct failure/incomplete statuses, retained partial reports and released owned resources. Run two worktrees concurrently with distinct output roots and ports; seed different drafts and prove each report/evidence belongs to its own snapshot. Keep browser cells serial until a later isolation proof authorizes parallel execution.

Before switching CI to required, reconcile each scenario with the current docs UX revision, verify all 26 minimum cells execute, prove that a removed/skipped cell fails coverage validation, and run full consumer smoke. If implementation discovers an unsettled product behavior, resolve it through the owning product contract rather than inventing behavior in the test. No runtime implementation or successful production run is claimed by this decision.

## Executable feature map

Decided on [Executable feature map: scenario ownership and discovery](https://github.com/frankieramirez/ultima/issues/440). This section specifies contributor tooling to implement. Discovery and reproduction commands below are planned until their adapters and validation ship. The records, the registration helpers in `scripts/verification/` and the read-only `pnpm verify list` (with `--search`) and `pnpm verify describe` shipped with [Register scenarios and expose discovery](https://github.com/frankieramirez/ultima/issues/457), covering the `dialog` and `theme-studio` pilot. The execution modes resolve plans with `--plan` since [Plan conservative verification coverage](https://github.com/frankieramirez/ultima/issues/458) and otherwise report `unavailable`, and the production bindings under `apps/docs/tests/production/` are authored but have not executed.

### Ownership and storage

Keep authored records in `verification/features/<feature-id>.json` and `verification/scenarios/<feature-id>/<scenario-name>.json`, validated by a versioned schema under `scripts/verification/`. Read them as data; discovery must not import application modules, launch a browser or execute a test module. Reuse the shared catalogue model and TypeScript analysis for source references. Do not add executable commands, JavaScript expressions or callback bodies to JSON.

A feature is a named user capability, such as `theme-studio`, with one owning contract and a set of related scenarios. It can span components and packages. Its record contains `schemaVersion`, `id`, `title`, `summary`, search `aliases`, a local specification `contract`, catalogue `items`, and explicit non-catalogue `sourceRoots` for application behavior. The feature ID is unique kebab-case. Item references resolve through the existing item model, which derives their source/demo/test paths. Application roots must be repository-relative, exist, and describe real ownership. Shared dependencies are derived from imports, with narrow explicit extra dependencies only for runtime links such as loading a built element bundle by URL. Each extra dependency carries a reason and a validated item/path reference. Application features also name existing supporting check IDs or suite paths that import analysis cannot establish, validated against runner discovery. These references select existing checks without duplicating their assertions; feature selection unions them with the derived closure.

Scenario IDs have the stable form `<feature-id>.<scenario-name>`, with a kebab-case name. File path and ID must agree. Rename titles freely; retain IDs when the same behavioral obligation moves files. An intentional ID change updates every binding and reference in the same change and leaves a migration note on the build ticket. There is no silent alias from a removed scenario to a different obligation.

Each scenario record contains:

- Its ID, title, concise intent and owning contract reference, plus search aliases where the title misses a common user term.
- Catalogue item references and any narrower application source references needed for this behavior, resolved within the feature's declared ownership. Include executable demo module references where applicable.
- Route references: catalogue item routes are derived; application routes name their route definition and expected pathname; static fixtures name their checked-in HTML path and served pathname. Validate routes against the router/static-file inventory without starting the application.
- Ordered manual reproduction steps using accessible target descriptions, explicit preconditions and expected observable results. State keyboard input, commit actions and final focus where these matter. Prose describes the contract; assertions live in the executable test.
- Named fixture references and reset policy, with supported data and a reason for any seeded storage. Reuse real demos and existing draft fixtures. Fixture loaders belong to trusted runner adapters, never arbitrary metadata expressions.
- Required execution targets from a closed enum (`ui-vitest`, `docs-vitest`, `elements-vitest`, `production`), plus applicable mode/viewport/motion variants for each. Every required target has one canonical executable binding. Other tests can remain supporting proof without becoming substitute bindings.

A source path is ownership evidence, not proof that every behavior in that file has coverage. Report discovery completeness separately from execution coverage. Ordinary tests remain valid outside the scenario registry and keep their existing proof obligations. A new interaction or repaired user-facing regression must review the owning feature's scenarios; do not require a scenario record for every static type assertion or palette calculation.

### Executable bindings and discovery

Keep component tests in `packages/ui/src/__tests__/`, element tests in their current test directory, docs tests under `apps/docs/src/__tests__/`, and production scenarios under `apps/docs/tests/production/` as already decided. Metadata cannot move component tests beside production source.

Provide thin repository-local registration helpers for existing Vitest tests and production runner functions. A registration names a literal scenario ID and literal target, then accepts the existing executable callback. Source discovery recognizes imports of those helpers through the TypeScript checker and extracts literal IDs, target and file location. Do not discover bindings by scraping human test titles or searching arbitrary string literals. Dynamic scenario IDs and unsupported computed registrations fail with a repair diagnostic.

The helper expands the scenario's declared variants and gives each invocation a case identity consisting of scenario ID, target and canonical parameter tuple. The Vitest adapter registers normal tests and reports their case identities through its reporter; the production adapter loads only the selected trusted test files after planning. Existing unparameterized Vitest callbacks use one explicit default variant; declaring mode/viewport variants requires the fixture to apply and report them. A helper cannot label one execution as multiple cases. Helpers add registration/reporting only. They must not introduce a generic action language, another assertion library or their own browser lifecycle.

Join records to discovered bindings in memory. The feature record does not list its scenarios; directory discovery derives membership. Scenario records declare required targets but never repeat binding paths or human test names. Generated discovery output supplies those paths and reproduction commands. The runner enumerates that joined model instead of keeping a second list. One binding per scenario/target is required; parameter variants share that binding. If two independently owned obligations need separate executions, give them separate scenario IDs.

An existing behavior test can receive a registration ID around its current callback. Preserve its assertions and setup. Share plain fixture data and small locator/assertion helpers only when their meaning and execution environment agree. Production tests still navigate the real app, while Vitest mounts its fixtures. Keep scenario helpers outside `apps/docs/src/demos/**/*.tsx`, whose existing glob adds every module to the automatic axe sweep. Preserve that sweep independently. Both may prove the same invariant at these distinct integration boundaries; do not delete development proof to avoid that necessary overlap or force the two APIs through a new abstraction framework.

Derived discovery is available in memory and through JSON stdout; keep a generated, ignored copy in each verification report directory with its source-manifest hash. `pnpm verify list` generates it afresh. Do not commit a second scenario index or use a previous report's catalogue as current discovery. The metadata/generator freshness preflight also validates this model, while `pnpm verify list` and `describe` validate it directly. Any future committed documentation projection must use the existing deterministic generation/check mechanism.

### Validation and coverage

Reject duplicate IDs, unknown fields, absent owners, invalid item references, broken contract anchors, paths escaping the repository, missing demo/fixture/source files and unsupported routes. A declared source root must contain owned source. Resolve symlinks before enforcing path boundaries. Every executable registration must have a record, and every required target must have its binding. A renamed/deleted binding must produce an error that names the scenario and expected target.

Compare planned cases with cases actually reported by each runner. Missing, duplicated, skipped or unexpected case identities cannot produce complete coverage. A zero-test success or a passing screenshot cannot satisfy an expected scenario. Malformed discovery is a validation failure; a missing runner/prerequisite is incomplete execution under the verification exit contract. Read-only discovery exits nonzero for malformed records and never reports a runtime pass.

Required production variants come from these records, and the production runner consumes them directly. Preserve the matrix settled above with initial feature/scenario IDs:

| Feature and scenario ID | Production variants |
| --- | --- |
| `site-navigation.route-and-mode` | Dark/light × desktop/narrow, normal motion |
| `catalogue.filter-and-demo` | Dark/light × desktop/narrow, normal motion |
| `dialog.keyboard-dismissal` | Dark/light × desktop/narrow, normal motion |
| `theme-studio.draft-history` | Dark/light × desktop/narrow, normal motion |
| `theme-studio.pane-boundaries` | Dark/light × desktop, normal motion |
| `elements.fixture-interactions` | Dark/light × desktop/narrow, normal motion |
| `motion.reduced-loop` | Dark/light × desktop/narrow, reduced motion |

These are the same 26 production cells already decided. Splitting a long scenario is allowed when the replacement IDs retain every obligation and matrix variant, and the reviewed migration records the correspondence. Counts alone do not establish equivalent coverage. Keep a small, independent acceptance fixture for the required obligations and variant expansion; mutation tests must catch a removed target or light/narrow variant. This fixture is a contract test, not a runtime discovery source. Adding a new required production scenario automatically adds its cases to full PR and release verification.

Source import closure plus explicit validated runtime dependencies connects records to changed-file selection. A feature selection includes all its scenarios, affected item proof-bar checks and required build/install checks. A component selection finds scenarios through item references, demo imports and reverse dependencies. Base/current discovery both participate for deletions and renames, as the verification contract requires. Unknown ownership or unsupported dynamic edges expand to release; they cannot silently omit scenarios. Scenario metadata and its executable binding are themselves check inputs. Changes to shared schema/helpers/runner configuration require full release validation.

### Discovery commands and ambiguous reports

Extend the planned read-only interface with:

```sh
pnpm verify list --search "picker" --json
pnpm verify describe scenario dialog.keyboard-dismissal --json
pnpm verify describe feature theme-studio
pnpm verify feature dialog --plan --json
pnpm verify feature theme-studio
```

`list --search` searches feature/scenario IDs, titles, aliases and catalogue item names/descriptions, returning typed candidates with match reasons. Use deterministic token matching and ordering: exact ID/name before alias, then title/description matches, with ID as the final tie-breaker. Never execute a search result automatically. No matches is a valid empty discovery result with a suggestion to inspect the full list; it is not passing verification. Unknown IDs supplied to `describe` or executable selectors exit 2 with available choices.

`describe` returns ownership and contract links, real route/fixture references, preconditions, reproduction steps and expected observations, required variants, binding source locations and planned verification commands. Plain-text output and versioned JSON contain the same facts. Generated commands use validated IDs and the CLI's supported modes. A feature command runs that feature's required cases plus its dependency checks; this first version does not add a scenario-only execution mode or claim a single-case pass from a whole-feature command. `describe scenario` names that broader scope explicitly.

For “the picker broke”, return Date Picker as a catalogue candidate with `packages/ui/src/date-picker.tsx`, its derived docs route `/components/date-picker` and `pnpm verify component date-picker`. Also show other matching items and registered feature aliases, such as a Studio color-editing candidate when that behavior is registered. A catalogue-only match must say no executable feature scenario is registered yet and still point to the existing component proof. Do not fabricate a Date Picker production scenario from a search hit or assume which picker the user meant. The agent uses the reported symptom to choose or asks for the missing context.

### Pilot and reuse

Implement two feature records first: `dialog` and `theme-studio`, with the canonical bindings below. The pilot demonstrates registry mechanics; it does not by itself satisfy the full production matrix or release gate.

For `dialog.keyboard-dismissal`, reuse `apps/docs/src/demos/dialog/basic.tsx` and the owning Dialog contract. Attach the UI binding to the existing keyboard/focus test in `packages/ui/src/__tests__/dialog.test.tsx`. The UI fixture and docs demo retain their own accessible names (currently “Archive run” and “Archive report”); do not assume they are identical or import a test module into the docs app. Its production binding opens that demo at `/components/dialog` using an accessible trigger, verifies title and initial focus, proves Tab/Shift+Tab containment, dismisses with Escape and checks trigger focus. Begin closed and destroy the mounted fixture or browser context afterward. Preserve the existing UI test's variants; the production binding runs all four declared mode/viewport cases.

For `theme-studio.draft-history`, own the scenario at `/theme-studio` and the existing theme draft/history contracts. Reuse the current docs history test in `apps/docs/src/__tests__/theme-studio.test.tsx`; extract its reset/undo segment into a focused registered test if required, retaining shuffle and redo assertions in supporting tests. Use a valid deterministic edit, an override and a lock set through supported controls. Record the draft state before reset, perform whole-draft reset, verify the specified reset state, then undo once and verify the original draft/override/lock state. Assert observed preview values as well as controls, so clicking a button alone cannot pass.

The production binding additionally reloads to prove persisted draft restoration before testing reset/undo. Reload restores the draft but does not imply restoration of prior undo history. Make the reset a new undoable action after reload. Begin with empty storage and URL fragment, keep storage within this one reload journey, and close the context afterward. Use the shipped narrow editor controls where necessary. Share fixture values with the docs test; do not mock the reducer or call internal state setters in production to bypass the UI.

Keep export-parity checks in `apps/docs/src/__tests__/theme-studio-export.test.tsx` and `theme-studio-parity.test.tsx` within the Studio feature's supporting coverage. A native-download/share-link scenario can be added when that behavior is the subject of a change; it is outside the initial pilot. Existing export checks still run when Studio is selected. The feature map must not turn unregistered supporting tests into skipped validation.

After the pilot proves registration, discovery and execution, register the remaining production groups from the table. Element scenarios reference shipped `ult-*` items and their existing fixture, keeping React and element target identities distinct. Recipe scenarios reference the recipe descriptor and its executable demo; they gain no registry item. Setup installation remains a check in the verification DAG rather than an invented browser journey.

### Author guidance and maintenance

When implementation lands, update `skills/forge` to discover related features before editing behavior, keep its eight-item proof bar, and register or revise the scenario for an affected user-facing obligation. The scaffold can emit a visibly incomplete scenario-record template once the author supplies a settled contract; it cannot invent expected behavior or a passing binding. Static validation rejects incomplete records until they are finished.

Update `.agents/skills/testing-ultima-docs` to start from `verify list`/`describe`, follow the recorded accessible steps and run the production command when production proof is required. Retain its development workflow for exploration, clearly labelled with the execution environment. Replace drifting assumptions about fixed control locations with links to current owners and scenario records. These skill edits belong to implementation; this planning session does not advertise unavailable commands as usable tools.

Keep `AGENTS.md` as an index linking the owning infrastructure section. Contributor scenario records and runner dependencies stay repository-local and outside installed component source. Consumer guidance remains hosted/generated through the existing agent guide. Do not copy the internal execution registry into `/llms.txt`; retain visitor-facing component usage and installation guidance there.

When a behavior changes, update its contract, executable assertion and scenario reproduction steps in the same review. Structural validators cannot prove the prose matches the assertion, so the reviewer checks that correspondence explicitly. A recurring agent mistake should produce a precise rule, assertion or corrected canonical example under the adoption decision, rather than another loosely maintained checklist.

### Acceptance evidence

Before widening beyond the pilot, demonstrate read-only discovery with no browser or application startup, one registered Dialog test and one Studio test in their existing Vitest suites, and the corresponding eight production cells. Retain each run's planned and executed case IDs plus source identity. Run the full existing suites to prove that registration has preserved their assertions and teardown.

Use negative fixtures for duplicate records/bindings, an orphan binding, absent target, invalid route/contract anchor, stale source path, unknown item, malformed variant and a required light/narrow variant removed from the model. Prove that skipped and zero-case runner reports are incomplete, and that unknown changed-file ownership expands coverage. Renaming a display title must leave IDs and selection unchanged; deleting a binding must fail before a stale generated index can hide it.

For discovery, use the same named checkout and scripted prompts before and after the change: “Dialog Escape leaves focus behind”, “Reset theme undo lost my override”, and “the picker broke”. Record time to find the owning source and a valid reproduction command, number of files/searches opened, returned candidates and mistakes. The implemented index must expose owner, route and runnable scoped command within a `list` plus `describe` lookup for each registered pilot scenario. The picker prompt must return Date Picker and any matching alternatives with reasons and an honest registration status. Do not impose an invented percentage speedup; the measurement decision owns repeated-run timing and noise treatment.

Finally enumerate and execute the full 26-cell production contract through the same discovery model, then run release validation. Evidence must show that the production runner has no separate hand-maintained scenario list and that scenario edits propagate to selection and reports. This decision claims no shipped registry, measured discovery speedup or runtime pass.

## Efficiency and performance

Decided on [Efficiency and performance: baselines, budgets, and optimization triggers](https://github.com/frankieramirez/ultima/issues/441). This contract specifies the evidence the build effort must collect before changing implementation. It establishes no measured speedup or new timing gate.

Use the settled [verification CLI](https://github.com/frankieramirez/ultima/issues/438), [production browser contract](https://github.com/frankieramirez/ultima/issues/439), and [executable feature map](https://github.com/frankieramirez/ultima/issues/440) for workload selection and source identity. Their contracts appear in the sections above; the issue resolutions retain the recorded decisions.

### Workloads and comparable coverage

The first build slice captures a baseline on the revision before contributor-tooling changes. Add only the measurement harness to that baseline and record its patch/hash separately. Keep fixtures and the harness version identical for the comparison. Later slices capture their own parent/candidate pair so unrelated changes do not receive credit.

| Workload | Evidence required |
| --- | --- |
| Single React edit with Dialog as the pilot | Discover ownership and run existing checks that prove the intended change, then compare with the planned component/feature selector. Record selected checks, cases, expansions and omitted coverage. |
| Studio draft/history edit | Find the owning source and reproduction from the fixed prompts below; run its supporting tests and required production variants. |
| Shared token edit | Exercise conservative expansion to the full release plan, including contrast, React, shipped elements and consumer installation. |
| Element family edit | Use the shipped button family to measure family proof, parity, bundles and the fixture. |
| Setup item and recipe | Measure existing install-smoke coverage for setup and owning demo/axe coverage for a recipe; keep their different distribution obligations explicit. |
| Ordinary component addition and removal | Repeat the metadata decision's synthetic addition in disposable baseline/candidate checkouts with the same settled contract, dependency, demo and proof. Count manual coordination edits and verify removal leaves no stale membership. |
| Full release | Record total elapsed time and per-check time for the complete existing release policy, including production coverage when available. |

Measure the whole supported command and its phases separately: current docs tests and builds invoke registry prerequisites. Record generated JS/CSS bytes and initial route loading as diagnostics if a change proposes lazy loading; those observations establish no new size gate.

Baseline commands must exist at that revision. Store the exact argument arrays, working directories, prerequisite steps and resulting coverage with each workload. If production scenarios do not exist yet, the measurement slice may add the same observation harness to both builds. Report the new coverage and its cost separately from any same-coverage timing comparison. A narrower selector may save time by avoiding unrelated work; name that reduction and show it retains every required affected check. It cannot establish a faster full suite.

Use the feature-map prompts verbatim: “Dialog Escape leaves focus behind”, “Reset theme undo lost my override”, and “the picker broke”. Start from the same task description and repository entry point. Record time to locate the owner and a valid reproduction command, searches/files opened, wrong candidates, failed commands and corrective edits. A successful lookup identifies the source and runnable coverage; a plausible answer with an invalid command fails the exercise.

Count distinct manually coordinated files and edit operations for catalogue/barrel/router/optimizer wiring separately from authored behavior, docs and proof. Preserve the metadata decision's target of zero manual projection edits for an ordinary component addition, and the feature-map target of owner/route/scoped command within `list` plus `describe` for registered pilot scenarios. Record unsupported cases and dependency-policy decisions explicitly.

For agent-assisted discovery record model/version when available, tools, starting context and prompt, plus operator/session identity. Reset disposable workspaces between attempts and counterbalance which revision is attempted first. A session that already learned the answer is a learned-condition observation; it cannot serve as a naive discovery baseline. Record directly observed corrections with their cause and denominator. PR counts, generated lines and remembered impressions cannot establish agent productivity. Timing observations remain limited to these tasks and conditions.

### Run protocol and evidence

Record commit IDs, dirty patch and source-manifest hashes, harness/fixture hashes, lockfile hash, runtime/package-manager/browser versions, OS, CPU/RAM, power mode, runner identity/class, concurrency, viewport, mode, motion preference and any throttling. Use the verification report's identity and evidence directory when available; the baseline harness records equivalent fields. Pin the dependency versions for each revision and disclose any required version change. Different hardware, throttling or runner classes produce separate series.

Install dependencies and browser binaries before measurement. Report their setup/download cost separately. Each command run starts a fresh process. Define application-cold as cleared, explicitly inventoried build/Vite/verification caches and generated outputs needed by that workload, with dependencies present; define warm as those outputs retained after one unmeasured priming run. List every cleared/retained path. OS page caches remain uncontrolled and disclosed; this protocol never calls a fresh process a cold machine. A browser-cold run uses a new context and navigation with reset storage and browser cache; a warm interaction run begins after route readiness and one unmeasured sequence, with the draft reset to the same fixture.

For commands, collect five valid measured runs per revision, workload and cache condition. Alternate baseline/candidate order across pairs; clean the same cold inputs before every cold sample. For each production Studio interaction cell, collect five independent browser sessions, each with twenty measured repetitions after priming. Reset the draft between sequences. Report the first navigation/interaction separately so repeated runs do not conceal startup cost. For human/agent discovery and addition exercises, retain at least three paired attempts and their order/learning conditions; treat that small sample as descriptive evidence.

Keep raw samples with run IDs and monotonic elapsed times. Report command median, range and median absolute deviation. For interactions report each session's median and nearest-rank p95, plus the median and range of those session summaries; label sample counts and keep individual events. Report failures/timeouts and missing instrumentation alongside valid runs. Failed runs cannot become fast successful samples. Exclude a sample only for a documented harness/environment fault under a declared rule, retain it with the reason, and collect its replacement. Do not remove slow valid samples.

Compare paired differences under matching conditions. If the median change is within the larger revision's median absolute deviation, or pair directions conflict, mark the result inconclusive and repeat the complete batch once after investigating contention. Continued instability remains advisory and blocks claims of a measured gain. Larger changes still require raw evidence and correct coverage; this rule is an investigation screen, not a statistical significance claim. Percentages may appear only with the absolute baseline/candidate values, sample counts and conditions that produced them.

The machine-readable performance artifact records schema version, workload and case IDs, source/environment identity, setup/cache policy, ordered raw samples, coverage, exclusions, summaries, comparator identity and budget status. Keep a human report beside it linking logs and traces. Retain CI diagnostic artifacts under the production contract's initial seven-day policy; store the small baseline samples, approved budget manifest and report with the build effort's durable evidence so budget decisions survive artifact expiry. Evidence paths must resolve. A missing comparable baseline yields `unavailable`, never a measured pass or zero regression.

### Production Studio measurements

Measure the built docs in Chromium using the production runner's verified build identity, isolation and readiness. Collect dark/light at desktop and narrow viewports, retaining separate results for every cell. Coordinate selectors and behavior expectations with [Build: Docs site UX refinement](https://github.com/frankieramirez/ultima/issues/424). A changed UI contract requires a versioned workload and a new comparable pair.

Use deterministic draft fixtures: stock, a customized draft with guided values and per-mode overrides, and the largest valid override set allowed by the current schema. Include a failing-contrast fixture. Fixtures must stay within supported product input. Record their seed and content hash. Measure a guided edit, repeated slider/key edits, a semantic override, Reset followed by Undo, preview mode/theme changes, bounded Shuffle success/exhaustion, and each export format. Separate per-edit cost from a burst's final settled result.

Record browser-side marks from input-handler entry to the committed draft, resolved token result and contrast result, then to the corresponding visible preview update. Record export activation to generated bytes/download initiation or explicit failure; OS save dialogs and network sharing are separate. Observe the rendered style/result tied to that draft and the next frame opportunity. Label this an application-observed update latency; a frame callback alone does not prove physical pixels reached the display. Runner locator/polling time is orchestration overhead and must not become the browser interaction duration.

Collect input event timing and long-task entries where the pinned browser supports them, recording supported entry types and missing observations. Keep count, total duration and longest observed task for the marked interval. Retain a separate diagnostic trace and profiling run to attribute work to `resolveDraft`, contrast `gate`, React rendering, style/layout, shuffle and serialization. Use the same instrumentation in both measured builds and disclose its overhead; detailed profiling runs stay outside the timing batch. Scripted interactions are laboratory observations and cannot establish a field INP score.

The current `useMemo` calls identify places to profile. Their presence establishes no bottleneck. Check repeated resolver/gate calls in exports and bounded Shuffle separately before changing execution architecture. Assertions must still prove contrast, draft/history and exported values agree; an early stale render or outdated export cannot count as fast completion.

### Budgets and CI policy

Keep existing element gzip budgets and all correctness, contrast, accessibility, coverage and consumer-install gates. The production runner's navigation/readiness/assertion deadlines remain operational hang limits. Timing begins as report-only in local, PR and release runs; label each metric as measured, unavailable or unstable. Missing required correctness evidence still fails under the verification contract.

After the baseline, propose a versioned budget per workload, metric, cache state and runner class. Store units, absolute ceiling, baseline reference, sample/aggregation rule, owner and review rationale. Derive the initial regression allowance from the largest observed spread across three independent complete baseline batches on the intended runner class, and state any additional approved headroom in absolute units. Choose a ceiling above that measured envelope and document the user/feedback-loop requirement it protects. If the baseline already misses the desired responsiveness goal, file optimization work and report that gap; a permissive baseline-derived ceiling cannot declare the goal met.

Promote only metrics whose repeated batches are stable and whose harness/negative fixtures detect a seeded regression. A reviewed build change must approve the exact numeric ceiling and its rationale before CI can block on it. Until then budgets report. Timing gates require dedicated or demonstrably comparable runner conditions. On a violation, retain the failed batch and run one whole confirmation batch; two comparable violations fail the performance check. Conflicting batches or changed runner identity produce an unstable/unavailable status requiring investigation, with no passing performance claim. Once a metric gates, missing or unstable evidence makes that required performance check incomplete. It cannot silently revert to advisory.

Baseline/budget refresh requires review with the previous comparison attached. A slower candidate cannot reset its own baseline to pass. A workload, browser or runner change records why the old series is incompatible and gathers a new series before promotion. Correctness failures take precedence over performance interpretation.

### Optimization and asynchronous ordering

Adopt a worker or other asynchronous boundary only when comparable production runs miss an approved interaction goal, profiles attribute the delay to movable CPU work, and a prototype improves the affected metric beyond measured noise after serialization, transfer, scheduling and rendering costs. First evaluate redundant computations and recomputation scope. If rendering/layout dominates, moving arithmetic to a worker needs separate evidence. Keep the existing synchronous path when the evidence is inconclusive. This decision authorizes a future evidence-backed proposal, not a speculative rewrite.

An asynchronous proposal must specify request identity as a monotonic draft revision plus input/recipe identity. Every draft-changing action, including edit, Undo/Redo, Reset, import and Shuffle, invalidates older work even when values happen to match an earlier draft. Apply a result only to the matching current revision and input. Publish resolved tokens and contrast results for one revision together; pending/error state must be explicit. Cancellation is an optimization and cannot replace stale-result rejection.

Export must capture the revision requested at activation and either await a matching coherent result or stop with an explicit retry/error when that revision is superseded. It may never combine a new draft with old contrast or resolved tokens. The proposal must preserve the existing history/commit semantics and describe error recovery and teardown without changing public behavior silently.

Required deterministic tests control completion order: request A then B, complete B then A; return to A's values under a new revision; Reset/Undo/import while work is pending; export while pending or after a newer edit; worker failure, cancellation and unmount followed by late completion. Assert preview, contrast and export identity, history integrity and listener/worker cleanup. Compare synchronous and asynchronous results for the same valid fixtures, including contrast failures and Shuffle exhaustion. Run production interaction proof and the existing parity/export suites after the isolated ordering tests.

### Build acceptance

The build effort delivers the baseline harness and durable raw samples before optimization, then captures matching after-results for every changed workload. Validate aggregation and statuses with fixtures for missing baselines, failed runs, documented exclusions, mismatched conditions and a seeded timing regression. Exercise the real command/browser path; fixtures alone cannot establish a performance gain.

Acceptance requires correct coverage, the settled wiring/discovery targets, and an honest comparison report. A result of unchanged or inconclusive timing is valid evidence and must remain visible. Any unmet improvement goal gets an explicit follow-up with its evidence and boundary. The adoption decision assigns rollout slices and owners; this section supplies their measurement contract.

## Adoption and maintenance

Decided on [Adoption and maintenance: rollout, canonical examples, and build handoff](https://github.com/frankieramirez/ultima/issues/442). All planning decisions for this effort are settled. This section orders implementation and defines completion; it does not certify that the planned tooling exists.

### Authority and delivery ownership

The principles, component contracts and ADR amendments define permitted behavior. This document owns contributor enforcement, metadata, verification and measurement. Authored descriptors own catalogue facts; authored scenarios own discovery and declared obligations, with executable assertions in their bound tests. Generated projections remain outputs. Skills explain how to use those owners and must link their contracts rather than introduce new exceptions.

The maintainer reviewing a build slice owns its contract migration and exception approval. The build ticket names the implementer, reviewer and source revision before it can close. An agent may propose a narrow exception with authority and proof; an existing violation does not supply authority. If the owning product contract leaves behavior unsettled, file a precise decision in that product effort and block only dependent work. Unrelated slices may continue. Do not reinterpret the architecture checker as permission to change a public API.

Keep one shared TypeScript source-analysis implementation and catalogue model. Checker rules, generation and verification consume it through small interfaces. Keep check adapters and scenario bindings specific to their existing runners. Generic action languages, arbitrary metadata commands and a second test/demo platform remain excluded.

### Ordered build slices

[Build: Verified contributor infrastructure for Ultima](https://github.com/frankieramirez/ultima/issues/447) implements these slices, with this map as its planning source. The IDs below are the adoption resolution's slices and dependencies; [Filed build order](#filed-build-order) maps them to issues. A slice closes only with its stated negative tests and real repository evidence. Split an oversized slice along its listed outputs when filing, preserving the dependency and acceptance boundaries.

| ID | Deliverable | Depends on | Required exit evidence |
| --- | --- | --- | --- |
| A | Baseline harness and migration inventory | None | Fixed workloads and fixtures, raw baseline samples under the measurement protocol, current export/route/dependency snapshots, existing command/check inventory and recorded environment. Preserve before-revision inputs for later comparisons. |
| B | Shared source analysis and typed catalogue model | A | Per-kind schemas and complete authored metadata for React, elements, setup, source bundles, artifacts and recipes; bidirectional membership validation, source-derived exports/dependencies and independent negative fixtures. Existing consumers still run. |
| C | Deterministic projections and consumer migration | B | Generate the fixed outputs in comparison mode, prove public/order/dependency equivalence, switch adapters, and add freshness preflights. Generation works with projections absent; repeated generation gives zero diff. Real browser startup and full consumer smoke pass. |
| D | Non-overwriting scaffold | C | React/element/recipe dry-run and write flows, collisions/concurrent edits/partial write proof, incomplete markers, synthetic addition/removal and zero ordinary manual projection edits. Update Forge wiring guidance in this slice. |
| E | Architecture engine and source/import rules | B | Static text/JSON command, scope inventory, diagnostic/exception validation, `ULT-SOURCE-001`, `ULT-IMPORT-001`, `ULT-PRIMITIVE-001` and unresolved-analysis behavior. Whole-scope cleanup and clean blocking evidence for delivered rules. |
| F | Token, style and docs enforcement | E | `ULT-TOKEN-001`, `ULT-STYLE-001`, `ULT-DOCS-001/002` and the docs advisory; declaration-scoped migration of the old scanner, valid runtime/style cases and forbidden mutations. Retain browser cascade proof. |
| G | API and registry enforcement | C, E | `ULT-API-001/002`, `ULT-REGISTRY-001`, real compiler positive/negative cases, registry membership/staging proof and final full architecture scan. All specified blocking rule families are active. |
| H | Scenario schema, bindings and read-only discovery | C | Dialog and Studio records/bindings in existing suites; list/describe and validation without app startup; source/route/variant negative tests and retained supporting suites. Partial executable verification remains unavailable until its adapters land. |
| I | Verification planning, snapshots and process lifecycle | G, H | Conservative base/current dependency selection, immutable dirty-source identity, check DAG and versioned reports; controlled failure/cancel/timeout cases and two-worktree isolation. Missing required adapters report incomplete. |
| J | Existing-check execution adapters | I | Real static/type/unit/browser/axe/parity/palette/build/install execution, preserved preparation and serialization, JSON/human agreement and selection acceptance cases. Production remains explicitly unavailable until K/L. |
| K | Production runner and Dialog/Studio pilot | I, H | Verified build/server identity, isolated contexts, cleanup and failure artifacts; all eight pilot production cells plus existing registered tests. Production-only CSS and asset failure injections fail correctly. Standalone entry uses the same run infrastructure. |
| L | Full production matrix and required CI | J, K | Register and run all seven groups/26 minimum cells, verify dropped/skipped-case failures, extend smoke input coverage and preserve full release obligations. Check required-status configuration and retain a real clean CI run. |
| M | Comparable measurements and any justified optimization | D, L | Repeat baseline workloads on the completed tooling; publish raw comparisons and wiring/discovery evidence. Record unchanged/inconclusive results honestly. Any optimization gets its own measured before/after change and all affected correctness proof. |
| N | Final author guidance and release handoff | F, G, M | Complete canonical-example index and skill updates, runnable documented commands, full release and consumer evidence at one revision, maintained ownership links and an explicit disposition for every scoped area. |

E and C may proceed independently after B if they coordinate shared analysis/model files. F and G may proceed independently after their prerequisites. H exposes only implemented discovery operations; I/J must never let a partial release command report success. K uses registered pilot scenarios from H, so the production runner never needs a temporary competing scenario list. L expands that model and becomes the full gate.

A may add a portable measurement-only browser harness to the unchanged application where the baseline lacks production execution. Keep its hash identical across paired builds and limit it to observation under the measurement contract. It must not become the production gate's alternative scenario inventory.

### Filed build order

The build effort files 19 tickets in this claim order. Ticket 1 is the specification handoff that precedes every slice. Four slices split along their listed outputs: F, I, J and L each become two tickets. The split tickets together carry the slice's exit evidence, and dependencies follow the slice table once the splits are unrolled.

| # | Ticket | Slice | After |
| --- | --- | --- | --- |
| 1 | [Reconcile and commit the infrastructure specification](https://github.com/frankieramirez/ultima/issues/448) | Handoff | None |
| 2 | [Capture baselines and migration inventory](https://github.com/frankieramirez/ultima/issues/449) | A | 1 |
| 3 | [Validate typed catalogue metadata](https://github.com/frankieramirez/ultima/issues/450) | B | 2 |
| 4 | [Generate catalogue wiring and migrate consumers](https://github.com/frankieramirez/ultima/issues/451) | C | 3 |
| 5 | [Add safe component scaffolding](https://github.com/frankieramirez/ultima/issues/452) | D | 4 |
| 6 | [Enforce source and import architecture](https://github.com/frankieramirez/ultima/issues/453) | E | 3 |
| 7 | [Enforce token and styling contracts](https://github.com/frankieramirez/ultima/issues/454) | F: token and style rules | 6 |
| 8 | [Enforce docs controls and surface rules](https://github.com/frankieramirez/ultima/issues/455) | F: docs rules and scanner migration | 6 |
| 9 | [Enforce public API and registry contracts](https://github.com/frankieramirez/ultima/issues/456) | G | 4, 6 |
| 10 | [Register scenarios and expose discovery](https://github.com/frankieramirez/ultima/issues/457) | H | 4 |
| 11 | [Plan conservative verification coverage](https://github.com/frankieramirez/ultima/issues/458) | I: selection and planning | 9, 10 |
| 12 | [Isolate verification runs and process lifecycle](https://github.com/frankieramirez/ultima/issues/459) | I: snapshots and lifecycle | 11 |
| 13 | [Execute static, type and unit checks](https://github.com/frankieramirez/ultima/issues/460) | J: static, type and unit adapters | 12 |
| 14 | [Execute browser, build and install checks](https://github.com/frankieramirez/ultima/issues/461) | J: browser, build and install adapters | 13 |
| 15 | [Run the production Dialog and Studio pilot](https://github.com/frankieramirez/ultima/issues/462) | K | 12 |
| 16 | [Complete the production scenario matrix](https://github.com/frankieramirez/ultima/issues/463) | L: all 26 cells | 14, 15 |
| 17 | [Require production verification in CI](https://github.com/frankieramirez/ultima/issues/464) | L: required CI and smoke inputs | 16 |
| 18 | [Compare efficiency and performance](https://github.com/frankieramirez/ultima/issues/465) | M | 5, 17 |
| 19 | [Complete author guidance and release handoff](https://github.com/frankieramirez/ultima/issues/466) | N | 7, 8, 9, 18 |

K reaches H through ticket 11. G's all-family architecture proof includes tickets 7 and 8 when they land; ticket 19 follows all three, so the final release scan runs with every blocking rule family active.

### Migration and promotion

Before enabling each rule, enumerate every diagnostic in its complete applicable source scope. Record the exact site, rule, owning contract and disposition in the build ticket's retained inventory. Fix violations with affected behavioral proof; encode reusable contract-backed allowances in policy fixtures; add narrow typed exceptions only for the remaining authorized sites. An unresolved diagnostic cannot disappear through an exclusion or a larger allowlist.

Run a new rule in an explicitly advisory development phase while its fixtures and cleanup are incomplete. That phase ends within the rule's delivery slice: all scope inventory entries are resolved, prohibited mutations fail at the intended location, legitimate examples pass, and the full rule run becomes blocking. Keep `ULT-DOCS-REVIEW-001` advisory because its heuristic cannot establish arbitrary widget correctness. Timing has the separate promotion policy in the measurement section. Existing contrast, parity, accessibility, size and type gates retain their force throughout migration.

Retire a replaced scanner or authored wiring list only in the change that proves the replacement covers its existing contract and accepted exceptions. Keep the old check until then. Compare old/new results on the repository and on independent valid/invalid fixtures. Intentional extra coverage must name the new rule and its cleanup. A smaller diagnostic count alone does not establish equivalence.

Freshness checks run read-only before generation or tests can repair outputs. Rule/scenario validators reject stale owner links and unmatched exceptions. Generated projections have their fixed ownership header; discovery reports identify the source manifest. Reviewers check semantic prose/assertion correspondence because a valid link alone cannot prove agreement. Each contract change updates its checker fixture, scenario or canonical example and relevant skill in the same review.

Promotion to required CI needs a named clean run on the intended runner, complete expected/executed coverage, tested negative failures and verified artifact upload/cleanup. Verify the repository's actual required check names and branch rules through read-only settings inspection. If changing those settings needs maintainer access or approval, record that concrete action on L and keep its protection acceptance incomplete until confirmed; workflow YAML alone cannot establish enforcement. Recompute workflow timeouts from the measured build/matrix limits, including upload and teardown, rather than squeezing the new checks into the old job timeout.

If a promoted check malfunctions, preserve its failing report, file the defect and identify the affected proof. Fix or revert the faulty implementation with the previous validated checks restored. A broad suppression, silent required-check removal or fabricated passing report cannot serve as a rollback. Any temporary reduction of required coverage needs an explicit maintainer decision with scope, owner and restoration condition, and the effort cannot close with that gap unresolved.

### Canonical examples and recurring corrections

Add a concise `docs/agents/canonical-examples.md` index during implementation. Each entry names the contract, actual source symbol/part, demo or fixture, proof file and the pattern it demonstrates. Link to production source and tests rather than copying implementations. Validate referenced paths/symbols and contract anchors with the existing tooling model. Revisit examples when their source contract changes; do not freeze an old component as universal authority.

Retain Forge's existing Button and Dropdown Menu source examples. Add Dialog for compound composition and keyboard proof, Date Picker for the bounded Zag React contract, and Toast for runtime geometry and token expressions. Use the shipped `ult-button` and `ult-tabs` families for element lifecycle/parity. Include a real recipe and Vite/Next.js setup item to make their registry distinctions explicit. Studio's history and export tests demonstrate application-state proof. These are candidate exemplars: review each against the final rules before calling it canonical; repair or choose another scoped example when it fails.

When an agent correction recurs, record the smallest reproduction and the violated owning contract on a maintenance ticket. Prefer a type constraint for an expressible API restriction, a precise architecture rule for a static violation, a behavioral scenario/test for observable state, or a repaired example/skill instruction for discovery and authoring mistakes. Add positive and negative proof where enforcement changes. Record why human review remains necessary when none can prove the issue. Avoid accumulating duplicated prose instructions and blanket comment bans.

Forge remains a React authoring skill. Update it when the corresponding commands ship: discover ownership/scenarios, use the descriptor/scaffold, run generated freshness and applicable architecture checks, retain the eight-item proof bar, and report scoped versus full validation. Include a real dry-run and completed synthetic authoring exercise as proof that the instructions work. Replace the current proof-bar advice that isolated passes can excuse a failing full suite: retain every failed required check and investigate it under the verification outcome contract. An isolated rerun provides diagnostic evidence and cannot override the required full result. Element scaffolding supplies files and wiring; element behavior still follows the Web components contract and parity gate. Expanding Forge into element authoring is outside this delivery.

Update `.agents/skills/testing-ultima-docs/SKILL.md` alongside production/discovery delivery to distinguish exploratory development runs from production proof and to use current scenario reproduction instructions. Correct the current docs-testing skill's stale assumption that mode controls live in the header, using the actual tested UX revision; verify its runtime and browser-tool instructions when updating it. Keep `AGENTS.md` as a short index and advertise commands only after their implementations pass. Validate help/examples from a clean disposable checkout, including failure and missing-prerequisite output. Consumer guidance keeps its hosted installation/component focus; internal verification metadata and tooling stay out of installed source and `/llms.txt`.

### Docs UX coordination

[Build: Docs site UX refinement](https://github.com/frankieramirez/ultima/issues/424) owns its header, navigation, catalogue, Studio canvas and other product changes. This effort owns their contributor proof and measurement. Before editing a shared source, fixture or locator, the build ticket records the tested UX revision and relevant linked UX ticket status. Re-read that state at implementation time.

Write scenarios against the actual accepted behavior at that revision. If a UX change lands while a scenario is in progress, update its reproduction and executable assertions together, then capture evidence on the new revision. Do not accept both contracts with optional selectors or skip-on-missing. Shared-file changes should land in dependency order or be reconciled before validation; claims and ticket links coordinate concurrent agents. A measurement whose workload changes needs a new comparable pair. This map adds no UX redesign and takes no credit for that effort's delivery.

### Completion evidence and bounded deferrals

| Area | Evidence required to close the build effort |
| --- | --- |
| Architectural enforcement | Every specified blocking rule active on its whole scope, clean inventory, validated exceptions and meaningful prohibited mutations; original behavioral proof retained. |
| Metadata and authoring | Complete kinds/inventory, preserved consumer contracts and order, deterministic generation/freshness, safe scaffold/add/remove evidence and zero ordinary manual projection edits. |
| Repeatable verification | Real changed/component/feature/release paths with source identity, conservative coverage and honest failure states; concurrent worktree and cancellation proof. |
| Production and scenarios | Authored ownership joined to executable bindings, successful pilot and full minimum matrix, missing-case/production-CSS negative proof, both modes and required viewports; CI enforcement verified. |
| Efficiency and responsiveness | Durable comparable raw samples, observed coordination/discovery outcomes and stated uncertainty. Any claimed gain has absolute before/after values and matching coverage; any unmet goal has an explicit follow-up. |
| Maintained conventions | Reconciled spec/index, current canonical examples and skills, real command exercises, correction-to-proof process and validated owner links. |

At the final revision run architecture/freshness fixtures, typecheck, full Vitest/axe/parity suites, palette check, registry/token/element builds, production docs and every registered production scenario, plus full Vite/Next.js/element consumer smoke. The final `verify release` report must map all these obligations and pass; separate CI status and repository enforcement must also be confirmed. Local success cannot substitute for pending remote checks. Preserve before/after public exports, route/item IDs and dependency evidence so tool adoption cannot silently change copy-source contracts.

Timing gates, workers and lazy loading are conditional follow-ups requiring the measurement evidence already specified; an honest no-change result completes the measurement work. Cross-browser expansion, pixel-diff gates, generalized element-authoring skills and unrelated product redesign remain deferred because they expand the agreed delivery. Keep existing tests for unregistered behaviors; registration beyond the initial production obligations grows when its owning behavior changes. A deferred deliverable that belongs to this scope must name its reason and tracking link and keep the corresponding build acceptance open. Optional future work may remain separate without preventing completion.

### Planning completion and next action

The owning document now contains all seven decision contracts, including the previously recorded verification, production-browser and executable-feature resolutions. No in-scope planning question remains. The full decisions also remain on their issue resolutions. Implementation tickets must reference the merged revision of this specification as their durable planning source.

[Map: Make Ultima efficient and verifiable for agents](https://github.com/frankieramirez/ultima/issues/435) remains the planning source. [Build: Verified contributor infrastructure for Ultima](https://github.com/frankieramirez/ultima/issues/447) holds the [filed build order](#filed-build-order). Its first ticket commits this reconciled specification; the revision where that ticket merges is the durable source the later tickets reference.
