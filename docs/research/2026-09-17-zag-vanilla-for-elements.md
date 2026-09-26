# Whether Zag.js's vanilla adapter passes the ADR 0002 test for Tabs and Tooltip in a light-DOM custom element

Ticket #163. Follows up section 1 and section 5 of `2026-09-17-element-primitive-layers.md`, which named `@zag-js/vanilla` as the one lead worth grading.

## Findings

**Verdict: Zag is a primitive layer, and ADR 0002 governs it. It passes the four-things test for Tabs outright and for Tooltip with one bug and one deviation. It is not an engine under ADR 0007.** Built into a bare `HTMLElement` rendering into light DOM and run in Chromium, the tabs machine emitted `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`, `aria-orientation`, roving `tabindex`, and handled Left, Right, Up, Down, Home and End with wrap, disabled-skip and an activation mode. The tooltip machine emitted `role="tooltip"`, `aria-describedby`, opened on hover with delay and on keyboard focus, refused touch, closed on Escape, blur and scroll, and positioned itself with Floating UI. Neither injected a stylesheet or a `<style>` element: `document.styleSheets.length` stayed 0 before and after opening. That is roles, ARIA state, keyboard handling and focus management with no styles rendered, which is ADR 0002's test met and ADR 0007's definition of an engine ("supplies none of the four things that ADR names") failed. So the question a later ticket has to answer is ADR 0002's, not ADR 0007's: whether a second primitive vocabulary next to Base UI is acceptable for custom elements, since ADR 0002 says "One primitive vocabulary" and "Every interactive Ultima component is built on Base UI."

Two things stop "passes" from being unqualified. First, the tooltip content and positioner carry inline layout styles beyond position (`isolation: isolate`, `min-width: max-content`, `pointer-events`, `z-index: var(--z-index)`, and the arrow's `background`, `width`, `height` and `transform: rotate()`), so "renders no styles" holds for stylesheets but not for the `style` attribute. Second, Zag's tooltip `aria-label` prop produces a dangling `aria-describedby` (verified below), and its tabs omit `aria-controls` from unselected tabs where APG says every tab carries it. Both are workable at the element layer, but they are Zag's decisions and Ultima would be overriding them.

The rest of this note is the evidence, in the order the ticket asked for it.

### 1. What the experiment was

Scratch dir with `npm install @zag-js/vanilla @zag-js/tabs @zag-js/tooltip esbuild jsdom`, which resolved to Zag 1.44.0 and `@floating-ui/dom` 1.8.0. Two classes, `UltTabs` and `UltTooltip`, each `extends HTMLElement`, no shadow root, children authored in the page as plain light DOM (`<button data-tab="a">`, `<div data-panel="a">`, `<button data-trigger>`, `<div data-positioner><div data-content>`). Each element does the same four things:

- `connectedCallback`: `new VanillaMachine(machine, () => props)` reading props from attributes, `machine.subscribe(() => this.render())`, `machine.start()`, then `render()`.
- `render()`: `connect(machine.service, normalizeProps)`, then `spreadProps(node, api.getXProps())` per part, querying parts by `data-*` markers in `this`.
- `attributeChangedCallback`: `machine.updateProps({ ... })` with the changed prop.
- `disconnectedCallback`: call the `spreadProps` cleanups, then `machine.stop()`.

Served over a local HTTP server and driven by Playwright's Chromium from `node_modules/.pnpm/playwright@1.63.0` in this repo. The run scripts and full dumps are under the session scratchpad (`zag/tabs-element.js`, `zag/tooltip-element.js`, `zag/run.cjs`, `zag/run2.cjs`). jsdom could not be used for the tooltip because `@floating-ui/dom`'s `autoUpdate` references the global `Element` and `autoUpdate` runs unconditionally when the tooltip opens; the tabs machine would have run there, but Chromium was needed anyway for the layout measurements.

### 2. Tabs: emitted attributes against APG and against Ultima's `tabs.tsx`

Initial render in Chromium (attributes as spread; `data-tab`, `data-list`, `data-panel` are the experiment's own markers):

```
ult-tabs id="tabs:t1" data-scope="tabs" data-part="root" data-orientation="horizontal" dir="ltr"
div  data-part="list" id="tabs:t1:list" role="tablist" dir="ltr" aria-orientation="horizontal" data-orientation="horizontal"
button data-part="trigger" role="tab" type="button" dir="ltr" aria-disabled="false" data-value="a" aria-selected="true" data-selected="" data-focus="" aria-controls="tabs:t1:content-a" data-ownedby="tabs:t1:list" id="tabs:t1:trigger-a" tabindex="0"
button data-part="trigger" role="tab" ... aria-disabled="false" data-value="b" aria-selected="false" ... id="tabs:t1:trigger-b" tabindex="-1"
button data-part="trigger" role="tab" ... disabled="" aria-disabled="true" data-value="c" aria-selected="false" ... tabindex="-1"
div  data-part="content" id="tabs:t1:content-a" aria-labelledby="tabs:t1:trigger-a" role="tabpanel" data-selected="" data-orientation="horizontal"
div  data-part="content" id="tabs:t1:content-b" tabindex="0" aria-labelledby="tabs:t1:trigger-b" role="tabpanel" hidden=""
```

Against the APG Tabs pattern:

| APG requirement | Zag | Note |
| --- | --- | --- |
| Container has `role="tablist"` | Yes | `getListProps` in `tabs.connect.mjs` |
| Each tab `role="tab"` inside the tablist | Yes | Rendered on the light-DOM `<button>` |
| Each panel `role="tabpanel"` | Yes | |
| Active tab `aria-selected="true"`, others `"false"` | Yes | |
| Each tab has `aria-controls` to its panel | Partial | Only the selected tab: `"aria-controls": triggerState.selected ? dom.getContentId(scope, value) : void 0`. Base UI puts `'aria-controls': tabPanelId` on every tab (`TabsTab.js` line 179) |
| Each panel `aria-labelledby` its tab | Yes | |
| `aria-orientation="vertical"` when vertical | Yes | Zag also emits `aria-orientation="horizontal"` explicitly |
| Tab key into tablist lands on the active tab | Yes | Roving `tabindex` 0 / -1 |
| Left/Right (Up/Down vertical) move focus | Yes | Measured: a, Right → b, Right → d (skipped disabled c), Right → a (wrapped, `loopFocus` default true), End → d, Home → a, Left → d. In vertical, Down → next and Right ignored |
| Home / End | Yes | |
| Space or Enter activate in manual mode | Yes, via the button | The keymap in `getListProps` has no Enter or Space case; the trigger is `normalize.button` with `type="button"`, so the browser's native click on Enter/Space fires `onClick`, which sends `TAB_CLICK`. Measured in manual mode: Right moved focus to b without selecting, Enter selected b, Right then Space selected d. So Enter and Space depend on the trigger being a real `<button>` or another element with native activation |
| Automatic activation recommended | Default | `activationMode: "automatic"` in `tabs.machine.mjs` props; Base UI defaults to manual (`activateOnFocus` false), which the inventory note records |
| Panel is a tab stop when it holds no focusable content | Yes | `syncTabIndex` action: panel with focusables gets `tabindex` removed, otherwise `tabindex="0"`. Measured: panel a (has a link) no tabindex, panel b `tabindex="0"`, and pressing Tab from tab d landed on panel d |

Deviations and quirks worth recording:

- `aria-disabled="false"` is written on every enabled tab. `spreadProps` special-cases booleans on `aria-*` keys to `setAttribute`, so `false` becomes the string `"false"` rather than being dropped.
- `data-focus=""` appears on the selected tab before anything has focus, because `focusedValue` defaults to `value` in the machine context. Cosmetic, but a StyleX selector on `data-focus` would light up at load.
- The arrow-key handler and `Escape` in the tooltip both use `event.key` through `getEventKey` with `dir` and `orientation`, so RTL mirrors Left and Right.

Against Ultima's `packages/ui/src/tabs.tsx`: the React component styles on `[data-orientation="vertical"]`, `[data-active]`, `[data-disabled]`, and reads `--active-tab-bottom`, `--active-tab-left`, `--active-tab-width`, `--active-tab-height`, `--active-tab-top` on the Indicator. Zag emits `data-selected` (not `data-active`), `data-orientation` (same), `data-disabled` (same), and its Indicator writes `--left`, `--top`, `--width`, `--height` plus `position: absolute`, `will-change`, `transition-property`, `transition-duration: var(--transition-duration, 150ms)` and `transition-timing-function` as inline style, and `hidden` until it has a rect (measured after `value="d"`: `--left: 177px; --top: 8px; --width: 47px; --height: 21px; top: var(--top)`). So a Zag-backed element would need either its own attribute names in the StyleX selectors or a rename pass in `render()`. Zag's indicator also owns the transition on the inline style, where Ultima's `styles.indicator` sets `transitionDuration` and `transitionTimingFunction` from tokens; inline wins, so Ultima's tokens would have to be passed through `--transition-duration` and `--transition-timing-function` instead.

### 3. Tooltip: emitted attributes against APG and against Ultima's `tooltip.tsx`

Closed, then after hover (`openDelay` 0 in the experiment; Zag's default is 400 ms, `closeDelay` 150 ms):

```
closed:
button data-part="trigger" id="tooltip:tt1:trigger" data-ownedby="tt1" data-state="closed"
div  data-part="positioner" id="tooltip:tt1:popper" style="position: absolute; isolation: isolate; min-width: max-content; pointer-events: none; top: 0px; left: 0px; transform: translate3d(0px, -100vh, 0px); z-index: var(--z-index);"
div  data-part="content" hidden="" data-state="closed" role="tooltip" id="tooltip:tt1:content" style="pointer-events: none;"

open:
button ... data-state="open" data-expanded="" aria-describedby="tooltip:tt1:content"
div  data-part="positioner" ... style="position: absolute; isolation: isolate; min-width: max-content; top: 0px; left: 0px; transform: translate3d(var(--x), var(--y), 0); z-index: var(--z-index); --transform-origin: 25px calc(100% + 8px); --reference-width: 74px; --reference-height: 21px; --available-width: 1264px; --available-height: 231px; --x: 20px; --y: 221px; --z-index: auto;"
div  data-part="content" data-state="open" role="tooltip" id="tooltip:tt1:content" style="pointer-events: none;" data-placement="top" data-side="top"
```

Against the APG Tooltip pattern (marked "work in progress; it does not yet have task force consensus"):

| APG requirement | Zag | Note |
| --- | --- | --- |
| Container has `role="tooltip"` | Yes | On the content part, whenever the `aria-label` prop is unset |
| Trigger references it with `aria-describedby` | Yes, while open | `"aria-describedby": open ? contentId : void 0`. Closed, the attribute is absent |
| Escape dismisses | Yes | `trackEscapeKey` effect adds a capture `keydown` listener on the global `document` (not `scope.getDoc()`) and calls `stopPropagation` |
| Focus stays on the trigger | Yes | Nothing moves focus; content is `hidden` when closed and has no `tabindex` |
| Closes on blur when opened by focus | Yes | `onBlur` sends `close` unless focus moved to another trigger of the same tooltip |
| Stays open while pointer is over the tooltip | Only if `interactive: true` | Default `interactive: false`, and content gets `pointer-events: none` |

Behaviour measured in Chromium: Tab onto the trigger opened it (`onFocus` gates on `isFocusVisible()` from `@zag-js/focus-visible`, so mouse focus does not open it), Tab onward closed the first and opened the second, `tap` in a `hasTouch` context left it `closed` (`onPointerMove` and `onPointerOver` return on `pointerType === "touch"`), and hovering a second tooltip closed the first: a module-level `store` in `tooltip.store.mjs` holds the single open `id`, and every machine's `trackStore` effect closes itself when that id changes. That matches Base UI's "one at a time" Provider behaviour, but here it is global to the page and not scoped to a provider.

The `aria-label` bug. `tooltip.types.d.ts` documents the prop as "Custom label for the tooltip." With it set, `getContentProps` drops both `role` and `id` (`role: hasAriaLabel ? void 0 : "tooltip"`, `id: hasAriaLabel ? void 0 : contentId`) but `getTriggerProps` still emits `aria-describedby=contentId`, and the trigger never receives the label. Verified with `updateProps({ 'aria-label': 'Save' })` then `setOpen(true)`: trigger `aria-describedby="tooltip:tt1:content"`, content has no `id`, `document.getElementById(...)` returns null. Ultima's contract is `aria-label` on the trigger (`tooltip.tsx` line 64 requires it by type), which is the consumer's attribute and not this prop, so the bug is avoidable by never passing the prop, but the API invites it.

Against Ultima's `tooltip.tsx`: the React component styles `[data-starting-style]` and `[data-ending-style]` for the enter and exit transition and reads `--transform-origin` on the popup. Zag emits `data-state="open|closed"`, `data-placement`, `data-side` and `data-instant`, no starting or ending style attributes, and writes `--transform-origin` on the positioner, not the content. Ultima also sets `role="tooltip"` itself over Base UI; with Zag that line goes away and the `aria-describedby` wiring, which Base UI never emits (inventory note section 1), arrives for free.

### 4. Bundle cost

`esbuild --bundle --minify --format=esm` then `gzip -9`, Zag 1.44.0, one element per bundle:

| Bundle | Minified | Gzipped |
| --- | --- | --- |
| Tabs element (`@zag-js/tabs` + `@zag-js/vanilla`) | 35,227 B | 12,945 B |
| Tooltip element (`@zag-js/tooltip` + `@zag-js/vanilla`) | 63,841 B | 22,755 B |
| Both in one bundle | 78,358 B | 27,783 B |
| `@zag-js/vanilla` alone (with core, store, utils, types) | 17,643 B | 6,693 B |
| `@zag-js/popper` alone (with `@floating-ui/dom`) | 27,717 B | 10,682 B |
| `@floating-ui/dom` alone | 21,741 B | 8,501 B |
| `@zag-js/focus-visible` alone | 4,612 B | 1,851 B |

Per-package input bytes from esbuild's metafile for the combined bundle, largest first: `@zag-js/dom-query` 65,753, `@floating-ui/core` 36,290, `@floating-ui/dom` 27,950, `@zag-js/tooltip` 21,702, `@zag-js/utils` 19,375, `@zag-js/tabs` 18,987, `@zag-js/vanilla` 18,609, `@zag-js/popper` 16,765, `proxy-compare` 13,990, `@zag-js/store` 11,581, `@zag-js/core` 11,245. `dom-query` is Zag's DOM utility grab bag and is the biggest single input even for Tabs; `proxy-compare` comes in through `@zag-js/store`. The 12.9 KB tabs figure matches the inventory note's 12 KB estimate; the tooltip's 22.8 KB is Floating UI plus the shared runtime, which is what the inventory's 22 KB estimate said. For scale, the inventory measured `generic-tabs` at 1.7 KB and `@floating-ui/dom` alone at 8.5 KB.

### 5. How `@zag-js/popper` positions, and what it writes

`@zag-js/popper` wraps `@floating-ui/dom` (`computePosition`, `autoUpdate`, `offset`, `flip`, `shift` with `limitShift`, `size`, `arrow`, `hide`). Defaults from `get-placement.mjs`: `strategy: "absolute"`, `placement: "bottom"`, `gutter: 8`, `flip: true`, `slide: true`, `overlap: false`, `overflowPadding: 8`, `arrowPadding: 4`, `listeners: true` (which enables `autoUpdate` with ancestor scroll, ancestor resize, element resize and layout shift). The tooltip's `trackPositioning` effect runs it while open and in `closing`, with `defer: true` (one `raf`).

It injects no stylesheet and no element. What it writes is the `style` attribute, in two layers:

1. `getPlacementStyles()` in `get-styles.mjs` is returned by `connect` and lands through `spreadProps`. Positioner: `position`, `isolation: isolate`, `min-width: max-content` (or `width: var(--reference-width)` with `sameWidth`), optional `max-width`/`max-height` with `fitViewport`, `pointer-events: none` until placed, `top: 0px; left: 0px`, `transform: translate3d(var(--x), var(--y), 0)` (or `translate3d(0, -100vh, 0)` before placement), `z-index: var(--z-index)`. Arrow: `position: absolute`, `width`/`height: var(--arrow-size)`, `--arrow-size-half`, `--arrow-offset`. Arrow tip: `transform: rotate(45|135|225|315deg)`, `background: var(--arrow-background)`, `top`, `left`, `width: 100%`, `height: 100%`, `position: absolute`, `z-index: inherit`.
2. `getPlacementImpl` writes directly with `style.setProperty` after each compute: `--x`, `--y` (rounded by DPR), `--transform-origin` (from its own middleware), `--reference-width`, `--reference-height`, `--available-width`, `--available-height` (from the `size` middleware, always registered unless `sizeMiddleware: false` with neither `sameWidth` nor `fitViewport`), `--z-index` copied once from `getComputedStyle(floating.firstElementChild).zIndex`, and with `hideWhenDetached`, `visibility` and `pointer-events`. `shiftArrowMiddleware` assigns `left`, `top` and the side offset onto the arrow element.

So the answer to "any inline style beyond position" is yes: `isolation`, `min-width`, `pointer-events`, `z-index`, and for the arrow, `background` and `transform`. They are layout and stacking, not colour or typography, and every one is a CSS variable hook or a value Ultima's StyleX rules could override only by `!important` since inline wins. Notably the `z-index` comes from the content's computed `z-index`, so `styles.popup`'s `zIndex: z.popup` in `tooltip.tsx` would flow through to the positioner. `restoreStyles: false` by default means the vars stay on the element after close; `applyStyles: false` turns off layer 2 entirely and hands the numbers to `onComplete`, which is the escape hatch if Ultima wanted to own the `style` attribute.

### 6. Fit with the custom element lifecycle

The adapter is `VanillaMachine` (a class with `start()`, `stop()`, `subscribe(fn)`, `updateProps(props)`, `send(event)`, `service`), `normalizeProps` (maps React-style keys to DOM: `onFocus` → `onFocusin`, `onBlur` → `onFocusout`, `className` → `class`, lowercases the rest), `spreadProps(node, attrs, machineId?)` (diffs against a `WeakMap` of last-applied attrs per node per machine, adds and removes listeners, sets and removes attributes, assigns `value`/`checked`/`selected` as properties, sets `style` per property since 1.44.0, and returns a cleanup that removes the listeners) and `mergeProps`. The package's own example, `examples/vanilla-ts/src/component.ts`, is a `Component` base class with `init()` (render, subscribe, start) and `destroy()` (stop), which maps one to one onto `connectedCallback` and `disconnectedCallback`.

What worked in the experiment:

- `connectedCallback` → `new VanillaMachine`, `subscribe`, `start`, `render`. Subscribing before `start()` matters because `start()` invokes the initial state and the entry actions, which for tabs already run `syncIndicatorRect`, `syncTabIndex` and `syncSsr` and write into context; each context write calls `notify()`, which runs the subscribers.
- `subscribe` fires on every context or state change and hands over `service`; the subscriber calls `connect` again and re-spreads. `spreadProps` diffs, so re-spreading every part on every notification is cheap and idempotent.
- `attributeChangedCallback` → `updateProps({ key })`. `updateProps` merges onto the previous props (`mergeMachineProps`) and calls `notify()`, and the machine's `watch` trackers run on the next publish, so setting `orientation="vertical"` flipped `aria-orientation`, `activation="manual"` flipped the guard, and `value="d"` (Zag's controlled prop) moved selection and re-rendered the panels and indicator. The guard against calling before the machine exists is the element's job, since `attributeChangedCallback` fires for initial attributes before `connectedCallback`.
- `disconnectedCallback` → the `spreadProps` cleanups, then `stop()`. `stop()` runs the effect cleanups (which is how the tooltip's document `keydown`, scroll and `pointerlockchange` listeners and its `autoUpdate` go away), the machine's `exit` actions, unsubscribes the store, and clears subscriptions. It does not touch the DOM: after `stop()` the tab buttons still carried `role`, `aria-selected`, `tabindex` and all the rest, and the listeners `spreadProps` added stay attached unless the element keeps and calls the cleanups. Verified with `tt2`: after `stop()` a synthetic `pointermove` on the trigger produced no state change because `send` returns early when status is not `Started`, so leftover listeners are inert rather than harmful, but they are leaks. Reconnecting the same node created a fresh machine that spread the same attributes onto the same nodes without complaint.

Constraints to carry forward:

- Ids. `scope.getById` resolves parts by id in `getRootNode`, and Zag derives ids as `tabs:${id}:trigger-${value}` unless `ids` overrides them. The element must give the machine a stable `id`, and the parts must live in the same tree, which light DOM satisfies. The `getRootNode` option exists for shadow roots (`guides/composition`), which Ultima does not use.
- Class attribute. `spreadProps` handles a `class` key by assigning `node.className` wholesale, which would wipe StyleX classes. Neither tabs nor tooltip `connect` returns `class`, so this is a footgun only if `mergeProps` is used to add one.
- One `spreadProps` scope per machine per node. The third argument namespaces the diff map, and the example base class passes `this.machine.scope.id`. Two machines spreading onto the same node (say a tooltip trigger that is also a tab) work if both pass their id.
- Events are `addEventListener` with the lowercased name from the `on` prefix, so `onKeyDown` becomes `keydown` and `onPointerMove` becomes `pointermove`; there is no delegation, and every trigger gets its own listeners.
- The tooltip's Escape listener is on the global `document`, not `scope.getDoc()`, and the single-open `store` is module global, so two copies of `@zag-js/tooltip` in one page would not coordinate.

### 7. Maintenance signal

- Repository `chakra-ui/zag`, MIT, description "Build your design system in React, Solid, Vue, Svelte or Vanilla. Powered by finite state machines", 5,209 stars, 23 open issues, last push 2026-09-17, 22 issues closed and 23 PRs merged in the 30 days to 2026-09-17. Top contributor is `segunadebayo` at 3,680 commits, then `renovate[bot]` 712, `anubra266` 414, `github-actions[bot]` 322, `cschroeter` 206; it is one maintainer's project with Chakra and Ark UI as its downstream.
- Release cadence from npm: `@zag-js/vanilla` has 30 published versions between 2026-01-02 and 2026-09-14, roughly every two to four weeks on the 1.x line, with a `2.0.0-next` line running alongside since 2026-06-04 (`next.3` on 2026-09-14). The vanilla adapter ships in both lines.
- Age. The vanilla package is new: first commit "refactor: introduce vanilla package" on 2026-01-02 and first publish 1.32.0 the same day. Before that, the vanilla story was an example dir that discussion #2309 (March 2025) reported as broken after the 1.0 machine rewrite, with the maintainer saying "I have this in mind but didn't get to implement it" and then posting a proof of concept for the community to finish. 47 commits have touched `packages/frameworks/vanilla`: 26 by the release bot, 12 by segunadebayo, 3 renovate, 2 Copilot, 4 from three outside contributors. The package has its own vitest suite (`bindable`, `machine`, `nested-states`, `normalize-props`, `spread-props` tests, jsdom).
- Is vanilla first-class? Half. The README tagline names it and the repo ships it under `packages/frameworks/` next to react, preact, solid, svelte and vue, with an `examples/vanilla-ts` app covering every component. The documentation site does not: `overview/installation` lists React, Vue, Svelte and Solid, `overview/introduction` says "Works for React, Solid and Vue", the component pages' framework switcher offers React, Solid, Vue and Svelte, and the only mention on the site is one row in "Building a Framework Adapter" that points at the vanilla package as the starting point for "Subscriptions without a component runtime". There is no vanilla page for tabs or tooltip, so the API surface Ultima would use is documented by the package's tests, the example app and the source. Bugs filed against vanilla get fixed (#3327 on `spreadProps` wiping outside inline styles was reported and fixed in 1.44.0; #3018 controlled checkbox; #1511 example not updating props), which is a working channel but also a sign the adapter is still finding its edges.
- Web components specifically. Discussion #1210 (Feb 2024) asked for a Lit or WebC integration; the maintainer answered "We're open to seeing a Lit implementation similar to Shoelace or Stencil. Feel free to open a draft PoC." A community Lit PR (#2608, July 2025) exists, and a Sept 2025 comment records `getRootNode: () => this.renderRoot` as the fix for shadow-DOM positioning. No official web-component adapter has shipped; light-DOM custom elements need nothing beyond `@zag-js/vanilla`, as the experiment shows.

### 8. Which ADR governs it, and what that means

ADR 0007 defines an engine by what it lacks: TanStack Table "renders no DOM and no styles" and "supplies no accessibility at all", and the consequences say "An engine supplies none of the four things that ADR names." Zag's `connect` supplies all four (section 2 and 3 above), so it is not an engine, cannot ship as a recipe under ADR 0007, and ADR 0007's headless gate is not the gate to apply. ADR 0002 is: it names focus management, keyboard behavior and ARIA wiring as what a primitive layer is for, decides "One primitive vocabulary", and scopes Radix out for that reason. Zag would be a second vocabulary next to Base UI, with different attribute names (`data-selected` against `data-active`, `data-state` against `data-open`, `--left` against `--active-tab-left`), a different activation default, and different ARIA choices (`aria-controls` only on the selected tab; `aria-describedby` only while open). If Ultima's custom elements adopt it, that is an ADR 0002 amendment or companion, not a recipe. If they do not, the hand-rolled list in the inventory note's section 5 is the alternative, and this note's measurements say what Zag would save: roughly the keyboard, focus and ARIA logic of section 5 for 12.9 KB (tabs) and 22.8 KB (tooltip, of which about 10.7 KB is Floating UI and popper), plus positioning that Ultima would otherwise take from Floating UI or CSS anchor positioning.

## Sources

- `~/Projects/private/ultima/docs/adr/0002-base-ui-primitives.md`: the four-things test, "One primitive vocabulary", "Every interactive Ultima component is built on Base UI".
- `~/Projects/private/ultima/docs/adr/0007-engines-ship-as-recipes.md`: engine definition, "An engine supplies none of the four things that ADR names", "must still be headless, rendering no DOM and no styles".
- `~/Projects/private/ultima/docs/research/2026-09-17-element-primitive-layers.md`: section 1 (Base UI's Tabs emits `aria-controls` on every tab and defaults `activateOnFocus` false; Base UI's Tooltip emits no `role` or `aria-describedby`), section 5 (hand-rolled list), the 12 KB / 22 KB estimates this note confirms.
- `~/Projects/private/ultima/packages/ui/src/tabs.tsx`: StyleX selectors `[data-orientation="vertical"]`, `[data-active]`, `[data-disabled]`, indicator variables `--active-tab-*`.
- `~/Projects/private/ultima/packages/ui/src/tooltip.tsx`: `role="tooltip"` set by Ultima (line 78), `aria-label` required on Trigger (line 64), `[data-starting-style]`/`[data-ending-style]`, `--transform-origin`, `zIndex: z.popup`.
- `~/Projects/private/ultima/node_modules/.pnpm/@base-ui+react@1.8.0_.../node_modules/@base-ui/react/tabs/tab/TabsTab.js` line 178 to 179: `role: 'tab', 'aria-controls': tabPanelId` unconditionally.
- `@zag-js/vanilla@1.44.0` `dist/machine.mjs`, `dist/spread-props.mjs`, `dist/normalize-props.mjs`, `dist/machine.d.ts` (scratch `node_modules`): `VanillaMachine` API, `start`/`stop`/`subscribe`/`updateProps` behaviour, `spreadProps` diffing, `class` assignment, boolean `aria-*` handling, style per-property application, cleanup returning listener removal only.
- `@zag-js/tabs@1.44.0` `dist/tabs.connect.mjs`, `dist/tabs.machine.mjs`, `dist/tabs.dom.mjs`, `dist/tabs.types.d.ts`: emitted attributes, keymap (no Enter/Space), defaults `activationMode: "automatic"`, `loopFocus: true`, `composite: true`, `syncTabIndex`, id scheme, `aria-controls` only when selected.
- `@zag-js/tooltip@1.44.0` `dist/tooltip.connect.mjs`, `dist/tooltip.machine.mjs`, `dist/tooltip.store.mjs`, `dist/tooltip.types.d.ts`: `role`/`id` dropped with `aria-label`, `aria-describedby` only while open, defaults `openDelay: 400`, `closeDelay: 150`, `closeOnEscape`, `interactive: false`, `closeOnScroll`, Escape listener on global `document`, module-level single-open store, touch ignored, focus-visible gate.
- `@zag-js/popper@1.44.0` `dist/get-placement.mjs`, `dist/get-styles.mjs`, `dist/middleware.mjs`; `@floating-ui/dom@1.8.0`: defaults, middleware set, every inline style and CSS variable written, `applyStyles`/`restoreStyles` escape hatches.
- Experiment scripts and output in the session scratchpad `zag/` (`tabs-element.js`, `tooltip-element.js`, `page.html`, `run.cjs`, `run2.cjs`, `meta.json`): attribute dumps, keyboard runs, `styleSheets.length` 0, touch tap closed, single-open behaviour, dangling `aria-describedby` with `aria-label`, post-`stop()` inertness, bundle sizes.
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/: roles, "Each element with role tab has the property aria-controls referring to its associated tabpanel element", keyboard interaction, automatic activation recommended.
- https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/: "work in progress", `role="tooltip"`, `aria-describedby`, Escape.
- https://zagjs.com/overview/installation and https://zagjs.com/overview/introduction: frameworks named (React, Vue, Svelte, Solid; "Works for React, Solid and Vue"), no vanilla mention; "The machine APIs are completely unstyled".
- https://zagjs.com/components/react/tabs and https://zagjs.com/components/react/tooltip: framework switcher (React, Solid, Vue, Svelte), documented keyboard table, "Only one tooltip shows at a time", `aria-label` listed as a context prop.
- https://zagjs.com/guides/composition: `getRootNode` for shadow DOM, `ids` option.
- https://github.com/chakra-ui/zag/blob/main/website/data/guides/framework-adapters.mdx: the one docs-site mention of vanilla, "Subscriptions without a component runtime".
- https://github.com/chakra-ui/zag (via `gh api`): stars, description, pushed date, open issues, contributors, releases, commits on `packages/frameworks/vanilla` (47, first 2026-01-02 "refactor: introduce vanilla package"), `packages/frameworks/vanilla/tests` listing, issues matching "vanilla" (#3327, #3018, #2505, #2345, #1511).
- https://github.com/chakra-ui/zag/tree/main/examples/vanilla-ts/src (`component.ts`, `tabs.ts`, `tooltip.ts`): the intended lifecycle (`init`, `destroy`, `spreadProps` with `scope.id`).
- https://github.com/chakra-ui/zag/discussions/1210: web components request, maintainer "open to seeing a Lit implementation", `getRootNode: () => this.renderRoot`.
- https://github.com/chakra-ui/zag/discussions/2309: vanilla examples broken after 1.0, "I have this in mind but didn't get to implement it", proof of concept posted.
- `npm view @zag-js/vanilla time`: 30 versions, 1.32.0 on 2026-01-02 through 1.44.0 on 2026-09-13 and 2.0.0-next.3 on 2026-09-14.
