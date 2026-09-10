# What do Base UI's Collapsible, Scroll Area, Separator, Navigation Menu, Toolbar, and Toggle Group cost to wrap in Ultima's conventions, and what does a Breadcrumb need without a primitive?

## Findings

Six of the seven candidates exist in `@base-ui/react` 1.8.0 and none of them needs a provider or an app-root component, so every one could ship as a self-contained registry item. Breadcrumb has no primitive and never will need one: it is a `<nav aria-label>` around an `<ol>` with `aria-current="page"` on the last crumb and a presentational separator, which Ultima writes as plain elements the way it already writes Table and Card.

Cost, one line each, in Ultima's terms:

| Component | Cost | Why |
| --- | --- | --- |
| Separator | **Trivial** | One part, one element, one data attribute, no variables, no injection, no glyphs. The only work is remembering it has no intrinsic size. |
| Toggle Group | **Trivial** | Two imports and two parts, both plain buttons in a `role="group"`. The one real decision is whether `Toggle` reuses Button's variant tables, since `data-pressed` is a state Button does not have today. |
| Collapsible | **Moderate** | Three parts, but `Panel` has a four-rule CSS contract it needs to animate at all, and getting one rule wrong disables the animation silently rather than visibly. Verified to survive StyleX. |
| Scroll Area | **Moderate** | Six parts that are easy to paint, but it forces a CSP row and a focusable-viewport row into the accessibility contract, and it is the one component whose `<style>` injection Ultima has to document. |
| Toolbar | **Moderate** | Only two parts need paint; the cost is the composition matrix, because `Toolbar.Button` exists to be handed Ultima's Button or another Base UI trigger through `render`, and Tooltip inverts the nesting. |
| Navigation Menu | **Expensive** | Thirteen parts, ten of them styled, and two parts Ultima's Styled-parts rule would classify as pass-through (`Positioner`, `Viewport`) must carry real CSS or the component does not work. The size-morph animation is driven by four imperatively seeded variables. |
| Breadcrumb | **Trivial** | No primitive, no ARIA beyond a nav label and `aria-current`, no keyboard. Five plain-element parts, one of them `aria-hidden`. |

Nothing below decides which of these enters v0.

### Where each part falls under the Styled parts rule

Ultima's rule: *a part carries Ultima styles if it paints — background, border, shadow, or color — or if it sets its own type or spacing; a part passes through unstyled if its whole job is to portal, position, or group.* Applied part by part, from the 1.8.0 source and the maintainers' own CSS Modules demos.

**Collapsible** (3 parts, `@base-ui/react/collapsible`)

| Part | Element | Verdict |
| --- | --- | --- |
| `Root` | `<div>` | Groups. Pass through by the rule. It renders no styles of its own; a bordered disclosure card would be a named exception the way `Dialog.Viewport` is. |
| `Trigger` | `<button>` | Paints. It is a real control, not a wrapper: `useButton` gives it `focusableWhenDisabled: true` and it carries `aria-expanded`/`aria-controls` itself. Styled by the rule — but it duplicates Button, so `render={<Button variant="ghost" />}` is available and is the decision to name in the contract. |
| `Panel` | `<div>` | Sets spacing and owns the height animation. Styled, and the only part with a hard CSS contract. |

**Scroll Area** (6 parts, `@base-ui/react/scroll-area`)

| Part | Element | Verdict |
| --- | --- | --- |
| `Root` | `<div>` | Groups, and sets its own `position: relative` inline. Pass through. |
| `Viewport` | `<div>` | Base UI gives it `overflow: scroll` and `role="presentation"`, and makes it **tabbable** (`tabIndex: 0` whenever either axis overflows). It therefore takes a focus ring, which is painting. Styled. |
| `Content` | `<div>` | Base UI sets only `min-width: fit-content` and `role="presentation"`; the padding of the scrollable content lives here. Sets spacing, so styled. |
| `Scrollbar` | `<div>` | Paints the track. Styled. Base UI positions it inline (`position: absolute`, edge insets, `touch-action: none`), so Ultima writes colour, width, and the `data-hovering`/`data-scrolling` fade only. |
| `Thumb` | `<div>` | Paints. Styled. Its length comes from `height: var(--scroll-area-thumb-height)` set inline by Base UI, so Ultima writes only colour and radius. |
| `Corner` | `<div>` | Base UI sizes and positions it inline; it paints only if given a background. Styled if the corner should match the track, otherwise renderable as nothing. |

**Separator** (1 part, `@base-ui/react/separator`). `<div role="separator" aria-orientation={orientation}>`. Styled. It has no intrinsic size in either axis: the maintainers' demo gives the vertical case `width: 1px` and lets a flex parent stretch the height. Ultima's rule would need it to set both dimensions per orientation rather than relying on the caller's layout.

**Navigation Menu** (13 parts, `@base-ui/react/navigation-menu`)

| Part | Element | Verdict |
| --- | --- | --- |
| `Root` | `<nav>`, or `<div>` when nested | Groups. Pass through. |
| `List` | `<ul>` | Needs the list reset (`list-style: none; padding: 0; margin: 0`) plus `display: flex; position: relative`. Sets spacing, so styled. |
| `Item` | `<li>` | Groups. Pass through. |
| `Trigger` | `<button>` | The control. Paints. Styled. |
| `Icon` | `<span>` | Paints the chevron and rotates on `data-popup-open`. Styled, and a glyph slot — see below. |
| `Content` | `<div>` | Sets spacing and owns the directional enter/exit transition keyed on `data-activation-direction`. Styled. |
| `Portal` | — | Pass through. |
| `Positioner` | `<div>` (`role="presentation"`) | **Breaks the rule.** Everywhere else in Ultima a Positioner gets `outline: 0` and nothing else. Here it must carry `width: var(--positioner-width); height: var(--positioner-height); max-width: var(--available-width)` and a transition on `top, left, right, bottom`, or the menu does not resize or slide between items. Styled. |
| `Viewport` | `<div>` | **Breaks the rule.** Ultima's table lists `Viewport` as pass-through on every component. Here it must carry `position: relative; overflow: hidden; width: 100%; height: 100%` or the content is not clipped during the morph. Styled. |
| `Backdrop` | `<div>` (`role="presentation"`) | Invisible click-catcher, like Menu's and Select's. Pass through. |
| `Popup` | `<nav>` | Paints, and must carry `width: var(--popup-width); height: var(--popup-height)` with `transition-property` including `width, height`. Styled. |
| `Arrow` | `<div>` (`aria-hidden`) | Paints. Styled. |
| `Link` | `<a>` | Paints and sets type. Styled. |

Ten styled parts against three pass-through, and the two rule-breakers are the load-bearing ones.

**Toolbar** (6 parts, `@base-ui/react/toolbar`)

| Part | Element | Verdict |
| --- | --- | --- |
| `Root` | `<div>` (`role="toolbar"`) | Groups by name, but it is the surface: the demo gives it border, background, padding, and gap. Styled. |
| `Group` | `<div>` (`role="group"`) | `display: flex; gap`. Sets spacing, so styled. |
| `Button` | `<button>` | Exists to be handed another control through `render`. Pass through under Ultima's existing wrapper-trigger rule, documented as `render={<Button />}`. |
| `Link` | `<a>` | Paints and sets type. Styled, unless Ultima ships a link component to render into it. |
| `Input` | `<input>` | Same wrapper argument as `Button`: `render={<Input />}`. Pass through. |
| `Separator` | `<div>` | Delegates to `Separator` with the orientation flipped against the toolbar's. Styled. |

**Toggle Group** (2 components, two subpaths: `@base-ui/react/toggle-group` and `@base-ui/react/toggle`)

| Part | Element | Verdict |
| --- | --- | --- |
| `ToggleGroup` | `<div>` (`role="group"`) | Groups by name, but the demo paints it: border, padding, gap. Styled. |
| `Toggle` | `<button aria-pressed>` | The control. Paints. Styled, or `render={<Button />}` — see the cost note below. |

Note this is not a namespace. `ToggleGroup` and `Toggle` are separate exports from separate subpaths, so an Ultima `toggle-group.tsx` importing both still ships as one file with one `@base-ui/react` dependency, but the compound-component rule (`ToggleGroup.Item`) would be Ultima's own invention rather than a mirror of Base UI's part names.

### What each needs from the consumer's CSS, and the variables Base UI seeds

Every variable below is set as an **inline style on the part**, either through React's `style` object or imperatively with `element.style.setProperty`. None of them come from a stylesheet, so none of them can be beaten by a cascade layer.

**Collapsible.Panel — the animation contract.** `CollapsiblePanel` always writes both variables inline, `auto` when unmeasured and `<n>px` when measured:

```
--collapsible-panel-height: auto | <scrollHeight>px
--collapsible-panel-width:  auto | <scrollWidth>px
```

The consumer must supply four things, and the maintainers' demo supplies exactly these:

```css
.Panel {
  height: var(--collapsible-panel-height);
  overflow: hidden;
  transition: height 150ms ease-out;

  &[hidden]:not([hidden='until-found']) { display: none; }

  &[data-starting-style],
  &[data-ending-style] { height: 0; }
}
```

Three of those are load-bearing in a way that fails silently:

1. **A non-zero duration is mandatory, and it is detected by reading computed style.** `getAnimationType` in `useCollapsiblePanel` calls `getComputedStyle(panel)` and branches on `animationName` and `transitionDuration`. With neither set it returns `'none'`, and the panel unmounts on the same frame with no animation and no warning. Ultima's motion tokens collapse to `1ms` under reduced motion, which is still non-zero, so the detection keeps working — this is the same property the spec already relies on for Base UI's transition-aware unmount.
2. **A transition and a keyframe animation together log a dev warning and the transition wins.** The source warns `'CSS transitions and CSS animations both detected on Collapsible or Accordion panel.'` and returns `'css-transition'`. Ultima's Overlays section already prefers transitions, so this costs nothing, but it is a real constraint on the panel.
3. **The `[hidden]` rule is only needed if Ultima sets `display` on the Panel.** The UA `[hidden] { display: none }` rule loses to any author `display`. If Ultima gives the Panel `display: flex` or `display: grid` for its content layout, it must re-assert the hidden case, and the `:not([hidden='until-found'])` half is what keeps `hiddenUntilFound` find-in-page working.

**This survives StyleX.** I compiled the exact panel rule through `@stylexjs/babel-plugin` 0.19.0 with this repo's `stylex.options.ts` settings (`useCSSLayers: true`, `runtimeInjection: false`), and all three concerns come out clean:

```
@layer priority2{
.x78zum5{display:flex}
.xx6bhzk{transition-duration:.15s}
.xua3uq3{transition-property:height}
.x1b4fnfk:is([hidden]):not([hidden="until-found"]){display:none}
}
@layer priority3{
.xuan8c8{height:var(--collapsible-panel-height)}
.x1fuwxb3:is([data-starting-style]){height:0}
.x61rqsd:is([data-ending-style]){height:0}
}
```

Three things that answer the ticket's question directly. The `var()` reference passes through the compiler verbatim — StyleX treats it as an opaque value and does not try to resolve it, so a variable Ultima never declares is fine. The state rules land in the **same** layer as the default and after it in source order, at priority 4040 against 4000, so `[data-starting-style] { height: 0 }` wins without `!important` and without a layer-ordering fight. And the attribute-selector key form Ultima's State styling section already mandates (`':is([data-starting-style])'`) compiles as written, including the compound `':is([hidden]):not([hidden="until-found"])'`.

The cascade layer does not threaten the variable at all, in either direction. Base UI sets `--collapsible-panel-height` as an inline custom property on the element; inline declarations sit above every stylesheet origin, and cascade layers only order declarations within an origin. The one exposure is the ordinary Ultima exposure the spec already names under *What a component may assume about the consumer's CSS*: an unlayered consumer rule setting `height`, `overflow`, or `transition` on the panel beats Ultima's layered rule and breaks the animation.

**Scroll Area.** Base UI sets inline: `position: relative` plus `--scroll-area-corner-height`/`--scroll-area-corner-width` on `Root`; `overflow: scroll` on `Viewport`; the whole absolute placement of `Scrollbar` including `--scroll-area-thumb-height`/`--scroll-area-thumb-width`; `height: var(--scroll-area-thumb-height)` on `Thumb`; and `min-width: fit-content` on `Content`. Four more variables are written to `Viewport` on every scroll frame, in pixels:

```
--scroll-area-overflow-x-start   --scroll-area-overflow-x-end
--scroll-area-overflow-y-start   --scroll-area-overflow-y-end
```

These are the distance from each edge, and they are what the documented gradient-fade recipe reads. Base UI also calls `CSS.registerProperty` on all four with `inherits: false` for performance, skipped on WebKit — so a descendant that wants them must opt in with `inherit`, and that opt-in behaves differently in Safari. Ultima's own CSS must supply the box: the Root gets no size of its own, and the demo's Scrollbar rules are colour, width, and the `data-hovering`/`data-scrolling` opacity fade only. Nothing about the layout is Ultima's problem.

**Navigation Menu.** This is the one with a real CSS dependency. `--available-width`, `--available-height`, `--anchor-width`, `--anchor-height`, and `--transform-origin` come from the shared `useAnchorPositioning`, as on every other anchored popup. On top of that, four variables drive the size morph and are set **imperatively** from the trigger, first to `auto`, then to measured pixels:

```
Positioner:  --positioner-width, --positioner-height
Popup:       --popup-width,      --popup-height
```

If the stylesheet does not read them, the menu does not animate between items at all — it snaps. The maintainers' demo is the minimum:

```css
.Positioner {
  width: var(--positioner-width);
  height: var(--positioner-height);
  max-width: var(--available-width);
  transition-property: top, left, right, bottom;
  &[data-instant] { transition: none; }
}
.Popup {
  width: var(--popup-width);
  height: var(--popup-height);
  transform-origin: var(--transform-origin);
  transition-property: opacity, transform, width, height;
}
.Viewport { position: relative; overflow: hidden; width: 100%; height: 100%; }
```

`data-instant` on the Positioner is set during window resize and on the first open, and the rule that kills the transition for it is not optional — without it the menu animates in from an unpositioned state on mount. `Content` additionally needs paired `[data-starting-style]`/`[data-ending-style]` transforms keyed on `[data-activation-direction='left'|'right']` for the slide between sibling items. `Popup` renders `position: absolute` with a pinned edge inline when the side is `top` or the physical left, which the Ultima rule must not fight.

**Separator, Toolbar, Toggle Group.** No CSS variables at all, and nothing required beyond ordinary layout. `Separator` is the one trap: a bare `<div>` with no intrinsic size, so both dimensions come from Ultima or from the parent's stretch.

### Data attributes, roles, ARIA, and keyboard

One row per component, in the shape the Accessibility contract table takes.

| Component | Element or primitive | Roles and ARIA Base UI sets | Name source | Focus ring on | Keyboard |
| --- | --- | --- | --- | --- | --- |
| Collapsible | Base UI `Collapsible` | `Trigger`: `aria-expanded`, `aria-controls` pointing at the Panel's id when open. Panel gets `hidden`, or `hidden="until-found"` under `hiddenUntilFound`. No role on Root or Panel. | Trigger text | Trigger | Native button (Space, Enter). No arrow keys, no Escape. |
| Scroll Area | Base UI `ScrollArea` | `Root`, `Viewport`, `Content`: `role="presentation"`. `Scrollbar` and `Corner`: `aria-hidden`. `Viewport` gets `tabIndex={0}` whenever either axis overflows and `-1` when neither does. | None needed (presentational) | **Viewport** | Native scrolling once focused. Scrollbar and Thumb are pointer-only. |
| Separator | Base UI `Separator` | `role="separator"`, `aria-orientation` always set explicitly | None | None | None |
| Navigation Menu | Base UI `NavigationMenu` | `Root`: `<nav>` landmark, unlabelled. `Popup`: a second `<nav>` with `tabIndex={-1}`, also unlabelled. `Trigger`: `aria-expanded`, `aria-controls`, `tabIndex={0}`, no `aria-haspopup`. `Link`: `aria-current="page"` when `active`. `Icon` and `Arrow`: `aria-hidden`. `Positioner` and `Backdrop`: `role="presentation"`. A visually hidden `<span aria-owns={viewportId}>` is rendered beside the active trigger to tie the portalled content back to it. | **Ultima must supply `aria-label` on both navs.** Two unlabelled `<nav>` landmarks on a page is the failure mode. | Trigger and Link | Every Trigger stays in the tab order (`tabIndex: 0` is applied after the composite's roving `-1`, so roving does not apply). Arrow keys move between triggers through `CompositeRoot`; ArrowDown (horizontal) or ArrowRight/ArrowLeft by direction (vertical) opens; Escape and outside press dismiss; focus returns to the trigger on close unless the close reason was hover, outside press, or focus-out. |
| Toolbar | Base UI `Toolbar` | `Root`: `role="toolbar"`, `aria-orientation`. `Group`: `role="group"`. `Separator`: inherits `role="separator"` with the orientation flipped. | **`aria-label` on Root**, per the APG toolbar pattern; Base UI sets none | Whichever control the item renders | Roving tabindex through `CompositeItem` (`tabIndex: 0` on the highlighted item, `-1` on the rest), so the toolbar is one tab stop. Arrow keys along the orientation, Home and End. `loopFocus` defaults to `true`. `focusableWhenDisabled` defaults to **`true`** on `Button` and `Input`, so a disabled item stays in the roving order — the opposite of Ultima's Button, which is natively disabled. |
| Toggle Group | Base UI `ToggleGroup` + `Toggle` | `ToggleGroup`: `role="group"`. `Toggle`: `aria-pressed`, native `<button>`. | **`aria-label` on the group**, and text or `aria-label` on each Toggle | Toggle | Roving tabindex, arrow keys along the orientation, Home and End (`enableHomeAndEndKeys` is passed `true`), `loopFocus` defaults to `true`. Space and Enter toggle. |

State data attributes, exhaustive, from the `*DataAttributes` modules:

- **Collapsible.** `Root` and `Panel`: `data-open`, `data-closed`, `data-starting-style`, `data-ending-style`. `Trigger`: `data-panel-open` (note: not `data-popup-open`), plus `data-disabled` through the shared button mapping.
- **Scroll Area.** `Root`, `Viewport`, `Content`, `Scrollbar` all share: `data-scrolling`, `data-has-overflow-x`, `data-has-overflow-y`, `data-overflow-x-start`, `data-overflow-x-end`, `data-overflow-y-start`, `data-overflow-y-end`. `Scrollbar` adds `data-orientation` and `data-hovering`. `Thumb`: `data-orientation`, `data-scrolling`. `Corner`: none.
- **Separator.** `data-orientation` only.
- **Navigation Menu.** `Trigger`: `data-popup-open`, `data-pressed`, `data-disabled`. `Icon`: `data-popup-open`. `Link`: `data-active`. `Content`: `data-open`, `data-closed`, `data-starting-style`, `data-ending-style`, `data-activation-direction` (`left`/`right`/`up`/`down`). `Positioner`: `data-open`, `data-closed`, `data-anchor-hidden`, `data-side`, `data-align`, `data-instant`. `Popup`: those minus `data-instant`, plus `data-starting-style`, `data-ending-style`. `Backdrop`: `data-open`, `data-closed`, `data-starting-style`, `data-ending-style`. `Arrow`: `data-open`, `data-closed`, `data-side`, `data-align`, `data-uncentered`.
- **Toolbar.** `Root` and `Group`: `data-orientation`, `data-disabled`. `Button` and `Input`: those plus `data-focusable`. `Link`: `data-orientation`. `Separator`: `data-orientation`.
- **Toggle Group.** `ToggleGroup`: `data-orientation`, `data-disabled`, `data-multiple`. `Toggle`: `data-pressed`, `data-disabled`.

### Inline `<style>` injection under a strict CSP

**The ticket's premise is off by one part.** `ScrollArea.Viewport` does not inject the `<style>`; it only applies the class name. `ScrollArea.Root` renders the element, as a sibling of the root div:

```jsx
[!disableStyleElements && styleDisableScrollbar.getElement(nonce), element]
```

What gets injected is one React 19 hoisted stylesheet carrying two rules and nothing else:

```css
.base-ui-disable-scrollbar { scrollbar-width: none }
.base-ui-disable-scrollbar::-webkit-scrollbar { display: none }
```

It is emitted with `href="base-ui-disable-scrollbar"` and `precedence="base-ui:low"`, so React deduplicates it by href — a page with twenty scroll areas still gets one tag. Its only job is hiding the native scrollbars so the custom `Scrollbar` and `Thumb` are the only ones visible.

Under a strict CSP the consumer picks one of two exchanges, and neither adds a dependency to Ultima's registry item:

- `<CSPProvider nonce={...}>` — the nonce is applied to the `<style>` and the tag renders as normal.
- `<CSPProvider disableStyleElements>` — no tag is rendered, and the consumer must ship the two rules above themselves under that exact class name.

`CSPProvider` reads from `@base-ui/react/csp-provider` and is consumed through React context with a default of `{ disableStyleElements: false }`, so **it is optional**: a Scroll Area with no provider anywhere above it works fine and simply injects the tag. That is why this does not make the registry item non-self-contained — it is a documentation row, matching the note the spec already carries on the Select page. `<script>` tags are opt-in across the library and unaffected by `disableStyleElements`.

None of the other five injects anything. Navigation Menu's only stealth DOM is the visually hidden `<span aria-owns>` beside the active trigger, which uses an inline `style` object and so is CSP-clean.

### Empty glyph slots

Only one of the six has a glyph slot, and unlike Select's and Menu's it is not empty.

`NavigationMenu.Icon` renders a `<span aria-hidden="true">` whose default `children` is the literal text character `'▼'`. It carries `data-popup-open`, and the maintainers' demo rotates it 180 degrees on that attribute. Ultima would override it the way the Iconography section already specifies for `Select.Icon` — `{children ?? <ChevronDown />}` — but the substitution is replacing a default rather than filling a blank, and the chevron-down glyph already exists in `select.tsx`, so under the "written out twice rather than a shared lib item" rule this is a third copy, not a new drawing.

Worth flagging: the Base UI docs page for Navigation Menu does not mention the default glyph at all. The source is the authority here.

`Collapsible`, `ScrollArea`, `Separator`, `Toolbar`, and `ToggleGroup` have no indicator, icon, or arrow parts and no empty slots. The chevron on a Collapsible trigger and the icons on toolbar buttons are entirely the caller's content, exactly like a Button's leading icon.

### Providers and app-root components

**None of the six requires one.** Verified against every part's source:

- `Collapsible`, `Separator`, `Toolbar`, `ToggleGroup`: no context outside the component's own subtree.
- `ScrollArea`: `CSPProvider` is optional, defaults are supplied by `useCSPContext`, and it is the consumer's app-root concern rather than a registry dependency.
- `NavigationMenu.Root` mounts its own `FloatingTree` when it is not nested, so nesting works with no outer provider. It does portal, so it inherits the two global rules the spec already documents: `isolation: isolate` on the app root, and `body { position: relative }` for iOS 26 Safari.
- `DirectionProvider` is read by Scroll Area, Toolbar, Toggle Group, and Navigation Menu through `useDirection`, which falls back to `'ltr'`. Optional everywhere.

So all six could be self-contained registry items with `@base-ui/react` and `@stylexjs/stylex` as their only dependencies, plus `@ultima/tokens`, plus whichever Ultima components they render into their wrapper slots.

### Cost notes the table compresses

- **Collapsible's real cost is a documentation cost.** The styling is three parts and a dozen declarations. What is expensive is that the Panel's contract has three silent failure modes — no duration, both a transition and a keyframe, and a `display` that shadows `[hidden]` — and each of them produces a component that looks correct in a static screenshot.
- **Scroll Area buys two accessibility-contract rows Ultima does not have yet.** The Viewport is a focusable region, so it needs the focus ring on a part that is neither a control nor a popup; and the CSP note becomes a second occurrence of a rule that currently lives only on the Select page. That is the argument for hoisting the CSP note out of a per-component note into the install documentation.
- **Toolbar's cost is composition, not paint.** `Toolbar.Button` is documented as the render target for `Menu.Trigger`, `Dialog.Trigger`, `AlertDialog.Trigger`, `Popover.Trigger`, and `Select.Trigger`, and Tooltip inverts it — the button is passed to `Tooltip.Trigger`'s `render` instead. That is a five-by-one matrix of nesting orders to write out and test, and it lands on top of Ultima's existing wrapper-trigger rule rather than beside it. Second, `focusableWhenDisabled` defaults to `true` here and `false` on Ultima's Button, so a disabled control inside a toolbar behaves differently from the same control outside one.
- **Toggle Group's cost is one open question about Button.** `Toggle` renders a `<button aria-pressed>` with `data-pressed`, and Ultima's Button has `variant × tone` nested tables with no pressed state in them. Either `Toggle` gets its own small table, or Button grows a `data-pressed` row that only Toggle Group ever sets. The spec's one-compound rule means adding a state to the nested tables touches every cell.
- **Navigation Menu is expensive for a reason that is not part count.** Two parts Ultima's rule classifies as pass-through must carry real CSS, and both are parts the spec's Styled parts table currently names as pass-through *across the system*. Promoting Navigation Menu means either two more named exceptions in that table alongside `Dialog.Viewport` and Select's scroll arrows, or a reworded rule. The animation is also the most fragile of the six: it depends on four variables that Base UI writes imperatively during the open transition, and on `[data-instant]` suppressing the transition on mount and resize.

### Breadcrumb

**Confirmed: there is no Breadcrumb primitive.** The full subpath export list in `packages/react/package.json` at 1.8.0 is the one the inventory note already recorded, and `breadcrumb` is not in it. Nothing adjacent covers it either — `NavigationMenu` is a disclosure widget for a top nav, not a trail.

That is the right outcome, because a breadcrumb has no behaviour to encapsulate. The APG pattern page's Keyboard Interaction section reads, in full, "Not applicable," and the example page's Keyboard Support reads "No keyboard interaction needed." The entire ARIA surface is three sentences:

> Breadcrumb trail is contained within a navigation landmark region.
> The landmark region is labelled via `aria-label` or `aria-labelledby`.
> The link to the current page has `aria-current` set to `page`. If the element representing the current page is not a link, aria-current is optional.

Unpacked into the four things the ticket asks about:

**The landmark.** A `<nav>` with `aria-label`, unconditionally — the APG's requirement is not softened when a page already carries many landmarks. I looked for such an escape hatch and there is none; the landmark-regions practice only asks that multiple `navigation` landmarks each get a unique label, and that identical link sets share a label. The label is the bare noun, because the same practice says "Do not use the landmark role as part of the label" — so `aria-label="Breadcrumb"`, not "Breadcrumb navigation." The exact string is the one thing nobody agrees on: APG uses `"Breadcrumb"`, shadcn/ui `"breadcrumb"`, Primer `"Breadcrumbs"`.

**The list.** An `<ol>`, not a `<ul>`. The APG example is `nav > ol > li > a` and its Accessibility Features section says "The set of links is structured using an ordered list." shadcn/ui and Primer both do the same.

**`aria-current="page"`.** On the last crumb, and it is the interesting disagreement. The APG example makes the last crumb a real self-referential `<a href aria-current="page">`. Primer does the same. shadcn/ui and React Aria both make it a non-link instead, and land byte-for-byte on the same markup without having copied each other: `<span role="link" aria-disabled="true" aria-current="page">`. That combination appears nowhere in the APG. React Aria derives it rather than declaring it — `isCurrent = node.nextKey == null`, then the current item is force-disabled, and `useLink` renders a `<span>` instead of an `<a>` for a disabled link. So Ultima's choice is between "last crumb is a link to itself" and "last crumb is not a link," and the APG explicitly permits the second (`aria-current` becomes optional there, though every implementation sets it anyway).

**The separator is presentation, and the APG argues for keeping it out of the DOM entirely.** Its Accessibility Features section is explicit about why:

> To prevent screen reader announcement of the visual separators between links, they are added via CSS: The separators are part of the visual presentation that signifies the breadcrumb trail, which is already semantically represented by the `nav` element with its label of *Breadcrumb*. So, using a display technique that is not represented in the accessibility tree used by screen readers prevents redundant and potentially distracting verbosity.

The APG draws it as a skewed border on a `li + li::before` with empty `content`, so there is no separator character in the markup and no `aria-hidden` anywhere in the example. Primer does the same in its default wrap mode. shadcn/ui takes the other road: a real `<li role="presentation" aria-hidden="true">` holding a lucide `<ChevronRight />`, overridable through `children`. Both are hidden from assistive technology; the shadcn form costs a DOM node per gap and puts `<li>`s inside the `<ol>` that are not list items, and buys a swappable glyph in exchange.

**How comparable systems build one.** shadcn/ui's is seven parts and almost entirely plain elements — `Breadcrumb` (`<nav aria-label="breadcrumb">`), `BreadcrumbList` (`<ol>`), `BreadcrumbItem` (`<li>`), `BreadcrumbLink` (`<a>`), `BreadcrumbPage` (`<span role="link" aria-disabled="true" aria-current="page">`), `BreadcrumbSeparator` (`<li role="presentation" aria-hidden="true">` with a default chevron), and `BreadcrumbEllipsis` (`<span role="presentation" aria-hidden="true">` around an icon plus an `sr-only` "More" label for the collapsed state). Its only dependency is Radix's `Slot` for the `asChild` escape hatch — no behavioural primitive at all — which is exactly the role `useRender` from `@base-ui/react/use-render` plays in Ultima. React Aria is the outlier worth knowing about: it renders no `<nav>` and puts `aria-label="Breadcrumbs"` on the `<ol>` instead, pushing the landmark onto the consumer, which means the landmark becomes something a caller can forget.

For Ultima this reads as a plain component in the Table and Card family: five or six parts, every one written by Ultima, every one styled, no pass-through parts, no glyph slot unless the separator becomes a markup node, and one row in the accessibility contract naming `Breadcrumb.Root` as the `<nav>` whose label Ultima supplies by default.

## Facts later tickets will need

- All six primitives are self-contained: no provider, no app-root component, `@base-ui/react` and `@stylexjs/stylex` as the only package dependencies.
- Subpaths: `@base-ui/react/collapsible`, `/scroll-area`, `/separator`, `/navigation-menu`, `/toolbar`, `/toggle-group`, `/toggle`. Toggle Group is two of them.
- `Collapsible.Panel` needs a non-zero `transition-duration` in computed style or it does not animate and the panel unmounts on the same frame. Reduced motion at `1ms` is safe.
- StyleX 0.19.0 compiles `var(--collapsible-panel-height)`, `var(--popup-width)`, and the rest verbatim; `':is([data-starting-style])'` keys emit at a higher priority than the default in the same layer, so no `!important` and no layer ordering is needed. Verified by compiling with this repo's `stylex.options.ts` settings.
- The Scroll Area `<style>` tag comes from `ScrollArea.Root`, not `ScrollArea.Viewport` as the Base UI docs page says. One tag per page regardless of instance count (React 19 dedupes on `href="base-ui-disable-scrollbar"`).
- `NavigationMenu.Icon` ships a default `'▼'` text glyph, not an empty slot. The docs page does not mention it.
- `NavigationMenu.Positioner` and `NavigationMenu.Viewport` need real CSS, which contradicts the system-wide pass-through classification of those two part names in the Styled parts table.
- `Toolbar.Button` and `Toolbar.Input` default to `focusableWhenDisabled: true`; Ultima's Button does not.
- Navigation Menu renders two nested unlabelled `<nav>` elements (Root and Popup). Both need an `aria-label` from Ultima or the consumer.
- Breadcrumb: `<nav aria-label="Breadcrumb"> > <ol> > <li> > <a>`, `aria-current="page"` on the last crumb, separator out of the accessibility tree. No keyboard, no roles beyond that.

## Sources

- `node_modules/.pnpm/@base-ui+react@1.8.0_.../node_modules/@base-ui/react/package.json`: version 1.8.0; the subpath exports `./collapsible`, `./scroll-area`, `./separator`, `./navigation-menu`, `./toolbar`, `./toggle`, `./toggle-group`, `./csp-provider`; no `./breadcrumb`.
- `@base-ui/react/collapsible/panel/useCollapsiblePanel.mjs`: `getAnimationType` reading `getComputedStyle().animationName`/`transitionDuration`, the `'none'` branch that unmounts immediately, the dev warning when a transition and a keyframe animation are both present, `getDimensions` measuring `scrollHeight`/`scrollWidth`, and the `hidden="until-found"` handling.
- `@base-ui/react/collapsible/panel/CollapsiblePanel.mjs`: `--collapsible-panel-height` and `--collapsible-panel-width` written as inline styles with `auto` or a pixel value, merged before the consumer's resolved `style`.
- `@base-ui/react/collapsible/panel/CollapsiblePanelCssVars.d.ts` and `CollapsiblePanelDataAttributes.d.ts`: the two variable names and the four panel data attributes.
- `@base-ui/react/collapsible/trigger/CollapsibleTrigger.mjs`: `aria-expanded`, `aria-controls` gated on open, `useButton` with `focusableWhenDisabled: true`, `data-panel-open`.
- `@base-ui/react/collapsible/root/CollapsibleRoot.mjs`: `<div>` with no props of its own beyond state attributes.
- `@base-ui/react/scroll-area/root/ScrollAreaRoot.mjs`: `role="presentation"`, inline `position: relative`, `--scroll-area-corner-height`/`-width`, `useCSPContext`, and the `!disableStyleElements && styleDisableScrollbar.getElement(nonce)` sibling that renders the `<style>` element — establishing that Root, not Viewport, does the injecting.
- `@base-ui/react/utils/styles.mjs`: the injected element's exact contents, `href="base-ui-disable-scrollbar"`, `precedence="base-ui:low"`, and the two rules `scrollbar-width: none` and `::-webkit-scrollbar { display: none }`.
- `@base-ui/react/internals/csp-context/CSPContext.mjs` and `csp-provider/CSPProvider.mjs`: the context default `{ disableStyleElements: false }`, proving `CSPProvider` is optional.
- `@base-ui/react/scroll-area/viewport/ScrollAreaViewport.mjs`: `role="presentation"`, `tabIndex` 0 or -1 by overflow, inline `overflow: scroll`, `className: styleDisableScrollbar.className` (class only, no injection), the four `--scroll-area-overflow-*` variables written per scroll frame, and `CSS.registerProperty` with `inherits: false` skipped on WebKit.
- `@base-ui/react/scroll-area/scrollbar/ScrollAreaScrollbar.mjs`, `thumb/ScrollAreaThumb.mjs`, `content/ScrollAreaContent.mjs`, `corner/ScrollAreaCorner.mjs`: `aria-hidden` on Scrollbar and Corner, the inline absolute placement and thumb-size variables, `min-width: fit-content` on Content.
- `@base-ui/react/scroll-area/**/ScrollArea*DataAttributes.d.ts` and `*CssVars.d.ts`: the exhaustive per-part attribute and variable lists.
- `@base-ui/react/separator/Separator.mjs` and `Separator.d.ts`: `<div role="separator" aria-orientation={orientation}>`, `orientation` defaulting to `'horizontal'`, `data-orientation` as the only state attribute. The Base UI docs page states none of this, so the source is the authority.
- `@base-ui/react/navigation-menu/root/NavigationMenuRoot.mjs`: `<nav>` at the root and `<div>` when nested, the self-mounted `FloatingTree`, `delay`/`closeDelay` defaults of 50ms, and the return-focus reasons that suppress restoring focus to the trigger.
- `@base-ui/react/navigation-menu/trigger/NavigationMenuTrigger.mjs`: `tabIndex: 0` applied after the `CompositeItem` roving value, `aria-expanded`, `aria-controls`, absence of `aria-haspopup`, the ArrowDown/ArrowRight open keys by orientation and direction, `setAutoSizes`/`setSharedFixedSize`/`clearFixedSizes` writing `--popup-width`/`--popup-height` imperatively, and the visually hidden `<span aria-owns={viewportId}>`.
- `@base-ui/react/navigation-menu/utils/setSharedFixedSize.mjs`: the four variables written together on Popup and Positioner.
- `@base-ui/react/navigation-menu/popup/NavigationMenuPopup.mjs`: `<nav>`, `tabIndex: -1`, and the conditional inline `position: absolute` with a pinned edge for `side="top"` or the physical left.
- `@base-ui/react/navigation-menu/viewport/NavigationMenuViewport.mjs`: the focus guards and the `inert` toggle, plus its lack of any styling of its own.
- `@base-ui/react/navigation-menu/link/NavigationMenuLink.mjs` and `icon/NavigationMenuIcon.mjs`: `aria-current="page"` when `active`, and `aria-hidden` with a default `children: '▼'`.
- `@base-ui/react/utils/usePositioner.mjs` and `internals/constants.mjs`: `role="presentation"` on every positioner, and `DISABLED_TRANSITIONS_STYLE` as `{ transition: 'none' }` applied while `transitionStatus === 'starting'`.
- `@base-ui/react/navigation-menu/**/*DataAttributes.d.ts` and `*CssVars.d.ts`: the per-part attribute and variable lists.
- `@base-ui/react/toolbar/root/ToolbarRoot.mjs`: `role="toolbar"`, `aria-orientation`, `loopFocus` default `true`, `disabledIndices` computed from item metadata, and the absence of any `aria-label`.
- `@base-ui/react/toolbar/button/ToolbarButton.mjs`, `input/ToolbarInput.mjs`, `link/ToolbarLink.mjs`, `group/ToolbarGroup.mjs`, `separator/ToolbarSeparator.mjs`: `focusableWhenDisabled = true` as the default on Button and Input, `role="group"` on Group, and Separator delegating to `Separator` with the orientation flipped against the toolbar's.
- `@base-ui/react/internals/composite/item/useCompositeItem.mjs`: `tabIndex: isHighlighted ? 0 : -1`, the roving tabindex behind Toolbar, Toggle Group, and Navigation Menu's list.
- `@base-ui/react/internals/composite/root/useCompositeRoot.mjs`: arrow-key navigation by orientation, `enableHomeAndEndKeys`, and `loopFocus`.
- `@base-ui/react/toggle-group/ToggleGroup.mjs`: `role="group"`, `CompositeRoot` with `enableHomeAndEndKeys: true` and `loopFocus` defaulting to `true`, `multiple` defaulting to `false`, and the Toolbar-aware branch that skips the composite when nested in a toolbar.
- `@base-ui/react/toggle/Toggle.mjs`: `<button aria-pressed>`, `data-pressed`, `data-disabled`, the dev error when a Toggle inside a group has no `value`, and the `CompositeItem` branch.
- https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)/react/components/collapsible/demos/hero/css-modules/index.module.css: the canonical panel rule — `height: var(--collapsible-panel-height)`, `overflow: hidden`, `transition: height 150ms ease-out`, `&[hidden]:not([hidden='until-found']) { display: none }`, and `[data-starting-style], [data-ending-style] { height: 0 }`.
- https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)/react/components/navigation-menu/demos/hero/css-modules/index.module.css: the Positioner's `width`/`height`/`max-width` from variables plus the `top, left, right, bottom` transition and the `[data-instant] { transition: none }` rule; the Popup's `width: var(--popup-width)`, `height: var(--popup-height)` and `transition-property: opacity, transform, width, height`; the Viewport's `position: relative; overflow: hidden; width: 100%; height: 100%`; and Content's `[data-activation-direction]` slide transforms.
- https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)/react/components/scroll-area/demos/hero/css-modules/index.module.css: consumer CSS is colour, size, and the `[data-hovering]`/`[data-scrolling]` opacity fade only; the Viewport carries a `:focus-visible` outline, corroborating that it is a focusable region.
- https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)/react/components/separator/demos/hero/css-modules/index.module.css: `width: 1px` with the height coming from the flex parent, establishing that Separator has no intrinsic size.
- https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)/react/components/toolbar/demos/hero/css-modules/index.module.css and `.../toggle-group/...`: Root and Group carry the surface, the item styles key off `data-pressed`, and the Separator gets an explicit `width: 1px; height: 16px`.
- https://base-ui.com/react/components/collapsible: part list, elements, `hiddenUntilFound` and `keepMounted` defaults of `false`, and the documented data attributes and variables.
- https://base-ui.com/react/components/scroll-area: part list, `overflowEdgeThreshold` default `0`, `Scrollbar`'s `orientation` default `'vertical'` and `keepMounted` default `false`, and the documented gradient-fade mask recipe reading the overflow variables.
- https://base-ui.com/react/components/navigation-menu: the thirteen parts and their elements, Root's `delay`/`closeDelay` of 50, Positioner's `side: 'bottom'`/`align: 'center'`/`collisionPadding: 5` defaults, Content's `keepMounted: false`, Link's `active`/`closeOnClick`. The page documents no keyboard interaction, no ARIA requirements, and does not mention Icon's default glyph, which is why the source is cited for all three.
- https://base-ui.com/react/components/toolbar: part list, `loopFocus: true`, `focusableWhenDisabled: true` on Button and Input, the guidance to use inputs sparingly and place them last, and the statement that `Toolbar.Button` accepts Menu, AlertDialog, Dialog, Popover, and Select triggers through `render` while Tooltip inverts the nesting.
- https://base-ui.com/react/components/toggle-group and https://base-ui.com/react/components/toggle: the two separate imports, ToggleGroup's prop defaults, Toggle rendering a native `<button>`, and the documented requirement for an accessible name on both.
- https://base-ui.com/react/utils/csp-provider: "the relevant components are `<ScrollArea.Viewport>` and `<Select.Popup>` or `<Select.List>` when `alignItemWithTrigger` is enabled, which inject a style tag to disable native scrollbars"; the `nonce` and `disableStyleElements` props; the exact `.base-ui-disable-scrollbar` rules a consumer must supply; and the note that `<script>` tags are opt-in and unaffected. The Viewport attribution here is contradicted by the source cited above.
- `@stylexjs/babel-plugin` 0.19.0 compiled locally against this repo's `stylex.options.ts` settings (`useCSSLayers: true`, `runtimeInjection: false`, `unstable_moduleResolution: commonJS`): `var(--collapsible-panel-height)` and the positioner variables pass through verbatim; `':is([data-starting-style])'` and `':is([hidden]):not([hidden="until-found"])'` compile as written; state rules land in the same `@layer` as their default at priority 4040 against 4000, so they win on source order without `!important`.
- `docs/research/2026-09-08-stylex-capabilities.md`: `useCSSLayers` behaviour, the priority-to-layer mapping, `stylex.props` returning `{className, style}`, and issue #1611 (custom properties set by `create` escaping `@layer`) — which does not apply here, since Ultima reads these variables rather than declaring them.
- `docs/research/2026-09-08-base-ui-inventory.md`: the full subpath export list at 1.8.0, the shared `useAnchorPositioning` variables, the `BaseUIComponentProps` styling contract, and the global `isolation: isolate` and iOS `body { position: relative }` rules that Navigation Menu inherits as a portalling component.
- `docs/spec/ultima.md`: the Styled parts rule and its wrapper-trigger corollary, the Accessibility contract table shape, the Iconography rules on private inline SVG and the `{children ?? <Glyph />}` override, the State styling rule mandating `':is([data-*])'` keys over the `className` function form, and the Overlays and registry-item requirements the cost estimates are stated against.
- https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/: the three-line ARIA list (navigation landmark, labelled via `aria-label`/`aria-labelledby`, `aria-current="page"` on the current link and optional when it is not a link) and "Keyboard Interaction: Not applicable."
- https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/examples/breadcrumb/: `<nav aria-label="Breadcrumb">` around an `<ol>`, the last item a real `<a href aria-current="page">`, "The set of links is structured using an ordered list," "No keyboard interaction needed," and the rationale for drawing separators in CSS so they stay out of the accessibility tree.
- https://github.com/w3c/aria-practices/blob/main/content/patterns/breadcrumb/examples/css/breadcrumb.css: the separator as `nav.breadcrumb li + li::before` with empty `content` and a rotated `border-right`, confirming no separator node and no `aria-hidden` in the markup.
- https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/: unique labels for multiple `navigation` landmarks, "Do not use the landmark role as part of the label," and the absence of any guidance to drop the landmark on landmark-heavy pages.
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/breadcrumb.tsx: the seven parts and their elements; `aria-label="breadcrumb"` on the `<nav>`; `BreadcrumbPage` as `<span role="link" aria-disabled="true" aria-current="page">`; `BreadcrumbSeparator` as `<li role="presentation" aria-hidden="true">` with `{children ?? <ChevronRight />}`; `BreadcrumbEllipsis` with its `sr-only` "More"; and Radix `Slot` as the only primitive dependency.
- https://ui.shadcn.com/docs/components/breadcrumb: no accessibility section; documents the separator override and the collapsed ellipsis state.
- https://github.com/adobe/react-spectrum/blob/main/packages/react-aria/src/breadcrumbs/useBreadcrumbs.ts and `.../useBreadcrumbItem.ts` and `.../link/useLink.ts`: `aria-label` defaulting to "Breadcrumbs" on the `<ol>` with no `<nav>` rendered, `isCurrent` derived from `node.nextKey == null`, the current item force-disabled so `useLink` renders a `<span role="link" aria-disabled="true" aria-current="page">`, and no separator in the library.
- https://react-aria.adobe.com/Breadcrumbs: "Place breadcrumbs inside a `<nav>` element with an `aria-label` to create a navigation landmark" — the landmark pushed onto the consumer.
- https://github.com/primer/react/blob/main/packages/react/src/Breadcrumbs/Breadcrumbs.tsx and `Breadcrumbs.module.css`: `<nav aria-label="Breadcrumbs">` around an `<ol>`, `aria-current={selected ? 'page' : undefined}` on a real `<a>`, and the separator as an `::after` skewed border in wrap mode or an `aria-hidden="true"` inline SVG in the overflow-menu modes.

