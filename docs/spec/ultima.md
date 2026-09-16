# Ultima specification

The owning document for Ultima's conventions, tokens, and component contracts. Each section is written when its decision ticket closes. Two maps have fed it: [Map: Ultima design system spec](https://linear.app/frankie-ramirez/issue/ULT-1), which settled the system, and [Map: Sidebar and the docs application in v0](https://linear.app/frankie-ramirez/issue/ULT-47), which settled Sidebar and what the docs site being a real application costs the catalogue. Read `CONTEXT.md` for the glossary and `docs/adr/` for the hard-to-reverse choices.

Nothing in v0 is now waiting on a decision. The next work is building it.

## Principles

Decided on [Agent-first surface](https://linear.app/frankie-ramirez/issue/ULT-15). These are the generators, not a record. An ADR captures one choice and the alternatives it beat; this section holds what decides the next choice without being argued again. It is the section to read before touching anything.

A principle earns a line here only if it already settled a decision on the map, or would settle one still open. Nothing aspirational.

- **Dark-first, light as a full peer.** Dark is the default and the design target. Light is never best effort: every semantic token, every contrast check, and every demo exists in both modes.
- **Fantasy in the brand layer only.** The name, the six scale names, page titles, and the 404 carry the theme. Semantic token names, component names, part names, and prop names stay conventional, because they are the surface a stranger has to guess correctly.
- **One styling engine, one primitive library.** StyleX and Base UI, no Tailwind and no Radix (ADR 0001, ADR 0002). An escape hatch that reintroduces a second system is not an escape hatch, which is why the `style` slot takes StyleX styles and there is no `className`.
- **The consumer owns what they install.** Registry-first (ADR 0003): Ultima hands over source and gives up control of it. That is right for code and wrong for prose, which is why guidance is hosted rather than installed.
- **Tokens are the only source of raw values.** A literal in component code is a bug, not a shortcut. A new need becomes a new token. The one qualification, decided on [Sidebar's responsive state model](https://linear.app/frankie-ramirez/issue/ULT-54): a media condition is not a value a declaration reads, and a custom property cannot appear in one, so a breakpoint lives as a named module constant in the file that uses it rather than as a token.
- **Semantic names are stable, values are not.** A consumer re-skins at the semantic layer and nothing renames underneath them (ADR 0004).
- **Contrast is a build gate, not advice.** WCAG 2.2 AA passes or the palette does not ship. APCA is reported beside the pairings and never fails a build.
- **Ultima is the default kit for our StyleX React projects.** Core application components and common compositions belong on the roadmap, including the ones we otherwise reach for shadcn/ui to provide. This is a product scope commitment; public positioning can stay focused on Ultima.
- **The docs site is the first complete application.** It uses production Ultima components for every reusable UI pattern, including navigation and responsive controls. A missing reusable component is added to Ultima and consumed from the workspace. Page layout, prose typography, and branding may use site-specific StyleX, within the line drawn on [Where the line falls between an Ultima component and docs-local page layout](https://linear.app/frankie-ramirez/issue/ULT-56): a docs file may arrange and set type and flow spacing, and may neither build a control from plain elements nor paint a surface.

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

Color roles are conventional: surface, text, border, accent, action, and the status colors. Fantasy names appear only in palette scales. Interaction states (`-hover`, `-active`) are separate semantic tokens resolved to palette steps, never derived with `color-mix()`, because dark and light modes step in different directions. `action` is the mana based role for prominent page actions such as landing page calls to action; its contrast token is checked against the default, hover, and active fills. It does not add a component API axis: components that already expose `tone` keep their existing role choices, while a consumer can map an action theme onto an accent surface.

In component code the key is used as written: `color['--ult-color-surface']`. That ergonomic cost is accepted for stable names.

### Token groups in v0

Themeable (emitted as custom properties): `color`, `space`, `text`, `font`, `radius`, `shadow`, and `motion` durations.

Compile-time only (`defineConsts`, never in the CSS export): `motion` easings, `border` widths, and `z-index`.

There is no breakpoint group, and there cannot be one. [Sidebar's responsive state model](https://linear.app/frankie-ramirez/issue/ULT-54) kept the one breakpoint Ultima has as a module constant in `sidebar.tsx`: a `defineVars` value cannot appear in a media condition at the CSS level, and a `defineConsts` value used as an at-rule key compiles to a placeholder at priority 6000, one full cascade layer above every pseudo-class rule, and forfeits StyleX's media-query ordering transform. A plain constant compiles exactly like a literal and shares its string with the runtime read just as well. This is a consequence of tokens being custom properties rather than a preference, so it is recorded as an amendment to ADR 0004 rather than as its own decision: a token is a thing a consumer can re-skin, and a media condition is not a place a custom property can go.

Motion durations were compile-time when ULT-9 fixed this list. [Non-color token values](https://linear.app/frankie-ramirez/issue/ULT-17) moved them, because a `defineVars` value can carry `@media (prefers-reduced-motion: reduce)` and collapse every duration to `1ms` in one place, where a `defineConsts` string cannot. Easings stay compile-time: there is nothing to override. `border` is the group added by the same ticket, so a component has a name to read instead of writing `1px`. [Progress, Skeleton, Spinner, and Empty](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a) added `--ult-motion-loop` to the same group: a looping duration cannot collapse to `1ms`, so that token's reduced-motion value is `0s` and the `animation-name: none` exception lives on the component, under Motion below.

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
| `--ult-radius-md` | 10px | Button, Input, Select trigger, menu items |
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

Durations are themeable, so reduced motion for transitions is handled once at the token instead of at every transition. Looping animations cannot use that collapse; they are `--ult-motion-loop` and the `animation-name` exception below.

| Token | Default | `@media (prefers-reduced-motion: reduce)` |
| --- | --- | --- |
| `--ult-motion-fast` | 120ms | 1ms |
| `--ult-motion-base` | 200ms | 1ms |
| `--ult-motion-slow` | 300ms | 1ms |
| `--ult-motion-loop` | 1s | 0s |

Easings are compile-time constants: `standard` `cubic-bezier(.2, 0, 0, 1)`, `enter` `cubic-bezier(0, 0, .2, 1)`, `exit` `cubic-bezier(.4, 0, 1, 1)`. A component reads a duration token for `transition-duration` and never writes a millisecond value. Fast, base, and slow are transitions. `--ult-motion-loop` is a repeating animation, themeable so a consumer can slow it, and it cannot reuse `--ult-motion-base`: collapsing a loop to `1ms` is a strobe, which is a WCAG 2.3.1 / 2.3.3 seizure risk rather than a stopped animation. Duration `0s` alone is not enough — some engines keep firing an infinite zero-duration animation — so a looping animation also sets `animation-name: none` under `prefers-reduced-motion: reduce`. That is the one reduced-motion exception to "components never write a `prefers-reduced-motion` query", settled on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a). Sidebar remains the breakpoint exception. Transitions keep reading fast, base, and slow and never scatter duration queries. Do not add a second token group. Do not put `animation-iteration-count: 1` on the duration tokens themselves.

`@keyframes` live in the component file via `stylex.keyframes`, private to that file, the same way glyphs are. Progress, Spinner, and Skeleton each own their frames. Hashed animation names cannot be a shared token, so they do not appear in the CSS export. Registry copy-source is fine: the consumer's StyleX build emits the animation, the same way it emits `stylex.create` class names. Docs already call `stylex.keyframes` in `apps/docs/src/demos/tokens/motion.tsx`. Empty does not loop.

Reduced-motion presentation, also settled there: Spinner is a static glyph, so layout does not collapse. Skeleton is a static placeholder at rest opacity, no pulse. Indeterminate Progress Indicator is a static bar at 25% width, no slide.

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

Base UI portals its popups to the end of `<body>`, but a consumer with its own stacking contexts still needs Ultima's overlays to declare something, which is what `z.popup` is for. `z.toast` sits above it, so a toast can appear over an open dialog. Toast is not an overlay and does not read `z.popup`. No other layer is tokenised. The intra-stack `z-index` arithmetic among toast roots is a module constant in `toast.tsx`, not a third token: a consumer does not re-skin toast physics at the semantic layer.

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

The hues come from mana's audit report. Two values are brand anchors and stay exact: `mithril1` dark is `#101011` (the neutral page background) and `mana12` dark is `#8ff5ff` (the wordmark cyan). Every other value is generated and may move if the contrast gate demands it.

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

Chroma is a peak per scale (dark and light: mithril .005 and .020, arcane .17 and .19, mana .12, verdant .13 and .14, ember .13 and .14, ruin .15 and .17) times a per-step fraction: dark `.15 .25 .4 .5 .6 .7 .8 .9 1 1 .9 .75`, light `.05 .12 .25 .35 .45 .55 .65 .8 1 1 1 .8`. Mithril uses its own fractions so the near-neutral charcoal tint stays subtle: dark `.4 .6 .8 .9 1 1 1 1 1 1 .8 .4`, light `.3 .45 .6 .7 .85 1 1 1 1 1 1 1`.

### Values


**mithril**

| Mode | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dark | `#101011` | `#141516` | `#1d1e20` | `#27272a` | `#313134` | `#3c3d40` | `#4c4d50` | `#626366` | `#7f8083` | `#919295` | `#b6b7ba` | `#e7e8e9` |
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

The checklist below is planned scope, not a statement that components have shipped. Check a component entry only when it has production source, an installable registry item with its dependencies, copyable docs examples, and the applicable browser interaction and accessibility checks. A recipe entry must identify its installable component dependencies and provide a copyable example covered by the applicable checks. Compositions also document how their constituent components fit together. Registry smoke installs must cover the expanded catalogue in Vite and Next.js. The docs site using a component is not one of those checks, stated on [Does Navigation Menu ship in v0.2](https://github.com/frankieramirez/ultima/issues/86) because the question was asked as though it were: twenty-eight of the thirty-two catalogue components have no site use, only Sidebar's page points at one, and the demos are what the sweep runs axe over. A component's demos and its proof-bar test file are what carry it.

Settled again on [What v0.1 changes about the proof bar, the release gate, and the docs catalogue](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs): those two sentences stand for v0.1. The release adds one recipe, React Hook Form on Field's page, and does not invent a third category. "Applicable checks" for a recipe are the live demo in the axe sweep and the documented states on the page. They are not a ninth proof-bar item, and they do not install the engine into `packages/ui` or into the smoke scaffolds.

**What adding a component to the catalogue actually costs.** Settled on [What the expanded v0 catalogue changes about the proof bar and the release gate](https://linear.app/frankie-ramirez/issue/ULT-58), because "generated, so it follows for free" turned out to be true of one artifact and not the other two, and confirmed for v0.1 on [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs). `/llms.txt` is genuinely free: `scripts/build-agent-guide.ts` enumerates the components the registry build produced and reads each file's axes out of its source. Five places are not, and every one of them is a hand edit the build ticket owns. None of the five becomes generated this release. v0.1 adds fourteen items (Fieldset is its own item), so the cost is seventy edits, not the sixty-five a thirteen-item count would have implied. `packages/ui/src/index.ts` is a workspace barrel the docs import from, not a sixth catalogue cost. `apps/docs/src/router.tsx` is the route-module half of the fourth edit, not a sixth.

- `registry/items.config.ts`, a title, a one-sentence description, and a usage snippet per item. Already required by The registry item; the registry build throws without it.
- `apps/docs/src/components.ts`, the catalogue module, which since [Where the line falls between an Ultima component and docs-local page layout](https://linear.app/frankie-ramirez/issue/ULT-56) is also the single source the navigation tree derives from.
- `apps/docs/src/__tests__/components.test.ts`, which pins that catalogue in specification order as an explicit array. Manifest key order is not spec order, so the expected list is not derived from `Object.keys(items)`. The length is whatever the array is: eighteen in v0, thirty-two once the v0.1 fourteen follow it. The glob checks (every MDX page, at least one demo, manifest names match) stay.
- A route module (`apps/docs/src/router.tsx`) and its MDX page under `apps/docs/src/content/components/`.
- `packages/ui/vitest.config.ts`, `optimizeDeps.include`, for any Base UI subpath the new file imports. This is the one that fails without an error worth reading.

**A component file may export its `use<Component>()` hook.** `scripts/build-agent-guide.ts` rejects a file exporting more than one value, which predates Cross-part state and would fail the registry build on `sidebar.tsx` the moment it ships. The guide accepts a `use<Component>` export beside the component and prints the component's name; the rule it was enforcing, one component per file, is unchanged.

#### v0: foundation and docs application

- [x] Ship the fourteen foundation components in The v0 set below.
- [x] Ship Sidebar as a reusable component and use it for the docs menu. Its acceptance criteria are in the Docs site section, and its contract is in Per-component notes.
- [x] Ship Collapsible and Toggle Group, the two components the docs application adds to the catalogue. Collapsible is what a nested Sidebar group composes; Toggle Group is what the header's theme control composes.
- [x] Add `Table.Scroll` to Table, which the docs' three scrolling tables need and no consumer currently has a way to write.
- [x] Rebuild the docs' hand-painted surfaces on Ultima components and delete `data-table.tsx`, per the sorted inventory in the Docs site section under The line between a component and page layout. Ship the source-reading gate in the same work, or the rule has nothing behind it.
- [x] Verify the docs at desktop and mobile widths in both color modes, including keyboard navigation and focus restoration after closing the mobile menu.
- [x] Complete the registry generation pipeline, component documentation, and CI gates defined in this specification.

The original v0 catalogue closed with the three additions above. The section below records that decision; the September 12, 2026 designs subsequently added Separator for the docs application's dividers.

Sidebar's public parts, responsive state model, and dependencies need contracts before implementation. Reuse Dialog for mobile navigation if it satisfies that contract. If the implementation needs a separate Sheet or Drawer, promote that component from v0.2 into v0. That test was applied on [Mobile navigation: reuse Dialog, or promote Drawer into v0](https://linear.app/frankie-ramirez/issue/ULT-55): Dialog satisfies it, Sidebar composes Dialog for its mobile menu, and Drawer stays in v0.2. The same rule applies to Breadcrumb, Collapsible, Separator, Scroll Area, or any other reusable pattern the docs needs. Applied to the docs' actual inventory on [Where the line falls between an Ultima component and docs-local page layout](https://linear.app/frankie-ramirez/issue/ULT-56), it promotes two components and no more: Collapsible, already brought forward for Sidebar's nested groups, and Toggle Group, for the theme control. Breadcrumb, Separator, Scroll Area, Toolbar, and Navigation Menu stay in v0.2, because nothing the docs actually renders needs them and the catalogue grows from demonstrated need rather than from anticipation. Both promoted components have contracts to the same bar as the fourteen, settled on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57), which also added `Table.Scroll` and qualified the Styled parts rule. Search is not required for v0; adding it brings its missing component dependencies into the same release.

The Separator deferral in that inventory is superseded by `ultima.pen`: the landing sections, token rows, and article index now consume the component. The v0 table below includes its contract.

#### v0.1: everyday forms and feedback

- [x] Field and Fieldset, including descriptions, validation errors, and form integration examples. The integration is named rather than left to the build ticket: Base UI's own `Form` and `Field` over the platform's constraint validation, decided on [What Ultima documents as its form integration](https://linear.app/frankie-ramirez/issue/ULT-78) and contracted under Forms below. A React Hook Form recipe ships beside it on the same page, and no Ultima file imports it. v0.1 holds exactly one recipe, so the mapping this section asks for, recorded explicitly: its component dependencies are `field`, `input`, and `button`, and its engine is `react-hook-form`, which the consumer installs, with `@hookform/resolvers` and a validator as a second install for schema rules. Its applicable checks are the live demo in the axe sweep and the documented states on the page, and rendering it live is why `apps/docs` takes the engine as a devDependency. The entry reads "Field and Fieldset" rather than "Field and Label" because Label is a part of Field rather than a component: settled on [Field and Label: parts, and how validation state reaches a field's siblings](https://linear.app/frankie-ramirez/issue/ULT-79), with the contract in The v0.1 set below.
- [x] Textarea, Checkbox, and Radio Group. Settled on [Checkbox, Radio Group, and Textarea: parts, glyphs, and the indeterminate state](https://linear.app/frankie-ramirez/issue/ULT-80/checkbox-radio-group-and-textarea-parts-glyphs-and-the-indeterminate), with the contract in The v0.1 set below. Checkbox Group is a part of Checkbox rather than a catalogue item. Textarea is an item, not a documented `render` of Input.
- [x] Combobox and Slider. Settled on [Combobox and Slider: the two expensive contracts](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts), with the contract in The v0.1 set below. Combobox is a sibling of Select, not a variant of it. Autocomplete, the free-text primitive Base UI ships beside it, is out of v0.1. Slider has no `tone`.
- [x] Alert and Alert Dialog. Settled on [Alert and Alert Dialog, and whether the docs' Note becomes one](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one), with the contract in The v0.1 set below. Alert ships; the docs' `Note` stays a styled paragraph. Alert Dialog is a separate item from Dialog, not a recipe.
- [x] Toast and Progress. Toast settled on [Toast's contract, and whether Ultima owns a live-region pattern](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern), with the contract in The v0.1 set below. Toast is outside the overlay recipe. Progress settled on [Progress, Skeleton, Spinner, and Empty: the feedback set, and whether a loop is a token](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a), with the contract in The v0.1 set below. Progress represents task completion; Meter remains the component for a bounded measurement. Progress restates Meter's parts and `tone` and owns the indeterminate loop.
- [x] Skeleton, Spinner, and Empty. Settled on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a), with the contract in The v0.1 set below. All three ship as catalogue items. Spinner is not indeterminate Progress. Empty is not Card, not Alert, and not `Combobox.Empty`.

The form examples must demonstrate submission and validation with a documented form integration, including disabled, required, and invalid states. One page carries the worked examples rather than every form component repeating them, and the Forms section below says which example owns what. Components needed by v0 move forward; they are not implemented a second time for this milestone.

#### v0.2: application compositions and remaining core coverage

- [ ] Command and a searchable command-dialog example.
- [ ] Calendar and Date Picker.
- [ ] Data Table with sorting, filtering, pagination, and row-selection examples. A documented recipe over Table rather than a catalogue item, decided on [What Data Table is built on, and what that dependency costs a consumer](https://linear.app/frankie-ramirez/issue/ULT-72) and generalised in ADR 0007. The mapping this section asks for, recorded explicitly: the entry's component dependencies are `table`, `button`, `checkbox`, `dropdown-menu`, and `pagination`, and its engine is `@tanstack/react-table`, which the consumer installs. Two additions to Table ship with it, under Per-component notes. The three examples land in the order their dependencies allow: sorting as soon as those additions do, row selection after v0.1's Checkbox, pagination after the Pagination entry on the Breadcrumb line below. The first two are being built under [Build: Data Table sorting and row selection](https://github.com/frankieramirez/ultima/issues/81); filtering and pagination are not in that effort.
- [ ] Accordion and Collapsible. Collapsible moved into v0 on [Sidebar's public parts, styled parts, glyph slots, and axes](https://linear.app/frankie-ramirez/issue/ULT-53), because a nested Sidebar group composes it. Accordion stays here.
- [ ] Breadcrumb and Pagination. One thing was priced on [ULT-49](https://linear.app/frankie-ramirez/issue/ULT-49) and deliberately left undecided on [ULT-57](https://linear.app/frankie-ramirez/issue/ULT-57), because neither component is promoted: whether Breadcrumb's separator is a markup node with a swappable glyph or a CSS pseudo-element kept out of the accessibility tree. Detail in `docs/research/2026-09-09-base-ui-docs-patterns.md`. Pagination is the component the Data Table entry above names among its dependencies, so its contract has a consumer waiting inside this release.
- [ ] Navigation Menu. It ships in v0.2, decided on [Does Navigation Menu ship in v0.2](https://github.com/frankieramirez/ultima/issues/86). It was one line with Breadcrumb and Pagination until then; the three have different costs and land at different times, so one checkbox could not say which were done. The cost that made it the most expensive item on the candidate list was priced and measured on [Can StyleX express Navigation Menu's size morph, and what does it cost at the emitted-CSS level](https://github.com/frankieramirez/ultima/issues/85), and the Styled parts second clause it forced is already a system-wide rule that holds whether or not it ships. Its two nested `<nav>` elements are both unlabelled by Base UI and both need a name from Ultima or the consumer, which is the open contract question rather than a reason to defer. Detail in `docs/research/2026-09-09-base-ui-docs-patterns.md`.
- [ ] Popover, Sheet, and Drawer. Sheet is a documented Dialog recipe, the edge-anchored overrides Sidebar's mobile menu already uses; Drawer is Base UI's `Drawer`, which adds swipe gestures and the Android back gesture, priced on [Base UI Drawer measured against Dialog](https://linear.app/frankie-ramirez/issue/ULT-48). Neither moved into v0.
- [ ] Context Menu, Menubar, and Hover Card.
- [ ] Avatar and Scroll Area. Separator moved into v0 for the September 2026 docs designs. Scroll Area's two open items are already answered elsewhere: the CSP note is in Registry and install, and `ScrollArea.Viewport` copies `Table.Scroll`'s focus-ring row, since a tabbable region that is neither a control nor a popup is the same shape. Detail in `docs/research/2026-09-09-base-ui-docs-patterns.md`.
- [ ] Toggle and Toggle Group. Toggle Group moved into v0 on [Where the line falls between an Ultima component and docs-local page layout](https://linear.app/frankie-ramirez/issue/ULT-56), because the docs' theme control is a single-selection pressed-button group and nothing else in v0 carries that shape. Toggle on its own stays here.
- [ ] Button Group, Input Group, Input OTP, and Native Select.
- [ ] Aspect Ratio, Resizable, and Carousel.
- [ ] Chart, Item, Kbd, and Typography recipes.

Each composition needs a dependency and accessibility decision before implementation. Calendar and Chart, for example, may need capabilities beyond Base UI. Any additional dependency must fit the StyleX-only styling contract; record an amendment to the primitive-library decision if its scope changes. The checklist describes supported capabilities, so a documented recipe may satisfy an entry where a separate component adds no useful behavior. Record that mapping explicitly when checking the entry.

Data Table was the first entry to reach that line, and the answer generalises, so ADR 0007 now carries it: a composition whose behavior needs an engine rather than an interactive primitive ships as a recipe, the engine is the consumer's dependency, and the engine must be headless or it is not a candidate. Two consequences save the next author the same walk. No Ultima item gains an engine dependency, so the derived `dependencies` of every item stay what that component's own imports put there. And ADR 0002's scope never came into question: an engine supplies none of the roles, ARIA state, keyboard handling, or focus management that ADR names, which is the same reasoning Sidebar's notes already apply to a viewport read. What the engine does not excuse is the controls. Where a recipe hands the user a control, that control comes from the catalogue, for the reason the line between a component and page layout gives, so the accessible surface of a recipe is Ultima's even though its engine is not.

#### v1: dependable default

v1 requires completed core coverage and a representative application built with Ultima that exercises forms, navigation, overlays, and data presentation without routinely requiring another UI kit. Installation must pass in both supported frameworks, and every shipped component must have documented contracts and the applicable checks. The copy-source registry's versioning and update policy must also be documented before v1.

Release labels here describe delivery milestones. They do not settle that update policy or commit Ultima to tracking every future shadcn/ui addition. New component needs are added to this checklist with an explicit milestone.

### The v0 set

**v0 is eighteen components, and the table below is the whole list.** Fourteen are the foundation: the report set, which is the nine mana's audit report needs, plus five form and overlay components. Four more are what the docs application turned out to need, settled across this map and closed by the docs inventory: Sidebar, Collapsible, Toggle Group, and Separator, the last added by the September 12, 2026 designs for the landing sections, token rows, and article index. Nothing further is pending a contract, which is the difference between this table and the one that stood while the map was open. Each component is one file and one registry item. Parts follow the compound rule below: a component built on a Base UI primitive exposes every Base UI part under its own name, styled or passed through, and a plain component names its parts for what they are. The accessible name, focus ring, and element per component are in the Accessibility contract.

| Component | Item | Built on | Parts | Axes decided so far |
| --- | --- | --- | --- | --- |
| Button | `button` | Base UI `Button` | single | `variant`: `solid`, `outline`, `ghost`. `size`: `sm`, `md`, `lg`. `tone`: `accent`, `danger` |
| Badge | `badge` | `<span>` | single | `variant`: `subtle`, `solid`. `tone`: `neutral`, `accent`, `highlight`, `success`, `warning`, `danger` |
| Card | `card` | plain, `useRender` on Root | `Root`, `Header`, `Title`, `Description`, `Body`, `Footer` | none |
| Table | `table` | native `<table>` | `Scroll`, `Root`, `Head`, `Body`, `Row`, `HeadCell`, `Cell`, `Caption` | none |
| Tabs | `tabs` | Base UI `Tabs` | `Root`, `List`, `Tab`, `Indicator`, `Panel` | `variant`: `underline`, `segmented` |
| Meter | `meter` | Base UI `Meter` | `Root`, `Label`, `Track`, `Indicator`, `Value` | `tone` on `Root`, reaching `Indicator` and `Value`, each overridable: `neutral`, `highlight`, `success`, `warning`, `danger` |
| Stat | `stat` | plain | `Root`, `Label`, `Value` | none |
| Code | `code` | `<code>`, or `<pre><code>` | single | `variant`: `inline`, `block` |
| Tooltip | `tooltip` | Base UI `Tooltip` | every Base UI part | none |
| Dialog | `dialog` | Base UI `Dialog` | every Base UI part | none |
| Dropdown Menu | `dropdown-menu` | Base UI `Menu` | every Base UI part | none |
| Select | `select` | Base UI `Select` | every Base UI part | `size` on `Trigger`: `sm`, `md`, `lg` |
| Input | `input` | Base UI `Input` | single | `size`: `sm`, `md`, `lg` |
| Switch | `switch` | Base UI `Switch` | `Root`, `Thumb` | none |
| Sidebar | `sidebar` | plain, `useRender` on every part; composes Dialog below the breakpoint | `Root`, `Panel`, `Trigger`, `Close`, `Group`, `GroupLabel`, `List`, `Item`, `Link`, `Button` | none |
| Collapsible | `collapsible` | Base UI `Collapsible` | `Root`, `Trigger`, `Panel` | none |
| Toggle Group | `toggle-group` | Base UI `ToggleGroup` and `Toggle` | `Root`, `Item` | none |
| Separator | `separator` | Base UI `Separator` (`<div role="separator">`) | single | none; forwards Base UI `orientation` |

The `size` values on Button, Input, and Select are the three control heights from the space scale (steps 9, 10, 11), so `md` is the same height on all three. Card's parts are the prototype's six slots, accepted on the prototype reaction. Table's, Stat's, and Code's shapes were fixed with the accessibility contract.

Defaults, declared in each component's destructure: Button `solid` / `md` / `accent`; Badge `subtle` / `neutral`; Tabs `underline`; Meter `neutral` on `Root`; Code `inline`; Input and Select `md`. Sidebar, Collapsible, and Toggle Group have no axis and no default to declare.

The axes above, which parts carry Ultima styles, and the per-component notes were decided on [Per-component contracts for the v0 set](https://linear.app/frankie-ramirez/issue/ULT-19). No component in v0 has an axis beyond `variant`, `size`, and `tone`. Sidebar's row was added on [Sidebar's public parts, styled parts, glyph slots, and axes](https://linear.app/frankie-ramirez/issue/ULT-53); its width and side are not axes, and the per-component notes say why. `Close` was added on [Mobile navigation: reuse Dialog, or promote Drawer into v0](https://linear.app/frankie-ramirez/issue/ULT-55). Collapsible's and Toggle Group's rows, and `Table.Scroll`, were added on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57); neither promoted component has an axis, and the cell says so rather than leaving it to a builder. `ToggleGroup.Item` is the one part name in v0 that mirrors no Base UI part, because Base UI ships `ToggleGroup` and `Toggle` as two exports from two subpaths rather than as a namespace, and the compound rule still applies: the two are useless apart, standalone Toggle stays in v0.2, and a consumer imports one name.

Toast is in v0.1 rather than v0, with its contract in The v0.1 set below and on [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern). The conditional promotion rule that would have brought it forward was tested against the docs' real inventory on [Where the line falls between an Ultima component and docs-local page layout](https://linear.app/frankie-ramirez/issue/ULT-56) and found nothing that needs it: the one confirmation the site shows is `copy-button.tsx`'s, which is a live region on the button rather than a notification, and that does not change.

### The v0.1 set

Field's and Fieldset's contracts, settled on [Field and Label: parts, and how validation state reaches a field's siblings](https://linear.app/frankie-ramirez/issue/ULT-79). Checkbox, Radio Group, and Textarea, settled on [Checkbox, Radio Group, and Textarea: parts, glyphs, and the indeterminate state](https://linear.app/frankie-ramirez/issue/ULT-80/checkbox-radio-group-and-textarea-parts-glyphs-and-the-indeterminate). Combobox and Slider, settled on [Combobox and Slider: the two expensive contracts](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts). Alert and Alert Dialog, settled on [Alert and Alert Dialog, and whether the docs' Note becomes one](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one). Toast, settled on [Toast's contract, and whether Ultima owns a live-region pattern](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern). Progress, Skeleton, Spinner, and Empty, settled on [Progress, Skeleton, Spinner, and Empty: the feedback set, and whether a loop is a token](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a). Field is the contract the rest of v0.1's form components compose, so this table lives here rather than in Per-component notes. Alert, Alert Dialog, Toast, Progress, Skeleton, Spinner, and Empty are the feedback set, not form controls, which is why this section is The v0.1 set and not The v0.1 form set: seven of its fourteen rows are not forms, and the heading that said otherwise disagreed with the docs menu, whose two disclosures were already settled as "The v0 set" and "The v0.1 set" under The header and the single nav. Assembled on [Write the v0.1 contracts into docs/spec/ultima.md](https://linear.app/frankie-ramirez/issue/ULT-86), which closed the map.

| Component | Item | Built on | Parts | Axes |
| --- | --- | --- | --- | --- |
| Field | `field` | Base UI `Field` | `Root`, `Label`, `Control`, `Description`, `Error`, `Item`, `Validity` | none |
| Fieldset | `fieldset` | Base UI `Fieldset` | `Root`, `Legend` | none |
| Checkbox | `checkbox` | Base UI `Checkbox` and `CheckboxGroup` | `Root`, `Indicator`, `Group` | none |
| Radio Group | `radio-group` | Base UI `RadioGroup` and `Radio` | `Root`, `Item`, `Indicator` | none |
| Textarea | `textarea` | Base UI `Input` as `<textarea>` | single | `size`: `sm`, `md`, `lg` |
| Combobox | `combobox` | Base UI `Combobox` | every Base UI part | `size` on `InputGroup`: `sm`, `md`, `lg` |
| Slider | `slider` | Base UI `Slider` | `Root`, `Label`, `Value`, `Control`, `Track`, `Indicator`, `Thumb` | none |
| Alert | `alert` | plain, `useRender` on `Root` and `Title` | `Root`, `Title`, `Description`, `Icon` | `tone`: `neutral`, `accent`, `highlight`, `success`, `warning`, `danger` |
| Alert Dialog | `alert-dialog` | Base UI `AlertDialog` | every Base UI part | none |
| Toast | `toast` | Base UI `Toast` | every Base UI part | `tone` via `type` / `data-type`: `neutral`, `accent`, `highlight`, `success`, `warning`, `danger` |
| Progress | `progress` | Base UI `Progress` | `Root`, `Label`, `Track`, `Indicator`, `Value` | `tone` on `Root`, reaching `Indicator` and `Value`, each overridable: `neutral`, `highlight`, `success`, `warning`, `danger` |
| Skeleton | `skeleton` | plain | single | none |
| Spinner | `spinner` | plain | single | none |
| Empty | `empty` | plain, `useRender` on `Root` and `Title` | `Root`, `Title`, `Description`, `Icon` | none |

Defaults, declared in the destructure: Textarea `md`; Combobox `md` on `InputGroup`; Alert `neutral`; Toast `neutral` when `type` is omitted; Progress `neutral` on `Root`. Checkbox, Radio Group, Slider, Alert Dialog, Skeleton, Spinner, and Empty have no axis and no default to declare.

**There is no Label component, and there is no Form item.** `Field.Label` is a part of `field.tsx`, so the shadcn precedent of a `label` registry dependency does not carry over; Ultima has no component for it to depend on. `Form` ships no item for the reason Forms below already gives: it paints nothing.

**Field exposes all seven Base UI parts, and that is the compound rule rather than a preference.** [ULT-76](https://linear.app/frankie-ramirez/issue/ULT-76) found a surface span across six systems of zero parts to seventeen, with a realistic floor of four. The floor is closed here by a rule that already exists: a component built on a Base UI primitive exposes every Base UI part under its own name, styled or passed through. So the question was never how many parts to expose, only which of the seven carry styles.

**Field has no axes, and writes no context.** The `size` temptation is refused rather than solved. `size` is one of the three control heights, it belongs to the control, and the control is an Ultima component that already carries it. A Field-level `size` would have to reach the control through context and would then compete with the control's own prop, which is two sources for one value. Nothing else about a Field differs per field. So Field writes no context at all and adds no provider, which is why Cross-part state above is unchanged by this component.

**`Field.Control` passes through unstyled, and the control slot holds an Ultima component.** This is the third case of the collision the wrapper-trigger rule names, arrived at from a different direction: Base UI's `Input` *is* `Field.Control`, since `input/Input.tsx` is one line returning `<Field.Control {...props} />`, so Ultima's `Input` is already `Field.Control` wearing Ultima's styles. A styled `Field.Control` would be a second copy of Input's table under a different name, and any field using both would paint one element from two places. The documented shape is therefore `<Field.Root><Field.Label /><Input /><Field.Error /></Field.Root>`, with `Field.Control` exposed for a control Ultima does not ship. Textarea is the same registration in a different file, not a documented `render` on Input: it is Base UI `Input` with `render={<textarea />}` inside `textarea.tsx`, so it fills the control slot without importing Ultima's `input` item. Combobox.Input and Slider.Root register themselves the same way.

**Checkbox is one item, and Checkbox Group is a part of it rather than a catalogue row.** Base UI ships `Checkbox` and `CheckboxGroup` from two subpaths, and `Checkbox.Root` works standalone, which is why Data Table's recipe already names `checkbox` and not a second item. The compound rule still applies: the group is a primitive Ultima wraps, so it sits on the same namespace. `Group` is an invented name, the same move as `ToggleGroup.Item`, wrapping the bare `CheckboxGroup` export (there is no `CheckboxGroup.Root`). `nativeButton` stays Base UI's default `false`, so a wrapping `<label>` is legal, matching Switch.

**Radio is not a catalogue item.** Base UI's docs say Radio is always placed within Radio Group, and a bare `Radio.Root` has no `checkedValue`, no name, and no roving tabindex. One `radio-group` item imports both subpaths: `Root` wraps `RadioGroup`, `Item` wraps `Radio.Root` (invented, again like `ToggleGroup.Item`), `Indicator` wraps `Radio.Indicator`.

**Textarea is an item.** There is no Base UI Textarea; `Input render={<textarea />}` is a first-party type spec, and Input's size table sets `height`, which makes that render unusable as a multiline field. `textarea.tsx` is therefore not a one-line second item: it wears its own tables, `size` as `min-height` at the same three space steps as Input's `height`, and `resize: vertical`. Auto-resize is out of v0.1. `rows` and `cols` pass through and are not axes. Default `md`. No Ultima `input` registry dependency.

**No `size` on Checkbox or Radio Group.** `size` is the three control heights. Switch already refused them, and a checkbox next to an Input of a given size is aligned by `Field.Item`'s row, not by growing the box to 40px.

**Combobox is a sibling of Select, not a variant of it, and not Autocomplete.** Base UI ships them as three primitives. One file per component means one `combobox` item exposing every Base UI part, twenty-six of them, plus `useFilter`, `useFilteredItems`, and `createItems` on the same namespace, which is Toast's manager and Alert Dialog's `Handle` again: a value, not a second item. Twenty-six is what `@base-ui/react` 1.8.0's `combobox/index.parts` exports and what the styled split below lists; the twenty-four this paragraph first carried counted two parts short. Autocomplete is the free-text primitive, fifteen of whose parts are Combobox re-exports (counted in `@base-ui/react` 1.8.0's `autocomplete/index.parts`); the v0.1 checklist never named it, and folding two Roots into `combobox.tsx` would fight the file rule, so it is out of v0.1 and is not Command either. Command stays on the v0.2 line. Ultima owns no filter algorithm: Base UI's `Collection` / `createItems` is the filter, a filter library would be an engine under ADR 0007, and none is added. Do not wrap Ultima's `input` item: `Combobox.Input` is Base UI's combobox input, and wrapping `@ultima/ui/input` would inherit Input's `height` and put `input` in every combobox install, the same reason Textarea is its own file. Do not import Select or Menu either: restating the item style and the leading indicator slot in `combobox.tsx` costs a copy of tokens already in the file, and a sibling import would put `select` in every combobox install.

**The canonical Combobox pattern is Input-as-control.** `InputGroup` is the visual box and carries `size`, the sunken surface, the strong border, the radius, the validation selector, and the ring via `:focus-within`. `Input` is borderless inside it. That inverts Input-owns-its-box, and it is the composition Trigger and Clear actually sit in. `Trigger` is a styled chevron button, not a wrapper trigger. `Field.Label` keeps the default `nativeLabel={true}` because the control is an `<input>`. `Combobox.Label` names the **Trigger**, not the Input: use it only when Trigger is the control, with `nativeLabel={false}` on `Field.Label`. Input-inside-popup, grid/`Row`, and virtualization stay on the namespace; they are not v0.1 documented examples, except a second demo that shows the Label trap. Multiple/chips get a third demo because `Chip` paints. `Combobox.Empty` and `Combobox.Status` are the empty and status announcements: styled parts, `role="status"`, always mounted. They are not the v0.1 Empty component.

**Slider is seven parts, no axes, no `tone`.** Meter's `tone` is the color of a measurement; a Slider is a value picker, and recoloring the fill would make a volume control look like a warning. Fill is accent, or the `style` slot. `orientation`, `min`, `max`, `step`, `largeStep`, and `thumbAlignment` pass through and are not axes. Range (two thumbs) is in v0.1: one `Thumb` per value is already the API, `index` is already required for SSR, and deferring the example would not remove the part. Canonical `thumbAlignment` stays Base UI's default `"center"`, which injects no script. Ultima wires no pointer or keyboard behavior of its own.

**Alert is a static callout, and the docs' `Note` is not it.** There is no Base UI Alert; it is a plain component, item `alert`, four parts. It ships in v0.1 because the checklist named it. Today's `Note` stays docs-local as a styled paragraph, decided on [ULT-56](https://linear.app/frankie-ramirez/issue/ULT-56) and confirmed here: it paints nothing, so deleting it the way `data-table.tsx` was deleted would put a surface on content that currently has none. The inventory sentence stands. If `Note` later paints a surface, it becomes Alert then. `tone` is the only axis, Badge's six values, default `neutral`, no `variant` and no `size`. Paint is Badge's `subtle` column, restated in `alert.tsx`; do not import Badge. No live role: `Root` is a `<div>`. No built-in glyphs: `Icon` is the caller's, omitted when unused, and `aria-hidden`. The visible text is the non-colour signal. Title is canonical in demos and defaults to `<h3>` through `useRender`, like Card, but is not Dialog's always-rendered Title.

**Alert Dialog is a separate item from Dialog, not a recipe.** Sheet is a Dialog recipe because it *is* Dialog with placement overrides. Alert Dialog is a different Base UI Root: `modal` and `disablePointerDismissal` are forced `true` and `Omit`ted from the props type, and `Popup` is `role="alertdialog"`. A recipe over Ultima's Dialog cannot produce that. Item `alert-dialog`, one file, every Base UI part. `Handle` / `createHandle` is a value, not a provider. Do not import Ultima Dialog; restate Viewport, Backdrop, Popup, Title, and Description with the same overlay tokens Dialog uses, the same reason Combobox does not import Select. It joins the overlay recipe as the seventh overlay and does not vary it. Escape closes; a backdrop click does not. Title always rendered, and Description always rendered too: the APG requires `aria-describedby` on `alertdialog`. Ultima sets neither `initialFocus` nor `finalFocus`.

**Toast is outside the overlay recipe, and Ultima owns a live-region pattern rather than an announcer.** Item `toast`, one file, every Base UI part, plus `useToastManager` and `createToastManager` on the same namespace (`createHandle` is the precedent: a value, not a second item). Do not invent `useToast()`. It portals a floating surface and is not an overlay: not modal, not anchored in the documented case, and `z.toast` already sits above `z.popup`. Calling it the eighth overlay would either force `z.popup` or add a second z to a recipe defined as one constant. Canonical demo is stacked. Anchored `Positioner` / `Arrow` stay on the namespace and are not a v0.1 documented example; `copy-button.tsx` does not become an anchored toast. `tone` is the colour axis, Badge's six values, default `neutral`, and it is not a React prop on Root: callers pass Base UI `type` on `add()` / `promise()`, Ultima styles `[data-type]`. `error` paints as `danger` so `promise()` works; `loading` paints as `neutral`; those two strings are aliases, not extra axis values. Do not wrap `add()`. `priority` stays Base UI's and is not an axis. `Toast.Provider` is a pass-through part the consumer mounts with Portal and Viewport once in their tree; Portal and Viewport stay mounted even when the stack is empty. Ultima writes no context for this component, so ADR 0006 is unchanged. Swipe is Base UI's. Proof bar item 7 is not this component.

**Progress restates Meter and owns the indeterminate loop.** Item `progress`, one file, all five Base UI parts, all styled. Product boundary already closed: Progress is task completion, Meter is a bounded measurement. They cannot import each other: registry `registryDependencies` only match `@ultima/*` specifiers, and a relative `./meter` is skipped, the same reason Slider restated track geometry and Combobox restated item styles. Restate Meter's Track (sunken, full-radius, space-step-2 height, `overflow: hidden`) and Label (text step 2, uppercase, wide tracking, subtle) in `progress.tsx`. **`tone` on Root**, Meter's five values, default `neutral`, reaching Indicator and Value through file-private context, each overridable. Slider refused `tone` because it is a value picker; Progress is a measurement of completion, so a failed upload and a finished job are tones. No `variant`. No `size`. Determinate Indicator fill is the toned colour; width comes from Base UI's inline `%`. Determinate `transitionProperty: width` over `--ult-motion-base` with `standard` easing — a motion token, not `500ms`. Root is a styled Root (column, gap), like Meter. Indeterminate is still Progress, not a Spinner recipe: keep the `progressbar` role and `'indeterminate progress'` valuetext the primitive already sets. Base UI writes no inline style when `value` is `null`; Ultima styles `[data-indeterminate]` with this file's keyframes, duration `--ult-motion-loop`, and the reduced-motion static fallback (25% width, `animationName: none`). Do not invent a `variant="indeterminate"` axis. Canonical determinate demo plus a second indeterminate demo. Proof bar item 7 is not this component.

**Skeleton, Spinner, and Empty all ship, and none has a Base UI primitive.** Badge, Card, Stat, and Code are the precedent for plain elements. The checklist named all three, and Empty sits on the page-layout line: a docs file may arrange type, and may neither paint a surface nor hand the user a control from plain elements.

**Skeleton** is item `skeleton`, one part, `Root`. A sunken rounded placeholder. Pulse keyframes in this file, `--ult-motion-loop`, static under reduced motion. No axes. Size is the `style` slot, and docs examples use space-scale heights. It paints a surface, so it is not page layout.

**Spinner** is item `spinner`, one part, `Root`. A circular looping mark drawn in CSS, not a lucide asset and not a glyph slot: Iconography stays the caller's for real icons, and this is the loading mark. `--ult-motion-loop`, static glyph under reduced motion. No axes. No `tone`. Not a Progress. Toast `type="loading"` stays a toast, not a Spinner. Do not make Spinner a Progress recipe, and do not make Progress render a Spinner.

**Empty** is item `empty`, four parts, Alert-shaped: `Root`, `Title`, `Description`, `Icon`. No `tone`, no `variant`, no `size`. Root sets a centered column, gap, and a sunken surface so docs do not. Title and Description set type. `Icon` is decorative (`aria-hidden`), same rule as Alert: the caller's, omitted when unused, not a built-in glyph. An action is **children**, a catalogue `Button`, not a fifth part and not a plain `<button>`. **Not Card** (Card is content that exists; Empty is the absence of a collection). **Not Alert** (Alert is a callout about a condition). **Not page layout** (it paints, and it hands the user a control). **Not `Combobox.Empty`** (that part stays the list's mounted `role="status"`; callers do not replace it with this item).

| Component | Styled | Passed through |
| --- | --- | --- |
| Field | `Root`, `Label`, `Description`, `Error`, `Item` | `Control`, `Validity` |
| Fieldset | `Root`, `Legend` | none |
| Checkbox | `Root`, `Indicator`, `Group` | none |
| Radio Group | `Root`, `Item`, `Indicator` | none |
| Combobox | `Label`, `InputGroup`, `Input`, `Trigger`, `Icon`, `Clear`, `Chip`, `ChipRemove`, `Popup`, `Arrow`, `Status`, `Empty`, `List`, `Item`, `ItemIndicator`, `Separator`, `GroupLabel` | `Root`, `Value`, `Collection`, `Portal`, `Backdrop`, `Group`, `Row`, `Chips`. `Positioner` (`outline: 0`) |
| Slider | `Label`, `Value`, `Control`, `Track`, `Indicator`, `Thumb` | `Root` |
| Alert | `Root`, `Title`, `Description`, `Icon` | none |
| Alert Dialog | `Viewport`, `Backdrop`, `Popup`, `Title`, `Description` | `Root`, `Trigger`, `Portal`, `Close` |
| Toast | `Viewport`, `Root`, `Content`, `Title`, `Description`, `Arrow` | `Provider`, `Portal`, `Positioner` (`outline: 0`), `Action`, `Close` |
| Progress | `Root`, `Label`, `Track`, `Indicator`, `Value` | none |
| Empty | `Root`, `Title`, `Description`, `Icon` | none |

`Field.Root` owns the vertical rhythm between the label, the control, the description, and the error, which is spacing and so the first clause. `Description` carries `margin: 0` to kill the UA `<p>` margin along with its type. `Error` carries type and `--ult-color-danger-text`. `Item` is the per-row layout inside a group. `Validity` renders no element at all, the only part in the system with no DOM, so it is passed through for want of anything to style. `Fieldset.Root` is the one styled part in the system whose styling exists mostly to undo the UA stylesheet's border, margin, and padding on `<fieldset>`. Textarea is a single-part component, so it has no row above; its root is styled, like Input. `Checkbox.Indicator` and `RadioGroup.Indicator` are the second clause: `keepMounted` defaults to `false`, so the indicator stays in the DOM through its exit transition carrying `data-unchecked`, and without `display: none` in that window the glyph flashes on uncheck. `Checkbox.Group` and `RadioGroup.Root` are grouping parts the first clause would pass through; they are styled anyway because they own the column layout and gap of a stacked set, and the system-wide unstyled `RadioGroup` in the v0 table is Menu's grouping part, not this component. The focus ring is on the control — `Checkbox.Root`, `RadioGroup.Item` — not on a wrapping label, matching Switch.

`Combobox.Popup` and `Combobox.List` are clause 2: Popup needs `width: var(--anchor-width)` and `max-width: var(--available-width)` to track the input, and List must be the scroll container (`overflow-y: auto; overscroll-behavior: contain; max-height: min(<n>, var(--available-height))` with matching block padding and scroll-padding) or a long filtered list runs off the screen and keyboard highlight has nothing to scroll. Select.List stays pass-through; Combobox.List does not copy it. Combobox has no scroll-arrow parts. `Slider.Control` and `Slider.Track` are clause 2 twice over: Control's box model is read back with `getComputedStyle` to compute the drag offset and it needs `touch-action: none` and `user-select: none` or a touch drag scrolls the page, and Track needs an explicit cross-axis size or Indicator inherits `auto` and has none. Slider.Root only groups, so it passes through. The Slider ring cannot be written `:focus-visible` on Thumb: the focusable element is a nested visually-hidden `<input type="range">`, so the ring is `:has(:focus-visible)` on Thumb. Alert is a plain component, so every part is styled. Alert Dialog's split is Dialog's: the same five styled, the same four passed through, because seven of its nine parts are Dialog re-exports and Trigger and Close are wrapper triggers. Toast.Root is a styled Root, like Tabs: it paints a surface and its stacking CSS is clause 2. Viewport is clause 2 for the frontmost-height clamp and `z.toast`. Content is `[data-behind]` opacity. Action and Close are wrapper triggers. Progress.Track is clause 2: explicit height plus `overflow: hidden`, or the fill is invisible, the same silent failure Slider.Track has. Progress.Indicator in indeterminate mode is clause 2 as well: Base UI writes no inline style, so without Ultima's keyframes the bar is an empty track. Empty is a plain component, so every part is styled. Skeleton and Spinner are single-part, so they have no row above; their roots are styled, like Badge.

### One file per component

A component is one file, `packages/ui/src/<name>.tsx`, and one registry item of the same name. The file holds the StyleX tables at module scope, then the parts, then the export. Compound components are still one file. Demos live in `apps/docs`, never beside the component.

Every file starts with `'use client'`. Base UI parts carry their own client boundary, but a plain component that uses `useRender` does not, and the directive is harmless under Vite.

**A component never imports a sibling relatively.** It imports `@ultima/ui/<name>`, which `packages/ui/package.json` exports through a `./*` subpath. Decided on [What the expanded v0 catalogue changes about the proof bar and the release gate](https://linear.app/frankie-ramirez/issue/ULT-58), because the registry build derives `registryDependencies` and rewrites import paths by matching `@ultima/*` specifiers: a relative `./dialog` is skipped by both, silently producing an item that installs a file importing a component the consumer was never told to install. Sidebar composing Dialog is the first case in v0.

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

A single-part component exports one function: `Button`, `Input`, `Switch`, `Textarea`, `Skeleton`, `Spinner`. A multi-part component exports one namespace object of parts, `Card.Root`, `Dialog.Popup`, matching Base UI's part names wherever a primitive exists. Parts Ultima does not style (`Dialog.Portal`, `Tooltip.Provider`) sit on the same object, re-exported unchanged, so a consumer imports one name. Flat `DialogPopup`-style exports do not exist.

### Cross-part state

Decided on [Cross-part state in Ultima](https://linear.app/frankie-ramirez/issue/ULT-52), and recorded as ADR 0006, because a hook a component exports is a name in code the consumer owns and calls. Two foundation components had already answered this differently: Tabs holds `variant` in a context private to `tabs.tsx` so `List`, `Tab`, and `Indicator` read what `Root` was given, and Meter made the caller pass `tone` to `Indicator` and `Value` separately. The rule below covers both, and Meter changes to follow it.

**A value the parts must agree on lives in context on the root. A value that can sensibly differ from part to part is a prop on each part.** That is the test an author applies. Tabs' `variant` cannot differ between its list and its indicator, so it is context. Sidebar's open state has to reach its trigger and its panel together, so it is context. A per-item `active` flag differs by item, so it stays a prop. Where a value is context and a per-part override still makes sense, the part accepts the same prop and the prop wins. Meter's `tone` on `Root` reaching `Indicator` and `Value` is the v0 case; Progress copies it.

Context is created in the component's own file with `createContext` and read with `use`. It is never a separate registry item and never a provider the consumer has to remember: the component's `Root` is the provider. One file per component means the context and every part that reads it install together, so the registry item shape does not change.

**Axis context carries a real default and never throws.** `Tabs.List` outside `Tabs.Root` renders as `underline`. A part rendered outside its root degrades rather than failing the consumer's render, and the component's docs page says which parts need the root.

**A component with shared runtime state exports a hook, `use<Component>()`.** Sidebar exports `useSidebar()`. The hook is how a consumer builds a part of their own that reads or sets the state, the flexibility shadcn's Sidebar gives through the same name. Its return type is public surface, documented on the component page beside the parts. The hook throws with a named message when called outside the root (`useSidebar must be used inside Sidebar.Root`), because a consumer calls it deliberately and a silent no-op would hide their bug. A component whose context carries only an axis, like Tabs, exports no hook.

**Shared runtime state is controlled or uncontrolled, with Base UI's names.** `open`, `defaultOpen`, `onOpenChange`, resolved per render as `open ?? internal` rather than latched at mount, so a consumer can move between the two. A second state value follows the same pattern under its own name: Sidebar's `mobileOpen`, `defaultMobileOpen`, `onMobileOpenChange`.

Base UI's primitives hold their own context across their parts. This rule says nothing about that; it governs context Ultima writes. `Toast.Provider` and `Tooltip.Provider` are that primitive context, mounted by the consumer, and they are not a violation of "never a provider the consumer mounts": that sentence is about context Ultima writes. Toast writes none. A flat Sidebar taking navigation as a data prop, so no tree exists for state to cross, was ruled out: it breaks the compound rule above and cannot take the consumer's router link through `render`.

### Styled parts

A compound component exposes every Base UI part, but most parts have nothing to paint. Apply the same styling rule to every part, including parts added after the foundation set:

**A part carries Ultima styles if it paints — background, border, shadow, or color — or if it sets its own type or spacing. A part passes through unstyled if its whole job is to portal, position, or group.** Unstyled by that rule across the system: `Portal`, `Root`, `Group`, `RadioGroup`, `SubmenuRoot`, and `Viewport`, except where a component's row below says otherwise. `Positioner` is a near-exception: it gets `outline: 0` and nothing else, following Base UI's own demos.

**A part also carries Ultima styles when the primitive's behavior depends on CSS the primitive does not supply.** Reading a variable the primitive seeds, or clipping or sizing something a transition needs. Added on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57), because [ULT-49](https://linear.app/frankie-ramirez/issue/ULT-49) found the first case where the first clause produces a component that does not work: `NavigationMenu.Positioner` and `NavigationMenu.Viewport` must carry real CSS or the menu neither resizes nor clips, and both are part names the first clause classifies as pass-through across the system. That holds whether or not Navigation Menu ever ships, because the next anchored primitive with a size morph has the same shape. A stated exception per component was the alternative and does not scale: the table would accumulate exceptions instead of a rule. The clause covers `Collapsible.Panel`, whose height animation reads `--collapsible-panel-height`, and it is also why `Dialog.Viewport` is styled, which the first clause alone never explained.

**Triggers that wrap the consumer's element pass through unstyled.** `Menu.Trigger`, `Tooltip.Trigger`, `Dialog.Trigger`, `Dialog.Close`, `AlertDialog.Trigger`, `AlertDialog.Close`, `Toast.Action`, `Toast.Close`, `Sidebar.Trigger`, `Sidebar.Close`, and `Collapsible.Trigger` exist to be given the consumer's own button through `render`, and `stylex.props` does not merge foreign class strings, so an Ultima style on the wrapper and an Ultima style on the Button rendered into it collide instead of cascading. Each is documented as `render={<Button />}` and ships no styles at all, not even the reset or the focus ring. `Select.Trigger` is styled, because it *is* the control rather than a wrapper around one. `Combobox.Trigger` is styled too: in the canonical pattern it is the chevron button inside `InputGroup`, not a slot for the consumer's Button.

This qualifies the focus-ring rows in the accessibility contract below: on Dropdown Menu, Tooltip, Dialog, Alert Dialog, Toast, Sidebar, and Collapsible the ring is rendered by whatever the consumer puts in the trigger or close slot, and each docs page says the slot must hold an Ultima Button or an element carrying its own ring.

| Component | Styled | Passed through |
| --- | --- | --- |
| Dropdown Menu | `Popup`, `Item`, `LinkItem`, `CheckboxItem`, `RadioItem`, `SubmenuTrigger`, `CheckboxItemIndicator`, `RadioItemIndicator`, `Separator`, `GroupLabel`, `Arrow` | `Root`, `Trigger`, `Portal`, `Backdrop`, `Positioner` (`outline: 0`), `Group`, `RadioGroup`, `SubmenuRoot`, `Viewport` |
| Select | `Label`, `Trigger`, `Value`, `Icon`, `Popup`, `Item`, `ItemText`, `ItemIndicator`, `ScrollUpArrow`, `ScrollDownArrow`, `Separator`, `GroupLabel` | `Root`, `Portal`, `Backdrop`, `Positioner` (`outline: 0`), `List`, `Group`, `Arrow` |
| Dialog | `Viewport`, `Backdrop`, `Popup`, `Title`, `Description` | `Root`, `Trigger`, `Portal`, `Close` |
| Tooltip | `Popup`, `Arrow` | `Provider`, `Root`, `Trigger`, `Portal`, `Positioner` (`outline: 0`), `Viewport` |
| Tabs | `Root`, `List`, `Tab`, `Indicator`, `Panel` | none |
| Meter | `Root`, `Label`, `Track`, `Indicator`, `Value` | none |
| Switch | `Root`, `Thumb` | none |
| Sidebar | `Panel`, `Group`, `GroupLabel`, `List`, `Link`, `Button` | `Root`, `Item`, `Trigger`, `Close` |
| Collapsible | `Panel` | `Root`, `Trigger` |
| Toggle Group | `Root`, `Item` | none |

`Field.Control` is the third part the wrapper rule takes back from the first clause, and The v0.1 set above says why: Ultima's `Input` already *is* `Field.Control`, so styling the part would paint one element from two tables. Combobox's, Slider's, Alert's, Alert Dialog's, Toast's, Progress's, and Empty's styled splits live in that same section rather than the table below, which stays the v0 set.

`Select`'s scroll arrows are the one part the rule alone would get wrong, and the per-component notes say why they are styled. `Dialog.Viewport` and `Collapsible.Panel` are the second clause rather than exceptions. `Collapsible.Trigger` is the one part the first clause would style and the wrapper-trigger rule takes back: it is a real control carrying its own `aria-expanded` and `aria-controls`, but the spec already composes it as `Collapsible.Trigger render={<Sidebar.Button />}`, which is exactly the collision the wrapper rule prevents.

The plain components (Card, Table, Stat, Code, Badge, Alert, Empty, Skeleton, Spinner) have no pass-through parts: Ultima writes every element, so every part is styled. Sidebar is the plain component that does have them: `Root` only groups and provides context, `Item` is a bare `<li>`, and `Trigger` and `Close` are wrapper triggers.

### Variants, sizes, and tones

Three axis props across the whole system, and no others: `variant` (shape and emphasis), `size` (the three control heights), and `tone` (which color role the component wears). A component declares only the axes it needs, and only the values it supports. The tables are `variants`, `sizes`, and `tones`; the prop unions are `keyof typeof` each table, exported as `<Component>Variant`, `<Component>Size`, and `<Component>Tone`. Defaults are declared in the destructure. There is no `cva`. Textarea is the one place `size` is not a fixed height: the same three space steps are `min-height`, so a `md` textarea starts as tall as a `md` Input and can grow. Combobox's `size` is the same three heights as Input, carried on `InputGroup`. Slider has no `size`: its track follows Meter's cross-axis size, not a control height. Alert has no `size` and no `variant`: `tone` is its only axis. Toast has the same six tones and neither of the other two, forwarded as Base UI `type` / `data-type` rather than as a prop on Root. Progress takes Meter's five tones on `Root` and neither of the other two. Skeleton, Spinner, and Empty have no axes.

`tone` was added on [Per-component contracts for the v0 set](https://linear.app/frankie-ramirez/issue/ULT-19), for the three v0 components that let a caller choose a hue: Button, Badge, and Meter. Its values are named for the color roles, so `tone="danger"` reaches `--ult-color-danger` and `--ult-color-danger-contrast` together and the caller never names a token. A component that needs a neutral tone includes `neutral` in its own table; `neutral` is not a color role and has no `--ult-color-neutral`, so each component says which neutral tokens it uses. Slider does not take `tone`: it is a value picker, not a measurement, settled on [ULT-81](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts). Alert takes Badge's six tones and Badge's `subtle` column only, settled on [ULT-82](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one): a callout has no `solid` counterpart worth a `variant`. Toast takes the same six, settled on [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern), as `type` on `add()` rather than a `tone` prop on Root, so there are not two sources for one colour. Progress takes Meter's five, settled on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a): it is task completion, so a failed upload and a finished job are tones the way a Meter reading is. Spinner does not take `tone`: it is a decorative mark, not a measurement.

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

Every cell is written out. The tables stay small because each component declares only the tones it supports: six cells on Button, twelve on Badge, six on Alert, five on Progress. A value that depends on both `variant` and `size` still nests as a conditional inside the variant table, and the spec notes it on that component.

The local-custom-property alternative, where `tone` sets `--ult-tone-fill` and one variant table reads it, is closed: StyleX emits `create` rules that set custom properties outside the cascade layer when `useCSSLayers` is on ([#1611](https://github.com/facebook/stylex/issues/1611)), and Ultima keeps `useCSSLayers`. Revisit if that is fixed; the nested tables are a private detail of each file, so the change would not reach consumers' props.

### State styling

- Pointer states use pseudo-classes and the state tokens: `':hover'` reads `--ult-color-<role>-hover`, `':active'` reads `--ult-color-<role>-active`. Never `color-mix()` or any color derived at the use site.
- Component state uses Base UI's data attributes inside the value: `':is([data-disabled])'`, `':is([data-open])'`, `':is([data-checked])'`, `':is([data-indeterminate])'`. The `className` function form is never used, so the class stays static.
- Focus uses `':focus-visible'` and `--ult-color-border-focus`. Combobox is the first `:focus-within` ring: the visual box is `InputGroup`, focus lands on `Input`, and `:focus-visible` on the group never matches. `:focus-within` misses StyleX's camelCase lookup the same way `:focus-visible` does and lands at 3040; the ring still survives because it is an `outline`.
- Dynamic styles (function values in `stylex.create`) are allowed only for runtime numbers such as a meter width, never for variants.
- **Validation state is styled through `':is([aria-invalid="true"], [data-invalid])'`**, one condition matching both the standalone and the in-Field paths. Settled by measurement on [ULT-79](https://linear.app/frankie-ramirez/issue/ULT-79) against the installed `@base-ui/react` 1.8.0, because [ULT-74](https://linear.app/frankie-ramirez/issue/ULT-74) and [ULT-76](https://linear.app/frankie-ramirez/issue/ULT-76) disagreed about what the attribute even holds and neither had run the code. What it holds is `aria-invalid="true"`: the valueless form ULT-76 reported does not occur, so the selector that shipped with Input was never broken. What it does not survive is a disabled control, and that is the reason for the second half. Base UI drops `aria-invalid` on a control that is disabled while invalid and deliberately keeps `data-invalid` there, so an `aria-invalid` selector alone silently loses the danger border on a control whose error message is still rendered and still in `aria-describedby`. The two disabled paths differ and only one is a hazard: disabling the **control** keeps `data-invalid` and the error, while disabling the whole **`Field.Root`** resets the validity state, so both attributes and the message go together and there is nothing left to style. Both halves of the condition are therefore load-bearing, and neither is redundant.
- A media query is an at-rule key inside the value, and it outranks every state condition written beside it. A condition that must hold inside the query is nested inside it: `[DESKTOP]: { default: 'blue', ':hover': 'green' }`, never `':hover'` as a sibling of `[DESKTOP]`. Two components write one. Sidebar writes a breakpoint, under its per-component notes. A looping animation writes `@media (prefers-reduced-motion: reduce)` to set `animation-name: none` (and the static fallback that implies), under Motion above. Transitions still never write that query: they read a duration token. The nesting rule is the system's either way.

**How StyleX actually orders these**, measured on [Responsive styling in StyleX 0.19.0](https://linear.app/frankie-ramirez/issue/ULT-51) against this repo's installed compiler and written down here because both findings are already true of the components that shipped before Sidebar, and neither is in StyleX's documentation.

Conditions in one property value do not compete on CSS specificity. Each becomes its own rule carrying a StyleX priority number, which is the property's priority plus a contribution per condition, and under `useCSSLayers` that number also picks the cascade layer (`Math.floor(priority / 1000)`). Equal priorities are broken by an alphabetical comparison of the rule text, which is not a rule anyone should rely on.

- **`':focus-visible'` sorts below `':hover'`, not above it.** StyleX's pseudo-class priority table spells two of its keys in camelCase, `':focusVisible': 160` and `':focusWithin': 140`, which are not CSS pseudo-class names. The real spellings miss the lookup and take the default contribution of 40, so `':focus-visible'` lands at 3040 rather than the documented 3160. Writing the camelCase form to reach 160 is not a workaround: it emits `:focusVisible` into the selector, which matches nothing. The practical order for the conditions Ultima writes is `:focus-visible`, `:focus-within`, and `:is([data-*])` tied at 3040, then `:hover` at 3130, then `:active` at 3170. Ultima's ring survives this only because it is an `outline` and the hover state sets background and color, so the two never contend for a property. A component that ever wants a focused appearance to beat a hovered one on the same property nests the focus condition inside the hover one rather than trusting the order.
- **A bare media query at 3200 outranks all of them, `:hover` included.** That is what the nesting rule above is protecting against, and it is why the rule is stated as nesting rather than as ordering: there is no order of sibling keys that makes a hover inside a breakpoint work.

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

Decided on [Accessibility contract per v0 component](https://linear.app/frankie-ramirez/issue/ULT-18) for the fourteen foundation components, with Sidebar's row added on [ULT-53](https://linear.app/frankie-ramirez/issue/ULT-53) and [ULT-55](https://linear.app/frankie-ramirez/issue/ULT-55), Collapsible's and Toggle Group's on [ULT-57](https://linear.app/frankie-ramirez/issue/ULT-57), Field's and Fieldset's on [ULT-79](https://linear.app/frankie-ramirez/issue/ULT-79), Checkbox's, Radio Group's, and Textarea's on [ULT-80](https://linear.app/frankie-ramirez/issue/ULT-80/checkbox-radio-group-and-textarea-parts-glyphs-and-the-indeterminate), Combobox's and Slider's on [ULT-81](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts), Alert's and Alert Dialog's on [ULT-82](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one), Toast's on [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern), and Progress's, Skeleton's, Spinner's, and Empty's on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a). Base UI supplies the roles, ARIA state, keyboard handling, and focus management for every interactive primitive, following the WAI-ARIA Authoring Practices. Ultima adds nothing and removes nothing there. What Ultima owns is the accessible name, the visible focus ring, and the element choice for the plain components. The table records both halves so a builder does not re-implement what the primitive gives. Every component in The v0 set has a row, and so does every component in The v0.1 set. Field and Fieldset are in the table too, not only the controls: a component that paints no control still owes a builder its element and the question of what names it, and leaving the two out left the table at twenty-nine rows for a thirty-one-item catalogue.

| Component | Element or primitive | Name source | Focus ring on | Keyboard | Enforced by |
| --- | --- | --- | --- | --- | --- |
| Button | Base UI `Button` (`<button>`) | Text content; a Button with no text passes `aria-label` | Root | Base UI | Docs |
| Input | Base UI `Input` (`<input>`) | Consumer `<label htmlFor>`, `aria-label`, `aria-labelledby`, or a `Field.Label` | Root | Native | Docs |
| Switch | Base UI `Switch` | Wrapping `<label>`, `aria-label`, `aria-labelledby`, or a `Field.Label` | Root | Base UI (Space, Enter) | Docs |
| Select | Base UI `Select` | `Select.Label`, `aria-label` on Trigger, or a `Field.Label` with `nativeLabel={false}` | Trigger | Base UI (arrows, typeahead, Escape) | Docs |
| Dropdown Menu | Base UI `Menu` | Trigger text, or `aria-label` on Trigger | Trigger | Base UI (arrows loop, Enter, Space, typeahead, Escape, Tab closes) | Docs |
| Dialog | Base UI `Dialog` | `Dialog.Title`, always rendered; `Dialog.Description` optional | Close, and any focusable content | Base UI (Tab loops, Escape closes, focus returns to trigger) | Docs |
| Tabs | Base UI `Tabs` | Tab text | Tab | Base UI (arrows, `activateOnFocus` and `loopFocus` defaults) | Base UI |
| Tooltip | Base UI `Tooltip` | `aria-label` on `Tooltip.Trigger`, matching the tooltip text | Trigger's rendered element | Base UI (focus opens, Escape closes) | Types: `'aria-label'` required on `Tooltip.Trigger` |
| Meter | Base UI `Meter` | `Meter.Label` | None (not focusable) | None | Docs |
| Table | `<table>` parts; `Table.Scroll` a `<div role="region" tabindex="0">` when the table overflows | `Table.Caption` optional, and it names `Table.Scroll` through `aria-labelledby` | `Scroll`, when used | Static; native scrolling once `Scroll` has focus | Native, Docs |
| Stat | `<div>` root, `<span>` label and value | `Stat.Label`, before `Stat.Value` in DOM order | None | Static | Native |
| Code | `<code>`, or `<pre><code>` for the block variant | Content | None | Static | Native |
| Badge | `<span>` | Content; color never carries meaning alone | None | Static | Docs |
| Card | `<div>` parts | `Card.Title` renders `<h3>` by default, changeable through `render` | None | Static | Native |
| Separator | Base UI `Separator` (`<div role="separator">`) | Optional accessible label from the consumer | None | Static | Base UI |
| Sidebar | `<nav>` on `Panel`; `<ul>`, `<li>`, `<a>`, `<button>`, `<h3>` on the rest; Dialog around `Panel` below the breakpoint | `aria-label` or `aria-labelledby` on `Sidebar.Panel`, which the mobile popup reuses; `aria-label` on the elements rendered into `Sidebar.Trigger` and `Sidebar.Close` | `Link`, `Button`; `Trigger`'s and `Close`'s rendered elements | Native (Tab, Enter, Space); Collapsible for group disclosure; Dialog for the mobile menu (Tab loops, Escape closes, focus returns to the trigger) | Types: one of `'aria-label'` or `'aria-labelledby'` required on `Sidebar.Panel` |
| Collapsible | Base UI `Collapsible` | `Trigger` text | `Trigger`'s rendered element | Base UI (native button: Space, Enter; no arrows, no Escape) | Docs |
| Toggle Group | Base UI `ToggleGroup` and `Toggle` | `aria-label` or `aria-labelledby` on `ToggleGroup.Root`; text or `aria-label` on each `Item` | `Item` | Base UI (roving tabindex, arrows along the orientation, Home and End, Space and Enter toggle) | Docs |
| Field | Base UI `Field` (`<div>` root; `Label` a `<label>`, `Description` a `<p>`, `Error` a `<div>`) | None of its own. `Field.Label` names the control in the slot, and `Description` and `Error` describe it through the `aria-describedby` merge | None | Static; every interactive element inside a Field is a component that brings its own | Docs |
| Fieldset | Base UI `Fieldset` (a real `<fieldset>`; `Legend` a `<div>`) | `Fieldset.Legend`, which `Fieldset.Root` points `aria-labelledby` at; a required group puts the word "required" in it | None | Static | Docs |
| Checkbox | Base UI `Checkbox` (`<span role="checkbox">` plus a hidden input); `Checkbox.Group` a `<div role="group">` | Wrapping `<label>`, `aria-label`, `aria-labelledby`, or a `Field.Label`. A group is named by `Fieldset.Legend` | `Root` | Base UI (Space, Enter) | Docs |
| Radio Group | Base UI `RadioGroup` and `Radio` (`<div role="radiogroup">`; each `Item` a `<span role="radio">` plus a hidden input) | `Fieldset.Legend`, or `aria-label` / `aria-labelledby` on `Root`; wrapping `<label>` or `Field.Label` on each `Item` | `Item` | Base UI (roving tabindex, arrows move and select, looping; Home and End off; Space selects) | Docs |
| Textarea | Base UI `Input` rendered as `<textarea>` | Consumer `<label htmlFor>`, `aria-label`, `aria-labelledby`, or a `Field.Label` | Root | Native (Enter inserts a newline and does not submit) | Docs |
| Combobox | Base UI `Combobox` (`<input role="combobox">` in the canonical pattern) | Consumer `<label htmlFor>`, `aria-label`, `aria-labelledby`, or a `Field.Label`. `Combobox.Label` names the Trigger, not the Input | `InputGroup` (`:focus-within`); Trigger when it is the control | Base UI (arrows, Enter, Escape, typeahead on Trigger) | Docs |
| Slider | Base UI `Slider` (`Root` a `<div role="group">`; each Thumb a nested `<input type="range">`) | `Slider.Label`, or `aria-label` on each Thumb; a `Field.Label` with `nativeLabel={false}` | Thumb, via `:has(:focus-visible)` | Base UI (arrows, RTL-aware; Shift+arrow and PageUp/PageDown for `largeStep`; Home and End) | Docs |
| Alert | `<div>` parts; `Title` an `<h3>` by default | Visible text (Title, or Description when there is no Title); color never carries meaning alone | None | Static | Docs |
| Alert Dialog | Base UI `AlertDialog` (`Popup` `role="alertdialog"`) | `AlertDialog.Title`, always rendered; `AlertDialog.Description`, always rendered | Close, and any focusable content | Base UI (Tab loops, Escape closes, backdrop click does not, focus returns to trigger) | Docs |
| Toast | Base UI `Toast` (Viewport `role="region"`; each Root `role="dialog"` or `"alertdialog"`) | Viewport `aria-label="Notifications"`; Title labels each Root | Action's and Close's rendered elements | Base UI (F6 focuses the viewport; swipe dismisses) | Docs |
| Progress | Base UI `Progress` (`<div role="progressbar">`) | `Progress.Label` | None (not focusable) | None | Docs |
| Skeleton | `<div aria-hidden="true">` | None; the container it stands in for is `aria-busy` | None | Static | Docs |
| Spinner | `<div aria-hidden="true">` | None; the busy container is `aria-busy`; start/end speech uses the live-region pattern | None | Static | Docs |
| Empty | `<div>` parts; `Title` an `<h3>` by default | Visible text (Title, or Description when there is no Title) | None | Static | Docs |

Rules the table compresses:

- **Types enforce two things.** `Tooltip.Trigger` requires `'aria-label': string`, because Base UI wires nothing between a tooltip and its trigger for assistive technology. `Sidebar.Panel` requires one of `'aria-label'` or `'aria-labelledby'`, as a union, because a page with a sidebar has at least two navigation landmarks and an unnamed one fails the APG's unique-label rule; the type cannot see which the author prefers, so it accepts either and rejects neither. Every other name source varies with context (a visible label, a labelling element, a child part), and a type cannot see children or siblings, so those are documented rules. Requiring `aria-label` on Input would steer authors to the worst of their three options. `ToggleGroup.Root` has the same shape as `Sidebar.Panel` — no child part can name it, so the name can only be an attribute — and stays a documented rule anyway: an unnamed second navigation landmark is a hard APG failure with a named rule behind it, while an unnamed `role="group"` is a weaker recommendation that no automated check flags. Two type-enforced attributes remain the total.
- **Wrapper triggers render the ring, not Ultima.** `Dropdown Menu`, `Tooltip`, `Dialog`, `Alert Dialog`, `Toast`, `Sidebar`, and `Collapsible` name a Trigger or Close in the focus-ring column, and those parts pass through unstyled under Styled parts above, so the ring comes from the element the consumer renders into the slot. The docs page for each says the slot must hold an Ultima Button or an element carrying its own ring. `Select.Trigger` is styled by Ultima and renders its own ring. Combobox's canonical ring is `:focus-within` on `InputGroup`; Slider's is `:has(:focus-visible)` on `Thumb`, because the focus target is the nested range input.
- **Icon-only Button** is a documented rule, not a component: no `IconButton` and no `iconOnly` prop in v0.
- **Input works without Field, and adding Field costs it nothing.** Standalone, its validation state is the consumer's `aria-invalid`, styled with `--ult-color-danger-border`. Inside a `Field.Root` it needs no new prop, no context read, and no wrapper: Base UI's `Input` *is* `Field.Control`, so it registers itself as the field's control and receives `aria-labelledby`, `aria-describedby`, `aria-invalid`, and the state attributes automatically. **There is exactly one source of validation state**, because the two paths are mutually exclusive in practice: a consumer inside a Field never writes `aria-invalid`, since Base UI owns it, and a consumer outside one has no Field to own it. The failure mode the contract rules out is the other shape, a Field-level `invalid` prop that Ultima forwards to the control by hand; Ultima forwards nothing, and `Field.Root`'s `invalid` is Base UI's own pass-through for an engine, per Forms. The one edit Field's build ticket makes to a shipped file is widening Input's selector to `':is([aria-invalid="true"], [data-invalid])'` — see State styling for why.
- **A field's error reaches assistive technology through `aria-describedby`, never `aria-errormessage`, and Ultima emits neither itself.** Base UI merges the `Field.Description` and `Field.Error` ids into one `aria-describedby` on the control and sets `aria-invalid` when the field is invalid, so the whole convention is inherited and the contract's usual split applies unchanged: Base UI supplies it, Ultima adds nothing and removes nothing. `aria-errormessage` is ruled out by evidence rather than taste, on [ULT-76](https://linear.app/frankie-ramirez/issue/ULT-76): none of six surveyed systems generates it, the string appears zero times in Base UI's published package, there is no WCAG technique for it at all, and it still fails on VoiceOver with Safari as of 2025-12-24. Announcement order is Base UI's, which is mount order, so a description that was present at first paint is announced before an error that appears later regardless of their order in the markup. Ultima does not reorder it.
- **`Field.Error` is not a live region, and must not become one.** Two independent reasons, and each is sufficient. Base UI's `Form` focuses the first invalid control on submit, which is a change of context under WCAG's own definition, which takes the error out of SC 4.1.3's scope entirely. And `aria-describedby` pointing at a `role="alert"` element loses the description on VoiceOver macOS, VoiceOver iOS, and Orca — and `Field.Error`'s id is precisely what `aria-describedby` points at, so a live region there is actively harmful rather than merely redundant. This agrees with the live-region pattern settled on [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern), with the mechanics measured first on [ULT-77](https://linear.app/frankie-ramirez/issue/ULT-77). **The reason is conditional on the submit path**, so the condition is part of the contract: the documented examples wrap fields in `Form`, and `validationMode` stays Base UI's default `onSubmit`. A consumer who validates on blur without moving focus is back inside 4.1.3 and owns a live region themselves, which the Field page says.
- **`Field.Label` is a real `<label for>`, and Base UI associates the name twice.** The control also carries `aria-labelledby` pointing at the same label. For a control that is not a labelable element, the label takes `nativeLabel={false}`, which drops `htmlFor` and leaves `aria-labelledby` to carry the name alone; without it the `for` points at a `<button>` or a `role="group"` and brings label-activation and hover behaviors the control should not inherit. `Select.Trigger` needs it. Canonical Combobox does not: the control is `Combobox.Input`, an `<input>`, so the default `nativeLabel={true}` stands; the Label-trap demo, where Trigger is the control, takes `false`. Slider needs it: `Slider.Root` is `role="group"` and is the field's control. Ultima passes the prop through and each control's docs page says whether it needs it. It is not type-enforced: which controls need it varies with what the consumer renders into the field, a type cannot see a sibling, and the contract's two type-enforced attributes stay the total.
- **Required marking is the native attribute and nothing else.** `required` passes through to the control, and Base UI adds `aria-required` where the control is not a native input. Ultima ships no asterisk, no marker part, and no `necessityIndicator` prop: a visible marker is label text, and label text is the consumer's, which is the same line Icon-only Button sits on. W3C's own recipe puts "(required)" in the label text for exactly this reason. One documented exception, because the support data forces it: `aria-required` on a radio group fails on TalkBack entirely, so a required **group** puts the word "required" in its legend, which the Fieldset docs page says. A single control needs no such workaround.
- **A grouped control is named by `Fieldset.Legend` and gets one error for the whole group.** `Fieldset.Root` renders a real `<fieldset>` named through `aria-labelledby`, and a group-level `Field.Error` reaches the group through the same `aria-describedby` merge. **No per-item error**: `Field.Item` carries a label and a description and never an error, following both Primer implementations, because an individual checkbox or radio is not independently invalid. Two things are accepted knowingly rather than inherited silently. `Fieldset.Legend` renders a `<div>`, not a `<legend>`, which trades the forms-mode guarantee — screen readers in forms mode read `<legend>` and not a sibling `<div>` — for a legend Ultima can set to the type scale; the name still reaches assistive technology as a real accessible name on a real `<fieldset>`, which is what makes the trade affordable. And Base UI sets `aria-invalid` on a checkbox group's `role="group"`, which that attribute's Used in Roles list excludes; it is permitted on `radiogroup` and not on `group`. Ultima does not strip it, because the contract says Ultima removes nothing from what the primitive emits, but it is recorded here as a known deviation rather than discovered later by an audit. The documented grouping is Fieldset wrapping the group as children, so the `<fieldset>` stays in the tree; `Fieldset.Root render={<RadioGroup.Root />}` would replace it with the radiogroup and is not the shape.
- **Indeterminate is `aria-checked="mixed"`, which Base UI emits from the `indeterminate` prop.** Ultima does not set the native `indeterminate` property; that lives on the hidden input Base UI owns. The dash glyph is the visible signal, and colour is not. Data Table's select-all is a controlled `indeterminate` on a standalone Checkbox, because the header and the body rows are not one `Checkbox.Group`. `parent` plus `allValues` on `Checkbox.Group` is the form-list recipe for a select-all that *is* in the same group.
- **`Combobox.Empty` and `Combobox.Status` stay mounted.** They are `role="status"` polite live regions, and Core-AAM only maps text changes *inside* a live region; inserting the region itself is silent. The empty state is this part, not the v0.1 Empty component. Callers pass children into `Empty`; they do not replace it with a catalogue item.
- **A Slider's value is `aria-valuetext` on the nested range input, not a live region on `Value`.** Base UI locale-formats it by default and the prop is overridable per thumb. `Slider.Value` is an `<output htmlFor>` with `aria-live="off"` so a drag does not spam. Ultima does not wrap a formatter. The live-region pattern under Live regions below is not this part. A multi-thumb slider needs a distinct `aria-label` per thumb: the group label alone does not distinguish them.
- **Dialog always renders a Title.** Base UI sets `aria-labelledby` only when one exists. A design with no visible heading hides the Title through the `style` slot rather than omitting it. `modal` stays Base UI's default (`true`). Sidebar's mobile menu is the one stated exception: its popup takes the `aria-label` or `aria-labelledby` that `Sidebar.Panel` was given and renders no Title, because the name already exists on the `<nav>` inside it.
- **Alert is not a live region.** `Root` is a `<div>` with no `role="alert"` and no `role="status"`. A callout that was in the page at first paint is not an interruption, and `role="alert"` on it is the APG misuse; a SPA navigation that mounts one would assertively interrupt. This is the Alert half of the agreement [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern) closed: do not put `role="alert"` on the catalogue Alert to make Toast's pattern simpler. A consumer who needs ARIA19 on a dynamically inserted validation summary uses `Root`'s `render` to add `role="alert"` themselves. Ultima's documented examples do not. `Icon` is `aria-hidden` and decorative; the visible text is the non-colour signal, the same rule as Badge. An icon-only Alert fails that rule. Title is canonical in demos and is not Dialog's always-rendered Title.
- **Alert Dialog always renders a Title and a Description.** Title for the same reason Dialog does. Description because the APG requires `aria-describedby` on `alertdialog` pointing at the alert message; Dialog's Description stays optional. Hide either through the `style` slot rather than omitting it. `modal` and `disablePointerDismissal` are not props: Base UI forces both `true` and `Omit`s them. Escape closes; a backdrop click does not. Ultima sets neither `initialFocus` nor `finalFocus`. The default first-focusable stands, so the accessibility contract and the destructive demo put the least-destructive action first in DOM (or the caller passes `initialFocus`) and a Delete confirm does not land on Delete. Proof bar item 7 is not this component: Ultima wires no focus of its own.
- **Toast inherits Base UI's live regions and does not replace them.** Viewport is `role="region"` with `aria-label="Notifications"`, `aria-live="polite"`, `aria-atomic={false}`, `aria-relevant="additions text"`, and `tabIndex={-1}`. F6 focuses it. Each Root is `role="dialog"`, or `"alertdialog"` at `priority: 'high'`, with `aria-modal={false}`. High-priority toasts announce through the primitive's sibling visually hidden `role="alert"` clone holding `title` and `description`; the visible Root is `aria-hidden` until the viewport is focused. Ultima does not restyle, wrap, or replace that clone, and does not build announce-only on the accidental path where a high-priority add with no Root still speaks. Portal and Viewport stay mounted when the stack is empty; a consumer who gates Portal on `toasts.length` defeats the region, because it has no SSR output and Core-AAM only maps changes inside an already-mounted region. Action and Close are wrapper triggers; the ring is the Button in the slot. Colour never carries meaning alone: Title (or Description) is the non-colour signal, same rule as Alert.
- **Progress inherits the primitive's `progressbar`.** Root is `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (omitted when indeterminate), `aria-valuetext` (defaulting to `'indeterminate progress'` in that mode), and `aria-labelledby` from Label. Value stays `aria-hidden`. Ultima adds no live role. Item 2 and item 4 assert those attributes, not an announcement. Proof bar item 7 is not this component.
- **Spinner and Skeleton are decorative by default.** Each Root is `aria-hidden="true"`. The container being replaced or waited on takes `aria-busy="true"`. Start and end of a wait that needs speech uses the documented live-region pattern (pre-mounted `role="status"`, mutate once), not the glyph. Do not put `role="status"` or `role="alert"` on Spinner or Skeleton; a looping live region announces forever. Optional visible text sits next to Spinner as the caller's, not a looping name. Skeleton is not a `progressbar`.
- **Empty is not a live region.** `Root` is a `<div>` with no `role="alert"` and no `role="status"`, the same agreement Alert closed. Title is an `<h3>` by default through `useRender`. Visible text is the name; Icon is decorative. A retry Button in children is the control. Do not announce Empty as a live region when it was in the page at first paint.
- **Table** parts are `Table.Root` `<table>`, `Table.Head` `<thead>`, `Table.Body` `<tbody>`, `Table.Row` `<tr>`, `Table.HeadCell` `<th scope="col">` (scope overridable), `Table.Cell` `<td>`, `Table.Caption` `<caption>`, and the optional `Table.Scroll`. A consumer who needs horizontal scroll wraps `Table.Root` in `Table.Scroll` rather than writing the region themselves, decided on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57). A scroll region is tabbable and therefore needs a focus ring, which is Ultima's to own, and the docs' own tables are the first three callers. `Table.Scroll` is the one part in v0 that takes the ring while being neither a control nor a popup; `ScrollArea.Viewport` has the same shape and copies this row when it lands in v0.2.
- **Code** blocks wrap long lines rather than scroll, so the block needs no `tabIndex`.
- **Plain components are static.** No `tabIndex`, no key handlers. Sidebar is the exception that proves it: its interactive parts are native `<a>` and `<button>` elements whose behavior is the browser's, and its `Trigger` sets `onClick`, `aria-expanded`, and `aria-controls` and nothing else. Site navigation is a list with disclosure buttons, never `role="tree"` or `role="menu"`, on the APG's own caution.
- **Reduced motion.** Transitions are handled entirely by the motion tokens dropping to 1ms. Every transition reads a duration token, so Base UI's transition-aware unmount still fires. Looping animations cannot use that collapse: `--ult-motion-loop` becomes `0s` under `prefers-reduced-motion: reduce`, and the component sets `animation-name: none` (plus the static fallback) under that query, under Motion above. That is the one reduced-motion exception to "components never write a `prefers-reduced-motion` query." The pattern still does not generalise to a breakpoint, because a breakpoint is the condition rather than a value inside one; Sidebar is the component that writes a breakpoint query, under its per-component notes.
- **Forced colors.** No `@media (forced-colors)` rules in v0. Native elements, `outline` rings, and state on real elements degrade on their own. The exception is `Switch.Thumb`, a `<span>` that would lose its fill, so it carries a hairline `border` so it stays visible.

Each component's docs page carries an Accessibility section restating its row. Automated checking is in the Testing section below: each row becomes assertions in that component's test file, and axe runs over every docs demo in both color modes.

### Live regions

Decided on [Toast's contract, and whether Ultima owns a live-region pattern](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern), with the mechanics measured on [Live regions: what Base UI gives, and what a status announcement actually requires](https://linear.app/frankie-ramirez/issue/ULT-77) and recorded in `docs/research/2026-09-11-live-regions.md`. Ultima owns a documented pattern, not a catalogue component and not a shared announcer. Base UI ships none. A LiveRegion item would paint nothing, which is why Form has no item, and `Combobox.Status` is off-label as a general region.

**The region's element is in the tree before the text changes.** Core-AAM §3.8.2 only maps changes *inside* a live region; inserting the region itself is silent. Never hide it with `display: none`, `hidden`, `aria-hidden`, or conditional rendering of the region. Mount it empty. A visually hidden region is clip-hidden (`clipPath: inset(50%)` and a 1px box), not `display: none`.

**Ultima-written UI uses `role="status"` with explicit `aria-atomic="true"`.** `role="alert"` is for a form error or equally imperative message, and Field.Error is already not that path. Identical consecutive text is not a change: append Word Joiner U+2060, matching Base UI and the docs copy button.

**Toast inherits Base UI's regions.** Viewport is the polite stack region. High-priority toasts announce through the primitive's `role="alert"` clone. Catalogue Alert stays a `<div>`. Field.Error stays not a live region. Combobox.Empty and Combobox.Status stay mounted `role="status"`. Slider.Value stays `aria-live="off"`. Progress inherits `progressbar` and is not a live region. Spinner and Skeleton are `aria-hidden`; they are not live regions. Empty is a static `<div>`, like Alert. Start and end of a wait that needs speech uses this pattern, not the Spinner.

**Copy-button stays docs-local** and keeps its own region; it does not import Toast. Data Table's row-count announcement, when that recipe ships, follows this pattern rather than installing an announcer.

**Enforcement.** Announcements are not assertable. axe-core has no live-region rules, and its `region` rule skips `alert`, `log`, and `status` subtrees. The docs surface check cannot see a missing region. Copy-button's mutation test is the v0.1 check for the one non-Toast caller. Toast's test file asserts Viewport attributes, that Portal and Viewport are present with an empty stack, the high-priority clone's `role="alert"` / `aria-atomic`, and the stacking CSS under proof bar item 8. Settled on [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs): no docs-source lint for missing live regions, no new CI job, and no ninth proof-bar item. Live-region structure is items 2 and 4 in that component's file. The canonical Toast demo mounts Provider, Portal, and Viewport so the empty Viewport is in the axe sweep; open and high-priority toast axe stays in `toast.test.tsx`.

### Overlays

Dialog, Dropdown Menu, Select, and Tooltip share one popup recipe. Sidebar's mobile menu is the fifth overlay and composes Dialog rather than adding a primitive, decided on [Mobile navigation: reuse Dialog, or promote Drawer into v0](https://linear.app/frankie-ramirez/issue/ULT-55): it keeps Dialog's surface, backdrop, `z.popup`, and opacity fade, and replaces the `scale(0.98)` transform with a slide from the inline start over `--ult-motion-base`. Combobox is the sixth, settled on [ULT-81](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts): it joins the recipe on `Popup` rather than varying it, with no aligned-item default and so none of Select's `<style>` injection. Alert Dialog is the seventh, settled on [ULT-82](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one): it joins the recipe rather than varying it, restating Dialog's surface, visible backdrop, `z.popup`, and enter/exit in `alert-dialog.tsx` rather than importing Dialog. Dismissal is behaviour, not a recipe variation: Escape closes, a backdrop click does not. Sidebar's mobile menu remains the only stated variation on the recipe in v0, and it lives in `sidebar.tsx` as `style` overrides, so Dialog itself is unchanged. Toast, settled on [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern), is outside this recipe: it is not the eighth overlay. It restates the overlay surface tokens on Root without the overlay enter/exit, and Viewport reads `z.toast` rather than `z.popup`. Any further overlay the docs needs follows the same shape: reuse the tokens and the transition, and document the placement and motion in its contract.

- **Surface.** `--ult-color-surface-raised`, a hairline `--ult-color-border`, `--ult-radius-lg`, and `--ult-shadow-md`. An overlay always sets a border and a shadow together, never a shadow alone. `z.popup`.
- **Transition.** `transform-origin: var(--transform-origin)`, which Base UI's positioner seeds before Floating UI measures; `Dialog.Popup` has no positioner and never seeds it, so the declaration is inert there and harmless. Transition `opacity` and `transform` over `--ult-motion-fast` with the `enter` easing; `[data-starting-style]` and `[data-ending-style]` both sit at `opacity: 0` and `transform: scale(0.98)`, with the `exit` easing on the closing side. Tooltip is the one narrower case: `--ult-radius-sm`, `--ult-shadow-sm`, and text step 2.
- **Backdrop.** Dialog and Alert Dialog have a visible one: `--ult-color-surface-overlay`, fading opacity alone over `--ult-motion-base`. Menu's, Select's, and Combobox's backdrops are invisible click-catchers and stay unstyled.
- **Reduced motion** needs no extra rule for enter and exit. Every transition duration is a token that already collapses to `1ms`, and Base UI's transition-aware unmount still fires at that duration. Looping animation is not this recipe; it is `--ult-motion-loop` and the `animation-name: none` exception, under Motion.
- **`keepMounted` is never set by Ultima.** Base UI's default (unmount when closed) stands, because how much closed DOM a page carries is the consumer's decision and the transition does not need the popup mounted. A consumer who wants it passes it through.

### Forms

Decided on [What Ultima documents as its form integration](https://linear.app/frankie-ramirez/issue/ULT-78) and measured on [Form integration measured: Base UI Form against React Hook Form and TanStack Form](https://linear.app/frankie-ramirez/issue/ULT-75), with the evidence in `docs/research/2026-09-11-form-integration.md`. It sits here rather than under Field's per-component notes because it reaches every form component on v0.1, which is why it was settled before Field's own contract rather than after.

**The documented integration is Base UI's `Form` and `Field` over native constraint validation, and it costs a consumer nothing.** `Form` is a primitive ADR 0002 already adopted, so naming it adds no install step, no registry dependency, and no caveat to Registry and install. Ultima ships no `form` item of its own: `Form` renders a `<form>` and paints nothing, which under Styled parts leaves it a component with no styled part, so an item wrapping it would cost a file and a name and return neither. The examples import it from `@base-ui/react/form` beside the Field a consumer installed, which costs that consumer nothing, because `field.tsx` has already put the package in their tree. It is also the only candidate in the measurement that supplies any ARIA at all: `Field` sets `aria-labelledby` from the label, accumulates one `aria-describedby` from the description and the error message, and sets `aria-invalid` when the field is invalid and not disabled. The three libraries measured beside it emit no `aria-*` attribute of any kind, verified against their published builds rather than inferred. And `Form` already ships the mechanism [How comparable systems wire a field's label, description, and error message](https://linear.app/frankie-ramirez/issue/ULT-76) found unanimous across six systems: its submit handler validates every registered field, focuses the first invalid control, and calls `preventDefault` before the consumer's `onSubmit` runs. That focus move is why `Field.Error` needs no live region, which matters because it renders a bare `<div>` with no role and would announce nothing on its own.

**A form library is an engine, so ADR 0007 already decides its shape and this is not a new category.** All three measured candidates pass that ADR's headless gate: none emits a `className` or a `style`, and the DOM any of them can render is a single optional `<form>` element. None supplies a role, ARIA state, keyboard handling, or focus management, which is the whole of what separates an engine from a primitive, so ADR 0002's scope never came into question here either. What the ADR needed was its scope stated more generally, recorded as an amendment on it: 0007 was written for a composition that *needs* an engine, and no v0.1 entry needs one.

**The engine Ultima writes a recipe for is React Hook Form.** Four things decide it over the runner-up. It has zero runtime dependencies and publishes CJS, ESM, and UMD, so Registry and install keeps exactly one ESM-only caveat rather than gaining a second. Both Base UI's handbook and shadcn/ui document it with working demos, so the recipe follows a primary source rather than inventing a shape. It carries `shouldFocusError` in its own options, so an engine-driven submit keeps the focus move the baseline depends on instead of re-owning it. And its per-field `fieldState` maps onto `Field.Root`'s `invalid`, `dirty`, and `touched` with nothing left over. Schemas are a second install, `@hookform/resolvers` plus the validator, and the recipe says so at its install step. TanStack Form is the runner-up and the cleaner engine by the gate, rendering no DOM whatsoever; it is declined on six transitive packages and on `@tanstack/form-core` importing `@tanstack/devtools-event-client` at module scope, which puts a devtools client in every production graph, and the measurement records no focus-the-first-invalid option of its own. It is the one to revisit if built-in Standard Schema support without an adapter package ever becomes the deciding cost. Formisch is declined on cost rather than on the gate: it is ESM-only with a required `valibot` peer, which would make two ESM-only caveats where there is one and put a schema library in the consumer's mandatory install rather than in their choice.

**Each rule is declared in exactly one place.** With an engine in play there are two live validation passes, and they co-operate rather than fight: an external `invalid` ANDs with Base UI's own verdict rather than replacing it, and `Form` still validates every registered field before the consumer's handler runs. What that does not survive is the same rule written twice, which produces two messages for one mistake. So a constraint the platform has an attribute for — `required`, `minLength`, `maxLength`, `pattern`, `step` — is declared on the control and belongs to Base UI, and everything the platform has no attribute for belongs to the engine: cross-field rules, schema validation, and async rules. Async is the clean case for that split. Base UI documents that an async `validate` cannot stop a submit under `validationMode="onSubmit"`, and the engine's own submit handler, which runs after Base UI's synchronous gate has passed, can.

**No Ultima file imports a form library, and Field's contract is what keeps it that way.** `item()` in `scripts/build-registry.ts` derives a `registry:ui` item's `dependencies` from its staged source's import specifiers alone, with no way to declare one away and no way to mark one optional, so a single import in `field.tsx` would reach Textarea, Checkbox, Radio Group, Combobox, and Slider through the one component each of them sits inside. Field instead exposes `invalid`, `dirty`, and `touched` as pass-through Base UI props from the day it ships, which is the whole of what an engine needs from it, so the recipe costs Field nothing later and every v0.1 item's `dependencies` stay what that component's own imports put there.

**The worked examples live on Field's page.** Field is what every other form component composes, so a submission example on each of their pages would be the same example written out again. That page carries two: the platform example, which demonstrates submission, validation, and the required, disabled, and invalid states with no dependency at all, and the recipe, which is the whole contract because it has no installable unit, so it names its component dependencies, states its install step, and carries the same checks a component would. Every other form component's page demonstrates its own disabled, required, and invalid states inside a `Field` and no submission of its own. The cost lands on the docs site rather than on a registry item: a live demo of the recipe means `apps/docs` installs the engine as a devDependency, the first time a demo has needed one. Settled on [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs): those applicable checks are the live demo in the axe sweep and the documented states on the page. `field.test.tsx` and `fieldset.test.tsx` assert association (`aria-describedby` merge), `aria-invalid` / `data-invalid`, and that Error has no live role. They do not import `@base-ui/react/form` to re-prove the primitive focusing the first invalid control, and they do not import `react-hook-form`. Item 7 is not Field: Ultima wires no submit. A static invalid Field demo is how the sweep sees `aria-invalid` and the error text.

**The shadcn precedent is worth half copying, and the half to refuse is the one v0.1 is graded on.** Their `field` item carries `dependencies: ["cn"]` and no form library, with four separate framework guides written over it, which is the same split as this decision and the opposite of the Data Table precedent where they ship no item at all. What not to copy is the guides. Across all four, `aria-describedby` appears zero times, the word `required` appears zero times, `aria-invalid` is hand-written by the consumer at every call site, and none of them has an accessibility section despite three of the four promising accessibility in their opening line. Those are precisely the states this milestone's line names. Ultima starts ahead of that because the description and error wiring come from `Field` rather than from the consumer, and the examples are graded on it because a recipe's example is covered by the applicable checks.

**Next.js changes nothing about the contract.** One documented path has to work in both supported targets, and the platform path does, because it is a `<form>` and a submit handler in either. A server action is a variation on the same components rather than a second integration: `Form` takes field-keyed server errors through its `errors` prop and clears each one on change, which is the prop a `useActionState` result feeds. It is documented as a variation on the Field page and carries no checks of its own. The engine recipe is client-side and identical in both targets.

### Iconography

Decided on [Iconography in v0](https://linear.app/frankie-ramirez/issue/ULT-21). Base UI ships no icon set, and its glyph slots come in two shapes, corrected here on the assembly ticket because this section said all four v0 slots were empty containers and two of them are not. `Menu.CheckboxItemIndicator` and `Menu.RadioItemIndicator` are genuinely empty, and so are v0.1's `Checkbox.Indicator`, `Radio.Indicator`, and `Combobox.ChipRemove`; `Menu.SubmenuTrigger` has no trailing affordance of its own. `Select.Icon`, `Select.ItemIndicator`, `Combobox.Icon`, `Combobox.ItemIndicator`, and `Combobox.Clear` each render a default text glyph, `▼`, `✔️`, or `x`, measured in `@base-ui/react` 1.8.0. That is a fallback rather than an icon set, and it changes nothing Ultima does: every one of those slots takes `children`, so the override below replaces an empty container and a default glyph the same way. The foundation components fill those five slots. New components document any additional built-in glyphs in their contracts and follow the same private SVG convention.

**No registry item declares an icon dependency.** Not `lucide-react`, not any other set. Ultima ships the glyphs in the table below, and a declared dependency would put a package in every consumer's tree for a handful of paths, pick their icon library on their behalf, and leave anyone already standardized on another set carrying two. Adding one later is additive, so this is cheap to reverse if a consumer ever asks.

**Glyphs are inline SVG, private to the component file that uses them.** Not exported, and not a shared `lib/icons` item. One file per component is the load-bearing rule and the registry rewards a self-contained item, so each file carries its own. The check glyph is written out four times rather than pulling a lib item into every component install; the dot is written out twice; the chevron-down twice; the x twice in one file.

| Glyph | Slot | File |
| --- | --- | --- |
| chevron-down | `Select.Icon` | `select.tsx` |
| check | `Select.ItemIndicator` | `select.tsx` |
| check | `Menu.CheckboxItemIndicator` | `dropdown-menu.tsx` |
| check | `Checkbox.Indicator` | `checkbox.tsx` |
| dash | `Checkbox.Indicator`, when indeterminate | `checkbox.tsx` |
| dot | `Menu.RadioItemIndicator` | `dropdown-menu.tsx` |
| dot | `RadioGroup.Indicator` | `radio-group.tsx` |
| chevron-right | `Menu.SubmenuTrigger`, trailing | `dropdown-menu.tsx` |
| chevron-down | `Combobox.Icon` | `combobox.tsx` |
| check | `Combobox.ItemIndicator` | `combobox.tsx` |
| x | `Combobox.Clear` | `combobox.tsx` |
| x | `Combobox.ChipRemove` | `combobox.tsx` |

`select.tsx` and `dropdown-menu.tsx` are the only two files in v0 with built-in glyphs. `checkbox.tsx` and `radio-group.tsx` join them in v0.1, settled on [ULT-80](https://linear.app/frankie-ramirez/issue/ULT-80/checkbox-radio-group-and-textarea-parts-glyphs-and-the-indeterminate): `Checkbox.Indicator` and `Radio.Indicator` are genuinely empty containers, so Iconography applies, and the dash is a second glyph in the checkbox slot rather than a restyled check. `combobox.tsx` joins on [ULT-81](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts): `Icon` and `ItemIndicator` have the same default-text-glyph shape as Select's, replaced the same way, and `Clear` / `ChipRemove` take a private x (`ChipRemove` is the genuinely empty slot). `children` replace the slot, same override as Select. Alert does not: settled on [ULT-82](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one), `Alert.Icon` is a layout slot the caller fills, not a Base UI glyph slot Ultima owns, so the table does not grow. Toast does not either: settled on [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern), Action and Close are wrapper triggers, so there is nothing to put an X inside, the same reasoning as Dialog's close. Spinner does not: settled on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a), the loading mark is CSS in `spinner.tsx`, not a glyph slot and not a lucide asset. `Empty.Icon` is Alert's layout slot again: the caller's, omitted when unused, so the table does not grow. Progress has no glyph slots. The three components the docs application added ship none. Sidebar settled that on [Sidebar's public parts](https://linear.app/frankie-ramirez/issue/ULT-53): its `Trigger` and `Close` pass through unstyled, so there is nothing to put a hamburger or an X inside, by the same reasoning as Dialog's close below, and a nested group's caret is the consumer's glyph rendered into `Sidebar.Button`, rotating on Collapsible's `data-panel-open`. Collapsible and Toggle Group settled it on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57), for the same reason in Collapsible's case and because a toggle's content is entirely the caller's in Toggle Group's. A component added after v0 settles its glyph slots with its contract and follows the same private SVG convention.

**Geometry.** A 24×24 `viewBox`, `fill="none"`, `stroke="currentColor"`, `stroke-width: 1.5`, round caps and joins. The weight matches Phosphor's regular, which the docs demos use: Phosphor draws on a 256 grid with the stroke pre-expanded into filled geometry at 16 units, about 1.5px optical at 24px. Ultima keeps a 24×24 `viewBox` anyway, because hand-drawing these glyphs on a 256 grid buys nothing a reader can see. The seam is placed deliberately: a consumer's icon set is unknowable and a consumer who dislikes the chevron edits four lines in a file they own, while a mismatch on the docs pages is visible on every component page and fixable by nobody but us. `currentColor` means a glyph inherits its part's color and never names a token, which keeps the rule in Tokens in component code intact. The dot is a filled `<circle>`, the one exception to `fill="none"`. The dash is a stroke, not a filled rectangle. The x is two strokes.

**Size is `1em`, with `flex-shrink: 0`.** A glyph tracks the text step of the part holding it, so the 14px menu item and the 16px Select trigger get proportional chevrons with no coordination between them. No icon step joins the space scale, there is no `--ult-size-icon`, and no glyph gets a `size` axis. Phosphor's `IconContext` defaults to `size: "1em"` and `color: "currentColor"`, so the demo icons and Ultima's own glyphs size and color by the same mechanism with nothing to reconcile.

**Overriding.** A slot whose whole content is a glyph renders the default and takes `children` as a replacement:

```tsx
<BaseSelect.Icon {...props} {...stylex.props(styles.icon, style)}>{children ?? <ChevronDown />}</BaseSelect.Icon>
```

`Menu.SubmenuTrigger` is the exception. Its children are the item's label, so its chevron is appended after them and is not overridable in v0.

**The indicator slot.** Select reserves a leading space step 6 (16px) slot with a space step 4 (8px) gap on every item. Dropdown Menu checkbox and radio items reserve that slot at the trailing edge instead. All menu labels share the same left padding; submenu chevrons also sit at the trailing edge.

**Dialog's close affordance ships no glyph.** `Dialog.Close` passes through unstyled and is handed the consumer's own element, so there is nothing for Ultima to put an X inside. The Dialog docs page's canonical example is `render={<Button variant="ghost">Close</Button>}` with a text label, and a second example shows a glyph the reader supplies alongside `aria-label`. An X in Ultima's set would exist only to be rendered into a slot Ultima does not style. `AlertDialog.Close` is the same wrapper trigger, and the canonical Alert Dialog demo uses labelled Buttons for Cancel and Confirm rather than an X. `Toast.Close` and `Toast.Action` are the same shape: `render={<Button variant="ghost" size="sm" />}`.

**Icons in the docs.** `apps/docs` takes `@phosphor-icons/react` as a devDependency, for demos that need a glyph Ultima does not ship: a leading icon on a Button, icons on menu items, Dialog's close. Weight is set once to `regular` through `IconContext` rather than per icon. The printed source shows the import rather than hiding it, and each component page carries one line saying Ultima ships no icon dependency and any set works. None of this reaches the registry: the package is MIT, has no runtime dependencies, and is tree-shakeable with `sideEffects: false`, so only the icons a demo names reach the built site.

**Icon-only Button** stays the documented rule the [accessibility contract](https://linear.app/frankie-ramirez/issue/ULT-18) fixed. No `IconButton`, no `iconOnly` prop. The Button docs page prints the recipe: `aria-label`, the consumer's glyph as the only child, and a `style` override setting `paddingInline` to the block padding so the control is square at its size.

### Per-component notes

What a builder would otherwise guess, beyond the axes, the styled parts, and the accessibility contract.

- **Button.** The `accent` column of `variants[variant][tone]` is the behavior already decided: `solid` is the role fill with `-hover` and `-active` and `<role>-contrast` text; `outline` is a transparent fill with `--ult-color-border` and `--ult-color-text`; `ghost` is transparent with `--ult-color-text-muted`. The `danger` column recolors all three to the ruin role: `outline` takes `--ult-color-danger-border` and `--ult-color-danger-text`, `ghost` takes `--ult-color-danger-text` with a `--ult-color-danger-subtle` hover. Icon-only stays a documented rule, not a prop.
- **Badge.** One size: text step 3, `--ult-font-tracking-wide`, weight medium, `--ult-radius-full`, padding from space steps 2 and 4. The radius is a pill at any size, since a browser clamps `border-radius` to half the box's shorter side; what sets a badge's weight on the page is the padding, and steps 1 and 3 read as an annotation rather than a label. `subtle` is `<role>-subtle` fill, `<role>-text`, `<role>-border` hairline — mana's `.chip` exactly. `solid` is `<role>` fill, `<role>-contrast` text, transparent border. The `neutral` tone has no color role to resolve to, so it names neutral tokens directly: `subtle` takes `--ult-color-surface-sunken`, `--ult-color-text-muted`, `--ult-color-border`; `solid` takes `--ult-color-surface-hover` and `--ult-color-text`, a pairing the contrast gate already covers. Badge is static and carries no interaction states.
- **Tabs.** `underline` gives `List` a bottom hairline and `Indicator` a 2px `--ult-color-accent` bar; the active `Tab` is `--ult-color-text`, the rest `--ult-color-text-muted`. `segmented` gives `List` a `--ult-color-surface-sunken` ground, `--ult-radius-md`, space step 1 of padding and gap, and `Indicator` becomes a `--ult-color-surface-raised` pill at `--ult-radius-sm` sitting behind the active tab. Both read `data-orientation`; both transition `Indicator` over `--ult-motion-fast`. `Panel` sets spacing only.
- **Meter.** `Track` is `--ult-color-surface-sunken` at `--ult-radius-full`, height space step 2. `Indicator` is the toned fill: `<role>` for the four hue tones, `--ult-color-border-strong` for `neutral`. `Value` is the toned number: `<role>-text`, or `--ult-color-text` for `neutral`. `tone` is set once on `Root` and reaches both through context, under Cross-part state; either part accepts its own `tone` to override, so a neutral number under a colored bar is still one extra prop. `meter.tsx` as first built took `tone` on each part and moved to this shape in the v0 build. `Indicator`'s width is the one place a dynamic style is allowed. `Label` is text step 2 uppercase with `--ult-font-tracking-wide` and `--ult-color-text-subtle`.
- **Dialog.** `Viewport` is styled and does the centering: `position: fixed`, `inset: 0`, `display: grid`, `place-items: center`, padding from space step 6, `z.popup`. `Popup` therefore sets no position and no transform of its own, which is why the shared `scale(0.98)` transition works on it at all — centering the popup with `translate(-50%, -50%)` would have fought it. `Popup` takes the overlay surface plus a `max-width` and `max-height: 100%` with `overflow: auto`. `Title` is text step 6, semibold, `--ult-font-leading-tight`; `Description` is text step 4 in `--ult-color-text-muted`. `modal` stays Base UI's default, and a Title is always rendered.
- **Dropdown Menu.** One shared item style is applied to `Item`, `LinkItem`, `CheckboxItem`, `RadioItem`, and `SubmenuTrigger`: `--ult-radius-md`, padding from space steps 2 and 4, text step 4, `data-highlighted` to `--ult-color-surface-hover`, `data-disabled` to reduced opacity, and no focus ring. `SubmenuTrigger` also highlights on `data-popup-open`. Submenus are in v0: the parts are on the namespace by the compound rule either way, so leaving `SubmenuTrigger` unstyled would ship a public part that renders broken. Checkbox and radio indicators occupy a fixed-width trailing slot. All labels align at the left. Popups use `--ult-radius-md`, space step 2 padding, and a minimum width of twice space step 12, including submenus. `Separator` is a `--ult-color-border` hairline with space step 2 of margin; `GroupLabel` uses text step 2 in `--ult-color-text-subtle`, preserving the caller’s casing and normal tracking.
- **Select.** `Trigger` is the control: the `size` axis heights, `--ult-color-surface-sunken`, `--ult-color-border-strong`, `--ult-radius-md`, the focus ring, and `':is([aria-invalid="true"], [data-invalid])'` to `--ult-color-danger-border`, matching Input. `Value` reads `data-placeholder` for `--ult-color-text-subtle`. `Icon` is `--ult-color-text-subtle` and does not rotate — one less transition to keep in step with the popup's. Items share Menu's item style plus a `data-selected` weight change, and `ItemIndicator` is the same fixed leading slot. The scroll arrows are styled against the rule because they paint: a `--ult-color-surface-raised` band that hides the list edge, shown on `data-visible`. `alignItemWithTrigger` keeps Base UI's default; the popup style assumes no side, so `data-side="none"` needs no special case. The aligned popup injects an inline `<style>` to hide scrollbars, so the Select docs page keeps a one-line pointer to the CSP note, which now lives in Registry and install under What the consumer still does by hand.
- **Tooltip.** The narrow overlay: `--ult-radius-sm`, `--ult-shadow-sm`, text step 2, padding from space steps 2 and 3, and a `max-width` so long text wraps. `Arrow` is `--ult-color-surface-raised` with the same hairline. `Tooltip.Trigger` still requires `aria-label` in its types; that is unchanged by its passing through unstyled.
- **Switch.** One size, from the space scale: track space step 10 wide by step 8 tall at `--ult-radius-full`, thumb space step 7 at `--ult-radius-full` with space step 1 of inset. Track is `--ult-color-border-strong` unchecked and `--ult-color-accent` on `data-checked`; the thumb is `--ult-color-surface` plus the hairline border the forced-colors rule requires. The thumb transitions `translate` over `--ult-motion-fast`. The focus ring is on Root.
- **Input.** No notes beyond the `size` axis and the accessibility contract: `--ult-color-surface-sunken`, `--ult-color-border-strong`, `--ult-radius-md`, the focus ring, `':is([aria-invalid="true"], [data-invalid])'` to `--ult-color-danger-border`, and `--ult-color-text-subtle` for `::placeholder`.
- **Textarea.** Settled on [ULT-80](https://linear.app/frankie-ramirez/issue/ULT-80/checkbox-radio-group-and-textarea-parts-glyphs-and-the-indeterminate). One file, `textarea.tsx`, Base UI `Input` with `render={<textarea />}` so Field registration is intact and Enter does not submit. Same paint as Input — `--ult-color-surface-sunken`, `--ult-color-border-strong`, `--ult-radius-md`, the focus ring, the validation selector, `--ult-color-text-subtle` for `::placeholder` — except `size` sets `min-height` at space steps 9, 10, and 11 rather than `height`, `resize: vertical`, and a wrapping `line-height` rather than `--ult-font-leading-none`. Default `md`. Auto-resize is out of v0.1. `rows` and `cols` pass through. No Ultima `input` dependency: wrapping Input would inherit its `height` and put `input` in every textarea install.
- **Checkbox.** Settled on [ULT-80](https://linear.app/frankie-ramirez/issue/ULT-80/checkbox-radio-group-and-textarea-parts-glyphs-and-the-indeterminate). Three parts, no axes, two glyphs. `Root` is a space-step-6 square at `--ult-radius-sm`, `--ult-color-border-strong` unchecked, `--ult-color-accent` fill and `--ult-color-accent-contrast` color on `':is([data-checked], [data-indeterminate])'`, the focus ring, reduced opacity on `':is([data-disabled])'`, and the validation selector. `Indicator` is the glyph slot: the private check on `data-checked`, the private dash on `data-indeterminate`, `children` replacing the slot, and `':is([data-unchecked])': { display: 'none' }` so the exit-transition window does not flash. `Group` is a flex column with space step 3 of gap, wrapping Base UI's bare `CheckboxGroup`. `indeterminate` and `parent` pass through; Ultima does not set the native property. Registry item `checkbox`, one file, two Base UI subpaths, no Ultima component dependency.
- **Radio Group.** Settled on [ULT-80](https://linear.app/frankie-ramirez/issue/ULT-80/checkbox-radio-group-and-textarea-parts-glyphs-and-the-indeterminate). Three parts, no axes, the filled-circle glyph. `Root` is a flex column with space step 3 of gap. `Item` is a space-step-6 circle at `--ult-radius-full`, the same rest, checked, disabled, invalid, and ring treatment as `Checkbox.Root` minus `data-indeterminate`. `Indicator` is the private dot, the same `data-unchecked` rule, `children` replacing the slot. Registry item `radio-group`, one file, two Base UI subpaths, no Ultima component dependency.
- **Combobox.** Settled on [ULT-81](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts). Sibling of Select, not a variant, not Autocomplete. Twenty-six parts, `size` on `InputGroup`, default `md`. `useFilter`, `useFilteredItems`, and `createItems` sit on the namespace as values. `InputGroup` is the visual box: the three control heights, `--ult-color-surface-sunken`, `--ult-color-border-strong`, `--ult-radius-md`, `':is([aria-invalid="true"], [data-invalid])'` to `--ult-color-danger-border`, and the ring via `:focus-within`. `Input` is borderless inside it, with `--ult-color-text-subtle` for `::placeholder` and `data-placeholder`. `Trigger` is the styled chevron button, not a wrapper trigger. `Icon` does not rotate. Items share Menu's item style plus a `data-selected` weight change, restated in this file rather than imported, and `ItemIndicator` is Select's leading slot. `Popup` takes the overlay surface, `z.popup`, the shared enter/exit, `width: var(--anchor-width)`, and `max-width: var(--available-width)`. `List` is the scroll container: `overflow-y: auto`, `overscroll-behavior: contain`, `max-height: min(<n>, var(--available-height))`, matching block padding and scroll-padding. `Empty` and `Status` stay mounted; they are `role="status"` and the empty state is this part, not the v0.1 Empty component. `Clear` shows on `data-visible`. Glyphs: chevron-down, check, x, `children` replace the slot. No filter library. Canonical demo is Input-as-control; a second shows the Label trap (`Combobox.Label` names Trigger, `nativeLabel={false}`); a third is multiple/chips. Grid is not a v0.1 documented example. `Combobox.InputGroup` is this component's part, not the v0.2 Input Group catalogue entry. `data-popup-open`, `data-highlighted`, `data-selected`, `data-disabled`, `data-placeholder`, and `data-visible` (on Clear) drive style. Registry item `combobox`, one file, no Ultima component dependency.
- **Slider.** Settled on [ULT-81](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts). Seven parts, no axes, no `tone`. `Root` passes through. `Label` is text step 3, weight medium, `--ult-color-text`. `Value` is text step 3, an `<output htmlFor>` with Base UI's `aria-live="off"` so dragging does not spam; `aria-valuetext` stays the locale-formatted default, overridable per thumb. `Control` carries `touch-action: none` and `user-select: none`; its padding and border are inputs to the pointer math. `Track` is `--ult-color-surface-sunken` at `--ult-radius-full` with space-step-2 cross-axis size, the same geometry as Meter's track without taking Meter's `tone`. `Indicator` is `--ult-color-accent`; position and length come inline. `Thumb` is a raised knob with the hairline the forced-colors rule already uses on Switch, and the ring is `:has(:focus-visible)`. Range is a second example: one `Thumb` per value, `index` per thumb for SSR, a distinct `aria-label` per thumb when there is no visible `Label`. `orientation`, `min`, `max`, `step`, `largeStep`, and `thumbAlignment` pass through. Canonical `thumbAlignment` is `"center"`, which injects no script; `"edge"` is the CSP note. `data-dragging`, `data-orientation`, and `data-disabled` drive style. No Ultima `input` dependency. Registry item `slider`, one file.
- **Alert.** Settled on [ULT-82](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one). Four parts, `tone` only, default `neutral`. `Root` is a `<div>` through `useRender`, a flex row with space step 4 of gap, padding from space step 5, `--ult-radius-md`, and Badge's `subtle` column: `<role>-subtle` fill, `<role>-text`, `<role>-border` hairline; `neutral` names `--ult-color-surface-sunken`, `--ult-color-text-muted`, `--ult-color-border`. Title, Description, and Icon inherit the text color; Alert writes no context. `Title` is text step 5, semibold, `--ult-font-leading-tight`, an `<h3>` through `useRender`. `Description` is text step 4. `Icon` is omitted when unused: `1em`, `flex-shrink: 0`, `aria-hidden`. No built-in glyph. No live role. The docs' `Note` is not this component. Registry item `alert`, one file, no Ultima component dependency.
- **Alert Dialog.** Settled on [ULT-82](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one). Separate item from Dialog, not a recipe. Every Base UI part; styled split identical to Dialog. Restate Viewport, Backdrop, Popup, Title, and Description with Dialog's overlay tokens and paint: Viewport centers, Popup takes the overlay surface plus max-width and max-height, Title is text step 6 semibold tight leading, Description is text step 4 in `--ult-color-text-muted`. Do not import `dialog`. Trigger and Close are wrapper triggers. Title always rendered; Description always rendered. `modal` and `disablePointerDismissal` are not props. Escape closes; backdrop click does not. Canonical demo is Title, Description, Cancel then Confirm as Buttons, Cancel first in DOM so initial focus is not the destructive action. `Handle` / `createHandle` passes through as a value. Registry item `alert-dialog`, one file, no Ultima component dependency.
- **Toast.** Settled on [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern). Outside the overlay recipe. Every Base UI part; `useToastManager` and `createToastManager` sit on the namespace. `Provider` is a pass-through part: the consumer mounts `Provider` + `Portal` + `Viewport` once in their tree, and Portal and Viewport stay mounted when the stack is empty. Ultima does not ship an app shell, does not wrap `<html>`, and does not invent `useToast()`. One Provider is the v0.1 documented setup; a second Provider for anchored toasts is Base UI's and is not documented as required. Viewport is `position: fixed`, `inset-block-end` and `inset-inline-end` from space step 6, `z.toast`, and the `--toast-frontmost-height` clamp. Root restates the overlay surface tokens — `--ult-color-surface-raised`, hairline `--ult-color-border`, `--ult-radius-lg`, `--ult-shadow-md`, border and shadow together — plus Badge's `subtle` column on `[data-type]`: `<role>-subtle` fill, `<role>-text`, `<role>-border` hairline; `neutral` names `--ult-color-surface-sunken`, `--ult-color-text-muted`, `--ult-color-border`. `error` paints as `danger`; `loading` paints as `neutral`. Do not import Badge or Alert. Stacking CSS is the full Base UI demo recipe: intra-stack `z-index`, `--toast-offset-y` translate, swipe translates, `data-swipe-direction` dismiss, height clamp. Durations read `--ult-motion-fast`, not a millisecond literal. The `1000` in `calc(1000 - var(--toast-index))`, the scale step, and the swipe-dismiss percentages are module constants in `toast.tsx`. Enter/exit is opacity plus those transforms, not overlay `scale(0.98)`. Content fades on `[data-behind]` and returns on `[data-expanded]`. Title is text step 4, semibold, `--ult-font-leading-tight`. Description is text step 3 in `--ult-color-text-muted`. Action and Close are wrapper triggers, canonical `render={<Button variant="ghost" size="sm" />}`. Positioner is `outline: 0`. Arrow is `--ult-color-surface-raised` with the same hairline, for the anchored mode that is on the namespace and not a v0.1 documented example. `limit`, `timeout`, `swipeDirection`, and `priority` pass through and are not axes. Colour never carries meaning alone. `data-type`, `data-expanded`, `data-limited`, `data-swiping`, `data-swipe-direction`, `data-behind`, `data-starting-style`, and `data-ending-style` drive style. Swipe is proof bar item 4; stacking CSS is item 8; item 7 is not this component. Registry item `toast`, one file, no Ultima component dependency.
- **Progress.** Settled on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a). Five parts, Meter's `tone` on `Root`, default `neutral`, reaching Indicator and Value through file-private context, each overridable. Do not import Meter. Restate Track geometry: `--ult-color-surface-sunken` at `--ult-radius-full`, height space step 2, `overflow: hidden`. Label is text step 2 uppercase with `--ult-font-tracking-wide` and `--ult-color-text-subtle`. Indicator is the toned fill: `<role>` for the four hue tones, `--ult-color-border-strong` for `neutral`. Value is the toned number: `<role>-text`, or `--ult-color-text` for `neutral`. Determinate width is Base UI's inline `%`; `transitionProperty: width` over `--ult-motion-base` with `standard` easing. Indeterminate is `[data-indeterminate]` on Indicator: this file's keyframes, duration `--ult-motion-loop`, and under reduced motion a static 25% width with `animationName: none`. `value={null}` is Base UI's; there is no `variant="indeterminate"`. Root is a flex column with space step 2 of gap. `data-complete`, `data-indeterminate`, and `data-progressing` drive style; exactly one is present. Determinate width transition and indeterminate `animation-name` are proof bar item 8. Item 7 is not this component. Registry item `progress`, one file, no Ultima component dependency.
- **Skeleton.** Settled on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a). One part, `Root`, no axes. `--ult-color-surface-sunken` at `--ult-radius-md`. Pulse keyframes in this file, duration `--ult-motion-loop`; under reduced motion, rest opacity and `animationName: none`. Size is the `style` slot. `aria-hidden="true"`. `animation-name` is proof bar item 8; `aria-hidden` is item 2. Item 7 is not this component. Registry item `skeleton`, one file, no Ultima component dependency.
- **Spinner.** Settled on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a). One part, `Root`, no axes, no `tone`. A circular looping mark in CSS, hairline border, `currentColor`. Keyframes in this file, duration `--ult-motion-loop`; under reduced motion, a static glyph and `animationName: none`. `aria-hidden="true"`. Not a Progress and not a toast. `animation-name` is proof bar item 8; `aria-hidden` is item 2. Item 7 is not this component. Registry item `spinner`, one file, no Ultima component dependency.
- **Empty.** Settled on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a). Four parts, no axes. `Root` is a `<div>` through `useRender`, a centered flex column with space step 4 of gap, padding from space step 8, `--ult-radius-md`, and `--ult-color-surface-sunken`. `Title` is text step 5, semibold, `--ult-font-leading-tight`, an `<h3>` through `useRender`. `Description` is text step 4 in `--ult-color-text-muted`. `Icon` is omitted when unused: `1em`, `flex-shrink: 0`, `aria-hidden`. No built-in glyph. An action is children, a catalogue Button. No live role. Not Card, not Alert, not `Combobox.Empty`. Registry item `empty`, one file, no Ultima component dependency.
- **Field and Fieldset.** Settled on [Field and Label: parts, and how validation state reaches a field's siblings](https://linear.app/frankie-ramirez/issue/ULT-79); the parts, the styled split, and the absent axes are in The v0.1 set, the wiring is in the accessibility contract, and only the paint is here. `Field.Root` is a flex column with space step 2 of gap, which is the whole of its styling. `Label` is text step 3, weight medium, `--ult-color-text`. `Description` is text step 2 in `--ult-color-text-muted` with `margin: 0`, since it renders a `<p>` and the UA margin would double the root's gap. `Error` is text step 2 in `--ult-color-danger-text`. `Item` is a row with space step 3 of gap, for a checkbox or radio and its own label. `Fieldset.Root` resets the UA `<fieldset>`'s border, margin, and padding to zero and then lays out as a flex column with space step 3 of gap; `Legend` is text step 3, weight medium, and takes space step 2 of bottom padding. None of the five carries a hover, an active, or a focus state: a Field paints no control, and every interactive element inside one is a component that brings its own. Registry items `field` and `fieldset`, one file each, no Ultima component dependency in either — the control reaches a Field through the consumer's own markup, which is what keeps `field.tsx` free of the import that would otherwise reach every form component.
- **Sidebar.** The largest contract in v0, and the only one that spans three decisions: its parts and styling, its responsive state model, and its mobile menu. It is written out as its own subsection below this list.
- **Collapsible.** Decided on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57), priced on [ULT-49](https://linear.app/frankie-ramirez/issue/ULT-49). Three parts, no axes, no glyph slot. `Root` passes through. `Trigger` is a wrapper trigger and ships no styles at all, not even the ring: it is a real control carrying its own `aria-expanded` and `aria-controls`, but `stylex.props` does not merge foreign class strings, and the spec already composes a nested Sidebar group as `Collapsible.Trigger render={<Sidebar.Button />}`. Canonical examples are `render={<Button variant="ghost" />}` standalone and `render={<Sidebar.Button />}` inside a sidebar; a caret is the consumer's glyph, rotating on `data-panel-open` (not `data-popup-open`). `Panel` is the only styled part and its animation is a hard contract: `height: var(--collapsible-panel-height)`, `overflow: hidden`, `transitionProperty: height`, `transitionDuration` from `--ult-motion-base`, and `height: 0` on both `':is([data-starting-style])'` and `':is([data-ending-style])'`. Base UI detects the animation by reading computed style, so a zero duration means the panel unmounts on the same frame with no animation and no warning; the motion tokens collapse to `1ms` under reduced motion, which is still non-zero, the same property the Overlays section already relies on. A keyframe animation beside the transition logs a dev warning and the transition wins, so the panel never carries one. `Panel` sets no `display`, so the UA `[hidden]` rule stands on its own, and it ships `':is([hidden]):not([hidden="until-found"])': { display: 'none' }` anyway, because the `style` slot lets a consumer add `display: grid` for their content and silently break find-in-page. `var()` passes through the StyleX compiler verbatim and the state keys land in the same layer at a higher priority than the default, both verified against this repo's `stylex.options.ts`, so no dynamic style is needed and the runtime-numbers-only rule is untouched. `--ult-motion-base` rather than `-fast` because a panel opening is the same gesture as Sidebar's desktop collapse. Registry item `collapsible`, one file, no Ultima component dependency: Button reaches it through `render` from the consumer.
- **Toggle Group.** Decided on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57). Two parts, `Root` and `Item`, one file importing both `@base-ui/react/toggle-group` and `@base-ui/react/toggle`. No axes, no glyph slot. Both parts are styled: the look is the segmented control, a sibling of Tabs' `segmented` variant rather than a copy of Button's tables. `Root` is a `--ult-color-surface-sunken` ground at `--ult-radius-md` with space step 1 of padding and gap; `Item` is a row at `--ult-radius-sm`, text step 3, `--ult-color-text-muted` resting, `--ult-color-text` on `':is([data-pressed])'` over `--ult-color-surface-raised`, plus hover, the focus ring, and reduced opacity on `':is([data-disabled])'`. Button is deliberately untouched: a `data-pressed` row would have to be written into every cell of the nested `variants[variant][tone]` lookup, five of whose six cells exist only to never use it. `orientation`, `multiple`, `loopFocus`, `disabled`, and the `<Value extends string>` generic pass through as Base UI's props and are not axes. A single-selection group can be emptied — with `multiple: false` Base UI computes `nextPressed ? [newValue] : []`, so clicking the pressed item emits `[]` — and there is no `required` prop; a caller who needs a selection always present calls `eventDetails.cancel()` on the empty change, which Base UI honours before it sets state, and the docs theme control does exactly that. Registry item `toggle-group`, one file, no Ultima component dependency.
- **Card, Stat, Code.** Unchanged. They have no axes beyond Code's `variant`, no pass-through parts, and no state.
- **Table.** `Table.Scroll` is the one addition, decided on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57): an optional outer part, a `<div tabIndex={0} role="region">` with `overflow: auto` and the standard focus ring, naming itself from the caption through `aria-labelledby`. Optional because a table that fits needs no region and an empty one would add a stray landmark. It wraps `Table.Root` rather than replacing it, so `Root` stays one element and its `render` stays unambiguous, and a minimum width goes through the `style` slot on `Root` rather than becoming a prop. Everything else about Table in v0 is unchanged. Two parts join it in v0.2, for the Data Table recipe, under Data Table below; they are not v0 and the tables above do not list them.

#### Sidebar

Three tickets settled this component and a builder needs all three at once: [Sidebar's public parts, styled parts, glyph slots, and axes](https://linear.app/frankie-ramirez/issue/ULT-53), [Sidebar's responsive state model, and whether Ultima gets a breakpoint](https://linear.app/frankie-ramirez/issue/ULT-54), and [Mobile navigation: reuse Dialog, or promote Drawer into v0](https://linear.app/frankie-ramirez/issue/ULT-55). Ten parts, no axes, one registry item.

**Parts and styling.** Every part is plain and rendered through `useRender`, so each takes `render`.

- `Root` is a `<div>` that provides context and groups. It sets no layout, so the page owns where the panel and the content sit. It also always renders a `Dialog.Root` bound to the mobile state, described under Mobile menu.
- `Panel` is the `<nav>` landmark and the scroll container: `--ult-color-surface`, an inline-end hairline `--ult-color-border`, `inline-size: calc(4 * space step 12)` (16rem) written as a `calc` of the token, padding from space step 4, `overflow: auto`, and `data-open` / `data-closed` from the root's state. Closed on desktop is offcanvas rather than an icon rail, because the docs navigation is text: `inline-size: 0`, `overflow: hidden`, `visibility: hidden`, transitioning `inline-size` over `--ult-motion-base`. Width changes through the `style` slot, since `inline-size` is an ordinary property; shadcn's caller-set custom property cannot exist here and is not missed. The panel sits at the inline start and uses logical properties throughout, so there is no `side` prop and RTL follows.
- `Trigger` is a wrapper trigger handed the consumer's Button. `render={<Button variant="ghost" aria-label="Toggle navigation" />}` is the canonical example. One part serves both the desktop collapse control and the mobile menu control, and what it wires depends on which side of the breakpoint it is on: on desktop it sets `onClick` to `toggle`, `aria-expanded`, and `aria-controls` to the panel's id itself; below the breakpoint it renders as `Dialog.Trigger` and Base UI sets all of that. See Mobile menu below.
- `Close` is a wrapper trigger too, documented as `render={<Button variant="ghost" aria-label="Close navigation" />}`. It exists for the mobile menu and returns null above the breakpoint.
- `Group` sets spacing only. `GroupLabel` is a real heading, `<h3>` by default and changeable through `render` like `Card.Title`, styled as `Meter.Label`: text step 2, uppercase, `--ult-font-tracking-wide`, `--ult-color-text-subtle`.
- `List` is a `<ul>` reset to no margin, padding, or marker. It provides a depth context that increments for each nested `List` and reads that depth for `padding-inline-start` from the space scale, so a nested list indents itself. There is no `SubList` part and no axis. `Item` is a bare `<li>`.
- `Link` and `Button` share one row style: `--ult-radius-md`, padding from space steps 2 and 4, text step 4, `--ult-color-text-muted` resting, `--ult-color-text` with `--ult-color-surface-hover` on `:hover`, and the focus ring.
- `Link` takes `active?: boolean`, default `false`, passed as `useRender` state so Base UI emits `aria-current="page"` and `data-active=""` when true and nothing when false. The current style reads `':is([data-active], [aria-current="page"])'`, so a router link that sets `aria-current` itself, as TanStack Router's does, is styled with no prop. Current is `--ult-color-text` at weight medium on `--ult-color-surface-sunken` plus a 2px `--ult-color-accent` inline-start bar, so it differs by more than hue. `Button` takes no `active`.

A nested group is not Sidebar's own part. It is `Collapsible.Root` around an `Item`, `Collapsible.Trigger render={<Sidebar.Button />}`, and a nested `Sidebar.List` inside `Collapsible.Panel`. That composition is what promoted Collapsible into v0.

The docs page states three obligations that are the consumer's and not Sidebar's: one link current per set, a name on the panel, and moving focus to the new page's heading on a client-side route change.

**Responsive state model.** `Root` holds two states, because a desktop collapse is a persisted preference and a mobile menu is a transient overlay: `open` / `defaultOpen` (`true`) / `onOpenChange` for the desktop panel, and `mobileOpen` / `defaultMobileOpen` (`false`) / `onMobileOpenChange` for the mobile menu. Both follow the controlled-or-uncontrolled rule under Cross-part state.

`useSidebar()` returns `{ open, setOpen, mobileOpen, setMobileOpen, isMobile, toggle }`. `toggle` flips whichever state applies at the current width, is what `Trigger` calls, and is the shape a consumer's keyboard shortcut wants. `Trigger` reads `aria-expanded` from the applicable state.

Sidebar owns the switch between the two layouts, because they are different DOM and every consumer would otherwise write the same hook. One breakpoint, `const DESKTOP = '@media (min-width: 48rem)'` at module level in `sidebar.tsx`, where a match means desktop. It is a module constant rather than a token for the reason in Token groups in v0, and it is not configurable in v0.

The switch is split in two halves that read the same string.

- **CSS decides what is visible.** `Panel`'s inline layout is hidden below `DESKTOP` by that at-rule key, with every state condition nested inside the query under State styling.
- **JavaScript decides what is mounted.** `Root` reads the same string through a private `useSyncExternalStore` hook over `matchMedia`, about a dozen lines in the file, whose server snapshot is desktop. The mobile overlay mounts only once that read says mobile, and crossing the breakpoint upward sets `mobileOpen` to `false` while never touching `open`.

Both halves reading one string is what makes a `breakpoint` prop impossible, found on [What shape Sidebar's demo takes on its docs page](https://linear.app/frankie-ramirez/issue/ULT-60): a runtime value cannot sit in a StyleX media condition, so the prop would move the mount without moving the at-rule and leave the two halves disagreeing. The `style` slot moves the at-rule but not the mount, with the same result. Changing the breakpoint means recompiling the CSS half, which is a consumer editing the copy of the file they already own.

Base UI's `unstable-use-media-query` is not used: it is the package's last `unstable-` export, its sibling was removed before 1.0 with no changelog entry, and a consumer who owns the installed file would break on the upgrade that removes it. A viewport read is not an interactive primitive, so ADR 0002 is unchanged.

Server rendering is safe by construction. The server render and the hydration render both produce the desktop DOM, which is the content-complete and crawlable shape, and the CSS half keeps it invisible on a narrow viewport until hydration mounts the overlay branch. A Next.js consumer therefore sees no wrong layout, only a mobile trigger that is inert until hydration like any other button. The docs site is a Vite single-page app with no hydration, so it reads the real viewport on first render and never flashes.

**Mobile menu.** Below the breakpoint `Panel` presents its children inside Ultima's Dialog, so the consumer writes children once. `Root` always renders a `Dialog.Root` bound to `mobileOpen` and `onMobileOpenChange`; once the read says mobile, `Panel` renders `Dialog.Portal > Dialog.Backdrop > Dialog.Viewport > Dialog.Popup` with the `<nav>` and its children inside the popup.

The overrides are private `style` values in `sidebar.tsx`, so Dialog itself is unchanged:

- `Viewport` becomes `display: flex`, `justify-content: flex-start`, no padding.
- `Popup` becomes `inline-size: min(16rem, 100%)`, `block-size: 100%`, no `max-width`, `border-radius: 0`, an inline-end hairline only, and no padding, keeping the overlay surface and shadow.
- `Panel` keeps `min(16rem, 100%)` in both layouts.
- The transition is a slide from the inline start: `transform: translateX(-100%)` on `[data-starting-style]` and `[data-ending-style]`, `translateX(0)` at rest, over `--ult-motion-base` with the enter and exit easings, the same duration as the desktop collapse. Dialog's opacity fade stays beneath it. The override redeclares `transform` for all three states and `transitionProperty`, and nothing else, because a state left unnamed keeps Dialog's `scale(0.98)`. Backdrop is Dialog's, untouched.

The popup takes the `aria-label` or `aria-labelledby` that `Panel` was given and renders no `Dialog.Title`, the one stated exception to the always-render-a-Title rule under the Accessibility contract. `Trigger` renders as `Dialog.Trigger` below the breakpoint, so Base UI owns `aria-expanded`, `aria-controls`, `aria-haspopup`, and focus return to the trigger; on desktop it is the plain button wired to `toggle`. `Close` renders as `Dialog.Close`. `modal` stays the default and `keepMounted` is never set, so scroll lock, Escape, and backdrop dismissal come with the primitive.

Sidebar wires exactly one behavior of its own on top of Dialog: `Link` closes the mobile menu on click. That is what item 7 of the proof bar exists for.

Drawer was measured and declined on [Base UI Drawer measured against Dialog](https://linear.app/frankie-ramirez/issue/ULT-48): it shares Dialog's focus manager and adds swipe gestures at the cost of sixteen parts, a family of `--drawer-*` variables, and a duration outside the motion scale. The Android back gesture is the one behavior the reuse forgoes.

**Registry item.** `sidebar`, one file, `registryDependencies` `@ultima/tokens`, `@ultima/lib`, and `dialog`. The page says a consumer installing Sidebar installs Dialog with it. Collapsible and Button are composed by the consumer through `render` and are not dependencies.

#### Data Table

A v0.2 entry, decided on [What Data Table is built on, and what that dependency costs a consumer](https://linear.app/frankie-ramirez/issue/ULT-72). It is written here rather than in the component tables above because it is not a component: it is a documented recipe plus two additions to Table, and the tables above are v0.

**The engine is TanStack Table v9, and it is the consumer's dependency.** `@tanstack/react-table` is headless, owning state and row models and rendering no DOM and no styles, which is what makes it a candidate under ADR 0007 at all. No Ultima file imports it, so no registry item declares it and `scripts/build-registry.ts` derives nothing new. The recipe's install step is the consumer's own `npm install`, the way shadcn's guide does it.

Two facts about v9 a builder needs before writing the examples. Features are registered statically through `tableFeatures()` and the table's type is computed from that registration, so the APIs of an omitted feature do not exist; the recipe therefore registers features per example rather than reaching for the full set, which is also the only way the opt-in design saves a consumer anything. And v9 is ESM-only, recorded under Registry and install with the other consumer-toolchain caveats.

**Table gains two parts, and no axis.** `Table.HeadCell` takes `sort?: 'ascending' | 'descending' | 'none'`, passed as `useRender` state so the `th` emits `aria-sort` and `data-sort`, which is the same mechanism `Sidebar.Link`'s `active` uses to emit `aria-current`. It is state, not a fourth axis. `Table.SortButton` is the control inside the head cell: a wrapper trigger by the rule under Styled parts, documented as `render={<Button variant="ghost" />}`, so the ring and the reset come from the Button and Table ships no styles for it. The glyph is the consumer's, rotating on `data-sort`, following Collapsible's caret. `aria-sort` belongs on the cell and the control belongs inside it, which is why this is two parts rather than one: a single part cannot set an attribute on its own parent.

Neither part is in v0. They ship with this entry, because nothing in v0 needs them and the v0 catalogue is closed.

**Pagination is not duplicated.** The Pagination entry on the Breadcrumb line is the same controls, so the recipe composes that component once it exists rather than shipping a second set. View options stay pure composition, Dropdown Menu with checkbox items, and add no part.

**Virtualization is out of scope for this entry**, and not on cost. TanStack's virtualization guide replaces native table layout with `display: grid` on the table, `display: flex` on rows, and rows absolutely positioned inside a relative `tbody`. That is a different element model rather than an addition to `Table.Root`, and it would fight Table's own styled parts. A sticky header needs no part either: `position: sticky` on `Table.HeadCell` plus a `--ult-color-surface` ground so rows do not show through, documented as a pattern on the existing parts. `Table.Scroll` is the scroll region and is enough.

**Three obligations are the consumer's, and the docs page states them**, the way Sidebar's page states its three. Each row checkbox takes a name derived from that row's own data rather than a constant, because a table of identically named checkboxes identifies no row; the select-all takes its own name; and a change to the visible rows after a sort, a filter, or a page is announced through a `role="status"` region that follows the live-region pattern under Live regions, whose text is application-specific and so belongs to the recipe rather than to a part or an announcer. All three are failures in shadcn's guide, which has no `aria-sort`, no announcement, and the same `"Select row"` on every row. That gap is the reason the two controls above are in the catalogue instead of the guide.

### Naming

| Thing | Rule | Example |
| --- | --- | --- |
| File and registry item | kebab-case | `dropdown-menu.tsx`, item `dropdown-menu` |
| Component and parts | PascalCase, mirroring Base UI's part names wherever the primitive supplies them | `DropdownMenu`, `DropdownMenu.Item` |
| Props type | `<Component>Props`, `<Component><Part>Props` | `ButtonProps`, `CardRootProps` |
| Axis unions | `<Component>Variant`, `<Component>Size`, `<Component>Tone` | `ButtonVariant` |
| Style tables | `styles` keyed by part, `variants`, `sizes`, `tones` | `styles.root`, `styles.header` |
| Nested tone tables | one `stylex.create` per variant, named for the variant, collected in `variants` | `solid`, `outline`, `ghost` |

`ToggleGroup.Item` is the one part name in v0 that mirrors nothing: Base UI ships `ToggleGroup` and `Toggle` as two exports from two subpaths rather than as a namespace, so there is no part name to mirror. The compound rule decides it anyway, on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57): the two are useless apart in v0, standalone Toggle stays in v0.2, and a consumer imports one name. v0.1 adds two more invented names on the same pattern, settled on [ULT-80](https://linear.app/frankie-ramirez/issue/ULT-80/checkbox-radio-group-and-textarea-parts-glyphs-and-the-indeterminate): `Checkbox.Group` wrapping the bare `CheckboxGroup` export, and `RadioGroup.Item` wrapping `Radio.Root`.

### The registry item

Each component's item carries: `name` equal to the file name, `type: registry:ui`, `title`, a one-sentence `description`, `dependencies` (`@base-ui/react` and `@stylexjs/stylex` as used), `registryDependencies` (`@ultima/tokens`, `@ultima/lib`, and any Ultima component it composes), exactly one `files` entry, and a `docs` line giving the import and a minimal usage. Composing another Ultima component is declared as a dependency, never copied in. Generating the JSON from the monorepo is decided on the registry ticket.

### The prototype

`packages/ui/src/prototype/` and the `/prototype/ult-7` route were the throwaway Button and Card, kept only until the real ones existed. The v0 build wrote those and deleted both, so neither is in the repository. The section stays as the exit a future throwaway takes: `prototype` is one of the three names `NEVER_STAGE` in `scripts/build-registry.ts` holds, so a prototype directory can never reach a consumer on its way out.

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

Registry root `https://ultima.systems`. The catalogue is at `/r/registry.json`, each item at `/r/{name}.json`, and the tokens CSS export at `/tokens.css`. The docs site serves all of it.

The namespace is `@ultima`, written into the `registries` map of the `components.json` each setup item installs, so a consumer never runs `shadcn registry add` by hand.

### Entry point

`npx shadcn init` is not supported and never will be while its preflight requires Tailwind on disk. The documented entry is:

```bash
npx shadcn add https://ultima.systems/r/setup-vite.json   # or setup-next.json
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
- **A strict CSP needs a nonce.** Some Base UI primitives inject an inline `<style>` at runtime, and a `style-src` without `'unsafe-inline'` blocks it. Base UI's `CSPProvider` takes the nonce; it is the consumer's app-root concern and Ultima declares no dependency on it. Two `<style>` occurrences so far: Select's aligned popup injects a rule that hides the scrollbar, and `ScrollArea.Root` injects one per page regardless of instance count (React 19 dedupes on `href="base-ui-disable-scrollbar"`). Combobox does not add a third: its list is a consumer `overflow-y: auto`, measured on [ULT-74](https://linear.app/frankie-ramirez/issue/ULT-74) and contracted on [ULT-81](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts). Slider grows the note in a different direction: `Slider.Thumb` emits an inline `<script>` when `thumbAlignment="edge"`, governed by `script-src`, not suppressed by `disableStyleElements`, nonce via the same `CSPProvider`. Canonical Slider keeps the default `"center"`, which injects nothing; `"edge-client-only"` is the documented escape that skips the script at the cost of rendering after hydration. The Select page keeps a one-line pointer at the style occurrences; the Slider page keeps one at the script. Hoisted here from the Select docs page on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57), because it is a property of Base UI rather than of Select and a consumer needs it before they install anything. Note that `ScrollArea.Root` is the injecting part, not `ScrollArea.Viewport` as the Base UI docs page says ([ULT-49](https://linear.app/frankie-ramirez/issue/ULT-49)).

One further caveat belongs to a dependency rather than to Ultima, and it stays out of the imperative list above because it reaches only the consumers who follow one recipe. **TanStack Table v9 is ESM-only.** It ships no CJS and no UMD build and declares `engines.node >= 20`, so a toolchain that `require()`s it cannot load it: a CJS config path, or a test runner without ESM support. The Data Table recipe names this at its install step, and it is stated rather than worked around, decided on [What Data Table is built on, and what that dependency costs a consumer](https://linear.app/frankie-ramirez/issue/ULT-72). Pinning the last dual-published major to buy CJS back would adopt a version already more than a year old, and a consumer whose toolchain cannot resolve ESM cannot compile StyleX either, so Ultima does not reach them regardless. The install page carries the long form beside the CSP note.

### The tokens CSS export

Offered two ways. The stable URL `https://ultima.systems/tokens.css` is the documented path, and the one mana's audit report uses: it fetches or vendors the file and inlines it, which is why the export carries the self-contained-document constraints in the Tokens section. The `tokens-css` registry item writes the same generated file to `~/ultima-tokens.css` for a project that wants it committed alongside its own source.

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

The report vendors the export: `skills/ultima/assets/ultima-tokens.css` is a copy of `https://ultima.systems/tokens.css` with the source URL and date in a header comment, and the renderer reads it and concatenates it ahead of its own `CSS` constant. Fetching at render time would break the report's no-network promise; pasting the export into the Python string literal would force the export to avoid `"""` and backslashes forever. Refreshing is a hand copy until that hurts.

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
| `/components` | Index of the catalogue, sectioned v0 then v0.1 |
| `/components/<name>` | One page per catalogue component |
| `/rationale` | Why StyleX, why Base UI, why registry-first, why dark-first. Links the ADRs |

`/install` is the long form the `docs` field of each setup item points at; the setup items print a short imperative list and nothing is installed into the consumer's repo as a README.

`/palette` is the only page that reads the `defineConsts` layer, and the only place a scale name appears outside the token sources. The two contrast readouts are split by what they describe: the WCAG 2.2 AA gate is reported on `/palette` because it is a property of the steps, and the APCA numbers sit beside each semantic pairing on `/tokens` because they are advice about a role, not a build gate.

There is no changelog page in v0; versioning policy for a copy-source registry is not yet decided. There is no agents page: the agent-facing surface is `/llms.txt`, a generated artifact rather than a route, described in the Agent surface section.

### How the site gets its components

The docs site imports `@ultima/ui` and `@ultima/tokens` from the workspace. It does not `shadcn add` its own registry.

The registry is generated from the workspace source, so an installed copy can only ever be an older version of the same file. A docs site living on installed copies would document a version of Ultima that no longer exists, and every component change would need a reinstall before the page showing it caught up. The install path is proven instead by `scripts/smoke-install.sh`, the fresh-app smoke test [the install prototype](https://linear.app/frankie-ramirez/issue/ULT-8) established the shape of.

This makes the docs site a user of the components rather than a consumer in the glossary's sense. Mana's report remains the first true consumer.

### Docs navigation and component ownership

The docs menu uses the production Sidebar from `packages/ui`. Sidebar supports grouped navigation with nested items and an active-page indication, collapsible desktop navigation, and a mobile menu. Routing remains the app's responsibility; Sidebar must accept links composed with the consumer's router, which it does through `render` on `Sidebar.Link`. Its parts, its state model, and its mobile menu are fixed in the Per-component notes.

The docs implementation must prove these behaviors:

- The current route has an accessible active-page indication, including on a direct page load. Nested navigation exposes its expanded state.
- Keyboard users can reach every link and operate the desktop collapse and mobile menu controls. Icon-only controls have accessible names and visible focus rings.
- Opening the mobile menu moves focus into it; Escape and its close control dismiss it and return focus to the trigger. Selecting a destination closes the menu. Modal behavior is Dialog's, which Sidebar composes rather than reimplements.
- The menu remains usable across desktop and mobile layouts, with long navigation lists and in both color modes. Sidebar accepts the same StyleX customization and semantic tokens as other components.

These four are acceptance criteria for the docs, not a fifth kind of proof. They are covered by Sidebar's own test file under the eight items in Testing, which says which item catches which.

Sidebar ships with its own registry item and component page, and its page has rules no other component page has, under Sidebar's docs page below. The reusable dependencies it turned up are Collapsible and Toggle Group, both now in the v0 set with contracts of their own. The docs may own its route data and page layout; navigation controls, theme controls, copy buttons, and other reusable interactions use production Ultima components. Throwaway prototypes and site-local copies do not satisfy the v0 release gate. What that sentence means file by file is the next subsection.

### The line between a component and page layout

Decided on [Where the line falls between an Ultima component and docs-local page layout](https://linear.app/frankie-ramirez/issue/ULT-56). The rule above had no edge, and the docs' actual inventory turned out to break it in two different ways, so the rule has two prongs.

**A docs file may arrange, and may set type and flow spacing. It may not hand the user a control built from plain elements, and it may not paint a surface.** A control's element, ARIA, keyboard handling, and focus ring come from an Ultima component. A surface is anything carrying a background, a border, a shadow, or a radius. Where no component provides one, it joins the catalogue rather than being written into `apps/docs`.

The second prong is the one that does the work here. The docs has exactly one hand-built widget and a great deal of hand-painted chrome: four separate bordered containers reimplementing Card, two separate tables reimplementing Table, and a code block reimplementing Code, each drawn from raw tokens. A rule about reusable interactions alone would have passed all of it.

A docs-local wrapper that adds application behavior around an Ultima component still passes. `copy-button.tsx` hands the user a control, but the control is an Ultima Button and only the clipboard write and the confirmation are the site's.

#### The inventory, sorted

**Promoted into the v0 catalogue.** Toggle Group, for the theme control, and Collapsible, for Sidebar's nested groups. The September 12, 2026 designs in `ultima.pen` also require Separator for landing sections, token rows, and the article index. Separator reads the border token, forwards Base UI's horizontal or vertical orientation, and accepts the standard style slot. Breadcrumb, Scroll Area, Toolbar, and Navigation Menu stay in v0.2.

**Rebuilt on existing components.** The demo block chrome, the home page's demo tiles, the home page's install blocks, and the `/components` index cards each compose Card instead of drawing their own container. The index cards render no hover and no focus-visible styling at all today, which the change fixes rather than preserves. `data-table.tsx` is deleted and its three call sites on `/tokens` and `/palette` use Table, which also gives them a real caption. Those tables carry a `minWidth` of 40 to 48rem inside an `overflowX: 'auto'` wrapper that has no `tabIndex` and no focus ring, so the scroll region is keyboard-inaccessible today; the call sites move to `Table.Scroll`, added for them on [Contracts for the reusable patterns the docs pulls into v0](https://linear.app/frankie-ramirez/issue/ULT-57), and the minimum width goes through the `style` slot on `Table.Root`. The first prong is what catches this: a tabbable scroll region's keyboard handling and focus ring cannot come from plain elements in `apps/docs`, and the source-reading gate would not have caught it either, since `outline` is not one of the four properties it reads. The `code` and `pre` mappings in `prose.tsx` delegate to Code, and its `table`, `th`, and `td` mappings delegate to Table.

**Stays docs-local as page layout.** `page.tsx` and `prose.tsx`, once the mappings above delegate. Both only arrange, set type, and set flow spacing. `Note` paints nothing today and stays a styled paragraph, confirmed on [ULT-82](https://linear.app/frankie-ramirez/issue/ULT-82/alert-and-alert-dialog-and-whether-the-docs-note-becomes-one): Alert ships as a catalogue item and `Note` is not migrated. If it ever gains a surface it becomes that Alert rather than a docs-local callout. Route data, the component catalogue, and the demo modules are data and content, not chrome.

**Stated exceptions.** `swatch.tsx` paints a surface and stays docs-local anyway, because its whole job is to display a raw palette value and a component built to bypass the token layer must not sit in a catalogue founded on it. Its chip is an unlabeled empty element today, so it takes `aria-hidden` and the caption carries the value. `copy-button.tsx` passes the rule unchanged, and gains the live region it lacks, because its copied confirmation is visual only and no automated check would catch that.

Typography is not a v0 gap. A Prose component is opinionated about a consumer's content pipeline, and what it really carries is a stylesheet rather than a component, so it stays the v0.2 Typography recipe entry and the docs' own `Prose` is the shape that entry documents.

#### The header and the single nav

Once Sidebar carries the menu, a second navigation in the header would put two `nav` landmarks on every page and a second copy of the route data behind them. The header therefore renders no links: it keeps the wordmark, the mobile `Sidebar.Trigger`, and the theme control, and Sidebar is the site's only navigation. Navigation Menu is not promoted, since the docs has no dropdown navigation to justify the most expensive item on the candidate list. That keeps it out of v0 and says nothing about later releases: it ships in v0.2 on [Does Navigation Menu ship in v0.2](https://github.com/frankieramirez/ultima/issues/86), where coverage rather than demonstrated need sets the scope, and where a component the site does not use is the ordinary case rather than the first one.

Route data is one module that Sidebar reads. Today it is four partial copies that already disagree: the header's own list, a second list in the home page missing `/palette` and in a different order, the component catalogue, and the router's page map. The catalogue stays the data it is; the navigation tree derives from it.

The September 12, 2026 designs in `ultima.pen` replace the nested release disclosures planned in [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs) with a flat catalogue. `apps/docs/src/components.ts` remains the source in specification order, and a docs-only `release: 'v0' | 'v0.1'` on each entry still drives that order and sections the `/components` index into "The v0 set" and "The v0.1 set" without slicing at a magic index. The menu stays flat under `@components`, derived from the same field. Navigation uses `::root` and `@components` group labels and `--`-prefixed destination labels. Sidebar retains its reusable nested-list parts. The wordmark always links home. Below 48rem, a separate menu icon button opens the navigation overlay. Desktop navigation remains visible and does not restore a saved collapsed state. Documentation articles include a separate section index derived from their headings; it hides below 80rem. Token and palette pages use the full content width.

The theme control stays docs-local, composed from Toggle Group. Ultima ships the widget and nothing more. The preference, its storage key, and applying the theme class to the document are the application's job, and a component that shipped them would assert a storage key and a root element on every consumer.

#### The gate that checks it

"No site-local copies" was a promise with nothing behind it, and v0 has no linter. One test under `apps/docs/src/__tests__/` reads the source of every file under `apps/docs/src` outside `demos/` and fails when a `stylex.create` call declares `backgroundColor`, a border color or width, `boxShadow`, or `borderRadius`. Those four properties are the surface prong stated mechanically. The allowlist holds the stated exceptions above and nothing else, so a new one costs a visible edit and an argument. It runs inside the existing Vitest suite, so CI carries it with no new step.

The check is deliberately narrower than the rule. It cannot see a hand-rolled widget, which is the first prong, and that stays a matter of review. It catches the failure that actually happened seven times in this inventory.

### Sidebar's docs page

Decided on [What shape Sidebar's demo takes on its docs page](https://linear.app/frankie-ramirez/issue/ULT-60). Sidebar is the one component in the catalogue whose presentation depends on the viewport, v0.1 included, since no component in that release writes a breakpoint and Motion keeps Sidebar as the breakpoint exception. So its page needs rules no other page does.

**The demo block holds it, unchanged.** `Demo`'s stage sets no height and `Panel` sets no `block-size`, so a panel inside one is content-sized and needs no bespoke frame. Inside `Prose` the stage leaves roughly 35rem of usable width, enough for the 16rem panel with content beside it. A demo showing the panel scroll sets `block-size` through the `style` slot on `Panel`, which is a demo module's own style rather than docs chrome. Nothing about the demo block grows for this page, and the docs surface check is untouched, since demo modules sit outside the source it reads.

**The collapse demo renders content beside the panel.** `Panel` animating `inline-size` to zero in an empty stage reads as a box vanishing; in a flex row beside a filler paragraph it reads as a layout reflowing, which is what the component does. The demo module arranges that row itself, which page layout permits.

**A desktop reader cannot be shown the mobile menu in the page, by any construction.** The switch is two halves reading one string: a static at-rule key compiled into the stylesheet, and a `matchMedia` read deciding what mounts. A runtime `breakpoint` prop could redirect the mount but not the at-rule, because a runtime value cannot sit in a StyleX media condition; `style` overrides move the at-rule but not the mount. Either half alone desyncs the two. Only a genuinely narrow viewport produces the mobile menu.

The page therefore does not try. No iframe, no screenshot, and no second demo module composing Dialog by hand, which would copy `sidebar.tsx`'s private overrides into `apps/docs` and then drift from them. The page states in prose what happens below the breakpoint and points at the site's own menu. An iframe at a mobile width was measured and declined: it costs a route that exists only to be framed, a second React root with its own `ThemeRoot` reading `ultima-theme` and listening for `storage`, which does reach a same-origin frame, and a printed source that is no longer the thing rendered. It returns only if a second component needs a responsive preview, and then as a docs-local pattern rather than one page's one-off.

**The site's own Sidebar is the whole-navigation demonstration**, the way the header's theme control demonstrates that light is a full peer rather than the site asserting it. The page says so in as many words. Its own demos are each narrow and show one thing: the parts, a nested group through Collapsible, the active state, the desktop collapse, and a scrolling panel. None of them is a second full navigation.

**Every demo `Panel` carries its own `aria-label`.** Once the shell carries Sidebar, this page holds the site's `<nav>` plus one per demo, and distinct accessible names are what makes that legal. The accessibility sweep will never catch a duplicate, because it mounts each demo bare in its own wrapper. Demo links use `href="#"`, and a demo's current link is current within its own set, which is the set the consumer obligation under Per-component notes is written about.

**Below the breakpoint the page's own demos change shape too**, since every Sidebar on the page reads the same viewport: each demo stage holds its trigger and the panel moves into an overlay. That is the component being honest rather than a defect, and the page's prose accounts for it rather than the demos working around it.

### Authoring

Content pages are MDX, one file per page under `apps/docs/src/content/`, compiled by `@mdx-js/rollup`. A single `Prose` component carries every typography style; MDX files hold no styling of their own. Routes stay code-based: a page module's default export is a component like any other, so MDX costs one plugin and no routing change.

Demos are real modules at `apps/docs/src/demos/<component>/<name>.tsx`, imported into the MDX and rendered live. The source shown under each demo is the same file read through Vite's `?raw` import, so the running example and the printed code cannot diverge. Each demo block has a copy button.

Props tables are hand-written in the MDX and cover only what Ultima adds: `variants`, `sizes`, the `style` slot, and `render`. The inherited surface links out to Base UI's own documentation. A generator would either dump Base UI's entire prop surface or nothing useful, and it reads namespace-object compound parts badly. Generating them is a later upgrade, not a v0 requirement.

### Hosting

One Cloudflare Pages project, serving `ultima.systems`. Amended on [Hosting on Cloudflare Pages](https://linear.app/frankie-ramirez/issue/ULT-42): the host was Vercel and the domain was `ultima.frankieramirez.com` when this was first written, and both changed before anything shipped.

The project builds from the repository root rather than from `apps/docs`, because the install step has to see `pnpm-workspace.yaml` to link `@ultima/tokens` and `@ultima/ui`. Install command `pnpm install`, build command `pnpm --filter @ultima/docs build`, output directory `apps/docs/dist`. The docs package's own `build` runs `registry:build` first, so one command publishes the registry and the site together.

The site serves the registry catalogue at `/r/registry.json`, each item at `/r/{name}.json`, the tokens exports at `/tokens.css` and `/tokens.json`, and the agent guide at `/llms.txt`. All of them are generated into `apps/docs/public/` as gitignored build output, the same way the registry JSON is. All four carry `Access-Control-Allow-Origin: *`, from `apps/docs/public/_headers`: the shadcn CLI fetches server-side and mana vendors the CSS export, but a browser-side tool or an agent reading any of them should not be blocked. That file also sets the cache policy, immutable for Vite's fingerprinted `/assets/*` and revalidate-always for the four artifacts, which every deploy rewrites at the same URLs. It does not set `Content-Type`; Pages derives that from the file extension and appends a charset, and naming the type here would drop it.

The SPA fallback is Pages' own, and two things in the output directory would break it. A `_redirects` splat is the wrong tool: Pages applies a redirect whether or not an asset matches the request, so `/* /index.html 200` would shadow the four artifacts rather than fall back to them. A top-level `404.html` is the other, because Pages reads its absence as the signal that this is a single-page application and serves `index.html` for any path with no asset behind it. Neither file belongs in `apps/docs/public/`. An unknown path therefore reaches the router, which renders the 404 page from the Portfolio surface section.

### Portfolio surface

The fantasy voice lives in the brand layer only: the name, the six scale names, hero and page titles, and the 404. Technical prose is plain. The brand lockup is `--ultima`: the blue three-bar mark evokes CSS custom-property syntax and the lowercase wordmark keeps the identity close to frontend infrastructure. The header and home hero use the full lockup, with white lettering on dark surfaces and ink lettering on light surfaces. The favicon uses the compact three-bar mark on an ink ground because the full wordmark does not survive 16 pixels. Mana's Prism mark stays on mana: Ultima is a standalone MIT project, and carrying a mana mark would assert a relationship a reader cannot act on, so the two link to each other from their READMEs instead. Whether Ultima ships icons is settled under Iconography, and the answer does not reach the brand layer.

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

**Viewport.** Both Vitest configurations pin the Chromium instance's viewport, `viewport: { width: 1280, height: 720 }`, rather than inheriting Playwright's default, decided on [What the expanded v0 catalogue changes about the proof bar and the release gate](https://linear.app/frankie-ramirez/issue/ULT-58). Desktop is the stated default width for every test, and a test that depends on width says so: `page.viewport(390, 844)` in a `beforeEach` inside that test's own `describe`, with the desktop width restored in `afterEach`. The viewport persists across the tests in a file, so a stray resize would silently retune every test after it. `page.viewport` resizes the real browser window, so a `matchMedia` subscription such as Sidebar's fires without a mock and no viewport is stubbed anywhere. Sidebar is the first caller; this is the standing pattern for any component whose contract names a breakpoint.

### What a build ticket proves

Every v0 and v0.1 component build ticket ships a test file covering its own row of the Accessibility contract and its own axes. Eight items. The bar was written for fourteen components that are static, single-viewport, and stateless across their parts, and grew by items 7 and 8 on [What the expanded v0 catalogue changes about the proof bar and the release gate](https://linear.app/frankie-ramirez/issue/ULT-58) once Sidebar, Collapsible, and Toggle Group joined the catalogue. Both additions are stated as rules rather than as notes about those three, because each has a named successor already: `ScrollArea.Viewport` copies `Table.Scroll`, and the next anchored primitive with a size morph copies Navigation Menu. Confirmed for v0.1 on [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs): the bar stays eight. No ninth item, and the numbered sentences are not widened.

1. **Every combination renders.** Each `variant` by `size` by `tone` mounts without throwing, and the component with no props matches the declared default. Where the component exports a `use<Component>()` hook under Cross-part state, calling it outside `Root` throws.
2. **The name resolves.** The component is queryable by role and accessible name through the source its contract row names.
3. **The focus ring lands where the contract says.** The part in the "Focus ring on" column shows an outline after keyboard focus; a part the contract says renders no ring shows none. Menu and Select items assert `data-highlighted` styling instead.
4. **The primitive is still wired.** One assertion per contract row marked Base UI in the Keyboard column, confirming the composition did not break it: Escape closes, arrows move the highlight, focus returns to the trigger. This is not a re-test of Base UI, which tests itself.
5. **Documented state drives its style.** Each `data-*` attribute the per-component notes name actually produces its change, and documented cross-part state reaches the parts its contract says it reaches, with a part-level prop overriding the context value. Meter's `tone` on `Root` reaching `Indicator` and `Value`, and Sidebar's `open` reaching `Panel`, are the two v0 cases. Progress copies Meter's `tone` on `Root`.
6. **Typecheck passes.**
7. **Behavior the component wires itself.** Every behavior in the per-component notes that is neither the primitive's nor a style is exercised. Item 4 covers what Base UI does; this covers what Ultima does on top of it, which nothing else in the bar reaches. In v0: `Sidebar.Link` closing the mobile menu, `Sidebar.Trigger` toggling whichever state applies at the current width, `Table.Scroll` taking focus and scrolling when its content actually overflows, and a single-selection Toggle Group emptying, along with the `eventDetails.cancel()` that prevents it. **v0.1 adds no instance, and that is the release's answer rather than fourteen separate silences.** Ultima wires no behavior of its own in any of the fourteen: every interaction is the primitive's, which is item 4, or a style reacting to a `data-*` attribute, which is items 5 and 8. Seven per-component contracts say "item 7 is not this component" for the components a reader would most expect to claim it — Field, Slider, Alert Dialog, Toast, Progress, Skeleton, and Spinner — and the other seven say nothing because there was never a candidate. The item stays on the bar at full width: the first v0.1 file that reaches for a pointer handler, a focus move, or a state change of its own is the first to fill it, and a build ticket that finds itself writing one has found something this contract did not anticipate.
8. **CSS the primitive reads.** A part styled under the second clause of Styled parts asserts the declaration the primitive depends on, because all three of `Collapsible.Panel`'s failure modes produce a component that looks correct in a static screenshot and that item 5 cannot see. For that panel: `transition-duration` is not `0s`, `animation-name` is `none`, and `display` is not overridden while the panel is `[hidden]`. Named v0.1 successors, contracted on [ULT-81](https://linear.app/frankie-ramirez/issue/ULT-81/combobox-and-slider-the-two-expensive-contracts): `Combobox.List` is a scroll container and `Combobox.Popup` tracks `--anchor-width`; `Slider.Control` carries `touch-action: none` and `user-select: none`, and `Slider.Track` has an explicit cross-axis size. Slider's drag is not item 7: Ultima wires no pointer behavior of its own. Arrows, `largeStep`, Home, and End are item 4. Toast, contracted on [ULT-83](https://linear.app/frankie-ramirez/issue/ULT-83/toasts-contract-and-whether-ultima-owns-a-live-region-pattern): Root's intra-stack `z-index` is not `auto`, height clamp reads `--toast-frontmost-height`, and swipe vars appear in `transform`. Swipe is item 4. Item 7 is not this component. Progress, Skeleton, and Spinner, contracted on [ULT-84](https://linear.app/frankie-ramirez/issue/ULT-84/progress-skeleton-spinner-and-empty-the-feedback-set-and-whether-a): Progress.Track has an explicit height and `overflow: hidden`; determinate Indicator `transition-duration` for width is not `0s`; indeterminate Indicator `animation-name` is not `none` except under the reduced-motion query that sets it to `none`. Spinner and Skeleton assert the same `animation-name` split. Item 7 is none of these four. Confirmed as the bar, not notes about those components, on [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs). Live-region structure (Viewport role / `aria-live` / `aria-atomic`, Portal and Viewport present with an empty stack, high-priority clone attributes) is items 2 and 4. A looping `animation-name` split is item 8 for any later spinner-like part. A consumer-mounted Provider is item 2/4 structure, and the canonical demo mounts it so the empty Viewport is in the axe sweep. Forge's checklist is this bar: `skills/forge/references/proof-bar.md` carried six items and took the other two on the assembly ticket, along with the release's answer for item 7 and the looping `animation-name` split in item 8.

One standing rule across all of them: **no test asserts a color value.** A test asserts presence and behavior, such as an outline width that is not `0px`, never `rgb(...)` or a hex literal. Palette values are regenerated, and a suite that pins them turns every regeneration into a day of updating tests. Color correctness belongs to the contrast gate and to axe, neither of which reads a hand-written expectation.

The rule needed no qualification for Sidebar's active-page indication, which is partly a color change, because [ULT-53](https://linear.app/frankie-ramirez/issue/ULT-53) already made current-ness more than hue. Two techniques are legal and both were named on [What the expanded v0 catalogue changes about the proof bar and the release gate](https://linear.app/frankie-ramirez/issue/ULT-58): assert the non-color half, so `border-inline-start-width` is not `0px` and the weight differs, and compare the two states' computed values against each other rather than against a literal, so `getComputedStyle(active).backgroundColor !== getComputedStyle(resting).backgroundColor` names no color and survives every regeneration. Whether the active row's contrast is adequate stays axe's question and the gate's.

Sidebar's four docs behaviors, listed under Docs navigation and component ownership, are not a fifth kind of proof: they are Sidebar's own test file under these eight. The active-page indication is items 2 and 5, keyboard reach is 2 and 3, the mobile menu's focus management is item 4 with the selection-closes-the-menu half in item 7, and both widths are the viewport pattern in Environment above applied to items 1, 3, and 5.

Tests live in `packages/ui/src/__tests__/<name>.test.tsx`. A directory is excluded from registry staging the same way `prototype/` already is, and it cannot be defeated by a future author widening the stage glob. A co-located `<name>.test.tsx` would sit one character away from shipping to a consumer.

### Accessibility checks

`apps/docs` holds one test that walks every demo module through `import.meta.glob`, mounts each in both color modes, and runs axe against it. Adding a demo adds its coverage; no list is maintained.

**The sweep applies the mode to `document.documentElement` and scans `document.body`.** Amended on [What the expanded v0 catalogue changes about the proof bar and the release gate](https://linear.app/frankie-ramirez/issue/ULT-58). As first written it applied the theme to a wrapper `<div>` and scanned that container, so every portalled popup fell outside the scan, and widening the target alone would have scanned portalled content against unthemed colors. Applying the mode to the document root is also how the docs site itself applies a theme, under The line between a component and page layout, so the sweep and the site agree. The change is not about Sidebar: the four overlay demos have never been scanned in their open state either.

**Open overlays are proven in the component's own test file, not by the sweep.** The sweep never interacts, so it only ever sees a demo's default state, and a demo that mounted open purely to be scanned would print misleading source on the page it illustrates. Each overlay component's test file runs axe against the open popup instead, which is where the interaction that opens it already lives; `packages/ui` takes `axe-core` as a devDependency for it. Sidebar's mobile menu is that shape plus a viewport, and Collapsible's closed panel needs nothing, since `[hidden]` content is correctly invisible to axe.

The demo block's shape is not the sweep's problem. The sweep mounts each demo module bare in its own wrapper, never inside the page's demo block, so whether a full-height navigation surface fits inside a Card is a Docs site question and not a testing one.

The default rule set stands, `color-contrast` included. The generator gates the pairings the Palette section declares; axe gates what a component actually composed, which is where a combination the generator's table never anticipated would show up. The two checks answer different questions and both stay on.

The sweep lives in `apps/docs` rather than in `packages/ui` so that component tests never depend on the docs site, and because the demos are the rendered surface a reader will copy.

v0.1 does not change the sweep. Settled on [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs): still `document.documentElement` and `document.body`, still no interact, still the default rule set including `color-contrast`. Coverage the sweep cannot see stays in the component file, the same pattern as open overlays. The canonical Toast demo mounts Provider, Portal, and Viewport so the empty Viewport is scanned. Open and high-priority toast axe stays in `toast.test.tsx`. Open Alert Dialog stays in `alert-dialog.test.tsx`. A static invalid Field demo is how the sweep sees `aria-invalid` and the error text. There is no live-region CI step, because axe cannot see announcements.

### The docs surface check

`apps/docs` holds a second test, decided on [Where the line falls between an Ultima component and docs-local page layout](https://linear.app/frankie-ramirez/issue/ULT-56) and specified there. It reads the source text of every file under `apps/docs/src` outside `demos/` and fails when a `stylex.create` call declares `backgroundColor`, a border color or width, `boxShadow`, or `borderRadius`, against an allowlist of the stated exceptions. It is the enforceable half of the rule that the docs may not paint a surface an Ultima component already paints, and it is what makes "site-local copies do not satisfy the release gate" a check rather than a promise. It reads source rather than rendering anything, so it costs nothing at runtime and needs no new CI step. Confirmed on [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs): v0.1 does not change it.

### The contrast gate

`packages/tokens/scripts/palette.py` runs in CI on every pull request, and it fails the build two ways: a non-zero exit on any pairing below its minimum, and a `--check` mode that regenerates into a temporary file and diffs against the committed `palette.json`. The first catches a palette change that breaks a pairing. The second catches a hand-edited value, which the Principles section forbids and which nothing else would notice.

That exit code exists. `palette.py` exits 1 on any failing pairing and 1 on a `--check` whose regeneration differs from the committed `palette.json`, so the Principles claim that contrast is a build gate is enforced rather than aspirational.

### The registry smoke install

The end-to-end install into a fresh Vite app and a fresh Next.js app is `scripts/smoke-install.sh`, the scripted form of what the ULT-8 prototype did by hand. It retired that prototype.

The smoke install scaffolds both frameworks and installs the released catalogue before building each consumer. It also installs `sidebar` alone into a fresh app and asserts that `dialog`, `@ultima/tokens`, and `@ultima/lib` arrive with it, added on [What the expanded v0 catalogue changes about the proof bar and the release gate](https://linear.app/frankie-ramirez/issue/ULT-58). Sidebar is v0's first component that composes another Ultima component, `registryDependencies` is derived from imports rather than declared, and a whole-catalogue install would mask a wrong derivation until a consumer hit it. Settled on [ULT-85](https://linear.app/frankie-ramirez/issue/ULT-85/what-v01-changes-about-the-proof-bar-the-release-gate-and-the-docs): the script still enumerates every `registry:ui` item from the served `registry.json` into both Vite and Next.js. It does not switch to a representative subset. A second composition target is added only when a v0.1 item gains a `registryDependencies` edge onto another Ultima item; none do today. It runs on a weekly cron, on `workflow_dispatch`, and on pull requests that change registry inputs: `registry/static/**`, `registry/items.config.ts`, the registry build and smoke scripts, `packages/ui/src/**`, `packages/tokens/**`, workspace dependency manifests, or the lockfile. Component imports and token changes can affect generated dependencies or compilation, so source changes must trigger the check. A green run covering the expanded catalogue is required before tagging a release.

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

It was written after the first v0 components landed, for the reason it had to be: a skill with no components to pattern-match against is guesswork. Because it encodes the conventions rather than pointing at them in one place only, it versions with them, so a release that moves a rule moves the skill in the same pass. v0.1's eight-item proof bar and its one reduced-motion exception reached it on the assembly ticket.

### The audit skill

Mana's `ultima` audit skill and this design system share a name and nothing else. The relationship runs one way, and through documents only.

The audit skill already reads a repository's `CONTEXT.md`, `docs/adr/`, and decision documents as its prior-decisions block, and already profiles a project for its design-system source of truth and its token values. Ultima's whole obligation is to keep those documents where that profile looks, and to publish `tokens.json` in a shape a generic parser can read.

The audit skill gets no Ultima-aware branch: no import, no special case, no lens that knows the word `mithril`. A project built on Ultima audits well because Ultima's tokens are legible, not because the tool was taught about them. Teaching it Ultima's tokens as a lens was ruled out on [Mana report adoption](https://linear.app/frankie-ramirez/issue/ULT-13) and stays ruled out.
