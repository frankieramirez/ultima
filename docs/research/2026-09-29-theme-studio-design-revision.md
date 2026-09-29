# Theme Studio design revision

Status: implemented for PR review. The saved pen.dev canvas in `ultima.pen` supplied the desktop, mobile and export designs. The earlier assessment scored the existing experience 25/40 and identified four high-priority gaps: preview coverage, starting themes and exact-color editing, current-draft feedback, and application guidance.

The user chose a large component collage, a compact complete-preset picker with previews and an edited-state label, and revisions to desktop, mobile and export designs before implementation.

## Revised screens

Open `ultima.pen` in pen.dev. These frames supersede the earlier Studio layouts. Original frames are preserved under `Archive 2026-09-29` names. The old compare reference and alpha/wide-gamut color studies are historical references, not the revised contract.

| Frame | Purpose | Captured preview |
| --- | --- | --- |
| `umu8k` | Desktop component collage, dark mode | [Desktop](../../.scratch/studio-review/revised-designs/umu8k.png) |
| `eX3Fb` | Same compositions, light mode | [Light mode](../../.scratch/studio-review/revised-designs/eX3Fb.png) |
| `hnT9m` | Matching dark and light comparison panes | [Comparison](../../.scratch/studio-review/revised-designs/hnT9m.png) |
| `ioTca` | Compact complete-preset picker open | [Preset picker](../../.scratch/studio-review/revised-designs/ioTca.png) |
| `Y1ClP1` | Mobile gallery with reachable editor action | [Mobile gallery](../../.scratch/studio-review/revised-designs/Y1ClP1.png) |
| `LQLXJ` | Mobile editor drawer over the gallery | [Mobile editor](../../.scratch/studio-review/revised-designs/LQLXJ.png) |
| `NWu3E` | Desktop export and installation, full scroll content | [Export](../../.scratch/studio-review/revised-designs/NWu3E.png) |
| `a2BO0c` | Mobile export and installation, full scroll content | [Mobile export](../../.scratch/studio-review/revised-designs/a2BO0c.png) |
| `uW4F5` | Palette generation, exact overrides, failing checks and save recovery | [Editing and recovery](../../.scratch/studio-review/revised-designs/uW4F5.png) |
| `RUDDo` | Explicit acknowledgment before exporting a failing custom draft | [Failing export](../../.scratch/studio-review/revised-designs/RUDDo.png) |

The shown draft is an edited Ultima preset. Neutral remains the accepted empty-session default. Showing Ultima in these frames does not change that decision.

## Preview and editing

The desktop preview uses three columns of varied compositions: an account form, notification controls, typography, status messages, a project table, calendar, interaction states, progress, team settings, conversation, an empty state and command navigation. The collage replaces the one-scene default and docked specimen strip. It gives users several visible contexts for each edit.

The editor and preview scroll independently. The application should fill the viewport; these canvas frames show the complete gallery content. On narrower desktop widths, reduce the gallery to two columns before falling back to one. Keep focused Typography, Overlays, States and Motion views for diagnosis, and keep token inspection opt-in. Compare renders the same examples in both modes, with each pane owning its theme and portal container.

Mobile starts with the gallery and a persistent Edit theme action. The drawer keeps preset identity and draft checks visible while group content scrolls. The group selector includes Color, Type, Density, Shape, Elevation and Motion. Escape and Close restore focus to Edit theme. Use at least 44px touch targets; icon size alone does not establish that target.

The compact preset picker shows Neutral, Ultima, Grove and Cinder with small theme previews and short descriptions. Selection replaces the entire draft in one undoable entry. The active label retains the preset origin and adds Edited when values differ. Reset returns to that exact preset revision; imported legacy drafts keep their existing reset baseline until an explicit selection. The accepted [preset amendment](../spec/theme-studio.md#complete-theme-preset-amendment) owns schema, migration and history details.

Color roles have visible names: Neutral, Accent, Action, Success, Warning and Danger. Generating a palette from a source color derives a ramp; the resulting role color can differ from the entered color. The detail screen makes that transformation explicit and shows a separate Set exact role colors path. Exact overrides stay per mode and remain pinned through shuffle. Existing opaque-sRGB validation, mode linking, group locks and reset behavior still apply.

Preserve all six guided groups and their granular token overrides. The collage is a broader preview, not a reduction of the editor's controls.

## Feedback and recovery

The footer reports the current working draft's declared token checks. View draft report opens those results, with failing pairings first. Each failure names its mode, foreground/background tokens, ratio and threshold, and links to the corresponding editable value. It must not navigate to the stock palette report at `/tokens`.

Save status comes from the actual persistence result. Show Saved on this device only after a successful write. When storage is unavailable, preserve the in-memory draft, announce the failure and offer Download draft. Do not let an old successful status conceal a later failed write.

Shuffle exhaustion leaves the draft and history unchanged and points to locks or pinned values worth reviewing. A custom failing draft retains the explicit export acknowledgment. A shipped preset failure cannot be waived through that acknowledgment.

The mobile repair path uses the same report and exact-value controls inside the drawer; this proposal does not add a separate mobile validation system. Retain malformed-import refusal, corrupt-save recovery and oversized-share fallback behavior when implementing the new layout.

## Export and application

The primary path is Download registry file, install it, apply the stylesheet, then check the installed result. Individual draft JSON, CSS and StyleX files remain secondary downloads. Keep the editable JSON and explain reinstall/overwrite behavior.

Framework selection shows the concrete Vite, Next `app/` or Next `src/app/` import example from [Theme adoption](../spec/ultima.md#theme-adoption). Put the generated theme after StyleX in the production cascade. The mode controls explain that system mode removes `data-theme` from `html`; explicit dark or light mode sets it. Scoped StyleX usage links to the full-group and portal-container guidance.

The check step includes `npx ultima-design doctor` and `npx ultima-design check`, followed by a production-browser comparison of the root, an Ultima control and a popup in both explicit modes and system mode. Include focus, other interaction states and reduced motion. Command success does not prove that the browser applied the theme.

The export carries font stacks and does not load font files. Show preferred faces and fallbacks for the actual draft. Neutral and Ultima use the current Figtree sans face and IBM Plex Mono. Grove and Cinder retain their accepted system/installed stacks.

The export frames show all scroll content. Implementation bounds the dialog to the viewport, keeps its heading and Close action reachable, and scrolls the body. Framework buttons and copy/download controls require their usual selected, focus, pending, success and error states.

## Validation and implementation gates

Canvas inspection checked dark, light and compare examples, the preset popup, mobile gallery/editor, both export layouts and failure recovery. A final bounds pass found no clipped descendants in the ten revised frames and no intersections between revised frames and other top-level frames. PNGs are captures of static designs. Displayed token counts and ratios illustrate states; they are not calculated proof for a new theme.

The earlier development exploration exercised locks, history, comparison and portal dismissal, downloads and JSON reopening, normal autosave, sharing, malformed imports and failing-export acknowledgment. A controlled storage failure reproduced the misleading save status. An unresolved `waitForRepaint` TypeError appeared in the dev log. Those observations are diagnostic evidence, not a release result.

Before rollout, implement and verify the revised flows against the accepted default, preset and adoption contracts. Preserve every resolved legacy-v1 token before introducing a new recipe or document schema. Require both-mode preset pairing gates, lossless save/share/download reopening, CSS/compiled-StyleX/registry parity, production-rendered consumer and portal checks, reduced-motion preservation, and keyboard/mobile behavior. Use the repository verification records and runners for formal evidence.

## Implementation and proof

The implementation replaces the default specimen strip with a responsive live collage while retaining focused preview tabs and token inspection. Desktop keeps the editor beside the gallery; mobile opens the editor in a modal drawer. Editor popups inherit the Studio's stable dark theme, and preview popups inherit their own dark or light pane.

Complete presets use document version 2 and recipe 2, with immutable revision-1 origins. Fresh Studio sessions start with Neutral. Recipe 1 and legacy-v1 documents retain their existing resolved values and exact generated artifacts. The global consumer base palette has not changed.

Palette generation now has a separate source input and an explicit Generate action. Exact per-mode overrides remain available. The draft report opens editable failures in place. Autosave reports the actual write result and offers a draft download when local storage fails. Canceling a different import preserves the current history.

Export leads with the registry item, concrete framework imports and production checks. JSON, CSS and StyleX remain available. The browser tests cover preset selection/reset/undo, exact editing, save recovery, export acknowledgments, share/import recovery, responsive bounds and portal containment. The token fixtures preserve pre-change legacy-v1 values and byte-identical exports, and the parity suite compares generated CSS and compiled StyleX across all four presets.

`node --experimental-strip-types scripts/smoke-theme.ts` installs each preset through the actual shadcn registry flow into Vite, Next `app/` and Next `src/app/` projects. All 12 project/preset combinations passed production builds and post-hydration checks of 105 token values on the root, a control and a popup in explicit dark/light and system dark/light modes, with keyboard focus and reduced motion. Painted property comparisons normalize CSS minifier representations and precision; these checks do not claim byte-identical built CSS or loaded-font glyph parity. This standalone consumer run is separate from the repository's registered verification result.

The PR records the final repository checks and captures of the production Studio. Canvas PNGs remain static design references. Deployment and a new global consumer default are separate work.
