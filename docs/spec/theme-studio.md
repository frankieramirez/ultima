# Theme studio

Status: implemented. [Map: Ultima theme studio](https://github.com/frankieramirez/ultima/issues/204) resolved every decision; [Build: Ship the Ultima theme studio](https://github.com/frankieramirez/ultima/issues/220) owns implementation. Contracts were amended on [#234](https://github.com/frankieramirez/ultima/issues/234) where the `ultima.pen` Final design diverged from them. This document is the specification: agreed scope, contracts, and the first-release acceptance criteria, each verified by the checked-in suite.

## Destination

An agreed visual prototype and implementation-ready specification for editing Ultima design variables, previewing live components, exploring coordinated random themes, and exporting or installing the result in an existing application.

## Scope

The user delegated planning choices with “you pick.” The first release targets existing Ultima applications. Users start with grouped controls and expand them to edit individual semantic tokens. The groups are color, typography, density, shape, elevation, and motion; what each can change is settled under Contracts.

The editor keeps a stable appearance around the themed preview. Dark is the starting mode, and light receives the same attention. The visual direction is a compact editor beside a large application preview, with component scenes and an optional dark/light comparison. The prototype must settle the layout and interactions.

Shuffle supports locks and undo under the resolved contract below. Export and installation must reproduce the preview, including the supported color modes and font requirements.

Follow [Ultima's principles](ultima.md#principles): use production Ultima controls, StyleX and Base UI, stable semantic names, generated palettes, and contrast checks. Additional tokens or reusable controls must acquire their own contracts when the design identifies them.

This work contributes to “3. v1 dependable default” on [Roadmap: Ultima as the dependable default](https://github.com/frankieramirez/ultima/issues/161), as a candidate representative application. It does not complete the roadmap's core coverage or versioning commitments.

## Contracts

### Theme controls and token relationships

Decided on [#207](https://github.com/frankieramirez/ultima/issues/207).

Six guided groups: color, typography, density, shape, elevation, and motion. Every group pairs bounded controls with an expandable list of exact per-token overrides covering the themeable tokens it touches. Generation inputs are shared across modes: one parameter set produces both mode palettes. Overrides are stored per mode, the editor edits both by default, and a token can be unlinked per mode.

A token stays derived until it is overridden. The step convention derives role states, subtle backgrounds, borders, and text variants from the generated scales. The generator picks each `-contrast` on-color by its mithril1-or-mithril12 rule, `border-focus` follows the accent scale's step 9, and `surface-overlay` follows `surface-raised` at its fixed per-mode alpha and is not directly editable. An override pins the resolved value in that mode and survives regeneration and Shuffle until reset. Each token row shows its overridden state, and each group resets as a whole.

Color. Each of the six scales takes a scale seed: a hue from 0 to 359 and a saturation factor from 0 to 150 percent of the recipe's per-mode chroma peak, set from a picked sRGB color or edited as sliders. Lightness tables and per-step chroma fractions stay recipe internals, and the two brand pins apply to the stock palette only. The action and highlight roles share the mana scale, so one seed moves both; they diverge only through token overrides. Studio controls label each scale by role (Neutral, Accent, Action, Success, Warning, Danger) while the palette names are unchanged (amended on [#234](https://github.com/frankieramirez/ultima/issues/234)). Exact color overrides accept opaque sRGB values only, since alpha compositing has no contract yet.

Typography. Family controls cover `sans` and `mono` through preset stacks and a custom stack field; a theme never loads a face, so a custom stack declares names only. Base size sets `text` step 5 within 14 to 18 px. A scale preset is either Ultima's stock proportions or a geometric ratio of 1.125, 1.2, 1.25, or 1.333 applied around the base; derived steps round to 0.25 px and ship in rem. Leading and tracking offer compact, default, and loose presets that remap the existing `leading-*` and `tracking-*` tokens. Weights have no guided control and remain reachable as overrides.

Density. Three presets scale all twelve `space` steps: compact 0.75, cosy 1, and roomy 1.25, snapped to 0.5 px with a 1 px floor. Control heights follow because they read space steps 9 to 11. Density is independent of typography and never touches `text`, leading, or radius.

Shape. Radius presets sharp, default, and round set xs, sm, md, and lg to 0/2/4/6, 2/4/10/12, and 6/10/16/24 px. `radius-full` is fixed at 9999 px and never scales. Per-token overrides accept 0 to 96 px.

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

The shared pairing manifest (49 pairs per mode, including the action pairs, compared at full precision) runs per candidate inside a color search, on every committed guided edit, override, or reset in both modes, and at export. Nothing validates mid-keystroke. Results display per pairing in a validation panel and on the offending token rows. APCA may be reported beside the pairings as advice and is never authoritative.

A draft may sit invalid: a committed edit that fails the gate applies and is marked rather than blocked. Export stays available; the export flow lists the failing pairings and proceeds only after an explicit acknowledgment, and the artifact records the draft faithfully. The contrast gate still decides what Ultima itself ships, the stock palette and registry themes, while a studio draft is consumer-owned output. A passing report means the declared token pairs meet WCAG 2.2 AA; it does not establish accessibility of rendered compositions, which remains the axe sweep's domain, and studio copy says token contrast rather than accessible theme.

### Theme studio layout and live preview

Decided on [#208](https://github.com/frankieramirez/ultima/issues/208); amended on [#234](https://github.com/frankieramirez/ultima/issues/234) and [#269](https://github.com/frankieramirez/ultima/issues/269). The `ultima.pen` Final design (frames `umu8k`/`ioTca`) is the visual contract; the throwaway prototype at `apps/docs/public/theme-studio-prototype.html` is superseded and kept only as a technical reference.

The editor is a compact left rail beside a large preview. The Rail variant won over Inspector, a right-hand column, and Sheet, a bottom drawer. Below roughly 840 px every layout converges to a bottom sheet with the preview on top and the editor as a drawer under it; inside the sheet a horizontal group selector replaces the stacked group list. The sheet shares its height by scrolling rather than squeezing: each preview pane keeps a floor of 16rem, the editor keeps its own minimum, and the Studio body scrolls between them while the document itself stays still.

The studio shares the site header: docs navigation, status, and the GitHub link render on this route as on every other, and the sidebar root mounts with its rail collapsed so the same mobile menu opens below the breakpoint. A workbench sub-bar under it carries the product title, the autosave state, and Open, Share, and Export actions, with no repeated brand mark. The draft name slot is dropped until drafts can be named. The pinned dark theme begins at the sub-bar, so the shared header follows the user's color-mode preference.

The mode control offers dark, light, and compare. Compare renders two panes side by side, stacked when narrow, each forced to one mode and sharing one theme state so every control edits both at once.

The preview shows one scene at a time under a tab strip: Workspace, Typography, Controls, Surfaces, Overlays, States, and Motion. Workspace is an application-mock scene exercising composed components; the States scene renders rest, hover, and active variants, and live interaction still works everywhere. Each pane is a preview canvas (settled on [#374](https://github.com/frankieramirez/ultima/issues/374)): the scene centres in the pane's full height and scrolls on its own, and a theme specimen strip carrying type, interaction, and inspect specimens docks at the canvas foot under a `Separator`. Overlays render inside each pane's theme boundary, and the production build mounts Base UI portals into a per-pane container rather than relying on the prototype's in-pane markup.

A persistent status bar bottoms the editor: a token-contrast report link, which modes the draft is editing, override and lock counts, and a whole-draft Reset theme that restores the stock draft (guided parameters, overrides, and locks) as a single history entry.

Token inspection is opt-in. An Inspect tokens toggle turns hovering into a readout listing the `--ult-*` variables an element reads and their resolved values in that pane's mode.

A persistent shuffle bar tops the editor with Shuffle, a broad or subtle variation toggle, undo, redo, and a state fingerprint. Locks sit on group headers, and each group carries its own shuffle action, matching the Shuffle contract.

Every control is a native focusable element: segmented presets are toggle groups, Escape dismisses dialogs, and focus rings come from the token set. The studio chrome keeps a fixed dark editor appearance regardless of preview theme or mode, and paints its own surfaces without introducing a component.

The prototype runs a browser port of the palette recipe, the same OKLCH math and lightness and chroma tables, which exercises the parity approach the runtime-palette research recommends and shows seeds and Shuffle regenerating coordinated scales live.

Component findings: the color field and the mode-linked token row have no catalogue answer; [#217](https://github.com/frankieramirez/ultima/issues/217) owns whether they become components or compositions. Segmented presets map onto Toggle Group, lock toggles onto Toggle, and the export dialog onto Dialog.

### Theme export, installation, and recovery

Decided on [#210](https://github.com/frankieramirez/ultima/issues/210).

The serialized draft document is the one versioned artifact every surface derives from. It carries the guided parameters, per-mode overrides, group locks, the seed each shuffle recorded, the recipe version, and a top-level `version` field, starting at 1. Preview, download, installation, and reopening all read this document; resolved token values are products of it and never the editable form. It downloads as `ultima-theme.json`.

Four downloads: the draft document; `ultima-theme.css`, a full-value stylesheet; `ultima-theme.stylex.ts`, typed themes; and `ultima-theme.registry.json`, a universal `registry:item` carrying the stylesheet at `~/ultima-theme.css` and the draft at `~/ultima-theme.json`, installed with `npx shadcn add ./ultima-theme.registry.json`. The StyleX module is a plain download rather than part of the item, so installation adds no file the consumer did not choose. There are no hosted per-theme URLs: the registry JSON is only ever a file on disk, which keeps the static docs host sufficient.

The stylesheet mirrors the tokens CSS export: `:root` carries the dark defaults with a `@media (prefers-color-scheme: light)` light block, explicit `[data-theme="dark"]` and `[data-theme="light"]` blocks carry full resolved values for all seven themeable groups, each mode block sets `color-scheme`, and a trailing `prefers-reduced-motion` block pins the fixed collapse values (1ms on fast, base, and slow; 0s on loop). The file is unlayered and imported after the StyleX output, so it wins on the same element; a nested `stylex.props` theme still owns its subtree. Activation is the existing `data-theme` attribute on the root; the artifact introduces no second switch.

The StyleX module emits one `createTheme` per themeable group per mode. Same-group themes do not merge token by token, so each theme carries the group's full resolved values. They are exported as `ultimaTheme.dark` and `ultimaTheme.light` plus a per-mode `colorScheme` style, and the consumer applies all of a mode's themes on the root or a subtree. The file must sit in a compiler-included path; `lib/` satisfies the Next.js include list.

Fonts are stack strings only. Nothing in any artifact loads a face, which extends the existing typeface contract. Parity is measured on the resolved stack, not on glyphs: the preview applies the stack as written and notes when a stack's preferred face is absent from the document, so it shows the same fallback an unequipped consumer sees. The export dialog lists the declared faces and says loading them is the consumer's.

Installed files are consumer-owned generated artifacts. Updating a theme regenerates and reinstalls, overwriting the files wholesale rather than merging; the CLI's existing overwrite prompt stands. Hand edits to the installed files belong to the consumer and are lost on reinstall. The draft is the editable source, and every install carries its current copy.

The studio autosaves the draft to local storage on every committed change and restores it silently on return; the state fingerprint on the shuffle bar makes the restored draft visible. A corrupt autosave is quarantined to a backup key with a notice rather than discarded. An uploaded draft that fails to parse, or that declares an unknown version, is refused with the reason named; no partial load. Loading an external draft replaces the current one as a single history entry, and the studio warns first when a differing autosaved draft exists.

Shareable URLs ship in the first release as fragment-encoded drafts, `#theme=<deflate, base64url>`. Opening one loads that theme. When the encoded draft exceeds a conservative safe length, the share control says so and offers the draft file instead. A fragment is never a CLI-fetchable item URL, so sharing needs no server.

Parity is observable, not assumed. One resolver turns the draft into the per-mode resolved token table that feeds both the preview boundary and every serializer. The check: for a corpus of reference drafts, every `--ult-*` declaration in the exported stylesheet equals `getComputedStyle` on the preview boundary in that mode, the compiled StyleX module resolves the same values in a fixture application, and the reduced-motion block carries the fixed values. Portals mount inside each pane's theme boundary per the layout contract.

Every generated artifact opens with a header comment naming the studio version, the draft version, and the draft fingerprint. An invalid draft still exports after the acknowledgment the validation contract requires, and its artifacts say the source draft failed pairings.

### Studio support components and compositions

Decided on [#217](https://github.com/frankieramirez/ultima/issues/217).

Every keyboard-reachable control in the studio is a catalogue component; nothing in the editor is built from plain elements. The prototype's mappings hold: segmented presets are `ToggleGroup.Root` and `ToggleGroup.Item` under single selection with an `aria-label` naming the group; group locks and the token row's link toggle are `Toggle`, the `ghost` variant for the icon buttons; a group's token-override section is `Collapsible`; hue, saturation, and base-size controls are `Slider`; the family preset is `Select`; free-text entries are `Input`; Shuffle, undo, redo, and reset are `Button`; the export dialog is `Dialog`.

Color Field joins the catalogue as `color-field.tsx`, the one component this contract adds, added to the v0.2 checklist for the studio's demonstrated need. Its value is an opaque sRGB `#rrggbb` string, controlled or uncontrolled under Base UI's `value`, `defaultValue`, and `onValueChange` naming, with no alpha, matching the override contract. `ColorField.Root` carries the value and `size` in context. `ColorField.Swatch` is the styled trigger that paints the current value and opens the picker. `ColorField.Input` is the styled hex entry and the part that fills Field's control slot, so invalid hex carries the validation state. `ColorField.Portal`, `ColorField.Positioner`, and `ColorField.Popup` mirror Popover's styled split. `ColorField.Picker` is a custom sRGB picker presented inside the popup: a two-dimensional saturation and brightness area, a hue slider, and HEX, RGB, and HSL channel fields (amended on [#234](https://github.com/frankieramirez/ultima/issues/234)). The value stays an opaque sRGB `#rrggbb`; the designs' multi-format picker with alpha is declined on [#237](https://github.com/frankieramirez/ultima/issues/237). `size` is the only axis. The hue and saturation sliders the color group shows beside a seed stay studio-local: a scale seed is studio semantics, not the component's value.

The mode-linked token row stays studio-local. It answers no question outside the studio's per-mode override model, so it is neither a catalogue item nor a documented composition. It composes `ColorField` for color tokens and `Input` for the rest, with a `Toggle` link and a `Button` reset. A row is linked by default and shows one input writing both modes. Unlinking splits the shared value into a dark and a light input. Relinking writes the dark value to both modes, dark-first, and rides undo like every other committed edit. The row marks overridden state, and its reset clears both modes.

The boundary has three tiers. A control a consumer could need outside the studio is a catalogue component; this contract adds only Color Field. An arrangement bound to studio semantics is a studio-local module composing catalogue controls and painting its own surfaces: the token row, the group header cluster, the shuffle bar, the validation panel, the inspector readout, and the preview-pane scaffold. The editor is an application surface rather than docs page layout, so the component line does not forbid its surfaces. Everything around the studio route remains page layout under the existing line. The editor's fixed appearance is Ultima's stock dark theme pinned on the editor subtree, so chrome reads `--ult-*` tokens and never the draft; the draft theme's reach ends at the preview-pane boundary, which is also the per-pane Base UI portal container.

## First-release acceptance criteria

Assembled on [#210](https://github.com/frankieramirez/ultima/issues/210) from the settled contracts, completed by [#217](https://github.com/frankieramirez/ultima/issues/217).

- The six guided groups edit the themeable tokens under their contracts, with expandable per-mode token overrides that survive regeneration and shuffle.
- Group and global shuffle run seeded, accept only color candidates that pass the full pairing gate in both modes, honor locks absolutely, and report exhaustion without applying anything. One linear undo history of at most 100 entries replays shuffles identically from their recorded seeds.
- The pairing manifest runs at full precision in both modes on every committed change and at export. An invalid draft exports only after an explicit acknowledgment listing the failing pairings, and studio copy says token contrast rather than accessible theme.
- The editor is the rail layout with dark, light, and compare panes, a scene tab strip including the Workspace and States scenes with the specimen strip, the draft status bar with whole-draft reset, portals mounted inside each pane's theme boundary, opt-in token inspection, and the persistent shuffle bar, converging to the bottom sheet under roughly 840 px.
- The versioned draft document is the single source of truth. The export dialog produces `ultima-theme.json`, `ultima-theme.css`, `ultima-theme.stylex.ts`, and `ultima-theme.registry.json`, and `npx shadcn add ./ultima-theme.registry.json` installs the stylesheet and draft into a project root without requiring `components.json`.
- For a corpus of reference drafts, every exported `--ult-*` declaration equals the preview boundary's computed value in that mode, in both the stylesheet and the compiled StyleX module, including shadow values and the fixed reduced-motion durations.
- Autosave restores the draft across sessions, a corrupt autosave is quarantined with a notice, a malformed or unknown-version upload is refused with a named reason, and a fragment share link reopens its draft.
- Every keyboard-reachable editor control is a catalogue component under the mappings in the support contract, Color Field ships from the v0.2 checklist, the mode-linked token row is a studio-local composition, and studio chrome pins the stock dark theme while the draft theme stays inside the preview-pane boundary.

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
