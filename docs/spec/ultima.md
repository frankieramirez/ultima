# Ultima specification

The owning document for Ultima's conventions, tokens, and component contracts. Each section is written when its decision ticket closes; the map is [Map: Ultima design system spec](https://linear.app/frankie-ramirez/issue/ULT-1). Read `CONTEXT.md` for the glossary and `docs/adr/` for the hard-to-reverse choices.

## Principles

Decided on [Agent-first surface](https://linear.app/frankie-ramirez/issue/ULT-15). These are the generators, not a record. An ADR captures one choice and the alternatives it beat; this section holds what decides the next choice without being argued again. It is the section to read before touching anything.

A principle earns a line here only if it already settled a decision on the map, or would settle one still open. Nothing aspirational.

- **Dark-first, light as a full peer.** Dark is the default and the design target. Light is never best effort: every semantic token, every contrast check, and every demo exists in both modes.
- **Fantasy in the brand layer only.** The name, the six scale names, page titles, and the 404 carry the theme. Semantic token names, component names, part names, and prop names stay conventional, because they are the surface a stranger has to guess correctly.
- **One styling engine, one primitive library.** StyleX and Base UI, no Tailwind and no Radix (ADR 0001, ADR 0002). An escape hatch that reintroduces a second system is not an escape hatch, which is why the `style` slot takes StyleX styles and there is no `className`.
- **The consumer owns what they install.** Registry-first (ADR 0003): Ultima hands over source and gives up control of it. That is right for code and wrong for prose, which is why guidance is hosted rather than installed.
- **Tokens are the only source of raw values.** A literal in component code is a bug, not a shortcut. A new need becomes a new token.
- **Semantic names are stable, values are not.** A consumer re-skins at the semantic layer and nothing renames underneath them (ADR 0004).
- **Contrast is a build gate, not advice.** WCAG 2.2 AA passes or the palette does not ship. APCA is reported beside the pairings and never fails a build.
- **The docs site is the first user.** It imports from the workspace, so a convention that is painful to use gets felt before it ships.

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

The `[data-theme]` blocks are not redundant with the media query: they are how a consumer that is not ready for light mode pins the document to dark with one attribute on `<html>`, and how it later opts back into following the operating system by removing it. Mana's report adopts the export that way.

Constraints: plain CSS text, no `@import`, no `url()`, no remote fonts, no `</style>` or `<script` substrings, so it can be pasted into a self-contained HTML document. Written to `packages/tokens/dist/tokens.css` and served from the docs site as a registry file. Palette constants and compile-time groups do not appear. Legacy aliases for a specific consumer (mana's report) live with that consumer, not in the export.

### Tokens JSON export

The same generator run emits `tokens.json` beside `tokens.css`: the machine-readable form, for a tool or an agent that reasons about roles instead of parsing variable names out of a stylesheet.

One entry per semantic token, carrying its group, the scale and step it resolves to in each mode, the resolved value in each mode, and its contrast-gate result where the token appears in a checked pairing.

```json
{
  "version": 0,
  "tokens": {
    "--ult-color-accent": {
      "group": "color",
      "dark": { "scale": "arcane", "step": 9, "value": "#8394ff" },
      "light": { "scale": "arcane", "step": 9, "value": "#565fde" }
    }
  }
}
```

`packages/tokens/scripts/palette.json` is generator state and stays private: it holds raw scales with no role attached, and its shape is free to change. `tokens.json` is the published contract and carries only what a consumer may rely on. Written to `packages/tokens/dist/tokens.json` and served at `/tokens.json`.
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
| `--ult-color-<role>-border` | step 7 | hairline in the hue, for a chip, callout, or panel edge |
| `--ult-color-<role>-text` | step 12 | the hue as text on neutral or subtle surfaces |
| `--ult-color-<role>-contrast` | mithril1, except `warning-contrast` is mithril12 in light | text on the solid fills |

`highlight` is the cyan role: links, token names, the top strength in the report. `border-focus` is arcane9 so a focus ring matches the accent in both modes.

`<role>-border` was added on [Mana report adoption](https://linear.app/frankie-ramirez/issue/ULT-13), where the first real consumer needed a hairline in the accent hue and the set had no token for one. It is a decorative hairline and is not gated, the same as `--ult-color-border`; a control outline that must be seen uses `border-strong`.

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
| `--ult-color-accent-border` | `#3a4295` |
| `--ult-color-accent-text` | `#c3ceff` |
| `--ult-color-accent-contrast` | `#0b0d17` |
| `--ult-color-highlight` | `#44d4e1` |
| `--ult-color-highlight-hover` | `#59e4f2` |
| `--ult-color-highlight-active` | `#79f0fc` |
| `--ult-color-highlight-subtle` | `#002327` |
| `--ult-color-highlight-border` | `#00585f` |
| `--ult-color-highlight-text` | `#8ff5ff` |
| `--ult-color-highlight-contrast` | `#0b0d17` |
| `--ult-color-success` | `#56cb98` |
| `--ult-color-success-hover` | `#67dba7` |
| `--ult-color-success-active` | `#81e6b6` |
| `--ult-color-success-subtle` | `#002516` |
| `--ult-color-success-border` | `#005c3d` |
| `--ult-color-success-text` | `#9becc4` |
| `--ult-color-success-contrast` | `#0b0d17` |
| `--ult-color-warning` | `#eab352` |
| `--ult-color-warning-hover` | `#f8c060` |
| `--ult-color-warning-active` | `#ffcf80` |
| `--ult-color-warning-subtle` | `#2a1b00` |
| `--ult-color-warning-border` | `#664600` |
| `--ult-color-warning-text` | `#ffd898` |
| `--ult-color-warning-contrast` | `#0b0d17` |
| `--ult-color-danger` | `#df6769` |
| `--ult-color-danger-hover` | `#f07778` |
| `--ult-color-danger-active` | `#fb8c8c` |
| `--ult-color-danger-subtle` | `#351011` |
| `--ult-color-danger-border` | `#822b2f` |
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
| `--ult-color-accent-border` | `#b3c0ff` |
| `--ult-color-accent-text` | `#343997` |
| `--ult-color-accent-contrast` | `#fdfdff` |
| `--ult-color-highlight` | `#00818b` |
| `--ult-color-highlight-hover` | `#00717a` |
| `--ult-color-highlight-active` | `#00646c` |
| `--ult-color-highlight-subtle` | `#dcf8fb` |
| `--ult-color-highlight-border` | `#85d3db` |
| `--ult-color-highlight-text` | `#00585f` |
| `--ult-color-highlight-contrast` | `#fdfdff` |
| `--ult-color-success` | `#008359` |
| `--ult-color-success-hover` | `#00734d` |
| `--ult-color-success-active` | `#006644` |
| `--ult-color-success-subtle` | `#defaeb` |
| `--ult-color-success-border` | `#8dd7b2` |
| `--ult-color-success-text` | `#005c3d` |
| `--ult-color-success-contrast` | `#fdfdff` |
| `--ult-color-warning` | `#e7ac3e` |
| `--ult-color-warning-hover` | `#d39923` |
| `--ult-color-warning-active` | `#bf8600` |
| `--ult-color-warning-subtle` | `#fff0d8` |
| `--ult-color-warning-border` | `#e4be7f` |
| `--ult-color-warning-text` | `#714e00` |
| `--ult-color-warning-contrast` | `#181a24` |
| `--ult-color-danger` | `#cb454c` |
| `--ult-color-danger-hover` | `#ba343e` |
| `--ult-color-danger-active` | `#a82131` |
| `--ult-color-danger-subtle` | `#ffedec` |
| `--ult-color-danger-border` | `#ffaaa8` |
| `--ult-color-danger-text` | `#88222b` |
| `--ult-color-danger-contrast` | `#fdfdff` |
| `--ult-color-surface-overlay` | `#f7f9ffcc` |

## Components

Decided on [Component authoring conventions](https://linear.app/frankie-ramirez/issue/ULT-11), reacting to the [Button and Card prototype](https://linear.app/frankie-ramirez/issue/ULT-7). Every component in Ultima follows these rules so a second author or an agent produces the same shape.

### One file per component

A component is one file, `packages/ui/src/<name>.tsx`, and one registry item of the same name. The file holds the StyleX tables at module scope, then the parts, then the export. Compound components are still one file. Demos live in `apps/docs`, never beside the component.

Every file starts with `'use client'`. Base UI parts carry their own client boundary, but a plain component that uses `useRender` does not, and the directive is harmless under Vite.

### The shared lib

One registry item, `lib/component.ts`, holds the helper types every component uses. Components depend on it the way shadcn components depend on `lib/utils`.

```ts
import type * as stylex from '@stylexjs/stylex';

/** The only styling escape hatch: StyleX styles merged last, so they win per property. */
export type StyleProp = stylex.StyleXStyles;

/** A Base UI part's props with Ultima's style slot in place of className and style. */
export type PartProps<BaseProps> = Omit<BaseProps, 'className' | 'style'> & { style?: StyleProp };

/** A native element's props with the same treatment, for plain components. */
export type PlainProps<E extends keyof React.JSX.IntrinsicElements> = PartProps<React.ComponentProps<E>>;
```

### Props every component accepts

- `style?: StyleProp`, on every part and slot. It is the only escape hatch. Passed last to `stylex.props`, so a caller override wins per property.
- No `className`. Registry consumers own the source and edit it instead.
- `render`, on every Base UI part (passed through) and on the root of every plain component (through Base UI's `useRender`). Plain slots such as `Card.Header` are two-line functions with no `render`.
- `ref` is a plain prop under React 19. No `forwardRef`.

A Base UI part is written as `<BasePart {...props} {...stylex.props(styles.part, style)} />`. A plain root is written with `useRender({ defaultTagName, render, props: { ...props, ...stylex.props(styles.root, style) } })`.

### Compound components

A single-part component exports one function: `Button`, `Input`, `Switch`. A multi-part component exports one namespace object of parts, `Card.Root`, `Dialog.Popup`, matching Base UI's part names wherever a primitive exists. Parts Ultima does not style (`Dialog.Portal`, `Tooltip.Provider`) sit on the same object, re-exported unchanged, so a consumer imports one name. Flat `DialogPopup`-style exports do not exist.

### Variants and sizes

One `stylex.create` table per axis, indexed by the prop. The axis props are `variant` and `size` across the whole system; the tables are `variants` and `sizes`; the prop unions are `keyof typeof` each table and exported as `<Component>Variant` and `<Component>Size`. Defaults are declared in the destructure. There is no `cva` and no compound-variant table in v0: a value that depends on both variant and size nests as a conditional inside the variant table, and the spec notes it on that component.

```tsx
const variants = stylex.create({ solid: { ... }, outline: { ... }, ghost: { ... } });
const sizes = stylex.create({ sm: { ... }, md: { ... }, lg: { ... } });

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function Button({ variant = 'solid', size = 'md', style, ...props }: ButtonProps) {
  return <BaseButton {...props} {...stylex.props(styles.root, variants[variant], sizes[size], style)} />;
}
```

### State styling

- Pointer states use pseudo-classes and the state tokens: `':hover'` reads `--ult-color-<role>-hover`, `':active'` reads `--ult-color-<role>-active`. Never `color-mix()` or any color derived at the use site.
- Component state uses Base UI's data attributes inside the value: `':is([data-disabled])'`, `':is([data-open])'`, `':is([data-checked])'`. The `className` function form is never used, so the class stays static.
- Focus uses `':focus-visible'` and `--ult-color-border-focus`.
- Dynamic styles (function values in `stylex.create`) are allowed only for runtime numbers such as a meter width, never for variants.

### Tokens in component code

Token groups are imported from the tokens file and read by their literal key: `color['--ult-color-surface']`. No local aliases, no raw values. The registry rewrites the import path on install.

### What a component may assume about the consumer's CSS

Nothing. StyleX rules sit in a cascade layer, so any unlayered consumer reset beats them. Each component therefore sets its own `box-sizing`, `margin`, `appearance`, `font-family`, and `line-height` on its root. The install flow tells consumers that their global resets must sit inside an `@layer`.

### Naming

| Thing | Rule | Example |
| --- | --- | --- |
| File and registry item | kebab-case | `dropdown-menu.tsx`, item `dropdown-menu` |
| Component and parts | PascalCase | `DropdownMenu`, `DropdownMenu.Item` |
| Props type | `<Component>Props`, `<Component><Part>Props` | `ButtonProps`, `CardRootProps` |
| Axis unions | `<Component>Variant`, `<Component>Size` | `ButtonVariant` |
| Style tables | `styles` keyed by part, `variants`, `sizes` | `styles.root`, `styles.header` |

### The registry item

Each component's item carries: `name` equal to the file name, `type: registry:ui`, `title`, a one-sentence `description`, `dependencies` (`@base-ui/react` and `@stylexjs/stylex` as used), `registryDependencies` (`@ultima/tokens`, `@ultima/lib`, and any Ultima component it composes), exactly one `files` entry, and a `docs` line giving the import and a minimal usage. Composing another Ultima component is declared as a dependency, never copied in. Generating the JSON from the monorepo is decided on the registry ticket.

### The prototype

`packages/ui/src/prototype/` and the `/prototype/ult-7` route stay in place, marked throwaway, until the v0 build writes the real Button and Card and deletes them.

## Registry and install

Decided on [Registry layout and consumer install flow](https://linear.app/frankie-ramirez/issue/ULT-12), reacting to the [end-to-end install prototype](https://linear.app/frankie-ramirez/issue/ULT-8). Distribution is registry-first (ADR 0003); the constraints the shadcn CLI imposes are in `docs/research/2026-09-08-shadcn-registry-non-tailwind.md`.

### Catalogue

Every item lives under the `@ultima` namespace.

| Item | Type | Contents |
| --- | --- | --- |
| `tokens` | `registry:lib` | the token and theme sources from `packages/tokens` |
| `lib` | `registry:lib` | `lib/component.ts`, the shared helper types |
| `<component>` | `registry:ui` | one component, one file |
| `setup-vite` | `registry:item` | `components.json`, `ultima.vite.ts` |
| `setup-next` | `registry:item` | `components.json`, `babel.config.js`, `postcss.config.js`, `app/ultima.css` |
| `tokens-css` | `registry:item` | the generated tokens stylesheet at `~/ultima-tokens.css` |

Items are atomic. There are no bundles (`report-set`, `all`) and no `registry:base` item in v0: `registryDependencies` already pulls `tokens` and `lib` transitively, `shadcn add` takes several items in one call, and a bundle is a second place to forget a component. Both are additive later.

### Placement in the consumer

Flat, following shadcn's default rules. A `registry:ui` file lands in `aliases.ui` as `@/components/ui/<name>.tsx`; a `registry:lib` file lands in `aliases.lib` as `@/lib/<name>.ts`. Ultima does not namespace its installed files into an `ultima/` subfolder: that costs an explicit `target` on every file and makes the installed tree read as vendored, which fights the premise that the consumer owns the code. Ultima replaces shadcn's components rather than sitting beside them; a consumer who wants both resolves the `button.tsx` collision with `-p`.

### Host and namespace

Registry root `https://ultima.frankieramirez.com`. The catalogue is at `/r/registry.json`, each item at `/r/{name}.json`, and the tokens CSS export at `/tokens.css`. The docs site serves all of it.

The namespace is `@ultima`, written into the `registries` map of the `components.json` each setup item installs, so a consumer never runs `shadcn registry add` by hand.

### Entry point

`npx shadcn init` is not supported and never will be while its preflight requires Tailwind on disk. The documented entry is:

```bash
npx shadcn add https://ultima.frankieramirez.com/r/setup-vite.json   # or setup-next.json
npx shadcn add @ultima/button
```

The setup items are universal `registry:item`s, so the first command installs into a project with no `components.json` and no framework detection, and the second resolves through the namespace the first one wrote.

### Setup items

There is one setup item per target, and a setup item never overwrites a file the consumer's scaffold owns.

**Vite.** Installs `components.json` and `ultima.vite.ts` at the project root. `ultima.vite.ts` exports `ultimaStylex()`, the StyleX unplugin preconfigured with `useCSSLayers: true`, `runtimeInjection: false`, the `unstable_moduleResolution` root, and the `@/` alias. The consumer adds two lines to their own `vite.config.ts`: the import, and `ultimaStylex()` first in `plugins`. Shipping our own `vite.config.ts` would destroy theirs, which the prototype did and a real project cannot accept. `dependencies`: `@stylexjs/stylex`. `devDependencies`: `@stylexjs/unplugin`, `unplugin`.

**Next.js App Router.** Installs `components.json`, `babel.config.js`, `postcss.config.js`, and `app/ultima.css` (the `@stylex;` marker). None of those exist in a fresh App Router app, so nothing is clobbered; Turbopack finds the Babel config on its own. `dependencies`: `@stylexjs/stylex`. `devDependencies`: `@stylexjs/babel-plugin`, `@stylexjs/postcss-plugin`.

The `components.json` both items ship sets `style: "base-ultima"` (the `base-` prefix is what enables Base UI's `render` transform), an empty `tailwind.config`, `tailwind.cssVariables: true` (`false` switches on `transformCssVars`, which rewrites string literals in installed source), the flat aliases above, and `registries["@ultima"]`. `rsc` is `true` for Next and `false` for Vite.

A third target is a third setup item, held to the same rule.

### What the consumer still does by hand

The `docs` field of each setup item carries this as a short imperative list, printed at install. The docs site's install page is the canonical long form with the reasoning. Nothing is installed into the consumer's repo as a README.

- **Vite.** Add `"paths": { "@/*": ["./src/*"] }` to `tsconfig.json` and `tsconfig.app.json`. Without it the CLI writes files into a literal `./@/` directory and reports success. Then add `ultimaStylex()` to `vite.config.ts`, before the React plugin.
- **Next.js.** Import `./ultima.css` from `app/layout.tsx`.
- **Both.** Wrap global resets in an `@layer`. Every StyleX rule sits in a cascade layer, so an unlayered reset such as create-next-app's `* { padding: 0 }` beats component styles, including a Button's own padding.

### The tokens CSS export

Offered two ways. The stable URL `https://ultima.frankieramirez.com/tokens.css` is the documented path, and the one mana's audit report uses: it fetches or vendors the file and inlines it, which is why the export carries the self-contained-document constraints in the Tokens section. The `tokens-css` registry item writes the same generated file to `~/ultima-tokens.css` for a project that wants it committed alongside its own source.

### Generation

`registry/` is build output, not source. No file and no dependency list is maintained in two places: a component's source file is the truth for its code and its dependencies, and one manifest holds the prose.

`pnpm registry:build`:

1. **Stage.** Copy `packages/ui/src/*.tsx` to `registry/ultima/ui/` and `packages/tokens/src/*.ts` to `registry/ultima/lib/`, rewriting `@ultima/tokens/*` to `@/registry/ultima/lib/*` and `@ultima/ui/*` to `@/registry/ultima/ui/*`. Those are the specifiers shadcn's `transformImport` rewrites to the consumer's aliases on install; the workspace specifiers Ultima authors against are not.
2. **Derive.** Each item's `dependencies` come from that file's own imports (`@base-ui/react`, `@stylexjs/stylex`), and its `registryDependencies` from its `@ultima/*` imports.
3. **Describe.** `title`, `description`, and `docs` come from `registry/items.config.ts`, hand-written.
4. **Copy through.** `registry/static/**` holds the setup items' files, which are authored, not generated, and are copied untouched.
5. **Build.** `shadcn build registry.json -c registry -o ../apps/docs/public/r`. The `-c` is required: `shadcn build` resolves `files[].path` from the cwd, not from the directory of the `registry.json` its error message names.

`registry/ultima/`, `registry/registry.json`, and `apps/docs/public/r/*.json` are all gitignored. The docs site's build script runs `registry:build` first, so a deploy publishes the registry and the site together from one command.

## Docs site

Decided on [Docs site scope](https://linear.app/frankie-ramirez/issue/ULT-14). The site at `apps/docs` is three things at once: the reference for Ultima, the host of the registry and the tokens export, and a portfolio piece. It stays the Vite 8 plus TanStack Router SPA that [the scaffold](https://linear.app/frankie-ramirez/issue/ULT-6) built, with code-based routes.

### Page set

| Route | Holds |
| --- | --- |
| `/` | The pitch, a live demo strip, the two install commands |
| `/install` | The canonical long-form install per target, with the reasoning |
| `/tokens` | Every semantic token by group, live swatches in both modes, the tokens CSS export, and the APCA readout per semantic pairing |
| `/palette` | The six scales, twelve steps, dark and light values, the step convention, and the WCAG gate results |
| `/components` | Index of the v0 set |
| `/components/<name>` | One page per v0 component |
| `/rationale` | Why StyleX, why Base UI, why registry-first, why dark-first. Links the ADRs |

`/install` is the long form the `docs` field of each setup item points at; the setup items print a short imperative list and nothing is installed into the consumer's repo as a README.

`/palette` is the only page that reads the `defineConsts` layer, and the only place a scale name appears outside the token sources. The two contrast readouts are split by what they describe: the WCAG 2.2 AA gate is reported on `/palette` because it is a property of the steps, and the APCA numbers sit beside each semantic pairing on `/tokens` because they are advice about a role, not a build gate.

There is no changelog page in v0; versioning policy for a copy-source registry is not yet decided. There is no agents page: the agent-facing surface is `/llms.txt`, a generated artifact rather than a route, described in the Agent surface section.

### How the site gets its components

The docs site imports `@ultima/ui` and `@ultima/tokens` from the workspace. It does not `shadcn add` its own registry.

The registry is generated from the workspace source, so an installed copy can only ever be an older version of the same file. A docs site living on installed copies would document a version of Ultima that no longer exists, and every component change would need a reinstall before the page showing it caught up. The install path is proven instead by the fresh-app smoke test in `prototypes/`, the shape [the install prototype](https://linear.app/frankie-ramirez/issue/ULT-8) established.

This makes the docs site a user of the components rather than a consumer in the glossary's sense. Mana's report remains the first true consumer.

### Authoring

Content pages are MDX, one file per page under `apps/docs/src/content/`, compiled by `@mdx-js/rollup`. A single `Prose` component carries every typography style; MDX files hold no styling of their own. Routes stay code-based: a page module's default export is a component like any other, so MDX costs one plugin and no routing change.

Demos are real modules at `apps/docs/src/demos/<component>/<name>.tsx`, imported into the MDX and rendered live. The source shown under each demo is the same file read through Vite's `?raw` import, so the running example and the printed code cannot diverge. Each demo block has a copy button.

Props tables are hand-written in the MDX and cover only what Ultima adds: `variants`, `sizes`, the `style` slot, and `render`. The inherited surface links out to Base UI's own documentation. A generator would either dump Base UI's entire prop surface or nothing useful, and it reads namespace-object compound parts badly. Generating them is a later upgrade, not a v0 requirement.

### Hosting

One Vercel project, root directory `apps/docs`, build command `pnpm registry:build && vite build`, serving `ultima.frankieramirez.com` as a CNAME on the existing zone.

The site serves the registry catalogue at `/r/registry.json`, each item at `/r/{name}.json`, the tokens exports at `/tokens.css` and `/tokens.json`, and the agent guide at `/llms.txt`. All of them are generated into `apps/docs/public/` as gitignored build output, the same way the registry JSON is. The SPA fallback rewrite excludes `/r/*`, `/tokens.css`, `/tokens.json`, and `/llms.txt`, and all of them carry `Access-Control-Allow-Origin: *`: the shadcn CLI fetches server-side and mana vendors the CSS export, but a browser-side tool or an agent reading any of them should not be blocked.

### Portfolio surface

The fantasy voice lives in the brand layer only: the name, the six scale names, hero and page titles, and the 404. Technical prose is plain. The header carries a text wordmark and no icon; whether Ultima ships icons, and where the mana mark sits, is not decided here.

The header also carries a theme control offering dark, light, and system. Dark-first with light as a full peer is a claim the site should demonstrate rather than assert, and the control is the demonstration.

`/rationale` is the page that makes the system legible to a reader who is not installing it: the ADRs in prose, with the alternatives that were actually on the table.

### README

The repository README is a front door, not documentation. It carries what Ultima is in a few lines, one screenshot, the two install commands, links into the docs site, the stack, a v0-in-development status, and the license. The API surface belongs to the site.

The repository is MIT licensed. A registry-first system hands the consumer its source to own and edit, which is what MIT already describes.

## Agent surface

Decided on [Agent-first surface](https://linear.app/frankie-ramirez/issue/ULT-15). Two audiences that want opposite things: an agent working inside this repository needs to find the rules, and an agent in a consumer's repository needs the conventions without Ultima leaving files behind.

### Contributing to Ultima

`AGENTS.md` at the repository root is the entry point, and it is an index, never a copy. It keeps the `## Agent skills` block mana's setup writes, and adds four sections:

- **Principles** — a pointer to the Principles section of this document, read before touching anything.
- **Layout** — what lives in `packages/tokens`, `packages/ui`, and `apps/docs`, and that `registry/` is build output.
- **Rules that are easy to break** — one file per component; the `style` slot and no `className`; no raw values in component code; palette values come from the generator and are never hand-edited; `registry/` is regenerated by `pnpm registry:build`. One line each, each linking its section here.
- **Commands** — install, dev, build, registry build, palette regeneration.

A rule that needs a paragraph goes in this specification instead. `AGENTS.md` holding a second copy of a convention is how the two drift.

### The consumer's agent

Nothing is installed into the consumer's repository. Ultima ships no `AGENTS.md`, no `DESIGN.md`, and no guide file, for two reasons.

A root-level document is exactly the kind of file the consumer's scaffold owns, and the Registry section already forbids a setup item from overwriting one. More than that, a copied document is stale the day the next decision lands: the consumer has no reason to re-run `add` on prose, and unlike a component they have edited, nothing in their workflow will ever surface the drift. Owning source you modify is the point of registry-first. Owning documentation you never update is a liability Ultima would have handed them.

This is ADR 0005. Guidance is hosted instead, on three surfaces that cannot go stale:

| Surface | Audience | Holds |
| --- | --- | --- |
| The `docs` field on each registry item | install time | The import and a minimal usage, printed once by the CLI |
| `/llms.txt` | an agent in a consumer's repository | The conventions, the token names, and the component list as plain Markdown at one fetchable URL |
| `/rationale` and the component pages | a human | The long form |

`/llms.txt` is generated build output beside `/tokens.css`, not a hand-written file and not a route. It leads with the Principles section, then the component list with each component's import and the props Ultima adds, then the semantic token names. It is generated from this specification and the registry manifest, so no convention gets a third place to be updated.

### The authoring skill

A component-authoring skill exists, named `forge`, and it lives in this repository at `skills/forge/SKILL.md` rather than in mana.

Mana's skills are general by design, and the `ultima` audit skill's generality is its product. A skill that knows Base UI composition, per-axis StyleX variant tables, and Ultima's part-naming rules is the opposite of general, and it has to version with the conventions it encodes. A repository that wants it installs it from `frankieramirez/ultima`, the way mana's skills are installed from `frankieramirez/mana`.

Writing it is a build ticket after the first v0 components land. A skill with no components to pattern-match against is guesswork.

### The audit skill

Mana's `ultima` audit skill and this design system share a name and nothing else. The relationship runs one way, and through documents only.

The audit skill already reads a repository's `CONTEXT.md`, `docs/adr/`, and decision documents as its prior-decisions block, and already profiles a project for its design-system source of truth and its token values. Ultima's whole obligation is to keep those documents where that profile looks, and to publish `tokens.json` in a shape a generic parser can read.

The audit skill gets no Ultima-aware branch: no import, no special case, no lens that knows the word `mithril`. A project built on Ultima audits well because Ultima's tokens are legible, not because the tool was taught about them. Teaching it Ultima's tokens as a lens was ruled out on [Mana report adoption](https://linear.app/frankie-ramirez/issue/ULT-13) and stays ruled out.
