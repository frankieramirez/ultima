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
- **Ultima is the default kit for our StyleX React projects.** Core application components and common compositions belong on the roadmap, including the ones we otherwise reach for shadcn/ui to provide. This is a product scope commitment; public positioning can stay focused on Ultima.
- **The docs site is the first complete application.** It uses production Ultima components for every reusable UI pattern, including navigation and responsive controls. A missing reusable component is added to Ultima and consumed from the workspace. Page layout, prose typography, and branding may use site-specific StyleX.

## Tokens

Decided on [Token architecture](https://linear.app/frankie-ramirez/issue/ULT-9), with the scales and typefaces behind the non-color groups on [Non-color token values](https://linear.app/frankie-ramirez/issue/ULT-17). The palette and the semantic color values are in the Palette section below.

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
| `motion` (durations) | descriptive | `--ult-motion-fast` |

Color roles are conventional: surface, text, border, accent, and the status colors. Fantasy names appear only in palette scales. Interaction states (`-hover`, `-active`) are separate semantic tokens resolved to palette steps, never derived with `color-mix()`, because dark and light modes step in different directions.

In component code the key is used as written: `color['--ult-color-surface']`. That ergonomic cost is accepted for stable names.

### Token groups in v0

Themeable (emitted as custom properties): `color`, `space`, `text`, `font`, `radius`, `shadow`, and `motion` durations.

Compile-time only (`defineConsts`, never in the CSS export): `motion` easings, `border` widths, and `z-index`.

Motion durations were compile-time when ULT-9 fixed this list. [Non-color token values](https://linear.app/frankie-ramirez/issue/ULT-17) moved them, because a `defineVars` value can carry `@media (prefers-reduced-motion: reduce)` and collapse every duration to `1ms` in one place, where a `defineConsts` string cannot. Easings stay compile-time: there is nothing to override. `border` is the group added by the same ticket, so a component has a name to read instead of writing `1px`.

### Space

Twelve steps, mirroring the palette's twelve, in `rem` so spacing tracks the root font size. Fine at the bottom where component internals live, doubling at the top where page rhythm lives.

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| px | 2 | 4 | 6 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 |
| rem | 0.125 | 0.25 | 0.375 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2 | 2.5 | 3 | 4 |

The space scale is also the sizing scale. The three control heights are steps 9, 10, and 11 (32px, 40px, 48px) for `sm`, `md`, `lg`. A component never writes its own height, so `md` is the same physical height on Button, Input, and Select. There is no separate `size` group.

### Type

Eleven `text` steps, in `rem`. Step 5 is the body size. The bottom two steps exist for the uppercase micro-labels the report leans on.

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| px | 11 | 12 | 13 | 14 | 16 | 18 | 20 | 24 | 30 | 36 | 48 |
| rem | 0.6875 | 0.75 | 0.8125 | 0.875 | 1 | 1.125 | 1.25 | 1.5 | 1.875 | 2.25 | 3 |

A `text` step carries a size and nothing else. Leading is a separate token, chosen per use.

The rest of the `font` group:

| Token | Value |
| --- | --- |
| `--ult-font-weight-regular` | 400 |
| `--ult-font-weight-medium` | 500 |
| `--ult-font-weight-semibold` | 600 |
| `--ult-font-leading-none` | 1 |
| `--ult-font-leading-tight` | 1.2 |
| `--ult-font-leading-snug` | 1.35 |
| `--ult-font-leading-normal` | 1.55 |
| `--ult-font-leading-relaxed` | 1.75 |
| `--ult-font-tracking-tight` | -0.02em |
| `--ult-font-tracking-normal` | 0 |
| `--ult-font-tracking-wide` | 0.08em |
| `--ult-font-tracking-wider` | 0.14em |

There is no `bold` weight in v0. Nothing in the v0 set uses one, and adding a weight later is additive.

### Typefaces

Two families, and Ultima never loads a face.

```
--ult-font-sans: 'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
--ult-font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

Each value is a plain stack with a preferred face first and a full system fallback, so it renders correctly whether or not the face is present. No `@font-face` appears in the tokens CSS export, in `packages/tokens`, or in any component: the export must survive being pasted into a self-contained `file://` document, which is how mana's report renders. A project that wants IBM Plex loads it itself; the docs site self-hosts it rather than pulling from a font CDN.

There is no display family. Mana's `--pixel` (Pixelify Sans) stays mana's brand, and Ultima's own brand face is a docs-site concern, not a token, under Fantasy in the brand layer only.

### Radius

Five values, in `px` so corners do not grow with the font size.

| Token | Value | Used by |
| --- | --- | --- |
| `--ult-radius-xs` | 2px | swatches, bars, indicator dots |
| `--ult-radius-sm` | 4px | inline code, small insets |
| `--ult-radius-md` | 8px | Button, Input, Select trigger, menu items |
| `--ult-radius-lg` | 12px | Card, Dialog, popups |
| `--ult-radius-full` | 9999px | Badge and any pill |

### Shadow

Three steps. On a near-black ground a shadow does almost nothing, so elevation in dark comes from surface steps and a border; shadows earn their keep on the overlays (Dialog, Dropdown Menu, Select, Tooltip). Geometry is identical in both modes and only the alpha changes, which is why `shadow` is themeable rather than constant.

| Token | Dark | Light |
| --- | --- | --- |
| `--ult-shadow-sm` | `0 1px 2px rgba(0,0,0,.30), 0 1px 3px rgba(0,0,0,.40)` | `0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.10)` |
| `--ult-shadow-md` | `0 4px 8px rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.45)` | `0 4px 8px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.12)` |
| `--ult-shadow-lg` | `0 12px 24px rgba(0,0,0,.40), 0 24px 48px rgba(0,0,0,.50)` | `0 12px 24px rgba(0,0,0,.12), 0 24px 48px rgba(0,0,0,.18)` |

An overlay sets a border and a shadow together, never a shadow alone.

### Motion

Durations are themeable, so reduced motion is handled once at the token instead of at every transition.

| Token | Default | `@media (prefers-reduced-motion: reduce)` |
| --- | --- | --- |
| `--ult-motion-fast` | 120ms | 1ms |
| `--ult-motion-base` | 200ms | 1ms |
| `--ult-motion-slow` | 300ms | 1ms |

Easings are compile-time constants: `standard` `cubic-bezier(.2, 0, 0, 1)`, `enter` `cubic-bezier(0, 0, .2, 1)`, `exit` `cubic-bezier(.4, 0, 1, 1)`. A component reads a duration token for `transition-duration` and never writes a millisecond value.

### Border widths and z-index

Compile-time constants, not in the CSS export.

| Constant | Value |
| --- | --- |
| `border.hairline` | 1px |
| `border.focus` | 2px |
| `border.focusOffset` | 2px |
| `z.popup` | 50 |
| `z.toast` | 60 |

One border width across the system. A line that reads too heavy is fixed by dropping a palette step (6 rather than 7), not by thinning the border: `0.5px` is one device pixel on a 2x display and either a washed-out anti-aliased line or nothing at all on a 1x one, and making it resolution-conditional would force border widths into the CSS export for two values no consumer reads.

Base UI portals its popups to the end of `<body>`, but a consumer with its own stacking contexts still needs Ultima's overlays to declare something, which is what the two `z` constants are for. No other layer is tokenised.

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

Constraints: plain CSS text, no `@import`, no `url()`, no remote fonts, no `</style>` or `<script` substrings, so it can be pasted into a self-contained HTML document. Written to `packages/tokens/dist/tokens.css` by `pnpm --filter @ultima/tokens build`, served by the docs site at `/tokens.css`, and wrapped as the `tokens-css` registry item. Palette constants and compile-time groups do not appear. Legacy aliases for a specific consumer (mana's report) live with that consumer, not in the export.

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

The scale and step per token cannot be read back out of compiled CSS, so the export build reads them from the token sources' step assignments and the scales from `palette.json`, and runs the contrast gate over the same pairings the Palette section lists. One command, `pnpm --filter @ultima/tokens build`, produces both files; the docs site's build depends on it through the workspace.
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

Decided on [Component authoring conventions](https://linear.app/frankie-ramirez/issue/ULT-11), reacting to the [Button and Card prototype](https://linear.app/frankie-ramirez/issue/ULT-7). Every component in Ultima follows these rules so a second author or an agent produces the same shape. The release scope and v0 set are listed first; the rules follow.

### Release scope and core coverage

Scope amendment agreed on 2026-09-09. The original report-focused set remains the foundation. v0 also has to support the docs as a complete application, and the follow-up releases extend coverage to ordinary application work.

The checklist below is planned scope, not a statement that components have shipped. Check a component entry only when it has production source, an installable registry item with its dependencies, copyable docs examples, and the applicable browser interaction and accessibility checks. A recipe entry must identify its installable component dependencies and provide a copyable example covered by the applicable checks. Compositions also document how their constituent components fit together. Registry smoke installs must cover the expanded catalogue in Vite and Next.js.

#### v0: foundation and docs application

- [ ] Ship the fourteen foundation components in the table below.
- [ ] Ship Sidebar as a reusable component and use it for the docs menu. Its acceptance criteria are in the Docs site section.
- [ ] Build every reusable docs control from production Ultima components. Add any missing reusable components to the v0 catalogue and consume them from the workspace.
- [ ] Verify the docs at desktop and mobile widths in both color modes, including keyboard navigation and focus restoration after closing the mobile menu.
- [ ] Complete the registry generation pipeline, component documentation, and CI gates defined in this specification.

Sidebar's public parts, responsive state model, and dependencies need contracts before implementation. Reuse Dialog for mobile navigation if it satisfies that contract. If the implementation needs a separate Sheet or Drawer, promote that component from v0.2 into v0. The same rule applies to Breadcrumb, Collapsible, Separator, Scroll Area, or any other reusable pattern the docs needs. Search is not required for v0; adding it brings its missing component dependencies into the same release.

#### v0.1: everyday forms and feedback

- [ ] Field and Label, including descriptions, validation errors, and form integration examples.
- [ ] Textarea, Checkbox, and Radio Group.
- [ ] Combobox and Slider.
- [ ] Alert and Alert Dialog.
- [ ] Toast and Progress. Progress represents task completion; Meter remains the component for a bounded measurement.
- [ ] Skeleton, Spinner, and Empty.

The form examples must demonstrate submission and validation with a documented form integration, including disabled, required, and invalid states. Components needed by v0 move forward; they are not implemented a second time for this milestone.

#### v0.2: application compositions and remaining core coverage

- [ ] Command and a searchable command-dialog example.
- [ ] Calendar and Date Picker.
- [ ] Data Table with sorting, filtering, pagination, and row-selection examples.
- [ ] Accordion and Collapsible.
- [ ] Breadcrumb, Pagination, and Navigation Menu.
- [ ] Popover, Sheet, and Drawer.
- [ ] Context Menu, Menubar, and Hover Card.
- [ ] Avatar, Separator, and Scroll Area.
- [ ] Toggle and Toggle Group.
- [ ] Button Group, Input Group, Input OTP, and Native Select.
- [ ] Aspect Ratio, Resizable, and Carousel.
- [ ] Chart, Item, Kbd, and Typography recipes.

Each composition needs a dependency and accessibility decision before implementation. Calendar and Chart, for example, may need capabilities beyond Base UI. Any additional dependency must fit the StyleX-only styling contract; record an amendment to the primitive-library decision if its scope changes. The checklist describes supported capabilities, so a documented recipe may satisfy an entry where a separate component adds no useful behavior. Record that mapping explicitly when checking the entry.

#### v1: dependable default

v1 requires completed core coverage and a representative application built with Ultima that exercises forms, navigation, overlays, and data presentation without routinely requiring another UI kit. Installation must pass in both supported frameworks, and every shipped component must have documented contracts and the applicable checks. The copy-source registry's versioning and update policy must also be documented before v1.

Release labels here describe delivery milestones. They do not settle that update policy or commit Ultima to tracking every future shadcn/ui addition. New component needs are added to this checklist with an explicit milestone.

### The v0 set

The fourteen foundation components are the report set, which is the nine mana's audit report needs, plus five form and overlay components. v0 also includes Sidebar and any dependencies required by the docs application, as defined above. The table records the existing foundation contracts; add the new components when their contracts are settled. Each component is one file and one registry item. Parts follow the compound rule below: a component built on a Base UI primitive exposes every Base UI part under its own name, styled or passed through, and a plain component names its parts for what they are. The accessible name, focus ring, and element per component are in the Accessibility contract.

| Component | Item | Built on | Parts | Axes decided so far |
| --- | --- | --- | --- | --- |
| Button | `button` | Base UI `Button` | single | `variant`: `solid`, `outline`, `ghost`. `size`: `sm`, `md`, `lg`. `tone`: `accent`, `danger` |
| Badge | `badge` | `<span>` | single | `variant`: `subtle`, `solid`. `tone`: `neutral`, `accent`, `highlight`, `success`, `warning`, `danger` |
| Card | `card` | plain, `useRender` on Root | `Root`, `Header`, `Title`, `Description`, `Body`, `Footer` | none |
| Table | `table` | native `<table>` | `Root`, `Head`, `Body`, `Row`, `HeadCell`, `Cell`, `Caption` | none |
| Tabs | `tabs` | Base UI `Tabs` | `Root`, `List`, `Tab`, `Indicator`, `Panel` | `variant`: `underline`, `segmented` |
| Meter | `meter` | Base UI `Meter` | `Root`, `Label`, `Track`, `Indicator`, `Value` | `tone` on `Indicator` and on `Value`: `neutral`, `highlight`, `success`, `warning`, `danger` |
| Stat | `stat` | plain | `Root`, `Label`, `Value` | none |
| Code | `code` | `<code>`, or `<pre><code>` | single | `variant`: `inline`, `block` |
| Tooltip | `tooltip` | Base UI `Tooltip` | every Base UI part | none |
| Dialog | `dialog` | Base UI `Dialog` | every Base UI part | none |
| Dropdown Menu | `dropdown-menu` | Base UI `Menu` | every Base UI part | none |
| Select | `select` | Base UI `Select` | every Base UI part | `size` on `Trigger`: `sm`, `md`, `lg` |
| Input | `input` | Base UI `Input` | single | `size`: `sm`, `md`, `lg` |
| Switch | `switch` | Base UI `Switch` | `Root`, `Thumb` | none |

The `size` values on Button, Input, and Select are the three control heights from the space scale (steps 9, 10, 11), so `md` is the same height on all three. Card's parts are the prototype's six slots, accepted on the prototype reaction. Table's, Stat's, and Code's shapes were fixed with the accessibility contract.

Defaults, declared in each component's destructure: Button `solid` / `md` / `accent`; Badge `subtle` / `neutral`; Tabs `underline`; Meter `neutral` on both toned parts; Code `inline`; Input and Select `md`.

The axes above, which parts carry Ultima styles, and the per-component notes were decided on [Per-component contracts for the v0 set](https://linear.app/frankie-ramirez/issue/ULT-19). No component in v0 has an axis beyond `variant`, `size`, and `tone`.

Toast is planned for v0.1. If the docs needs it for a reusable interaction in v0, the docs application requirement brings it forward.

### One file per component

A component is one file, `packages/ui/src/<name>.tsx`, and one registry item of the same name. The file holds the StyleX tables at module scope, then the parts, then the export. Compound components are still one file. Demos live in `apps/docs`, never beside the component.

Every file starts with `'use client'`. Base UI parts carry their own client boundary, but a plain component that uses `useRender` does not, and the directive is harmless under Vite.

### The shared lib

One registry item, `lib/component.ts`, holds the helper types every component uses. Components depend on it the way shadcn components depend on `lib/utils`. In the workspace it lives at `packages/ui/src/lib/component.ts` and a component imports it as `@ultima/ui/lib/component`; the registry build stages it beside the token sources so it installs to `@/lib/component.ts`.

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

### Styled parts

A compound component exposes every Base UI part, but most parts have nothing to paint. Apply the same styling rule to every part, including parts added after the foundation set:

**A part carries Ultima styles if it paints — background, border, shadow, or color — or if it sets its own type or spacing. A part passes through unstyled if its whole job is to portal, position, or group.** Unstyled by that rule across the system: `Portal`, `Root`, `Group`, `RadioGroup`, `SubmenuRoot`, and `Viewport`, except where a component's row below says otherwise. `Positioner` is a near-exception: it gets `outline: 0` and nothing else, following Base UI's own demos.

**Triggers that wrap the consumer's element pass through unstyled.** `Menu.Trigger`, `Tooltip.Trigger`, `Dialog.Trigger`, and `Dialog.Close` exist to be given the consumer's own button through `render`, and `stylex.props` does not merge foreign class strings, so an Ultima style on the wrapper and an Ultima style on the Button rendered into it collide instead of cascading. Each is documented as `render={<Button />}` and ships no styles at all, not even the reset or the focus ring. `Select.Trigger` is styled, because it *is* the control rather than a wrapper around one.

This qualifies the focus-ring rows in the accessibility contract below: on Dropdown Menu, Tooltip, and Dialog the ring is rendered by whatever the consumer puts in the trigger or close slot, and each docs page says the slot must hold an Ultima Button or an element carrying its own ring.

| Component | Styled | Passed through |
| --- | --- | --- |
| Dropdown Menu | `Popup`, `Item`, `LinkItem`, `CheckboxItem`, `RadioItem`, `SubmenuTrigger`, `CheckboxItemIndicator`, `RadioItemIndicator`, `Separator`, `GroupLabel`, `Arrow` | `Root`, `Trigger`, `Portal`, `Backdrop`, `Positioner` (`outline: 0`), `Group`, `RadioGroup`, `SubmenuRoot`, `Viewport` |
| Select | `Label`, `Trigger`, `Value`, `Icon`, `Popup`, `Item`, `ItemText`, `ItemIndicator`, `ScrollUpArrow`, `ScrollDownArrow`, `Separator`, `GroupLabel` | `Root`, `Portal`, `Backdrop`, `Positioner` (`outline: 0`), `List`, `Group`, `Arrow` |
| Dialog | `Viewport`, `Backdrop`, `Popup`, `Title`, `Description` | `Root`, `Trigger`, `Portal`, `Close` |
| Tooltip | `Popup`, `Arrow` | `Provider`, `Root`, `Trigger`, `Portal`, `Positioner` (`outline: 0`), `Viewport` |
| Tabs | `Root`, `List`, `Tab`, `Indicator`, `Panel` | none |
| Meter | `Root`, `Label`, `Track`, `Indicator`, `Value` | none |
| Switch | `Root`, `Thumb` | none |

`Dialog.Viewport` and `Select`'s scroll arrows are the two parts the rule alone would get wrong, and the per-component notes say why each is styled.

The five plain components (Card, Table, Stat, Code, Badge) have no pass-through parts: Ultima writes every element, so every part is styled.

### Variants, sizes, and tones

Three axis props across the whole system, and no others: `variant` (shape and emphasis), `size` (the three control heights), and `tone` (which color role the component wears). A component declares only the axes it needs, and only the values it supports. The tables are `variants`, `sizes`, and `tones`; the prop unions are `keyof typeof` each table, exported as `<Component>Variant`, `<Component>Size`, and `<Component>Tone`. Defaults are declared in the destructure. There is no `cva`.

`tone` was added on [Per-component contracts for the v0 set](https://linear.app/frankie-ramirez/issue/ULT-19), for the three v0 components that let a caller choose a hue: Button, Badge, and Meter. Its values are named for the color roles, so `tone="danger"` reaches `--ult-color-danger` and `--ult-color-danger-contrast` together and the caller never names a token. A component that needs a neutral tone includes `neutral` in its own table; `neutral` is not a color role and has no `--ult-color-neutral`, so each component says which neutral tokens it uses.

One `stylex.create` table per axis, indexed by the prop:

```tsx
const sizes = stylex.create({ sm: { ... }, md: { ... }, lg: { ... } });

export type ButtonSize = keyof typeof sizes;
```

**The one compound.** `variant` and `size` never set the same property, so they layer. `variant` and `tone` both set color, so they cannot: whichever comes last in `stylex.props` wins the property outright, and `outline` would lose its transparent background to a tone's fill, or the tone would lose its fill to `outline`. Where a component has both axes they merge into one nested lookup, one `stylex.create` per variant holding that variant's tones, read as `variants[variant][tone]`:

```tsx
const solid = stylex.create({ accent: { ... }, danger: { ... } });
const outline = stylex.create({ accent: { ... }, danger: { ... } });
const ghost = stylex.create({ accent: { ... }, danger: { ... } });
const variants = { solid, outline, ghost };

export type ButtonVariant = keyof typeof variants;
export type ButtonTone = keyof typeof solid;

export function Button({ variant = 'solid', size = 'md', tone = 'accent', style, ...props }: ButtonProps) {
  return <BaseButton {...props} {...stylex.props(styles.root, variants[variant][tone], sizes[size], style)} />;
}
```

Every cell is written out. The tables stay small because each component declares only the tones it supports: six cells on Button, twelve on Badge. A value that depends on both `variant` and `size` still nests as a conditional inside the variant table, and the spec notes it on that component.

The local-custom-property alternative, where `tone` sets `--ult-tone-fill` and one variant table reads it, is closed: StyleX emits `create` rules that set custom properties outside the cascade layer when `useCSSLayers` is on ([#1611](https://github.com/facebook/stylex/issues/1611)), and Ultima keeps `useCSSLayers`. Revisit if that is fixed; the nested tables are a private detail of each file, so the change would not reach consumers' props.

### State styling

- Pointer states use pseudo-classes and the state tokens: `':hover'` reads `--ult-color-<role>-hover`, `':active'` reads `--ult-color-<role>-active`. Never `color-mix()` or any color derived at the use site.
- Component state uses Base UI's data attributes inside the value: `':is([data-disabled])'`, `':is([data-open])'`, `':is([data-checked])'`. The `className` function form is never used, so the class stays static.
- Focus uses `':focus-visible'` and `--ult-color-border-focus`.
- Dynamic styles (function values in `stylex.create`) are allowed only for runtime numbers such as a meter width, never for variants.

### Tokens in component code

Token groups are imported from the tokens file and read by their literal key: `color['--ult-color-surface']`. No local aliases, no raw values. The registry rewrites the import path on install.

### What a component may assume about the consumer's CSS

Nothing. StyleX rules sit in a cascade layer, so any unlayered consumer reset beats them. Each component therefore sets its own `box-sizing`, `margin`, `appearance`, `font-family`, and `line-height` on its root. The install flow tells consumers that their global resets must sit inside an `@layer`.

### Focus ring

One rule across the system, written inline in each component beside its base reset:

```ts
':focus-visible': { outline: `${border.focus} solid ${color['--ult-color-border-focus']}`, outlineOffset: border.focusOffset },
```

`outline` rather than `box-shadow`, because an outline survives Windows forced-colors mode. The offset is the same everywhere, dense forms included. Which parts render it is fixed per component in the contract below: every part that takes keyboard focus directly gets the ring; Menu and Select items are highlighted through `data-highlighted` with `--ult-color-surface-hover` and render no ring; Dialog, Menu, and Select popups set `outline: none`, since Base UI focuses them only as a fallback container and the popup itself is the visible signal.

### Accessibility contract

Decided on [Accessibility contract per v0 component](https://linear.app/frankie-ramirez/issue/ULT-18). Base UI supplies the roles, ARIA state, keyboard handling, and focus management for every interactive primitive, following the WAI-ARIA Authoring Practices. Ultima adds nothing and removes nothing there. What Ultima owns is the accessible name, the visible focus ring, and the element choice for the plain components. The table records both halves so a builder does not re-implement what the primitive gives.

| Component | Element or primitive | Name source | Focus ring on | Keyboard | Enforced by |
| --- | --- | --- | --- | --- | --- |
| Button | Base UI `Button` (`<button>`) | Text content; a Button with no text passes `aria-label` | Root | Base UI | Docs |
| Input | Base UI `Input` (`<input>`) | Consumer `<label htmlFor>`, `aria-label`, or `aria-labelledby` | Root | Native | Docs |
| Switch | Base UI `Switch` | Wrapping `<label>`, `aria-label`, or `aria-labelledby` | Root | Base UI (Space, Enter) | Docs |
| Select | Base UI `Select` | `Select.Label`, or `aria-label` on Trigger | Trigger | Base UI (arrows, typeahead, Escape) | Docs |
| Dropdown Menu | Base UI `Menu` | Trigger text, or `aria-label` on Trigger | Trigger | Base UI (arrows loop, Enter, Space, typeahead, Escape, Tab closes) | Docs |
| Dialog | Base UI `Dialog` | `Dialog.Title`, always rendered; `Dialog.Description` optional | Close, and any focusable content | Base UI (Tab loops, Escape closes, focus returns to trigger) | Docs |
| Tabs | Base UI `Tabs` | Tab text | Tab | Base UI (arrows, `activateOnFocus` and `loopFocus` defaults) | Base UI |
| Tooltip | Base UI `Tooltip` | `aria-label` on `Tooltip.Trigger`, matching the tooltip text | Trigger's rendered element | Base UI (focus opens, Escape closes) | Types: `'aria-label'` required on `Tooltip.Trigger` |
| Meter | Base UI `Meter` | `Meter.Label` | None (not focusable) | None | Docs |
| Table | `<table>` parts | `Table.Caption` optional | None | Static | Native |
| Stat | `<div>` root, `<span>` label and value | `Stat.Label`, before `Stat.Value` in DOM order | None | Static | Native |
| Code | `<code>`, or `<pre><code>` for the block variant | Content | None | Static | Native |
| Badge | `<span>` | Content; color never carries meaning alone | None | Static | Docs |
| Card | `<div>` parts | `Card.Title` renders `<h3>` by default, changeable through `render` | None | Static | Native |

Rules the table compresses:

- **Types enforce one thing.** `Tooltip.Trigger` requires `'aria-label': string`, because Base UI wires nothing between a tooltip and its trigger for assistive technology. Every other name source varies with context (a visible label, a labelling element, a child part), and a type cannot see children or siblings, so those are documented rules. Requiring `aria-label` on Input would steer authors to the worst of their three options.
- **Wrapper triggers render the ring, not Ultima.** `Dropdown Menu`, `Tooltip`, and `Dialog` name a Trigger or Close in the focus-ring column, and those parts pass through unstyled under Styled parts above, so the ring comes from the element the consumer renders into the slot. The docs page for each says the slot must hold an Ultima Button or an element carrying its own ring. `Select.Trigger` is styled by Ultima and renders its own ring.
- **Icon-only Button** is a documented rule, not a component: no `IconButton` and no `iconOnly` prop in v0.
- **Input works without Field.** Its validation state is the consumer's `aria-invalid`, styled through `':is([aria-invalid="true"])'` with `--ult-color-danger-border`. Field is planned for v0.1 and moves into v0 if the docs needs it; adding it preserves standalone Input usage.
- **Dialog always renders a Title.** Base UI sets `aria-labelledby` only when one exists. A design with no visible heading hides the Title through the `style` slot rather than omitting it. `modal` stays Base UI's default (`true`).
- **Table** parts are `Table.Root` `<table>`, `Table.Head` `<thead>`, `Table.Body` `<tbody>`, `Table.Row` `<tr>`, `Table.HeadCell` `<th scope="col">` (scope overridable), `Table.Cell` `<td>`, `Table.Caption` `<caption>`. There is no scroll wrapper: a consumer who needs horizontal scroll wraps the table in a `tabIndex={0}` region, and the docs page says so.
- **Code** blocks wrap long lines rather than scroll, so the block needs no `tabIndex`.
- **Plain components are static.** No `tabIndex`, no key handlers.
- **Reduced motion** is handled entirely by the motion tokens dropping to 1ms. Components never write a `prefers-reduced-motion` query, and every transition reads a duration token, so Base UI's transition-aware unmount still fires.
- **Forced colors.** No `@media (forced-colors)` rules in v0. Native elements, `outline` rings, and state on real elements degrade on their own. The exception is `Switch.Thumb`, a `<span>` that would lose its fill, so it carries a hairline `border` so it stays visible.

Each component's docs page carries an Accessibility section restating its row. Automated checking is in the Testing section below: each row becomes assertions in that component's test file, and axe runs over every docs demo in both color modes.

### Overlays

Dialog, Dropdown Menu, Select, and Tooltip share one popup recipe. Additional overlays required by the docs reuse its tokens and transitions, with placement and motion appropriate to the component documented in their contracts.

- **Surface.** `--ult-color-surface-raised`, a hairline `--ult-color-border`, `--ult-radius-lg`, and `--ult-shadow-md`. An overlay always sets a border and a shadow together, never a shadow alone. `z.popup`.
- **Transition.** `transform-origin: var(--transform-origin)`, which Base UI's positioner seeds before Floating UI measures. Transition `opacity` and `transform` over `--ult-motion-fast` with the `enter` easing; `[data-starting-style]` and `[data-ending-style]` both sit at `opacity: 0` and `transform: scale(0.98)`, with the `exit` easing on the closing side. Tooltip is the one narrower case: `--ult-radius-sm`, `--ult-shadow-sm`, and text step 2.
- **Backdrop.** Only Dialog has a visible one: `--ult-color-surface-overlay`, fading opacity alone over `--ult-motion-base`. Menu's and Select's backdrops are invisible click-catchers and stay unstyled.
- **Reduced motion** needs no rule. Every duration is a token that already collapses to `1ms`, and Base UI's transition-aware unmount still fires at that duration.
- **`keepMounted` is never set by Ultima.** Base UI's default (unmount when closed) stands, because how much closed DOM a page carries is the consumer's decision and the transition does not need the popup mounted. A consumer who wants it passes it through.

### Iconography

Decided on [Iconography in v0](https://linear.app/frankie-ramirez/issue/ULT-21). Base UI ships no glyphs: `Select.Icon`, `Select.ItemIndicator`, `Menu.CheckboxItemIndicator`, and `Menu.RadioItemIndicator` are empty containers, and `Menu.SubmenuTrigger` has no trailing affordance of its own. The foundation components fill those five slots. New components document any additional built-in glyphs in their contracts and follow the same private SVG convention.

**No registry item declares an icon dependency.** Not `lucide-react`, not any other set. Ultima needs four glyphs, and a declared dependency would put a package in every consumer's tree for four paths, pick their icon library on their behalf, and leave anyone already standardized on another set carrying two. Adding one later is additive, so this is cheap to reverse if a consumer ever asks.

**Glyphs are inline SVG, private to the component file that uses them.** Not exported, and not a shared `lib/icons` item. One file per component is the load-bearing rule and the registry rewards a self-contained item, so each file carries its own. The check glyph is written out twice rather than pulling a third lib item into every component install.

| Glyph | Slot | File |
| --- | --- | --- |
| chevron-down | `Select.Icon` | `select.tsx` |
| check | `Select.ItemIndicator` | `select.tsx` |
| check | `Menu.CheckboxItemIndicator` | `dropdown-menu.tsx` |
| dot | `Menu.RadioItemIndicator` | `dropdown-menu.tsx` |
| chevron-right | `Menu.SubmenuTrigger`, trailing | `dropdown-menu.tsx` |

`select.tsx` and `dropdown-menu.tsx` are the foundation files with built-in glyphs. Sidebar and any components added for the docs must settle their glyph slots with their component contracts.

**Geometry.** A 24×24 `viewBox`, `fill="none"`, `stroke="currentColor"`, `stroke-width: 1.5`, round caps and joins. The weight matches Phosphor's regular, which the docs demos use: Phosphor draws on a 256 grid with the stroke pre-expanded into filled geometry at 16 units, about 1.5px optical at 24px. Ultima keeps a 24×24 `viewBox` anyway, because hand-drawing four glyphs on a 256 grid buys nothing a reader can see. The seam is placed deliberately: a consumer's icon set is unknowable and a consumer who dislikes the chevron edits four lines in a file they own, while a mismatch on the docs pages is visible on every component page and fixable by nobody but us. `currentColor` means a glyph inherits its part's color and never names a token, which keeps the rule in Tokens in component code intact. The dot is a filled `<circle>`, the one exception to `fill="none"`.

**Size is `1em`, with `flex-shrink: 0`.** A glyph tracks the text step of the part holding it, so the 14px menu item and the 16px Select trigger get proportional chevrons with no coordination between them. No icon step joins the space scale, there is no `--ult-size-icon`, and no glyph gets a `size` axis. Phosphor's `IconContext` defaults to `size: "1em"` and `color: "currentColor"`, so the demo icons and Ultima's own glyphs size and color by the same mechanism with nothing to reconcile.

**Overriding.** A slot whose whole content is a glyph renders the default and takes `children` as a replacement:

```tsx
<BaseSelect.Icon {...props} {...stylex.props(styles.icon, style)}>{children ?? <ChevronDown />}</BaseSelect.Icon>
```

`Menu.SubmenuTrigger` is the exception. Its children are the item's label, so its chevron is appended after them and is not overridable in v0.

**The leading indicator slot.** The fixed-width slot the Dropdown Menu and Select notes call for is space step 6 (16px) wide with a space step 4 (8px) gap, reusing the item's own inline padding step. It is present whether or not an indicator renders, so item text aligns down the column.

**Dialog's close affordance ships no glyph.** `Dialog.Close` passes through unstyled and is handed the consumer's own element, so there is nothing for Ultima to put an X inside. The Dialog docs page's canonical example is `render={<Button variant="ghost">Close</Button>}` with a text label, and a second example shows a glyph the reader supplies alongside `aria-label`. An X in Ultima's set would exist only to be rendered into a slot Ultima does not style.

**Icons in the docs.** `apps/docs` takes `@phosphor-icons/react` as a devDependency, for demos that need a glyph Ultima does not ship: a leading icon on a Button, icons on menu items, Dialog's close. Weight is set once to `regular` through `IconContext` rather than per icon. The printed source shows the import rather than hiding it, and each component page carries one line saying Ultima ships no icon dependency and any set works. None of this reaches the registry: the package is MIT, has no runtime dependencies, and is tree-shakeable with `sideEffects: false`, so only the icons a demo names reach the built site.

**Icon-only Button** stays the documented rule the [accessibility contract](https://linear.app/frankie-ramirez/issue/ULT-18) fixed. No `IconButton`, no `iconOnly` prop. The Button docs page prints the recipe: `aria-label`, the consumer's glyph as the only child, and a `style` override setting `paddingInline` to the block padding so the control is square at its size.

### Per-component notes

What a builder would otherwise guess, beyond the axes, the styled parts, and the accessibility contract.

- **Button.** The `accent` column of `variants[variant][tone]` is the behavior already decided: `solid` is the role fill with `-hover` and `-active` and `<role>-contrast` text; `outline` is a transparent fill with `--ult-color-border` and `--ult-color-text`; `ghost` is transparent with `--ult-color-text-muted`. The `danger` column recolors all three to the ruin role: `outline` takes `--ult-color-danger-border` and `--ult-color-danger-text`, `ghost` takes `--ult-color-danger-text` with a `--ult-color-danger-subtle` hover. Icon-only stays a documented rule, not a prop.
- **Badge.** One size: text step 2, `--ult-font-tracking-wide`, weight medium, `--ult-radius-full`, padding from space steps 1 and 3. `subtle` is `<role>-subtle` fill, `<role>-text`, `<role>-border` hairline — mana's `.chip` exactly. `solid` is `<role>` fill, `<role>-contrast` text, transparent border. The `neutral` tone has no color role to resolve to, so it names neutral tokens directly: `subtle` takes `--ult-color-surface-sunken`, `--ult-color-text-muted`, `--ult-color-border`; `solid` takes `--ult-color-surface-hover` and `--ult-color-text`, a pairing the contrast gate already covers. Badge is static and carries no interaction states.
- **Tabs.** `underline` gives `List` a bottom hairline and `Indicator` a 2px `--ult-color-accent` bar; the active `Tab` is `--ult-color-text`, the rest `--ult-color-text-muted`. `segmented` gives `List` a `--ult-color-surface-sunken` ground, `--ult-radius-md`, space step 1 of padding and gap, and `Indicator` becomes a `--ult-color-surface-raised` pill at `--ult-radius-sm` sitting behind the active tab. Both read `data-orientation`; both transition `Indicator` over `--ult-motion-fast`. `Panel` sets spacing only.
- **Meter.** `Track` is `--ult-color-surface-sunken` at `--ult-radius-full`, height space step 2. `Indicator` is the toned fill: `<role>` for the four hue tones, `--ult-color-border-strong` for `neutral`. `Value` is the toned number: `<role>-text`, or `--ult-color-text` for `neutral`. The two parts take `tone` separately, which is the whole of the "no context in v0" position — a caller wanting both colored passes `tone` twice. `Indicator`'s width is the one place a dynamic style is allowed. `Label` is text step 2 uppercase with `--ult-font-tracking-wide` and `--ult-color-text-subtle`.
- **Dialog.** `Viewport` is styled and does the centering: `position: fixed`, `inset: 0`, `display: grid`, `place-items: center`, padding from space step 6, `z.popup`. `Popup` therefore sets no position and no transform of its own, which is why the shared `scale(0.98)` transition works on it at all — centering the popup with `translate(-50%, -50%)` would have fought it. `Popup` takes the overlay surface plus a `max-width` and `max-height: 100%` with `overflow: auto`. `Title` is text step 6, semibold, `--ult-font-leading-tight`; `Description` is text step 4 in `--ult-color-text-muted`. `modal` stays Base UI's default, and a Title is always rendered.
- **Dropdown Menu.** One shared item style is applied to `Item`, `LinkItem`, `CheckboxItem`, `RadioItem`, and `SubmenuTrigger`: `--ult-radius-md`, padding from space steps 2 and 4, text step 4, `data-highlighted` to `--ult-color-surface-hover`, `data-disabled` to reduced opacity, and no focus ring. `SubmenuTrigger` also highlights on `data-popup-open`. Submenus are in v0: the parts are on the namespace by the compound rule either way, so leaving `SubmenuTrigger` unstyled would ship a public part that renders broken. The checkbox and radio indicators are a fixed-width leading slot so item text aligns whether or not one is present. `Separator` is a `--ult-color-border` hairline with space step 2 of margin; `GroupLabel` is text step 2 uppercase, `--ult-font-tracking-wide`, `--ult-color-text-subtle`.
- **Select.** `Trigger` is the control: the `size` axis heights, `--ult-color-surface-sunken`, `--ult-color-border-strong`, `--ult-radius-md`, the focus ring, and `':is([aria-invalid="true"])'` to `--ult-color-danger-border`, matching Input. `Value` reads `data-placeholder` for `--ult-color-text-subtle`. `Icon` is `--ult-color-text-subtle` and does not rotate — one less transition to keep in step with the popup's. Items share Menu's item style plus a `data-selected` weight change, and `ItemIndicator` is the same fixed leading slot. The scroll arrows are styled against the rule because they paint: a `--ult-color-surface-raised` band that hides the list edge, shown on `data-visible`. `alignItemWithTrigger` keeps Base UI's default; the popup style assumes no side, so `data-side="none"` needs no special case. The Select docs page carries the CSP note, since the aligned popup injects an inline `<style>` to hide scrollbars.
- **Tooltip.** The narrow overlay: `--ult-radius-sm`, `--ult-shadow-sm`, text step 2, padding from space steps 2 and 3, and a `max-width` so long text wraps. `Arrow` is `--ult-color-surface-raised` with the same hairline. `Tooltip.Trigger` still requires `aria-label` in its types; that is unchanged by its passing through unstyled.
- **Switch.** One size, from the space scale: track space step 10 wide by step 8 tall at `--ult-radius-full`, thumb space step 7 at `--ult-radius-full` with space step 1 of inset. Track is `--ult-color-border-strong` unchecked and `--ult-color-accent` on `data-checked`; the thumb is `--ult-color-surface` plus the hairline border the forced-colors rule requires. The thumb transitions `translate` over `--ult-motion-fast`. The focus ring is on Root.
- **Input.** No notes beyond the `size` axis and the accessibility contract: `--ult-color-surface-sunken`, `--ult-color-border-strong`, `--ult-radius-md`, the focus ring, `aria-invalid` to `--ult-color-danger-border`, and `--ult-color-text-subtle` for `::placeholder`.
- **Card, Table, Stat, Code.** Unchanged. They have no axes beyond Code's `variant`, no pass-through parts, and no state.

### Naming

| Thing | Rule | Example |
| --- | --- | --- |
| File and registry item | kebab-case | `dropdown-menu.tsx`, item `dropdown-menu` |
| Component and parts | PascalCase | `DropdownMenu`, `DropdownMenu.Item` |
| Props type | `<Component>Props`, `<Component><Part>Props` | `ButtonProps`, `CardRootProps` |
| Axis unions | `<Component>Variant`, `<Component>Size`, `<Component>Tone` | `ButtonVariant` |
| Style tables | `styles` keyed by part, `variants`, `sizes`, `tones` | `styles.root`, `styles.header` |
| Nested tone tables | one `stylex.create` per variant, named for the variant, collected in `variants` | `solid`, `outline`, `ghost` |

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
| `lib` | `registry:lib` | `component.ts`, the shared helper types, installed to `@/lib/component.ts` |
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

1. **Stage.** Copy `packages/ui/src/*.tsx` to `registry/ultima/ui/`, and `packages/tokens/src/*.ts` plus `packages/ui/src/lib/*.ts` to `registry/ultima/lib/`. `index.ts`, `prototype/`, and `__tests__/` are not staged. Rewrite `@ultima/tokens/*` and `@ultima/ui/lib/*` to `@/registry/ultima/lib/*`, and any other `@ultima/ui/*` to `@/registry/ultima/ui/*`. Those are the specifiers shadcn's `transformImport` rewrites to the consumer's aliases on install; the workspace specifiers Ultima authors against are not.
2. **Derive.** Each item's `dependencies` come from that file's own imports (`@base-ui/react`, `@stylexjs/stylex`), and its `registryDependencies` from its `@ultima/*` imports.
3. **Describe.** `title`, `description`, and `docs` come from `registry/items.config.ts`, hand-written.
4. **Copy through.** `registry/static/**` holds the setup items' files, which are authored, not generated, and are copied untouched.
5. **Build.** `shadcn build registry.json -c registry -o ../apps/docs/public/r`. The `-c` is required: `shadcn build` resolves `files[].path` from the cwd, not from the directory of the `registry.json` its error message names.
6. **Publish the exports.** Copy `packages/tokens/dist/tokens.css` and `tokens.json` into `apps/docs/public/`, and write `apps/docs/public/llms.txt` from this specification and `registry/items.config.ts`. The `tokens-css` item's file is the same `tokens.css`, staged in step 1.

`registry/ultima/`, `registry/registry.json`, `apps/docs/public/r/*.json`, and the three published exports are all gitignored. The docs site's build script runs `registry:build` first, so a deploy publishes the registry and the site together from one command.

## Mana report adoption

Decided on [Mana report adoption](https://linear.app/frankie-ramirez/issue/ULT-13), against [how the report is styled today](https://linear.app/frankie-ramirez/issue/ULT-5). Mana's `ultima` audit report is the first true consumer of Ultima, of the tokens CSS export only. It keeps its Python render pipeline, and the work below happens in the mana repository, on the branch that carries the `ultima` skill. It is recorded here because the export's constraints and the `<role>-border` tokens exist for it, and because the checklist is what a build ticket in mana slices.

### Delivery

The report vendors the export: `skills/ultima/assets/ultima-tokens.css` is a copy of `https://ultima.frankieramirez.com/tokens.css` with the source URL and date in a header comment, and the renderer reads it and concatenates it ahead of its own `CSS` constant. Fetching at render time would break the report's no-network promise; pasting the export into the Python string literal would force the export to avoid `"""` and backslashes forever. Refreshing is a hand copy until that hurts.

### Aliases

The report keeps its 21 short names and all 91 `var()` sites. A permanent alias block beside the vendored file, `skills/ultima/assets/ultima-aliases.css`, maps them onto Ultima's names. Legacy aliases for one consumer live with that consumer, never in the export.

| Report | Ultima token |
| --- | --- |
| `--bg` | `--ult-color-surface` |
| `--card` | `--ult-color-surface-raised` |
| `--glass` | `--ult-color-surface-overlay` |
| `--tab` | `--ult-color-surface-sunken` |
| `--hover` | `--ult-color-surface-hover` |
| `--row`, `--line` | `--ult-color-border` |
| `--fg`, `--soft` | `--ult-color-text` |
| `--muted` | `--ult-color-text-muted` |
| `--dim`, `--gray` | `--ult-color-text-subtle` |
| `--indigo` | `--ult-color-accent` |
| `--indigo-line` | `--ult-color-accent-border` |
| `--cyan` | `--ult-color-highlight-text` |
| `--amber` | `--ult-color-warning` |
| `--red` | `--ult-color-danger` |
| `--green` | `--ult-color-success` |
| `--sans` | `--ult-font-sans` |
| `--mono` | `--ult-font-mono` |
| `--pixel` | stays a literal: Pixelify Sans is mana's brand face, not Ultima's |

Three mappings change what the report looks like, and each is correct: `--tab` becomes lighter than the card because it is a control track, `--row` becomes a visible hairline where it was near-invisible, and `--dim` gets lighter because its fifteen uppercase-label sites were below AA. `--cyan` maps to `highlight-text`, not `highlight`, because every use is text or a link and `#8ff5ff` is the wordmark anchor.

### Checklist for the mana change

1. Add `skills/ultima/assets/ultima-tokens.css`, a copy of the published export, with source URL and date in a header comment.
2. Add `skills/ultima/assets/ultima-aliases.css` defining the 21 report names per the table above, plus `--pixel` as a literal.
3. In `cmd_render()`, read both files and concatenate them ahead of the `CSS` constant.
4. Delete the `:root{...}` rule at the top of `CSS`, keeping the rest untouched.
5. Add `data-theme="dark"` to the `<html>` tag, so the export's dark block wins regardless of the operating system and nothing changes visually.
6. Replace the Python `COLOR` dict with `var()` references (`highlight-text`, `warning`, `text-subtle`) and the failed-lens `#c96b6b` with `var(--ult-color-danger)`, so no value drifts.
7. Replace the fourteen in-CSS literals: the five `#fff` to `--ult-color-text`; the bar track to `surface-sunken`; the two `pre` diff borders to `danger-border` and `success-border`; the wins chip to `success-subtle` and `success-text`; `#b9bedb` to `text-muted`; the two indigo alpha gradients to `color-mix(in oklab, var(--ult-color-accent) 32%, transparent)`. The print rule stays literal.
8. Render an audit and compare against a current one. Expect exactly three visible changes: a lighter tab track, visible row dividers, and better label contrast.
9. File the light-mode follow-up as its own mana ticket: the `#fff` literals, the print rule, and dropping `data-theme`. That ticket is out of Ultima's scope.

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

The registry is generated from the workspace source, so an installed copy can only ever be an older version of the same file. A docs site living on installed copies would document a version of Ultima that no longer exists, and every component change would need a reinstall before the page showing it caught up. The install path is proven instead by `scripts/smoke-install.sh`, the fresh-app smoke test [the install prototype](https://linear.app/frankie-ramirez/issue/ULT-8) established the shape of.

This makes the docs site a user of the components rather than a consumer in the glossary's sense. Mana's report remains the first true consumer.

### Docs navigation and component ownership

The docs menu uses the production Sidebar from `packages/ui`. Sidebar supports grouped navigation with nested items and an active-page indication, collapsible desktop navigation, and a mobile drawer. Routing remains the app's responsibility; Sidebar must accept links composed with the consumer's router.

The docs implementation must prove these behaviors:

- The current route has an accessible active-page indication, including on a direct page load. Nested navigation exposes its expanded state.
- Keyboard users can reach every link and operate the desktop collapse and mobile menu controls. Icon-only controls have accessible names and visible focus rings.
- Opening the mobile menu moves focus into it; Escape and its close control dismiss it and return focus to the trigger. Selecting a destination closes the menu. Modal behavior uses the shared overlay component's focus management.
- The menu remains usable across desktop and mobile layouts, with long navigation lists and in both color modes. Sidebar accepts the same StyleX customization and semantic tokens as other components.

Sidebar ships with its own registry item and component page. Reusable dependencies discovered while building it get the same treatment. The docs may own its route data and page layout; navigation controls, theme controls, copy buttons, and other reusable interactions use production Ultima components. Throwaway prototypes and site-local copies do not satisfy the v0 release gate.

### Authoring

Content pages are MDX, one file per page under `apps/docs/src/content/`, compiled by `@mdx-js/rollup`. A single `Prose` component carries every typography style; MDX files hold no styling of their own. Routes stay code-based: a page module's default export is a component like any other, so MDX costs one plugin and no routing change.

Demos are real modules at `apps/docs/src/demos/<component>/<name>.tsx`, imported into the MDX and rendered live. The source shown under each demo is the same file read through Vite's `?raw` import, so the running example and the printed code cannot diverge. Each demo block has a copy button.

Props tables are hand-written in the MDX and cover only what Ultima adds: `variants`, `sizes`, the `style` slot, and `render`. The inherited surface links out to Base UI's own documentation. A generator would either dump Base UI's entire prop surface or nothing useful, and it reads namespace-object compound parts badly. Generating them is a later upgrade, not a v0 requirement.

### Hosting

One Vercel project, root directory `apps/docs`, build command `pnpm registry:build && vite build`, serving `ultima.frankieramirez.com` as a CNAME on the existing zone.

The site serves the registry catalogue at `/r/registry.json`, each item at `/r/{name}.json`, the tokens exports at `/tokens.css` and `/tokens.json`, and the agent guide at `/llms.txt`. All of them are generated into `apps/docs/public/` as gitignored build output, the same way the registry JSON is. The SPA fallback rewrite excludes `/r/*`, `/tokens.css`, `/tokens.json`, and `/llms.txt`, and all of them carry `Access-Control-Allow-Origin: *`: the shadcn CLI fetches server-side and mana vendors the CSS export, but a browser-side tool or an agent reading any of them should not be blocked.

### Portfolio surface

The fantasy voice lives in the brand layer only: the name, the six scale names, hero and page titles, and the 404. Technical prose is plain. The header carries a text wordmark and no icon. Ultima has one piece of artwork, the logo at `docs/assets/ultima-banner.svg` (the lettering under a crystal emblem), and it appears in exactly two places: the home hero, where it is the `h1` with the accessible name "Ultima", and the OG image, on the mithril ground. The favicon stays the wordmark's letterforms on a mithril ground, because the emblem does not survive 16 pixels. Amended on [Hero and OG image carry the Ultima logo](https://linear.app/frankie-ramirez/issue/ULT-46): the earlier rule against a drawn symbol existed so no v0 ticket would wait on illustration, and the artwork now exists. Mana's Prism mark stays on mana: Ultima is a standalone MIT project, and carrying a mana mark would assert a relationship a reader cannot act on, so the two link to each other from their READMEs instead. Whether Ultima ships icons is settled under Iconography, and the answer does not reach the header.

The header also carries a theme control offering dark, light, and system. Dark-first with light as a full peer is a claim the site should demonstrate rather than assert, and the control is the demonstration.

`/rationale` is the page that makes the system legible to a reader who is not installing it: the ADRs in prose, with the alternatives that were actually on the table.

### README

The repository README is a front door, not documentation. It carries what Ultima is in a few lines, one screenshot, the two install commands, links into the docs site, the stack, a v0-in-development status, and the license. The API surface belongs to the site.

The repository is MIT licensed. A registry-first system hands the consumer its source to own and edit, which is what MIT already describes.

## Testing

Decided on [Testing strategy for v0](https://linear.app/frankie-ramirez/issue/ULT-20). Two things are settled here: what a v0 build ticket must ship as proof, and what runs in CI. The Accessibility contract defers automated checking to this section, and the contrast gate's enforcement is fixed here rather than in the Palette section.

### Environment

One environment: Vitest in browser mode, Playwright's Chromium provider. There is no jsdom project.

Half of what v0 has to prove is only true in a real browser. `:focus-visible` renders an outline, Base UI's popups position against real layout through Floating UI, `[data-starting-style]` transitions fire, and the `Switch.Thumb` hairline exists for a rendering mode. In jsdom each of those degrades into an assertion about an attribute, which proves the test was written and not that the contract holds. A design system whose product is CSS should not prove itself in an environment with no cascade.

StyleX is a compile-time transform, so the test environment needs the unplugin either way. The Vitest config imports the same plugin configuration as the docs build rather than declaring its own, so the two cannot drift. `useCSSLayers` stays `true` in tests: layer ordering is exactly what the consumer reset rule is about, and an unlayered test environment would prove the wrong thing.

### What a build ticket proves

Every v0 component build ticket ships a test file covering its own row of the Accessibility contract and its own axes. Six items:

1. **Every combination renders.** Each `variant` by `size` by `tone` mounts without throwing, and the component with no props matches the declared default.
2. **The name resolves.** The component is queryable by role and accessible name through the source its contract row names.
3. **The focus ring lands where the contract says.** The part in the "Focus ring on" column shows an outline after keyboard focus; a part the contract says renders no ring shows none. Menu and Select items assert `data-highlighted` styling instead.
4. **The primitive is still wired.** One assertion per contract row marked Base UI in the Keyboard column, confirming the composition did not break it: Escape closes, arrows move the highlight, focus returns to the trigger. This is not a re-test of Base UI, which tests itself.
5. **Documented state drives its style.** Each `data-*` attribute the per-component notes name actually produces its change.
6. **Typecheck passes.**

One standing rule across all of them: **no test asserts a color value.** A test asserts presence and behavior, such as an outline width that is not `0px`, never `rgb(...)` or a hex literal. Palette values are regenerated, and a suite that pins them turns every regeneration into a day of updating tests. Color correctness belongs to the contrast gate and to axe, neither of which reads a hand-written expectation.

Tests live in `packages/ui/src/__tests__/<name>.test.tsx`. A directory is excluded from registry staging the same way `prototype/` already is, and it cannot be defeated by a future author widening the stage glob. A co-located `<name>.test.tsx` would sit one character away from shipping to a consumer.

### Accessibility checks

`apps/docs` holds one test that walks every demo module through `import.meta.glob`, mounts each in both color modes, and runs axe against it. Adding a demo adds its coverage; no list is maintained.

The default rule set stands, `color-contrast` included. The generator gates the pairings the Palette section declares; axe gates what a component actually composed, which is where a combination the generator's table never anticipated would show up. The two checks answer different questions and both stay on.

The sweep lives in `apps/docs` rather than in `packages/ui` so that component tests never depend on the docs site, and because the demos are the rendered surface a reader will copy.

### The contrast gate

`packages/tokens/scripts/palette.py` runs in CI on every pull request, and it fails the build two ways: a non-zero exit on any pairing below its minimum, and a `--check` mode that regenerates into a temporary file and diffs against the committed `palette.json`. The first catches a palette change that breaks a pairing. The second catches a hand-edited value, which the Principles section forbids and which nothing else would notice.

Until that exit code exists the Principles claim that contrast is a build gate is aspirational: the script prints its failures and exits zero. Making it exit non-zero is part of the first v0 build ticket that touches the tokens package.

### The registry smoke install

The end-to-end install into a fresh Vite app and a fresh Next.js app is `scripts/smoke-install.sh`, the scripted form of what the ULT-8 prototype did by hand. It retired that prototype.

The smoke install scaffolds both frameworks and installs the released catalogue before building each consumer. It runs on a weekly cron, on `workflow_dispatch`, and on pull requests that change registry inputs: `registry/static/**`, `registry/items.config.ts`, the registry build and smoke scripts, `packages/ui/src/**`, `packages/tokens/**`, workspace dependency manifests, or the lockfile. Component imports and token changes can affect generated dependencies or compilation, so source changes must trigger the check. A green run covering the expanded v0 catalogue is required before tagging v0.

### CI

One workflow, `.github/workflows/ci.yml`, on `pull_request` and on `push` to `main`. One `check` job, in order:

1. Install.
2. `pnpm typecheck`.
3. The Vitest suite, including the axe sweep.
4. The contrast gate, `palette.py --check`.
5. `pnpm registry:build`.
6. The docs site build.

Steps 5 and 6 are in the list because generation breaking is a real failure mode that no unit test observes: the stage globs, the import rewriting, and the dependency derivation all fail silently from a component test's point of view.

No linter in v0. The conventions this system actually cares about are one file per component, the `style` slot with no `className`, and no raw values in component code, and no off-the-shelf configuration checks any of them. A linter that catches unused imports is not worth the configuration it costs. This is worth revisiting when there is a custom rule worth writing, which the authoring skill's arrival is the natural moment for.

`packages/tokens` has no unit tests; its proof is the contrast gate and typecheck. The docs site has no route smoke tests; its proof is that it builds, plus the axe sweep.

### Considered and declined

**Storybook.** It would have bought several of these decisions in one dependency: play functions under Vitest browser mode, an a11y addon running axe per story, and Chromatic for visual regression. It is declined because the docs site already holds that slot and the Docs site section already decided how. Demos are real modules whose printed source is read from the same file through `?raw`, so the running example and the copyable source cannot diverge. Composing stories into those pages would print story boilerplate instead of the JSX a reader copies, which is a real loss for a system whose whole distribution model is copied source. Keeping both stories and demos would give each component three artifacts, and Storybook would need a second Vite configuration replicating the StyleX setup exactly, where every divergence is a bug class visible in only one of the two builds.

The direction matters more than the verdict: demo modules compose into stories later without loss, and stories do not decompose back into copyable demos. Declining now forecloses nothing.

**Visual regression.** Not in v0. The tempting targets are the four overlays and the two Tabs variants, which are also the flakiest screenshots available: enter and exit transitions, Floating UI positioning, and font rasterization that differs between a local machine and a CI container. Baselines want a container matching CI before they are worth anything, and v0's real color risk is already covered twice, by the contrast gate and by axe. Revisit at the first change after v0, when there is a shipped appearance worth protecting rather than a moving one.

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
