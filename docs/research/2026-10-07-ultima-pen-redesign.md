# Which ultima.pen frames make up the October 2026 docs redesign, and what do they assume?

## Findings

`ultima.pen` now holds the redesign only: the frames of the September audit ([2026-09-19-ultima-pen-audit.md](2026-09-19-ultima-pen-audit.md)) and the earlier studio screens were deleted once these superseded them. The file is encrypted, so read it through the pencil MCP server with the pen.dev app open. Every frame paints with the `$ult-*` canvas variables, which mirror the semantic tokens in `packages/tokens/dist/tokens.json`.

### Theme model

The file has two theme axes, `mode` (`dark`, `light`) and `preset` (`site`, `ultima`, `neutral`, `cinder`). Every root page frame sets `preset: "site"` explicitly, because the file's default preset is `ultima`.

| Preset | Used for | Accent | Highlight and action |
| --- | --- | --- | --- |
| `site` | Docs chrome on every page | Neutral near-white (`#e7e8e9` dark, `#181a24` light) | Mana (`#44d4e1` dark, `#00818b` light) |
| `neutral` | Component demos and block previews | Near-white, the same as `site` | Zero-chroma greys (`#bebebe` dark, `#717171` light) |
| `ultima` | The Ultima preset in pickers | Shipped indigo (`#8394ff` dark, `#565fde` light) | Mana |
| `cinder` | The Theme Studio's example draft | Copper (`#e47f5c` dark, `#bc4614` light) | `#e8b181` dark, `#8f6846` light |

`site` is not a shipped preset. Neutral's near-white accent differs from the shipped Neutral, whose accent is zero-chroma arcane chosen by the generator (`presetDraft` in `packages/tokens/src/theme/draft.ts`). The `cinder` values are an OKLCH approximation for the mockups, not generator output. The radius variables use the decided Tight scale (1/2/4/6), where the shipped tokens are 2/4/10/12 (`packages/tokens/src/tokens.stylex.ts`).

### Frames

Section labels on the canvas number the groups.

| Group | Frame | ID |
| --- | --- | --- |
| 01 Landing | Desktop dark, the canonical landing | `dFeVc` |
| | Desktop light | `cxfxc` |
| | Mobile dark, mobile light | `RctCT`, `lXbco` |
| | Motion board: the dot field, hero reveal and hover states | `i124M` |
| 02 Component page | Button at 1440, the template | `iFNgl` |
| | Button at 1920, showing edge-pinned chrome | `P8O8AQ` |
| | Dialog at 1440, with the Anatomy tab | `zD2M1` |
| | Button on mobile, and the mobile navigation drawer | `Ha4tu`, `ujW5F` |
| 03 Blocks | Blocks index | `exLBC` |
| | Dashboard block page | `vyn3r` |
| | Dashboard block page in its Anatomy state | `WAxrI` |
| | Reusable 1200×760 block layouts: Dashboard 01, CRM 01, Settings 01, Sign-in 01 | `SzoSN`, `P4hdt`, `mmMDx`, `qtcCM` |
| 04 Components directory | The grouped directory | `E9XvL` |
| 05 Install and CLI | Install, CLI | `BArRX`, `kSP0G` |
| 06 Tokens and Palette | Tokens, Palette | `Y7tMFs`, `RVlBc` |
| 07 Rationale and Elements | Rationale, Elements | `o44txG`, `S8UHQ` |
| 08 Theme Studio | Cinder draft: recipe rail, live canvas, hover inspection, checks footer | `j9lMy` |
| | Compare | `jl9Jw` |
| | Draft report with a failing override | `v3IcM` |
| | Export dialog with the failing-draft acknowledgment | `Qg1Ir` |
| | Mobile gallery, mobile editor drawer | `AC4gA`, `b40uCP` |
| 09 Global search | Command palette, empty query | `tZy0v` |
| | Results for "button", with a preview pane | `CekIX` |
| | Mobile results | `t1aKl` |

Shared components: `jtyo2` and `ZHs9g` are the site header with and without the appearance control, `n4ZINm` holds the button variants (`l2yJUo`, `xSOGe`, `Li60t`), and the block layouts above are reusable so the index thumbnails and block pages stay in sync. Supporting assets live under `ultima-assets/`: the dot-field shader at `shaders/dot-field.glsl` (the `@time` and `@mouse` uniforms drive drift and the cursor glow) and the block thumbnails under `blocks/`.

### Redrawn to match the contracts

[Redraw the frames the decisions changed](https://github.com/frankieramirez/ultima/issues/685) redrew these frames in place, so every frame ID above still holds. Where a frame and a contract disagreed, the frame now follows the contract.

- **Blocks.** `SzoSN` has uppercase stat labels, one accent fill on every bar, the "Show data" disclosure, a Sidebar trigger, an outline Export, and layers named Toggle Group, Input Group and Select. `P4hdt` has one "Add note" button and a count of 7. `mmMDx` drops the quiet-hours calls row. `qtcCM` drops the dot texture and divides its columns with a Separator. The thumbnails under `ultima-assets/blocks/` are re-exported from these four.
- **Block numbers.** CRM 01 is 001, Dashboard 01 002, Settings 01 003 and Sign-in 01 004. `exLBC` orders its cards that way, and global search (`CekIX`, `t1aKl`) lists blocks in the same order.
- **Block pages.** `vyn3r` and `WAxrI` carry number 002, the title "Dashboard 01", the descriptor's description, the eight files under `components/dashboard-01/`, Built from in number order with the Chart recipe, a desktop and narrow toggle, and an Anatomy tab. `WAxrI` draws one outline and one label per Built from entry, as title and number with no merged labels, and puts the "Label components" switch and the legend under the preview.
- **Components directory.** `E9XvL` orders its groups Forms, Overlays, Data display, Navigation, Feedback and Layout, and sorts each group alphabetically.
- **Docs menu.** Every docs sidebar and the mobile drawer `ujW5F` list Foundations, then the components under their six group labels, with no item numbers. The drawer is 256px on `surface`, with no search field and no theme row.
- **Component pages.** `iFNgl`, `P8O8AQ`, `zD2M1` and `Ha4tu` drop the Playground, Tokens it reads and the rail links. The Button frames end with the full Web component section in place of the "Using plain HTML?" card.
- **Landing.** `dFeVc`, `cxfxc`, `RctCT` and `lXbco` drop "Components ship in Neutral" and "DEFAULT · NEUTRAL" for the shipped lede and "IN USE · THIS SITE". The plate head shows the component's group, and a mobile index row opens its component page.
- **Foundations.** `RVlBc` drops its rail and uses the full content width. `Y7tMFs` drops the Values and Copy as toggles, the role ramp grid and the preset callouts, lists all 52 color tokens as rows with both generated values, and gains the Pairings section. `S8UHQ` drops the React and HTML comparison, the prop-mapping table and the fact cards for the shipped prose.

### Decisions made while designing

These came from the maintainer during the design session and stand unless a ticket amends them.

- Components display in Neutral, as shadcn does, so the site reads as a themeable kit rather than a brand.
- The docs chrome uses `site`: Neutral's accent with Ultima's mana as the highlight. The hero's "interfaces." and the landing dot field carry the mana.
- The landing dot field is coloured with mana, not grey.
- Radius is the Tight scale, 1/2/4/6.
- Search fields have no grey fill, and the sidebar has no filter field.
- On docs pages the logo aligns with the sidebar text at 24px, header items sit at the viewport edges, both sidebars stay pinned to the edges, and the content column centres with an 840px maximum. Where a sidebar divider meets the header, the lines join.
- Blocks is a new section (Dashboard, CRM, Settings, Sign-in), installed through the shadcn registry as shadcn's Blocks are.
- Anatomy, labelled parts over a dimmed preview, appears on component pages (Dialog's parts) and on block pages (a block's components, with catalogue numbers).

### What the frames assume that the spec does not yet say

- A `site` chrome theme, against the consumer default contract's example that the docs apply Ultima ([#614](https://github.com/frankieramirez/ultima/issues/614)).
- Neutral's accent as near-white rather than zero-chroma arcane.
- Tight radius 1/2/4/6, which nearly equals the studio's `sharp` Shape preset (0/2/4/6).
- A Blocks registry item kind, block pages, and anatomy data for each block.
- A Components directory grouped by kind (Forms 20, Overlays 11, Data display 9, Navigation 5, Feedback 5, Layout 4), where the docs menu groups by release.
- A global search that indexes components, elements and blocks, shows a preview with the install command, and cross-references the blocks that use a component.
- An animated dot field behind the landing hero, drawn in Pen by a GLSL shader, with drift, a cursor glow and a focus that fades toward the copy.
- Theme Studio behaviour the studio spec lacks: the recipe rail layout, the checks barcode, the draft report sheet, and a "closest passing value" fix.

## Sources

- `ultima.pen`, read through the pencil MCP server on 2026-10-07.
- `packages/tokens/src/theme/draft.ts`, `packages/tokens/src/tokens.stylex.ts`, `docs/spec/theme-studio.md` and `registry/metadata/` at `0e31eac`.
