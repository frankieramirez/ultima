# Agent infrastructure

This document holds the contributor-infrastructure decisions from [Map: Make Ultima efficient and verifiable for agents](https://github.com/frankieramirez/ultima/issues/435). It specifies work for a later build effort. The checks and commands described below are not implemented by this document.

Public component APIs and copy-source installation contracts stay unchanged. The [Ultima principles](ultima.md#principles), per-component contracts and ADR amendments remain authoritative. This document owns how contributor tooling enforces them.

## Architectural checks

Decided on [Architectural checks: coverage, exceptions, and repair diagnostics](https://github.com/frankieramirez/ultima/issues/436).

### Engine and command

Implement a repository-owned checker using the existing TypeScript compiler API. Parse TypeScript and TSX through syntax trees, resolve import symbols and aliases, and use the type checker for public prop contracts. Do not add ESLint solely to host these rules or extend the existing source-text scanners into another parser.

The entry point is `scripts/check-architecture.ts`, exposed as `pnpm check:architecture`. Rule implementations and fixtures live under `scripts/architecture/`. This is a static check: it requires the installed workspace dependencies, but no browser, running server, generated registry, or docs build. Use the repository's supported Node runtime and TypeScript execution convention.

The default run examines all authored files in scope. Provide `--format text` and `--format json`; both represent the same diagnostics. Exit 0 means the run completed with no blocking findings, 1 means architectural violations, and 2 means invalid invocation or an incomplete run such as unreadable source, invalid configuration or parser failure. Advisory findings may accompany exit 0. Output must distinguish advisories from blocking findings and list unsupported analysis explicitly.

Changed-file selection, aggregate verification results and production-browser orchestration belong to the later verification decisions. This checker supplies the full static check they can invoke.

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

### Target and API distinctions

Read the bounded React Zag allowance from ADR 0002 and the per-component contracts. Calendar, Date Picker and Resizable are existing cases; do not allow arbitrary future Zag usage simply because the package is installed. Element production code cannot import React or Base UI. Recipe engines permitted by ADR 0007 belong in recipe/demo scope and must not become hidden component dependencies. Installed registry components cannot import an icon package where the contract requires private glyphs.

Public API checking operates on resolved types and the category of each exported part. Hooks, namespaces, plain slots, styled wrappers, and unchanged primitive pass-throughs are different categories. Unstyled primitive exports retain the primitive contract; the checker must not wrap or rewrite them just to make every exported value look alike. Zag prop-getter components retain their documented fixed-element and `render` differences. Internal `className` produced by StyleX or a primitive is permitted.

Use compile-time positive and negative assignments to prove public prop restrictions. A test that runs a no-op type assertion in a browser does not establish a compiler failure. The checker tests must show that an invalid consumer program actually receives the expected TypeScript diagnostic and a valid one compiles.

Syntax checks establish caller-slot placement for supported composition forms. Existing browser tests remain responsible for override behavior in the rendered cascade, focus management, keyboard handling, and CSS a primitive reads. Retain and reuse the element parity gate, including its declared Base UI-to-Zag state mapping and negative tests. This checker does not replace that mapping with identical attribute names.

### Docs controls and surfaces

Port the existing docs surface checks to the syntax engine. Cover backgrounds, border colors/widths/radii, shadows, and the existing scrollbar restriction, including static spreads and computed keys. Preserve the specification's distinction between page layout and painted component surfaces. Ordinary layout scrolling does not require Scroll Area in every case.

For direct controls, block native `button`, `input`, `select`, `textarea`, `option` and `summary` elements used as application controls outside declared composition cases. Block native elements assigned explicit interactive roles such as `button`, `switch`, `checkbox` or `tab` when they stand in for the kit. Ordinary anchors, headings, labels, forms, tables of prose, and layout containers are not controls solely because their tags can carry events or receive focus. Existing painted-table and component-contract rules still apply independently.

Resolve imported component identities when allowing `render` composition. A native element handed to a supported Ultima component must retain the component's behavior and styles; putting arbitrary JSX inside a prop named `render` is not proof. Ambiguous handler-driven widgets get an advisory with the owning rule and a review question. The diagnostic must explain which behavior static analysis cannot establish.

Inventory the current file-wide exemptions in `surfaces.test.ts`. For each matched declaration, either remove the duplication, encode an existing specification-backed exception, or obtain a new decision. Do not automatically convert every line of an exempt file into approved code. Legitimate Swatch painting, Studio chrome and specimen presentation must remain functional while their precise scopes are recorded.

### Import and registry boundaries

Token production sources cannot depend on UI, elements, docs or repository build scripts. UI production sources may depend on tokens, declared helpers and approved runtime packages. Element production sources may depend on tokens, element helpers and their approved runtime packages. Neither target may import docs, test fixtures or build tooling. Docs and build/test tooling may depend on the lower layers for their stated jobs, including parity tests reading both render targets.

Analyze static imports, export-from declarations and statically resolvable dynamic imports. A nonliteral dynamic import in staged component code must produce an analysis error because installation dependencies cannot be established. Resolve workspace aliases and relative paths to prevent an alternate spelling from bypassing a boundary. External dependency categories are explicitly declared and spec-linked; a new unclassified production dependency requires review of that policy rather than an automatic allowance.

React component-to-component behavior composition remains valid through `@ultima/ui/<item>` and its derived registry dependency. Reject relative sibling imports and workspace barrels the registry cannot stage. Do not impose a zero-sibling-dependency rule. Keep private appearance restatement and the current helper-item model.

Extract reusable pure inventory/dependency checks from the registry builder as needed. The static command must not invoke generation or maintain its own list of what the builder stages. It validates source-side completeness; registry builds and fresh consumer installs still prove generated output and installation. Setup items and vendored element items keep their distinct dependency rules. Broader catalogue ownership and generated-output freshness policy are decisions for the metadata ticket.

### Exceptions

Store exceptions as typed repository data under `scripts/architecture/exceptions.ts`. Each entry contains an ID, rule ID, exact repository-relative path, symbol or part, declaration/property or import target, selector/condition when relevant, allowed expression shape, reason, and owning specification section or ADR amendment. Use source structure rather than line numbers so moving a declaration does not invalidate an otherwise identical exception.

An entry must match exactly the intended site and expected occurrence count. Zero matches, unexpected additional matches, duplicate entries and missing authority targets fail `ULT-EXCEPTION-001`. The reported location comes from the current syntax tree. A migration cannot add an exception just to hide an existing violation; the owning decision must authorize the pattern first.

Do not allow directory globs, whole-file suppression, `disable-all` comments, or a permanent grandfathered baseline. Genuine reusable allowances belong in the property/target policy with fixtures, rather than thousands of repeated exceptions. Temporary advisory rollout of an unvalidated new rule is permitted during its implementation slice, but its final delivery requires a clean blocking run. The later adoption ticket determines the slice order.

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

Before the implementation effort completes, run all architectural checks and the existing typecheck, browser suites, palette check, registry build, docs build and applicable consumer smoke installs. Retain the full validation bar while adding a fast static failure path. The verification and adoption tickets will specify orchestration and staged delivery.

## Component metadata and scaffolding

Decided on [Component metadata: ownership, generated wiring, and scaffolding](https://github.com/frankieramirez/ultima/issues/437). This section specifies a migration; the current handwritten files remain in use until it lands.

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

CI checks freshness before expensive browser/build steps and fails on stale committed projections. Normal validation must not regenerate those files silently and erase the evidence. Root dev/test/typecheck/build and registry commands, plus direct package entry points that consume the projections, must reject stale input before use through a shared nonrecursive preflight. The later verification ticket owns how repeated preflights are consolidated. No generation command may recursively invoke itself through those hooks.

`ULT-REGISTRY-001` uses the shared model to report membership/reference failures; freshness diagnostics identify the stale path and `pnpm catalogue:generate` as the repair. The architecture checker remains static and does not trigger registry or element builds.

### Scaffolding

Add `pnpm scaffold <kind> <id> --from <request.json>`. Its default is a dry-run. `--write` applies the displayed plan after revalidating its preconditions. Support `react`, `element` and `recipe` initially. Support/setup records are infrequent packaging work and are authored against their schema; the scaffold must report that limitation rather than guessing install destinations.

The request contains the descriptor fields and a transient authoring brief: settled contract reference, primary export where relevant, primitive/part shape, axes/defaults and the applicable proof-bar requirements. This brief drives template selection; it is not a new persistent owner of those facts. Reject absent contract answers before any write. In particular, do not invent a `RootProps` type, choose a primitive by similarity, assign a release position silently, or guess an element parity mapping.

A React scaffold creates one metadata descriptor, one component file, its correctly located test file, its MDX page and an initial demo module. The MDX imports that same demo as live JSX and `?raw` source. An element scaffold creates its descriptor, element source and correctly located tests, and reports the required authored parity/fixture coverage. A recipe scaffold creates its descriptor and demo modules; if its page already exists, output an unapplied insertion snippet for the author rather than rewriting the page.

Generated skeletons visibly mark incomplete work with an `@ultima-scaffold-incomplete` marker. `ULT-SOURCE-001` rejects that marker until the author completes the contract and removes it. Scaffolding is not proof-bar coverage, and it must not create passing tests that merely assert the scaffold exists. The dry-run names the remaining behavioral and accessibility work.

Scaffolding regenerates the small wiring projections through the same catalogue model. It does not edit the router, package exports or optimizer config by string substitution. Before writing, check all intended authored paths, metadata IDs, public export names and release positions for collisions, as well as the generated-output plan. A request targeting an existing authored item fails without changing it. There is no overwrite or force mode.

Use exclusive creation for new authored files. After an interrupted write, a rerun identifies the partial files and stops with recovery instructions. It must not delete or overwrite them to simulate idempotence. Concurrent edits invalidate the plan, and operations leave a manifest of paths they created or updated so recovery can inspect the exact scope.

### Migration and proof

1. Capture the existing catalogue/release order, registry prose and dependency edges, routes, public exports, element documentation and required optimizer sets at a named revision. The observed 54 React/9 element/5 support-item counts provide a cross-check, not a hardcoded future rule.
2. Add the schemas, per-item descriptors and pure model with bidirectional source checks. Reconcile descriptions that differ today: preserve the installed CLI text and visitor wording by explicitly naming a docs-only override where their purposes differ. Share the summary by default; do not silently rewrite either audience's prose during migration.
3. Generate projections in a temporary comparison location. Require semantic equivalence to the captured public outputs, preserving release order and explicit exports. Keep independent fixture expectations and mutation tests; generating a test's expected answer from the same catalogue cannot prove the catalogue is correct.
4. Switch the existing adapters and builders to the model, remove superseded authored lists and replace the catalogue order test's repeated full lists with ordering/reference tests plus fixed generator fixtures. Keep behavioral assertions authored, including element parity and browser checks. Update Forge's wiring instructions and the repository layout/generated-file guidance in the same change.
5. Deliver the dry-run/write scaffold, freshness preflights and interrupted-write tests. Validate actual Vite/Next.js registry installation, element distribution and browser optimizer startup, alongside the existing full checks.

Required negative fixtures cover duplicate IDs/order positions, missing source/page/demo/test files, source without metadata, stale descriptors, broken contract anchors, invalid primary exports, duplicate public exports, unresolved dependency candidates, invalid element enum references, recipe records leaking into the registry, stale generated output, authored-file collisions and concurrent/stale scaffold plans. Valid fixtures cover a plain component, a compound with hooks, a Zag React component, an element family, a setup item and a recipe. Preserve separate source-bundle/artifact tests for token exports and helpers.

Prove authoring improvement with the same synthetic component-addition exercise in disposable baseline and migrated checkouts. Keep the contract, dependency, demo and required proof identical; record commands, manual coordination edits, discovery time and failures. After migration, the author should edit the descriptor and authored behavior/docs/tests, with **zero manual edits to the barrel, router/page map, catalogue adapters or optimizer lists for an ordinary component addition**. New dependency-policy decisions and element behavioral parity work remain explicit exceptions to that target. Record wall-clock measurements without inventing a speedup percentage. The later measurement ticket owns the shared benchmark protocol.

Delete the synthetic component after the exercise and prove regeneration leaves no stale membership. Repeat generation without input changes and require zero diff. Repeating a scaffold write against an existing item must fail without altering any authored bytes.

## Verification CLI

Decided on [Verification CLI: selection, failure behavior, and evidence contract](https://github.com/frankieramirez/ultima/issues/438). This section specifies tooling to implement. Existing package commands and CI remain in use until the implementation passes the acceptance cases below.

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
| Architecture and metadata | Planned `pnpm check:architecture` and `pnpm catalogue:check`, with their fixture suites included in release validation. |
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

This defines 22 required cells before feature registration expands their internal steps. The feature-map ticket owns stable IDs, source/route links and discovery; its registry must describe these obligations and drive selection, with no second handwritten runner inventory. Until that registry lands, the production gate cannot claim complete feature discovery. Additional required scenarios declared there join the full PR/release run.

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

Decided on [Executable feature map: scenario ownership and discovery](https://github.com/frankieramirez/ultima/issues/440). This section specifies contributor tooling to implement. Discovery and reproduction commands below are planned until their adapters and validation ship.

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

## Remaining decisions

Measurement baselines and final rollout remain on their own open map tickets. No performance improvement is claimed until implementation supplies comparable evidence.
