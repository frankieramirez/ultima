# Ultima specification

The owning document for Ultima's conventions, tokens, and component contracts. Each section is written when its decision ticket closes; the map is [Map: Ultima design system spec](https://linear.app/frankie-ramirez/issue/ULT-1). Read `CONTEXT.md` for the glossary and `docs/adr/` for the hard-to-reverse choices.

## Tokens

Decided on [Token architecture](https://linear.app/frankie-ramirez/issue/ULT-9). Values (the palette, the scales, the typefaces) are decided on later tickets.

### Layers

Two layers in v0.

1. **Palette scales.** Compile-time constants via `stylex.defineConsts`. They carry the fantasy names and never emit CSS. Nothing outside `packages/tokens` reads them except the docs site, which imports them to display the scales.
2. **Semantic tokens.** `stylex.defineVars` groups that resolve to palette steps per color mode. Components and consumers read only this layer. There are no component tokens; a component reads semantic tokens directly.

### Naming grammar

Every semantic key is written as a `--`-prefixed custom property name so StyleX uses it verbatim instead of hashing it. The StyleX build and the tokens CSS export therefore emit identical names, and one override works for both kinds of consumer.

```
--ult-<group>-<name>
```

Groups and their name shape:

| Group | Name shape | Example |
| --- | --- | --- |
| `color` | `<role>[-<modifier>][-<state>]` | `--ult-color-surface`, `--ult-color-surface-raised`, `--ult-color-text-muted`, `--ult-color-accent-hover` |
| `space` | numeric step | `--ult-space-4` |
| `text` (font size) | numeric step | `--ult-text-3` |
| `font` (family, weight, leading, tracking) | descriptive | `--ult-font-sans`, `--ult-font-weight-medium`, `--ult-font-leading-tight` |
| `radius` | t-shirt | `--ult-radius-md`, `--ult-radius-full` |
| `shadow` | t-shirt | `--ult-shadow-md` |

Color roles are conventional: surface, text, border, accent, and the status colors. Fantasy names appear only in palette scales. Interaction states (`-hover`, `-active`) are separate semantic tokens resolved to palette steps, never derived with `color-mix()`, because dark and light modes step in different directions.

In component code the key is used as written: `color['--ult-color-surface']`. That ergonomic cost is accepted for stable names.

### Token groups in v0

Themeable (emitted as custom properties): `color`, `space`, `text`, `font`, `radius`, `shadow`.

Compile-time only (`defineConsts`, never in the CSS export): `motion` (duration, easing) and `z-index`.

### Color mode

Dark is the default. Each color token's default value is the dark value with the light value under `@media (prefers-color-scheme: light)`, so an untouched install follows the operating system.

`packages/tokens` also exports `darkTheme` and `lightTheme` built with `stylex.createTheme` over the `color` group. Applying one with `stylex.props(theme)` forces that mode on `<html>` or on any subtree. Each theme also sets `color-scheme` so native controls match.

### Overriding

A consumer re-skins Ultima at the semantic layer, which is the only layer components read.

- Plain CSS: `:root { --ult-color-accent: ...; }`. Ultima's defaults sit in the lowest StyleX cascade layer, so an unlayered consumer rule wins without `!important`.
- StyleX: `stylex.createTheme(color, { '--ult-color-accent': ... })` applied to a root or subtree, the same mechanism as Ultima's own light and dark themes.

Replacing a base color means supplying its state tokens too. Palette scales cannot be swapped by name in v0; promoting the palette to `defineVars` later is additive and keeps every existing name.

### Tokens CSS export

A generated file, never hand-edited, for consumers that cannot run StyleX. Built by running the StyleX compiler over the `.stylex.ts` files, collecting the variable and theme rules, and rewriting selectors so the hashed theme classes become stable attributes.

Shape, in order:

```css
:root { color-scheme: dark; --ult-color-surface: ...; }
@media (prefers-color-scheme: light) { :root { color-scheme: light; --ult-color-surface: ...; } }
[data-theme="dark"] { color-scheme: dark; --ult-color-surface: ...; }
[data-theme="light"] { color-scheme: light; --ult-color-surface: ...; }
```

Constraints: plain CSS text, no `@import`, no `url()`, no remote fonts, no `</style>` or `<script` substrings, so it can be pasted into a self-contained HTML document. Written to `packages/tokens/dist/tokens.css` and served from the docs site as a registry file. Palette constants and compile-time groups do not appear. Legacy aliases for a specific consumer (mana's report) live with that consumer, not in the export.
