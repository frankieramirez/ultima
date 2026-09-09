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

## Registry

The hosted shadcn-compatible index that lets a consumer copy Ultima source into their project with `npx shadcn`. Registry-first means consumers own the code they install.

## Registry item

One installable unit in the registry: a component, a style, or a theme, with its files and dependencies.

## Consumer

Any project that installs Ultima. The docs site is the first consumer of the components. Mana's report is the first consumer of the tokens CSS export.

## Report set

The components needed to rebuild mana's audit report: Badge, Card, Table, Tabs, Button, Meter, Stat, Code, Tooltip. The v0 set is the report set plus Dialog, Dropdown Menu, Select, Input, and Switch.

## Token group

One `defineVars` export in `packages/tokens`, named for what it holds: color, space, text, font, radius, shadow. A token's full name is `--ult-<group>-<name>`.

## Theme

A StyleX override of a token group, applied to a root or any subtree. Ultima ships a dark and a light theme; a consumer's re-skin is a theme of the same kind.

## Color role

The conventional name a semantic color token is grouped under: surface, text, border, accent (arcane), highlight (mana), success (verdant), warning (ember), danger (ruin). Each hue role carries a base fill, hover and active fills, a subtle background, a text variant, and a contrast on-color.

## Contrast token

The on-color a hue role uses for text and icons placed on its solid fills, named `<role>-contrast`. It is a neutral step chosen per mode so the pairing passes the contrast gate, and it is the one place a semantic token may resolve to a different step per mode.

## Contrast gate

WCAG 2.2 AA, checked for every semantic pairing the spec lists in both modes: 4.5:1 for text, 3:1 for strong borders and focus rings. APCA is reported by the docs site as advice and never fails a build.

## Interaction state token

A semantic token for hover or active, named with a `-hover` or `-active` suffix. States are tokens resolved to palette steps, never colors derived at the use site.
