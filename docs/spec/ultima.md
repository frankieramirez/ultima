# Ultima specification

The owning document for Ultima's conventions, tokens, and component contracts. Each section is written when its decision ticket closes; the map is [Map: Ultima design system spec](https://linear.app/frankie-ramirez/issue/ULT-1). Read `CONTEXT.md` for the glossary and `docs/adr/` for the hard-to-reverse choices.

## Tokens

Decided on [Token architecture](https://linear.app/frankie-ramirez/issue/ULT-9). The palette and the semantic color values are in the Palette section below; the non-color scales and typefaces are decided on later tickets.

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
## Palette

Decided on [The palette](https://linear.app/frankie-ramirez/issue/ULT-10). Six scales, twelve steps each, a dark and a light value per step, generated in OKLCH and committed as hex. The reference generator is `packages/tokens/scripts/palette.py`; the v0 build ports it into the tokens package and must reproduce these values exactly.

### Scales

| Scale | Role | Hue |
| --- | --- | --- |
| `mithril` | neutral | 276 |
| `arcane` | accent | 275 |
| `mana` | highlight | 204 |
| `verdant` | success | 162 |
| `ember` | warning | 79 |
| `ruin` | danger | 21 |

The hues come from mana's audit report. Two values are brand anchors and stay exact: `mithril1` dark is `#0b0d17` (the report page background) and `mana12` dark is `#8ff5ff` (the wordmark cyan). Every other value is generated and may move if the contrast gate demands it.

### Step convention

Step numbers mean the same thing in both modes and in every scale. A semantic token resolves to the same step number in dark and in light; the ramp carries the inversion.

| Step | Meaning |
| --- | --- |
| 1 | app background |
| 2 | subtle background, raised surfaces |
| 3 | component background at rest, subtle fills |
| 4 | component background on hover |
| 5 | component background when active or selected |
| 6 | hairline border |
| 7 | border on hover |
| 8 | strong border, 3:1 against steps 1 and 2 |
| 9 | solid fill at rest |
| 10 | solid fill on hover |
| 11 | solid fill when active |
| 12 | the hue as text, 4.5:1 against steps 1 to 3 |

This deviates from Radix Colors on purpose: Radix spends steps 11 and 12 on low- and high-contrast text and has no active step for solids. Ultima's interaction states are palette steps, not derived colors, so 11 is the active fill and the two text steps collapse into 12. The neutral has no solid fills, so its steps 9 to 11 serve as subtle, muted, and ordinary text weights.

### Generation recipe

Each value is `oklch(L, C, H)` with the scale's hue, then clipped into sRGB by reducing chroma. Lightness per step:

| Mode | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dark, all scales | .162 | .195 | .235 | .275 | .315 | .36 | .42 | .50 |
| light, hues | .995 | .982 | .960 | .935 | .905 | .870 | .820 | .740 |
| light, mithril | .995 | .982 | .960 | .935 | .905 | .870 | .780 | .640 |

| Scale | dark 9 to 12 | light 9 to 12 |
| --- | --- | --- |
| mithril | .60 .66 .78 .93 | .56 .50 .44 .22 |
| arcane | .70 .75 .80 .86 | .55 .50 .46 .40 |
| mana | .80 .85 .89 .912 | .55 .50 .46 .42 |
| verdant | .76 .81 .85 .88 | .54 .49 .45 .42 |
| ember | .80 .84 .88 .90 | .78 .72 .66 .45 |
| ruin | .66 .71 .76 .82 | .58 .53 .48 .42 |

Chroma is a peak per scale (dark and light: mithril .055 and .020, arcane .17 and .19, mana .12, verdant .13 and .14, ember .13 and .14, ruin .15 and .17) times a per-step fraction: dark `.15 .25 .4 .5 .6 .7 .8 .9 1 1 .9 .75`, light `.05 .12 .25 .35 .45 .55 .65 .8 1 1 1 .8`. Mithril uses its own fractions so the navy tint survives at every step: dark `.4 .6 .8 .9 1 1 1 1 1 1 .8 .4`, light `.3 .45 .6 .7 .85 1 1 1 1 1 1 1`.

### Values


**mithril**

| Mode | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dark | `#0b0d17` | `#111324` | `#181c33` | `#212540` | `#2a2f4d` | `#353a5a` | `#454b6b` | `#5a6183` | `#777ea2` | `#8990b4` | `#afb6d4` | `#e3e7f7` |
| light | `#fdfdff` | `#f7f9ff` | `#eff1fa` | `#e7e9f3` | `#dcdfeb` | `#d0d3e2` | `#b4b7c5` | `#888b99` | `#717481` | `#60636f` | `#4f525e` | `#181a24` |

**arcane**

| Mode | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dark | `#0a0d19` | `#0f1328` | `#161a3d` | `#1d2150` | `#242a64` | `#2d337a` | `#3a4295` | `#4c56b8` | `#8394ff` | `#96a7ff` | `#aab9ff` | `#c3ceff` |
| light | `#fdfdff` | `#f7f9ff` | `#eef1ff` | `#e3e8ff` | `#d6deff` | `#c7d2ff` | `#b3c0ff` | `#92a3ff` | `#565fde` | `#494fcc` | `#4042bf` | `#343997` |

**mana**

| Mode | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dark | `#051011` | `#02191b` | `#002327` | `#002e32` | `#00393e` | `#00464c` | `#00585f` | `#00717a` | `#44d4e1` | `#59e4f2` | `#79f0fc` | `#8ff5ff` |
| light | `#faffff` | `#effcfe` | `#dcf8fb` | `#caf2f6` | `#b6ebf0` | `#a0e2e8` | `#85d3db` | `#55bdc7` | `#00818b` | `#00717a` | `#00646c` | `#00585f` |

**verdant**

| Mode | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dark | `#06100b` | `#061910` | `#002516` | `#00311e` | `#003c26` | `#004a30` | `#005c3d` | `#00764f` | `#56cb98` | `#67dba7` | `#81e6b6` | `#9becc4` |
| light | `#fafffc` | `#f0fdf6` | `#defaeb` | `#cef4e0` | `#bbedd3` | `#a7e5c5` | `#8dd7b2` | `#62c195` | `#008359` | `#00734d` | `#006644` | `#005c3d` |

**ember**

| Mode | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dark | `#120d05` | `#1d1304` | `#2a1b00` | `#372400` | `#432d00` | `#523700` | `#664600` | `#835b00` | `#eab352` | `#f8c060` | `#ffcf80` | `#ffd898` |
| light | `#fffdfa` | `#fff8ee` | `#fff0d8` | `#fce6c5` | `#f7dcb1` | `#f0cf9b` | `#e4be7f` | `#d1a252` | `#e7ac3e` | `#d39923` | `#bf8600` | `#714e00` |

**ruin**

| Mode | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dark | `#160a09` | `#230d0d` | `#351011` | `#461517` | `#561a1d` | `#6a2024` | `#822b2f` | `#a23c40` | `#df6769` | `#f07778` | `#fb8c8c` | `#ffaaa8` |
| light | `#fffdfd` | `#fff7f6` | `#ffedec` | `#ffe1e0` | `#ffd4d2` | `#ffc3c1` | `#ffaaa8` | `#f58585` | `#cb454c` | `#ba343e` | `#a82131` | `#88222b` |

### Semantic color tokens

The full `color` group in v0. Every token resolves to one step in both modes except the contrast tokens, which pick a neutral step per mode.

| Token | Step | Role |
| --- | --- | --- |
| `--ult-color-surface` | mithril1 | page and app background |
| `--ult-color-surface-raised` | mithril2 | cards, panels, popovers |
| `--ult-color-surface-sunken` | mithril3 | wells, inputs, code blocks |
| `--ult-color-surface-hover` | mithril4 | rows and items on hover |
| `--ult-color-surface-overlay` | mithril2 at alpha `99` dark, `cc` light | glass tiles and scrims; the one token with alpha |
| `--ult-color-text` | mithril12 | body text |
| `--ult-color-text-muted` | mithril11 | secondary text |
| `--ult-color-text-subtle` | mithril10 | labels, captions, placeholders |
| `--ult-color-text-inverse` | mithril1 | text on inverted surfaces |
| `--ult-color-border` | mithril6 | hairlines |
| `--ult-color-border-strong` | mithril8 | input and control outlines |
| `--ult-color-border-focus` | arcane9 | focus rings |

For each hue role `accent` (arcane), `highlight` (mana), `success` (verdant), `warning` (ember), `danger` (ruin):

| Token | Step | Role |
| --- | --- | --- |
| `--ult-color-<role>` | step 9 | solid fill at rest |
| `--ult-color-<role>-hover` | step 10 | solid fill on hover |
| `--ult-color-<role>-active` | step 11 | solid fill when pressed |
| `--ult-color-<role>-subtle` | step 3 | tinted background for badges, callouts, chips |
| `--ult-color-<role>-text` | step 12 | the hue as text on neutral or subtle surfaces |
| `--ult-color-<role>-contrast` | mithril1, except `warning-contrast` is mithril12 in light | text on the solid fills |

`highlight` is the cyan role: links, token names, the top strength in the report. `border-focus` is arcane9 so a focus ring matches the accent in both modes.

### Contrast gate

WCAG 2.2 AA is the hard gate, checked by the generator in both modes for every pairing below. APCA is reported on the docs site as advice and never fails a build.

| Pairing | Minimum |
| --- | --- |
| `text`, `text-muted`, `text-subtle` on `surface`, `surface-raised`, `surface-sunken`, `surface-hover` | 4.5:1 |
| `<role>-text` on `surface`, `surface-raised`, `<role>-subtle` | 4.5:1 |
| `<role>-contrast` on `<role>`, `<role>-hover`, `<role>-active` | 4.5:1 |
| `border-strong`, `border-focus` on `surface`, `surface-raised` | 3:1 |

Lowest measured ratios today: `text-subtle` on `surface-hover` 4.78 dark and 4.94 light; `highlight-contrast` on `highlight` 4.58 light; `danger-contrast` on `danger` 4.60 light; `border-strong` on `surface-raised` 3.04 dark. A solid fill against `surface` is not gated; amber in light mode sits at 2:1 and is acceptable because the fill always carries text.

### Resolved values


**dark**

| Token | Value |
| --- | --- |
| `--ult-color-surface` | `#0b0d17` |
| `--ult-color-surface-raised` | `#111324` |
| `--ult-color-surface-sunken` | `#181c33` |
| `--ult-color-surface-hover` | `#212540` |
| `--ult-color-text` | `#e3e7f7` |
| `--ult-color-text-muted` | `#afb6d4` |
| `--ult-color-text-subtle` | `#8990b4` |
| `--ult-color-text-inverse` | `#0b0d17` |
| `--ult-color-border` | `#353a5a` |
| `--ult-color-border-strong` | `#5a6183` |
| `--ult-color-border-focus` | `#8394ff` |
| `--ult-color-accent` | `#8394ff` |
| `--ult-color-accent-hover` | `#96a7ff` |
| `--ult-color-accent-active` | `#aab9ff` |
| `--ult-color-accent-subtle` | `#161a3d` |
| `--ult-color-accent-text` | `#c3ceff` |
| `--ult-color-accent-contrast` | `#0b0d17` |
| `--ult-color-highlight` | `#44d4e1` |
| `--ult-color-highlight-hover` | `#59e4f2` |
| `--ult-color-highlight-active` | `#79f0fc` |
| `--ult-color-highlight-subtle` | `#002327` |
| `--ult-color-highlight-text` | `#8ff5ff` |
| `--ult-color-highlight-contrast` | `#0b0d17` |
| `--ult-color-success` | `#56cb98` |
| `--ult-color-success-hover` | `#67dba7` |
| `--ult-color-success-active` | `#81e6b6` |
| `--ult-color-success-subtle` | `#002516` |
| `--ult-color-success-text` | `#9becc4` |
| `--ult-color-success-contrast` | `#0b0d17` |
| `--ult-color-warning` | `#eab352` |
| `--ult-color-warning-hover` | `#f8c060` |
| `--ult-color-warning-active` | `#ffcf80` |
| `--ult-color-warning-subtle` | `#2a1b00` |
| `--ult-color-warning-text` | `#ffd898` |
| `--ult-color-warning-contrast` | `#0b0d17` |
| `--ult-color-danger` | `#df6769` |
| `--ult-color-danger-hover` | `#f07778` |
| `--ult-color-danger-active` | `#fb8c8c` |
| `--ult-color-danger-subtle` | `#351011` |
| `--ult-color-danger-text` | `#ffaaa8` |
| `--ult-color-danger-contrast` | `#0b0d17` |
| `--ult-color-surface-overlay` | `#11132499` |

**light**

| Token | Value |
| --- | --- |
| `--ult-color-surface` | `#fdfdff` |
| `--ult-color-surface-raised` | `#f7f9ff` |
| `--ult-color-surface-sunken` | `#eff1fa` |
| `--ult-color-surface-hover` | `#e7e9f3` |
| `--ult-color-text` | `#181a24` |
| `--ult-color-text-muted` | `#4f525e` |
| `--ult-color-text-subtle` | `#60636f` |
| `--ult-color-text-inverse` | `#fdfdff` |
| `--ult-color-border` | `#d0d3e2` |
| `--ult-color-border-strong` | `#888b99` |
| `--ult-color-border-focus` | `#565fde` |
| `--ult-color-accent` | `#565fde` |
| `--ult-color-accent-hover` | `#494fcc` |
| `--ult-color-accent-active` | `#4042bf` |
| `--ult-color-accent-subtle` | `#eef1ff` |
| `--ult-color-accent-text` | `#343997` |
| `--ult-color-accent-contrast` | `#fdfdff` |
| `--ult-color-highlight` | `#00818b` |
| `--ult-color-highlight-hover` | `#00717a` |
| `--ult-color-highlight-active` | `#00646c` |
| `--ult-color-highlight-subtle` | `#dcf8fb` |
| `--ult-color-highlight-text` | `#00585f` |
| `--ult-color-highlight-contrast` | `#fdfdff` |
| `--ult-color-success` | `#008359` |
| `--ult-color-success-hover` | `#00734d` |
| `--ult-color-success-active` | `#006644` |
| `--ult-color-success-subtle` | `#defaeb` |
| `--ult-color-success-text` | `#005c3d` |
| `--ult-color-success-contrast` | `#fdfdff` |
| `--ult-color-warning` | `#e7ac3e` |
| `--ult-color-warning-hover` | `#d39923` |
| `--ult-color-warning-active` | `#bf8600` |
| `--ult-color-warning-subtle` | `#fff0d8` |
| `--ult-color-warning-text` | `#714e00` |
| `--ult-color-warning-contrast` | `#181a24` |
| `--ult-color-danger` | `#cb454c` |
| `--ult-color-danger-hover` | `#ba343e` |
| `--ult-color-danger-active` | `#a82131` |
| `--ult-color-danger-subtle` | `#ffedec` |
| `--ult-color-danger-text` | `#88222b` |
| `--ult-color-danger-contrast` | `#fdfdff` |
| `--ult-color-surface-overlay` | `#f7f9ffcc` |
