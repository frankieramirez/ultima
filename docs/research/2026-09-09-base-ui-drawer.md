# What does Base UI's Drawer give and cost, next to Dialog, for a full-height edge-anchored mobile navigation panel?

## Findings

Drawer is Dialog plus a gesture layer. `Drawer.Root` calls the same `useRenderDialogRoot` Dialog does, with the mode string `'drawer'`; `Drawer.Portal` is literally `DialogPortal`; `Drawer.Viewport` renders `DialogViewport`; `Drawer.Popup` mounts the same `FloatingFocusManager` with the same props Dialog's does. Focus trapping, `modal`, scroll locking, Escape, `initialFocus`/`finalFocus`, and Title/Description wiring are shared code, not parallel implementations. What Drawer adds over Dialog is swipe-to-dismiss, a swipe-to-open edge area, snap points, an indent/scale-back effect for the page behind, a virtual-keyboard inset, an Android back-gesture close, and a set of `--drawer-*` CSS variables the consumer's transition reads.

Neither component positions itself. Both leave placement to the consumer's CSS, so "anchor the panel to the left edge, full height" is the same amount of CSS either way. The real difference is the transition: Drawer's exit is a translate whose resting transform must read `var(--drawer-swipe-movement-x)`, at a duration scaled by `var(--drawer-swipe-strength)`, with a backdrop opacity multiplied by `(1 - var(--drawer-swipe-progress))`. None of that is in Ultima's shared overlay recipe, and Ultima's recipe (`opacity` plus `scale(0.98)` over `--ult-motion-fast`) is the wrong shape for an edge panel regardless of which primitive carries it.

### Parts, and which are required

Sixteen exports from `@base-ui/react/drawer`: fifteen parts plus `createHandle` (`Drawer.createHandle`, aliased `Drawer.Handle` for the type). The anatomy in the docs nests them `Provider > IndentBackground + Indent > Root > Trigger + SwipeArea + Portal > Backdrop + Viewport > Popup > Content > Title + Description + Close`.

| Part | Renders | For | Required |
|---|---|---|---|
| `Root` | nothing | Owns open state, `swipeDirection`, `snapPoints`, `modal`. Same store as Dialog. | Yes |
| `Portal` | `<div>` | Moves the popup to `<body>` (or `container`). `keepMounted` lives here. | Yes in practice; the popup is not portaled without it |
| `Viewport` | `<div>` | Positioning container **and** the entire gesture layer: `useSwipeDismiss`, the native `touchmove` capture listener, scroll/swipe axis arbitration, snap-point release math. | Yes. `Drawer.Popup` logs a dev-only `error()` when it has no viewport context: "Omitting the viewport disables drawer swipe handling and touch scroll locking." |
| `Popup` | `<div>` | The panel. Gets `role="dialog"`, `aria-labelledby`, `aria-describedby`, `initialFocus`, `finalFocus`. Seeds the `--drawer-*` variables. | Yes |
| `Trigger` | `<button>` | Opens it. Takes `handle`, `payload`, `id`. | No (a controlled `open` or a `handle` works) |
| `Backdrop` | `<div>` | `role="presentation"` scrim. Does **not** render when `nested` unless `forceRender`. | No |
| `Title` | `<h2>` | Supplies `aria-labelledby`. | No, but Ultima's accessibility contract already requires it for Dialog |
| `Description` | `<p>` | Supplies `aria-describedby`. | No |
| `Close` | `<button>` | Closes it. | No |
| `Content` | `<div>` | Marks a subtree `data-drawer-content`. The viewport's `onPointerDown` skips starting a swipe over it, so a mouse can select text without dragging the panel. Touch is unaffected. | No |
| `SwipeArea` | `<div>` | Invisible edge strip that opens the drawer by swipe. `disabled`, and `swipeDirection` defaulting to the opposite of Root's. Sets `touch-action: pan-y`/`pan-x` inline; the consumer positions and sizes it. | No |
| `Provider` | nothing | Tracks how many drawers under it are open, and a shared swipe-progress store. | No |
| `Indent` | `<div>` | Wraps the app's own UI; gets `data-active` when any drawer under the nearest `Provider` is open, so the page can scale back. | No |
| `IndentBackground` | `<div>` | Sibling before `Indent`, same `data-active`, paints the ground revealed behind the scaled page. | No |
| `VirtualKeyboardProvider` | nothing | Keyboard-aware focus and scroll for form fields in a bottom sheet. Sets `--drawer-keyboard-inset` on the viewport. | No |

A working drawer is `Root > Portal > Viewport > Popup`, with `Backdrop`, `Title`, and a `Trigger` or controlled `open` in any real use. That is the same required spine as Dialog.

### Edge anchoring

There is no `side` or `anchor` prop. The docs say "Positioning is handled by your styles." The hero demo is a right-edge full-height panel and does it entirely in CSS:

```css
.Viewport { position: fixed; inset: 0; display: flex; justify-content: flex-end; }
.Popup   { width: 20rem; height: 100%; overflow-y: auto; overscroll-behavior: contain; touch-action: auto; }
```

`swipeDirection` on `Drawer.Root` (`'up' | 'down' | 'left' | 'right'`, default `'down'`) is the dismiss gesture, not the placement. It has to be set to match the edge the CSS chose, or the panel slides in from the right and dismisses downward. The hero uses `<Drawer.Root swipeDirection="right">` alongside the `justify-content: flex-end` viewport.

`swipeDirection` also drives real behavior beyond the gesture: the viewport derives its scroll axis from it (`left`/`right` gives a horizontal swipe axis and a vertical scroll axis), and snap points are ignored entirely unless the direction is `'up'` or `'down'` (`shouldApplySnapPoints` in `DrawerPopup.js`).

It is exposed as `data-swipe-direction` on `Drawer.Popup` and `Drawer.SwipeArea`, always present, with the direction as the value. There is no `data-side`.

### Swipe dismissal and snap points

**Swipe needs from the consumer**: the popup's resting `transform` must read the movement variable, or the panel jumps back to its resting position for a frame on release. During an active drag the gesture writes `transition: none` and `transform: translate3d(x,y,0) scale(1)` as inline styles on the popup, overriding the stylesheet. On release the inline transform is removed and the CSS rule takes over, which is why the CSS rule has to be `transform: translateX(var(--drawer-swipe-movement-x))` rather than `none`.

**Swipe cannot be turned off by a prop.** The viewport enables `useSwipeDismiss` whenever `mounted && !nestedDrawerOpen`. Three ways to suppress it, none of them a switch:

- `data-base-ui-swipe-ignore` on an element. The viewport's `onPointerDown` and `onTouchStart` both run `closest('[data-base-ui-swipe-ignore]')` on the element at the pointer position and bail. A wrapper covering the popup's whole interior stops swipe for both pointer and touch, but a press on the popup's own padding still starts one.
- `Drawer.Content`, which does the same for mouse only.
- Cancel it after the fact: `onOpenChange(open, details)` fires with `details.reason === 'swipe'`, and `details.cancel()` rejects it. The viewport then restores the pending snap point and resets the swipe. A controlled drawer that ignores the change does the same thing.

**Snap points are off unless `snapPoints` is passed.** No prop, no snap behavior, and the default is `undefined`. When passed: numbers in 0..1 are fractions of viewport height, numbers above 1 are pixels, strings take `px`/`rem`. `snapPoint`/`defaultSnapPoint`/`onSnapPointChange` control the active one, `snapToSequentialPoints` disables velocity-based skipping. A drawer with snap points must add `var(--drawer-snap-point-offset)` to its transform. Snap points do nothing on a left- or right-anchored drawer, so they are irrelevant to an edge-anchored nav panel.

Constants worth knowing: the dismiss threshold is half the popup's size along the axis (min 10px), a flick above 0.5 px/ms dismisses regardless of distance, and the release scalar `--drawer-swipe-strength` lands in 0.1..1 mapping to an 80..360ms implied duration.

### Focus, `modal`, scroll lock, Escape, stacking

Identical to Dialog, because it is the same code. `DialogInteractions` (`dialog/root/useDialogRoot.js`) runs for both and does `useScrollLock(open && modal === true, popupElement)`, `useDismiss(..., { escapeKey: isTopmost })`, and the outside-press logic. `Drawer.Root`'s `modal` prop is `true | false | 'trap-focus'` with the same three meanings and the same `true` default. `DrawerPopup` and `DialogPopup` mount `FloatingFocusManager` with the same six props, including `restoreFocus: "popup"`.

Two drawer-only differences:

- **Android back gesture.** `DrawerRoot` registers a `CloseWatcher` when the drawer is open, topmost, and the platform is Android, so the system back gesture closes it with `reason: 'closeWatcher'`. Dialog has no `CloseWatcher` anywhere. This is the one accessibility-adjacent behavior Dialog cannot be made to do.
- **`preventUnmountOnClose()`** exists on `DrawerRootChangeEventDetails` and not on Dialog's.

**Stacking.** The store counts nested dialogs and nested drawers separately: `parentContext.onNestedDialogOpen(dialogCount + 1, drawerCount + (isDrawer ? 1 : 0))`. `Drawer.Popup` reads only `nestedOpenDrawerCount` for `data-nested-drawer-open`, so a Dialog opened inside a Drawer does not collapse the drawer behind it (this was the fix "Prevent dialogs from affecting nested drawer stack", #4493, v1.4.0). `Dialog.Viewport`'s generic `data-nested-dialog-open` is explicitly suppressed on `Drawer.Viewport`.

Both count as nested only through React-tree ancestry, not open order: `nested = parentStore != null`. Two roots side by side at the app root are never nested, and each renders its own backdrop and locks scroll independently. A `Drawer.Backdrop` inside another dialog's tree does not render at all unless `forceRender`. Escape closes only the topmost (`escapeKey: isTopmost`), and swipe on a drawer is disabled while a nested drawer is open.

### Enter and exit animation, against Ultima's overlay recipe

Ultima's recipe (spec, Overlays): `transform-origin: var(--transform-origin)`, transition `opacity` and `transform` over `--ult-motion-fast`, `[data-starting-style]` and `[data-ending-style]` both at `opacity: 0; transform: scale(0.98)`, exit easing on the closing side. As a side note, `Dialog.Popup` never seeds `--transform-origin` — only the anchored-positioner popups do — so that declaration is inert on Dialog today and would be equally inert on Drawer.

A translate-from-edge transition does not need a Base UI variable for the enter and exit themselves. `translateX(100%)` under `[data-starting-style]` and `[data-ending-style]`, `translateX(0)` at rest, is plain CSS. What it needs the variables for is the gesture:

| What | Base UI seeds it as | Why the recipe does not cover it |
|---|---|---|
| Resting transform | `--drawer-swipe-movement-x` / `-y` on `Drawer.Popup` | The recipe's resting transform is `none`. The panel would snap back for a frame when the inline drag transform is dropped on release. |
| Exit duration | `--drawer-swipe-strength` (0.1..1) on Popup and Backdrop | The recipe uses a fixed `--ult-motion-fast`. The demos use `calc(var(--drawer-swipe-strength) * 400ms)` so a hard flick exits fast. |
| Backdrop opacity during the drag | `--drawer-swipe-progress` on the Backdrop | The recipe fades the backdrop between 1 and 0 on open state alone. The demos use `opacity: calc(<base> * (1 - var(--drawer-swipe-progress)))`. |
| No transition while dragging | `data-swiping` on Popup and Backdrop | Not in the recipe. The demos add `&[data-swiping] { transition-duration: 0ms }`. |
| Nested stack geometry | `--nested-drawers`, `--drawer-height`, `--drawer-frontmost-height`, `data-nested-drawer-open`, `data-nested-drawer-swiping` | Not in the recipe. Only needed if drawers stack. |
| Keyboard inset | `--drawer-keyboard-inset` on the Viewport, only under `VirtualKeyboardProvider` | Not needed for a nav panel. Always write the `0px` fallback; the provider only sets it while the keyboard is aligned. |

`--drawer-swipe-movement-x`, `-y`, `--drawer-snap-point-offset`, `--drawer-swipe-progress`, and `--drawer-swipe-strength` are registered once per page through `CSS.registerProperty` with `inherits: false` and initial values `0px`/`0`/`1`, as a style-recalculation optimization. That is a JS API call, not a stylesheet, so it is unaffected by CSP. It does mean descendants of the popup cannot read those five variables.

The demo durations are 450ms (hero, side panel) and 600ms (mobile-nav bottom sheet), against Ultima's motion scale where `fast` is the step this recipe uses. Either route needs a slower step or a documented exception.

### CSS the consumer must supply

The same shape of obligation as Dialog, and about the same volume. From the hero demo (a right-edge, full-height panel — the closest published thing to the target):

```css
.Backdrop {
  position: fixed; inset: 0; min-height: 100dvh;
  opacity: calc(var(--backdrop-opacity) * (1 - var(--drawer-swipe-progress)));
  transition: opacity 450ms cubic-bezier(0.32, 0.72, 0, 1);
  @supports (-webkit-touch-callout: none) { position: absolute; }
  &[data-starting-style], &[data-ending-style] { opacity: 0; }
  &[data-swiping] { transition-duration: 0ms; }
  &[data-ending-style] { transition-duration: calc(var(--drawer-swipe-strength) * 400ms); }
}
.Viewport { position: fixed; inset: 0; display: flex; justify-content: flex-end; }
.Popup {
  width: 20rem; height: 100%; outline: 0;
  overflow-y: auto; overscroll-behavior: contain; touch-action: auto;
  transition: transform 450ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
  transform: translateX(var(--drawer-swipe-movement-x));
  &[data-starting-style], &[data-ending-style] { transform: translateX(calc(100% + 2px)); }
  &[data-ending-style] { transition-duration: calc(var(--drawer-swipe-strength) * 400ms); }
}
```

(The published demo also carries a `--bleed` overscroll cushion and an iOS `--viewport-padding`, which are presentation choices, not requirements.) `Drawer.SwipeArea` additionally needs the consumer to place and size it — the demo uses `position: absolute; top: 0; right: 0; bottom: 0; width: 2.5rem; z-index: 1`.

**No inline `<style>` injection.** Nothing in `drawer/` or `dialog/` creates a style element or references a CSP nonce. The only two parts in the package that do are `ScrollArea.Root` and `Select.Popup` (`styles.styleDisableScrollbar.getElement(nonce)`), which is the note Ultima's spec already carries on the Select page. Worth flagging that Base UI's own mobile-nav drawer demo puts a `ScrollArea` inside the popup for the long link list; doing that in Ultima brings the CSP note back to whichever page ships it.

### Are `Provider` and `VirtualKeyboardProvider` app-root concerns?

**`VirtualKeyboardProvider` is not.** It calls `useDialogRootContext()` non-optionally, so it must sit *inside* `Drawer.Root`. The published demo places it between `Drawer.Trigger` and `Drawer.Portal`. It is fully self-contained in a registry item.

**`Provider` is app-root-shaped but optional.** It owns a set of open drawers and a shared visual-state store, and it is the thing `Indent` and `IndentBackground` read to get `data-active`. To do the scale-back-the-page effect it has to wrap both the app's own UI and the drawer root, which is app-root placement. But every consumer of it reads it optionally (`useDrawerProviderContext()` returns `undefined` with no provider) and nothing breaks: `Drawer.Root` reports through a null-safe `DrawerProviderReporter`, and `Indent`/`IndentBackground` simply never go active.

So a self-contained registry item is possible as long as it does not ship the indent effect. Shipping `Indent`, `IndentBackground`, and `Provider` as styled parts would put an app-root requirement into a component page, which no other Ultima component has.

### Stability history in 1.x

- **v1.2.0** (2026-02-12): "Create new Drawer / Sheet component" (#3680). Shipped marked preview.
- **v1.3.0** (2026-03-12): the only breaking change in the 1.x line for Drawer. "`Drawer` is no longer marked as preview. `Drawer` is now stable and should be imported as `{ Drawer } from '@base-ui/react/drawer'`" (#4293). Same release added the `SwipeArea` part (#4102) and made `data-base-ui-swipe-ignore` explicit for touch (#4295).
- **v1.4.0** (2026-04-13): warn when a popup is missing `Viewport` (#4495); prevent dialogs from affecting the nested drawer stack (#4493).
- **v1.5.0** (2026-05-19): forward `style` on `Drawer.Viewport` (#4841).
- **v1.6.0** (2026-06-18): `VirtualKeyboardProvider` added (#4353); swipe moved to native drag for performance (#4980).
- **v1.7.0** (2026-08-04) and **v1.8.0** (2026-09-04): bug fixes only — Shadow DOM gestures, iOS cross-axis scroll, snap-point edge cases, handle remount.

No breaking change since 1.3.0, six minors ago. The API surface has only grown (`SwipeArea`, `VirtualKeyboardProvider`), and the fix log is dominated by touch-gesture edge cases, which is a fair reading of where the risk sits.

### The two costs, side by side

**Reusing Dialog for a full-height edge-anchored mobile menu requires:**

1. Overriding `Dialog.Viewport`'s centering. Ultima styles it `display: grid; place-items: center; padding: space-6`. An edge panel needs `display: flex; justify-content: flex-start` (or `flex-end`), no padding, no `overflow: auto`. The part already does `stylex.props(styles.viewport, style)`, so a call-site `style` wins — but every one of those four properties has to be named in the override, not just the ones that look wrong.
2. Overriding `Dialog.Popup`'s box: `max-width: space-12` to a panel width, `max-height: 100%` to `height: 100%`, `border-radius: lg` to 0 or one edge, `border-width` on all four sides to one.
3. Replacing the shared transition on the Popup. This is the part the spec's own note warns about: "`Popup` therefore sets no position and no transform of its own, which is why the shared `scale(0.98)` transition works on it at all." A translate override must redeclare `transform` for the default state *and* both `[data-starting-style]` and `[data-ending-style]` variants, plus `transitionProperty`, or a stale `scale(0.98)` survives on whichever variant was not named. Ultima's Overlays section gains a documented exception for a second transition shape.
4. Adding `overscroll-behavior: contain` and a scroll container for a long nav list.
5. Nothing else. `modal`, focus trap and return, scroll lock, Escape, Title/Description wiring, Portal, Backdrop all come free and are byte-identical to what Drawer would give.

What that route does not get, at any price: swipe to dismiss, swipe from the edge to open, the Android back gesture, the indent effect, `data-swiping`, and the `--drawer-*` variables. No new registry item beyond Sidebar itself, no new component page, no new v0 entry, no new Base UI part surface.

**Promoting Drawer into v0 requires:**

1. A new registry item and component page, and rows in the spec's component table, styled-parts table, and accessibility contract.
2. Honouring the compound rule — "a component built on a Base UI primitive exposes every Base UI part under its own name" — across sixteen exports against Dialog's nine. A decision per part on styled versus pass-through, including for `Indent`, `IndentBackground`, `Provider`, and `SwipeArea`, which have no Dialog precedent and no obvious Ultima styling.
3. The same viewport and popup CSS as the Dialog route (Drawer positions itself no more than Dialog does), plus five extra declarations the Dialog route does not need: the resting `translateX(var(--drawer-swipe-movement-x))`, `will-change: transform`, `touch-action: auto`, `[data-swiping] { transition-duration: 0ms }` on the backdrop, and the `(1 - var(--drawer-swipe-progress))` backdrop opacity.
4. A motion answer the token scale does not currently have: a 450ms slide and an exit duration multiplied by `var(--drawer-swipe-strength)`. Both sit outside `--ult-motion-fast`/`-base` and outside the "every duration is a token that collapses to 1ms" reduced-motion rule, since a `calc()` on a token still needs the token to be the right size.
5. Accepting that swipe-to-dismiss cannot be switched off by a prop. If the Sidebar contract does not want it, the escape hatches are a `data-base-ui-swipe-ignore` wrapper or cancelling `onOpenChange` on `reason === 'swipe'`.
6. Deciding whether to ship the indent effect. Shipping it puts `Drawer.Provider` at the app root, which no other Ultima registry item requires. Not shipping it keeps the item self-contained; `VirtualKeyboardProvider` is self-contained either way.

Both routes need the same amount of positioning CSS and produce the same focus, scroll-lock, and Escape behavior. The difference is gesture affordances and Android back on one side, against a smaller public surface and no new v0 component on the other.

## Sources

- `node_modules/.pnpm/@base-ui+react@1.8.0.../@base-ui/react/drawer/index.parts.d.ts`: the sixteen exports, including `createHandle`/`Handle`.
- `.../drawer/root/DrawerRoot.d.ts`: every `Drawer.Root` prop with its default and doc comment — `modal`, `swipeDirection` (default `'down'`), `snapPoints`, `snapPoint`, `defaultSnapPoint`, `snapToSequentialPoints`, `disablePointerDismissal`, `handle`, `triggerId`, `actionsRef`; the `ChangeEventReason` union including `swipe` and `closeWatcher`; `preventUnmountOnClose()`.
- `.../drawer/root/DrawerRoot.js`: `useRenderDialogRoot('drawer', ...)`; the `CloseWatcher` registration gated on `open && isTopmost && platform.os.android`; `DrawerProviderReporter` reading the provider context optionally.
- `.../drawer/root/DrawerRootContext.d.ts`: `DrawerSwipeDirection = SwipeDirection`, `DrawerSnapPoint = number | string`, the nested-drawer reporting callbacks.
- `.../drawer/popup/DrawerPopup.js`: the dev-only `error()` when no `Drawer.Viewport` is present; `CSS.registerProperty` with `inherits: false` for the five swipe variables; the inline `style` block seeding `--nested-drawers`, `--drawer-height`, `--drawer-snap-point-offset`, `--drawer-frontmost-height`, `--drawer-swipe-strength`; `shouldApplySnapPoints` requiring `swipeDirection` of `'down'`/`'up'`; the `FloatingFocusManager` props.
- `.../drawer/popup/DrawerPopupCssVars.d.ts` and `DrawerPopupDataAttributes.d.ts`: the seven popup variables and ten popup data attributes with their documented meanings.
- `.../drawer/viewport/DrawerViewport.js`: the whole gesture layer — `useSwipeDismiss` config, `MIN_SWIPE_THRESHOLD` 10, `FAST_SWIPE_VELOCITY` 0.5, `getBaseSwipeThreshold` at half the popup's size, the 0.1..1 release scalar over an 80..360ms range, `isSwipeIgnoredTarget`/`isDrawerContentTarget` in `onPointerDown` versus `onTouchStart`, the passive-false capturing `touchmove` listener, and the suppression of `DialogViewportDataAttributes.nestedDialogOpen`.
- `.../drawer/viewport/DrawerViewportCssVars.d.ts`: `--drawer-keyboard-inset`, "Present only when the drawer is wrapped in `Drawer.VirtualKeyboardProvider`".
- `.../drawer/backdrop/DrawerBackdrop.js` and `DrawerBackdropCssVars.js`: `--drawer-swipe-progress`; `enabled: forceRender || !nested`, so a nested backdrop does not render.
- `.../drawer/content/DrawerContent.js` and `drawerContentAttribute.js`: `Content` only stamps `data-drawer-content`.
- `.../drawer/swipe-area/DrawerSwipeArea.js` and `.d.ts`: `disabled` and `swipeDirection` props, the opposite-direction default, `touchAction: 'pan-y' | 'pan-x'` set inline.
- `.../drawer/provider/DrawerProvider.js` and `DrawerProviderContext.d.ts`: `useDrawerProviderContext()` returns `undefined` with no provider; the open-drawer set and visual-state store.
- `.../drawer/virtual-keyboard-provider/DrawerVirtualKeyboardProvider.js`: `useDialogRootContext()` called non-optionally, so the provider must be inside `Drawer.Root`; it reads `viewportElement` as its measurement root.
- `.../drawer/portal/DrawerPortal.js`: `DrawerPortal = DialogPortal`, the same component.
- `.../dialog/root/useRenderDialogRoot.js`: `isDrawer = mode === 'drawer'`; the shared store and `DialogInteractions`.
- `.../dialog/root/useDialogRoot.js`: `useScrollLock(open && modal === true, popupElement)`, `useDismiss(..., { escapeKey: isTopmost })`, `onNestedDialogOpen(dialogCount + 1, drawerCount + (isDrawer ? 1 : 0))`.
- `.../dialog/popup/DialogPopup.js`: the `FloatingFocusManager` call, identical prop for prop to `DrawerPopup`'s.
- `.../dialog/viewport/DialogViewport.js`: what `Drawer.Viewport` delegates to.
- `.../utils/useSwipeDismiss.js` and `.d.ts`: `getDragStyles()` writing `transition: none` and `transform: translate3d(...)` inline while swiping and dropping both on release; `getDragTransform`; no option to disable the gesture from the consumer side.
- `.../internals/constants.js`: `BASE_UI_SWIPE_IGNORE_ATTRIBUTE = 'data-base-ui-swipe-ignore'`.
- `.../internals/createBaseUIEventDetails.d.ts`: `cancel()` on the change-event details, and `swipe`/`closeWatcher` in the reason-to-event map.
- `.../CHANGELOG.md`: v1.2.0 (Feb 12, 2026) "Create new Drawer / Sheet component (#3680)"; v1.3.0 (Mar 12, 2026) "**Breaking change:** `Drawer` is no longer marked as preview" (#4293) plus `SwipeArea` (#4102); v1.4.0 "Warn when a popup is missing `Viewport`" (#4495) and "Prevent dialogs from affecting nested drawer stack" (#4493); v1.5.0 "Forward `style` prop in `<Drawer.Viewport>`" (#4841); v1.6.0 "Add virtual keyboard provider" (#4353); v1.7.0 and v1.8.0 fixes only.
- https://base-ui.com/react/components/drawer: the anatomy tree; "Positioning is handled by your styles"; `swipeDirection` "Use `'up'`, `'left'`, or `'right'` for other drawer positions"; the snap-point transform `translateY(calc(var(--drawer-snap-point-offset) + var(--drawer-swipe-movement-y)))`; "Drawer extends Dialog: It adds gesture support, snap points, and indent effects"; the `var(--drawer-keyboard-inset, 0px)` fallback requirement; the three `modal` modes verbatim.
- https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)/react/components/drawer/demos/hero/css-modules/index.module.css and `index.tsx`: the right-edge full-height reference — `swipeDirection="right"`, the flex-end viewport, and every Popup and Backdrop declaration quoted above.
- `.../drawer/demos/position/css-modules/index.module.css`: the bottom-sheet variant of the same recipe, `translateY` in place of `translateX`.
- `.../drawer/demos/mobile-nav/css-modules/index.tsx` and `index.module.css`: Base UI's own mobile navigation drawer, a bottom sheet using `ScrollArea` inside the popup for the link list.
- `.../drawer/demos/swipe-area/css-modules/index.tsx` and `index.module.css`: `SwipeArea` positioned and sized by the consumer, alongside `modal={false}` and a `container` portal.
- `.../drawer/demos/virtual-keyboard-aware/css-modules/index.tsx`: `Drawer.VirtualKeyboardProvider` placed inside `Drawer.Root`, wrapping `Drawer.Portal`.
- `.../drawer/demos/indent-provider/css-modules/index.tsx`: `Drawer.Provider` wrapping `IndentBackground` and `Indent`, with the `Root` inside `Indent`.
- `.../scroll-area/root/ScrollAreaRoot.js` and `select/popup/SelectPopup.js`: `styles.styleDisableScrollbar.getElement(nonce)`, the package's only two inline `<style>` injections; neither `drawer/` nor `dialog/` mentions a nonce.
- `docs/spec/ultima.md`, Overlays: the shared popup recipe, `transform-origin: var(--transform-origin)`, `opacity` and `transform` over `--ult-motion-fast`, `scale(0.98)` on both transition states, reduced motion through the token dropping to 1ms, and `keepMounted` never set by Ultima.
- `docs/spec/ultima.md`, Per-component notes, Dialog: `Viewport` does the centering and `Popup` "sets no position and no transform of its own, which is why the shared `scale(0.98)` transition works on it at all".
- `docs/spec/ultima.md`, v0 release gate and Docs navigation: "Reuse Dialog for mobile navigation if it satisfies that contract. If the implementation needs a separate Sheet or Drawer, promote that component from v0.2 into v0"; the Sidebar behaviors the mobile menu must prove, including focus return and "Modal behavior uses the shared overlay component's focus management".
- `packages/ui/src/dialog.tsx`: the current styled parts — `Viewport` with `display: grid`, `place-items: center`, `inset: 0`, `overflow: auto`, `padding: space-6`; `Popup` with `max-width: space-12`, `max-height: 100%`, `borderRadius: lg`, and the `scale(0.98)` transition; every part composed as `stylex.props(styles.<part>, style)`, so a call-site `style` overrides.
- `docs/research/2026-09-08-base-ui-inventory.md`: the Dialog baseline this note builds on — part list, data attributes, `--nested-dialogs`, the `BaseUIComponentProps` styling contract, and the required global CSS (`isolation: isolate`, `body { position: relative }`).
