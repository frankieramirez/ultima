# How does mana's `ultima` skill style its HTML audit report, and what must an Ultima tokens CSS export contain for the report to adopt it without changing its render pipeline?

## Findings

**Lead answer.** The report is a single self-contained HTML file written by `cmd_render()` in `skills/ultima/scripts/ultima.sh`, which runs an inline `python3` heredoc. All styling lives in a Python string constant named `CSS` (lines 851-980) that the script injects verbatim into one `<style>` element in `<head>` (line 1107). There is no template file, no external stylesheet, no `@import`, no font link, and the script refuses to write any output containing `<script` (lines 1205-1207). The theme is a **single `:root{}` rule on line 852** that declares `color-scheme:dark` plus 21 custom properties; the other 128 lines of CSS reference those properties through 91 `var()` calls. So a tokens export from Ultima can be adopted with zero pipeline change if it is a plain CSS text fragment containing a `:root{...}` block that defines **exactly those 21 names** (list below), with the fragment substituted for, or prepended to, line 852. The report has **no light mode**: `color-scheme:dark` is hard-coded, there is no `prefers-color-scheme` query anywhere in the script (0 matches), and the only alternate rendering is an `@media print` rule (line 979) that flips the page to `#fff`/`#000` while leaving cards, chips, and code blocks on their dark values.

Beyond the `:root` rule, three other places hard-code colors and would drift from the export if it changed a value: a Python dict `COLOR` on line 825 that mirrors `--cyan`, `--amber`, and `--gray` as literals for inline `style=` attributes; a `#c96b6b` literal on line 1131 mirroring `--red`; and fourteen raw hex/rgba literals inside the CSS block itself (white hover states, the score-bar track, the before/after `pre` borders, the wins chips, two gradients, the print rule). Details and line numbers follow.

### How the CSS is embedded

| Fact | Where |
|---|---|
| `render` subcommand: writes `report.html` from `merged.json`, `profile.json`, `metadata.json`; "Inline CSS, no script tag, every field escaped" | `skills/ultima/scripts/ultima.sh:21-23` |
| `cmd_render()` shell function parses `--in`/`--out`, then execs `python3 - <<'PY'` with paths in env vars | `ultima.sh:786-802` |
| Python constant `CSS = """ ... """` (the whole stylesheet as a string literal) | `ultima.sh:851-980` |
| Injected into the document: `'<title>Ultima audit: %s</title><style>%s</style></head>' % (e(repo), CSS)` | `ultima.sh:1107` |
| Refuses to write output if `"<script" in text.lower()` | `ultima.sh:1205-1207` |
| Skill promise: "The report has inline CSS, no script tag, and no network dependency, so it opens from `file://` anywhere" | `skills/ultima/references/finish-audit.md:51` |
| Only python3 standard library; "no jq, no node, no pip package" | `ultima.sh:25-26` |
| Wordmark is an inline SVG string constant `WORDMARK` with its own hard-coded brand hexes (see Brand section) | `ultima.sh:827-849`, used at `1109-1111` |

Consequence: the CSS is neither generated from data nor read from a file at render time. It is source text inside a bash script inside a Python string. Adopting an export means either (a) pasting the export's text into line 852 at mana's build/release time, or (b) a small change so the Python reads a sibling `.css` file and concatenates it ahead of `CSS`. Option (a) is the literal "no pipeline change" path and constrains the export's text: it must not contain `"""` (it would terminate the Python literal) and should avoid backslashes (a non-raw Python string would interpret them).

### Every custom property the report declares (`ultima.sh:852`)

All 21 live in one `:root{}` rule alongside `color-scheme:dark`. Grouped by role. "Refs" is how many `var()` calls inside lines 853-980 read the property.

**Surface**

| Name | Value | Refs | Used for |
|---|---|---|---|
| `--bg` | `#0b0d17` | 4 | `body` background (854), page gradient base (856), `ul.ev code` background (924), `pre` background (944) |
| `--card` | `#101323` | 1 | `.card` background (907) |
| `--glass` | `#10132399` | 3 | `.lens` tile (882), `ol.rank li` row (897), `.cov` panel (967) |
| `--tab` | `#0e1020` | 2 | `.tabs` segmented control (888), `table.plain thead tr` (954) |
| `--hover` | `#171b33` | 1 | `ol.rank li:hover` (898) |
| `--row` | `#181b33` | 3 | table row dividers `table.tok td` (936), `table.plain td` (956), `.card footer` border (951) |

**Text**

| Name | Value | Refs | Used for |
|---|---|---|---|
| `--fg` | `#e4e7f5` | 2 | `body` color (854), `ol.rank a` (900) |
| `--soft` | `#d3d7ec` | 4 | `.inner p` (920), `ul.ev code` (924), `pre` (944), `.start .pick p` (975) |
| `--muted` | `#9ba1c6` | 5 | `.lede` (868), `.tabs label` (890), `.chip` (914), `table.plain .l` (959), `.start .dimmed` (977) |
| `--dim` | `#7b81a8` | 15 | every uppercase label: `h4` (863), `.stat span` (872), `dt` (874), `.lens .s` (885), `.empty` (894), `.num` (899), `.sc` (905), `table.tok th` and `.at` (935, 939), `.conv` (947), `.card footer` (951), `table.plain th` (955), `ul.list .why` and `.tag` (964, 966), `.foot` (978) |

**Accent**

| Name | Value | Refs | Used for |
|---|---|---|---|
| `--indigo` | `#8292ff` | 5 | `.kicker` (859), `h2` section headings (861), `.chip.lens` text (915), `ul.ev .loc` file:line (923), `.conv code` (948) |
| `--indigo-line` | `#393fc2` | 2 | `.chip.lens` border (915), `.start` panel border (969) |
| `--cyan` | `#8ff5ff` | 5 | `a` (855), `summary` (926), `table.tok .tk` token name (938), `.start h2` (971), `.start .pick a .big` (974) |

**Strength colors** (100 / 75 / 50)

| Name | Value | Refs in CSS | Where it is actually applied |
|---|---|---|---|
| `--cyan` | `#8ff5ff` | (shared with accent) | strength 100 via Python literal `COLOR[100]` (825) |
| `--amber` | `#e8b45a` | **0** | strength 75 via Python literal `COLOR[75]` (825) |
| `--gray` | `#6b7089` | **0** | strength 50 via Python literal `COLOR[50]` (825) |

`--amber` and `--gray` are declared on 852 but never read by a `var()` in the stylesheet. The strength colors reach the page only through `COLOR = {100: "#8ff5ff", 75: "#e8b45a", 50: "#6b7089"}` (825) and `color_of()` (1004-1005), written into inline `style=` attributes at: card accent gradient `linear-gradient(90deg,%s,transparent 70%%)` (1024), strength chip border and text (1026), the big rank numeral (1031), the rank-list bar fill and number (1073-1075), the plain-table strength cell (1081), and the three header stat numbers (1112-1113). A tokens export that changed `--cyan`, `--amber`, or `--gray` would recolor the `var()` sites but not these seven inline sites unless `COLOR` is also edited or changed to emit `var(--cyan)` etc. (inline `style` attributes do accept `var()`).

**Lens colors**

There are none. Lenses are distinguished by label only: `LENS_LABEL` (822-823) maps the four lens ids to display names; the lens chip uses the shared `--indigo-line` / `--indigo` pair (915); the lens status dot on the Lenses tiles is `COLOR[100]` (cyan) when the lens returned `ok` and the literal `"#c96b6b"` (same value as `--red`) otherwise (1131), with a `box-shadow:0 0 8px <same color>` glow (1132). An Ultima export does not need per-lens hues for this consumer.

**Semantic / diff**

| Name | Value | Refs | Used for |
|---|---|---|---|
| `--red` | `#c96b6b` | 1 | `.ba h5.b` "Before" heading (943); duplicated as a literal on 1131 for the failed-lens dot |
| `--green` | `#6fd3a4` | 1 | `.ba h5.a` "After" heading (943) |

**Borders**

| Name | Value | Refs | Used for |
|---|---|---|---|
| `--line` | `#22264a` | 13 | every `1px solid` hairline: `.top` (866), `.lens` (882), `.tabs` (888), checked-tab fill (892), `.empty` dashed (894), `.card` (907), `.chip` (914), `table.tok th` (935), `.sw` swatch (940), `.cov` (967), `.start dl` (976), `.foot` (978), `.tbl` (952) |

**Fonts**

| Name | Value | Refs |
|---|---|---|
| `--sans` | `'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif` | 2 (`body` 854, `table.tok th` 935) |
| `--mono` | `'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace` | 15 |
| `--pixel` | `'Pixelify Sans','Press Start 2P',var(--mono)` | 7 (`.kicker` 859, `h2` 861, `.stat b` 871, `.num` 899, `.card .big` 911, `summary .tri` 929, `.start .pick a .big` 974) |

No font is loaded. There is no `<link>`, `@import`, or `@font-face` anywhere in the script; the named faces render only where installed locally, otherwise the stacks fall through to system fonts. This follows from the no-network promise at `finish-audit.md:51`.

### Raw color literals outside the `:root` rule

These are the values a tokens export cannot reach today. Each one either needs a new token (and a one-word CSS edit at the site) or stays hard-coded.

| Line | Literal | Role |
|---|---|---|
| 855 | `#fff` | `a:hover` |
| 856 | `rgba(57,63,194,.32)` | page top radial glow (this is `--indigo-line` at 32% alpha) |
| 891 | `#fff` | `.tabs label:hover` |
| 892 | `#fff` | checked tab label text |
| 902 | `#1c2040` | score-bar track (`.bar i`) |
| 928 | `#fff` | `summary:hover` |
| 944 | `#2a1c2e` | `pre` border (before-block, dark red tint) |
| 945 | `#1a2e2b` | `pre.after` border (dark green tint) |
| 950 | `#141a2e` / `#b9f0d5` | `ul.wins li` background / text |
| 969 | `rgba(57,63,194,.18)`, `rgba(16,19,35,.6)` | `.start` panel gradient (`--indigo-line` at 18%, `--card` at 60%) |
| 973 | `#fff` | `.start .pick a` |
| 979 | `#fff`, `#000` | `@media print` page background and body text |
| 1124 | `#b9bedb` | inline `style` on the Design-system `<dd>` (Python side) |
| 825 | `#8ff5ff`, `#e8b45a`, `#6b7089` | `COLOR` dict (Python side; see Strength) |
| 1131 | `#c96b6b` | failed-lens dot (Python side) |

Also: `swatch()` (994-997) writes arbitrary color strings from audit data as inline backgrounds. That is content, not theme, and is unaffected by tokens.

### Spacing values hard-coded in the stylesheet

No spacing scale exists; every value is a literal `rem`/`px`. Full list by site (all in `ultima.sh`):

- Layout: `main` max-width `66rem`, padding `3rem 1.5rem 6rem` (857); `.lede` max-width `34rem` (868); `.start .pick p` max-width `44rem` (975); `.mark` wordmark `44px` x `165px` (858); `.inner` left indent `3rem`, dropped under `40rem` viewport (917-918).
- Section rhythm: `.sec` margin-top `3rem` (880); `.cards` margin-top `3rem`, gap `1.25rem` (906); `.trio` margin-top `3.5rem`, gap `2.5rem 3rem` (960); `.start` margin-top `3.5rem` (969); `.foot` margin-top `4rem`, padding-top `1.5rem` (978); `.meta` margin-top `1.75rem` (876); Weaker section inline `margin-top:3.5rem` (1147).
- Header: `.top` gap `1.5rem 2rem`, padding-bottom `2rem` (866); `.top .id` gap `.9rem` (867); `.stats` gap `1.5rem` (869); `.stat` gap `.2rem` (870); `dd` margin-top `.15rem` (875); `.meta` gap `1rem 1.5rem`, column min `11rem` (876).
- Tiles and rows: `.lenses` gap `.75rem`, min `13rem` (881); `.lens` padding `.8rem 1rem`, gap `.75rem` (882); `.lens .n` gap `.6rem` (883); `.dot` `8px` (884); `.rankhead` gap `.75rem`, margin-bottom `1rem` (886); `.tabs` gap `2px`, padding `3px` (888); `.tabs label` padding `.3rem .8rem` (890); `.empty` padding `2rem` (894); `ol.rank` gap `2px` (896); `ol.rank li` columns `2rem minmax(0,1fr) 7rem 3.5rem`, gap `1rem`, padding `.7rem 1rem` (897); `.bar` gap `.5rem` (901); bar height `4px` (902); bar number width `1.6rem` (904).
- Card: `.accent` height `2px` (908); `.body` padding `1.5rem 1.75rem` (909); `header` gap `1rem` (910); `.big` width `2rem` (911); `.ttl` gap `.6rem` (912); `.chips` gap `.4rem` (913); `.chip` padding `.15rem .6rem` (914); `.inner` gap `1.4rem`, margin-top `1.5rem` (917); `.inner section` gap `.35rem` (919); `ul.ev` gap `.3rem` (921); `ul.ev li` gap `.25rem 1rem` (922); `ul.ev code` padding `0 .35rem` (924); `details` margin-top `.2rem` (925); `summary` gap `.4rem` (926); `details ul.ev` margin-top `.3rem` (931); `table.tok th` padding `.35rem .6rem`, `td` `.45rem .6rem` (935-936); `.sw` `.85em`, margin-right `.45rem` (940); `.ba` min `16rem`, gap `.75rem` (941); `.ba div` gap `.35rem` (942); `pre` padding `.8rem 1rem` (944); `ul.wins` gap `.4rem`, `li` padding `.2rem .7rem` (949-950); `.card footer` padding `.6rem 1.75rem` (951); `.card` scroll-margin-top `1rem` (907).
- Tables and lists: `table.plain th` padding `.55rem .9rem`, `td` `.6rem .9rem` (955-956); `ul.list` gap `.6rem`, `li` gap `.15rem` (962-963); `.cov` min `14rem`, gap `.9rem 1.5rem`, padding `1.1rem 1.25rem` (967); `.start .body` padding `1.75rem 1.75rem 1.5rem`, gap `1.25rem` (970); `.start .pick` gap `.6rem`, `a` gap `.75rem` (972-973); `.start dl` min `10rem`, gap `.9rem 1.5rem`, padding-top `1rem` (976); `.foot` gap `.5rem` (978).

### Radius values

Seven distinct radii, all literals: `2px` (`.dot` 884, `.bar i` 902), `3px` (`.sw` 940), `4px` (`ul.ev code` 924), `6px` (`.tabs label` 890, `ol.rank li` 897, `ul.wins li` 950), `8px` (`.lens` 882, `.tabs` 888, `pre` 944), `10px` (`.tbl` 952, `.cov` 967), `12px` (`.empty` 894, `.card` 907, `.start` 969), and `999px` pill (`.chip` 914).

### Type sizes, weights, tracking

Base: `body` `font:15px/1.55 var(--sans)` (854); `.kicker` `13px` (859). Everything else is `rem` against the browser default (not against the 15px body):

- Display: `h1` `2.4rem/1.1`, weight 600, tracking `-.02em` (860); `.stat b` `2.2rem/1`, pixel, weight 500 (871); `.card .big` `1.6rem/1.2`, pixel (911); `.start .big` `1.4rem`, pixel (974); `.start .pick a` `1.35rem/1.3`, weight 600 (973); `h3` `1.25rem/1.3`, weight 600 (862); `.num` `1rem`, pixel (899).
- Uppercase labels: `h2` `.8rem`, pixel, weight 500, tracking `.14em` (861); `.kicker` tracking `.14em` (859); `h4`, `h5` `.68rem`, tracking `.12em` (863-864); `dt` `.68rem`, `.1em` (874); `.stat span` `.72rem`, `.1em` (872); `.tag` `.72rem`, `.08em` (966); `table.tok th`, `table.plain th` `.65rem`, `.1em`, weight 500 (935, 955).
- Body and UI: `.lens .n` `.92rem`, weight 500 (883); `ul.list` `.9rem` (962); `.cov`, `table.plain`, `.start dl` `.88rem` (967, 953, 976); `.mono`, `.conv` `.85rem` (879, 947); `table.tok`, `ul.wins li`, `.why`, `.cov code`, design `<dd>` `.82rem` (934, 950, 964, 968, 1124); `ul.ev`, `pre` `.8rem` (`pre` line-height `1.5`) (921, 944); `.tabs label`, `summary` `.78rem` (890, 926); `.lens .s`, `.sc`, `.card footer`, `.foot` `.75rem` (885, 905, 951, 978); `.chip`, `.bar span` `.72rem` (914, 904).

### Light mode

None. `:root{color-scheme:dark; ...}` on 852 is the only scheme declaration; `grep -c prefers-color-scheme` on the script returns 0; the only media queries are `@media (max-width:40rem)` (918, layout) and `@media print{.page{background:#fff}body{color:#000}.card{break-inside:avoid}main{max-width:none}}` (979). Print therefore produces a white page with dark cards, dark `pre` blocks, and light-on-dark chips, which is a partial inversion, not a light theme. Five `#fff` hover/active literals (855, 891, 892, 928, 973) and the `#fff` checked-tab text assume a dark ground and would vanish on a light one.

### What the export must provide for a no-pipeline-change adoption

1. **File shape.** A plain CSS text fragment (not a `<style>` element, not a `<link>` target) whose top-level content is a `:root{...}` declaration block. It may include `color-scheme`. It must not contain `@import`, `url()`, `@font-face` with remote sources (breaks `finish-audit.md:51`), the sequence `</style>`, or the substring `<script` (line 1205 would abort the render). If it is pasted into the Python literal rather than read from disk, it must also avoid `"""` and backslashes.
2. **Variable names.** To be a drop-in for line 852, it must define these 21 names with these roles: `--bg`, `--card`, `--glass`, `--tab`, `--hover`, `--row` (surfaces); `--fg`, `--soft`, `--muted`, `--dim` (text); `--indigo`, `--indigo-line`, `--cyan` (accent); `--amber`, `--gray` (strength 75 / 50, declared but unused in CSS); `--red`, `--green` (before/after); `--line` (borders); `--sans`, `--mono`, `--pixel` (fonts). If Ultima's canonical names differ (say `--ultima-surface-0`), the cheapest bridge is an alias block appended to the export or to line 852: `:root{--bg:var(--ultima-surface-0); ...}`, which keeps all 91 `var()` sites untouched.
3. **Values that must stay in sync by hand.** `COLOR` at 825 (`#8ff5ff`, `#e8b45a`, `#6b7089`) and the `#c96b6b` at 1131 are Python literals that mirror `--cyan`, `--amber`, `--gray`, `--red`. Either the export keeps those exact values, or a later ticket changes those four literals to `var(--cyan)` etc. (valid inside inline `style`).
4. **Tokens the report has no slot for today.** Spacing scale, radius scale, type scale, the `#fff` hover/active foreground, the `#1c2040` bar track, the two `pre` diff borders, the wins chip pair, the design-system `<dd>` `#b9bedb`, the two alpha gradients, and print colors. Supplying tokens for these is useful only alongside CSS edits at each site.
5. **Fonts.** The export should declare font stacks as strings with real fallbacks. It must not rely on network font loading. Embedding faces as `data:` URIs is the only way to guarantee IBM Plex or Pixelify without breaking `file://` portability, at a file-size cost the render pipeline currently does not account for.
6. **Light mode.** Not required by the consumer today. If Ultima ships light values, the export would carry them under `@media (prefers-color-scheme: light)` or a `[data-theme="light"]` selector and drop the unconditional `color-scheme:dark`; the report would still need the five `#fff` literals and the print rule reworked to look right.

### Brand colors (out of scope for tokens, noted for completeness)

The `WORDMARK` SVG (827-849) hard-codes: `#efffff`, `#8ff5ff`, `#56d5fa`, `#8292ff`, `#7470f3` (letter gradient); `#393fc2` (dither pattern); `#272c83`, `#e5ffff`, `#8af2ff`, `#b5faff`, `#438ae9`, `#5bcded`, `#666aef`, `#5044c1`, `#a4acff`, `#7774f7`, `#f0ffff` (crystal); `#343491`, `#4142aa` (letter shadow and baseline). The same palette appears in `docs/assets/mana.svg` (the only other file in the repo that matches `0b0d17|Pixelify|8ff5ff|8292ff`). No other mana skill shares the report CSS; the `ultima` skill is the sole consumer.

## Sources

- https://github.com/frankieramirez/mana at commit `04810f55612643ace44aa5cb5dec07ce24b9b74b` (shallow clone, read 2026-09-08): the repository state every line number below refers to.
- `skills/ultima/scripts/ultima.sh:21-26`: `render` writes a self-contained report with inline CSS, no script tag, every field escaped; python3 stdlib only.
- `skills/ultima/scripts/ultima.sh:786-802`: `cmd_render()` bash wrapper that execs the Python heredoc with `ULTIMA_RUN_DIR`, `ULTIMA_IN`, `ULTIMA_OUT`.
- `skills/ultima/scripts/ultima.sh:822-825`: `LENS_LABEL` (labels only, no lens colors) and `COLOR` strength dict.
- `skills/ultima/scripts/ultima.sh:827-849`: `WORDMARK` inline SVG and its brand hexes.
- `skills/ultima/scripts/ultima.sh:851-980`: the `CSS` string constant; line 852 is the single `:root{}` rule with `color-scheme:dark` and all 21 custom properties; line 979 is the only print rule.
- `skills/ultima/scripts/ultima.sh:994-997`: `swatch()` writes data-driven colors inline (content, not theme).
- `skills/ultima/scripts/ultima.sh:1004-1005, 1024, 1026, 1031, 1073-1075, 1081, 1112-1113, 1124, 1131-1132`: every inline `style=` site that bypasses the custom properties.
- `skills/ultima/scripts/ultima.sh:1107`: `<style>%s</style>` injection of `CSS`.
- `skills/ultima/scripts/ultima.sh:1205-1207`: render aborts if the output contains `<script`.
- `skills/ultima/references/finish-audit.md:45-53`: the render step, "Never write the HTML yourself", and the inline-CSS / no-script / no-network / `file://` promise.
- `skills/ultima/SKILL.md:146-157`: reference table naming `scripts/ultima.sh` as the only renderer.
- `docs/assets/mana.svg`: the only other file in the repo sharing the wordmark palette (from `grep -rln -E '0b0d17|Pixelify|8ff5ff|8292ff'`).
- Measurements taken on the clone: `grep -c prefers-color-scheme skills/ultima/scripts/ultima.sh` = 0; `var()` references in lines 851-980 = 91 (`--mono` 15, `--dim` 15, `--line` 13, `--pixel` 7, `--muted` 5, `--indigo` 5, `--cyan` 5, `--soft` 4, `--bg` 4, `--row` 3, `--glass` 3, `--tab` 2, `--sans` 2, `--indigo-line` 2, `--fg` 2, `--red` 1, `--hover` 1, `--green` 1, `--card` 1, `--amber` 0, `--gray` 0).
