# Where do comparable systems draw the lines between Popover, Hover Card, Tooltip, Context Menu, Dropdown Menu, and Menubar?

## Findings

Four systems were read at the source: Base UI 1.8.0 (the installed package, including the docs Markdown it ships), Radix Primitives, Radix Themes, and shadcn/ui — which now publishes **three** primitive backends, `radix`, `base`, and `aria`, and disagrees with itself across them on exactly one of these boundaries.

The three boundaries come out very differently:

| Boundary | The verdict | Disagreement |
| --- | --- | --- |
| Popover / Hover Card / Tooltip | **Nobody collapses Popover and Hover Card.** Every system ships all three as separate components. | Only on *shape*: Radix Themes collapses Tooltip alone into a single component with a required `content` prop. And only on *naming*: Base UI calls its hover card Preview Card and narrows it to link previews. |
| Context Menu / Dropdown Menu | **Every system builds both on one menu primitive.** The disagreement is entirely about where the sharing stops. | Sharp. Base UI shares 18 of 19 parts *as the same function reference*. Radix Themes shares the CSS and duplicates 400 lines of React. shadcn duplicates everything and declares no dependency at all. |
| Menubar | **Ships as its own component everywhere it ships**, and is the one component a system drops when it gets expensive. | Sharpest surface disagreement: Base UI's Menubar is **one** part; Radix's is seventeen. Radix Themes omits it; shadcn/aria omits it. And shadcn's two backends disagree with each other: `radix`/menubar restates dropdown-menu, `base`/menubar imports it. |

---

## 1. Popover against Hover Card against Tooltip

### Who ships what

All four systems ship all three. Nobody collapses two.

| System | Popover | Hover card | Tooltip |
| --- | --- | --- | --- |
| Base UI 1.8.0 | `Popover.*`, 11 parts + `createHandle` | `PreviewCard.*`, 8 parts + `createHandle` | `Tooltip.*`, 8 parts + `createHandle` |
| Radix Primitives | 7 parts | 5 parts (no `Close`, no `Anchor`) | 6 parts (`Provider` is unique to it) |
| Radix Themes | compound, 5 parts | compound, 3 parts | **single component**, `content` prop required |
| shadcn/ui | registry item, 7 exports (radix) / 6 (base) | registry item, 3 exports | registry item, 4 exports |

Exact Base UI part lists, read from `index.parts.d.ts` and confirmed by enumerating the namespaces at runtime:

- `Popover`: `Root Trigger Portal Positioner Popup Arrow Backdrop Title Description Close Viewport` + `createHandle`/`Handle`
- `PreviewCard`: `Root Portal Trigger Positioner Popup Arrow Backdrop Viewport` + `createHandle`/`Handle`
- `Tooltip`: `Root Trigger Portal Positioner Popup Arrow Provider Viewport` + `createHandle`/`Handle`

Popover is the only one of the three with `Title`, `Description`, and `Close`. Tooltip is the only one with `Provider`. None of the three shares a single component reference with either of the others (checked: `Object.keys(Popover).filter(p => Popover[p] === PreviewCard[p])` is empty). This is the opposite of the menu situation in §2.

### What each system says the difference is

Base UI states a test, and it is the most usable sentence any of them published. From `docs/react/components/tooltip.md` under **Alternatives to tooltips → Infotips**:

> Popups that open when hovering an info icon should use Popover with the `openOnHover` prop on the trigger instead of a tooltip. This way, touch users and screen reader users can access the content.
>
> To know when to reach for a popover instead of a tooltip, consider the **purpose** of the trigger element: If the trigger's purpose is to open the popup itself, it's a popover. If the trigger's purpose is unrelated to opening the popup, it's a tooltip.

That test does not mention hover at all. Under it, **hover is a setting on Popover, not a component** — `Popover.Trigger` takes `openOnHover` (default `false`, `delay` 300ms, `closeDelay` 0ms). Base UI then narrows its hover card to one job: its subtitle is "A link that shows a destination preview without interrupting keyboard or screen reader navigation," and `PreviewCard.Trigger` renders an `<a>`, not a `<button>`.

Radix draws the same line with the trigger rather than its purpose:

- Popover: "Displays rich content in a portal, triggered by a button." (Primitives) / "Floating element for displaying rich content, triggered by a button." (Themes)
- Hover Card: "For sighted users to preview content available behind a link." (identical string in both)
- Tooltip: "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it." (Primitives) / "Floating element that provides a control with contextual information via pointer or focus." (Themes)

shadcn publishes no prose distinction of its own; its docs pages are per-backend wrappers around whichever primitive it wrapped.

### Does the popover require a title? No, nowhere.

Base UI has the parts and does not enforce them. `Popover.Title` renders an `<h2>` and registers its id into the store; `Popover.Popup` reads it:

```js
props: [popupProps, {
  id: floatingId,
  role: 'dialog',
  ...FOCUSABLE_POPUP_PROPS,
  'aria-labelledby': titleId,
  'aria-describedby': descriptionId,
  ...
```

When no `Title` is mounted, `titleId` is `undefined` and React drops the attribute, leaving a `role="dialog"` with **no accessible name**. `grep -rn "warn\|console\." popover/ --include=*.mjs` returns nothing: there is no dev warning. The canonical demo does mount both `Title` and `Description`.

Radix Popover today has **no Title or Description part at all** — the published `@radix-ui/react-popover@1.1.23` typings declare only `Popover PopoverAnchor PopoverTrigger PopoverPortal PopoverContent PopoverClose PopoverArrow`. Its `Content` is `role="dialog"` with nothing labelling it, and its entire documented Accessibility section is "Adheres to the Dialog WAI-ARIA design pattern" plus a keyboard table. `main` adds `PopoverTitle` (line 533) and `PopoverDescription` (line 555) behind refcounts, so both stay optional there too.

shadcn's two backends land on opposite sides of this by accident of wrapping:

- `registry/new-york-v4/ui/popover.tsx` (Radix) ships `PopoverHeader`, `PopoverTitle`, `PopoverDescription` — but they are **bare elements with no ARIA**. `PopoverTitle` is typed `React.ComponentProps<"h2">` and renders a `<div>` with `className={cn("font-medium", className)}`, no `id`, and nothing points `aria-labelledby` at it. Cosmetic only.
- `registry/bases/base/ui/popover.tsx` (Base UI) wraps the real `PopoverPrimitive.Title` and `PopoverPrimitive.Description`, so the same three exports do name the dialog.

### What supplies the accessible name in each

Measured by counting every `aria-*` and `role:` literal in each Base UI package's shipped `.mjs`:

| Package | ARIA it emits |
| --- | --- |
| `popover/` | `role: 'dialog'`, `aria-labelledby`, `aria-describedby`, `aria-haspopup: 'dialog'`, `aria-expanded`, `aria-controls`, 2× `aria-hidden`, 1× `role: 'presentation'` |
| `preview-card/` | **none** (1× `aria-hidden`, 1× `role: 'presentation'`) |
| `tooltip/` | **none** (1× `aria-hidden`) |
| `menu/` | `role: 'menu' / 'menuitem' / 'menuitemcheckbox' / 'menuitemradio' / 'group'`, `aria-labelledby` ×4, `aria-haspopup: 'menu'` ×4, `aria-expanded` ×3, `aria-controls` ×2, `aria-checked` ×2, `aria-owns`, `aria-orientation`, `aria-disabled` |
| `context-menu/` | **none** (see §2 — everything is `menu/`'s) |
| `menubar/` | `role: 'menubar'`, `aria-orientation`. That is all of it. |

So:

- **Popover** is named by its own `Title`, or not at all. Its trigger gets `aria-haspopup="dialog"`.
- **Preview Card / Hover Card** is named by nothing, in both systems. Radix's `hover-card.tsx` (436 lines) returns **zero matches** for `aria-` or `role=`; its trigger is a bare `Primitive.a`. The docs Highlights bullet is "Ignored by screen readers." The link text is the only accessible surface.
- **Tooltip** diverges between the two lineages, and this is the single most important fact in this section for Ultima. **Radix** puts `aria-describedby` on the trigger while open and `role="tooltip"` on the content, with a `VisuallyHidden` copy when `aria-label` is passed. **Base UI emits neither.** Its guideline moves the whole burden to the consumer:

  > **Provide an accessible name for the trigger**: Tooltips are visual-only elements and are not a replacement for labeling the trigger. The tooltip's trigger must have an `aria-label` attribute that closely matches the tooltip's content to ensure consistency for screen reader users.

  Its canonical demo does exactly that: `<Tooltip.Trigger aria-label="Bold"><BoldIcon aria-hidden="true" /></Tooltip.Trigger>`, with the string `Bold` duplicated as the popup's text.

At the spec level there is no third role to reach for. WAI-ARIA 1.2 defines `role="tooltip"` as "A UI component that provides additional information about another element when that element receives keyboard focus or the mouse hovers over it" (superclasses `section → structure → roletype`), does **not** normatively prescribe `aria-describedby`, and defines **no role at all** for a hover card, preview card, or popover.

### Hover-only disclosure: keyboard and touch

Every system opens the hover overlays on focus and refuses to open them on touch, and then says in prose that this is not enough.

| Component | Opens on keyboard focus? | Opens on touch? | Mechanism |
| --- | --- | --- | --- |
| Base UI `Tooltip.Trigger` | Yes — `useFocus(floatingRootContext, { enabled: !disabled })` | No — `useHoverReferenceInteraction(..., { mouseOnly: true })` | `tooltip/trigger/TooltipTrigger.mjs:140–164` |
| Base UI `PreviewCard.Trigger` | Yes — `useFocus(..., { delay })` | No — `{ mouseOnly: true, move: false, handleClose: safePolygon() }` | `preview-card/trigger/PreviewCardTrigger.mjs` |
| Base UI `Popover.Trigger` w/ `openOnHover` | n/a (it is a `<button>`; `useClick` handles focus+activate) | Hover is `mouseOnly: true`, but **tap activates the button** | `popover/trigger/PopoverTrigger.mjs:67–69` |
| Radix `HoverCard.Trigger` | Yes — `onFocus={context.onOpen}` / `onBlur` | No — `excludeTouch()` wrapper + `onTouchStart` `preventDefault()` | `hover-card.tsx:138–145, 392` |
| Radix `Tooltip.Trigger` | Yes | No — `if (event.pointerType === 'touch') return;` in `onPointerMove` | `tooltip.tsx:301, 321–324` |

The prose is blunter than the code. Base UI's tooltip docs:

> Tooltips don't work well with touch input. Unlike mouse pointers with hover capability, there's no easily discoverable way to reveal a tooltip before tapping its trigger on a touch device. … For this reason, tooltips are disabled on touch devices.

Base UI's preview-card docs:

> preview card content is not touch, keyboard or screen reader navigable. It acts as a visual progressive enhancement for sighted mouse and keyboard users only.

Radix's hover-card Accessibility section, in full:

> The hover card is intended for sighted users only, the content will be inaccessible to keyboard users.

Note the contradiction worth recording: both hover cards *do* open on focus, and both sets of docs say keyboard users cannot use them. Both are true — the trigger responds to focus, but the popup carries no ARIA relation, is not in the tab order, and is never announced. Opening on focus buys the sighted keyboard user a look and buys the screen-reader user nothing.

Radix's tooltip docs contain **no** warning against interactive content. The constraint is structural instead: Space, Enter, and Escape all close the tooltip, so interactive content is unusable, but the docs never say so. The nearest note is on `disableHoverableContent`: "Disabling this has accessibility consequences."

### Radix Themes is the one collapse

`Tooltip` in Radix Themes is not a namespace. `src/components/index.tsx` exports `export { Tooltip, type TooltipProps } from './tooltip.js'` — one component, 64 lines, `interface TooltipProps { content: React.ReactNode; ... }` with `content` **non-optional**. It hardcodes `<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>`, wraps `content` in `<Text as="p" size="1">`, and always renders an Arrow. The docs page has no Anatomy section and one props table: `content*`, `width`, `minWidth`, `maxWidth` (default `"360px"`).

Themes' Popover (103 lines: `Root Trigger Content Close Anchor`) and HoverCard (76 lines: `Root Trigger Content`) stay compound. **Tooltip is the only one of the three that any system collapses**, and the reason is visible in the shape: a tooltip's whole content is one string, so a `content` prop loses nothing. A popover's is arbitrary, so it cannot.

---

## 2. Context Menu against Dropdown Menu

Every system builds both on one menu primitive. They differ only in how much of the second file is new.

### Base UI: the second component is a Root and a Trigger, and nothing else

`context-menu/index.parts.d.ts` re-exports 16 of its 19 parts straight out of `../menu/`, aliases `Positioner`, and takes `Separator` from the generic `../separator/`. `context-menu/positioner/ContextMenuPositioner.mjs` is nine lines, and eight of them are a doc comment:

```js
import { MenuPositioner } from "../../menu/positioner/MenuPositioner.mjs";
export const ContextMenuPositioner = MenuPositioner;
```

Verified at runtime, not just from the typings:

```
ContextMenu parts: 19
IDENTICAL (same fn ref as Menu): 17 -> Arrow, Backdrop, CheckboxItem, CheckboxItemIndicator,
  Group, GroupLabel, Item, LinkItem, Popup, Portal, Positioner, RadioGroup, RadioItem,
  RadioItemIndicator, Separator, SubmenuRoot, SubmenuTrigger
OWN: 2 -> Root, Trigger
Menu-only: Handle, Viewport, createHandle
```

(`Positioner` counts as identical at runtime because the alias resolves to the same function; by file it is ContextMenu's own module, so the honest count is **18 of 19 parts are `menu/`'s components**.)

Quantified:

| | Lines of shipped `.mjs` |
| --- | --- |
| `menu/` (all non-index modules) | **2,877** |
| `context-menu/root/ContextMenuRoot.mjs` | 52 |
| `context-menu/trigger/ContextMenuTrigger.mjs` | 184 |
| `context-menu/` everything else (context, alias, data-attr consts) | 30 |
| **`context-menu/` total** | **266**, of which ~236 is genuinely new behaviour |

The `context-menu/` package emits **zero** `aria-*` and zero `role:` of its own. Every styled part, and the entire accessibility contract, is `menu/`'s.

Base UI's own canonical demo makes the composition explicit. In `docs/react/components/context-menu.md` → **Using with Menu**, one file renders both, with **one** `popupClass` and **one** `itemClass` shared between them:

```tsx
function SharedMenuItems({ type = 'menu' }: { type?: 'menu' | 'context-menu' }) {
  const Item = type === 'context-menu' ? ContextMenu.Item : Menu.Item;
  const Separator = type === 'context-menu' ? ContextMenu.Separator : Menu.Separator;
  ...
}
```

That ternary is a no-op at runtime — `ContextMenu.Item === Menu.Item`. Base UI's own demo is telling you the second namespace exists for readability, and that the styles are one set.

Base UI also publishes a usage rule that shapes the composition, not just the styling:

> **Use context menus as an enhancement**: Don't make a context menu the only way to perform actions. … Always provide visible controls for the actions that are available in the context menu.

### Radix Primitives: two thin trigger adapters over one 1,439-line package

Both `context-menu.tsx` (593 lines) and `dropdown-menu.tsx` (531 lines) open with the same two imports:

```ts
import * as MenuPrimitive from '@radix-ui/react-menu';
import { createMenuScope } from '@radix-ui/react-menu';
```

`MenuPrimitive.` appears 43 times in the first and 44 in the second. `@radix-ui/react-menu` is declared in both packages' `dependencies`, is published to npm, and has **no docs page** — it is an implementation package. It carries the 18 heavy deps (popper, portal, presence, dismissable-layer, focus-scope, focus-guards, roving-focus, collection, aria-hidden, remove-scroll) that the two wrappers do not. The division is clean: the wrappers own trigger semantics only (right-click + long-press with `WebkitTouchCallout: 'none'` and `whenTouchOrPen`, versus a button), and 1,439 lines of positioning, typeahead, roving focus, submenus, dismissal, and scroll lock live once.

The documented distinction is the trigger and nothing else. Themes makes it literal by giving both the identical stem: "Menu representing a set of actions, displayed at the point of right click or long press" / "…, triggered by a button."

### Radix Themes: imports the CSS, duplicates the React

This is the measured case, and the numbers are the answer to the ticket's sharpest question.

| File | Lines |
| --- | --- |
| `src/components/_internal/base-menu.css` | **245** |
| `src/components/_internal/base-menu.props.ts` | 55 |
| `src/components/context-menu.css` | **6** |
| `src/components/dropdown-menu.css` | **6** |
| `src/components/context-menu.tsx` | **404** |
| `src/components/dropdown-menu.tsx` | **407** |

`context-menu.css`, in its entirety:

```css
@import './_internal/base-menu.css';

.rt-ContextMenuContent {
  max-height: var(--radix-context-menu-content-available-height);
  transform-origin: var(--radix-context-menu-content-transform-origin);
}
```

`dropdown-menu.css` is byte-for-byte the same but for the two custom-property names. **Essentially 100% of the menu styling is shared**, and the two declarations that are not exist only because the underlying primitive namespaces its CSS variables per component. `base-menu.css` styles **13** `.rt-BaseMenu*` selectors: `Arrow CheckboxItem Content Item ItemIndicator ItemIndicatorIcon Label RadioItem Separator Shortcut SubTrigger SubTriggerIcon Viewport`. The prop-def files are pure re-export shims over `base-menu.props.ts`.

`_internal/` contains `base-button.css`, `base-button.props.ts`, **and** `base-button.tsx`. For menus it contains `base-menu.css` and `base-menu.props.ts` and **no `base-menu.tsx`**. The React was not factored out.

Measured duplication, normalizing `ContextMenu`/`DropdownMenu` → `XMenu` in both and diffing: **25 lines unique to context-menu, 28 unique to dropdown-menu, out of 404 / 407** — about **94% of each file is the other file**. Both define the same 13 components and emit the same `rt-BaseMenu*` tokens on the same elements. Everything substantive fits in five places:

1. Content positioning: `alignOffset={-Number(size) * 4}` versus `align="start" sideOffset={4}`.
2. `<Slot.Slottable>{children}</Slot.Slottable>` in context-menu's RadioItem and CheckboxItem; plain `{children}` in dropdown-menu's.
3. `ComponentPropsWithout<..., RemovedProps>` versus raw `React.ComponentPropsWithoutRef` for `SubProps`.
4. DropdownMenu additionally exports `ChevronDownIcon as TriggerIcon` and `IconProps as TriggerIconProps`.
5. Two stale class names, below.

**The duplication has already produced two live bugs**, both in `dropdown-menu.tsx`:

- Line 260: `<ThickCheckIcon className="rt-BaseMenuItemIndicatorIcon rt-ContextMenuItemIndicatorIcon" />` — the DropdownMenu's CheckboxItem emits a **`rt-ContextMenu…`** class. Its own RadioItem at the parallel position is correct.
- Line 301: `rt-DropdownMenuSubtriggerIcon` — lowercase `t`, against `rt-ContextMenuSubTriggerIcon` at `context-menu.tsx:300` and `.rt-BaseMenuSubTriggerIcon` in the stylesheet.

Neither breaks rendering, because the `rt-BaseMenu*` class does all the work and the per-component classes are unstyled hooks. That is exactly the point: the shared layer absorbed the drift, and the duplicated layer accumulated it silently.

### shadcn/ui: full duplication, in both backends, with no declared dependency

Read the files; the docs do not say. In every shadcn backend, `context-menu.tsx` and `dropdown-menu.tsx` import **only** the primitive, `cn`, and icons. Neither imports the other. Neither registry item declares a `registryDependencies` — confirmed against the published JSON (`dependencies: ['cn', 'radix-ui']`, `files: [one file]`, and no `registryDependencies` key at all).

**Radix backend** (`registry/new-york-v4/ui/`): 251 and 256 lines, 15 exported functions each, 9 `cn(` styled parts each. Normalizing the component prefix and diffing order-insensitively leaves **13 differing lines**, of which only three are substantive and all three are drift:

| | context-menu | dropdown-menu |
| --- | --- | --- |
| Content | no `sideOffset` | `sideOffset = 4` (a context menu has no trigger rect) |
| SubTrigger | `flex cursor-default items-center rounded-sm …` | same plus `gap-2`; chevron `ml-auto size-4` vs bare `ml-auto` |
| Label | `… font-medium text-foreground …` | `… font-medium …` (no `text-foreground`) |

Everything else — `Content`, `Item`, `CheckboxItem`, `RadioItem`, `Separator`, `Shortcut`, `SubContent` — is character-identical after renaming, including the ~30-token Tailwind strings.

**Base UI backend** (`registry/bases/base/ui/`): 285 lines each, 267 non-blank each, with **12** `cn-context-menu-*` class hooks against **11** `cn-dropdown-menu-*`. Same story:

| | context-menu | dropdown-menu |
| --- | --- | --- |
| Positioner | hardcodes `side="right"`, `alignOffset = 4` | exposes `side`/`align`/`sideOffset`/`alignOffset` with defaults |
| Content | — | adds `w-(--anchor-width)` and `data-closed:overflow-hidden` |
| Trigger | styled (`cn-context-menu-trigger select-none`) | unstyled pass-through |
| SubTrigger | — | adds `data-popup-open:bg-accent data-popup-open:text-accent-foreground` (drift) |
| SubContent hook | `cn-context-menu-subcontent` | `cn-dropdown-menu-sub-content` (drift — different word split) |
| Indicators | no `data-slot` | `data-slot="…-checkbox-item-indicator"` / `…-radio-item-indicator` (drift) |

Note that shadcn's Base UI context-menu still reaches every part through `ContextMenuPrimitive.*` rather than `MenuPrimitive.*`, so its 267 lines wrap the exact same components as dropdown-menu's 267 lines. Two files, one set of components underneath.

One genuinely shared thing does exist in the Base UI backend, and it lives in the class namespace, not in TSX: the tokens **`cn-menu-target`** and **`cn-menu-translucent`** appear in `context-menu.tsx`, `dropdown-menu.tsx`, and `menubar.tsx` alike. They are not defined in `shadcn@4.21.0`'s `dist/tailwind.css`; they are the surface a theme hooks. That is Radix Themes' `base-menu.css` idea in miniature, and it is the one form of sharing a `className`-merging system gets for free.

---

## 3. Menubar

### It ships as its own component, and the surface is the disagreement

| System | Ships it? | Parts | Declares a dependency on its own menu, or restates it? |
| --- | --- | --- | --- |
| Base UI 1.8.0 | Yes | **1** | **Declares.** Anatomy imports two subpaths and nests `Menu.Root` |
| Radix Primitives | Yes | **17** | **Declares** `@radix-ui/react-menu` in `dependencies`, then restates the whole namespace as `Menubar.*` |
| Radix Themes | **No** | — | — |
| shadcn `radix` | Yes | 16 functions, 275 lines | **Restates.** Imports only `radix-ui`; no `registryDependencies` |
| shadcn `base` | Yes | 281 lines | **Declares and imports.** `registryDependencies: ["dropdown-menu"]` |
| shadcn `aria` | **No** | — | — |

### Base UI's Menubar is one part

The whole package is 134 lines of shipped JS across three modules, and `index.d.ts` is two lines:

```ts
export { Menubar } from "./Menubar.js";
export type * from "./Menubar.js";
```

It renders a `CompositeRoot` inside a `FloatingTree`, with exactly this ARIA:

```js
props: [{ role: 'menubar', id, 'aria-orientation': orientation }, elementProps]
```

Its whole API is four props — `modal` (default `true`), `disabled`, `orientation` (default `'horizontal'`), `loopFocus` (default `true`) — plus three state fields (`orientation`, `modal`, `hasSubmenuOpen`). It has **no** Trigger, Content, Item, or any other part. The documented anatomy is the dependency declaration:

```jsx
import { Menubar } from '@base-ui/react/menubar';
import { Menu } from '@base-ui/react/menu';

<Menubar>
  <Menu.Root>
    <Menu.Trigger />
    <Menu.Portal>
      …
```

The docs page is **673 lines**, against `menu.md`'s 5,378 and `context-menu.md`'s 2,053, and its API Reference section has exactly one entry. That page length *is* the finding: Base UI's Menubar has nothing to document because it restates nothing.

`Menubar.mjs` adds one behaviour beyond the container: a `FloatingTree` listener on `menuopenchange` that flips `hasSubmenuOpen`, which in turn switches `highlightItemOnHover` on so the bar behaves like a desktop menubar once one menu is open.

### Radix's Menubar restates the namespace

17 parts: `Root Menu Trigger Portal Content Label Item Group CheckboxItem ItemIndicator RadioGroup RadioItem Sub SubTrigger SubContent Separator Arrow`. `menubar.tsx` is **719 lines**, larger than either menu wrapper, and `MenuPrimitive.` appears 43 times in it. Its `package.json` declares `@radix-ui/react-menu` plus `react-roving-focus` and `react-collection` — the two extras that move arrow keys *between* top-level triggers. `Menubar.Menu` is the one part with no analogue in Context Menu or Dropdown Menu, because a menubar hosts N menus and the other two host one.

Radix Themes ships no Menubar at all: no file matching `menubar` in `packages/radix-ui-themes/src/components` (165 entries), no export in the 69-line barrel, and `data/themes/docs/components/menubar.mdx` 404s while the Primitives equivalent returns 1,748 lines. The desktop-app pattern is the one their opinionated styling layer declined to theme.

### shadcn disagrees with itself, and the Base UI backend is the one that declares

`registry/new-york-v4/ui/menubar.tsx` (Radix, 275 lines) imports nothing but `radix-ui`, `cn`, and icons, and its registry JSON has no `registryDependencies`. Normalizing its prefix and diffing against `dropdown-menu.tsx` shows it restates `Item`, `CheckboxItem`, `RadioItem`, `Label`, `Separator`, `Shortcut`, `Sub`, `SubTrigger`, `SubContent`, `Group`, `Portal`, `RadioGroup` in full, adds `Menubar` (`flex h-9 items-center gap-1 rounded-md border bg-background p-1 shadow-xs`), `MenubarTrigger`, and `MenubarMenu`, and has **already drifted**: its Item uses `rounded-xs` where dropdown-menu's uses `rounded-sm`; its Content lacks `max-h-(--radix-…-available-height)`, `overflow-y-auto`, and `data-[state=closed]:animate-out`; its SubTrigger lacks dropdown's `[&_svg]:*` rules; its `sideOffset` default is 8 rather than 4.

`registry/bases/base/ui/menubar.tsx` (Base UI, 281 lines) does the opposite:

```tsx
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
```

Twelve names, each re-wrapped as `Menubar*`. And `ui/_registry.ts:538` declares it:

```ts
name: "menubar",
type: "registry:ui",
registryDependencies: ["dropdown-menu"],
```

This is the **only** cross-component `registryDependencies` among the six overlays in that registry — `context-menu`, `dropdown-menu`, `popover`, `hover-card`, and `tooltip` all have none.

But the sharing stops at the components. `menubar.tsx` still declares a parallel 13-name class namespace — `cn-menubar cn-menubar-trigger cn-menubar-content cn-menubar-content-logical cn-menubar-item cn-menubar-checkbox-item cn-menubar-checkbox-item-indicator cn-menubar-radio-item cn-menubar-radio-item-indicator cn-menubar-label cn-menubar-separator cn-menubar-shortcut cn-menubar-sub-content cn-menubar-sub-trigger` — applied on top of the imported component via `cn("cn-menubar-item", className)`. The component is imported; the styling is restated.

---

## Where the systems disagree

1. **Is hover a component or a prop?** Base UI says a prop (`Popover.Trigger openOnHover`) and reserves its hover *component* for link previews. Radix and shadcn say a component (`HoverCard`) with no such narrowing. Both ship both, so the disagreement is about which one the docs point you at.
2. **Does the tooltip primitive carry its own ARIA?** Radix: yes, `aria-describedby` + `role="tooltip"`. Base UI: **no**, zero ARIA in the package, with a documented requirement that the consumer `aria-label` the trigger. Anything built on Base UI inherits the second answer.
3. **Does a popover get a title?** Radix stable: no such part. Radix `main`: optional part, refcounted. Base UI: optional part, wired to `aria-labelledby`, no warning. shadcn/radix: a part that looks like a title and does nothing. Nobody requires one.
4. **Compound or `content` prop?** Radix Themes collapses Tooltip alone. Everyone else keeps all three compound. shadcn collapses `Portal + Positioner + Popup` into one `*Content` in all three of Popover, HoverCard, and Tooltip, and hoists `side`/`align`/`sideOffset`/`alignOffset` onto it — the same collapse, applied uniformly, at a different seam.
5. **Where does menu sharing stop?** Base UI at the component (18/19 parts are the same function). Radix Primitives at the package (`@radix-ui/react-menu`). Radix Themes at the stylesheet (`base-menu.css`, React duplicated). shadcn: nowhere, except `base`/menubar.
6. **Is Menubar one part or seventeen?** Base UI: one. Radix: seventeen. That is a factor-of-17 disagreement about the same W3C pattern.
7. **Does Menubar ship at all?** Radix Themes and shadcn/aria say no. Everyone else says yes.

## What is load-bearing for a system with no `className`

Recorded as precedent, not as a recommendation for Ultima's contract.

- **Every precedent that actually shares menu code shares it as a component, never as a class string.** The one class-layer share that works — Radix Themes' `base-menu.css` with its 13 `.rt-BaseMenu*` selectors imported by two 6-line stylesheets — works because `.rt-BaseMenuItem` is a plain global class that a consumer's `className` concatenates onto. StyleX has no equivalent: `stylex.props` returns a single class string and a foreign one does not merge. Radix Themes' answer is the one answer on this list that a StyleX system cannot copy.
- **The composite that the constraint actually has to reckon with is shadcn/base's Menubar**, because it is the only precedent that imports a sibling component and then adds its own styles on top: `<DropdownMenuItem className={cn("cn-menubar-item", className)} />`. Under `docs/spec/ultima.md` → Styled parts, that shape is precisely the collision the wrapper-trigger rule already forbids — one element painted from two Ultima tables. The precedent exists, and it is the one that does not port.
- **Base UI's Context Menu is the strongest available precedent for a no-`className` system**, because `ContextMenu.Popup === Menu.Popup` at runtime. One `stylex.create` table applied at both namespaces is one table on one component, with nothing to merge. This is the only sharing mechanism on the list that survives the constraint unchanged, and Base UI's own demo uses it (one `popupClass`, one `itemClass`, across a Menu and a ContextMenu in the same file).
- **Base UI's Menubar is the same mechanism at a larger scale**: it wraps nothing, adds `role="menubar"` and `aria-orientation` to a container, and leaves the menus inside it to be the system's own Menu. A Menubar built that way has exactly one styled part and no collision surface, which is why Base UI's docs page for it is 673 lines and Radix's is 1,748.
- **shadcn's duplicate-the-file answer is what all its Radix-backed menu items do**, and it is the same answer Ultima's Pagination reached for a different reason. Its cost is measurable here rather than hypothetical: three drifted Tailwind strings between shadcn's own context-menu and dropdown-menu, four more between shadcn/base's, four between shadcn/radix's menubar and dropdown-menu, and two stale class names shipped in Radix Themes' `dropdown-menu.tsx`. All of it invisible in a screenshot.
- **Tooltip's accessible name cannot come from the primitive under Base UI, and cannot come from a class.** `tooltip/` emits no `role="tooltip"` and no `aria-describedby`; the documented fix is `aria-label` on the trigger; and the trigger is a wrapper trigger under Styled parts, so it ships no styles and holds the consumer's element. Whatever Ultima decides, the name has to reach an element Ultima does not paint.

---

## Sources

### Base UI 1.8.0 — installed package

Paths are relative to `node_modules/.pnpm/@base-ui+react@1.8.0_…/node_modules/@base-ui/react/`.

- `context-menu/index.parts.d.ts`, `context-menu/index.d.ts`: 16 of 19 parts re-exported from `../menu/`, `Separator` from `../separator/`; every type alias points at a `Menu*Props`.
- `context-menu/positioner/ContextMenuPositioner.mjs`: nine lines; `export const ContextMenuPositioner = MenuPositioner`.
- Line counts, `find … -name '*.mjs' ! -name 'index*' | xargs wc -l`: `menu/` 2,877; `context-menu/` 266 (`ContextMenuRoot.mjs` 52, `ContextMenuTrigger.mjs` 184); `menubar/` 134 (`Menubar.mjs` 110).
- Runtime namespace comparison (`node`, from `packages/ui`): 17 of ContextMenu's 19 parts are the identical function reference to Menu's; `Popover`/`PreviewCard` share none.
- ARIA census, `grep -rhno "aria-[a-z]*\|role: *'[a-z]*'" <pkg> --include=*.mjs`: `tooltip/` → one `aria-hidden`, nothing else; `preview-card/` → one `aria-hidden`, one `role: 'presentation'`; `context-menu/` → nothing; `menubar/` → `role: 'menubar'` + `aria-orientation`; `popover/` and `menu/` as tabulated above.
- `popover/popup/PopoverPopup.mjs`: `role: 'dialog'`, `'aria-labelledby': titleId`, `'aria-describedby': descriptionId`.
- `popover/title/PopoverTitle.mjs`: renders `<h2>`, registers `titleElementId`. No warning anywhere in `popover/`.
- `popover/trigger/PopoverTrigger.mjs:67–69, 117`: `openOnHover` hover is `mouseOnly: true`; trigger is `aria-haspopup: 'dialog'`.
- `menu/trigger/MenuTrigger.mjs:183`, `menu/root/MenuRoot.mjs:400,406`: `aria-haspopup: 'menu'`.
- `tooltip/trigger/TooltipTrigger.mjs:140–164`: `useHoverReferenceInteraction({ mouseOnly: true })` + `useFocus`.
- `preview-card/trigger/PreviewCardTrigger.mjs`: renders `<a>`; `{ mouseOnly: true, move: false, handleClose: safePolygon() }` + `useFocus`.
- `menubar/Menubar.d.ts`, `menubar/Menubar.mjs`: one exported component; props `modal`/`disabled`/`orientation`/`loopFocus`; `role: 'menubar'` + `aria-orientation`; `FloatingTree` + `menuopenchange` → `hasSubmenuOpen`.
- `utils/popups/index.mjs:433`: `FOCUSABLE_POPUP_PROPS = { tabIndex: -1, [FOCUSABLE_ATTRIBUTE]: '' }`.

### Base UI — the docs Markdown the package ships

`docs/react/components/*.md`, same package root. These are Base UI's published docs, shipped verbatim and marked authoritative in their own header.

- `tooltip.md` frontmatter; **Usage guidelines**; **Alternatives to tooltips → Infotips** (the popover-versus-tooltip trigger-purpose test, and the `openOnHover` recommendation); **Description text**; the "tooltips are disabled on touch devices" paragraph; the canonical demo's `aria-label="Bold"` trigger.
- `preview-card.md` frontmatter ("A link that shows a destination preview without interrupting keyboard or screen reader navigation"); **Usage guidelines** ("not touch, keyboard or screen reader navigable … sighted mouse and keyboard users only"); Anatomy (8 parts, no Title).
- `popover.md` frontmatter; Anatomy (Title/Description/Close inside Viewport); **Opening on hover**; API reference for `Trigger` (`openOnHover` default `false`, `delay` 300, `closeDelay` 0), `Title` ("A heading that labels the popover. Renders an `<h2>`"), `Description`, `Popup`; the canonical demo mounting Title + Description.
- `context-menu.md` frontmatter; **Usage guidelines** (context menus as an enhancement); Anatomy; **Examples → Using with Menu** and its `SharedMenuItems` helper with one `popupClass` and one `itemClass`.
- `menubar.md` (673 lines total): Anatomy importing `@base-ui/react/menubar` + `@base-ui/react/menu` and nesting `Menu.Root`; API Reference with one entry.
- `menu.md` (5,378 lines) for the length comparison.

### shadcn/ui — registry source and registry JSON

- `https://ui.shadcn.com/r/styles/new-york-v4/{context-menu,dropdown-menu,menubar,popover,hover-card,tooltip}.json`: each is `dependencies: ['cn','radix-ui']`, one file, and **no `registryDependencies`**. Tooltip's `docs` field carries the "wrap your app with `TooltipProvider`" note.
- `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/*.tsx`: line counts 251 (context-menu), 256 (dropdown-menu), 275 (menubar), 88 (popover), 43 (hover-card), 56 (tooltip). Every file imports only `react`, `cn`, `lucide-react`, and `radix-ui`; none imports another registry item. Normalized diffs as reported above.
- `apps/v4/registry/new-york-v4/ui/popover.tsx`: `PopoverTitle` typed `React.ComponentProps<"h2">` but rendering a `<div>` with no `id`; `PopoverHeader`, `PopoverDescription` likewise unwired.
- `https://api.github.com/repos/shadcn-ui/ui/contents/apps/v4/content/docs/components` and `/apps/v4/registry/bases`: three backends, `aria`, `base`, `radix`. `aria` has no `menubar.mdx` and no `navigation-menu.mdx`; the other two have both.
- `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/ui/*.tsx`: 285 (context-menu), 285 (dropdown-menu), 281 (menubar), 89 (popover), 50 (hover-card), 65 (tooltip). `hover-card.tsx` wraps `PreviewCard`. `popover.tsx` wraps the real `Popover.Title`/`Popover.Description`. `menubar.tsx` imports 12 names from `./dropdown-menu`.
- `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/ui/_registry.ts`: line 538, `menubar` → `registryDependencies: ["dropdown-menu"]`; `context-menu` (315), `dropdown-menu` (371), `hover-card` (428), `popover` (591), `tooltip` (961) all have none.
- `shadcn@4.21.0` npm tarball, `dist/tailwind.css` (629 lines): contains no `.cn-context-menu*`, `.cn-dropdown-menu*`, `.cn-menubar*`, `.cn-popover*`, `.cn-tooltip*`, `.cn-hover-card*`, `cn-menu-target`, or `cn-menu-translucent` definitions. Those tokens are theme hooks, not shipped styles.

### Radix Primitives

- `https://www.radix-ui.com/primitives/docs/components/{popover,hover-card,tooltip,context-menu,dropdown-menu,menubar}`: the one-line descriptions quoted above; Popover's 7-part anatomy and Dialog-pattern-only Accessibility section; HoverCard's "intended for sighted users only, the content will be inaccessible to keyboard users" and "Ignored by screen readers"; Tooltip's `aria-label` prop note and `disableHoverableContent` caveat; Menubar's 17 parts.
- `https://unpkg.com/@radix-ui/react-popover@1.1.23/dist/index.d.ts`: no `Title`, no `Description` in the released package.
- `https://raw.githubusercontent.com/radix-ui/primitives/main/packages/react/popover/src/popover.tsx` (662 lines): `PopoverTitle` at 533, `PopoverDescription` at 555, exported at 647–648; Content's conditional `aria-labelledby`/`aria-describedby` at 493–498; refcounts at 81–82; trigger ARIA at 162–164.
- `https://raw.githubusercontent.com/radix-ui/primitives/main/packages/react/hover-card/src/hover-card.tsx` (436 lines): zero matches for `aria-` or `role=`; `onFocus`/`onBlur` at 138–145; `excludeTouch` at 392.
- `.../tooltip/src/tooltip.tsx`: trigger `aria-describedby` at 292; `role="tooltip"` + `VisuallyHidden` `aria-label` path at 567–592; touch exclusion at 301.
- `.../menu/src/menu.tsx` 1,439 lines; `.../context-menu/src/context-menu.tsx` 593; `.../dropdown-menu/src/dropdown-menu.tsx` 531; `.../menubar/src/menubar.tsx` 719. All three wrappers import `* as MenuPrimitive from '@radix-ui/react-menu'` and `createMenuScope`.
- `package.json` for `@radix-ui/react-context-menu@2.3.7`, `@radix-ui/react-dropdown-menu@2.1.24`, `@radix-ui/react-menubar@1.1.24`: all declare `@radix-ui/react-menu`; menubar adds `react-roving-focus` and `react-collection`.

### Radix Themes

- `https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/index.tsx` (69 lines): exports `ContextMenu` (16), `DropdownMenu` (19), `Popover`, `HoverCard`, and `Tooltip` as a bare component; `grep -ci menubar` → 0.
- `.../components/context-menu.css` and `dropdown-menu.css` (6 lines each): `@import './_internal/base-menu.css'` plus two custom-property declarations, identical but for the variable names.
- `.../components/_internal/base-menu.css` (245 lines): 13 distinct `.rt-BaseMenu*` selectors.
- `.../components/_internal/base-menu.props.ts` (55 lines); `context-menu.props.tsx` / `dropdown-menu.props.tsx` (6 lines each, pure re-export shims).
- `.../components/context-menu.tsx` (404) and `dropdown-menu.tsx` (407): normalized diff → 25 lines unique to the first, 28 to the second (~94% identical). `dropdown-menu.tsx:260` emits `rt-ContextMenuItemIndicatorIcon`; `:301` emits `rt-DropdownMenuSubtriggerIcon` against `.rt-BaseMenuSubTriggerIcon`. No `_internal/base-menu.tsx` exists, though `_internal/base-button.tsx` does.
- `.../components/tooltip.tsx` (64 lines): `interface TooltipProps { content: React.ReactNode; … }`, `content` non-optional; hardcoded `asChild` trigger; always renders an Arrow.
- `https://www.radix-ui.com/themes/docs/components/{popover,hover-card,tooltip,context-menu,dropdown-menu}`: the Themes descriptions quoted above; Tooltip's single props table (`content*`, `width`, `minWidth`, `maxWidth` default `"360px"`). `data/themes/docs/components/menubar.mdx` → 404.

### Spec

- `https://www.w3.org/TR/wai-aria-1.2/#tooltip`: "A UI component that provides additional information about another element when that element receives keyboard focus or the mouse hovers over it"; superclasses `section → structure → roletype`; `aria-describedby` is supported but not normatively prescribed; **no role is defined for a hover card, preview card, or popover**.
- `https://www.w3.org/WAI/ARIA/apg/patterns/menu/` and `/menu-button/`: the patterns Radix cites in the `aria:` frontmatter for Context Menu (menu), Dropdown Menu (menu-button), and Menubar (menu).

### Ultima's own spec, for the constraint this was measured against

- `docs/spec/ultima.md` → **Styled parts**: "`stylex.props` does not merge foreign class strings, so an Ultima style on the wrapper and an Ultima style on the Button rendered into it collide instead of cascading"; the wrapper-trigger rule; the second clause for CSS a primitive depends on.
- `docs/spec/ultima.md` → the Pagination entry: "`pagination.tsx` writes its own tables and declares no Ultima component dependency, which is the restating rule under The registry item."
