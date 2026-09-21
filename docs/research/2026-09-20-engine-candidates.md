# Which engines are candidates for the v0.2 engine-ground entries, priced against ADR 0007?

## Findings

**One gate, two readings, and three of the five nominated candidates hang on the difference.** ADR 0007's sentence is literal: "rendering no DOM and no styles, or it is not a candidate at all." The ticket's phrasing — truly headless, or ships styles (an automatic fail) — treats shipped styles as the kill condition. Those are not the same test. Under the literal reading, only libraries that render nothing qualify: Embla, the Zag machines, d3 modules, pure scorers (match-sorter, fuzzysort), and React Aria's prop-getter hooks. cmdk, react-day-picker, and input-otp all render DOM while shipping no stylesheet, and visx renders SVG elements with no stylesheet — they pass only under the looser "ships no styles, or styles fully replaceable" reading. Swiper and recharts fail under both readings. The deciding ticket should state which reading binds before picking engines, and the precedent leans strict: the form-integration research counted rendered elements and passed React Hook Form only because its one element is optional and the documented path never renders it.

The second rule that prices these is ADR 0007's controls clause: where a recipe hands the user a control, that control comes from the catalogue. An engine that renders its own interactive elements — cmdk's items, input-otp's hidden input, DayPicker's day buttons — puts non-catalogue controls inside the recipe; a prop-getter engine (Zag, React Aria) does not, because the consumer's own elements carry the props.

Repo context: React 19.2.8, `@base-ui/react` ^1.8.0, StyleX-only styling, every recipe engine is the consumer's own dependency (`npm install <pkg>` per the Data Table precedent in `apps/docs/src/content/components/table.mdx`). Base UI 1.8 ships no calendar, carousel, or OTP primitive. Every candidate below takes styles through either consumer-authored markup (engines that render nothing), `className` props (engines that render), or SVG presentation attributes — all of which `stylex.props` or plain attributes reach, so no candidate is blocked on the StyleX/`style` question. The `style` slot itself is an Ultima-component convention and does not apply to engines.

### Command

The behavior a primitive cannot carry is ranking: fuzzy scoring and ordering of items. Base UI Combobox/Autocomplete already supplies the combobox interaction and Dialog supplies the command-dialog surface, and the spec has already settled that Ultima owns no filter algorithm and that a filter library is an engine under ADR 0007 (`docs/spec/ultima.md`, Combobox per-component note).

| | cmdk 1.1.1 | match-sorter 8.3.0 | fuzzysort 4.0.2 |
|---|---|---|---|
| Renders | DOM (divs with `cmdk-*` attrs, Radix primitive elements) | nothing — a function over an array | nothing — a function over an array |
| Ships styles | none | none | none |
| License / deps | MIT; 4 Radix deps: `@radix-ui/react-dialog`, `react-id`, `react-primitive`, `react-compose-refs` | MIT; `@babel/runtime`, `remove-accents` | MIT; zero deps, ESM-only single file |
| React / format | peer `^18 \|\| ^19`; dual CJS+ESM; `sideEffects: false` | framework-free; dual | framework-free; ESM only |
| Published / maintenance | Mar 2025 (1.1.1); repo now `dip/cmdk`, Vercel-adjacent maintainers | 8.3.0, Kent C. Dodds, active | 4.0.2, published 2026 |
| Cost | 82 KB unpacked + 4 Radix packages | ~183 KB unpacked | ~79 KB unpacked, ~14 KB file |

cmdk is the shadcn answer and it is the only candidate that *replaces* the primitive: it is a complete combobox-plus-dialog built on Radix, so a Command recipe on cmdk hands the user cmdk's `Input`, `List`, and `Item` elements rather than catalogue controls — the controls clause is the real cost, not the four Radix packages. Its scoring algorithm is bundled and not separately installable. The pure-scorer path keeps the whole accessible surface on Base UI (`Dialog` + `Combobox` or `Autocomplete`) and passes the strict gate for free. Install lines: `npm install cmdk` vs `npm install match-sorter` (or `fuzzysort`).

### Calendar and Date Picker

The behavior is the date model: month/week grid generation, selection modes, range math, disabled/outside days, and the picker's keyboard and popover semantics. Base UI ships no date primitive.

| | `@daypicker/react` 10.0.1 (react-day-picker v10) | `@zag-js/date-picker` 1.44.0 | `@react-aria/calendar` 3.10.1 | date-fns 4.x / `@internationalized/date` |
|---|---|---|---|---|
| Renders | the whole grid DOM (`<table>`-free v9+ div grid) | nothing — prop getters | nothing — prop getters | nothing — date math only |
| Ships styles | `style.css` as a separate, optional export; **not auto-imported**. `classNames` prop replaces every slot's class (`ClassNames` type enumerates all), `components` prop replaces elements, `getDefaultClassNames()` extends | none | none | none |
| License | MIT | MIT | Apache-2.0 | MIT / Apache-2.0 |
| Deps | `@daypicker/react` → `react-day-picker` → `date-fns` ^4.1 + `@date-fns/tz` ^1.4 (4 packages) | ~9 `@zag-js/*` deps incl. popper, date-utils (`@internationalized/date` underneath), dismissable, live-region | `react-aria` + `react-stately` + `@swc/helpers` — a large transitive tree | `date-fns` has zero deps |
| React | peer `>=16.8` | peer `>=18` via `@zag-js/react` | peer `^16.8–^19` | n/a |
| Cost | ~965 KB unpacked across the pair; ~40 KB machine-size class library | 253 KB unpacked machine + shared zag deps | ~21 KB wrapper over a big tree | small, modular |

react-day-picker is the pragmatic answer and the shadcn one: its stylesheet is a separate export you simply never import, and every rendered element's class is replaceable through `classNames`, so a recipe can hang StyleX classes on all of it. But it fails the literal gate — it renders the entire grid — and its day buttons are engine-rendered controls. `@zag-js/date-picker` is the strict-gate winner and it is the only candidate that is a whole date *picker* (trigger, positioner, content, day/month/year views, locale-aware ranges): the recipe writes the table markup and the machine supplies every prop including ARIA — same relationship to markup as TanStack Table. React Aria's hooks pass the strict gate too but cost the largest dependency tree and carry Apache-2.0 rather than MIT. The model-only option (date-fns, `@internationalized/date`) leaves the grid generation and calendar keyboard contract hand-written — that hand-rolled half is precisely the behavior this entry exists to not own, so it prices out unless the literal reading is enforced and Zag is rejected for size. Install lines: `npm install @daypicker/react` (preferred v10 name; `react-day-picker` is the legacy alias), or `npm install @zag-js/date-picker @zag-js/react`, or `npm install @react-aria/calendar @react-stately/calendar @internationalized/date`.

### Carousel

The behavior is scroll physics: drag/swipe, snap, loop, slide tracking. Base UI ships nothing here.

- **`embla-carousel-react` 8.6.0 — passes the strict gate cleanly.** MIT. A hook and a viewport ref: it renders no DOM and ships no CSS at all; the consumer writes the viewport/container/slide markup and the ~3 lines of structural CSS (`overflow`, `display: flex`, `flex: 0 0 100%`), which is exactly StyleX's job. Deps are `embla-carousel` + `embla-carousel-reactive-utils` pinned at the same version. React wrapper is ~7.4 KB ESM; peer react through `^19`. Actively maintained — v9.0.0-rc01 January 2026. Install: `npm install embla-carousel-react`. This is the clear candidate.
- **`@zag-js/carousel` 1.44.0 — also passes strict.** MIT, renders nothing, prop getters over a machine rebuilt on native CSS scroll-snap (v0.79+); supplies slide/prev/next/dot-group ARIA for free. Costs `@zag-js/react` + 6 machine deps. Install: `npm install @zag-js/carousel @zag-js/react`. Weaker physics than Embla, stronger semantics.
- **keen-slider 6.8.6 — weak pass, stale.** MIT, ~5.5 KB gz, renders into consumer markup, but the docs have you import a shipped `keen-slider.css` (737 B structural — replaceable by StyleX in principle) and it has not published since July 2023.
- **swiper — fails.** `import 'swiper/css'` plus per-module stylesheets are required, documented imports; shipped styles are the auto-fail.
- slick-carousel/react-slick — fails the same way (mandatory slick CSS), and is jQuery-flavored legacy.

### Input OTP

The behavior is the slot model: one hidden input, per-slot values, paste-into-middle, `autocomplete="one-time-code"`, the full editing keymap. Base UI has no such primitive.

- **`input-otp` 1.5.0 — passes shipped-styles, fails literal.** MIT, zero dependencies, React 16.8–19, ~33 M weekly downloads (the shadcn choice). "Unstyled" is accurate about themes — no CSS import, slots are consumer render output taking `className`/`containerClassName` — but it renders DOM (the invisible input plus container) and writes inline styles on that input to keep it invisible, plus an optional `<style>` no-JS fallback (`noScriptCSSFallback`). Those styles are functional, not visual, and cannot be removed without breaking the trick. Under the strict gate its rendered hidden input is also a non-catalogue control. Install: `npm install input-otp`.
- **`@zag-js/pin-input` 1.44.0 — passes strict.** MIT, machine renders nothing; the recipe writes each slot input and spreads `getInputProps`, so every element can be a catalogue/styled element. Costs `@zag-js/react` + 5 zag deps. Install: `npm install @zag-js/pin-input @zag-js/react`.

### Chart

The behavior is the chart math: scales, shape/layout generators, ticks. No candidate below is a "React chart component" under the strict gate — a library that renders the chart owns the visual decisions the system exists to own.

- **d3 as modules — cleanest pass, same shape as TanStack Table.** `d3-scale` 4.0.2, `d3-shape`, `d3-array`, `d3-time-format` etc. are ISC-licensed pure functions returning numbers and path strings; they render literally nothing. **One caveat joins the TanStack Table v9 paragraph**: each module is `"type": "module"` with `main`/`module` pointing at `src/index.js` and only a UMD fallback dist — no CJS `require` condition, so they are effectively ESM-only. Install per need: `npm install d3-scale d3-shape d3-array d3-time-format`.
- **visx v4 (@visx/shape 4.0.0 et al.) — passes shipped-styles, fails literal.** MIT, React 18 or 19 required (v4, June 2026 — fits). Renders SVG elements (`<Bar>` → `<path>`) but ships no stylesheet; every presentation attribute is consumer-supplied, so StyleX values reach the output. Deps pull `@visx/vendor` (vendored d3) + `classnames` + sibling `@visx/*` packages. Modular install: `npm install @visx/shape @visx/scale @visx/axis @visx/grid`.
- **recharts 3.10.1 — ruled out under both readings.** MIT and React-19-compatible, but it is a themed component layer, not an engine: it renders the entire chart SVG with per-series default fills/strokes and its own theme system, and costs ~11 deps including `@reduxjs/toolkit`, `react-redux`, `immer`, and `victory-vendor` (~7.5 MB unpacked). StyleX would have only prop-level override seams, and every rendered control is the library's.
- chart.js / react-chartjs-2, nivo, victory, echarts — out for the same reason or worse: canvas or fully-styled SVG output where class-based styling cannot reach the pixels.

### Item, Kbd, Typography — and the rest of the two shared lines

**No engine is a candidate, because there is no engine-shaped gap.** Item is a flex layout composition (media/content/actions slots), Kbd is a styled `<kbd>`, Typography is a prose style table; Button Group and Input Group are layout compositions and Native Select is a styled `<select>` on the same checklist line. None needs a row model, date model, scale, or gesture engine — these are style-and-structure entries decided by the component-identity test (item vs. plain recipe), not by ADR 0007. Aspect Ratio and Resizable on the Carousel line are likewise primitive-or-CSS questions (a `ratio` box and a pointer-drag gutter), not engine grounds.

### What later tickets need

- **Decide the reading first.** Literal ADR 0007 (no DOM): winners are Embla, Zag machines, d3 modules, scorers. Shipped-styles reading: cmdk, react-day-picker, input-otp, visx also qualify. recharts/swiper/slick fail either way.
- **Recommended engine per entry, strict reading:** Command — a pure scorer (match-sorter or fuzzysort) inside `Dialog` + `Combobox`, or no engine if substring filtering suffices; Calendar/Date Picker — `@zag-js/date-picker` (whole picker) with react-day-picker as the relaxed-reading incumbent; Carousel — `embla-carousel-react`; Input OTP — `@zag-js/pin-input`; Chart — d3 modules, visx as the relaxed-reading middle.
- **Caveats to carry forward:** d3 modules are ESM-only (joins the TanStack Table v9 install-page paragraph); `@react-aria/*` is Apache-2.0 not MIT; cmdk pulls four Radix packages and would put non-catalogue controls inside the recipe; zag machines always need the `@zag-js/react` adapter as a second package; react-day-picker v10's preferred name is `@daypicker/react`.
- **Install lines:** `npm install cmdk` · `npm install match-sorter` / `npm install fuzzysort` · `npm install @daypicker/react` · `npm install @zag-js/date-picker @zag-js/react` · `npm install @react-aria/calendar @react-stately/calendar @internationalized/date` · `npm install embla-carousel-react` · `npm install @zag-js/carousel @zag-js/react` · `npm install input-otp` · `npm install @zag-js/pin-input @zag-js/react` · `npm install d3-scale d3-shape d3-array d3-time-format` · `npm install @visx/shape @visx/scale @visx/axis @visx/grid`.

## Sources

- `docs/adr/0007-engines-ship-as-recipes.md`: the gate text ("rendering no DOM and no styles, or it is not a candidate at all"), the consumer-installs-it rule, and the controls-from-the-catalogue clause.
- `docs/adr/0001-stylex-only-styling.md` and `docs/research/2026-09-11-form-integration.md`: the StyleX-only contract and the precedent of counting rendered elements when applying the gate.
- `docs/spec/ultima.md` v0.2 checklist and Combobox note: which entries are engine-ground, and that Ultima owns no filter algorithm.
- `apps/docs/src/content/components/table.mdx`: the recipe install-line convention (`npm install @tanstack/react-table`) and the existing ESM-only caveat paragraph.
- https://registry.npmjs.org/cmdk/latest — cmdk 1.1.1: MIT, dual format, 4 Radix deps, peer react `^18 || ^19`, `sideEffects: false`.
- https://github.com/dip/cmdk — "Fast, unstyled command menu React component"; last release Mar 2025; renders composable DOM.
- https://registry.npmjs.org/@daypicker/react/latest and https://registry.npmjs.org/react-day-picker — v10.0.1, MIT, `style.css` as separate optional export, deps `react-day-picker` → `date-fns`/`@date-fns/tz`, peer `react >=16.8`.
- https://daypicker.dev/v9/docs/styling — `classNames`/`components`/`getDefaultClassNames` replace every rendered class; stylesheet never required.
- https://registry.npmjs.org/embla-carousel-react/latest — 8.6.0, MIT, hook+ref (no DOM, no CSS), deps `embla-carousel` + `reactive-utils`, peer through `^19`; https://github.com/davidjerleke/embla-carousel for v9 RC and activity.
- https://registry.npmjs.org/@zag-js/react/latest, `/carousel/latest`, `/pin-input/latest`, `/date-picker/latest` — zag 1.44.0, MIT, dual format, peer `react >=18`, machines render nothing and expose prop getters; https://zagjs.com/components/date-picker for the consumer-writes-markup contract.
- https://registry.npmjs.org/@react-aria/calendar/latest — 3.10.1, Apache-2.0, prop-getter hooks over `react-aria`/`react-stately`.
- https://registry.npmjs.org/input-otp/latest and https://input-otp.rodz.dev — 1.5.0, MIT, zero deps, unstyled-but-DOM-rendering, inline styles on the invisible input.
- https://registry.npmjs.org/match-sorter/latest and https://registry.npmjs.org/fuzzysort/latest — 8.3.0 MIT dual / 4.0.2 MIT ESM-only, pure scorer functions.
- https://registry.npmjs.org/d3-scale/latest — 4.0.2, ISC, `type: module` with UMD-only fallback: the ESM-only caveat.
- https://registry.npmjs.org/@visx/shape/latest and https://github.com/airbnb/visx — v4.0.0 MIT, React 18/19 floor, SVG elements, no stylesheet, `@visx/vendor` vendored d3.
- https://registry.npmjs.org/recharts/latest — 3.10.1 MIT, themed SVG component layer, ~11 deps incl. Redux toolkit.
- https://swiperjs.com/get-started and https://registry.npmjs.org/keen-slider/latest — Swiper's required `swiper/css` imports (fail); keen-slider 6.8.6 MIT, ships `keen-slider.css`, unpublished since 2023.
