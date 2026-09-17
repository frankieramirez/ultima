# What does Base UI 1.8's Scroll Area leave to the consumer that Radix and shadcn expose as props, and how do its visibility and overflow signals behave?

## Findings

Three answers, one per question in the ticket.

1. `overflowEdgeThreshold` gates exactly four of the seven data attributes (`data-overflow-{x,y}-{start,end}`) and nothing else. The four CSS variables are never thresholded: they are raw pixel distances written on `Viewport` on every measurement, and the documented gradient-fade recipe reads those variables, not the attributes, so the threshold has no effect on the recipe. The default of `0` means "present once the viewport is more than 1px from that edge", because the distance is snapped to `0` or `max` inside a 1px tolerance before the comparison. The `CSS.registerProperty` skip on WebKit is real and is keyed on `CSS.supports('-webkit-backdrop-filter:none')`. In Blink and Gecko a descendant must write `--scroll-area-overflow-*: inherit` at every level between `Viewport` and itself; in WebKit the same declaration is redundant but harmless, so one stylesheet serves both.

2. Base UI's Scrollbar has one visibility mode built in, which is Radix's `auto`: unmounted when its axis does not overflow, mounted and fully visible otherwise, with `data-scrolling` present for a fixed 500ms after the last user scroll and `data-hovering` present while a non-touch pointer is over the Root. Radix's other three modes are Scrollbar CSS on those two attributes plus `keepMounted` for `always`. There is no `scrollHideDelay`: the 500ms is a module constant, and the only knob is a CSS `transition-delay` on the hide path, which can lengthen the delay but not shorten it.

3. Base UI's `Viewport` `tabIndex` is a superset of what Chromium 132+ and Firefox do natively, not a match. Native focusability in both engines is keyboard-only and conditional on actual overflow; Chromium additionally drops it when the scroller contains any keyboard-focusable descendant, Firefox does not; WebKit has none. Because Base UI sets `tabIndex` explicitly, the viewport is a tab stop in all three engines, is tabbable even when it holds focusable children, and is click-focusable, which no engine does natively. The focus ring is therefore Ultima's obligation on the same footing as `Table.Scroll`: the UA `:focus-visible` outline would appear on its own, but it is the browser's outline, not the token ring, and Safari users get no focusability at all without the explicit `tabIndex`.

Nothing below proposes Ultima's contract. Where a section says what Ultima "would write", it is pricing, not a decision.

### 1. `overflowEdgeThreshold` and the overflow signals

**The prop.** It is the only prop on `ScrollArea.Root` (`ScrollAreaRoot.d.ts`). It accepts a number or a partial `{ xStart, xEnd, yStart, yEnd }`. `normalizeOverflowEdgeThreshold` in `ScrollAreaRoot.mjs` expands a number to all four edges and clamps each to `Math.max(0, value || 0)`, so negative, `NaN`, and missing keys all become `0`. The normalized four numbers go into Root context and are read by `Viewport` only.

**What it gates.** In `ScrollAreaViewport.mjs`, `computeThumbPosition` ends with:

```js
const nextOverflowEdges = {
  xStart: !scrollbarXHidden && scrollLeftFromStart > overflowEdgeThreshold.xStart,
  xEnd:   !scrollbarXHidden && scrollLeftFromEnd   > overflowEdgeThreshold.xEnd,
  yStart: !scrollbarYHidden && scrollTopFromStart  > overflowEdgeThreshold.yStart,
  yEnd:   !scrollbarYHidden && scrollTopFromEnd    > overflowEdgeThreshold.yEnd,
};
```

Those four booleans become `data-overflow-x-start`, `data-overflow-x-end`, `data-overflow-y-start`, `data-overflow-y-end` through `scrollAreaStateAttributesMapping` in `root/stateAttributes.mjs` (present-or-absent, empty string value). That is the whole reach of the prop. The other three of the seven attributes are computed elsewhere and never see it:

- `data-has-overflow-x` / `data-has-overflow-y` come from `getHiddenState`: an axis is hidden when `clientSize >= scrollSize`, so the attribute is present when content is strictly larger than the viewport on that axis. No threshold, no tolerance.
- `data-scrolling` comes from the Root's per-axis `scrollingX`/`scrollingY` timers (section 2). It is the one attribute that uses Base UI's default mapping rather than the custom one, which is why it appears as `data-scrolling=""` like the others.
- `cornerHidden` is in the state object but is mapped to `null`, so it never becomes an attribute.

**What the default of `0` means.** The four distances are produced by `normalizeScrollOffset` in `utils/scrollEdges.mjs` with `SCROLL_EDGE_TOLERANCE_PX = 1`: a distance within 1px of the start edge is reported as `0`, within 1px of the end edge as `max`, and if both are within tolerance (a viewport that overflows by at most 2px) the nearer edge wins. So with threshold `0`, `data-overflow-y-start` appears once the viewport has scrolled more than 1px from the top, and `data-overflow-y-end` disappears once it is within 1px of the bottom. Raising the threshold to, say, `8` moves those flips to 8px. The threshold only matters to a consumer who drives a hard on/off effect from the attributes (a shadow line that toggles at the edge, for instance) and wants a dead zone so it does not flicker on sub-pixel scroll positions. A change to the prop re-runs `computeThumbPosition` in a microtask (the layout effect lists all four thresholds as dependencies), so the attributes update without a scroll.

**Which parts carry the seven.** `Root`, `Viewport`, and `Content` all render `viewportState`, so all three carry the seven. `Scrollbar` spreads the same state and overrides `scrolling` with its own axis (`scrollingY` for vertical, `scrollingX` for horizontal), then adds `hovering` and `orientation`. `Thumb` renders only `scrolling` (per axis) and `orientation`. `Corner` renders no state. This matches the `*DataAttributes.d.ts` lists the 09-09 note already recorded.

**The four variables.** `--scroll-area-overflow-x-start`, `-x-end`, `-y-start`, `-y-end` are written with `viewportEl.style.setProperty(name, `${px}px`)` inside `computeThumbPosition`, on the Viewport element only, as the same four distances before the threshold comparison. They are `0px` on a hidden axis. `computeThumbPosition` runs on every `scroll` event, on `ResizeObserver` delivery for the viewport and for `Content`, in a microtask after mount and after `hiddenState`/direction/threshold changes, and once more after any subtree animation settles. The variables do not exist during SSR or before the first measurement, which is why the docs' recipe carries a `var(--scroll-area-overflow-y-end, 40px)` fallback for the end edge (a fade at the bottom before hydration, none at the top).

**The recipe.** From the Base UI docs page, applied to `Viewport`:

```css
.Viewport {
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    black min(40px, var(--scroll-area-overflow-y-start)),
    black calc(100% - min(40px, var(--scroll-area-overflow-y-end, 40px))),
    transparent 100%
  );
  mask-repeat: no-repeat;
}
```

It reads the two vertical variables and nothing else. The fade height is `min(40px, distance)`, so it grows from `0` to `40px` over the first 40px of scroll and shrinks symmetrically at the bottom. `overflowEdgeThreshold` plays no part in it. A consumer who wants the fade on a child of the Viewport instead (a sticky header inside `Content`, for example) hits the inheritance rule below.

**`CSS.registerProperty`, confirmed.** `removeCSSVariableInheritance()` in `ScrollAreaViewport.mjs` runs once per page from a layout effect on the first `Viewport` to mount (module-level `scrollAreaOverflowVarsRegistered` flag). It registers all four names with `syntax: '<length>'`, `inherits: false`, `initialValue: '0px'`, swallowing the "already registered" error. It returns early, registering nothing, when `platform.engine.webkit` is true, or when `CSS.registerProperty` is missing. The source comment states the reason: "When `inherits: false`, specifying `inherit` on child elements doesn't work in Safari." `platform.engine.webkit` (`@base-ui/utils@0.4.0`, `platform/engine.mjs`) is `CSS.supports('-webkit-backdrop-filter:none')`, which the comment scopes to "Safari, all iOS browsers, GNOME Web" and excludes Blink because Blink ships only the unprefixed name.

What a descendant must write, per engine:

| Engine | Registration | What a descendant of `Viewport` sees with no opt-in | Opt-in |
|---|---|---|---|
| Blink, Gecko | Registered, `inherits: false`, initial `0px` | `0px` on every descendant. Not guaranteed-invalid, so a `var(--x, 40px)` fallback on a descendant resolves to `0px`, not `40px`. | `--scroll-area-overflow-y-start: inherit; --scroll-area-overflow-y-end: inherit;` on the reader, and on every element between it and `Viewport`, because `inherit` copies the parent's computed value and an intermediate element that did not opt in holds `0px`. |
| WebKit | Skipped; the four are ordinary unregistered custom properties | The Viewport's live value, because unregistered custom properties inherit. | None required. The same `inherit` declaration is a no-op here, so a single stylesheet works in both. |

Two consequences the docs page does not spell out. First, registration is page-global and permanent: after the first Scroll Area mounts in Blink or Gecko, any element anywhere on the page that reads these four names gets `0px` unless it opts in, and `var()` fallbacks for them stop firing for the rest of the page's life. Second, `syntax: '<length>'` means a consumer who sets one of these names to a non-length (a bare number, `auto`) gets `0px` at computed-value time in Blink and Gecko and the raw token in WebKit. Neither matters to a consumer who only reads the variables on `Viewport` itself, which is the documented recipe.

### 2. The visibility model

**Radix's four modes, from source** (`packages/react/scroll-area/src/scroll-area.tsx`). `ScrollArea.Root` takes `type` (default `"hover"`) and `scrollHideDelay` (default `600`). `ScrollAreaScrollbar` dispatches on `type`:

| `type` | Component | Behaviour |
|---|---|---|
| `always` | `ScrollAreaScrollbarVisible` with `data-state="visible"` | Always mounted, overflow or not. |
| `auto` | `ScrollAreaScrollbarAuto` | `ResizeObserver` on viewport and content; mounted through `Presence` while `offsetSize < scrollSize` on its axis. |
| `scroll` | `ScrollAreaScrollbarScroll` | State machine `hidden → scrolling` on a scroll delta, `scrolling → idle` 100ms after the last scroll (debounce), `idle → hidden` after `scrollHideDelay`, and `interacting` while the pointer is over the scrollbar element, which blocks the hide. |
| `hover` | `ScrollAreaScrollbarHover` wrapping `Auto` | `pointerenter` on the Root shows; `pointerleave` starts a `scrollHideDelay` timer to hide. Scroll alone does not show it. Only rendered if the axis overflows. |

Every mode unmounts through `Presence`, so an exit animation on `data-state="hidden"` runs before removal. shadcn's `scroll-area.tsx` (v4 registry, `new-york-v4`) forwards Root props unchanged and adds no default of its own, so shadcn is Radix `hover` at 600ms, with a `focus-visible` ring on the Viewport and a `transition-colors` on the scrollbar. Radix's Viewport sets no `tabIndex` (section 3).

**Base UI's built-in behaviour.** Three states the ticket asks about, all from `ScrollAreaScrollbar.mjs`, `ScrollAreaRoot.mjs`, and `ScrollAreaViewport.mjs`:

- *Viewport not scrollable on that axis, `keepMounted` false (the default).* `shouldRender = keepMounted || !isHidden` is false, and the component returns `null`. No element, no attributes, no exit transition. `Corner` does the same when either axis is hidden. Root's initial `hiddenState` is `{ x: true, y: true, corner: true }`, so on the server and on the first client render no Scrollbar and no Corner exist; they mount after the first measurement, which is a microtask after the Viewport's layout effect. With `keepMounted`, the element renders from the start with inline `visibility: hidden` until that first measurement (`hideTrackUntilMeasured`), and `Thumb` carries the same `visibility: hidden` until `hasMeasuredScrollbar`.
- *Scrollable and idle.* Mounted, absolutely positioned, and fully visible. Base UI writes no `opacity`, no `visibility`, and no attribute that a stylesheet could use to hide it. Nothing hides it but the consumer's CSS.
- *While scrolling.* `data-scrolling` is present. Root's `handleScroll` compares the new scroll position against the last one and, per axis with a non-zero delta, calls `startScrolling(axis)`, which sets the axis flag and arms a `SCROLL_TIMEOUT = 500` ms timer that clears it; every further delta restarts the timer. `Scrollbar` and `Thumb` show their own axis; `Root`, `Viewport`, and `Content` show the union. Only user scrolls count: the Viewport's `onScroll` calls `handleScroll` only if `touchModality` is true or `programmaticScrollRef` is false, and that ref goes false on `wheel`, `pointermove`, `pointerenter`, or `keydown` on the Viewport and resets to true 100ms after scroll events stop. A `scrollTo()` from script with no pointer over the area therefore never lights the attribute. Thumb drag and track click call `handleScroll` directly, and releasing a drag clears the axis flag immediately rather than waiting out the 500ms.

`data-hovering` is separate. Root's `onPointerEnter`/`onPointerMove` set `hovering` when `event.pointerType !== 'touch'` and the target is inside the Root; `onPointerLeave` clears it with no delay; a layout effect on Viewport mount sets it if the viewport already `:matches(':hover')`. Touch never sets it. It is exposed on `Scrollbar` only.

So the three modes a consumer can build are on two attributes and one prop, and the default with no consumer CSS is Radix `auto`.

**The demo's CSS**, which is what the docs page ships as the reference look (`demos/hero/css-modules/index.module.css`):

```css
.Scrollbar {
  opacity: 0;
  transition: opacity 150ms;
  pointer-events: none;
  &[data-scrolling] { transition-duration: 0ms; }
  &[data-hovering], &[data-scrolling] { opacity: 1; pointer-events: auto; }
}
```

That is a hover-or-scrolling mode with no hide delay beyond the 150ms fade. It hides the bar from touch users except during the 500ms after a scroll, since `data-hovering` never fires on touch.

**Reproducing each Radix mode in Base UI.** Each row is the delta from "Scrollbar and Thumb painted, no visibility CSS".

| Radix mode | Base UI equivalent | What differs |
|---|---|---|
| `auto` | Nothing. The default. | Base UI unmounts with `return null`, so there is no exit animation when overflow disappears; Radix's `Presence` allows one. |
| `always` | `keepMounted` on both Scrollbars, no hide CSS. | On a non-overflowing axis `computeThumbPosition` sizes the thumb to `MIN_THUMB_SIZE = 16` px (`nextHeight` is `0` for a hidden axis, clamped up to 16), where Radix's thumb fills the track at ratio 1. A consumer who wants Radix's look adds `[data-has-overflow-y]` gating on the Thumb, which is `auto` again. |
| `scroll` | `opacity: 0` at rest; `&[data-scrolling] { opacity: 1 }`; add `&:hover { opacity: 1 }` with `pointer-events` left on, to reproduce Radix's `interacting` state that holds the bar while the pointer is over it. | Hide delay is 500ms fixed, versus 600ms configurable. Extending it: `transition: opacity 150ms 100ms` at rest and `transition-delay: 0ms` in the shown rule gives 500 + 100 before the fade starts. Shortening it is not possible without forking the constant. |
| `hover` | The demo CSS minus `[data-scrolling]`: `&[data-hovering] { opacity: 1 }`, with a `transition-delay` on the resting rule for the hide delay. | Radix's `hover` also shows on `pointerenter` from a touch tap because it listens to raw pointer events; Base UI's `hovering` excludes `pointerType === 'touch'`. Radix does not show on scroll alone; the demo's union of `[data-hovering], [data-scrolling]` is a fifth mode, hover-or-scroll, that Radix has no name for. |

Should Ultima expose a `type`? The pricing, not the decision: all four modes differ only in Scrollbar CSS and one Base UI prop. A `type` axis would be a `data-*` on the Scrollbar that switches between four short rule sets Ultima writes, roughly ten lines, and a `scrollHideDelay` would be a `transition-delay` that can only add to 500ms, so it could not honour a value below that. Picking one mode costs zero lines beyond the demo's five. Two facts push on the choice: touch users never get `data-hovering`, so any hover-only mode hides the bar from them at rest, and a bar that is `opacity: 0` with `pointer-events: none` cannot be grabbed, so `scroll` and `hover` modes are pointer-scroll-only until the bar is lit.

### 3. `Viewport` `tabIndex` against native keyboard-focusable scrollers

**Base UI.** `ScrollAreaViewport.mjs`:

```js
// https://accessibilityinsights.io/info-examples/web/scrollable-region-focusable/
// Keep non-scrollable viewports out of tab order.
tabIndex: hiddenState.x && hiddenState.y ? -1 : 0,
```

Explicit on every render. Because `hiddenState` starts as both-hidden, the server markup and the first client render carry `tabindex="-1"`, and it flips to `0` in the microtask after the first measurement. It is in the `props` list ahead of `elementProps`, so a consumer's own `tabIndex` overrides it. Scrolling once focused is native (`overflow: scroll` inline); Base UI adds no key handler, and its `onKeyDown` only flips the programmatic-scroll flag.

**Chromium.** Feature "Keyboard-focusable scroll containers", chromestatus 5231964663578624. The status entry's own history: first rollout in 127, stopped for web-compat; restarted in 130, stopped for an accessibility regression; continued from 132, which is the milestone the entry lists for desktop, Android, and WebView. An opt-out deprecation trial ran through 132 (ending 2025-03-18) and an enterprise policy `KeyboardFocusableScrollersEnabled` exists. The rule, from `third_party/blink/renderer/core/dom/element.cc` at `main`:

- `IsFocusableState`: an element with no explicit `tabindex`, not editable, not a scroll-marker, gets `kKeyboardFocusableScroller` if `CanBeKeyboardFocusableScroller`, which is `IsScrollableNode(this, kNone)` → `LayoutBox::IsUserScrollable()` → `HasScrollableOverflowX() || HasScrollableOverflowY()`, each of which is `ScrollsOverflow*() && ScrollSize != PaddingBoxSize` (`layout_box.h`, `layout_box_hot.cc`, `spatial_navigation.cc`). Actual overflow is required; `overflow: auto` on a box that fits is not focusable.
- `IsKeyboardFocusableSlow`: an explicit `tabindex` decides (`>= 0` is keyboard-focusable). Otherwise, for `kKeyboardFocusableScroller`, `IsKeyboardFocusableScroller` returns false when `ContainsKeyboardFocusableElementsSlow` finds any keyboard-focusable element in the flat-tree subtree, except that a scroller which is currently the focused element stays focusable even if focusable children are added mid-scroll.
- `IsMouseFocusable`: returns false for `kKeyboardFocusableScroller`, and true for any element with an explicit `tabindex` "regardless of its value".

So a native Chromium scroller is sequentially focusable only, only while it actually overflows, and only while it contains no focusable descendant.

**Firefox.** Gecko has done this since 2004 (Bugzilla 254966, VERIFIED FIXED). `nsIFrame::IsFocusable` in `layout/generic/nsIFrame.cpp`: after the element's own focusability, `if (!(aFlags & WithMouse) && IsFocusableDueToScrollFrame()) return {true, 0}`, a tab-index-0 focusable that is skipped when focusing with the mouse. `IsFocusableDueToScrollFrame` requires a scroll container frame on an HTML element that is not a pseudo-element or native-anonymous, has no `tabindex` attribute, whose scroll styles are not hidden in both directions, and whose `GetScrollRangeForUserInputEvents()` is non-empty (actual overflow). The source comment: "we don't make them to be focusable with the mouse, because the extra focus outlines are considered unnecessarily ugly." Firefox does not check for focusable children; chromestatus's Firefox row says exactly that: "Chrome behavior is slightly different since we are checking if any scroller child is focusable."

**WebKit.** chromestatus lists Safari as "No signal", pointing at WebKit bug 190870 "Make scrollable element focusable", filed 2018-10-24, status NEW, last activity 2023-05-25, with Ryosuke Niwa's 2019 concern that deciding focusability would need current style. There is no WebKit standards-position for it. An Apple Developer Forums thread from December 2025 asking whether Safari will follow Chrome and Firefox has no reply. The Interop issue web-platform-tests/interop#762 records: Chrome 130+ ships it, Firefox has it, Safari requires `tabindex`.

**The spec.** There is no new spec text. The HTML Standard's focusable-area table already lists "the scrollable regions of elements that are being rendered and are not inert", with the element as the DOM anchor, and the `tabindex` section says a user agent "should follow platform conventions to determine if the element should be considered as a focusable area" when the attribute is omitted. Chromium's Intent to Ship said as much: no formal spec, the design "relies on the HTML Standard's provision that 'the element is determined by the user agent to be focusable'". chromestatus links the `tabindex` section; the Chrome 130 and 132 release notes link css-overflow-3's `scroll-container` definition instead. The W3C ACT rule "Scrollable content can be reached with sequential focus navigation" (0ssw9k) is the conformance rule this satisfies.

**Does Base UI match native?** Only in one respect: both drop focusability when nothing overflows (Base UI's `-1`, native's non-scrollable check). In every other respect Base UI's explicit `tabIndex` is a superset:

| | Base UI `Viewport` | Chromium 132+ native | Firefox native | WebKit native |
|---|---|---|---|---|
| Tab stop when overflowing | Yes | Yes, if no focusable descendant | Yes | No |
| Tab stop when overflowing and containing a button | Yes | No | Yes | No |
| Tab stop when not overflowing | No (`-1`) | No | No | No |
| Click focuses it | Yes (explicit `tabindex` is mouse-focusable in Chromium, Gecko) | No | No | n/a |
| Exists before first measurement | No (`-1` on SSR and first paint) | Layout-dependent | Layout-dependent | n/a |

**Whose obligation is the ring.** The browser's UA stylesheet would paint one: Chromium's `html.css` has `:focus-visible { outline: auto 1px -webkit-focus-ring-color }`, which applies to any element that matches `:focus-visible`, including a keyboard-focused div with `tabindex="0"`. But that outline is the UA's, not the token ring, and it is the same outline every element Ultima already restyles would get. The reasons the ring is Ultima's rather than the browser's are the same as for `Table.Scroll` (`packages/ui/src/table.tsx` lines 43 to 49, which already writes `:focus-visible` with `border.focus` and `border.focusOffset`): the focusability itself comes from an explicit `tabIndex` that Base UI sets and Safari would otherwise never grant, and the ring has to be the system's. The native feature changes nothing about that: on Chromium it would only matter to a Viewport with no `tabindex`, which Base UI never renders.

One fact for the contract writer: `Table.Scroll` sets `tabIndex={0}` unconditionally, so a table that fits is still a tab stop, where `ScrollArea.Viewport`, Chromium native, and Firefox native all drop it. The proof-bar sentence "`Table.Scroll` taking focus and scrolling when its content actually overflows" describes the overflowing case only.

### Facts later tickets will need

- `overflowEdgeThreshold` affects only `data-overflow-{x,y}-{start,end}`. Default `0` means "more than 1px from the edge" because of `SCROLL_EDGE_TOLERANCE_PX = 1`.
- The four `--scroll-area-overflow-*` variables are unthresholded pixel distances on `Viewport` only, absent before first measurement and on SSR.
- Descendant readers write `--scroll-area-overflow-*: inherit` on themselves and every intermediate element; harmless in WebKit, required in Blink and Gecko. After the first mount in Blink/Gecko, `var()` fallbacks for those names never fire again anywhere on the page.
- WebKit detection is `CSS.supports('-webkit-backdrop-filter:none')`.
- Scrollbar default is Radix `auto`: `return null` without overflow (no exit animation), visible otherwise. `keepMounted` gives `always` with a 16px minimum thumb on a non-overflowing axis.
- `data-scrolling` lasts `SCROLL_TIMEOUT = 500` ms after the last user-driven scroll delta on that axis; not a prop. Programmatic scrolls do not light it unless in touch modality.
- `data-hovering` is on `Scrollbar` only, never on touch, no delay on leave.
- `Viewport` `tabindex` is `-1` on SSR and first paint, `0` once any axis overflows, and is click-focusable and tabbable-with-focusable-children, which no engine does natively. The ring is Ultima's, copying `Table.Scroll`.
- Chromium ships native keyboard-focusable scrollers from 132 (after 127 and 130 rollbacks), keyboard-only, actual overflow required, skipped when a focusable descendant exists. Firefox since 2004, keyboard-only, no descendant check. WebKit: nothing, bug 190870 open since 2018.

## Sources

- `node_modules/.pnpm/@base-ui+react@1.8.0_.../node_modules/@base-ui/react/scroll-area/root/ScrollAreaRoot.mjs`: `normalizeOverflowEdgeThreshold` (number-to-four expansion, `Math.max(0, v || 0)`), `startScrolling` with `SCROLL_TIMEOUT`, `handleScroll`'s per-axis delta test, `handlePointerEnterOrMove` excluding `pointerType === 'touch'`, `onPointerLeave` clearing `hovering`, `DEFAULT_HIDDEN_STATE` all-true, drag release clearing `scrolling` immediately, and the `state` object with `cornerHidden`.
- `.../scroll-area/root/ScrollAreaRoot.d.ts`: `overflowEdgeThreshold` as the only Root prop, its type, `@default 0`, and the seven-field `ScrollAreaRootState`.
- `.../scroll-area/root/stateAttributes.mjs`: the custom mapping for six attributes and `cornerHidden: () => null`; `scrolling` falls to the default mapping.
- `.../scroll-area/root/ScrollAreaRootDataAttributes.d.ts`, `scrollbar/ScrollAreaScrollbarDataAttributes.d.ts`, `viewport/ScrollAreaViewportCssVars.d.ts`: attribute and variable names and their doc strings.
- `.../scroll-area/viewport/ScrollAreaViewport.mjs`: `removeCSSVariableInheritance` (module flag, `platform.engine.webkit` early return, `CSS.registerProperty` with `syntax: '<length>'`, `inherits: false`, `initialValue: '0px'`), `computeThumbPosition` writing the four variables with `style.setProperty` and computing `nextOverflowEdges` with `> overflowEdgeThreshold.*`, `getHiddenState` (`clientSize >= scrollSize`), `MIN_THUMB_SIZE` clamp, the `tabIndex: hiddenState.x && hiddenState.y ? -1 : 0` line with its accessibilityinsights comment, the `programmaticScrollRef` gating and 100ms reset, and the `[props, elementProps]` order.
- `.../scroll-area/scrollbar/ScrollAreaScrollbar.mjs` and `.d.ts`: `keepMounted = false`, `shouldRender = keepMounted || !isHidden`, `return null`, `hideTrackUntilMeasured` → inline `visibility: hidden`, per-axis `scrolling` override, `hovering` and `orientation` in state, `aria-hidden`.
- `.../scroll-area/thumb/ScrollAreaThumb.mjs`: `visibility: hidden` until `hasMeasuredScrollbar`; state is `scrolling` (per axis) and `orientation` only.
- `.../scroll-area/corner/ScrollAreaCorner.mjs`: returns `null` when `hiddenState.corner`.
- `.../scroll-area/content/ScrollAreaContent.mjs`: `ResizeObserver` on Content calling `computeThumbPosition`; renders `viewportState`.
- `.../scroll-area/constants.mjs`: `SCROLL_TIMEOUT = 500`, `MIN_THUMB_SIZE = 16`.
- `.../@base-ui/react/utils/scrollEdges.mjs`: `SCROLL_EDGE_TOLERANCE_PX = 1` and `normalizeScrollOffset`'s snap to `0`/`max`.
- `.../@base-ui/react/internals/getStateAttributesProps.mjs`: default mapping (`true` → `data-<key>=""`), which is how `scrolling` is emitted.
- `node_modules/.pnpm/@base-ui+utils@0.4.0_.../node_modules/@base-ui/utils/platform/engine.mjs`: `webkit = CSS.supports('-webkit-backdrop-filter:none')`, scoped in the comment to Safari, all iOS browsers, GNOME Web, excluding Blink.
- `packages/ui/src/table.tsx` lines 30 to 75: `Table.Scroll` is `<div role="region" tabIndex={0}>` with `overflow: auto` and a `:focus-visible` outline from `border.focus`/`border.focusOffset`; `tabIndex` is unconditional.
- `docs/research/2026-09-09-base-ui-docs-patterns.md`: the `<style>` injection, part split, inline styles, and the four edge variables, built on rather than redone here.
- https://base-ui.com/react/components/scroll-area: `overflowEdgeThreshold` description and default `0`, the per-part attribute and variable tables, `keepMounted` description, the gradient-fade recipe with the `40px` fallback, and the prose "inheritance to children is disabled, so they must explicitly opt-in using the `inherit` keyword" with the `.Child` example.
- https://raw.githubusercontent.com/mui/base-ui/master/docs/src/app/(docs)/react/components/scroll-area/demos/hero/css-modules/index.module.css: the demo's `.Scrollbar` rules (`opacity: 0`, `transition: opacity 150ms`, `pointer-events: none`, `[data-scrolling]` zero-duration, `[data-hovering], [data-scrolling]` shown) and the Viewport `:focus-visible` outline.
- https://raw.githubusercontent.com/radix-ui/primitives/main/packages/react/scroll-area/src/scroll-area.tsx: `type = ScrollAreaType.Hover`, `scrollHideDelay = 600`, the four Scrollbar variants, the `hidden/scrolling/interacting/idle` machine with its 100ms scroll-end debounce and `scrollHideDelay` hide timer, `Hover`'s `pointerenter`/`pointerleave` on the Root, `Auto`'s `ResizeObserver` overflow test, `Presence` gating, and the Viewport rendering no `tabIndex`.
- https://raw.githubusercontent.com/radix-ui/website/main/data/primitives/docs/components/scroll-area.mdx: the `type` value descriptions, the `scrollHideDelay` description ("before the scrollbars are hidden after the user stops interacting with scrollbars"), `forceMount`, and the accessibility note that scrolling is native.
- https://www.radix-ui.com/primitives/docs/components/scroll-area: `type` default `"hover"`, `scrollHideDelay` default `600`, Scrollbar and Thumb `data-state` `"visible" | "hidden"`.
- https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/scroll-area.tsx: Root props forwarded unchanged (so Radix `hover`, 600ms), `focus-visible:ring-[3px]` on the Viewport, `transition-colors` on the scrollbar.
- https://chromestatus.com/api/v0/features/5231964663578624: "Keyboard-focusable scroll containers"; the 127, 130, and 132 rollout history; milestone 132 for desktop, Android, WebView; spec link to the HTML `tabindex` section; Firefox "Shipped/Shipping" with the note about the focusable-child difference; Safari "No signal" pointing at WebKit bug 190870.
- https://developer.chrome.com/blog/keyboard-focusable-scrollers: the rule (no keyboard-focusable children, no explicit `tabindex`), keyboard-only, opt-out via `tabindex="-1"` or a focusable child, and the push from 130 to 132.
- https://developer.chrome.com/release-notes/130 and https://developer.chrome.com/release-notes/132: the 130 entry with the opt-out trial ending 2025-03-18 and the `KeyboardFocusableScrollersEnabled` policy; the 132 entry "stopped due to an accessibility regression ... continues to roll out with Chrome 132"; both link css-overflow-3 `scroll-container`.
- https://groups.google.com/a/chromium.org/g/blink-dev/c/jzMA5vUqNDs: the original Intent to Ship; no formal spec, reliance on "determined by the user agent to be focusable"; Firefox already ships; WebKit no signal.
- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/dom/element.cc: `CanBeKeyboardFocusableScroller`, `ContainsKeyboardFocusableElementsSlow`, `IsKeyboardFocusableScroller` (keeps focus if already focused), `IsKeyboardFocusableSlow` (explicit `tabindex >= 0` wins), `IsMouseFocusable` (explicit `tabindex` "regardless of its value" is mouse-focusable; `kKeyboardFocusableScroller` is not), and `IsFocusableState`.
- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/page/spatial_navigation.cc: `IsScrollableNode` with `kNone` → `IsUserScrollable()`.
- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/layout/layout_box_hot.cc and `layout_box.h`: `IsUserScrollable = HasScrollableOverflowX() || HasScrollableOverflowY()`, each `ScrollsOverflow*() && ScrollSize != PhysicalPaddingBoxRect size`.
- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/resources/html.css: `:focus-visible { outline: auto 1px -webkit-focus-ring-color }`.
- https://raw.githubusercontent.com/mozilla-firefox/firefox/main/layout/generic/nsIFrame.cpp: `nsIFrame::IsFocusable`'s `!(aFlags & WithMouse) && IsFocusableDueToScrollFrame()` → `{true, 0}`, and `IsFocusableDueToScrollFrame`'s conditions (scroll container frame, HTML element, no `tabindex` attribute, not hidden in both directions, non-empty user-input scroll range) with the "unnecessarily ugly" comment.
- https://bugzilla.mozilla.org/show_bug.cgi?id=254966: "overflow:scroll/auto not keyboard accessible/focusable", VERIFIED FIXED, 2004.
- https://bugs.webkit.org/show_bug.cgi?id=190870: "Make scrollable element focusable", NEW, filed 2018-10-24, last activity 2023-05-25, Ryosuke Niwa's style-recalc concern.
- https://developer.apple.com/forums/thread/810694: December 2025 question on Safari parity, zero replies.
- https://github.com/web-platform-tests/interop/issues/762: Chrome 130+ ships, Firefox has it with differences, Safari requires `tabindex`; links the HTML focusable-area section, chromestatus, and WebKit bug 190870.
- https://html.spec.whatwg.org/multipage/interaction.html#focusable-area: "The scrollable regions of elements that are being rendered and are not inert" in the focusable-area table, and the `tabindex`-omitted text "The user agent should follow platform conventions to determine if the element should be considered as a focusable area".
- https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/: ACT rule "Scrollable content can be reached with sequential focus navigation".
