# Theme studio

Status: implemented. [Map: Ultima theme studio](https://github.com/frankieramirez/ultima/issues/204) resolved every decision; [Build: Ship the Ultima theme studio](https://github.com/frankieramirez/ultima/issues/220) owns implementation. Contracts were amended on [#234](https://github.com/frankieramirez/ultima/issues/234) where the `ultima.pen` Final design diverged from them. This document is the specification: agreed scope, contracts, and the first-release acceptance criteria, each verified by the checked-in suite.

## Consumer default amendment

[The consumer default contract](ultima.md#consumer-default-theme), accepted on [Decide the consumer default theme and separation from Ultima branding](https://github.com/frankieramirez/ultima/issues/614), specifies a future Neutral starting draft and an explicit Ultima preset. It also requires versioned resolution that preserves existing saved drafts before changing defaults. Studio now starts fresh sessions with Neutral. The global consumer base palette remains unchanged; its rollout is separate. References to stock below describe legacy v1 behavior. Preset selection and Reset behavior remain owned by [the complete preset decision](https://github.com/frankieramirez/ultima/issues/615).

## Complete theme preset amendment

Decided on [Decide the complete theme preset catalogue and its quality bar](https://github.com/frankieramirez/ultima/issues/615). Status: implemented in Studio. This amendment specifies the complete-theme catalogue and supersedes the stock Reset behavior for version-2 drafts. It does not change the existing guided controls, custom theme generation, Shuffle, or the export acknowledgment for a user-owned failing draft.

### Initial catalogue

Ship four complete presets. Their IDs are stable and lowercase; names are display labels. Each definition supplies every guided field in `ThemeDraft`, both color modes through shared scale seeds, empty overrides and shuffle seeds, and six unlocked groups. The status scale seeds remain the existing verdant, ember, and ruin seeds unless a later separately validated revision changes them. Values below are the first definitions, each with immutable preset revision 1. A recipe revision is a separate identity.

| ID and label | Neutral, accent, action scale seeds as `(hue, saturation)` | Typography | Density, shape, elevation, motion |
| --- | --- | --- | --- |
| `neutral` · Neutral | Achromatic mithril, arcane, and mana (`saturation: 0`); generator chooses contrast-safe lightness. Revision 2 adds the Ink accent fill (see [Neutral revision 2](#neutral-revision-2)) | Existing Ultima font stacks, 16px base, stock scale, default leading/tracking | `1`, `default`, `1`, `1` |
| `ultima` · Ultima | Existing stock mithril `(276, 1)`, arcane `(275, 1)`, mana `(204, 1)`, including its legacy brand pins | Existing Ultima font stacks, 16px base, stock scale, default leading/tracking | `1`, `default`, `1`, `1` |
| `grove` · Grove | Mithril `(145, 0.15)`, arcane `(140, 0.8)`, mana `(75, 0.75)` | `Georgia, 'Times New Roman', Times, serif`; system mono stack; 16px base, `1.2` scale, loose leading, default tracking | `1.25`, `round`, `0.5`, `1.5` |
| `cinder` · Cinder | Mithril `(32, 0.15)`, arcane `(28, 0.85)`, mana `(45, 0.75)` | `'Segoe UI', 'Helvetica Neue', Arial, sans-serif`; system mono stack; 16px base, `1.125` scale, compact leading/tracking | `0.75`, `sharp`, `1.5`, `0.6` |

The system mono stack is `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Neutral is the fresh consumer and empty-session default; Ultima remains an explicit choice for the original indigo/cyan appearance. Grove and Cinder provide green/earthy and warm/copper directions with different typography, density, shape, elevation, and motion. Action and highlight continue to share mana, and status colors keep their semantic meaning. These are full themes, not color swatches or suggested combinations. The current recipe passes all declared token pairings for Grove and Cinder with these seeds; Recipe 2 resolves Neutral without brand pins; all four revision-1 and all four revision-2 presets pass the 49-pair gate in both modes. Recipe 1 remains frozen for legacy v1 drafts.

### Neutral revision 2

Decided on [Decide Neutral's accent shade](https://github.com/frankieramirez/ultima/issues/643). Status: implemented. Neutral revision 2 is revision 1 with the accent fill set to Ink, so its accent is the text color as shadcn's primary is. Every other field stays the same as revision 1.

**Accent fill** is a new guided Color field with two values: `hue` reads the accent roles from the arcane scale as before, and `ink` reads them from the mithril scale. Any preset or custom draft can set it. Ink maps accent and accent-text to mithril step 12, accent-subtle to step 3, and accent-border to step 7. Hover and active are two generated mithril steps at step 12's lightness offset by −0.06 and −0.11 in dark mode and +0.08 and +0.14 in light mode, at mithril's hue and step-12 chroma. Accent-contrast is chosen by the generator as for every role. The focus ring stays on arcane step 9 under both fills. The field needs draft document version 3; version-2 drafts decode as `hue`. The Ink steps are reachable only from a version-3 draft with `ink`, so Recipe 2's output for every existing draft is unchanged and no recipe revision is added. Color Shuffle rerolls scale seeds only and never changes the accent fill.

Generated Neutral revision 2 values, all 49 pairings passing in each mode (weakest accent pairing 10.68):

| Token | Dark | Light |
| --- | --- | --- |
| `accent` | `#e8e8e8` | `#1b1b1b` |
| `accent-hover` | `#d4d4d4` | `#2e2e2e` |
| `accent-active` | `#c4c4c4` | `#3d3d3d` |
| `accent-subtle` | `#1e1e1e` | `#f2f2f2` |
| `accent-border` | `#4d4d4d` | `#b7b7b7` |
| `accent-text` | `#e8e8e8` | `#1b1b1b` |
| `accent-contrast` | `#0e0e0e` | `#fdfdfd` |

Revision 1 stays resolvable with its grey accent (`#9e9e9e` dark, `#717171` light). Fresh sessions and the preset picker select revision 2. Saved, shared, downloaded, and registry-item revision-1 drafts keep their values and Reset to revision 1; moving one to revision 2 is an explicit selection recorded as a history entry. The registry's default theme file moves to revision 2 when regenerated. The redesign frames draw Neutral's accent with Ultima's tinted mithril 12 (`#e7e8e9`, `#181a24`); the build uses the generated values above.

### Identity, selection, and recovery

Preset identity is `{ id, revision }`, separate from document and recipe versions.

Revision 2, decided on [Decide the default radius scale and respace the Shape presets](https://github.com/frankieramirez/ultima/issues/644) and implemented, moves every preset to the version-3 Shape table. Each revision-2 definition repeats its revision-1 fields apart from shape, except that Neutral's also sets Accent fill to `ink` ([Decide Neutral's accent shade](https://github.com/frankieramirez/ultima/issues/643)). Revision 2 exists only in draft document version 3: `neutral` takes `default` (Tight), `ultima` takes `soft` (the corners it already has), `grove` keeps `round`, and `cinder` takes the new square `sharp`. Revision 1 of every preset stays resolvable in version-2 documents through the frozen shape table. A v1 or v2 draft never migrates on open, autosave, import, or share-link restore. Reset theme returns it to its own revision. It moves to version 3 only when the user explicitly selects a preset, as one new history entry. Downloaded CSS, StyleX, and `DESIGN.md` files keep their values until regenerated. Implementation adds a version-2 fixture per preset and proves every resolved token in both modes is unchanged after reopening. Adding that metadata to a draft requires a new supported document version; it must not reinterpret v1 fields. Keep each shipped preset revision resolvable so a saved draft can reset to the same definition after the catalogue grows. Editing a field retains its preset origin and shows it as edited; the draft itself holds the exact current values. A user can still build a custom theme without selecting a preset.

Selecting a preset copies its entire definition into the working draft, replacing all guided values, per-mode overrides, locks, and shuffle seeds. It is one committed whole-draft history entry, so Undo restores the former draft and Redo restores the selection. Do not let a lock or override from the old draft survive selection. Autosave writes the selected draft on commit; the existing warning for opening a different external draft remains separate.

Whole-draft **Reset theme** returns to the active preset's exact revision in one undoable entry, clearing edits, overrides, locks, and shuffle seeds. Group Reset returns only that group to the same preset definition and clears its group overrides while keeping other groups and history intact. For a custom draft with no preset origin, Reset returns to Neutral. Legacy v1 drafts retain their old resolved output and their original Ultima reset baseline until the user explicitly selects a new preset. An imported v1 draft must not be silently assigned a different recipe or preset.

Autosave, downloaded JSON, the registry item's JSON, and fragment share links carry both the preset identity and the full draft. Reopening any of them restores exact values in both modes, including an edited preset and legacy v1 drafts. Unknown preset revisions fail with a named unsupported-version result; they never fall back to the current revision. A preset catalogue update is opt-in for existing drafts and generated files. Selecting a newer revision is an explicit new history entry.

### Release bar and consumer guidance

Every shipped revision must pass all 49 declared token pairings in **each** mode at full precision, including focus, action, and status pairs. The palette values come from the generator; no hand edits to emitted palettes or tokens can make a failing preset pass. Verify reduced-motion collapse and rendered focus and interaction states in both modes. The current recipe's Grove and Cinder seeds passed the token gate during this decision, but that local check is only candidate evidence; it does not establish installed-consumer or new-recipe behavior.

For every preset, compare the preview's computed values with the full CSS, compiled StyleX, and registry-installed output in both modes, including portal content and post-hydration rendering in a real consumer fixture. Assert that the downloaded and shared drafts reopen to the same values, that undo/reset/locks follow the rules above, and that legacy v1 drafts keep every resolved token. A failing preset revision blocks release. The existing explicit acknowledgment remains available only for user-owned failing drafts; it cannot waive a shipped preset failure.

Each preset's docs and export dialog state its exact sans and mono stacks, preferred face, fallbacks, and that Ultima does not load fonts. Neutral and Ultima prefer Figtree for sans and IBM Plex Mono for mono, with system fallbacks; Grove and Cinder use installed/system faces. Consumer instructions show how to load a preferred face when desired and how to apply the chosen theme through CSS, StyleX, or the registry item. The theme-adoption guidance belongs to [Decide a complete theme adoption path for people and agents](https://github.com/frankieramirez/ultima/issues/616).

## Destination

An agreed visual prototype and implementation-ready specification for editing Ultima design variables, previewing live components, exploring coordinated random themes, and exporting or installing the result in an existing application.

## Scope

The user delegated planning choices with “you pick.” The first release targets existing Ultima applications. Users start with grouped controls and expand them to edit individual semantic tokens. The groups are color, typography, density, shape, elevation, and motion; what each can change is settled under Contracts.

The editor keeps a stable appearance around the themed preview. Dark is the starting mode, and light receives the same attention. The visual direction is a compact editor beside a large application preview, with component scenes and an optional dark/light comparison. The prototype must settle the layout and interactions.

The complete-theme picker sits above one Shuffle row with a variation selector. Subtle keeps changes near the current settings; Broad explores the allowed ranges. The selector explains these choices when opened. Undo, Redo and the draft fingerprint share the quieter row beneath. Color roles use two columns with a swatch beside each label. Slider tracks leave room for endpoint thumbs and their focus rings inside the scrolling editor.

Shuffle supports locks and undo under the resolved contract below. Export and installation must reproduce the preview, including the supported color modes and font requirements.

Follow [Ultima's principles](ultima.md#principles): use production Ultima controls, StyleX and Base UI, stable semantic names, generated palettes, and contrast checks. Additional tokens or reusable controls must acquire their own contracts when the design identifies them.

This work contributes to “3. v1 dependable default” on [Roadmap: Ultima as the dependable default](https://github.com/frankieramirez/ultima/issues/161), as a candidate representative application. It does not complete the roadmap's core coverage or versioning commitments.

## Contracts

### Theme controls and token relationships

Decided on [#207](https://github.com/frankieramirez/ultima/issues/207).

Six guided groups: color, typography, density, shape, elevation, and motion. Every group pairs bounded controls with an expandable list of exact per-token overrides covering the themeable tokens it touches. Generation inputs are shared across modes: one parameter set produces both mode palettes. Overrides are stored per mode, the editor edits both by default, and a token can be unlinked per mode.

A token stays derived until it is overridden. The step convention derives role states, subtle backgrounds, borders, and text variants from the generated scales. The generator picks each `-contrast` on-color by its mithril1-or-mithril12 rule, `border-focus` follows the accent scale's step 9, and `surface-overlay` follows `surface-raised` at its fixed per-mode alpha and is not directly editable. An override pins the resolved value in that mode and survives regeneration and Shuffle until reset. Each token row shows its overridden state, and each group resets as a whole.

Color. Each of the six scales takes a scale seed: a hue from 0 to 359 and a saturation factor from 0 to 150 percent of the recipe's per-mode chroma peak, set from a picked sRGB color or edited as sliders. Lightness tables and per-step chroma fractions stay recipe internals, and the two brand pins apply to the stock palette only. The action and highlight roles share the mana scale, so one seed moves both; they diverge only through token overrides. Studio controls label each scale by role (Neutral, Accent, Action, Success, Warning, Danger) while the palette names are unchanged (amended on [#234](https://github.com/frankieramirez/ultima/issues/234)). Exact color overrides accept opaque sRGB values only, since alpha compositing has no contract yet. The accent fill (`hue` or `ink`) chooses whether the accent roles read arcane or the neutral scale ([Neutral revision 2](#neutral-revision-2)).

Typography. Family controls cover `sans` and `mono` through preset stacks and a custom stack field; a theme never loads a face, so a custom stack declares names only. Base size sets `text` step 5 within 14 to 18 px. A scale preset is either Ultima's stock proportions or a geometric ratio of 1.125, 1.2, 1.25, or 1.333 applied around the base; derived steps round to 0.25 px and ship in rem. Leading and tracking offer compact, default, and loose presets that remap the existing `leading-*` and `tracking-*` tokens. Weights have no guided control and remain reachable as overrides.

Custom font stacks are non-empty, comma-separated family names and generic fallbacks, such as `Geist, 'Noto Sans 日本語', sans-serif`. Names may be unquoted words or quoted strings, with CSS escapes for spaces, quotes, and Unicode characters. CSS whitespace, including line breaks, is accepted between names and after hexadecimal escapes. The shared draft parser applies this contract to `typography.sans`, `typography.mono`, and both modes of the `--ult-font-sans` and `--ult-font-mono` overrides. It rejects empty families, malformed quoting, line breaks inside quoted names, comments, functions and URLs, other control characters, and the declaration or markup delimiters `;`, `{`, `}`, `<`, and `>`. Quoted punctuation that stays within a family name is accepted. Invalid stacks cannot be imported from a draft, share fragment, or installation URL.

Density. Three presets scale all twelve `space` steps: compact 0.75, cosy 1, and roomy 1.25, snapped to 0.5 px with a 1 px floor. Control heights follow because they read space steps 9 to 11. Density is independent of typography and never touches `text`, leading, or radius.

Shape. In draft document version 3, four radius presets set xs, sm, md, and lg: `sharp` 0/0/0/0, `default` 1/2/4/6 (the Tight scale), `soft` 2/4/10/12, and `round` 6/10/16/24 px. Versions 1 and 2 keep the earlier three, resolved through a frozen table: `sharp` 0/2/4/6, `default` 2/4/10/12, and `round` 6/10/16/24. A draft stores its shape by name, so the name means what its document version says and never what the current table says. `radius-full` is fixed at 9999 px and never scales. Per-token overrides accept 0 to 96 px. Amended on [Decide the default radius scale and respace the Shape presets](https://github.com/frankieramirez/ultima/issues/644); status: implemented.

Elevation. One strength factor scales the alpha of every shadow layer in both modes while geometry stays fixed. Presets are flat 0, subtle 0.5, default 1, and pronounced 1.5 on a 0 to 2 range; flat emits `none`, and overlays still carry their borders. Raw shadow strings remain editable as per-mode overrides.

Motion. One speed factor scales the default values of `fast`, `base`, `slow`, and `loop`, snapped to 10 ms. Presets are brisk 0.6, default 1, and gentle 1.5 on a 0.5 to 2 range. Reduced-motion values never change: the 1 ms and 0 s collapse is a fixed contract. Easings, border widths, and z-index stay compile-time and unreachable.

Additions. No new token groups: all six controls write existing themeable tokens. The generator gains a seed input contract, per-scale hue and saturation with pins disabled, and the pairing manifest and full-precision gate the research requires validate final overridden values in both modes. Guided controls compose existing components. The color field is the Color Field catalogue component and the mode-linked token row a studio-local composition, settled under Studio support components and compositions below.

### Shuffle, manual overrides, and validation

Decided on [#209](https://github.com/frankieramirez/ultima/issues/209).

Shuffle runs at two levels: each guided group carries its own shuffle, and one global Shuffle rerolls every unlocked group in one action. All randomness flows through a seeded generator, and every shuffle records its seed in its history entry so replay and shared drafts reproduce the exact result. Guided parameters, overrides, and the recipe version fully determine output; the seed records the stochastic path.

A color shuffle is a bounded search. Each attempt draws fresh seeds for every unlocked scale together, holds locked scales fixed, and accepts only a candidate that passes the full pairing gate in both modes; a rejected candidate redraws. After 50 failed attempts the search is exhausted: the shuffle changes nothing and reports the failing pairings plus the locks that constrained it. The other groups cannot fail the gate, so their shuffle draws once within each control's range. A shuffle never applies a failing candidate and never releases a lock.

Two variation modes. Broad draws fresh parameters uniformly across each control's range. Subtle perturbs the current draft: hue by ±15 degrees, saturation by ±15 points on the 0 to 150 factor, preset groups to an adjacent preset, factored groups (elevation, motion) by ±0.1, and typography by ±1 px of base size or an adjacent scale preset.

Locks live at group level. A locked group is untouched by every shuffle. Token-level locking needs no separate affordance because a token override already pins its value through regeneration and shuffle. Lock state belongs to the draft and rides history and shared configuration.

Undo and redo form one linear, per-session history of whole-draft snapshots. Every committed mutation pushes one entry: guided edits, override sets and resets, group resets, lock changes, and shuffles, with continuous drags coalescing into one entry on commit. A shuffle entry stores its seed, so redo replays identically. Editing after undo truncates the redo tail, and the history caps at 100 entries. Persistence across sessions belongs to the export contract.

One shuffle generates both modes from shared seeds, and a candidate must pass in both to be accepted. The modes diverge only through per-mode overrides.

The shared pairing manifest (49 pairs per mode, including the action pairs, compared at full precision) runs per candidate inside a color search, on every committed guided edit, override, or reset in both modes, and at export. Nothing validates mid-keystroke. Results display per pairing in the draft report and on the offending token rows, and the checks footer summarizes them ([layout](#theme-studio-layout-and-live-preview)). APCA may be reported beside the pairings as advice and is never authoritative.

A draft may sit invalid: a committed edit that fails the gate applies and is marked rather than blocked. Export stays available; the export flow lists the failing pairings and proceeds only after an explicit acknowledgment, and the artifact records the draft faithfully. The contrast gate still decides what Ultima itself ships, the stock palette and registry themes, while a studio draft is consumer-owned output. A passing report means the declared token pairs meet WCAG 2.2 AA; it does not establish accessibility of rendered compositions, which remains the axe sweep's domain, and studio copy says token contrast rather than accessible theme.

#### Fixing a failing pairing

Decided on [Decide which Theme Studio redesign behaviors amend the studio spec](https://github.com/frankieramirez/ultima/issues/650). Status: implemented. The draft report offers two fixes on each failing pairing. Each names the token it changes, its **target**: the pairing's overridden token, or its foreground when both or neither are overridden. A pairing whose preferred target is not directly editable targets the other token.

**Use closest passing value** moves the target to the nearest lightness that passes. It holds the target's current OKLCH hue and chroma and scans lightness from its current value in steps of 0.001, outward in both directions, across 0 to 1. Each candidate is gamut-mapped by the recipe's own rule (chroma reduced to the sRGB boundary at that lightness) and quantized to `#rrggbb`. A candidate is accepted only when it passes every declared pairing the target takes part in, in that mode, at full precision after quantization. Fixing one pairing must not break another. The smallest lightness distance wins; at an equal distance, the candidate with the higher ratio against the failing partner wins. The search is deterministic, so a fixture can pin its output.

The fix writes an override in each failing mode only, searching each mode independently. A linked row stays linked when both modes resolve to the same value, and otherwise unlinks with the other mode's value kept. The whole fix is one committed history entry and revalidates like any edit. It ignores group locks, which constrain Shuffle only. When no lightness passes, the action is disabled and says that no lightness at this hue passes every pairing for that token. Edit opens the exact token field as before.

**Reset to derived** clears the target's override in both modes, as the token row's reset does. It is offered only when the target is overridden.

### Theme studio layout and live preview

Amended on [Decide which Theme Studio redesign behaviors amend the studio spec](https://github.com/frankieramirez/ultima/issues/650); status: decided, not yet implemented. The October 2026 frames in `ultima.pen` (08 Theme Studio in the [frame index](../research/2026-10-07-ultima-pen-redesign.md): `j9lMy`, `jl9Jw`, `v3IcM`, `Qg1Ir`, `AC4gA`, `b40uCP`) are the visual source. They supersede the [September design revision](../research/2026-09-29-theme-studio-design-revision.md) and the earlier single-scene default and docked specimen strip.

Desktop has a stable editor rail that follows the site color mode beside an independently scrolling live collage. The collage shows account creation, projects, calendar, team settings, notifications, conversation, typography, interaction states, an empty state, commands, status messages and progress. Its column width accounts for the draft’s spacing and the seven-day calendar grid, reducing the column count as space permits. The calendar day grid shrinks within a narrow container while preserving all seven columns. Each top-level gallery tile reads `--ult-shadow-md`, so the Elevation control visibly changes the collage in both modes, from Flat to Pronounced. Focused Workspace, Typography, Controls, Surfaces, Overlays, States and Motion views remain available.

The frames call the editor rail a "recipe rail". The spec keeps **editor rail**, because "recipe" already names the palette generator's versioned recipe and, in `CONTEXT.md`, a release-checklist composition.

The editor rail runs, top to bottom: the complete-theme picker, the Shuffle row, the Undo, Redo and fingerprint row, then the six groups stacked in one scrolling region in the fixed order Color, Typography, Density, Shape, Elevation, Motion. Every group is reachable by scrolling the rail alone. Each group's header carries its name, a summary of its current values, and its lock, shuffle and reset controls. Accent's seed controls and Set exact role colors sit inside Color. The Shape control lists the presets of the draft's document version: four for version 3, the frozen three for versions 1 and 2.

These choices belong to the build, which follows the frames where they do not conflict with a contract: rail width, whether a group collapses, any group selector on desktop, icons, the size and spacing of the checks marks, and where the draft report's sheet sits. The frames' Cinder draft illustrates the layout; a fresh session still starts on Neutral. The frames' colors approximate the generator, and the build uses generator output.

Dark, Light and Compare apply one working draft. Compare shows the same compositions in both modes; each pane owns its theme variables and Base UI portal container. The surrounding editor uses the docs' [`site` theme](ultima.md#the-docs-site-theme) in the site’s current color mode, including System. The site’s existing color-mode control updates the rail, toolbar, footer and studio dialogs; preview mode remains independent. Token inspection remains opt-in. Hovering or focusing an inspectable example opens an Ultima Hover Card anchored to that example, inside its preview pane and color mode. Gallery inspect buttons also open it on tap. The card names each token the example reads with its resolved value in that pane's mode, without consuming space beneath the preview, permits moving the pointer into its contents, and closes on Escape, leaving the pane, disabling inspection or changing scenes.

Below 840 px, the gallery starts with a persistent Edit theme action. The modal drawer keeps the preset identity, group selector, checks and close control reachable around a scrolling editor. Escape and Close return focus to Edit theme. The frames draw the group selector as chips, one group shown at a time. All six groups remain available, with guided controls expanded on demand and exact per-mode overrides beneath them.

The checks footer reports the current working draft's declared token checks. It replaces the rail's inline validation panel. It shows the pass count as text, which is the accessible result, and a strip of marks, one per pairing per mode: the dark results in manifest order, then the light. Failing marks paint in danger. The mark count comes from the manifest (98 for 49 pairings), never a constant. The strip is `aria-hidden` and holds no focusable mark; View draft report is the way in.

The draft report is a modal sheet that returns focus to its trigger. It lists failures first with both modes' full-precision ratios and thresholds, then the passing pairings. Each failure offers the fixes under [Fixing a failing pairing](#fixing-a-failing-pairing) and opens the corresponding exact token field in the report. It never navigates to the stock palette report. Local persistence status reflects the write result; failed writes preserve the working draft, announce the problem and offer a draft download.

Palette source inputs are separate from generated colors. Generate derives the hue/saturation ramp and keeps the source visible; a description and derived dark/light samples explain changed lightness. Set exact role colors opens the corresponding override row. Visible role names identify Neutral, Accent, Action, Success, Warning and Danger.

### Studio font choices

The sans selector includes Figtree, Geist, Inter, Roboto, Source Sans 3, IBM Plex Sans and Space Grotesk, alongside the existing system, serif and humanist stacks. The mono selector includes IBM Plex Mono, Geist Mono, Roboto Mono, JetBrains Mono and System. Custom stacks remain editable. Selecting a family writes the same stack to both draft modes and participates in undo and autosave.

The docs site self-hosts the named faces. `apps/docs/src/styles.css` declares the additional Latin variable fonts; browsers fetch a face when a preview uses it. These files come from the [Google Fonts distribution](https://github.com/google/fonts): `ofl/geist`, `ofl/inter`, `ofl/roboto`, `ofl/sourcesans3`, `ofl/geistmono`, `ofl/robotomono` and `ofl/jetbrainsmono`. Each family’s OFL license ships beside its WOFF2 file in `apps/docs/public/fonts/`. Existing bundled faces retain their existing assets and licenses. Exports carry the chosen stacks; consumers supply the font files as described in the export dialog.

### Theme export, installation, and recovery

The export dialog caps its height at 48rem and the viewport minus 4rem, with a fixed close control and scrolling body. Install is the default tab; Files & fonts holds individual artifacts, font-loading details and the fingerprint. Body copy uses the 16px stock text step. Shell commands and framework imports use the same highlighted, copyable code fences as the component documentation. The encoded install command stays on one line in a keyboard-scrollable code block. Application checks expand on demand.

Decided on [#210](https://github.com/frankieramirez/ultima/issues/210).

The serialized draft document is the one versioned artifact every surface derives from. It carries the guided parameters, per-mode overrides, group locks, the seed each shuffle recorded, the recipe version, and a top-level `version` field, starting at 1. Preview, download, installation, and reopening all read this document; resolved token values are products of it and never the editable form. It downloads as `ultima-theme.json`.

The recommended installation copies `npx shadcn@latest add "<origin>/r/theme.json?theme=<encoded-draft>"`, followed by concrete Vite or Next imports, mode activation and production browser checks. The URL carries the complete versioned draft using the same deflate and base64url encoding as Share, including overrides and locks. The displayed seed is a fingerprint and cannot reconstruct a draft. The viewport-bounded export dialog keeps its title and Close action fixed above a scrolling body. Individual files remain secondary downloads: the draft document; `ultima-theme.css`, a full-value stylesheet; `ultima-theme.stylex.ts`, typed themes; `DESIGN.md`, the theme's design document; and `ultima-theme.registry.json`, a universal `registry:item` carrying the stylesheet at `~/ultima-theme.css`, the draft at `~/ultima-theme.json`, and the design document at `~/DESIGN.md`, installed with `npx shadcn add ./ultima-theme.registry.json`. The StyleX module is a plain download rather than part of the item. The registry download remains the fallback when URL encoding is unavailable, the complete URL exceeds 2,048 characters, or the decoded draft exceeds 64 KiB. URL installation uses the same export acknowledgment gate as downloads. On a failing draft, the export dialog lists the failing pairings above the acknowledgment. Until it is checked, the install steps stay visible but their copy controls and every download are disabled, not merely dimmed. A shipped preset's failure cannot be acknowledged ([release bar](#release-bar-and-consumer-guidance)).

Cloudflare Pages serves `/r/theme.json` through the generated `dist/_worker.js`. It decodes and validates the query, then returns the same registry item as the file serializer. It stores no themes. Missing, malformed or unsupported drafts return JSON errors; decoding stops at 64 KiB. GET and HEAD are supported. The docs build emits `_routes.json` with only this endpoint included, so other routes remain static assets. Configure Pages to run `pnpm --filter @ultima/docs build` from the repository root and publish `apps/docs/dist`; the worker and routing file ship in that output. The Vite development server exposes the same handler, and production verification executes the built worker.

The stylesheet mirrors the tokens CSS export: `:root` carries the dark defaults with a `@media (prefers-color-scheme: light)` light block, explicit `[data-theme="dark"]` and `[data-theme="light"]` blocks carry full resolved values for all seven themeable groups, each mode block sets `color-scheme`, and a trailing `prefers-reduced-motion` block pins the fixed collapse values (1ms on fast, base, and slow; 0s on loop). The file is unlayered and imported after the StyleX output, so it wins on the same element; a nested `stylex.props` theme still owns its subtree. Activation is the existing `data-theme` attribute on the root; the artifact introduces no second switch.

The StyleX module emits one `createTheme` per themeable group per mode. Same-group themes do not merge token by token, so each theme carries the group's full resolved values. They are exported as `ultimaTheme.dark` and `ultimaTheme.light` plus a per-mode `colorScheme` style, and the consumer applies all of a mode's themes on the root or a subtree. The file must sit in a compiler-included path; `lib/` satisfies the Next.js include list.

Fonts are stack strings only. Nothing in any artifact loads a face, which extends the existing typeface contract. Parity is measured on the resolved stack, not on glyphs: the preview applies the stack as written and notes when a stack's preferred face is absent from the document, so it shows the same fallback an unequipped consumer sees. The export dialog lists the declared faces and says loading them is the consumer's.

Installed files are consumer-owned generated artifacts. Updating a theme regenerates and reinstalls, overwriting the files wholesale rather than merging; the CLI's existing overwrite prompt stands. Hand edits to the installed files belong to the consumer and are lost on reinstall. The draft is the editable source, and every install carries its current copy.

The studio autosaves the draft to local storage on every committed change and restores it silently on return; the state fingerprint on the shuffle bar makes the restored draft visible. A corrupt autosave is quarantined to a backup key with a notice rather than discarded. An uploaded draft that fails to parse, or that declares an unknown version, is refused with the reason named; no partial load. Loading an external draft replaces the current one as a single history entry, and the studio warns first when a differing autosaved draft exists.

Shareable URLs ship in the first release as fragment-encoded drafts, `#theme=<deflate, base64url>`. Opening one loads that theme. When the encoded draft exceeds a conservative safe length, the share control says so and offers the draft file instead. Share links continue to load drafts from the browser fragment. Installation puts the encoded draft in the registry endpoint query so the CLI can fetch it.

Parity is observable, not assumed. One resolver turns the draft into the per-mode resolved token table that feeds both the preview boundary and every serializer. The check: for a corpus of reference drafts, every `--ult-*` declaration in the exported stylesheet equals `getComputedStyle` on the preview boundary in that mode, the compiled StyleX module resolves the same values in a fixture application, and the reduced-motion block carries the fixed values. Portals mount inside each pane's theme boundary per the layout contract.

Every generated artifact opens with a header comment naming the studio version, the draft version, and the draft fingerprint. An invalid draft still exports after the acknowledgment the validation contract requires, and its artifacts say the source draft failed pairings.

#### Design MD export

Theme Studio derives `DESIGN.md` from the same resolved draft as its CSS and StyleX exports. It lists dark and light semantic token values, font stacks, shape, spacing, motion, and component-use guidance. A failed token-contrast draft carries the same warning in the document and follows the existing export acknowledgment gate. `DESIGN.md` is available as an individual download and is included at the project root in both the URL-installed and downloaded theme registry items. The editable JSON draft remains the source for regeneration; reinstalling can replace the document.

The `design-md` registry item installs a default document generated from the compiled StyleX token values. It is an explicit, consumer-owned design artifact. It does not replace the hosted conventions or the `ultima-design` skill. This is the exception to ADR 0005's root-document rule, recorded in that ADR's 2026-09-29 amendment.

#### Agent maintenance and export provenance

Decided on [Decide how agents discover and maintain a product theme](https://github.com/frankieramirez/ultima/issues/727). The exports implement versioned provenance and generated regions. The [consumer agent workflow](ultima.md#discover-and-maintain-the-product-theme) owns discovery and repairs; `doctor --theme` is a separate slice.

Future exports retain the existing draft format and resolved values. Add versioned provenance comments to CSS and StyleX and a delimited generated region to `DESIGN.md`. Record the exporter version, document version, recipe version, preset id/revision when present, source kind and a SHA-256 digest of a canonical serialization of the complete draft. Define and version that serialization once in the shared codec; presentation formatting cannot change identity. Keep the short fingerprint for display. It cannot establish freshness or reconstruct the draft.

Use `<!-- ultima-theme:generated:start v1 -->` and `<!-- ultima-theme:generated:end -->` to delimit the document's generated content, with source metadata and a generated-content digest inside the region. Define that content digest over the region's content excluding the digest field itself. Values, font responsibility, contrast warning and source identity belong inside it. Consumer prose outside it belongs to the product. The compiled-default document uses the same region convention with source kind `compiled-default` and a digest of the complete resolved default tables in both modes; it must never claim a Studio draft identity.

Source paths are consumer-local associations: trace imports and any explicit project links, and compare contents. Studio cannot know a file's final path after installation. A source digest proves which draft an artifact records; comparing its actual content proves whether edits have changed it. Identical short fingerprints and copied headers cannot establish parity.

Serializers emit complete files for download and registry installation. Agent maintenance extracts the generated region, checks for consumer edits and applies a reviewed targeted patch. Existing shadcn overwrite behavior remains available when the consumer explicitly accepts replacing whole files. The consumer CLI stays read-only and never manages a root document.

Existing CSS, StyleX and design documents remain usable. A legacy file with no strong provenance receives content comparison when a supported draft can be associated; absence of metadata alone never triggers a reinstall. Adding provenance to an export does not migrate its draft version, recipe, preset revision or token values. Malformed, unknown or unsupported sources remain unresolved and keep their existing exports. Legacy unmarked documents require prose-preserving targeted edits. Verification must cover retained consumer prose, edited generated regions, copied headers, canonical digest stability and unchanged v1/v2 resolved values in both modes.

##### Provenance v1 wire contract

The shared codec defines `CANONICAL_SERIALIZATION_VERSION = 1`: UTF-8 JSON with recursively sorted object keys, original array order, JSON string escaping and JSON scalar serialization, without presentation whitespace. `draftDigest` is the lowercase, 64-character SHA-256 of that serialization of the complete draft, including locks and shuffle seeds. The saved draft format and display fingerprint are unchanged. SHA-256 uses the browser-compatible `@noble/hashes` implementation so synchronous Studio exports and Node builders share the same codec.

CSS and StyleX carry `/* ultima-theme:provenance v1 <canonical JSON> */`. Design documents use the HTML-comment form inside the generated region. Registry items record the same object in `meta.ultimaTheme`, alongside the complete installed CSS, draft JSON and design document. The object records `version`, `exporterVersion`, `documentVersion` (the design-document format), `serializationVersion` and `sourceKind`. A `studio-draft` source also records `draftVersion`, `recipeVersion`, `preset` (id/revision or null) and `draftDigest`. A `compiled-default` source records `resolvedDigest`, the SHA-256 of both complete compiled tables; it has no Studio draft, preset or recipe identity.

Inside the region, `<!-- ultima-theme:content-digest sha256:<digest> -->` records the SHA-256 of the bytes between the boundary comments, excluding that digest comment and its terminating LF. The opening LF and all source metadata, token values and prose inside the region participate in the digest. `parseGeneratedRegion` detects edits and rejects missing, duplicate or unsupported markers. `refreshDesignRegion` replaces only an intact supported region and preserves every outside byte, including line endings. It refuses edited, unmarked and unresolved documents so callers must supply a reviewed patch for those cases. Download serializers and the compiled-default builder still emit complete files; they never manage a consumer's root document.

`theme/provenance` exports the parsers and region helpers. `theme/compare` exports `compare(draft, { kind, content })` for CSS, StyleX, registry and design artifacts. Its result separates source status from `contentMatches` and region integrity. A supported associated legacy artifact remains `unlinked` even when content matches. Linked artifacts report `current`, `stale` or `modified`; unknown identities remain `unresolved`. Comparison checks complete emitted content, rather than trusting copied headers or a recalculated region digest. It ignores provenance and display headers for payload comparison and excludes consumer prose outside a marked region. Other formatting changes conservatively count as content differences. Legacy registry items that predate DESIGN.md retain their two-file comparison. This API performs no file writes or repairs.

### Studio support components and compositions

Decided on [#217](https://github.com/frankieramirez/ultima/issues/217).

Every keyboard-reachable control in the studio is a catalogue component; nothing in the editor is built from plain elements. The prototype's mappings hold: segmented presets are `ToggleGroup.Root` and `ToggleGroup.Item` under single selection with an `aria-label` naming the group; group locks and the token row's link toggle are `Toggle`, the `ghost` variant for the icon buttons; a group's token-override section is `Collapsible`; hue, saturation, and base-size controls are `Slider`; the family preset is `Select`; free-text entries are `Input`; Shuffle, undo, redo, and reset are `Button`; the export dialog is `Dialog`.

Color Field joins the catalogue as `color-field.tsx`, the one component this contract adds, added to the v0.2 checklist for the studio's demonstrated need. Its value is an opaque sRGB `#rrggbb` string, controlled or uncontrolled under Base UI's `value`, `defaultValue`, and `onValueChange` naming, with no alpha, matching the override contract. `ColorField.Root` carries the value and `size` in context. `ColorField.Swatch` is the styled trigger that paints the current value and opens the picker. `ColorField.Input` is the styled hex entry and the part that fills Field's control slot, so invalid hex carries the validation state. `ColorField.Portal`, `ColorField.Positioner`, and `ColorField.Popup` mirror Popover's styled split. `ColorField.Picker` is a custom sRGB picker presented inside the popup: a two-dimensional saturation and brightness area, a hue slider, and HEX, RGB, and HSL channel fields (amended on [#234](https://github.com/frankieramirez/ultima/issues/234)). The value stays an opaque sRGB `#rrggbb`; the designs' multi-format picker with alpha is declined on [#237](https://github.com/frankieramirez/ultima/issues/237). `size` is the only axis. The hue and saturation sliders the color group shows beside a seed stay studio-local: a scale seed is studio semantics, not the component's value.

The mode-linked token row stays studio-local. It answers no question outside the studio's per-mode override model, so it is neither a catalogue item nor a documented composition. It composes `ColorField` for color tokens and `Input` for the rest, with a `Toggle` link and a `Button` reset. A row is linked by default and shows one input writing both modes. Unlinking splits the shared value into a dark and a light input. Relinking writes the dark value to both modes, dark-first, and rides undo like every other committed edit. The row marks overridden state, and its reset clears both modes.

The boundary has three tiers. A control a consumer could need outside the studio is a catalogue component; this contract adds only Color Field. An arrangement bound to studio semantics is a studio-local module composing catalogue controls and painting its own surfaces: the token row, the group header cluster, the shuffle bar, the checks footer and draft report, the inspector readout, and the preview-pane scaffold. The editor is an application surface rather than docs page layout, so the component line does not forbid its surfaces. Everything around the studio route remains page layout under the existing line. The editor inherits the [`site` theme](ultima.md#the-docs-site-theme) from the docs, so chrome reads `--ult-*` tokens in the site's current mode and never the draft; the draft theme's reach ends at the preview-pane boundary, which is also the per-pane Base UI portal container.

## First-release acceptance criteria

Assembled on [#210](https://github.com/frankieramirez/ultima/issues/210) from the settled contracts, completed by [#217](https://github.com/frankieramirez/ultima/issues/217).

- The six guided groups edit the themeable tokens under their contracts, with expandable per-mode token overrides that survive regeneration and shuffle.
- Group and global shuffle run seeded, accept only color candidates that pass the full pairing gate in both modes, honor locks absolutely, and report exhaustion without applying anything. One linear undo history of at most 100 entries replays shuffles identically from their recorded seeds.
- The pairing manifest runs at full precision in both modes on every committed change and at export. An invalid draft exports only after an explicit acknowledgment listing the failing pairings, and studio copy says token contrast rather than accessible theme.
- The editor is the rail layout with dark, light, and compare panes, a large live component collage plus focused scene tabs including Workspace and States, the draft status bar with whole-draft reset, portals mounted inside each pane's theme boundary, opt-in token inspection, and the persistent shuffle bar, opening an editor drawer from the mobile gallery under 840 px.
- The versioned draft document is the single source of truth. The export dialog produces `ultima-theme.json`, `ultima-theme.css`, `ultima-theme.stylex.ts`, `DESIGN.md`, and `ultima-theme.registry.json`, and both the copied URL command and `npx shadcn add ./ultima-theme.registry.json` install the stylesheet, draft, and design document into a project root without requiring `components.json`.
- For a corpus of reference drafts, every exported `--ult-*` declaration equals the preview boundary's computed value in that mode, in both the stylesheet and the compiled StyleX module, including shadow values and the fixed reduced-motion durations.
- Autosave restores the draft across sessions, a corrupt autosave is quarantined with a notice, a malformed or unknown-version upload is refused with a named reason, and a fragment share link reopens its draft.
- Every keyboard-reachable editor control is a catalogue component under the mappings in the support contract, Color Field ships from the v0.2 checklist, the mode-linked token row is a studio-local composition, and studio chrome follows the `site` theme while the draft theme stays inside the preview-pane boundary.

Research supports those decisions:

- [Generated theme installation and preview parity](https://github.com/frankieramirez/ultima/issues/205).
- [Runtime palette generation and contrast validation](https://github.com/frankieramirez/ultima/issues/206).

## Out of scope

The map ends before production implementation and build-ticket filing. The first-release specification excludes new-project scaffolding, accounts, cloud libraries, a public theme marketplace, arbitrary component-source editing, and compatibility with unrelated design systems. Alpha and wide-gamut color in overrides and the Color Field picker are likewise excluded; the designs' proposed contract is declined on [#237](https://github.com/frankieramirez/ultima/issues/237).

## Research constraints

[Runtime palette research](../research/2026-09-19-runtime-theme-palette.md) establishes that the current recipe accepts fixed parameters, not arbitrary seed colors. A browser port can preserve its equations, but must prove numerical parity, including gamut mapping and quantization. Changing hue alone can fail the current gate, so the Shuffle contract must handle unsuccessful generation and conflicting locks.

The current Python and TypeScript gates differ in pairing coverage and threshold rounding. The runtime contract must define one pairing set, including action colors, and compare full-precision ratios before formatting. Validate final overridden values in both modes. Passing the declared token pairs does not establish accessibility for every rendered composition. These constraints shaped the control and validation contracts; the research itself did not settle their UX.

[Installation research](../research/2026-09-19-theme-installation.md) verifies that current shadcn tooling accepts a downloaded self-contained registry JSON file. This fits the static docs host; arbitrary hosted installation URLs require additional infrastructure. Copying a file still requires application imports and theme activation. The export decision remains open.

Preview and export must resolve complete mode values, including shadows and reduced motion. Existing StyleX mode themes override only color, and same-group themes do not merge token by token. Font delivery and portal containment also affect parity. The prototype and export contracts must address those boundaries and specify browser and consumer-install verification; the research itself does not prove end-to-end parity.
