# What is Base UI 1.8's Drawer, part by part, and what does it demand of the consumer's app shell?

## Findings

Drawer is Dialog plus three layers the consumer has to host: a **gesture layer** on `Viewport`, an **app-shell indent layer** (`Provider` + `IndentBackground` + `Indent`) that lives above `Root` and outside the portal, and an opt-in **virtual-keyboard layer** that lives inside `Root`. Five of the fifteen parts (`Portal`, `Trigger`, `Title`, `Description`, `Close`) are not new code at all — they are the Dialog components re-exported under a new name.

Answering the six questions in one line each:

1. `Indent` and `IndentBackground` **do** implement the iOS-style scaling of the page behind the drawer, and they implement exactly one half of it: they supply `[data-active]` and, on `Indent` only, two live CSS variables. Every transform, scale, radius and colour is the consumer's. They require a `Drawer.Provider` above them and a positioned, clipping wrapper around them.
2. `Provider` is optional and fails silently; `VirtualKeyboardProvider` **throws** outside `Drawer.Root` and no-ops silently without a `Drawer.Viewport`. Neither needs anything at the document root. The Navigation Menu equivalent does not exist here: Drawer portals through the identical `DialogPortal` and locks scroll through the identical `useScrollLock`, so it inherits the two already-documented global rules and adds no third.
3. Six parts carry behavior-bearing CSS: `Popup`, `Backdrop`, `Viewport`, `Indent`, `SwipeArea`, and (for the keyboard case) whatever the consumer made scrollable inside the popup. Nine variables, all seeded as inline styles, five of them registered `inherits: false`.
4. The swipe gesture needs **no `touch-action` from the consumer**, and Base UI sets none on `Viewport` or `Popup`. It runs on a non-passive capturing `touchmove` on `document`. The Android back gesture needs nothing at all — no CSS, no markup, no prop.
5. **Drawer has no CSP implication of the Scroll Area kind.** `drawer/` and `dialog/` never reference a nonce and never inject a `<style>` or `<script>` element. It has a different one: it is built on inline `style` attributes, two of which are emitted during SSR.
6. Drawer's absence of a `Positioner` costs it nothing, because **Dialog has no `Positioner` either and never seeded `--transform-origin`**. The real difference is that Drawer's *resting* transform must read a live variable, where Dialog's is a constant.

Nothing below proposes Ultima's contract.

### 1. The fifteen parts

Element, what Base UI writes onto it, and whether the code is Drawer's own or Dialog's.

| Part | Renders | What Base UI puts on it | Own code? |
|---|---|---|---|
| `Root` | nothing | Calls `useRenderDialogRoot('drawer', …)`. Owns `swipeDirection`, `snapPoints`, `modal`, `handle`. Always renders an internal `DrawerProviderReporter` as its first child, whether or not a `Provider` exists. | Drawer |
| `Provider` | nothing | Context only: a `Set` of open drawer stores, plus a hand-rolled `visualStateStore` holding `{ swipeProgress, frontmostHeight }`. Sits **above** `Root`. | Drawer |
| `Trigger` | `<button>` | `DrawerTrigger = DialogTrigger`, identical export. | Dialog |
| `Portal` | `<div>` | `DrawerPortal = DialogPortal`, identical export. | Dialog |
| `Backdrop` | `<div role="presentation">` | Inline `pointer-events: none` while closed, `user-select: none`, `-webkit-user-select: none`, and seeds `--drawer-swipe-progress: 0` and `--drawer-swipe-strength: 1`. `enabled: forceRender \|\| !nested`, so a nested backdrop does not render. | Drawer |
| `Viewport` | `<div role="presentation">` | Delegates rendering to `DialogViewport` (which adds `hidden` while unmounted and inline `pointer-events: none` while closed) and wraps it in the whole gesture layer. Suppresses Dialog's `data-nested-dialog-open`. | Drawer |
| `Popup` | `<div role="dialog">` | `aria-labelledby`, `aria-describedby`, `initialFocus`, `finalFocus`, `FloatingFocusManager` with `restoreFocus: "popup"`. Seeds six variables inline plus the live drag styles. Calls `CSS.registerProperty` once per page. | Drawer |
| `Content` | `<div data-drawer-content>` | Nothing but the marker attribute. | Drawer |
| `Title` | `<h2>` | `DrawerTitle = DialogTitle`. | Dialog |
| `Description` | `<p>` | `DrawerDescription = DialogDescription`. | Dialog |
| `Close` | `<button>` | `DrawerClose = DialogClose`. | Dialog |
| `Indent` | `<div>` | `data-active` / `data-inactive`, an inline `--drawer-swipe-progress: 0`, and an imperative subscription that writes `--drawer-swipe-progress` and `--drawer-height` onto itself from the provider's store. | Drawer |
| `IndentBackground` | `<div>` | `data-active` / `data-inactive`. **Nothing else** — no variables, no styles. | Drawer |
| `SwipeArea` | `<div role="presentation" aria-hidden>` | Inline `touch-action: pan-y` (for a left/right open) or `pan-x` (up/down), and `pointer-events: none` when disabled. **No size, no position.** | Drawer |
| `VirtualKeyboardProvider` | nothing | Context only. Reads the Dialog store, writes `--drawer-keyboard-inset` onto the *viewport* element, and mutates the focused field's scroll container inline. Sits **inside** `Root`. | Drawer |

Plus `createHandle` / `Handle` for detached triggers, which is the same handle mechanism Dialog has.

Note the two providers nest in opposite directions. The published anatomy is `Provider > IndentBackground + Indent > Root > Trigger + SwipeArea + Portal > Backdrop + Viewport > Popup > Content > Title + Description + Close`, and the virtual-keyboard example is `Drawer.Root > Drawer.VirtualKeyboardProvider > …`.

#### `Indent` and `IndentBackground`: yes, this is the iOS effect

Said plainly: **yes.** The docs head the section "Scale the background down when any drawer opens", and the maintainers' own CSS Modules demo is the iOS sheet presentation exactly — the page scales to `0.98`, drops `0.5rem`, gains a top corner radius, and reveals a black layer behind it.

What Base UI actually provides is narrow. `IndentBackground` gets **one** state attribute and nothing else. `Indent` gets that same attribute plus two variables written imperatively onto itself:

- `--drawer-swipe-progress`, a number, `0` when no swipe is in flight;
- `--drawer-height`, the frontmost open drawer's measured height in px, **removed** when that height is 0.

Both are pushed by `Drawer.Viewport` into `Provider`'s `visualStateStore`; `Indent` subscribes and calls `element.style.setProperty`. On unmount it resets progress to `0` and removes the height.

The markup the effect requires at the app root, from the demo:

```jsx
<Drawer.Provider>
  <div ref={setPortalContainer} className="wrapper">   {/* position: relative; overflow: hidden */}
    <Drawer.IndentBackground />                         {/* position: absolute; inset: 0; background */}
    <Drawer.Indent>
      {/* the entire app UI */}
      <Drawer.Root modal={false}>
        <Drawer.Portal container={portalContainer}>…</Drawer.Portal>
      </Drawer.Root>
    </Drawer.Indent>
  </div>
</Drawer.Provider>
```

and the CSS that makes it move, with the load-bearing parts marked:

```css
.wrapper { position: relative; overflow: hidden; }     /* clips the scaled page */
.IndentBackground { position: absolute; inset: 0; background-color: black; }
.Indent {
  --indent-radius: calc(1rem * (1 - var(--drawer-swipe-progress)));
  --indent-transition: calc(1 - clamp(0, calc(var(--drawer-swipe-progress) * 100000), 1));
  position: relative;
  transform-origin: center top;
  will-change: transform;
  contain: layout;
  transition: transform .4s cubic-bezier(.32,.72,0,1), border-radius .25s cubic-bezier(.32,.72,0,1);
  transition-duration: calc(400ms * var(--indent-transition)), calc(250ms * var(--indent-transition));
}
.Indent[data-active] {
  transform: scale(calc(0.98 + (0.02 * var(--drawer-swipe-progress))))
             translateY(calc(0.5rem * (1 - var(--drawer-swipe-progress))));
  border-top-left-radius: var(--indent-radius); border-top-right-radius: var(--indent-radius);
}
```

The `--indent-transition` trick is worth naming: it collapses the transition duration to `0ms` the moment `--drawer-swipe-progress` rises above zero, so the page tracks the finger with no lag, and restores the duration when the swipe ends. That is a consumer-authored idiom, not a Base UI behavior.

Three things about this demo are demo-shaped rather than app-shaped, and the docs never show the app-root form:

- The wrapper is a local box, so the demo passes `container={portalContainer}` and makes `Backdrop` and `Viewport` `position: absolute`. At a real app root the drawer would portal to `<body>` and use `position: fixed`, and `IndentBackground` would need an `inset: 0; position: fixed` or the page background painted on `html`. **The source does not settle this and no demo shows it.**
- `Drawer.Indent` is transformed while active, which makes it a containing block for `position: fixed` descendants. Anything the app already renders with `position: fixed` inside the indented subtree — a sticky header, a toast region — will be pinned to the scaled page rather than the viewport for as long as a drawer is open. The docs never mention this; it follows from CSS, and it is the sharpest app-shell consequence of adopting `Indent`.
- The demo uses `modal={false}`. Nothing in the source ties the indent effect to non-modal, and the `active` flag is computed from open state alone.

One discrepancy between the published prose and the source: the Indent-effect section says "Any `<Drawer.Root>` within the provider notifies it **when it mounts**, which activates the indent parts". The source disagrees — `DrawerProviderReporter` calls `setDrawerOpen(store, open)` and `active` is `openDrawers.size > 0`. The API reference states it correctly ("Whether any drawer within the nearest `<Drawer.Provider>` is open"). Treat the API reference and the source as authoritative; mounting a closed drawer does not activate the indent.

### 2. What `Provider` and `VirtualKeyboardProvider` require

**`Drawer.Provider` requires nothing and fails silently.** `useDrawerProviderContext()` is a bare `useContext` with no throw, and every consumer reads it optionally (`providerContext?.active ?? false`). Without a provider:

- `Indent` and `IndentBackground` render `data-inactive` forever and the indent effect is simply dead;
- `Indent`'s `--drawer-swipe-progress` stays frozen at the `0` it sets inline, and `--drawer-height` is never set;
- everything else — open/close, focus, scroll lock, swipe dismiss, snap points, the Android back gesture — is unaffected, because `DrawerProviderReporter` is rendered by `Root` unconditionally and only its provider calls are optional.

It renders no element, so it introduces no layout and no stacking context of its own.

**`Drawer.VirtualKeyboardProvider` has two requirements, one hard and one silent.**

Hard: it calls `useDialogRootContext(false)` — `false` is the `optional` argument, so the guard is armed — and therefore **throws outside `Drawer.Root`**: `Base UI: DialogRootContext is missing. Dialog parts must be placed within <Dialog.Root>.` The published example places it as `Drawer.Root > Drawer.VirtualKeyboardProvider > …`, and that is the only valid position.

Silent: it takes `viewportElement` from the store as its measurement root and does nothing if there is none. The source comments on this deliberately: *"The provider requires a `<Drawer.Viewport>` to act as the measurement and containment root and to host the keyboard inset variable; `<Drawer.Popup>` already warns when the viewport is missing, so there is no need to fall back to the popup element here."* So a drawer with no `Viewport` gets the popup's dev warning and a keyboard provider that quietly does nothing.

What it does to the consumer's DOM while a field is focused, all as inline styles on whichever element it found scrollable:

- `overflow-anchor: none`;
- `padding-bottom` set to the **computed** padding plus up to 48px of slack (`KEYBOARD_SCROLL_SLACK`), only when there is real keyboard overlap;
- `scroll-padding-bottom` set to the computed value plus 16px (`KEYBOARD_VISIBILITY_MARGIN`).

It reads the computed value first and writes an absolute inline value, so a padding set from a stylesheet is preserved in the arithmetic but overridden for the duration, and the originals are restored on cleanup. It also pins `window.scrollX/scrollY` against WebKit's native reveal scroll while `modal === true`, and scrolls with `behavior: 'smooth'` unless `(prefers-reduced-motion: reduce)` matches, in which case `'auto'`.

It registers listeners on `visualViewport` (`resize`, `scroll`), on `document` (`focusin`, `focusout`, `pointerdown`, all capture) and on `window` (`scroll`).

**The Navigation Menu question — is there a late-surfacing app-root rule here?** No new one. Drawer portals through the literal same component (`DrawerPortal = DialogPortal`) and locks scroll through the same `useScrollLock(open && modal === true, popupElement)` call in `dialog/root/useDialogRoot.js`. So it inherits the two rules the spec already documents for every portalling component — `isolation: isolate` on the app root and `body { position: relative }` for iOS 26 Safari — and needs nothing beyond them.

For completeness, what the shared scroll lock itself writes while a modal drawer is open, since it is the thing those rules exist to survive: on `<html>`, `scrollbar-gutter: stable`, `overflow-x/y` forced, and the attribute `data-base-ui-scroll-locked`; on `<body>`, inline `position: relative`, `height: calc(100dvh - …)`, `width: calc(100vw - …)`, `box-sizing: border-box`, `overflow-x/y: hidden`, `scroll-behavior: unset`. All are captured and restored on cleanup. The `position: relative` the spec asks a consumer to author is the same declaration the lock writes, which is why it matters only in the unlocked and non-modal cases.

The genuinely new app-shell demand is the indent structure in §1, and it is opt-in.

### 3. The parts whose CSS the behavior depends on, and the variables

Every variable is an **inline style on a part** — either React's `style` object or `element.style.setProperty`. None comes from a stylesheet, so none can be beaten by a cascade layer.

| Variable | Seeded on | How | Value |
|---|---|---|---|
| `--drawer-swipe-movement-x` | `Popup` | React `style`, from `getDragStyles()` | px delta on X, `0px` at rest |
| `--drawer-swipe-movement-y` | `Popup` | same | px delta on Y |
| `--drawer-snap-point-offset` | `Popup` | React `style` | px, or `0px` when snap points are off |
| `--drawer-swipe-strength` | `Popup`, `Backdrop` | React `style` | number in 0.1–1, `1` when not released from a swipe |
| `--nested-drawers` | `Popup` | React `style` | integer stack depth, frontmost is `0` |
| `--drawer-height` | `Popup`, and `Indent` | React `style` / `setProperty` | px — **absent unless a nested drawer is open or the drawer is exiting** |
| `--drawer-frontmost-height` | `Popup` | React `style` | px, `undefined` when 0 |
| `--drawer-swipe-progress` | `Backdrop`, `Popup`, `Indent` | React `style` seeds `0`; `Viewport` and `Indent` overwrite with `setProperty` | number |
| `--drawer-keyboard-inset` | `Viewport` | `setProperty`, **only** by `VirtualKeyboardProvider` | px |

Which parts must carry real CSS, and what breaks without it:

- **`Popup` — the resting transform must read the movement variable.** During a drag `getDragStyles()` writes inline `transition: none` and `transform: translate3d(x, y, 0) scale(…)`, which override the stylesheet. On release both are dropped and the stylesheet rule takes over. If that rule is `transform: none`, the panel snaps to its resting position for a frame before the variable-driven animation would have run. The rule has to be `transform: translateX(var(--drawer-swipe-movement-x))` (or `translateY(calc(var(--drawer-snap-point-offset) + var(--drawer-swipe-movement-y)))` for a vertical drawer with snap points).
- **`Popup` — `--drawer-height` needs the `auto` fallback.** The source computes `popupHeightCssVarValue` and leaves it `undefined` whenever `!hasNestedDrawer && transitionStatus !== 'ending'`. A bare `height: var(--drawer-height)` is therefore invalid at rest. The documented form is `height: var(--drawer-height, auto)`.
- **`Popup` — clipping is required only for variable-height stacking**, where the documented pair is `[data-nested-drawer-open] { height: calc(var(--stack-height) + var(--bleed)); overflow: hidden; }`.
- **`Backdrop` — opacity must read the progress**, `opacity: calc(var(--backdrop-opacity) * (1 - var(--drawer-swipe-progress)))`, or the scrim does not track the drag. It also needs `[data-swiping] { transition-duration: 0ms }`, because unlike the popup it gets no inline `transition: none`.
- **`Viewport` — layout, plus it is the gesture root.** It positions the popup (`position: fixed; inset: 0;` plus flex alignment for the edge). Beyond that, `findScrollableTouchTarget(target, rootElement, axis)` walks from the touched node up to the viewport element, so which descendants the consumer makes scrollable is what arbitrates scroll against swipe. A popup that is `overflow-y: auto` on the swipe axis will hand the gesture to the scroller except at the scroll edge.
- **`Indent` — transform, origin, and the two variables**, as in §1.
- **`SwipeArea` — must be positioned and sized by the consumer or swipe-to-open does not exist.** Base UI supplies `touch-action` and nothing dimensional. The demo is `position: absolute; inset-block: 0; right: 0; width: 2.5rem; z-index: 1`.

**The `inherits: false` trap.** `DrawerPopup` calls `CSS.registerProperty` once per page, the first time a popup renders, for five of these:

| Registered | syntax | initialValue |
|---|---|---|
| `--drawer-swipe-movement-x` | `<length>` | `0px` |
| `--drawer-swipe-movement-y` | `<length>` | `0px` |
| `--drawer-snap-point-offset` | `<length>` | `0px` |
| `--drawer-swipe-progress` | `<number>` | `0` |
| `--drawer-swipe-strength` | `<number>` | `1` |

all with `inherits: false`. The source's reason is performance, not interpolation — the comment cites style-recalculation cost in deep subtrees and notes that inheritance stays off on WebKit too "because Drawer does not rely on descendant access to these vars (unlike ScrollArea)". Two consequences for a consumer:

1. **Descendants of the seeded element cannot read them.** A rule on a child of `Popup` or `Indent` that reads `var(--drawer-swipe-progress)` gets the registered initial value, not the live one. It does not fail loudly; it resolves to `0` (or `1`, or `0px`) and stays there. Every maintainer demo reads these variables on the element they are seeded on.
2. **The behavior differs before the first popup mounts.** Registration happens at first `DrawerPopup` render and never during SSR, so on a server-rendered page the variables inherit normally until the first drawer mounts, then stop.

### 4. What the swipe and the Android back gesture actually require

**`touch-action`: not required, and not set by the primitive on the parts that dismiss.** There is no `touch-action` anywhere in `utils/useSwipeDismiss.js`, and neither `DrawerViewport` nor `DrawerPopup` writes one. The single `touch-action` Base UI emits is on `SwipeArea`:

```js
function resolveTouchAction(direction) {
  return direction === 'left' || direction === 'right' ? 'pan-y' : 'pan-x';
}
```

i.e. it permits panning on the axis it does *not* consume. That is inline and cannot be overridden from a stylesheet.

The maintainers' demos do author `touch-action`, but only in the snap-point and virtual-keyboard demos, where `Viewport`, `Popup` and the drag handle get `touch-action: none` and the inner scroller gets `touch-action: auto`. The hero, position, non-modal, mobile-nav and indent demos give the popup `touch-action: auto` and the viewport nothing. **The source never reads `touch-action` and nothing in it depends on a particular value**, so the demo values are a maintainer pattern rather than a contract. Flagging this as genuinely ambiguous: whether `touch-action: none` on a snap-point viewport is load-bearing on real iOS cannot be established from the source, and the docs do not say.

**The non-passive listener the consumer could break.** `DrawerViewport` registers, on `ownerDocument(viewportElement ?? popupElement)`:

```js
addEventListener(doc, 'touchmove', handleNativeTouchMove, { passive: false, capture: true })
```

It is on `document`, not on any rendered part, so no CSS can remove it and no `render` override can lose it. Inside, it calls `event.preventDefault()` when the move belongs to the drawer and `event.stopPropagation()` to claim it before React's delegated handlers see it — the source explains the `stopPropagation` as avoiding a re-rasterize of the popup every frame, and separately routes `virtualKeyboard?.onTouchMove(event)` *before* the claim so the keyboard provider still observes moves it would otherwise never see. What a consumer can break:

- a capture-phase `touchmove` listener of their own registered on `window`, or on `document` earlier in document order, that calls `stopPropagation()` or `stopImmediatePropagation()`;
- a library that patches `addEventListener` to force `passive: true` (some scroll-performance shims do), which would turn every `preventDefault()` into a console warning and a no-op.

Base UI guards the gesture itself against several false positives, which a consumer does not have to reimplement: two-finger moves are skipped so pinch-zoom survives; an expanded text selection anywhere in the viewport, or a selection inside a focused `<input>`/`<textarea>`, suppresses the swipe; `<input type="range">` is excluded via `composedPath()`; and pen input that already produced a `pointerdown` does not also start a touch swipe.

**`pointer-events`.** Base UI writes it inline in three places: `Viewport` and `Backdrop` get `pointer-events: none` while `!open`, and `SwipeArea` gets it while disabled. The hazard is indirect but real: mouse and pen swipes resolve their start target with `getElementAtPoint(root, x, y)`, a thin wrapper over `elementFromPoint`, and the result is what `closest('[data-base-ui-swipe-ignore]')` and `closest('[data-drawer-content]')` are run against. Any consumer `pointer-events: none` between the cursor and those markers changes which element is hit-tested and therefore whether the swipe is correctly suppressed. Touch takes a different path — `onPointerDown` returns early for `pointerType === 'touch'` and `onTouchStart` hit-tests separately — so the two input types can disagree.

Mouse and pen swipes take pointer capture on the viewport (`safelyChangePointerCapture(element, event.pointerId, 'setPointerCapture')`).

**Three ways to suppress the gesture, none of them a prop.** There is no `disableSwipe`. `data-base-ui-swipe-ignore` on an element suppresses pointer *and* touch; `Drawer.Content` suppresses mouse only (its whole implementation is stamping `data-drawer-content`); and `onOpenChange(open, details)` fires with `details.reason === 'swipe'`, which `details.cancel()` rejects.

**The Android back gesture requires nothing.** In `DrawerProviderReporter`, inside `Drawer.Root`:

```js
// CloseWatcher enables the Android back gesture (Chromium-only).
// Keep this Android-only for now to avoid interfering with Escape/nesting semantics on desktop due to `useDismiss`.
if (!open || !isTopmost || !platform.os.android) return undefined;
const CloseWatcherCtor = win.CloseWatcher;
if (!CloseWatcherCtor) return undefined;
```

No CSS, no markup, no prop, and no `Drawer.Provider` — the reporter is rendered by `Root` unconditionally. It fires `store.setOpen(false, …)` with `reason: 'closeWatcher'`. Dialog has no `CloseWatcher` anywhere in the package, so this is the one behavior Dialog cannot be made to match. The two ways a consumer breaks it are both JavaScript: hold `open` controlled and ignore the change, or call `details.cancel()`.

`overscroll-behavior: contain` appears on the popup in every single demo. The source never reads it. Treat it as a strong maintainer convention with no source backing.

### 5. CSP

**Drawer needs no nonce and `CSPProvider` is not required for it.** Across the whole package only three files reference `nonce` — `scroll-area/root/ScrollAreaRoot.js`, `select/popup/SelectPopup.js`, and `internals/PrehydrationScript.js` (plus `utils/styles.js` and the provider itself). Neither `drawer/` nor `dialog/` mentions one, and neither creates a `<style>` or `<script>` element. `disableStyleElements` has nothing to disable in Drawer. This is the same answer Dialog would give, and it is a different situation from the Scroll Area row already in the spec.

**Drawer's actual CSP surface is inline `style` attributes.** The published CSP page is explicit about the boundary:

> `CSPProvider` covers inline `<style>` and `<script>` tags rendered as elements, but it does not cover inline style attributes (for example, `<div style="...">`). The `style-src-attr` directive in CSP governs inline style attributes encountered when parsing HTML from server pre-rendered components (it does not affect client-side JavaScript that sets styles).

Applied to Drawer: `Popup`, `Backdrop`, `Viewport` and `SwipeArea` all pass a React `style` object, and `Viewport`, `Popup`, `Indent` and the keyboard provider additionally call `element.style.setProperty`. The `setProperty` half is client-side JS and is outside CSP by the sentence above. The React `style` half only becomes an HTML attribute when the part is server-rendered, and most of Drawer is not: `Popup`, `Backdrop` and `Viewport` do not render at all while closed unless `Portal keepMounted` is set. **Two parts always render, and both always carry an inline style attribute:**

- `Drawer.Indent`, which always emits `style="--drawer-swipe-progress:0"`;
- `Drawer.SwipeArea`, which always emits `style="touch-action:pan-y"` (or `pan-x`).

Those are the ones a strict `style-src-attr` would block on a server-rendered page, and blocking the second one would silently change swipe-to-open behavior. A `keepMounted` portal adds `Popup`, `Backdrop` and `Viewport` to that list.

**`CSS.registerProperty` is a separate question the docs do not answer.** `DrawerPopup` calls it once per page for the five variables in §3. It is a CSSOM script API, not a style element and not an attribute, and CSP has no directive naming it. Base UI's sentence about "client-side JavaScript that sets styles" covers it by analogy but does not name it; **that last step is inference, not something the source or the docs establish.** Each call is already wrapped in `try { … } catch { /* ignore already-registered */ }`, so a throw would be swallowed and the only observable effect would be that the five variables inherit normally again.

### 6. Enter and exit, against Dialog

**`--transform-origin` is a non-issue, because Dialog never had it either.** Only Positioner parts seed it: `utils/CommonPositionerCssVars.js` and the eight per-component positioner files (menu, toast, select, popover, tooltip, combobox, preview-card, navigation-menu). Dialog has no `Positioner`, and its published Popup CSS-variable table has exactly one row, `--nested-dialogs`. A `transform-origin: var(--transform-origin)` declaration on a Dialog popup resolves to nothing and always has. Drawer's missing `Positioner` therefore removes nothing that Dialog was using; both components leave placement entirely to the consumer, which the docs state outright: "Positioning is handled by your styles."

The differences that are real:

**Dialog's resting transform is a constant; Drawer's reads a live variable.** Dialog's reference popup sits at `transform: translate(-50%, -50%)` with `[data-starting-style], [data-ending-style] { opacity: 0; transform: translate(-50%, -50%) scale(0.98) }`. Drawer's sits at `transform: translateX(var(--drawer-swipe-movement-x))` with the transition states at a full off-edge translate. That single change — a variable in the resting state rather than a fixed value — is what the gesture layer needs, and it is why the enter/exit rule and the drag are the same rule rather than two.

**Drawer's exit duration is scaled by the release velocity.** Both Popup and Backdrop take `[data-ending-style] { transition-duration: calc(var(--drawer-swipe-strength) * 400ms) }`. `--drawer-swipe-strength` lands in 0.1–1 after a swipe release and is `1` for every other close, so one rule covers a flick dismissal, a slow release, and a click on `Drawer.Close`. Dialog has no analogue; its exit duration is fixed.

**Drawer has a third motion state Dialog does not: mid-gesture.** `[data-swiping] { transition-duration: 0ms }` is required on the Backdrop so the scrim tracks the finger. The Popup gets the same effect for free from the inline `transition: none` written by `getDragStyles()`, but the demos declare it anyway.

**The transition is directional and selectable.** `data-swipe-direction` is always present on `Popup` and `SwipeArea` with the direction as its value, so `[data-ending-style][data-swipe-direction='right'] { transform: translateX(100%) }` is the documented shape. There is no `data-side`.

**Enter and exit are symmetric in every maintainer demo** — one rule covering `[data-starting-style], [data-ending-style]` — which matches how Dialog's demos are written.

**Two Drawer-only escape hatches on the exit.** `preventUnmountOnClose()` exists on `DrawerRootChangeEventDetails` and not on Dialog's, and `details.cancel()` on a `reason: 'swipe'` change restores the pending snap point and resets the swipe rather than closing.

One published-documentation gap to carry forward: the Backdrop's data-attribute table lists only `data-open`, `data-closed`, `data-starting-style` and `data-ending-style`, but `DrawerViewport` applies `data-swiping` to the backdrop imperatively (`backdropElement.toggleAttribute('data-swiping', swiping)`) and the maintainers' own demos style `.Backdrop[data-swiping]`. The attribute is real and undocumented.

### Facts a later contract ticket will need

- `Drawer.Popup` logs a dev-only error without a `Drawer.Viewport`: *"`<Drawer.Popup>` expected to be rendered within `<Drawer.Viewport>`. Omitting the viewport disables drawer swipe handling and touch scroll locking. Wrap `<Drawer.Popup>` in `<Drawer.Viewport>`."* The minimum working spine is `Root > Portal > Viewport > Popup`.
- Snap points are ignored entirely unless `swipeDirection` is `'up'` or `'down'` (`shouldApplySnapPoints` in `DrawerPopup.js`), so a left- or right-anchored drawer cannot use them.
- `swipeDirection` defaults to `'down'`. It is the dismiss direction, not the placement; `SwipeArea` defaults to the opposite of it.
- `Drawer.Backdrop` does not render when the root is nested, unless `forceRender`.
- Five parts are literal Dialog re-exports (`Trigger`, `Portal`, `Title`, `Description`, `Close`), so anything already decided about those Dialog parts transfers unchanged.
- Two providers, opposite nesting: `Provider` above `Root`, `VirtualKeyboardProvider` inside it. Only the second throws.

## Sources

Paths below are relative to `/home/f/orca/workspaces/ultima/dagon/node_modules/.pnpm/@base-ui+react@1.8.0_@types+react@19.2.18_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/@base-ui/react/`.

- `docs/react/components/drawer.md` — the package ships the published Drawer documentation verbatim, 5,874 lines, headed "treat this documentation as authoritative". Source for: the anatomy tree (l. 286–320); "Drawer extends Dialog: It adds gesture support, snap points, and indent effects" (l. 284); "Positioning is handled by your styles" (l. 365); the Indent-effect prose and its "notifies it when it mounts" wording (l. 2330); the Indent CSS Modules demo (l. 2394–2450); the virtual-keyboard guidance including "Always include the `0px` fallback" (l. 1697–1704); the snap-point offset rule (l. 1292–1312); "Stacking and animations" with `--nested-drawers`, `--drawer-height`/`--drawer-frontmost-height`, the directional exit rule and the `--drawer-swipe-strength` release rule (l. 5032–5130); the API reference part descriptions, props, data attributes and CSS-variable tables (l. 5131–5770); the hero, snap-point and swipe-area demo CSS.
- `drawer/index.parts.d.ts` — the fifteen part exports plus `createHandle`/`Handle`; no `Positioner`.
- `drawer/indent/DrawerIndent.js` — `useDrawerProviderContext()` read optionally; the inline `{'--drawer-swipe-progress': '0'}`; the `visualStateStore` subscription writing `--drawer-swipe-progress` and `--drawer-height` via `setProperty` and removing the height when it is 0; the `data-active`/`data-inactive` mapping.
- `drawer/indent-background/DrawerIndentBackground.js` — `data-active`/`data-inactive` and nothing else; no variables.
- `drawer/provider/DrawerProvider.js`, `drawer/provider/DrawerProviderContext.js` — the open-drawer `Set`, `active = openDrawers.size > 0`, the `{ swipeProgress, frontmostHeight }` store, and the non-throwing `useDrawerProviderContext`.
- `drawer/root/DrawerRoot.js` — `DrawerProviderReporter` rendered unconditionally as `Root`'s first child; `setDrawerOpen(store, open)` (open, not mounted); the `CloseWatcher` block with its Android-only comment; `useRenderDialogRoot('drawer', …)`.
- `drawer/popup/DrawerPopup.js` — the missing-viewport error string (l. 178); `removeCSSVariableInheritance()` and the five `CSS.registerProperty` calls with syntaxes, initial values and `inherits: false` (l. 30–85), including the performance rationale and the WebKit note; the inline style block seeding `--drawer-swipe-progress`, `--nested-drawers`, `--drawer-height`, `--drawer-snap-point-offset`, `--drawer-frontmost-height`, `--drawer-swipe-strength` (l. 334–342); `popupHeightCssVarValue` left undefined unless `hasNestedDrawer || transitionStatus === 'ending'` (l. 293–297); `shouldApplySnapPoints` requiring `'down'`/`'up'` (l. 298); the `FloatingFocusManager` props.
- `drawer/popup/DrawerPopupCssVars.js`, `drawer/backdrop/DrawerBackdropCssVars.js`, `drawer/viewport/DrawerViewportCssVars.js` — the variable names and their documented types; `--drawer-keyboard-inset` "Present only when the drawer is wrapped in `Drawer.VirtualKeyboardProvider`".
- `drawer/popup/DrawerPopupDataAttributes.js` — `data-swiping` defined here and applied to the backdrop by the viewport.
- `drawer/viewport/DrawerViewport.js` — the document-level `addEventListener(doc, 'touchmove', handleNativeTouchMove, { passive: false, capture: true })` (l. 587–589) and the `preventDefault`/`stopPropagation` logic around it (l. 518–570); `virtualKeyboard?.onTouchMove(event)` ordered before the claim; the two-finger, text-selection, range-input and pen guards; `getElementAtPoint` in `onPointerDown` and `onTouchStart`; the touch/pointer split (`pointerType === 'touch'` early returns); `findScrollableTouchTarget` walking up to the viewport; `visualStateStore?.set({ swipeProgress, frontmostHeight })`; `setBackdropSwipingAttribute`; `getBaseSwipeThreshold`; suppression of `DialogViewportDataAttributes.nestedDialogOpen`.
- `drawer/backdrop/DrawerBackdrop.js` — inline `pointer-events: none` while closed, `user-select: none`, the seeded `--drawer-swipe-progress: 0` and `--drawer-swipe-strength: 1`, and `enabled: forceRender || !nested`.
- `drawer/swipe-area/DrawerSwipeArea.js` — `resolveTouchAction` returning `pan-y` for left/right and `pan-x` otherwise; the inline `style` with `touchAction` and `pointerEvents: !enabled ? 'none' : undefined`; `role="presentation"`, `aria-hidden`; no dimensions.
- `drawer/content/DrawerContent.js` — the whole component is the `data-drawer-content` marker.
- `drawer/virtual-keyboard-provider/DrawerVirtualKeyboardProvider.js` — `useDialogRootContext()` called without `optional`, so it throws outside `Drawer.Root` (l. 62); `rootElement = viewportElement` with the comment explaining the viewport requirement (l. 67–72); `setDrawerKeyboardInset` writing `--drawer-keyboard-inset` on the viewport (l. 156); `setKeyboardScrollSlack` writing `overflow-anchor: none`, `padding-bottom` and `scroll-padding-bottom` inline from computed values (l. 90–122); `KEYBOARD_SCROLL_SLACK = 48`, `KEYBOARD_VISIBILITY_MARGIN = 16`; `animateKeyboardScroll` branching on `(prefers-reduced-motion: reduce)`; the `visualViewport`, `focusin`/`focusout`/`pointerdown` and `window scroll` listeners (l. 393–413); the window-scroll pinning while `modal === true`.
- `drawer/{title,description,close,portal,trigger}/Drawer*.js` — each is a one-line re-export of the corresponding Dialog component.
- `utils/useSwipeDismiss.js` — `getDragStyles()` returning inline `transition: 'none'` and `transform: getDragTransform(...)` while swiping and dropping both on release (l. 863–886); `safelyChangePointerCapture` for pointer swipes; **no `touch-action` and no event listeners of its own** (grep for `touchAction|passive|touch-action` returns nothing).
- `utils/getElementAtPoint.js` — the `elementFromPoint` wrapper used for swipe-ignore hit-testing, with its shadow-root comment.
- `dialog/viewport/DialogViewport.js` — what `Drawer.Viewport` delegates to: `role="presentation"`, `hidden: !mounted`, inline `pointerEvents: !open ? 'none' : undefined`.
- `dialog/root/DialogRootContext.js` — `useDialogRootContext(optional)` and the throw text "Base UI: DialogRootContext is missing. Dialog parts must be placed within `<Dialog.Root>`."
- `dialog/root/useDialogRoot.js` — `useScrollLock(open && modal === true, popupElement)`, shared by both components.
- `docs/react/components/dialog.md` — the Dialog Popup CSS-variable table with `--nested-dialogs` as its only row (l. 4316–4321), and the Dialog popup demo CSS resting at a constant `translate(-50%, -50%)` with `scale(0.98)` transition states. The `transform-origin: var(--transform-origin)` at l. 490 belongs to a nested `Menu.Popup` demo, not to Dialog.
- Grep across the package: `'--transform-origin'` is seeded only by `utils/CommonPositionerCssVars.js` and the eight `*/positioner/*PositionerCssVars.js` files; `nonce` appears only in `utils/styles.js`, `select/popup/SelectPopup.js`, `internals/PrehydrationScript.js`, `scroll-area/root/ScrollAreaRoot.js` and `csp-provider/CSPProvider.js`; `registerProperty` in `drawer`/`dialog` appears only in `DrawerPopup.js`.
- `docs/react/utils/csp-provider.md` — "Some Base UI components render inline `<style>` or `<script>` tags…"; the named components are `<ScrollArea.Viewport>` and `<Select.Popup>`/`<Select.List>`; and the "Inline style attributes" section quoted in §5, including "`style-src-attr` … does not affect client-side JavaScript that sets styles".
- `csp-provider/CSPProvider.js` — the `nonce` / `disableStyleElements` context, consumed by nothing under `drawer/`.
- `@base-ui/utils@0.4.0/useScrollLock.js` — the `html` mutations (`scrollbar-gutter`, `overflow`, `data-base-ui-scroll-locked`) and the `body` mutations (`position: relative`, `height: 100dvh`, `width: 100vw`, `box-sizing: border-box`, `overflow: hidden`, `scroll-behavior: unset`), all inline and all restored on cleanup (l. 116–175).
- `CHANGELOG.md`, v1.8.0 — the only Drawer entry is "Ignore swipes without an attributed direction when using snap points (#5477)".
- `docs/spec/ultima.md` l. 1059 (Navigation Menu) — "It portals, so it inherits the two global rules already documented for portalling components, `isolation: isolate` on the app root and `body { position: relative }` for iOS 26 Safari", which is the rule Drawer inherits unchanged.
- `docs/research/2026-09-09-base-ui-drawer.md` — the prior note pricing Drawer against Dialog for ULT-48; this note does not restate its part-cost table, its snap-point constants or its nesting analysis.
