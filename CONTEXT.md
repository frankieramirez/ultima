# Ultima glossary

Terms in the project's own words. Implementation detail stays out.

## Ultima

The design system this repo holds. A fantasy-themed set of tokens and React components, authored with Base UI and StyleX, shared through a shadcn-compatible registry. Not to be confused with the `ultima` audit skill in mana, which measures a codebase's drift from its design system.

## Token

A named design value (color, space, radius, type, motion) defined once in Ultima. Tokens are the only source of raw values inside components.

## Theme studio

The planned editor for customizing Ultima's design variables and seeing their effect on live components. It groups controls by design concern and exposes individual semantic-token overrides for finer editing. Its first release targets themes for existing Ultima applications, with export and installation, rather than project creation. The [theme studio map](https://github.com/frankieramirez/ultima/issues/204) owns the planning decisions.

## Palette scale

A named ramp of twelve color steps, with a dark and a light value per step. Scales carry the fantasy names: mithril (neutral), arcane (indigo), mana (cyan), verdant (green), ember (amber), ruin (red). Scales are compile-time constants: they never appear in CSS, and nothing outside the token layer refers to one except the docs site displaying it.

## Step

One position in a palette scale, numbered 1 to 12. The number carries a fixed meaning in both modes: 1 app background, 2 subtle background, 3 to 5 component background at rest, hover, and active, 6 to 8 borders from hairline to strong, 9 to 11 solid fill at rest, hover, and active, 12 that hue as text. A semantic token resolves to the same step number in dark and in light.

## Semantic token

A token named for its role, not its value: surface, accent, border, text-muted. Components and consumers use semantic tokens. Semantic tokens resolve to palette scale steps per color mode.

## Color mode

Dark or light. Dark is the default. Light is a full peer, never best effort.

## Tokens CSS export

A generated stylesheet of CSS custom properties carrying the same tokens, for consumers that cannot run StyleX. Mana's audit report is the first such consumer.

## Tokens JSON export

The generated companion to the tokens CSS export: every semantic token with its group, the scale and step it resolves to per color mode, and its resolved value. The machine-readable published contract. Generator state under `packages/tokens/scripts/` is not part of it.

## Agent guide

The generated Markdown at `/llms.txt`: Ultima's principles, conventions, component list, and token names at one fetchable URL. It is how a consumer's agent learns the system, because Ultima installs no documentation into a consumer's repository.

## Agent surface

The agent-facing files this repository commits for its own contributors: `AGENTS.md`, the vendored skills under `.agents/skills/` pinned by `skills-lock.json`, and the per-tool shims `.claude/`, `.grok/`, `.pi/` and `.cursor/` that point each agent tool at the same set. It ships in the public repository because the contributor workflow is agent-first ([What the public repository carries](https://github.com/frankieramirez/ultima/issues/567)). It is not installed into consumer repositories, where the Consumer skill and the Agent guide fill that role.

## Forge

Ultima's own component-authoring skill. It knows Base UI composition, StyleX variant tables, and the part-naming rules, so it lives in this repo rather than in mana, whose skills stay general. Its scope is the React catalogue only: element files are authored by hand against the spec's Web components section, with the parity gate as the check, and whether any skill learns element authoring is revisited once the report set has shipped elements to pattern-match against.

## Registry

The hosted shadcn-compatible index that lets a consumer copy Ultima source into their project with `npx shadcn`. Registry-first means consumers own the code they install.

## Registry item

One installable unit in the registry: a component, a style, or a theme, with its files and dependencies.

## Recipe

A release checklist entry satisfied by a documented composition rather than by a registry item. A recipe has no installable unit of its own, so its copyable example is the whole contract: it names the components it composes and carries the same checks a component would. Those checks are the live demo in the axe sweep and the documented states on the page, not a `packages/ui` install of the engine. Sheet is a recipe over Dialog; Alert Dialog is not — Base UI ships it as its own Root, so it is a catalogue item. Sharing a component is not enough either: Toggle is a catalogue item though `ToggleGroup.Item` renders the same primitive, because that primitive branches on the group's context and the two arrangements have different live props, and a recipe that varies which props are live has nowhere to say so. Data Table is a recipe over Table and an engine; the React Hook Form example is a recipe over Field and an engine; Carousel is a recipe over `aspect-ratio` and `button` and an engine. Where a recipe hands the user a control, that control still comes from a component. Passing the identity test is not enough on its own: an avatar group is `Avatar.Root`, `Avatar.Image`, and `Avatar.Fallback` and is not a recipe, because no checklist line holds it. A composition with no entry to satisfy is a **Documented composition** instead.

## Documented composition

An arrangement of components a docs page prints so a consumer can copy it, where no checklist entry is being satisfied. It has no registry item, no mapping to record, and no checks of its own, which is the whole difference between it and a **Recipe**: a recipe answers for an entry, a documented composition answers for a question the entry's own page leaves open. An avatar group is the first: negative inline spacing, a ring through the `style` slot, and an overflow count that is a plain `Avatar.Root`.

## Engine

A headless dependency that supplies a model rather than an interaction: TanStack Table's row model, React Hook Form's form state, and whatever Calendar and Chart turn out to need. An engine renders no DOM and no styles, and supplies no roles, ARIA, keyboard handling, or focus management, which is the whole difference between it and a primitive. It belongs to the consumer, never to a registry item, so a composition that needs one is a recipe. An engine a composition only may use is the same: Field is complete without a form library, and the library is a recipe over it.

## Primitive layer

The library a component's interactive parts are built on: Base UI for the React catalogue (ADR 0002), Zag.js for elements (ADR 0008), and, under the ADR 0002 amendment, Zag through `@zag-js/react` for the React entries Base UI cannot cover. A primitive supplies roles, ARIA state, keyboard handling, and focus management and ships no styles, which is the whole difference between it and an **Engine**: a prop-getter library is a primitive rather than an engine, so an entry built on one is a catalogue item, not a recipe.

## Setup item

The universal registry item that prepares a project for Ultima: one per target (Vite, Next.js App Router). It installs `components.json`, the StyleX compiler config, and the namespace entry, and it never overwrites a file the consumer's scaffold already owns.

## Hand step

A step a consumer performs after installing a setup item, because the setup item cannot make it without overwriting a file the consumer owns: the tsconfig path alias, the plugin line in `vite.config.ts`, the stylesheet import in the Next.js layout, the layer around a reset. Each one is declared with the check `doctor` runs to prove it, or with the reason it cannot be proven.

## Registry build

The step that turns the monorepo into the served registry: it stages component and token sources with their imports rewritten, takes each item's prose and dependencies from the catalogue model over the item metadata, and runs `shadcn build`. Its authored inputs under `registry/` are the setup files and the descriptors under `metadata/`; `items.config.ts` is a generated compatibility projection of them.

## Item metadata

An authored description of an item's identity, presentation and place in the catalogue, with a reference to its owning contract. Its kind distinguishes a React component, element family, recipe, setup item, source bundle or generated artifact. Source code owns exports and inferred dependencies; the specification owns behavior. One descriptor per item lives under `registry/metadata/`, and `pnpm catalogue:generate` writes the wiring projected from them, as [Agent infrastructure](docs/spec/agent-infrastructure.md#component-metadata-and-scaffolding) specifies.

## Consumer

Any project that installs Ultima. Mana's report is the first consumer of the tokens CSS export. The docs site is not a consumer: it imports the components from the workspace, because the registry is generated from that same source and an installed copy could only be a staler version of it. The one exception is the docs site's static element page, which consumes the element bundle as a built file over HTTP rather than importing it, and so counts as a consumer of the element catalogue.

## Consumer CLI

The planned command a consumer runs with `npx` in their own repository: `doctor` proves the post-install hand steps landed, `status` and `diff` report installed items against the registry, and `check` runs Ultima's contract checks over the consumer's code. `install` writes its managed files. It is not `pnpm verify`, the contributor verification CLI, and it is not mana's `ultima` audit skill. [Map: A consumer CLI for Ultima](https://github.com/frankieramirez/ultima/issues/467) owns its decisions.

## Managed file

A file the consumer CLI writes into a consumer's repository and refreshes on every `install`: the consumer skill, stamped with the CLI version that wrote it, and Ultima's hook entries, marked `ultima-design` and the same in every release. It points at hosted guidance and never restates a convention. It is the one exception to hosted-only guidance, and it is not a registry item, which the consumer owns outright.

## Consumer skill

The skill `install` writes into a consumer's repository, named `ultima-design`. It is a managed file that versions with the CLI. It says when to fetch `/llms.txt` and which CLI command to run at each step, and each imperative in it is one that `check` enforces. It is not `forge`, the contributor skill, and it is not mana's `ultima` audit skill.

## Consumer scope

The consumer CLI's way of running the contributor's analysis engine over a consumer's repository. Modules resolve through the consumer's own tsconfig and `components.json` aliases instead of workspace aliases, and a file counts as an installed item only when it carries registry provenance. It shares every rule with the workspace scope and enables a subset of them, which is the whole difference between it and a second engine.

## Consumer rule

A `check` rule in the `ULT-APP-*` family, run over a consumer's code rather than Ultima's source. It enforces that paint comes from tokens and that overrides keep Ultima's guarantees; arrangement stays the consumer's. Blocking consumer rules protect color mode, theming, and contrast. Advisory ones protect consistency and block only under `--strict`.

## Catalogue revision

The commit the registry build ran at, shortened to twelve hex characters. One revision covers a whole deploy. It tells a person which build a file came from, and it never decides whether a file has changed; the content hash does that.

## Item stamp

The one comment line the registry build writes into every file it serves, naming the item, the catalogue revision, and the file's content hash, e.g. `// @ultima/button 3f9c2ab04e1d c1:5f1e0c2a9b7d4e61`. shadcn keeps no record of an install, so the stamp is the only record of what the consumer received. The consumer may delete it, and the file then reads as unstamped.

## Content hash

A per-file hash of a canonical form of the file, prefixed with the scheme that produced it: `c1` for TypeScript source, where formatting, comments, import aliases, and the `"use client"` directive do not count, and `b1` for vendored bytes. Equal hashes mean the same code.

## Drift state

What `status` says about one installed file, from comparing its installed, local, and served content hashes: `current`, `edited`, `behind`, `diverged`, `unstamped`, or `retired`. An update is available when a file is `behind` or `diverged`. Only `behind` is safe to reinstall without losing edits.

## Incomplete run

A consumer CLI run whose command was well formed but that could not reach a complete answer, because of the project or the network: a missing `components.json`, an unresolvable value a blocking rule needs, an unreachable registry. It exits 3 and is never a pass. It is not an invalid invocation, which exits 2 and is fixed by changing the command rather than the project.

## Docs site

The site at `apps/docs`. Three things at once: Ultima's reference, the host that serves the registry and the tokens CSS export, and a portfolio piece. It uses the components by importing them from the workspace, so it is not a consumer.

## Landing page

The site's front door at `/`: the pitch, the live specimen strip, and the install commands. Settled on [#371](https://github.com/frankieramirez/ultima/issues/371): the docs sidebar is per-route chrome, open on the documentation routes and closed on the landing page and the Studio. The header's links and the hero's calls to action carry the landing's navigation, and below the breakpoint the menu trigger still opens the mobile menu. The install workbench panel carries the same Vite / Next.js underline Tabs as `/install`'s Commands section, settled on [#379](https://github.com/frankieramirez/ultima/issues/379); its copy button writes the active tab's pair of commands.

## Demo figure

The block a component page renders for each example: one Card with the live preview, a hairline, and the example's source. Settled on [#369](https://github.com/frankieramirez/ultima/issues/369): the preview is centered with an 8rem floor, the source rests as a six-line teaser that expands in place (a source of eight lines or fewer never collapses), and copy is an icon button inside the code area's top-right corner. The same copy control serves every code block on the site. It composes catalogue components only, so it sits on the page-layout side of the line.

## Element section

The **Web component** section at the foot of a component page whose item also ships as a custom element: the tag, both acquisition paths, a live example rendered from the served bundle with its markup as the figure's source, the tag family, and the attributes. It reads `apps/docs/src/elements.ts`, which restates each `ult-<item>.element.ts` file's tags and observed attributes and is held to them by a test. `/elements` carries the shared story once and links every section.

## Token row

The line `/tokens` renders per semantic token. Settled on [#372](https://github.com/frankieramirez/ultima/issues/372): name, purpose, and both color modes on one line at desktop, stacking to three lines at 390px, with a `Separator` closing every row. Each mode is an inline `Swatch`, a 48x20 chip beside the hex, with the palette step on the chip's `title` rather than in the row. Copy is the demo figure's icon button, always visible at the row end. Non-color groups keep the same four columns, reading `Token / Purpose / Value / Specimen`. It paints nothing itself: the rule comes from `Separator`, the button from `Button`, and the chip from `swatch.tsx`, which the specification names as an exception.

## Page layout

The docs-local side of the line between an Ultima component and the site's own chrome. Page layout arranges content and sets type and flow spacing. It never builds a control from plain elements and never paints a surface, meaning a background, a border, a shadow, or a radius. Anything that does one of those comes from a component, or becomes one. A control here is anything the user reaches with a keyboard, so a tabbable scroll region counts even though it presses nothing. A third prong arrived with Scroll Area: page layout may rely on a native scrollbar and may not hide one without painting a replacement, since the first two prongs are about building something badly and this one is about removing something the platform already gave you. The site's shell scrolls the document rather than an inner region: the header, menu panel, and on-this-page index are sticky, and the footer flows after content, resting at the viewport bottom only on a short page. Theme Studio keeps its own fixed-height app shell.

## Studio chrome

The theme studio's own application surface: the workbench sub-bar, editor rail, group headers, shuffle bar, validation and inspector panels, and the preview scaffold. It is not page layout, so it may paint surfaces, but every keyboard-reachable control in it is a catalogue component. Its fixed appearance is Ultima's stock dark theme pinned on the editor subtree, beginning at the sub-bar; the shared site header above it is site chrome and follows the user's color-mode preference. The draft theme applies only inside the preview panes, whose boundary is also the per-pane portal container.

## Preview canvas

A Theme Studio preview pane, read as a matted specimen surface rather than a document. Settled on [#374](https://github.com/frankieramirez/ultima/issues/374): the scene box owns the pane's full height and the scene centres within it, so the spare height reads as matting on both sides instead of a void under the content; the type, interaction and inspect specimen strip lifts out of the scrolling region and docks at the pane's foot under a `Separator`, where it stays put while a tall scene scrolls. One canvas per pane, so Compare aligns both scenes on a baseline and both hairlines across the panes. The canvas is Studio chrome, but its hairline and matting are drawn from the draft theme because they sit inside the pane's theme boundary.

## Bounded scroll region

A region that scrolls inside the shell rather than with the document. Each one carries a named bar treatment, settled on [#285](https://github.com/frankieramirez/ultima/issues/285): the site menu panel and the Studio editor rail's groups region get a styled Scroll Area, because both are narrow rails that overflow every session; the "On this page" index and the Studio's preview panes keep native bars, because their overflow is a guard or per-scene rather than constant.

## On this page

The sticky index of a page's sections beside the article, desktop widths only. It marks the section at the reading line current with `aria-current="location"`, shown as the full text color at medium weight, the same unpainted pair Breadcrumb and Sidebar give their current item, since page layout may not paint a marker. An IntersectionObserver tracks the h2s; the last one past the line stays current when none sits in the band, so a long section and the page bottom still show a position. Settled on [#373](https://github.com/frankieramirez/ultima/issues/373), which also made the article breadcrumb a `Breadcrumb`, the first site-chrome use of a catalogue navigation component.

## Labelled run

The docs-prose convention for content that differs per setup target: a paragraph opens with the bold target name — `**Vite.**`, `**Next.js App Router.**`, `**Both.**` — and states what holds for it. Settled on [#377](https://github.com/frankieramirez/ultima/issues/377): where the reader picks one path, such as the install page's Commands section, a catalogue Tabs carries the choice; prose that interleaves per-target runs with shared paragraphs stays labelled so both targets remain visible.

## Set

A section of the specification holding one contract effort's output: its components' parts and axes in one table, their styled splits, and the prose a builder would otherwise guess. A set is named for what it holds. A release name is honest only where the section holds that release whole, which is why The v0 set and The v0.1 set carry one and no fraction of v0.2 may. Where the members share a property, the name is that property: The navigation set's landmark, The overlay set's recipe, The date set's machine. Where they share nothing, the name lists them: The Toggle, Accordion, Avatar, and Scroll Area set first, then The Command set (a list of one), The Button Group, Input Group, Input OTP, and Native Select set, and The Aspect Ratio and Resizable set. Report set and Feedback set are groupings inside a release rather than sections.

## Report set

The components needed to rebuild mana's audit report: Badge, Card, Table, Tabs, Button, Meter, Stat, Code, Tooltip. The foundation set is the report set plus Dialog, Dropdown Menu, Select, Input, and Switch, which is fourteen. The v0 set is eighteen: the foundation plus Sidebar, Collapsible, Toggle Group, and Separator, the four the docs application turned out to need. The v0.1 set is fourteen more, Fieldset its own item, thirty-two in the catalogue once they ship.

## Feedback set

The seven v0.1 components that report a state rather than collect a value: Alert, Alert Dialog, Toast, Progress, Skeleton, Spinner, and Empty. The other seven in that release are the form components, which is why the release is forms and feedback and why the section holding both contracts is The v0.1 set rather than a form set.

## Navigation set

Breadcrumb, Pagination, and Navigation Menu, the three v0.2 components that render a navigation landmark. Named for what they hold rather than for the release, because v0.2 is thirteen checklist lines and these are three of them. One rule follows from the landmark and reaches all three: Ultima's default name is emitted only when the caller named nothing, and distinguishing a second instance on a page is the consumer's.

## Date set

Calendar and Date Picker, the two v0.2 items that run the same Zag `date-picker` machine through `@zag-js/react`. Property-named where the other new sections are member-listed: the pair share one machine, one grid paint restated between the two files, and one accessibility model. `calendar.tsx` pins `inline` and keeps the grid half of the anatomy; `date-picker.tsx` keeps the whole anatomy plus `Portal` and omits `inline`.

## Page window

The list of page slots a pagination control shows, with the runs it hides collapsed to an ellipsis. Ultima computes it from a current page and a total; the caller renders it, because a page item is often the consumer's router link.

## Token group

One export in `packages/tokens`, named for what it holds. The themeable groups are `defineVars` and reach the CSS export: color, space, text, font, radius, shadow, filter, and motion durations including `--ult-motion-loop`. The `filter` group is one token, `--ult-filter-backdrop`, the scrim's backdrop blur on the visible overlays. The compile-time groups are `defineConsts` and never leave the build: motion easings, border widths, z-index, and `display`, the docs chrome's display sizes the numeric `text` scale cannot hold. A themeable token's full name is `--ult-<group>-<name>`. `--ult-motion-loop` is the repeating-animation duration: it collapses to `0s` under reduced motion, not `1ms`, because a one-millisecond loop is a strobe.

## Theme

A StyleX override of a token group, applied to a root or any subtree. Ultima ships a dark and a light theme; a consumer's re-skin is a theme of the same kind.

## Color role

The conventional name a semantic color token is grouped under: surface, text, border, accent (arcane), highlight (mana), success (verdant), warning (ember), danger (ruin). Each hue role carries a base fill, hover and active fills, a subtle background, a hairline border, a text variant, and a contrast on-color.

## Contrast token

The on-color a hue role uses for text and icons placed on its solid fills, named `<role>-contrast`. It is a neutral step chosen per mode so the pairing passes the contrast gate, and it is the one place a semantic token may resolve to a different step per mode.

## Contrast gate

WCAG 2.2 AA, checked for every semantic pairing the spec lists in both modes: 4.5:1 for text, 3:1 for strong borders and focus rings. APCA is reported by the docs site as advice and never fails a build.

## Interaction state token

A semantic token for hover or active, named with a `-hover` or `-active` suffix. States are tokens resolved to palette steps, never colors derived at the use site.

## Part

One named piece of a compound component, such as `Card.Root` or `Dialog.Popup`. Part names match Base UI's wherever a primitive supplies them. Ultima invents a name when Base UI ships two components rather than one namespace (`ToggleGroup.Item`, `Checkbox.Group`, `RadioGroup.Item`) and when no primitive supplies one at all (`ButtonGroup.Item`, `InputGroup.Addon`). A single-part component has no parts, just the component. A part is either styled by Ultima or passed through: a part that paints, or sets its own type or spacing, is styled, and so is a part whose primitive depends on CSS the primitive does not supply; a part that only portals, positions, or groups passes through unchanged.

## Cross-part state

A value a compound component's parts must agree on, such as Tabs' `variant` or Sidebar's open state. It lives in a context private to the component file, with `Root` as the provider. A value that can differ per part stays a prop on the part.

## Breakpoint

The one viewport width at which Sidebar switches between its inline desktop panel and its mobile menu, `48rem`. It is a named module constant in the component that uses it, not a token: a custom property cannot appear in a media condition, so nothing themeable can hold it.

## Responsive state

Sidebar's two open states: `open`, the persisted desktop collapse, and `mobileOpen`, the transient mobile menu. CSS decides what is visible below the breakpoint; a JavaScript read of the same query decides what is mounted. The server render is the desktop shape.

## Mobile menu

How Sidebar presents its panel below the breakpoint: the panel's children inside a Dialog popup anchored to the inline start, sliding in over the page. Opened by `Sidebar.Trigger`, closed by `Sidebar.Close`, Escape, the backdrop, or choosing a link.

## Component hook

The `use<Component>()` export of a component with shared runtime state, `useSidebar()` first. It is how a consumer builds a part of their own that reads or sets that state. It throws outside the component's `Root`. A component whose context carries only an axis has no hook. `Toast.useToastManager` is Base UI's, sits on the Toast namespace, and is not `useToast()`.

## Wrapper trigger

A part that exists to be handed the consumer's own element through `render`, such as `Dialog.Trigger`, `Dialog.Close`, `AlertDialog.Trigger`, `AlertDialog.Close`, `Toast.Action`, `Toast.Close`, `Sidebar.Trigger`, `Sidebar.Close`, or `Collapsible.Trigger`. It wires behavior and ARIA and ships no styles at all, so the element rendered into it carries its own reset and focus ring. The docs say the slot holds an Ultima Button or an element with its own ring.

## Axis

A prop that selects one of a component's alternative appearances. Ultima has exactly three, and no component invents a fourth: `variant` for shape and emphasis, `size` for the three control heights, `tone` for the color role. Textarea uses those same three steps as a starting height rather than a fixed one, so it can grow. Combobox's `size` sits on `InputGroup`, the visual box. Slider has no `size`. Alert has `tone` and neither of the other two. Toast has the same six tones, forwarded as Base UI `type` / `data-type` rather than as a prop on Root. Progress has Meter's five tones on `Root`. Skeleton, Spinner, and Empty have none. The v0.2 input-group set: Button Group carries all three on `Root` reaching `Item` through context, `size` alone not overridable per item; Input Group and Input OTP carry `size` on `Root`; Native Select carries `size` on `Select`, the control part.

## Tone

The axis that lets a caller pick a component's color role by name, so `tone="danger"` reaches that role's fill and its contrast on-color together and the caller never names a token. Button, Badge, and Meter carry one in v0. Alert carries Badge's six tones in v0.1, and no `variant`. Toast carries the same six as Base UI `type` on `add()`, styled against `data-type`; `error` paints as `danger` and `loading` as `neutral` so `promise()` works, and those two strings are aliases rather than extra axis values. Progress carries Meter's five on `Root`. Slider does not: it is a value picker, not a measurement. Spinner does not: it is a decorative mark. `neutral` is a tone value but not a color role, so a component using it names the neutral tokens it wants.

## Field

The component that binds one control to its label, its description, and its error message, so the three are associated without the consumer writing an id. A Field paints no control of its own: it arranges the four and owns the spacing between them. Field is not required, and every control Ultima ships works standalone.

## Form integration

The documented path from a Field to a submitted form: Base UI's own `Form` and `Field` over the platform's constraint validation. It costs a consumer nothing, because `Form` is a primitive Ultima already adopted and paints nothing, so it ships no item of its own. A form library is an engine layered on top rather than a replacement, and the one Ultima writes a recipe for is React Hook Form. Each rule is declared once: a constraint the platform has an attribute for belongs to the primitive, and a cross-field, schema, or async rule belongs to the engine.

## Control slot

The one element inside a Field that is the field's control, and the thing the label names and the validation state lands on. Ultima's own controls fill it by being themselves, because Base UI's input primitive is the field's control part, so a control registers itself rather than being wrapped. `Field.Control` is the part for a control Ultima does not ship. A checkbox or radio group is one control slot rather than several, which is why a group takes one name and one error. Combobox's control is the Input in the canonical pattern; Slider's is `Root`, a group.

## Validation state

Whether a field is currently valid, and the attributes that carry it: a data attribute for styling and `aria-invalid` for announcement. The two do not always agree, and the difference is deliberate rather than a bug. A control disabled while invalid keeps the styling attribute and loses the announced one, because it still shows its error but is no longer something the user can fix. Validation state has one source: a Field owns it where one exists, and the consumer owns it where one does not.

## Indeterminate

A checkbox that is neither checked nor unchecked: some but not all of a related set are selected. It is a pass-through Base UI prop, announced as `aria-checked="mixed"`, and shown with a dash rather than a check. Data Table's select-all is this state on a standalone checkbox; a select-all that lives in the same group as its items uses the group's parent checkbox instead.

## Combobox

A filterable input whose value is restricted to the item set. It is a sibling of Select, not a variant of it. Autocomplete is the free-text primitive Base UI ships beside it and is not in v0.1; it backs `command` in v0.2. `Combobox.Label` names the trigger, not the input.

## Alert

A static in-page callout. It is not a live region and not an Alert Dialog. Tone is its only axis. The docs' `Note` is not this component: `Note` stays a styled paragraph until it paints a surface.

## Alert Dialog

A modal confirmation overlay, a separate component from Dialog. Escape closes it; a backdrop click does not. It is the seventh overlay and does not vary the recipe.

## Toast

A stacked notification. It is not an overlay: Viewport reads `z.toast`, Root restates overlay surface tokens without the overlay enter/exit. Colour is `tone` forwarded as Base UI `type` / `data-type`. The consumer mounts Provider, Portal, and Viewport once; those three stay mounted when the stack is empty. Ultima writes no context for it and does not invent `useToast()`.

## Progress

A task-completion bar. Meter remains the bounded measurement. Same five parts as Meter, restated rather than imported, with `tone` on Root. Indeterminate is still Progress: CSS on `[data-indeterminate]`, not a Spinner.

## Skeleton

A placeholder surface for content that is not there yet. Decorative: `aria-hidden`, with `aria-busy` on the container it stands in for. Its pulse is a looping animation.

## Spinner

A circular looping mark for a busy region with no task fraction. Decorative: `aria-hidden`, with `aria-busy` on the busy container. Not indeterminate Progress, and not a live region.

## Empty

The absence of a collection: title, description, optional icon, and an action as children. Not Card, not Alert, and not `Combobox.Empty`. Static, like Alert: Root is a `<div>`.

## Live region

A documented pattern, not a catalogue component and not a shared announcer. Pre-mount the region empty; Ultima-written UI uses `role="status"` with `aria-atomic="true"` and Word Joiner for a repeat of the same text; clip-hide, never `display: none`. Toast inherits Base UI's viewport and high-priority `role="alert"` clone. Field.Error is not a live region. Alert is not a live region. Progress is a `progressbar`, not a live region. Spinner and Skeleton are `aria-hidden`; they are not live regions. Empty is a static `<div>`, like Alert. Copy-button keeps its own region. Data Table's row-count announcement follows the pattern when that recipe ships.

## Overlay

A component that portals a floating surface over the page: Dialog, Dropdown Menu, Select, Tooltip. All four share one surface, one enter and exit transition, and one z-index constant. Sidebar's mobile menu is the fifth: it composes Dialog and varies only the transition. Combobox is the sixth: it joins the recipe on its popup and does not vary it. Alert Dialog is the seventh: it joins the recipe and does not vary it. Navigation Menu is the eighth: it joins the recipe and varies the transition, the second component to do so after Sidebar's mobile menu, dropping the shared `scale(0.98)` because a transform cannot fight an animated width and height. v0.2's overlay set takes the recipe to twelve: Popover ninth, Drawer tenth, Context Menu eleventh, Hover Card twelfth. Popover, Context Menu, and Hover Card join unvaried; Drawer is the third stated variation, dropping the scale because a swipe owns `transform`. Command's anchored `Popup` is the thirteenth, unvaried; its `inline` arrangement renders no popup and makes no second claim. Toast is not an overlay, and neither is Menubar: it portals nothing and floats nothing, and the overlays a menubar holds are the Dropdown Menu popups inside it. Sheet takes no number, because it introduces no component.

## Context Menu

A menu opened by right click or long press, anchored to the pointer rather than to a control. Nineteen parts, seventeen of them the same component object as Dropdown Menu's, and its styled split is Dropdown Menu's minus the `Viewport` it lacks. `context-menu.tsx` restates that paint rather than importing `dropdown-menu`, because the behavior all comes from the primitive. Its trigger is a region wrapping the consumer's content, not a wrapper trigger, so it carries no styles and takes no Button. It is always modal and Base UI forces that. It is never the only way to reach its actions: the trigger has no role, no ARIA, and no keyboard opener, so the same actions also sit on a visible control.

## Drawer

An edge-anchored panel with gestures, built on its own Base UI primitive rather than on Dialog. All fifteen parts ship, six are styled, and the edge is not a prop: the drawer sits on the edge it dismisses toward, and Ultima styles all four cases from the attribute the primitive emits. Reach for it when the panel needs a gesture, and for Sheet otherwise; the deciding capability is the Android back gesture, which Dialog cannot answer. Its two app-shell parts pass through unstyled, because styling them means shipping an app shell.

## Hover Card

A panel previewing where a link goes, opened by hovering or focusing the link. Base UI calls the primitive `PreviewCard`; the item is `hover-card`, because a component's name is Ultima's own and only its parts mirror the primitive. Its trigger is the anchor itself, not a slot for one, which makes it the only Ultima link in prose and so the only part that underlines. It is not a labelled region: the primitive emits nothing that names or associates the popup, and adding a role is not Ultima's to do. It opens on hover and on keyboard focus and never on touch, so everything in it also lives at the link's destination.

## Menubar

A persistent bar of menu titles, in page flow rather than floating. Base UI ships it as one container component with no parts, so Ultima ships one function and invents no part name; the menus inside it are the consumer's own Dropdown Menus, named as a companion install rather than declared as a dependency. Its one part is styled twice over: it paints, and its box is read back by the backdrop an open menu renders, so the bar is sized to its contents. It is not an overlay. Its accessible name is required by the types, the third such attribute in the system, because the pattern demands a name and no automated check would ever catch a missing one.

## Accordion

Collapsible run once per item under a shared value array: the same Base UI hooks, so the panel's animation contract transfers whole over a differently named custom property. Where it parts company is the trigger, which Ultima styles because an accordion trigger is a full-measure row of the accordion rather than a slot for a control the consumer already has, and the APG permits nothing beside the button inside its heading. The heading is an `<h3>` whose level is the consumer's through `render`, the caret is their glyph inside the button, and the panel takes no padding, because a box animating to zero height cannot clip its own. Since the APG dropped arrow keys from the pattern its keyboard is a native button and Tab, not roving tabindex.

## Avatar

An image with something behind it for when the image is not there. Three parts, all styled, and the only catalogue component with no axes and no kin: its box and its radius are each one unconditional declaration, so both are the style slot's the way Skeleton's size already is, and the initials track the box through a container query rather than a text step. The fallback is a layout slot Ultima ships nothing into, so there is no `name` prop and no derived initials. Its accessible name is `alt` on the image, documented rather than type-enforced because axe's `image-alt` catches a missing one and passes an empty one, and Ultima defaults it to neither so a decorative avatar and an unnamed standalone one stay distinguishable. `keepMounted` is the mode `next/image` and lazy loading need, and it works untouched because Ultima ships the stacking CSS for both modes and hides the unloaded image with `visibility`, never `display`, which would stop a lazy image ever loading.

## Scroll Area

A native scroll container with scrollbars Ultima paints and a viewport a keyboard can reach. Six parts, three styled, no axes. It is the component where Base UI writes the most inline style, and since an inline style beats a StyleX class, most of the contract is what not to write: not the viewport's `overflow`, not the thumb's length, not the scrollbar's placement. What Base UI leaves out is the scrollbar's thickness, without which the bar is zero pixels wide, and the viewport's `block-size: 100%`, without which nothing overflows and the whole component silently stops scrolling. Its scrollbar is always visible when its axis overflows and only changes colour on hover or while scrolling, because the fade every other system ships cannot be grabbed and never appears for a touch pointer at all. The bounded box is the consumer's, on the style slot, as Skeleton's size and Avatar's are.

## Toggle

A button that stays pressed, shipped as its own item though `ToggleGroup.Item` renders the same Base UI component. One function, no parts, and two axes Toggle Group has none of: `variant` for whether it carries a border at rest, and `size` at Button's three control heights, because a standalone toggle stands beside a button and a grouped one stands inside a ground that sets its scale. Its pressed state is the accent role where the group's is neutral, since a lone control has no sibling to be read against. The two are not interchangeable at the type level and each file restates the other's paint rather than importing it: `value` is dropped here because it identifies a toggle to a group, and `pressed` is inert inside one.

## Command

A free-text filterable list of actions, the catalogue item on Base UI's `Autocomplete`. Its items are actions and suggestions rather than a selection, so there is no `ItemIndicator` and no `data-selected`, and the input value is free text, which is the whole difference between it and Combobox. Its anchored popup is the thirteenth overlay; `Root open inline` renders the list inline, the arrangement the command-dialog recipe composes inside a Dialog. The `filter` prop is the scorer socket: the default is the primitive's Collator filter, and an optional scorer the consumer installs replaces it.

## Aspect Ratio

A fixed-ratio box for media, one part and one function like Badge. Its `ratio` prop is a number the component writes as the file's one inline `aspect-ratio` declaration, a runtime value a StyleX table cannot hold and the same mechanism Meter's indicator width already uses. The box and the radius are the `style` slot; `overflow: hidden` clips the media to whatever shape the caller adds. It is the slide box the Carousel recipe composes.

## Resizable

A two-pane split with a draggable boundary, on the Zag splitter machine through `@zag-js/react`. Zag is a prop-getter primitive under the ADR 0002 amendment, not an engine, so the entry ships as an item rather than a recipe. Four parts — `Root`, `Panel`, `Handle`, `HandleIndicator` — plus a `useResizable()` hook for the machine's api. `Handle` is the `separator`-role control whose hit area Ultima widens past the hairline it paints, because the machine leaves it zero-area the way Drawer's `SwipeArea` arrived. Its `aria-label` is the system's fourth type-enforced attribute: a resize boundary has no text and no sibling that could name it. `orientation` is a pass-through prop keyed to a style table, not an axis.

## Restatement

One component writing another's appearance into its own file instead of importing it. An item declares another Ultima component as a dependency only when it composes that component's behavior; appearance is always restated. Tokens keep the values in step, because both files read the same semantic tokens. Nothing keeps the arrangement in step, which is a difference where the two arrangements should differ, as Pagination's does from Button's, and an accepted risk where they are meant to be identical, as Alert Dialog's is to Dialog's and Context Menu's to Dropdown Menu's. Sidebar composing Dialog is the one import in the tree, and it is on the behavior side.

## Style slot

The `style` prop every part accepts: StyleX styles from the caller, merged last. It is the only way to restyle an installed component from outside its file. There is no `className` prop.

## Shared lib

The one registry item, `lib/component.ts`, holding the helper types every component depends on. Installed once, like shadcn's `lib/utils`.

## Glyph slot

A part whose only content is an icon Ultima supplies. Usually a Base UI part: `Select.Icon`, `Select.ItemIndicator`, `Menu.CheckboxItemIndicator`, `Menu.RadioItemIndicator`, `Checkbox.Indicator`, `RadioGroup.Indicator`, `Combobox.Icon`, `Combobox.ItemIndicator`, `Combobox.Clear`, `Combobox.ChipRemove`. Ultima fills each with a `1em` inline SVG private to the component file, and accepts `children` as a replacement. Checkbox's slot holds two glyphs, the check and the dash, chosen by whether the box is checked or mixed. Combobox's clear and chip-remove slots share an x. `Breadcrumb.Separator` and `Pagination.Ellipsis` are the first slots Ultima writes itself rather than fills, and they take `children` the same way. A layout slot the caller fills, such as `Alert.Icon` or `Empty.Icon`, is not one of these: Ultima ships no default there.

## Accessibility contract

What a component promises for keyboard and screen-reader use beyond what its Base UI primitive gives: the source of its accessible name, which parts render the focus ring, and the element a plain component renders. Base UI owns roles, ARIA state, and keyboard handling; Ultima owns names, focus visibility, and element choice.

## Demo

A real component module under `apps/docs/src/demos/`, rendered live on a docs page with its own source printed beneath it. A demo is three things at once: the running example, the copyable source, and the surface the accessibility sweep runs axe over. It renders at the reader's real viewport and never fakes another one, so a component that changes shape with the width changes shape in its demos too. The sweep mounts each demo's default state and never interacts; open overlays and high-priority toasts are proven in the component file.

## Live demonstration

A claim the site proves by using Ultima rather than by writing it down. The header's theme control is how the site shows that light is a full peer of dark; the site's own menu is how it shows a whole Sidebar. Where one exists, the component's page points at it and its own demos each show one narrower thing. Most components have none and owe none: four are in the site's chrome, and a live demonstration is not part of the release gate.

## Smoke install

The scripted end-to-end proof that the registry still installs: a fresh Vite app and a fresh Next.js app run the documented `shadcn add` commands against the built registry and then build. It enumerates every `registry:ui` item, not a representative subset, and also installs `sidebar` alone to prove a derived composition. It runs on a schedule and on pull requests that change registry inputs.

## Launch

The event the public-launch map works toward: the repository going public, `ultima.systems` serving the full site instead of the coming-soon page, and the first `ultima-design` publish on npm, together as the announced launch. The readiness bar and its two gates — launch, and promotion observed live afterward — live in [the spec's Launch section](docs/spec/ultima.md#launch). Running the sequence is a build effort, not decision work; the map hands off to it.

## Element

A custom-element re-implementation of an Ultima component for hosts that cannot run React, distributed as a bundle the host loads alongside the tokens CSS export. The first consumer is a static, non-React HTML page hosted on the docs site: it loads the built bundle over HTTP, can execute the full platform, and is where elements are demonstrated and axe-swept. The page is a checked-in fixture under `apps/docs/public/`, outside the router like `/tokens.css`; the bundle is generated there by the registry build the same way the tokens exports are. It holds one demo per report-set element in both color modes, and axe runs on it in the docs site's Playwright browser suite, with each element's own proof-bar test file in `packages/elements/src/__tests__/`, never beside the element. Element source lives in `packages/elements`, a React-free workspace package whose own build emits `dist/` per-element files plus the combined `ultima.js`; the registry build chains that build the way it chains `@ultima/tokens`, copies the files to `apps/docs/public/elements/`, and embeds the same bytes in each element's universal registry item, so one artifact feeds both surfaces. The bundle is still held to mana's report constraints: one self-contained file, no network, opens from `file://`, no host data interpolated in. Mana keeps its no-script rule; adopting elements there is a later mana-repo decision once an element exists to adopt. Distribution is two surfaces fed by one build: a universal `registry:item` per element for hosts that can run the CLI, and the same bundled file the docs site serves at a stable URL beside `/tokens.css` for hosts that cannot. An element is a vendored artifact rather than copy-source: customization is tokens, attributes, and parts, and a consumer who needs different behavior forks the repo. Elements render into light DOM, not shadow: a shadow boundary would seal the element off from `data-theme` and consumer `--ult-*` overrides, breaking the re-skin contract, and ARIA idrefs cannot cross it, which kills portaled overlays. The cost is that the page's CSS can reach element internals; the sanctioned override surface is `part=` attributes on the inner parts, targeted with plain attribute selectors in the consumer's own CSS, plus the `style` attribute on the host for per-instance tweaks. The `style` prop equivalent on an element is therefore the platform's own tools, and re-skinning by semantic token override works unchanged. The element primitive layer is Zag.js through `@zag-js/vanilla` (ADR 0008), bundled inside the vendored artifact so a consumer never installs it; ADR 0002's Base UI continues to govern the React catalogue, and "one primitive library" means one vocabulary per render target. Elements inherit Zag's `data-part` vocabulary rather than Base UI's, so parity between the catalogues is a naming decision, not something the primitive supplies. Naming is `ult-` plus the registry item name for the root (`ult-button`, `ult-tabs`), and a compound component is a family of elements named `ult-<item>-<part>` uniformly (`ult-tabs-list`, `ult-tabs-tab`, `ult-card-body`), because shared part names like `Indicator` and `Panel` make a shortened convention into an exception list. Axes are attributes with the React prop values verbatim (`variant="solid"`, `tone="danger"`, `size="sm"`), held on the root where the spec puts them in context and overridable per part where the spec's prop-wins rule applies. The author writes `disabled`; the element mirrors it into the primitive's `data-*` vocabulary on inner DOM, and machine state (`data-selected`, `data-orientation`) is directly targetable in light DOM, so `:state()` is declined. `part=` marks only the inner styling targets an element renders itself, valued with kebab-cased part names. Versioning follows the same possession contract as the React catalogue: the served URL always carries the latest build, pinning means vendoring the file, an upgrade is a re-fetch or a reinstall that overwrites, and each bundle carries a build stamp so drift is a diff away. Each bundle's build stamp is the item stamp every served file carries, so `status` reports an element like any other item, and there are no versioned URLs. An element's proof bar is the eight items read in element terms: axes mount as attributes on an element created by script or by the parser and changed after connection, the primitive assertions read Zag where the React bar reads Base UI, the element-wired item carries the lifecycle (connect starts the machine, disconnect stops it and drops its listeners), and the CSS-the-primitive-reads item has no report-set instance, because Zag never reads element styles the way a Base UI panel does. Element tests run in the package's own browser-mode suite against a plain document with no React, and open-state axe lives in the element's own file the way open overlays live in a component's. The contrast gate needs no change: elements resolve the same tokens, and a pairing the table never declared stays axe's question. The smoke install gains a targeted element-item install the way it gained sidebar's, since universal `registry:item`s fall outside its `registry:ui` enumeration; the fixture page doubles as the no-package-manager host's smoke, because loading the served bundle over HTTP with no install step is exactly what that consumer does.

## Vendored artifact

A generated file the consumer installs as built output rather than as source to own: the element bundles, and nothing else in the registry. The consumer does not edit it — customization is tokens, attributes, and `part=` targets — and an upgrade overwrites it whole. It is the one exception to registry-first's copy-source premise (ADR 0009), because an element host has no toolchain that could build the source. Everything else the CLI installs is source the consumer owns.

## Parity gate

The check that keeps an element file in step with the React component it restates: a suite in `packages/elements/src/__tests__/` that fails the build when the two disagree on styled parts, axes, token reads, or state selectors, the last through a per-element declared map from Base UI's `data-*` vocabulary to Zag's. It is the element catalogue's answer to what Restatement leaves unchecked inside the React catalogue.

## Proof bar

The eight items every component build ticket ships as its test file: every combination renders, the name resolves, the focus ring lands, the primitive is still wired, documented state drives its style, typecheck passes, behavior Ultima wires itself is exercised, and CSS the primitive reads is asserted. It is a bar rather than a suite, so a component with no axes and no state still costs a file, and the last two items exist for behavior a static screenshot would pass. v0.1 did not add a ninth item, and filled item 7 with nothing: every v0.1 interaction is the primitive's or a style. Live-region structure is items 2 and 4; a looping `animation-name` is item 8; a form ticket asserts association and invalid, not submit.

## Scale seed

The theme studio's color input for one palette scale: a hue and a saturation factor on the recipe's chroma peak, settable from a picked color or as sliders. One set of seeds generates both color modes, and the stock palette's pinned brand values do not carry into a generated theme.

## Token override

A manual semantic-token value set in the theme studio. It pins the token's resolved value in one color mode, detaches it from derivation, and survives regeneration and Shuffle until reset. Editing both modes at once is the default; a token can be unlinked per mode.

## Density

The theme studio axis that scales the `space` group: compact, cosy, and roomy presets. Control heights follow because they read space steps. Density never touches type size, leading, or radius; those belong to typography and shape.

## Editor chrome

The earlier name for **Studio chrome**, settled on [#217](https://github.com/frankieramirez/ultima/issues/217). It is not page layout, and its fixed appearance comes from the pinned stock dark theme rather than its own values.

## Shuffle

The theme studio's coordinated redraw: a control on each guided group plus one global control that rerolls every unlocked group through a seeded generator. A color shuffle is a bounded search that accepts only a candidate passing the contrast gate in both modes and reports exhaustion without changing anything; the other groups draw once, since they cannot fail the gate. A shuffle never applies a failing candidate and never releases a lock. Broad draws fresh parameters; subtle perturbs the current draft.

## Lock

A per-group switch in the theme studio that exempts the group from Shuffle. Token-level locking needs no switch because a token override already pins its value through regeneration. Locks are absolute: they can make a color search unsatisfiable, and an exhausted shuffle names them rather than overriding them.

## Theme draft

The theme studio's working state: guided parameters, per-mode overrides, locks, and the seed each shuffle recorded. Guided parameters plus overrides plus the recipe version fully determine the generated output. One linear undo history holds committed snapshots of the draft for the session; persistence across sessions belongs to export.

## Draft document

The versioned serialization of a theme draft, downloaded as `ultima-theme.json` and carried inside the installable registry item. It is the single artifact the studio's preview, downloads, installation, and reopening all derive from; resolved token values are products of it, never the editable form. A fragment-encoded copy is the shareable URL.

## Feature scenario

A named user behavior with an owning contract, reproducible steps, required variants and observable results, linked to executable checks by a stable ID. A feature groups related scenarios across components or application code. The planned [executable feature map](docs/spec/agent-infrastructure.md#executable-feature-map) connects those scenarios to their owners and verification commands. A discovered scenario is not evidence that its checks ran.

## ULT-n

A citation naming a decision ticket on the private pre-GitHub Linear workspace the project was planned on, written as `Title (ULT-n)` or bare `ULT-n` with no URL. The number is a stable key for anyone with workspace access; every other reader gets the title.

## Consumer default theme

The complete theme a new project gets before choosing its own. The accepted next default is Neutral, with achromatic interactive colors and distinct status colors. Ultima names the explicit preset that preserves the original indigo/cyan appearance. The [default-theme contract](docs/spec/ultima.md#consumer-default-theme) records the pending implementation and compatibility requirements.
