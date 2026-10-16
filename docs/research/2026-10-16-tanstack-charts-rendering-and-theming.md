# What @tanstack/charts 1.x renders, exposes, and lets a theme reach

## Findings

**The package renders DOM, but one public layer under it does not.** `@tanstack/charts` 1.1.0 is a single package. By default it renders SVG through a DOM host, with Canvas as an option. Its exported `/scene` and `/runtime` entries compile a chart definition into a plain, keyed `ChartScene` object. That scene holds the resolved scales, plot bounds, interaction points, and a tree of seven node kinds. In the published build those entries import no npm package and refer to no browser global. Read on its own, that layer passes ADR 0007's headless gate. The package as a whole fails it. `@tanstack/react-charts` is a thin compatibility wrapper around the DOM path and fails too: it renders two `<div>`s with class names and inline styles and injects the SVG markup with `dangerouslySetInnerHTML`. A recipe that took the scene layer would get layout, scales, and axis geometry. It would give up every accessibility behavior the library ships, because all of that lives in the DOM host. Whether a DOM-free *subpath* of a package that renders DOM counts as a candidate is a reading of ADR 0007 a later ticket has to make. The ADR's 2026-09-20 amendment only rules on whole libraries.

### 1. A layer below the renderers

The pipeline is documented as five steps: definition, then chart spec, then materialized channels, then scales and guide layout, then a keyed `ChartScene`, which "the selected SVG, Canvas, or custom renderer consumes" (`docs/reference/runtime-and-scene.md`). The public entry points:

```ts
// @tanstack/charts/scene
function createChartScene<TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>,
  size: ChartSize,
  layout?: ChartLayoutOptions, // { measureText?, typography? }
): ChartScene<TDatum, TXValue, TYValue>
// also exported from /scene: defineChart, defaultChartTheme, findNearestPoint, viewportInteractionPoints

// @tanstack/charts/runtime: for repeated or responsive renders
function createChartRuntime(options?: ChartRuntimeOptions): ChartRuntime
runtime.render(definition, { width, height }, layout?): ChartScene
```

`ChartScene` is `{ width, height, margin, chart, nodes, points, scales, colors, gradients, theme, focusGuides? }`. The node kinds are `group` (children, translate, clip), `rule`, `polyline`, `area`, `dot`, `rect`, and `label`. Every node has a stable `key` and may also carry `className`, `style: SceneStyle`, and `ariaHidden`. `SceneStyle` holds only paint: fill, fill/stroke opacity, stroke, stroke width, opacity, line cap and join, and dash array. `points` holds the interaction set as `ChartPoint` records (datum, semantic x/y values, pixel x/y, group, color). The DOM-free helpers `findNearestPoint`, `viewportInteractionPoints`, and `resolveFocusPresentation` (from `/universal`) resolve hit-testing and focus overlays against a scene.

A caller draws marks from the scene like this. This is a sketch assembled from the documented signatures; I did not run it.

```ts
import { defineChart, createChartScene } from '@tanstack/charts/scene'
import { barY } from '@tanstack/charts/bar'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const scene = createChartScene(
  defineChart({
    marks: [barY(rows, { x: 'day', y: 'requests' })],
    scales: { x: { scale: () => scaleBand<string>().padding(0.35) }, y: { scale: scaleLinear, nice: true } },
  }),
  { width: 360, height: 220 },
)
// Walk scene.nodes: switch (node.kind) { case 'rect': <rect x y width height {...stylex.props(...)} /> ... }
// and ignore node.style / node.className where StyleX owns paint.
```

What I verified in the build:

- **No DOM, no globals.** I walked the import graph of `dist/scene.js` (14 files, about 100 KB unminified) and `dist/runtime.js` (15 files). Neither has an external import, and neither contains `document`, `window`, `createElement`, `getComputedStyle`, `matchMedia`, `ResizeObserver`, `requestAnimationFrame`, or `getContext`. `dist/bar.js` adds `d3-scale` (it imports `scaleBand`) and `d3-shape`, and nothing from the DOM. `dist/scales/linear.js` and `dist/scales/band.js` have no dependencies at all.
- **Text measurement is optional.** Without `measureText`, the scene uses `estimateSceneText`, a per-character width table (`dist/guide-layout.js`). The DOM host swaps in `dom-text.js`, which uses canvas `measureText` and `getComputedStyle`. A recipe can pass its own measurer or accept the estimate.
- **No styles are emitted, but paint values are.** The scene is data. Still, its nodes carry default paint strings (`currentColor`, `var(--ts-chart-N, #hex)`) and BEM class strings (`ts-chart__grid`, `ts-chart__bar`, and so on). A renderer that ignores `style` and `className` gets bare geometry. A renderer that keeps them gets the library's look.
- **Avoid the package root.** `@tanstack/charts` (root) re-exports `mountChart`, and its graph pulls in `renderer.js`, `reconcile.js`, `dom-text.js`, and the SVG focus serializers, all of which touch the DOM. The documented DOM-free value entry is `@tanstack/charts/universal`, described as "authoring, runtime, scene, and static SVG values without browser hosts or adapters." `/scene` plus exact mark and scale subpaths is narrower still.
- **Stability of the scene types.** The 1.0 contract covers "the scene types those extensions are documented to consume or produce," plus key identity and paint order. It excludes "incidental scene nesting, generated keys, and exact serialized formatting." A renderer can therefore rely on node kinds and fields, but not on how deep a bar's `rect` sits inside groups.

The layers in between fail the gate. `mountChartRenderer` (`/renderer`) accepts a custom `ChartRenderer`, but the host itself attaches listeners, sets `container.style.position = 'relative'` when the container is static, and creates the tooltip `<div>`. `/react/core`'s `Chart` takes a `renderer` prop but still renders `.ts-chart-host` and `.ts-chart-surface` with inline styles.

### 2. The React adapter API

There is one `<Chart>` component, and the chart is composed from marks in a framework-neutral `definition`. There are no per-type components (`BarChart`, `LineChart`) and no hooks. `@tanstack/react-charts` exports `Chart` from `.`, plus the same component from `./canvas` (Canvas renderer), `./core` (requires `renderer`), and `./tooltip` (adds `renderTooltipBody`). Its README says: "This compatibility package remains supported for existing applications. New applications use the React adapter from `@tanstack/charts/react`". Both paths ship the same code.

```ts
function Chart<TDatum, TXValue extends ChartValue = ChartValue, TYValue extends ChartValue = ChartValue>(
  props: ChartProps<TDatum, TXValue, TYValue>,
): React.JSX.Element

interface ChartCommonProps<TDatum, TXValue, TYValue> {
  ariaLabel: string; ariaDescription?: string
  height?: number; aspectRatio?: number; width?: number; initialWidth?: number // default 640
  className?: string; style?: React.CSSProperties; tabIndex?: number; idPrefix?: string
  renderSvg?: ChartSvgRenderer; measureText?: ChartTextMeasurer
  onFocusChange?; onFocusGroupChange?; onSelect?; onRender?
}
type ChartProps = ChartCommonProps & { definition: DomChartDefinition }
```

Marks are factories such as `barY(source, options)`, `lineY`, `areaY`, and `dot`. The definition owns `focus`, `focusRing`, `keyboard`, `svgAnimation`, and `tooltip`. The adapter creates one `ChartRuntime` per mount, prerenders the markup during render, then lets a layout effect hand control to the shared DOM host. Scene updates are painted by the host, not by React (`dist/react/RendererChart.js`).

### 3. Theming

**CSS variables the build reads:**

| Variable | Fallback in source | Where |
| --- | --- | --- |
| `--ts-chart-1` … `--ts-chart-6` | `#2563eb #f97316 #10b981 #8b5cf6 #ec4899 #06b6d4` | `scene.js` default palette |
| `--ts-chart-focus-fill` | `Canvas` | in-scene focus ring |
| `--ts-chart-crosshair-marker-fill`, `--ts-chart-crosshair-label-halo` | `Canvas` | `crosshair.js` |
| `--ts-chart-tooltip-{max-width,padding,border,border-radius,background,color,shadow,font}` | `min(24rem,80%)`, `0.4rem 0.55rem`, `1px solid color-mix(… CanvasText 18% …)`, `0.45rem`, `Canvas`, `CanvasText`, `0 6px 24px rgb(0 0 0 / 0.14)`, `500 0.75rem/1.3 system-ui, sans-serif` | `tooltip.js` |
| `--ts-chart-tooltip-active-row-{font-weight,background,border-radius,shadow}` | `700`, `color-mix(… currentColor 12% …)`, `.2rem`, a 2px `color-mix` ring | `tooltip.js` |

The foreground, muted, and grid colors are `currentColor`, and the background is `transparent`, so the chart follows the container's `color`.

**Pointing at Ultima tokens.** Yes, in two ways. (a) Set `--ts-chart-1: var(--ult-color-accent)` and the other variables on an ancestor. (b) Pass `theme: { foreground, muted, grid, background, palette: ['var(--ult-color-accent)', …] }` on the definition, or `defaultTheme` to `createChartRuntime`. Theme values are strings that the SVG serializer writes straight into presentation attributes (`fill="…"`, `stroke="…"`, escaped). The library's own default palette depends on browsers resolving `var()` inside those attributes, so an Ultima variable works the same way. I did not test this in a browser. The Canvas renderer resolves `currentColor` and custom properties against computed style.

**Hard-coded values.** Every one has an override except the fallbacks noted.

- Tick labels: `fontSize` 11 (10 when width < 360), fill `theme.muted` at `fillOpacity` 0.68.
- Axis titles: size 11 (10 when narrow), weight 600, `fillOpacity` 0.76, offset 8.
- Tick size and tick padding: 4 each. Guide inset: 4.
- Grid: `strokeOpacity` 0.11. Axis line: 0.28.
- Focus ring: radius 5, stroke width 2.5.
- Text-estimator defaults: 16px, weight 400, `sans-serif`.

Axis options override sizes, weights, opacities, and offsets (`presentation?.ticks?.size ?? 4` and similar). Labels emit `font-size` and `font-weight` attributes and `font-family="inherit"`.

Hex literals outside the palette fallbacks: `difference.js` (`#4269d0`, `#3ca951`, `#64748b`), `box.js` (`#ccc`), and the React Native adapter.

**Inline styles and class names emitted on the DOM path:**

- Host div: `class="ts-chart-host"` plus the consumer's `className`, and `style={{ position: 'relative', width, height (default 320), aspectRatio, ...style }}`.
- Surface div: `ts-chart-surface`, `width/height: 100%`.
- SVG: `<svg class="ts-chart" style="display:block;overflow:visible" role="img" aria-roledescription="chart" aria-label tabindex="0">`. Every node carries a `data-ts-key` attribute and `ts-chart__*` classes.
- Tooltip: a `div.ts-chart-tooltip` with `Object.assign(style, { position: 'absolute', zIndex: '1', …card vars, pointerEvents: 'none' })`.

**No CSS file and no `<style>` injection.** The package ships no `.css` file. A grep of `dist/` finds no `createElement('style')`, `<style`, `insertRule`, `CSSStyleSheet`, or `adoptedStyleSheets`.

**Can StyleX style or wrap it?**

- Container: yes. An Ultima-owned wrapper can set `color` and the `--ts-chart-*` variables.
- Host element: only through `Chart`'s `className`/`style` props, the second-styling-surface pattern Ultima forbids on its own components.
- Inner SVG elements: no seam. Built-in mark options take no `className`. Only custom marks (`SceneNodeBase.className`) and a replacement `renderSvg` serializer can attach classes. Both are strings, which StyleX's compiled `className` could in principle fill.

The clean StyleX route is the scene layer with an Ultima-owned renderer.

### 4. Accessibility

- **Name and role.** `ariaLabel` is required. The SVG gets `role="img"`, `aria-roledescription="chart"`, `aria-label`, and a `<desc>` when `ariaDescription` is given. Canvas puts the same attributes on its root and marks its five canvases `aria-hidden`. Decorative groups (grid, axes, focus layers) set `aria-hidden="true"`.
- **Keyboard.** On by default, with `tabIndex` 0. `keyboard: false` sets it to -1. Focusing the SVG selects the first point. Arrow keys follow the focus strategy's order, Home and End go to the first and last point, Enter or Space toggles a sticky tooltip and fires `onSelect`, and Escape dismisses it (`renderer.js`).
- **Focus indication.** An in-scene ring is drawn on the focused point (fill `var(--ts-chart-focus-fill, Canvas)`). There is no authored outline on the SVG, so the browser's default focus outline is all there is.
- **Announcing the focused point.** The root has no `aria-activedescendant` and no live text. Without the `tooltip` extension, moving through points announces nothing.
- **Tooltip.** Opt-in. It is a `div` with `role="status"` and `aria-live="polite"`. When pinned it switches to `role="dialog"` with `aria-modal="false"`, and focus returns to the chart on dismissal. Its rows are `aria-hidden`, and the readable text is set as `aria-label`. The docs call it "supplemental."
- **Reduced motion.** `svgAnimation` and the `motion()` renderer check `matchMedia('(prefers-reduced-motion: reduce)')` and skip animation by default (`respectReducedMotion: true`).
- **Data-table fallback.** None. The build has no table element. The docs assign "alternative data presentations" to the application and show a linked HTML `<table>` as a pattern.
- **Other built-in controls.** `brushX` and `handleX` render `role="slider"` with value ARIA. `zoomX` uses `role="application"`. `interactiveColorLegend` uses native buttons with `aria-pressed`. All of these are DOM the library renders.
- **Scene layer.** It carries none of this. A recipe built on `/scene` owns the role, name, keyboard, focus, and announcements itself.

### 5. Practical costs

- **Dependencies.** React adapter: peers `react` and `react-dom` `^18 || ^19`, and a single dependency on `@tanstack/charts` pinned to `1.1.0`. Core: hard dependencies on `tslib` and 14 exact-pinned D3 modules (`d3-array`, `-scale`, `-shape`, `-geo`, `-zoom`, `-brush`, `-force`, `-hexbin`, `-sankey`, `-contour`, `-delaunay`, `-hierarchy`, `-selection`) plus five `@types/d3-*`. All of these install even when tree-shaking keeps them out of the bundle. Core also declares 13 optional peers (React, Vue, Svelte, Solid, Preact, Lit, Alpine, Angular, React Native, Octane, and others).
- **Size.** Unpacked: core 2,972,378 bytes across 581 files (`dist/` is 1.68 MB; the rest is docs and agent skills), React package 25,339 bytes.
- **Per-chart bundle cost**, from the publisher's own fixtures: a compact-scale line scene is 12,726 bytes gzip. The equivalent React consumer is 31,742 bytes gzip with React external, locked at ≤ 31.03 KiB. The landing page says "Basic React line, 32.1 kB gzip." Optional extras add their own cost: zoom about 20.4 KiB, cursor about 3.75 KiB, handle about 3.65 KiB, and the interactive legend about 2.55 KiB.
- **SSR.** "Server-side scene compilation and SVG serialization do not require browser globals." The React entries are `'use client'` but still render the complete SVG on the server at `initialWidth`, then the client adopts it. Canvas emits only empty shells on the server.
- **License.** MIT for both packages and the repo.
- **Stability.** From 1.0, removing an API, renaming an option, or changing a default requires a major release, and deprecations last for the whole major. React Native stays experimental. 1.0.0 shipped 2026-10-03 and 1.1.0 on 2026-10-09, after 34 releases in the 0.x line. The packaged docs carry a header saying they "follow unreleased `main`". The four pages I compared match the `v1.1.0` tag exactly.

### 6. Which entries are free of DOM (added for the import allowlist)

Added on [How the checker, registry build and import policy carry the chart engine](https://github.com/frankieramirez/ultima/issues/832). I walked the relative-import graph of each entry's `import` target in the 1.1.0 tarball and searched every file for `document`, `window`, `createElement`, `getComputedStyle`, `matchMedia`, `ResizeObserver`, `requestAnimationFrame`, `getContext`, `HTMLElement`, and `addEventListener`.

| Entry | Files | External imports | DOM hits |
| --- | --- | --- | --- |
| `/scene` | 14 | none | none |
| `/runtime` | 15 | none | none |
| `/types` | 1 | none | none |
| `/bar` | 8 | `d3-scale`, `d3-shape` | none |
| `/line` | 4 | none | none |
| `/area` | 5 | `d3-shape` | none |
| `/dot` | 7 | none | none |
| `/rule` | 4 | none | none |
| `/rect` | 5 | none | none |
| `/text` | 4 | none | none |
| `/tick` | 5 | none | none |
| `/band` | 6 | none | none |
| `/stack` | 1 | none | none |
| `/transform/stack` | 9 | `d3-shape` | none |
| `/scales/band`, `/scales/linear`, `/scales/point`, `/scales/ordinal` | 2 to 3 | none | none |
| `/legend` | 10 | none | `createElement` (`interactive-legend.js`) |
| `/tooltip` | 4 | none | `document`, `ResizeObserver`, `addEventListener`, `createElement`, `requestAnimationFrame` |
| `/universal` | 90 | `d3-array`, `d3-scale`, `d3-shape` | `window` (`universal.js`) |
| root | 107 | `d3-array`, `d3-scale`, `d3-shape` | `createElement`, `getComputedStyle`, `getContext` (`dom-text.js`), `window`, `matchMedia`, and more |

The walk confirms that the search finds DOM where it exists: `/legend`, `/tooltip`, `/universal` and the root all report hits. The first eighteen entries are the starting allowlist. The other subpaths in the export map, about a hundred, were not walked and stay denied until a review walks them.

## Sources

- `npm pack @tanstack/charts@1.1.0 @tanstack/react-charts@1.1.0`, extracted and read, never executed. Everything below under `core/package/` and `react/package/` is from those tarballs.
- `npm view @tanstack/charts@1.1.0` and `npm view @tanstack/react-charts`: versions, dependencies, peers, `peerDependenciesMeta`, unpacked size, file count, export map, MIT license, `repository` → github.com/TanStack/charts `packages/charts-core`.
- `core/package/dist/scene.js`, `runtime.js`, `guide-layout.js` (with an import-graph walk): `createChartScene`, `defineChart`, `defaultChartTheme` with the `var(--ts-chart-N, #hex)` palette; default `estimateSceneText`; no external imports or browser globals; axis, tick, and grid defaults (`scene.js` around lines 840–1220); focus ring defaults (`scene.js` around line 280).
- `core/package/dist/index.js` and `universal.js` (import-graph walk): the root pulls in DOM host modules; `/universal` does not.
- `core/package/dist/svg.js`, `svg-renderer.js`: SVG root attributes and inline style, `data-ts-key`, paint written as presentation attributes, `font-family="inherit"`.
- `core/package/dist/renderer.js`: the DOM host's keyboard handlers, `container.style.position`, the `prefers-reduced-motion` check, no `aria-activedescendant`.
- `core/package/dist/tooltip.js`: tooltip `role="status"`, `aria-live="polite"`, the pinned `role="dialog"`, inline card styles, tooltip CSS variables.
- `core/package/dist/types.d.ts` around lines 883 and 1011: `SceneNodeBase.className`, `RenderChartOptions.className`.
- `core/package/dist/bar.js`, `bar.d.ts`: `barY` and `barX` signatures; `bar.js` imports `d3-scale`.
- grep of `core/package/dist/**/*.js`: no style injection; the hex literal list; the `ts-chart*` class list; the `--ts-chart-*` variables with fallbacks.
- `react/package/dist/RendererChart.js`, `Chart.js`, `Chart.d.ts`, `index.d.ts`, `README.md`, `package.json`: the single `Chart` component, its props, the host and surface divs with inline styles, `dangerouslySetInnerHTML`, `'use client'`, the "compatibility package" statement.
- `core/package/docs/reference/runtime-and-scene.md` (identical to the v1.1.0 tag): the pipeline, the `ChartScene` shape, node kinds, `SceneStyle`.
- `core/package/docs/reference/rendering-and-export.md`, `docs/guides/custom-marks-and-renderers.md`: the renderer contracts, `mountChartRenderer`, `/react/core`, and "Scene generation is deterministic and DOM-free."
- `core/package/docs/reference/index.md` around line 169: the `/universal` entry described as without browser hosts or adapters.
- `core/package/docs/guides/themes-and-styling.md` (identical to the v1.1.0 tag): `currentColor` defaults, palette variables, definition `theme`, tooltip variables.
- `core/package/docs/guides/accessibility.md` (identical to the v1.1.0 tag) and `docs/guides/tooltips-and-focus.md` "Keyboard behavior": names, keyboard, reduced motion, tooltips described as supplemental, the linked-table pattern owned by the application.
- `core/package/docs/framework/react/adapter.md`, `docs/framework/react/reference/chart.md`: the React lifecycle, SSR output, sizing, `className`/`style`.
- `core/package/docs/compatibility.md` (identical to the v1.1.0 tag), `docs/stability.md`: the 1.0 contract, implementation-detail exclusions, React Native experimental.
- `core/package/docs/guides/ssr-and-hydration.md`, `docs/guides/bundle-size-and-performance.md`, `docs/installation.md`: the SSR matrix, fixture gzip measurements, peer installation.
- https://tanstack.com/charts/latest: "SVG by default. Canvas where it earns its weight," "Basic React line, 32.1 kB gzip," "Charts 1.0 has a stable API."
- https://tanstack.com/charts/latest/docs/reference/runtime-and-scene: the same `createChartScene` and `createChartRuntime` import paths and node kinds as the packaged docs.
- `gh api repos/TanStack/charts` and `/releases`: MIT license; v1.0.0 on 2026-10-03, v1.1.0 on 2026-10-09; package layout under `packages/`.
- `docs/adr/0007-engines-ship-as-recipes.md`: the headless gate and its literal reading in the 2026-09-20 amendment.
- `docs/research/2026-09-20-engine-candidates.md`, `apps/docs/src/demos/table/chart.tsx`: the existing Chart recipe draws with `d3-scale` and `d3-array` and StyleX, which is the baseline a scene-layer recipe would replace.
