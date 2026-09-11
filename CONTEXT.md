# Ultima glossary

Terms in the project's own words. Implementation detail stays out.

## Ultima

The design system this repo holds. A fantasy-themed set of tokens and React components, authored with Base UI and StyleX, shared through a shadcn-compatible registry. Not to be confused with the `ultima` audit skill in mana, which measures a codebase's drift from its design system.

## Token

A named design value (color, space, radius, type, motion) defined once in Ultima. Tokens are the only source of raw values inside components.

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

## Forge

Ultima's own component-authoring skill. It knows Base UI composition, StyleX variant tables, and the part-naming rules, so it lives in this repo rather than in mana, whose skills stay general.

## Registry

The hosted shadcn-compatible index that lets a consumer copy Ultima source into their project with `npx shadcn`. Registry-first means consumers own the code they install.

## Registry item

One installable unit in the registry: a component, a style, or a theme, with its files and dependencies.

## Recipe

A release checklist entry satisfied by a documented composition rather than by a registry item. A recipe has no installable unit of its own, so its copyable example is the whole contract: it names the components it composes and carries the same checks a component would. Sheet is a recipe over Dialog; Data Table is a recipe over Table and an engine; the React Hook Form example is a recipe over Field and an engine. Where a recipe hands the user a control, that control still comes from a component.

## Engine

A headless dependency that supplies a model rather than an interaction: TanStack Table's row model, React Hook Form's form state, and whatever Calendar and Chart turn out to need. An engine renders no DOM and no styles, and supplies no roles, ARIA, keyboard handling, or focus management, which is the whole difference between it and a primitive. It belongs to the consumer, never to a registry item, so a composition that needs one is a recipe. An engine a composition only may use is the same: Field is complete without a form library, and the library is a recipe over it.

## Setup item

The universal registry item that prepares a project for Ultima: one per target (Vite, Next.js App Router). It installs `components.json`, the StyleX compiler config, and the namespace entry, and it never overwrites a file the consumer's scaffold already owns.

## Registry build

The step that turns the monorepo into the served registry: it stages component and token sources with their imports rewritten, derives each item's dependencies from those imports, takes the prose from one manifest, and runs `shadcn build`. Everything under `registry/` except the setup items' files is its output.

## Consumer

Any project that installs Ultima. Mana's report is the first consumer of the tokens CSS export. The docs site is not a consumer: it imports the components from the workspace, because the registry is generated from that same source and an installed copy could only be a staler version of it.

## Docs site

The site at `apps/docs`. Three things at once: Ultima's reference, the host that serves the registry and the tokens CSS export, and a portfolio piece. It uses the components by importing them from the workspace, so it is not a consumer.

## Page layout

The docs-local side of the line between an Ultima component and the site's own chrome. Page layout arranges content and sets type and flow spacing. It never builds a control from plain elements and never paints a surface, meaning a background, a border, a shadow, or a radius. Anything that does one of those comes from a component, or becomes one. A control here is anything the user reaches with a keyboard, so a tabbable scroll region counts even though it presses nothing.

## Report set

The components needed to rebuild mana's audit report: Badge, Card, Table, Tabs, Button, Meter, Stat, Code, Tooltip. The foundation set is the report set plus Dialog, Dropdown Menu, Select, Input, and Switch, which is fourteen. The v0 set is seventeen: the foundation plus Sidebar, Collapsible, and Toggle Group, the three the docs application turned out to need.

## Token group

One export in `packages/tokens`, named for what it holds. The themeable groups are `defineVars` and reach the CSS export: color, space, text, font, radius, shadow, and motion durations. The compile-time groups are `defineConsts` and never leave the build: motion easings, border widths, z-index. A themeable token's full name is `--ult-<group>-<name>`.

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

One named piece of a compound component, such as `Card.Root` or `Dialog.Popup`. Part names match Base UI's wherever a primitive supplies them. Ultima invents a name only when Base UI ships two components rather than one namespace: `ToggleGroup.Item`, `Checkbox.Group`, and `RadioGroup.Item`. A single-part component has no parts, just the component. A part is either styled by Ultima or passed through: a part that paints, or sets its own type or spacing, is styled, and so is a part whose primitive depends on CSS the primitive does not supply; a part that only portals, positions, or groups passes through unchanged.

## Cross-part state

A value a compound component's parts must agree on, such as Tabs' `variant` or Sidebar's open state. It lives in a context private to the component file, with `Root` as the provider. A value that can differ per part stays a prop on the part.

## Breakpoint

The one viewport width at which Sidebar switches between its inline desktop panel and its mobile menu, `48rem`. It is a named module constant in the component that uses it, not a token: a custom property cannot appear in a media condition, so nothing themeable can hold it.

## Responsive state

Sidebar's two open states: `open`, the persisted desktop collapse, and `mobileOpen`, the transient mobile menu. CSS decides what is visible below the breakpoint; a JavaScript read of the same query decides what is mounted. The server render is the desktop shape.

## Mobile menu

How Sidebar presents its panel below the breakpoint: the panel's children inside a Dialog popup anchored to the inline start, sliding in over the page. Opened by `Sidebar.Trigger`, closed by `Sidebar.Close`, Escape, the backdrop, or choosing a link.

## Component hook

The `use<Component>()` export of a component with shared runtime state, `useSidebar()` first. It is how a consumer builds a part of their own that reads or sets that state. It throws outside the component's `Root`. A component whose context carries only an axis has no hook.

## Wrapper trigger

A part that exists to be handed the consumer's own element through `render`, such as `Dialog.Trigger`, `Dialog.Close`, `Sidebar.Trigger`, `Sidebar.Close`, or `Collapsible.Trigger`. It wires behavior and ARIA and ships no styles at all, so the element rendered into it carries its own reset and focus ring. The docs say the slot holds an Ultima Button or an element with its own ring.

## Axis

A prop that selects one of a component's alternative appearances. Ultima has exactly three, and no component invents a fourth: `variant` for shape and emphasis, `size` for the three control heights, `tone` for the color role. Textarea uses those same three steps as a starting height rather than a fixed one, so it can grow. Combobox's `size` sits on `InputGroup`, the visual box. Slider has no `size`.

## Tone

The axis that lets a caller pick a component's color role by name, so `tone="danger"` reaches that role's fill and its contrast on-color together and the caller never names a token. Button, Badge, and Meter carry one in v0. Slider does not: it is a value picker, not a measurement. `neutral` is a tone value but not a color role, so a component using it names the neutral tokens it wants.

## Field

The component that binds one control to its label, its description, and its error message, so the three are associated without the consumer writing an id. A Field paints no control of its own: it arranges the four and owns the spacing between them. Field is not required, and every control Ultima ships works standalone.

## Control slot

The one element inside a Field that is the field's control, and the thing the label names and the validation state lands on. Ultima's own controls fill it by being themselves, because Base UI's input primitive is the field's control part, so a control registers itself rather than being wrapped. `Field.Control` is the part for a control Ultima does not ship. A checkbox or radio group is one control slot rather than several, which is why a group takes one name and one error. Combobox's control is the Input in the canonical pattern; Slider's is `Root`, a group.

## Validation state

Whether a field is currently valid, and the attributes that carry it: a data attribute for styling and `aria-invalid` for announcement. The two do not always agree, and the difference is deliberate rather than a bug. A control disabled while invalid keeps the styling attribute and loses the announced one, because it still shows its error but is no longer something the user can fix. Validation state has one source: a Field owns it where one exists, and the consumer owns it where one does not.

## Indeterminate

A checkbox that is neither checked nor unchecked: some but not all of a related set are selected. It is a pass-through Base UI prop, announced as `aria-checked="mixed"`, and shown with a dash rather than a check. Data Table's select-all is this state on a standalone checkbox; a select-all that lives in the same group as its items uses the group's parent checkbox instead.

## Combobox

A filterable input whose value is restricted to the item set. It is a sibling of Select, not a variant of it. Autocomplete is the free-text primitive Base UI ships beside it and is not in v0.1. `Combobox.Label` names the trigger, not the input.

## Overlay

A component that portals a floating surface over the page: Dialog, Dropdown Menu, Select, Tooltip. All four share one surface, one enter and exit transition, and one z-index constant. Sidebar's mobile menu is the fifth: it composes Dialog and varies only the transition. Combobox is the sixth: it joins the recipe on its popup and does not vary it.

## Style slot

The `style` prop every part accepts: StyleX styles from the caller, merged last. It is the only way to restyle an installed component from outside its file. There is no `className` prop.

## Shared lib

The one registry item, `lib/component.ts`, holding the helper types every component depends on. Installed once, like shadcn's `lib/utils`.

## Glyph slot

A Base UI part whose only content is an icon: `Select.Icon`, `Select.ItemIndicator`, `Menu.CheckboxItemIndicator`, `Menu.RadioItemIndicator`, `Checkbox.Indicator`, `RadioGroup.Indicator`, `Combobox.Icon`, `Combobox.ItemIndicator`, `Combobox.Clear`, `Combobox.ChipRemove`. Ultima fills each with a `1em` inline SVG private to the component file, and accepts `children` as a replacement. Checkbox's slot holds two glyphs, the check and the dash, chosen by whether the box is checked or mixed. Combobox's clear and chip-remove slots share an x. Ultima ships no icon dependency, so a slot Base UI leaves empty is the only place an Ultima glyph appears.

## Accessibility contract

What a component promises for keyboard and screen-reader use beyond what its Base UI primitive gives: the source of its accessible name, which parts render the focus ring, and the element a plain component renders. Base UI owns roles, ARIA state, and keyboard handling; Ultima owns names, focus visibility, and element choice.

## Demo

A real component module under `apps/docs/src/demos/`, rendered live on a docs page with its own source printed beneath it. A demo is three things at once: the running example, the copyable source, and the surface the accessibility sweep runs axe over. It renders at the reader's real viewport and never fakes another one, so a component that changes shape with the width changes shape in its demos too.

## Live demonstration

A claim the site proves by using Ultima rather than by writing it down. The header's theme control is how the site shows that light is a full peer of dark; the site's own menu is how it shows a whole Sidebar. Where one exists, the component's page points at it and its own demos each show one narrower thing.

## Smoke install

The scripted end-to-end proof that the registry still installs: a fresh Vite app and a fresh Next.js app run the documented `shadcn add` commands against the built registry and then build. It runs on a schedule and on registry changes, not on every pull request.

## Proof bar

The eight items every component build ticket ships as its test file: every combination renders, the name resolves, the focus ring lands, the primitive is still wired, documented state drives its style, typecheck passes, behavior Ultima wires itself is exercised, and CSS the primitive reads is asserted. It is a bar rather than a suite, so a component with no axes and no state still costs a file, and the last two items exist for behavior a static screenshot would pass.
