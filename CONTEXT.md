# Ultima glossary

Terms in the project's own words. Implementation detail stays out.

## Ultima

The design system this repo holds. A fantasy-themed set of tokens and React components, authored with Base UI and StyleX, shared through a shadcn-compatible registry. Not to be confused with the `ultima` audit skill in mana, which measures a codebase's drift from its design system.

## Token

A named design value (color, space, radius, type, motion) defined once in Ultima. Tokens are the only source of raw values inside components.

## Palette scale

A named ramp of color steps. Scales carry the fantasy names (for example arcane, ember, mithril). Nothing outside the token layer refers to a scale directly.

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
