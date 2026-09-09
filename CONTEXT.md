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

## Setup item

The universal registry item that prepares a project for Ultima: one per target (Vite, Next.js App Router). It installs `components.json`, the StyleX compiler config, and the namespace entry, and it never overwrites a file the consumer's scaffold already owns.

## Registry build

The step that turns the monorepo into the served registry: it stages component and token sources with their imports rewritten, derives each item's dependencies from those imports, takes the prose from one manifest, and runs `shadcn build`. Everything under `registry/` except the setup items' files is its output.

## Consumer

Any project that installs Ultima. Mana's report is the first consumer of the tokens CSS export. The docs site is not a consumer: it imports the components from the workspace, because the registry is generated from that same source and an installed copy could only be a staler version of it.

## Docs site

The site at `apps/docs`. Three things at once: Ultima's reference, the host that serves the registry and the tokens CSS export, and a portfolio piece. It uses the components by importing them from the workspace, so it is not a consumer.

## Report set

The components needed to rebuild mana's audit report: Badge, Card, Table, Tabs, Button, Meter, Stat, Code, Tooltip. The v0 set is the report set plus Dialog, Dropdown Menu, Select, Input, and Switch.

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

One named piece of a compound component, such as `Card.Root` or `Dialog.Popup`. Part names match Base UI's where a primitive exists. A single-part component has no parts, just the component. A part is either styled by Ultima or passed through: a part that paints, or sets its own type or spacing, is styled; a part that only portals, positions, or groups passes through unchanged.

## Axis

A prop that selects one of a component's alternative appearances. Ultima has exactly three, and no component invents a fourth: `variant` for shape and emphasis, `size` for the three control heights, `tone` for the color role.

## Tone

The axis that lets a caller pick a component's color role by name, so `tone="danger"` reaches that role's fill and its contrast on-color together and the caller never names a token. Button, Badge, and Meter carry one in v0. `neutral` is a tone value but not a color role, so a component using it names the neutral tokens it wants.

## Overlay

A component that portals a floating surface over the page: Dialog, Dropdown Menu, Select, Tooltip. All four share one surface, one enter and exit transition, and one z-index constant.

## Style slot

The `style` prop every part accepts: StyleX styles from the caller, merged last. It is the only way to restyle an installed component from outside its file. There is no `className` prop.

## Shared lib

The one registry item, `lib/component.ts`, holding the helper types every component depends on. Installed once, like shadcn's `lib/utils`.

## Glyph slot

A Base UI part whose only content is an icon: `Select.Icon`, `Select.ItemIndicator`, `Menu.CheckboxItemIndicator`, `Menu.RadioItemIndicator`. Ultima fills each with a `1em` inline SVG private to the component file, and accepts `children` as a replacement. Ultima ships four glyphs in total and no icon dependency, so a slot Base UI leaves empty is the only place an Ultima glyph appears.

## Accessibility contract

What a component promises for keyboard and screen-reader use beyond what its Base UI primitive gives: the source of its accessible name, which parts render the focus ring, and the element a plain component renders. Base UI owns roles, ARIA state, and keyboard handling; Ultima owns names, focus visibility, and element choice.

## Demo

A real component module under `apps/docs/src/demos/`, rendered live on a docs page with its own source printed beneath it. A demo is three things at once: the running example, the copyable source, and the surface the accessibility sweep runs axe over.

## Smoke install

The scripted end-to-end proof that the registry still installs: a fresh Vite app and a fresh Next.js app run the documented `shadcn add` commands against the built registry and then build. It runs on a schedule and on registry changes, not on every pull request.
