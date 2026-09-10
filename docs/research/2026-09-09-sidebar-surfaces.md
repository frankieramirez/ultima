# How do comparable systems shape a sidebar's public surface, its state, and its active-page indication?

## Findings

**Every system that ships one splits the sidebar into a state holder and a panel, and none of them puts `aria-current` on a nav link for you.** shadcn/ui ships the largest surface by a wide margin: 23 exported components plus a `useSidebar` hook, one file, a `SidebarProvider` that throws if any part reads its context outside it, two independent open states (desktop `open`, mobile `openMobile`), an unconditional `sidebar_state` cookie write, an unconditional `window` keydown listener on Cmd/Ctrl+B, and a mobile branch that swaps the whole subtree into a `Sheet` (a Base UI `Dialog`) at 768px. Active-page indication is an `isActive` boolean that produces only `data-active` — no `aria-current`, no `<nav>`, no landmark name, neither in the component nor in shadcn's own docs site that consumes it.

Two findings matter more than the survey itself.

**Base UI already ships the convention, on `NavigationMenu.Link`.** One `active?: boolean` prop sets `aria-current="page"` when true and, through Base UI's standard state-to-`data-*` mapping, `data-active=""` for styling. That is the both-attributes pattern, from the primitive library Ultima is built on, with a prop name (`active`, not `isActive`) Ultima can adopt without inventing anything. Base UI also ships `Collapsible` (`Root`/`Trigger`/`Panel`, with `aria-expanded` and `aria-controls` wired) and a full `Drawer`, either of which removes a part from whatever surface Sidebar ends up with.

**Primer's `NavList` inverts shadcn's input.** It takes `aria-current` as the public prop and *derives* the styling flag from it (`active={Boolean(ariaCurrent) && ariaCurrent !== 'false'}`), rather than taking a boolean and deriving nothing. It is also the only surveyed system that renders a named `<nav>` landmark, and the only one that auto-expands the group containing the current page — including a DOM fallback that reads `[aria-current]` off router links that set it themselves.

Versions read: shadcn/ui HEAD `3ba91b1` (2026-09-08), across its three parallel bases (`bases/base` on Base UI, `bases/radix` on Radix, `bases/aria` on React Aria) plus the legacy `new-york-v4` copy; `@base-ui/react` 1.8.0; Primer React HEAD `1ab47e6` (2026-09-09); Carbon `12277c6`, `@carbon/react` 1.116.0; Mantine `61049ec`, `@mantine/core` 9.6.1; Ant Design `bdbbdd5`, `antd` 6.6.3 with `@rc-component/menu` 1.6.0.

### 1. shadcn/ui Sidebar: the full part list

One file, `registry/bases/<base>/ui/sidebar.tsx`, ~730 lines, 23 exported components plus `useSidebar`. shadcn maintains three parallel copies of it — `bases/base` (Base UI), `bases/radix` (Radix), `bases/aria` (React Aria Components) — plus the legacy `new-york-v4` copy. The provider is byte-identical across all three; only the composition mechanism differs (see §5).

Frequency across the 173 `.tsx` files under `registry/bases/base/blocks/` that import the sidebar, which is the best available proxy for what a consumer actually composes:

| Part | Element | Blocks | Role |
| --- | --- | --- | --- |
| `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` | `<ul>` / `<li>` / `<button>` or rendered element | 51 each | The core three. Every nav list is these. |
| `SidebarGroup` | `<div>` | 36 | Section wrapper |
| `SidebarGroupContent` | `<div>` | 23 | Inner wrapper of a group |
| `Sidebar` / `SidebarContent` | `<div>` | 20 each | The panel and its scroll region |
| `SidebarProvider` | `<div>` + context | 18 | Required root |
| `SidebarGroupLabel` | `<div>` | 18 | Section heading (a `<div>`, not a heading element) |
| `useSidebar` | hook | 17 | Read state in a consumer's own part |
| `SidebarInset` | `<main>` | 16 | Content column beside the sidebar |
| `SidebarTrigger` / `SidebarHeader` | `<button>` / `<div>` | 15 each | Toggle, and the sticky top region |
| `SidebarRail` | `<button tabIndex={-1}>` | 12 | Pointer-only drag/click strip |
| `SidebarMenuAction` / `SidebarMenuSub` | `<button>` / `<ul>` | 10 each | Secondary action, nested list |
| `SidebarMenuSubItem` / `SidebarMenuSubButton` | `<li>` / `<a>` | 9 each | Nested list rows |
| `SidebarFooter` | `<div>` | 8 | Sticky bottom region |
| `SidebarInput` | Input | 6 | Search field |
| `SidebarSeparator` | Separator | 5 | Rule |
| `SidebarMenuBadge` | `<div>` | 3 | Count pill |
| `SidebarGroupAction` | `<button>` | 0 | Never used in any block |
| `SidebarMenuSkeleton` | `<div>` + Skeleton | 0 | Never used in any block |

So the real composed surface is about nine parts (`Provider`, `Sidebar`, `Content`, `Group`, `GroupLabel`, `Menu`, `MenuItem`, `MenuButton`, `Trigger`), with `Header`/`Footer`/`Inset`/`Rail` as layout conveniences and the rest as long-tail. `SidebarGroupAction` and `SidebarMenuSkeleton` are shipped in every install and demonstrated in none of shadcn's own blocks.

`SidebarGroupLabel` is a `<div>`, not a heading, so a group label contributes no heading structure and cannot be an `aria-labelledby` target without the consumer adding an id.

### 2. Where the state lives, and whether a part works outside the provider

`SidebarContext` is `React.createContext<SidebarContextProps | null>(null)` and `useSidebar()` throws `"useSidebar must be used within a SidebarProvider."` on a null context. Three parts call it — `Sidebar`, `SidebarTrigger`, `SidebarRail` — plus `SidebarMenuButton` (for the collapsed-state tooltip). The remaining nineteen parts are context-free styling wrappers and do work standalone; nothing enforces that they don't.

The context value is seven fields:

```ts
type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}
```

`SidebarProvider` is controlled-or-uncontrolled through `defaultOpen` / `open` / `onOpenChange`, resolved as `const open = openProp ?? _open` — evaluated every render, so unlike Carbon's `useRef`-latched check it does not pin controlledness at mount. It renders a real `<div data-slot="sidebar-wrapper">` that carries the width custom properties, so the provider is a DOM element, not a bare context.

**There are two open states, not one.** `open` (desktop) and `openMobile` are separate `useState` calls that never synchronise. `toggleSidebar` picks between them: `isMobile ? setOpenMobile(o => !o) : setOpen(o => !o)`. Crossing the breakpoint therefore does not carry your open state across; the two sides remember independently.

### 3. Persistence and the keyboard shortcut: neither is opt-in

Both are unconditional and neither has a prop to disable it.

`setOpen` writes a cookie on every change, including when the sidebar is *controlled* — the write sits after the `setOpenProp` branch, not inside the uncontrolled one:

```ts
document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
```

with `SIDEBAR_COOKIE_NAME = "sidebar_state"` and a max-age of 7 days. There is no `Secure`, no `SameSite`, and no way to turn it off short of editing the file.

Only the *write* side is built in. Reading it back is the consumer's job, and **the current docs page does not mention the cookie at all** — a fetch of `ui.shadcn.com/docs/components/sidebar` returns zero occurrences of the word. The recipe existed in the older docs (a Next.js server layout reading `cookies().get("sidebar_state")?.value === "true"` into `defaultOpen`) and was dropped when the page moved to `apps/v4`. So as shipped today, shadcn writes a cookie nothing reads unless the consumer finds the removed documentation.

The shortcut is a `window` keydown listener registered in a `useEffect` for the provider's lifetime:

```ts
if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
  event.preventDefault()
  toggleSidebar()
}
```

`SIDEBAR_KEYBOARD_SHORTCUT = "b"`, so it claims Cmd/Ctrl+B application-wide and `preventDefault`s it — including inside any rich-text editor on the page, where Cmd+B is bold. There is no `shortcut={false}` escape.

**None of the other four systems persists anything or registers a global toggle chord.** Carbon, Mantine, Ant Design and Primer have zero `localStorage`/`cookie` writes in their sidebar source. Carbon registers window keydown listeners, but for Escape-to-close and a Tab-into-nav handoff, not a chord. shadcn's cookie and Cmd/Ctrl+B are outliers, not table stakes.

### 4. Desktop collapse vs mobile: two states, a JS breakpoint, and a subtree swap

`Sidebar` has three mutually exclusive branches:

1. `collapsible === "none"` — a plain `<div>` at `--sidebar-width`, no context read beyond the destructure, no mobile handling at all.
2. `isMobile === true` — the entire subtree goes into `<Sheet open={openMobile} onOpenChange={setOpenMobile}>`.
3. otherwise — the desktop tree: an outer `<div className="group peer hidden ... md:block">` carrying `data-state`, `data-collapsible`, `data-variant`, `data-side`, plus a `sidebar-gap` spacer div and a `fixed`-positioned `sidebar-container`.

`isMobile` comes from a hand-rolled hook, not from CSS:

```ts
const MOBILE_BREAKPOINT = 768
// useState<boolean | undefined>(undefined), set in an effect from window.innerWidth, returned as !!isMobile
```

Three consequences worth naming:

- **The mobile surface is a hydration-time swap.** `useIsMobile` returns `false` on the server and on the first client render, so a phone renders the desktop tree first and then replaces it. The whole sidebar subtree unmounts and remounts on every breakpoint crossing, losing any component state inside it.
- **Two mechanisms guard one breakpoint.** The JS hook uses `max-width: 767px`; the desktop tree separately uses Tailwind's `md:` (768px) to hide itself. They agree by coincidence of configuration, not by construction.
- **Props are dropped on mobile.** `className` is destructured and never used in the mobile branch, and the remaining `...props` are spread onto `<Sheet>` — which is Base UI's `Dialog.Root`, a component that renders no element. So `id`, `aria-label`, `style` and anything else given to `<Sidebar>` vanish below 768px.

`Sheet` is `Dialog` from `@base-ui/react/dialog`, modal by default, so focus trapping, Escape, scroll lock and focus return to the trigger all come from the Dialog primitive rather than from Sidebar. Sidebar contributes an `sr-only` `SheetHeader` holding `<SheetTitle>Sidebar</SheetTitle>` and a description, purely to satisfy Dialog's accessible-name requirement, and hides the Sheet's own close button with `[&>button]:hidden`.

**Nothing closes the mobile menu on navigation.** `setOpenMobile` is exported through the context and never called on link activation — not in the component, not in the docs, and in 0 of the 173 block files under `bases/base/blocks/`. A consumer who wants "selecting a destination closes the menu" writes it themselves.

The other systems diverge sharply here. Carbon uses **one** state and two SCSS regimes at `lg`, with a bare inline sibling `<div className="cds--side-nav__overlay">` and no focus trap. Mantine uses two independent booleans but **no JS media query at all** — it renders a `<style>` tag of generated media queries, and the mobile "drawer" is the same `<nav>` at `width:100%` translated off-canvas, with no overlay, no portal and no trap. Ant Design uses **one** state that its `matchMedia` listener writes into, firing `onCollapse(collapsed, 'responsive')` so the consumer can tell responsive collapse from a click; its mobile mode is just the rail at `collapsedWidth`. Primer's `NavList` has no responsive story at all — layout and hiding belong to a separate `PageLayout.Pane` with `hidden={{narrow: true}}`.

So shadcn is the only one of the five that mounts a real modal overlay for mobile, and the only one whose mobile behavior therefore satisfies the spec's focus-management requirement without extra consumer code.

### 5. Width, icon-collapse, offcanvas: which are props and which are CSS variables

Behavior is props; measurement is CSS custom properties.

**Props on `Sidebar`:** `side: "left" | "right"`, `variant: "sidebar" | "floating" | "inset"`, `collapsible: "offcanvas" | "icon" | "none"`. All three become data attributes on the outer group div, and every layout rule is a Tailwind `group-data-[...]` selector reading them. `data-collapsible` is written as `state === "collapsed" ? collapsible : ""`, so the attribute is only populated while collapsed — the selectors that need it read `group-data-[collapsible=icon]` and are inert while expanded.

**CSS variables**, seeded on the provider's wrapper div from module constants:

| Variable | Constant | Value | Set on |
| --- | --- | --- | --- |
| `--sidebar-width` | `SIDEBAR_WIDTH` | `16rem` | `sidebar-wrapper` div |
| `--sidebar-width-icon` | `SIDEBAR_WIDTH_ICON` | `3rem` | `sidebar-wrapper` div |
| `--sidebar-width` (overridden) | `SIDEBAR_WIDTH_MOBILE` | `18rem` | the `SheetContent` |

Offcanvas is `data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]` — a negative-inset translate of the fixed container, with the gap div collapsing to `w-0`. Icon collapse is `group-data-[collapsible=icon]:w-(--sidebar-width-icon)`, plus `group-data-[collapsible=icon]:hidden` on `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarGroupAction` and `SidebarMenuSubButton`. The `floating`/`inset` variants widen the icon width by a spacing step to account for their padding.

Two documentation defects worth knowing before copying the shape:

- The docs tell you to override `--sidebar-width-mobile` in the provider's `style` prop. **No such variable is read anywhere in the source.** The mobile width is hard-coded onto the `SheetContent` as a local `--sidebar-width`, so setting `--sidebar-width-mobile` does nothing.
- The width escape hatch is `style={{"--sidebar-width": "20rem"} as React.CSSProperties}` on the provider — i.e. it depends on `style` being a plain CSS object.

**Other systems:** Mantine puts everything in custom properties (`--app-shell-navbar-width`, `-offset`, `-transform`, `-transform-rtl`, `-z-index`, `-position`, `-display`, `-grid-*`) generated from a config object, and has no icon-collapse mode at all. Ant Design puts width entirely in props applied as inline styles (`width=200`, `collapsedWidth=80`, stamped as `flex`/`maxWidth`/`minWidth`/`width`), and its icon-collapse is real and default — `rc-menu` flips `inline` to `vertical` popup flyouts and antd wraps each label in a `Tooltip`. Carbon uses **no custom properties at all**: widths are Sass `mini-units(6)` / `mini-units(32)` and the variants (`isRail`, `isFixedNav`, `isPersistent`, `isChildOfHeader`) are booleans that only toggle class names, so changing the width means overriding CSS. Carbon's rail is a hover-expand with a 100ms `enterDelayMs`, not a persistent mode.

### 6. Three composition mechanisms for one component

shadcn's three bases give the clearest available side-by-side of how a nav row accepts a consumer's router link, because it is the same component three times:

| Base | Mechanism | `SidebarMenuButton` signature |
| --- | --- | --- |
| `bases/radix` | Radix `Slot` | `asChild?: boolean`, then `const Comp = asChild ? Slot.Root : "button"` |
| `bases/base` | Base UI `useRender` | `render` prop, passed to `useRender({ defaultTagName: "button", render, state })` |
| `bases/aria` | discriminated union | `(LinkProps & { href: string }) \| (ButtonProps & { href?: never })`, branching on `props.href !== undefined` to render RAC's `Link` or `Button` |

Across the wider survey: Carbon and Mantine use a polymorphic element prop (`as` and `component` respectively; Carbon also ships a `createCustomSideNavLink(element)` factory and a deprecated `element` prop), Primer uses polymorphic `as`, and Ant Design has **no** element-swap prop at all — you nest your router link inside the item's `label` ReactNode, producing `<li role="menuitem"><a href>…</a></li>`.

Ultima's convention is already `render`, which is the `bases/base` column and needs no decision.

### 7. Active-page indication: what the shipped code actually emits

**shadcn emits nothing for assistive technology.** `SidebarMenuButton` and `SidebarMenuSubButton` take `isActive?: boolean` (default `false`) and turn it into `data-active` only. There is no `aria-current` in any of the three bases, the legacy copy, the docs page, or any of the 173 block files. shadcn's own documentation site consumes its own Sidebar with `isActive={pathname === href}` and adds no `aria-current` either, so the current page in shadcn's docs nav is a background colour and nothing else.

There is a second-order hazard in how the flag reaches CSS, and it is directly relevant to Ultima's state-styling rule:

- `bases/base` passes `active: isActive` into `useRender`'s `state`. Base UI's `getStateAttributesProps` emits `data-active=""` when the value is `true` and **omits the attribute entirely when false**.
- `bases/radix` and `bases/aria` write `data-active={isActive}` directly. React does not drop `false` for `data-*` and `aria-*` attributes — `setValueForAttribute` removes a boolean only when the name prefix is neither `data-` nor `aria-` — so those bases render `data-active="false"` on every inactive row.
- The shipped stylesheet uses Tailwind's bare `data-active:` variant, which compiles to the **presence** selector `&[data-active]`, matching `"false"` as readily as `""`. The legacy `new-york-v4` copy avoids this by using the value form `data-[active=true]:` throughout.

Ultima's spec fixes state styling on presence selectors (`':is([data-disabled])'`, `':is([data-open])'`), so a Sidebar that writes `data-active={active}` rather than emitting the attribute only when true would silently style every row. Base UI's mapping is the safe path and Ultima already gets it for free through `useRender`.

**Base UI's own answer**, from `NavigationMenu.Link` — the only place `aria-current` appears anywhere in `@base-ui/react` 1.8.0:

```ts
const state = { active }
const defaultProps = {
  'aria-current': active ? 'page' : undefined,
  // …
}
```

with the public prop documented as `active?: boolean`, default `false`, "Whether the link is the currently active page". One boolean in; `aria-current="page"` and `data-active=""` out, both only when true. This is the both-attributes pattern, already house style in the primitive library Ultima builds on.

**Primer inverts the direction.** `NavList.Item` takes `aria-current` itself, typed as the ARIA token set (`'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false' | boolean`), and derives the styling flag from it:

```tsx
aria-current={ariaCurrent}
active={Boolean(ariaCurrent) && ariaCurrent !== 'false'}
```

The consumer states the semantics and the visual follows, rather than the reverse.

**Carbon ships both mechanisms and honours them inconsistently.** `isActive` produces `.cds--side-nav__link--current`, styled at any depth; a raw `aria-current="page"` passed through `...rest` is only styled by `.cds--side-nav__menu a.cds--side-nav__link[aria-current='page']`, i.e. inside a submenu. So `aria-current="page"` on a top-level Carbon link gets the semantics without the highlight.

**Mantine** takes `active` into `data-active` and never emits ARIA, but its CSS accepts either: `&:where([data-active], [aria-current='page'])`. That is a deliberate accommodation for consumers who set `aria-current` on a router link themselves — the same problem Primer solves with a DOM fallback.

**Ant Design has no per-item active prop at all.** Selection is a key model on the `Menu` (`selectedKeys` / `defaultSelectedKeys`), producing the class `ant-menu-item-selected`. `rc-menu` emits `aria-selected` only when an item's `role` is explicitly `'option'`, so the default `role="menuitem"` path has no ARIA state for the current page whatsoever.

### 8. Nested groups: list-with-disclosure everywhere except Ant Design

| System | Group markup as rendered |
| --- | --- |
| shadcn | Not a sidebar part. The consumer wraps a `SidebarMenuItem` in a separate `Collapsible` and renders `SidebarMenuButton` into `CollapsibleTrigger`; `aria-expanded` comes from Collapsible. `SidebarMenuSub` is a plain `<ul>` with no relationship to the trigger. |
| Primer | `<li>` with `aria-expanded={isOpen}` and `aria-controls={subNavId}` on the item, `<ul id={subNavId}>` panel. Full wiring. |
| Carbon | `<li>` > `<button aria-expanded>` > sibling `<ul>`. **No `aria-controls` and no `id` on the list**; the panel is revealed by the CSS sibling selector `[aria-expanded='true'] + .cds--side-nav__menu`. Uncontrolled only (`defaultExpanded`). |
| Mantine | `<a>` with **no `href`**, carrying `data-expanded` and **not `aria-expanded`** (asserted by its own test), no `aria-controls`, no list markup at all; children go in a `<Collapse><div>`. Space is hand-handled because a hrefless `<a>` does not activate on Space. |
| Ant Design | Full application-menu semantics: `role="menu"` root, `<li role="none">` > `<div role="menuitem" aria-expanded aria-haspopup aria-controls={popupId}>` > `<ul role="menu" id={popupId}>`. Correct wiring, wrong pattern for site navigation. |

**Nobody uses `role="tree"`.** Four of five are a list plus a disclosure button; the fifth is a menu. Ant Design is the only one with complete `aria-expanded`/`aria-controls` wiring in the sidebar itself, and it pays for it by declaring page navigation an application menu with roving tabindex.

Only Primer connects expansion to the current page: `hasCurrentNavItem` walks the React children for a truthy `aria-current` to decide the initial open state, and a layout effect adds a DOM fallback, `subNavRef.current?.querySelector('[aria-current]:not([aria-current=false])')`, with a source comment saying it exists for "custom link components that compute `aria-current` internally instead of receiving it as a prop". A collapsed parent then inherits the look: `active={!isOpen && containsCurrentItem}`. That is the direct-page-load half of the spec's first Docs behavior, solved.

### 9. The nav landmark

**Primer is the only system of the five whose sidebar renders a `<nav>`.** Its root renders `<nav aria-label={ariaLabel} aria-labelledby={navLabelledby}>`, where `navLabelledby` falls back to the id of a `NavList.Heading` slot when no `aria-label` was given, so the landmark gets a name automatically from visible content. Mantine's `AppShell.Navbar` renders a `<nav>` element but sets no name. shadcn, Carbon's `SideNav` and Ant Design's `Sider` render `<div>` and `<aside>` respectively with no landmark role and no name; the consumer supplies both or has neither.

### 10. The accessible convention for current-page indication

#### 10.1 `aria-current` is a global state, and `page` is a typed claim

ARIA 1.3 §6.6, `aria-current` (state): "Indicates the element that represents the current item within a container or set of related elements." Its token set is `page`, `step`, `location`, `date`, `time`, `true`, `false`, with `page` defined as "Represents the current page within a set of pages" and `true` as the untyped "Represents the current item within a set."

Four normative sentences that bear on a component API:

- "The `aria-current` attribute is a token type. **Any value not included in the list of allowed values SHOULD be treated by assistive technologies as if the value `true` had been provided.**"
- "If the attribute is not present or its value is the empty string or undefined, **the default value of `false` applies and the `aria-current` state MUST NOT be exposed** by user agents or assistive technologies."
- "**Authors SHOULD only mark one element in a set of elements as current** with `aria-current`."
- "Authors SHOULD NOT use the `aria-current` attribute as a substitute for `aria-selected` in widgets where `aria-selected` has the same meaning."

It is a **global** state, listed in ARIA 1.2 and 1.3 §6.5 with "Used in Roles: All elements of the base markup", and unlike `aria-disabled` / `aria-haspopup` / `aria-invalid` it was not deprecated for global use in 1.2.

Core-AAM 1.2 confirms the shape at the platform layer: §3.5.2.21 maps a recognised non-`false` value to `current:<value>` verbatim; §3.5.2.22 maps an unrecognised value to `current:true` (plus `STATE_ACTIVE` on ATK/AT-SPI); §3.5.2.23, "aria-current is false or undefined", is **"Not mapped"** on every platform API. So `aria-current="false"` is not a way to say "not current" — it is a way to say nothing, and emitting it is pure DOM noise.

**ARIA 1.3 changed nothing normative.** The only entry in its change log is commit `72063a0`, "remove overly prescriptive distinctions from aria-current values", which reworded the illustrative examples ("a link within a set of pagination links" became "a page within a set of pages"). Token set, default, unrecognised-value rule and globality are unchanged from 1.2.

#### 10.2 What assistive technology actually says

Two bodies of published testing, and they disagree about how good support is because they are four years apart.

**a11ysupport.io** (data 2019-03-29 to 2021-11-19) records verbatim output for a link with `aria-current="page"`:

| AT + browser | Spoken | Result |
| --- | --- | --- |
| JAWS + Chrome / Edge | "bullet, visited, current page, link, home" | pass |
| JAWS + Firefox | "current page" | pass |
| NVDA + Chrome / Edge | "…bullet, visited link, current page, Home" | pass |
| NVDA + Firefox | "current page" | pass |
| VoiceOver macOS + Safari | "current page" | pass |
| VoiceOver iOS + Safari | "current page" | pass |
| TalkBack + Chrome | "current page, home, current page, link" (doubled) | pass |
| Narrator + Edge | *not announced* | fail |
| Orca + Firefox | no current announced | fail |

`true` is spoken as "current" by JAWS, NVDA and VoiceOver, and as "current item" by TalkBack.

**Age caveat, stated plainly:** the Narrator "fail" is a 2019 result against Windows 10 1809 and EdgeHTML, a browser that no longer exists. Treat the Narrator and Orca rows as unverified today rather than as current fact.

**W3C's own ARIA-AT project** is the fresh data. Its `apg/disclosure-navigation` test plan (phase CANDIDATE, plan version 2025-10-27) carries the MUST-priority assertion "State of the link, 'current page' is conveyed":

| AT + browser | Version | Result | Verbatim |
| --- | --- | --- | --- |
| JAWS + Chrome | 2025.2508.120 | 5/5 | "Overview same page link Current Page" |
| NVDA + Chrome | 2023.3 | 6/6 | "list / with 4 items / Overview / link / current page" |
| VoiceOver macOS + Safari | 13.7.2 | 3/4 | "current page link Overview list 4 items level 2" |

The one VoiceOver miss is an artifact of the navigation command landing on the `<h1>`, not a failure to expose the state. On the three pairs W3C actively tests, `aria-current="page"` is announced reliably as of late 2025. There is no ARIA-AT data for Narrator, TalkBack or Orca.

#### 10.3 `aria-current` vs `data-*` vs both

**A `data-*` attribute does nothing for assistive technology, normatively.** WHATWG HTML §3.2.6.6: "**User agents must not derive any implementation behavior from these attributes or values.** Specifications intended for user agents must not define these attributes to have any meaningful values… Custom data attributes are intended to store custom data, state, annotations, and similar, **private to the page or application**." It contributes nothing to the accessibility tree and is mapped by no AAM.

**Styling directly off `[aria-current="page"]` is not merely acceptable, it is what W3C ships.** The WAI Menus tutorial's Styling page gives this as its recommended CSS:

```css
nav [aria-current=page] {
  background-color: #bbb;
  color: #000;
  border-bottom: .25em solid #444;
}
```

The APG does the same for the sibling state, noting on the Disclosure Navigation Menu example that "CSS attribute selectors (e.g. `[aria-expanded="false"]`) are used to synchronize the visual states with the value of the `aria-expanded` attribute." Adrian Roselli's "Using CSS to Enforce Accessibility" makes the argument for it directly: "Every time you come up with a style that reflects a state or property of something… **do not use a class. At least not at first.** Look at the programmatic change that happens to the underlying HTML… Many of the global ARIA **states** (but not properties) are great as styling hooks." `aria-current` is a state, so it is on the recommended side of that line.

**No spec, WAI tutorial, WCAG technique or APG page recommends shipping a parallel `data-*` mirror.** Every W3C source styles off the ARIA attribute. Where "both" exists, it is library convention: React Aria's styling guide exposes `data-selected` / `data-hovered` / `data-pressed` because those states have no ARIA styling equivalent, and does not mention `aria-current` or `data-current` at all. Roselli does ship a class alongside, but on a *different* element (`<li class="selected"><a aria-current="page">`) and is explicit that "that is strictly for styling the container in my design." His 2021 post also names the reason teams reach for the mirror: "Much of what I propose above will not work with Tailwind's structure" — a tooling constraint, not an accessibility rationale, and one StyleX does not have.

Ultima can write `':is([aria-current="page"])'` in a `stylex.create` value the same way the spec's State styling section already writes `':is([data-disabled])'`, so the tooling reason for the mirror does not apply here. The argument for emitting both is consistency with Base UI, which does exactly that on `NavigationMenu.Link` — one prop in, both attributes out of a single code path, which is the only version of "both" that cannot drift.

#### 10.4 Visual-only indication is not sufficient, and the SC is 1.3.1

**WCAG 2.2 SC 1.3.1 Info and Relationships (Level A):** "Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text." A highlight, a bold weight or a left border on the current row is exactly "information conveyed through presentation."

The mapping is official rather than inferred. **Technique ARIA26, "Using `aria-current` to identify the current item in a set"** (updated 2026-03-09) states: "This technique relates to: **1.3.1 Info and Relationships** (Sufficient…); **2.4.8 Location** (Sufficient)", and "The `aria-current` attribute provides a way to programmatically indicate the element that is usually only visually highlighted, for example: the current page in a navigation bar." Its Example 1 is a `<nav><ul>` with `aria-current="page"` on one `<a>` — the exact case. Its test procedure: "For each component that contains a set of related elements where one element is visually highlighted to denote its current status: Check that the highlighted item has an `aria-current` attribute with a suitable value."

**SC 1.4.1 Use of Color (Level A)** bites the visual design separately: a current-page indicator that is only a hue swap fails unless it also differs by shape, weight or border, or the two colours differ enough in lightness — Understanding 1.4.1's note allows a lightness difference reaching 3:1 contrast to count as the additional distinction. Adding `aria-current` does not fix a 1.4.1 problem; 1.4.1's note says it "addresses color perception specifically. Other forms of perception are covered in Guideline 1.3." W3C's own tutorial recipe deliberately does both, pairing the colour change with `border-bottom: .25em solid`.

**4.1.2 is contested for this case and should be the secondary argument.** Its states clause reads "states, properties, and values **that can be set by the user**", and "current page" is not user-settable in that sense. But the WAI Menus tutorial's Structure page — the page that recommends `aria-current` — lists 4.1.2 as its related SC. 4.1.2 *does* squarely cover the nested-group disclosure button; Understanding 4.1.2 names "whether a collapsible tree view or accordion is expanded or collapsed" as a user interface control state. **Argue 1.3.1 via ARIA26 for the link, 4.1.2 for the group trigger.**

Technique **G128**, "Indicating current location within navigation bars", is filed only under 2.4.8 (Level AAA), so it is not the Level A argument on its own.

#### 10.5 Is it correct on the link to the page you are already on? Yes

Three W3C sources put it exactly there. The WAI Menus tutorial: "Use the `aria-current="page"` attribute to indicate the current page in the menu", with the refinement that the anchor can point at `#main` rather than reloading the current URL. ARIA26 Example 1, with a plain `href`. The APG Disclosure Navigation Menu attributes table: `aria-current="page"` on `a`, "Indicates that the page referenced by the link is currently displayed."

The historical recommendation is still listed first on the tutorial page, under "Using invisible text": provide a visually hidden "Current Page:" span and "**Remove the anchor (`<a>`), so users cannot interact with the current item.**" That is the pre-`aria-current` hack. Heydon Pickering's 2014 write-up is the best record of why all of the hacks were bad — including that `aria-label` *replaces* the text node, so "NVDA, JAWS and ChromeVox all override the text node with the label, leaving just 'current page'". The advantage `aria-current` has over the invisible-text approach is that the announcement is a platform-localised AT string rather than author text that has to be translated per locale.

**One authoring rule a component should enforce:** "Authors SHOULD only mark one element in a set of elements as current." With nested navigation it is easy to end up with `aria-current` on both a parent group's link and its active leaf.

#### 10.6 How a component that does not own routing receives the state

Three shapes exist in the wild, and they differ in which direction the derivation runs:

| Shape | Who states the semantics | Systems |
| --- | --- | --- |
| Boolean prop in, ARIA + data out | The component | Base UI `NavigationMenu.Link` (`active` → `aria-current="page"` + `data-active`) |
| `aria-current` in, styling flag derived | The consumer | Primer `NavList.Item` (`active={Boolean(ariaCurrent) && ariaCurrent !== 'false'}`) |
| Boolean prop in, nothing out but a class or data attribute | Nobody | shadcn (`isActive` → `data-active`), Carbon (`isActive` → `--current`), Mantine (`active` → `data-active`), Ant Design (`selectedKeys` → a class) |

The routing itself never belongs to the component; what varies is the element-swap mechanism it offers so a router link can be the rendered element — `render` (Base UI, shadcn's base variant), `asChild` (shadcn's Radix variant), polymorphic `as` (Primer, Carbon) or `component` (Mantine), or nothing at all (Ant Design, where you nest a `<Link>` inside the item's `label`).

Two systems hedge against a consumer whose router link sets `aria-current` itself, which Next's `<Link>` and TanStack Router's `<Link>` both can. Mantine's CSS accepts either source: `&:where([data-active], [aria-current='page'])`. Primer reads the DOM: `subNavRef.current?.querySelector('[aria-current]:not([aria-current=false])')`, with a comment saying it is "for custom link components that compute `aria-current` internally instead of receiving it as a prop". That hedge is what makes the direct-page-load case work when the consumer owns the comparison.

#### 10.7 List with a disclosure button, not a tree

The APG's answer is unambiguous and written as a Caution on the Navigation Treeview example itself:

> "**Caution!** Before considering use of the Tree View Pattern for site navigation, it is important to understand: Correct implementation of the `tree` role requires implementation of complex functionality that is not needed for typical site navigation that is styled to look like a tree with expandable sections. **A pattern more suited for typical site navigation with expandable groups of links is the disclosure pattern.**"

and again: "the disclosure pattern is better suited for most web sites because few sites need the additional keyboard functionality required to support the ARIA `tree` role."

The Disclosure Navigation Menu example is a list: `<nav>` → `<ul>` → `<li>` holding a `<button aria-expanded aria-controls>` and a nested `<ul>` of links. Its rationale: "**The semantics of the list structure communicates the hierarchy of the navigation system to assistive technology users.**" It also carries the standing warning against the other wrong answer: "**Although this example uses the word 'menu' in the colloquial sense to refer to a set of navigation links, it does not use the WAI-ARIA `menu` role.**… Typical site navigation does not need all the keyboard interactions specified by the menu and menubar pattern." That is the sentence Ant Design's `role="menu"` sidebar is on the wrong side of.

**The cost difference is the whole argument.** The Disclosure pattern's entire mandatory keyboard contract is: "**Enter**: activates the disclosure control and toggles the visibility of the disclosure content. **Space**: [same]." A native `<button>` gives both for free. The nav example adds Tab/Shift+Tab through the open group (no roving tabindex, no trap) and Escape to close and return focus to the trigger — the latter not optional, since "Implementing this Esc behavior is necessary to meet the WCAG 2.1 1.4.13: Content on Hover or Focus criterion." Arrow keys, Home and End are marked **(Optional)**, with the reason given: screen readers in reading mode intercept them and never pass them to the page.

The Tree View pattern's contract is Right/Left Arrow (with open/close/move-to-parent/no-op-on-end-node semantics), Up/Down, Home, End, Enter, `*`, and **type-ahead** ("recommended for all trees, especially for trees with more than 7 root nodes", single-character and multi-character), plus a whole second interaction model if multi-select. Its ARIA contract is `tree` / `treeitem` / `group`, `aria-expanded` on parent nodes and **explicitly not** on end nodes, `aria-selected` xor `aria-checked` on every selectable node including `false` on unselected ones, and possibly manual `aria-level` / `aria-posinset` / `aria-setsize` because "some browser and assistive technology combinations may not compute or report correct position and level information if it is not explicitly declared."

Two keys versus about ten plus type-ahead plus a selection model. Roselli reached the same conclusion from user testing — "these roles switch a screen reader into a forms or application mode and tell the user what keyboard commands to use — commands which not only do not belong on a regular web page, but commands which you will now have to support" — and adds one rule the surveyed systems get wrong: "**Do not add `aria-expanded` to a link.** Doing so is confusing for screen reader users in particular." The trigger is a `<button>`. Mantine's hrefless `<a>` with `data-expanded` is the counter-example on both counts.

#### 10.8 The landmark and its name

Use `<nav>`, not `role="navigation"`. The APG's Landmark Regions practice: "**HTML Technique:** Use the HTML `nav` element to define a navigation landmark. **ARIA Technique:** If the HTML `nav` element technique is not being used, use a `role="navigation"` attribute."

A name is a strong SHOULD, not a spec MUST. ARIA 1.3's `navigation` role has "Name From: author" and no "Accessible Name Required" characteristic. The APG supplies the rule: "**If a page includes more than one navigation landmark, each should have a unique label**"; "If an area begins with a heading element it can be used as the label for the area using the `aria-labelledby` attribute. If an area requires a label and does not have a heading element, provide a label using the `aria-label` attribute"; and "**Do not use the landmark role as part of the label.** For example, a navigation landmark with a label 'Site Navigation' will be announced by a screen reader as 'Site Navigation Navigation'."

The docs site will have at least two nav landmarks (the sidebar and the header), so both need names. Primer's `NavList` is the only surveyed component that solves this in the component: it falls back to `aria-labelledby` pointing at a `NavList.Heading` slot when no `aria-label` is given, so the landmark takes its name from visible content automatically.

#### 10.9 Direct page load and client-side route change

The spec requires active-page indication "including on a direct page load", which `aria-current` rendered during SSR/first paint satisfies on its own. **The client-side route change is the harder half, and the attribute alone does not carry it.**

a11ysupport's "aria-current change" test (all results 2023-03-04, Windows 11 / Chrome-Edge-Firefox 111 / iOS 16.4 / macOS 13.2.1 / Android 13) measures what happens when `aria-current` is added to the focused link:

| AT + browser | Output | Result |
| --- | --- | --- |
| NVDA + Chrome / Edge / Firefox | "current page" | pass |
| VoiceOver iOS + Safari | "about (target) current page link" | pass |
| JAWS + Chrome / Edge / Firefox | "enter" (keypress echo only) | fail |
| VoiceOver macOS + Safari | earcon only | fail |
| TalkBack + Chrome | earcon only | fail |
| Narrator + Edge | silence | fail |
| Orca + Firefox | "return" | fail |

Only NVDA and VoiceOver iOS re-announce. The corresponding assertion in a11ysupport's own feature definition is **SHOULD**-strength, where every other `aria-current` assertion is MUST, with the note "this can be helpful in the context of a single-page-application."

The APG addresses this directly on the treeview-navigation example: "**If activating a tree item changes content on the page without triggering a browser page load, i.e., works like typical single-page apps, the focus position after the content load significantly affects efficiency**", and names two options — (1) move focus to the beginning of the new content, "ideally a level one heading with content that matches the name of the tree item that was activated", or (2) keep focus on the activated item and let the movement of `aria-current` do the work. Its own example implements the first. Option 2 is precisely the behavior that fails on five of the seven pairs above.

Marcy Sutton's user testing with Fable Tech Labs reached the same result: focus management outperformed live-region announcement alone, "Focusing on a heading was found to be the best experience", a wrapper `<div>` was "very subtle compared to focusing on a heading", and live-region-only helps nobody using screen magnification. Its recommendation is a skip link plus focus moved to the content plus an `aria-live` region, and it explicitly endorses the attribute alongside: "Putting `aria-current` on links to indicate which one is active helps in applications."

**Honest framing:** there is no W3C normative requirement for SPA route announcement. WCAG has no SC named for it (3.2.5 is about unrequested changes, 4.1.3 about status messages that do not take focus). "Focus a matching heading on route change and move `aria-current` as a secondary cue" is well-supported convention, not a requirement — and, notably, it is the *app's* job, not Sidebar's. Sidebar owns the attribute; the docs app owns the focus move.

### 11. Where each surveyed shape would violate an Ultima convention

The useful half of the comparison. Each row is a thing a system does that Ultima's spec forbids, so the decision ticket does not adopt it by imitation.

| Surveyed shape | Ultima rule it breaks | Where |
| --- | --- | --- |
| 23 flat `SidebarMenuButton`-style exports | "A multi-part component exports one namespace object of parts… Flat `DialogPopup`-style exports do not exist." Sidebar must be `Sidebar.MenuButton`. | Compound components |
| `className` on every part; `cn()` merging | "No `className`. Registry consumers own the source and edit it instead." `style?: StyleProp` is the only escape hatch. | Props every component accepts |
| `cva` variant tables | "There is no `cva`." One `stylex.create` table per axis, indexed by the prop. | Variants, sizes, and tones |
| `SidebarMenuButton` `size: "default" \| "sm" \| "lg"`, `variant: "default" \| "outline"` | Ultima's `size` values are `sm`/`md`/`lg` and defaults are declared in the destructure, not named `default`. `variant` means shape and emphasis. | Variants, sizes, and tones; Naming |
| `Sidebar`'s `side` / `collapsible` props | Not an axis violation — these are behavioral, not `variant`/`size`/`tone`. But "No component in v0 has an axis beyond `variant`, `size`, and `tone`" means the contract has to say explicitly which of Sidebar's props are axes and which are behavior. | The v0 set |
| Width override via `style={{"--sidebar-width": "20rem"} as React.CSSProperties}` | Ultima's `style` is `stylex.StyleXStyles`, not a CSS object, so this hatch does not exist. And the spec has already closed the local-custom-property route: StyleX emits `create` rules that set custom properties **outside** the cascade layer when `useCSSLayers` is on ([facebook/stylex#1611](https://github.com/facebook/stylex/issues/1611)), and Ultima keeps `useCSSLayers` on, in tests too. Width has to be a prop or a token, not a caller-set custom property. | Variants, sizes, and tones; Testing → Environment |
| Eight-token `--sidebar-*` colour family in the registry item's `cssVars` | "Tokens are the only source of raw values… A new need becomes a new token", at the semantic layer. A component-private colour family is a token-group decision, not a component decision. | Principles; Tokens |
| `lucide-react` / `IconPlaceholder` in the trigger | "**No registry item declares an icon dependency.**" Glyphs are inline SVG, private to the file, 24×24, `stroke-width: 1.5`, `1em`. "Sidebar and any components added for the docs must settle their glyph slots with their component contracts." | Iconography |
| Seven `registryDependencies` (`button`, `separator`, `sheet`, `tooltip`, `input`, `use-mobile`, `skeleton`) | v0 has Button, Input, Tooltip and Dialog. Separator, Skeleton and Sheet are v0.2. The spec's escape is explicit: "Reuse Dialog for mobile navigation if it satisfies that contract. If the implementation needs a separate Sheet or Drawer, promote that component from v0.2 into v0." Base UI 1.8.0 ships a `Drawer` (16 parts) if Dialog turns out not to fit. | Release scope; The registry item |
| A separate `use-mobile` hook item | "Each component's item carries… exactly one `files` entry." A hook is a second file and therefore a second item, or it is inlined. Base UI exports `unstable-useMediaQuery`, which removes the need for a hand-rolled one — at the cost of depending on an `unstable-` path. | The registry item |
| `useSidebar()` exported alongside the parts | No precedent in v0; every existing component is parts only. Not forbidden, but it is a new kind of export and the first shared state in the system: "The two parts take `tone` separately, which is the whole of the 'no context in v0' position." | The v0 set; Per-component notes → Meter |
| `data-active={isActive}` (Radix/Aria bases) | State styling uses presence selectors (`':is([data-disabled])'`), and React renders `data-active="false"`, which a presence selector matches. Emit the attribute only when true — which Base UI's `useRender` state mapping already does. | State styling |
| Carbon's `hasActiveDescendant` / Primer's `hasCurrentNavItem` walking `React.Children` | Not a spec violation, but it breaks the moment a consumer wraps items in their own component, which is exactly what the docs site does with route data. Primer's DOM-query fallback is the more robust half of that pair. | — |
| Mantine's hrefless `<a>` with `data-expanded` and no `aria-expanded` | "Nested navigation exposes its expanded state" is a stated Docs behavior, and axe runs over every demo in both modes. | Docs navigation and component ownership; Accessibility checks |
| Ant Design's `role="menu"` / `role="menuitem"` nav | Ultima's accessibility contract is "Base UI supplies the roles… following the WAI-ARIA Authoring Practices. Ultima adds nothing and removes nothing there." Declaring site navigation an application menu is adding a role, and Base UI's `Menu` is the dropdown primitive, not a navigation one. | Accessibility contract |
| shadcn's unconditional cookie write and global Cmd/Ctrl+B | No spec rule names them, because nothing in v0 has a global side effect. Sidebar would be the first, and it is the first thing the contract should decide either way. Four of five surveyed systems ship neither. | — |
| Nothing closes the mobile menu on navigate | "Selecting a destination closes the menu" is a required Docs behavior, and no surveyed system provides it. It has to be Ultima's own. | Docs navigation and component ownership |

Three things Ultima already has that shrink whatever surface is chosen:

- **`Sidebar.Root` needs no `Portal`/`Backdrop`/focus logic of its own.** The Overlays section already fixes one popup recipe, and the Docs section already says "Modal behavior uses the shared overlay component's focus management." Dialog gives focus trap, Escape, scroll lock and focus return. Which of Dialog and Drawer carries it is settled separately in `docs/research/2026-09-09-base-ui-drawer.md`, which establishes that Drawer is Dialog plus a gesture layer over shared code.
- **Base UI `Collapsible` is three parts** (`Root`, `Trigger`, `Panel`) and wires `aria-expanded` plus `aria-controls={open ? panelId : undefined}` on the trigger. If Collapsible is promoted from v0.2, Sidebar ships no group-disclosure parts at all. If it is not, Sidebar has to grow them.
- **`render` is already the composition contract**, so the router-link question is settled: `<Sidebar.MenuLink render={<Link to="/x" />} active={…} />`.

### 12. The range: smallest surface that carries the four behaviors, and largest anyone ships

Not a recommendation. The two ends, so the decision ticket sees the span.

The four behaviors the spec's Docs section demands are: (1) accessible active-page indication including on direct load, with nested groups exposing expanded state; (2) keyboard reach to every link plus named, focus-ringed icon-only controls for desktop collapse and the mobile menu; (3) a mobile menu that takes focus, dismisses on Escape and its close control with focus returned, closes on destination select, and gets its modal behavior from the shared overlay; (4) usable across both layouts, long lists and both colour modes, taking the same `style` and semantic tokens as everything else.

**Smallest: six parts on paper, seven in practice, if Collapsible is promoted.**

| Part | Element | Carries |
| --- | --- | --- |
| `Sidebar.Root` | `<div>` + context | The two open states, `isMobile`, the mobile Dialog branch. Behaviors 3 and 4. |
| `Sidebar.Panel` | `<nav aria-label>` | The landmark and its name; the desktop collapse target. Behaviors 1 and 4. |
| `Sidebar.Trigger` | Button | Named icon-only toggle with a focus ring. Behavior 2. |
| `Sidebar.Menu` | `<ul>` | List semantics for behavior 1. |
| `Sidebar.MenuItem` | `<li>` | Row container. |
| `Sidebar.MenuLink` | `<a>` via `render` | `active` → `aria-current="page"` + `data-active`. Behavior 1. |

`Sidebar.Root` doubling as provider and wrapper is what shadcn does and what makes six possible; splitting them (shadcn's `SidebarProvider` + `Sidebar`) makes it seven, and is the honest split if the trigger has to live in a page header outside the panel — which the docs layout requires, so **seven is the realistic floor**. Nested groups add three more (`Group`, `GroupTrigger`, `GroupPanel`) unless Base UI's `Collapsible` is promoted from v0.2 and composed instead, which is the cheaper trade. A group *heading* for a non-collapsible group is an eighth part or a documented `<h2>`; the spec's `Card.Title` precedent (renders `<h3>`, changeable through `render`) says it should be a real heading either way. `Sidebar.MenuSub` for a nested list is a ninth, or the consumer nests `Sidebar.Menu`.

So the floor is **seven parts with Collapsible promoted, ten or eleven without**.

**Largest: shadcn's 23 parts plus `useSidebar`.** No other surveyed system is close: Carbon exports 13 SideNav parts (plus 15 more shell parts), Primer's `NavList` 12, Mantine's `AppShell` 7 plus `NavLink`, Ant Design 5 Layout parts plus 5 Menu parts. Even shadcn's own 173 example files compose about nine of its 23, and use two of them zero times.

The middle of that range is where four of the five systems actually sit, and Primer's 12 is the only one of the four that satisfies behavior 1 as written.

## Facts later tickets will need

- **Base UI's `NavigationMenu.Link` is the house precedent for active-page indication**: `active?: boolean` (default `false`) → `'aria-current': active ? 'page' : undefined` plus `data-active=""` from the state mapping. Prop name is `active`, not `isActive`.
- **Base UI's state-to-`data-*` mapping omits `false`.** `getStateAttributesProps` emits `data-<key>=""` for `true`, `String(value)` for other truthy values, and nothing for `false`. A raw `data-active={active}` in JSX would instead render `data-active="false"`, which Ultima's presence selectors match.
- **Base UI 1.8.0 ships `Collapsible`** (`Root`, `Trigger`, `Panel`; trigger gets `aria-expanded={open}` and `aria-controls={open ? panelId : undefined}`), **`Drawer`** (16 parts: Root, Trigger, Portal, Backdrop, Popup, Viewport, Content, Title, Description, Close, Handle, SwipeArea, Indent, IndentBackground, Provider, VirtualKeyboardProvider), and **`unstable-useMediaQuery`** at `@base-ui/react/unstable-use-media-query`.
- **`aria-current` appears exactly twice in `@base-ui/react` 1.8.0**, both in `NavigationMenuLink`. No other primitive emits it, so Ultima's Dropdown Menu `LinkItem` does not get it for free.
- **shadcn's cookie is `sidebar_state`, path `/`, max-age 604800**, written on every `setOpen` including in controlled mode, with no `Secure`/`SameSite` and no opt-out. Only the write is built in; the read recipe was removed from the docs.
- **shadcn's shortcut is Cmd/Ctrl+B**, `preventDefault`ed on `window`, no opt-out.
- **shadcn's mobile breakpoint is 768px in JS** (`useIsMobile`, `max-width: 767px`) and 768px again in CSS (`md:`), and the mobile surface is a full subtree swap into a Dialog, so it is a hydration-time change and a remount on every crossing.
- **shadcn's documented `--sidebar-width-mobile` does not exist in the source.** Its real variables are `--sidebar-width` (16rem) and `--sidebar-width-icon` (3rem) on the wrapper, with mobile hard-coding `--sidebar-width: 18rem` on the Sheet.
- **No surveyed system closes its mobile menu on navigation** (0 of 173 shadcn block files touch `setOpenMobile`), and no surveyed system except Primer names its nav landmark. Both are Ultima's own work.
- **Nobody uses `role="tree"` for site navigation.** Four of five ship a list plus a disclosure button; Ant Design ships `role="menu"`.
- **StyleX + `useCSSLayers` blocks the caller-set-custom-property width hatch** ([facebook/stylex#1611](https://github.com/facebook/stylex/issues/1611)), which the spec already records under Variants, sizes, and tones. Width must be a prop or a token.
- **Part counts for the range:** shadcn 23 + 1 hook; Carbon 13 (+15 shell); Primer 12; Mantine 7 + `NavLink`; Ant Design 5 + 5. Realistic Ultima floor is 7 with Collapsible promoted, 10–11 without.

Three notes filed the same day answer questions this one deliberately leaves open, and the decision ticket wants all four: `docs/research/2026-09-09-base-ui-drawer.md` (Drawer versus Dialog for the mobile panel), `docs/research/2026-09-09-stylex-responsive.md` (whether the desktop/mobile split can be CSS rather than a JS media query, and whether a breakpoint can be a token), and `docs/research/2026-09-09-base-ui-docs-patterns.md` (what Collapsible, Separator, Scroll Area and Navigation Menu cost to wrap).

## Sources

### shadcn/ui (repo HEAD `3ba91b1cc83e1bbe4ab35a422ff2a694849c5048`, 2026-09-08)

- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/base/ui/sidebar.tsx: the primary source. All 23 parts and `useSidebar`; `SidebarContext` typed `| null` with the throwing hook (lines 44-53); the provider's `open = openProp ?? _open`, unconditional cookie write in `setOpen`, and `window` keydown effect (lines 55-146); the three branches of `Sidebar` and the Sheet swap (lines 148-251); `SidebarRail`'s `tabIndex={-1}`; `SidebarMenuButton`'s `isActive` → `state: { active: isActive }`; the module constants `SIDEBAR_COOKIE_NAME`/`_MAX_AGE`/`SIDEBAR_WIDTH`/`_MOBILE`/`_ICON`/`SIDEBAR_KEYBOARD_SHORTCUT` (lines 28-32).
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/radix/ui/sidebar.tsx: the `asChild` + `Slot.Root` composition variant, and `data-active={isActive}` written directly.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/aria/ui/sidebar.tsx: the `(LinkProps & { href: string }) | (ButtonProps & { href?: never })` discriminated-union composition variant.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/new-york-v4/ui/sidebar.tsx: the legacy copy, which pairs `data-active={isActive}` with the value form `data-[active=true]:`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/base/hooks/use-mobile.ts: `MOBILE_BREAKPOINT = 768`, `useState<boolean | undefined>(undefined)` returned as `!!isMobile`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/base/ui/sheet.tsx: Sheet is `Dialog` from `@base-ui/react/dialog`, so mobile focus management is the Dialog primitive's.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/styles/style-nova.css (lines 1166-1219): `.cn-sidebar-menu-button` uses the bare `data-active:` Tailwind variant.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/base/blocks/sidebar-07/components/nav-main.tsx: the canonical nested-group composition — `Collapsible` with `render={<SidebarMenuItem />}` and `CollapsibleTrigger render={<SidebarMenuButton />}`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/components/docs-sidebar.tsx: shadcn's own docs consuming its own Sidebar with `isActive={pathname === href}` and no `aria-current`.
- Sweep of all 173 `.tsx` files under `apps/v4/registry/bases/base/blocks/` at that SHA: per-part usage counts in §1, and 0 files referencing `setOpenMobile`.
- https://ui.shadcn.com/docs/components/sidebar and its source `apps/v4/content/docs/components/base/sidebar.mdx`: the documented composition tree, the `SidebarProvider` / `Sidebar` / `useSidebar` prop tables, the Width section naming `--sidebar-width-mobile`, the Keyboard Shortcut section, the collapsible-group recipe, the Theming variables. Also the absence: zero occurrences of "cookie" on the live page.
- https://github.com/shadcn-ui/ui/blob/fac0daac/apps/www/content/docs/components/sidebar.mdx (lines 409-435): the removed "Persisted State" section and its `cookies().get("sidebar_state")?.value === "true"` recipe. Deleted with the `www` app in `2bfc1c82` (2025-10-29).
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/public/r/styles/default/sidebar.json: the registry item — `registryDependencies: [button, separator, sheet, tooltip, input, use-mobile, skeleton]` and the eight-token `--sidebar-*` `cssVars` family.
- https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/src/variants.ts (line 882-890): the functional `data` variant compiles `data-active:` to `&[data-active]`, a presence selector.
- https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/client/DOMPropertyOperations.js (`setValueForAttribute`, lines 106-136): React removes a `boolean` attribute only when the name prefix is neither `data-` nor `aria-`, so `data-active={false}` renders `data-active="false"`.

### Base UI (`@base-ui/react` 1.8.0)

- `package/navigation-menu/link/NavigationMenuLink.{mjs,d.ts}` in the published 1.8.0 tarball, and https://base-ui.com/react/components/navigation-menu: `active?: boolean` default `false`, "Whether the link is the currently active page", and the implementation `'aria-current': active ? 'page' : undefined` with `state = { active }`. A grep of the whole package finds `aria-current` in exactly this one component.
- https://github.com/mui/base-ui/blob/master/packages/react/src/internals/getStateAttributesProps.ts: `true` → `data-<key>=""`, other truthy → `String(value)`, `false` → attribute omitted.
- `package/collapsible/index.parts.d.ts` and `package/collapsible/trigger/CollapsibleTrigger.mjs`: three parts (`Root`, `Trigger`, `Panel`); trigger emits `aria-expanded: open` and `aria-controls: open ? panelId : undefined`.
- `packages/react/src/drawer/index.parts.ts` and `packages/react/package.json` exports map: `Drawer` with 16 parts, plus the `./unstable-use-media-query` entry point.
- https://github.com/mui/base-ui/blob/master/packages/react/src/unstable-use-media-query/index.ts: `useMediaQuery(query, options)` over `useSyncExternalStore`, with `defaultMatches`, `ssrMatchMedia` and `noSsr` options.

### Primer React (repo HEAD `1ab47e6e4d99e5da06ee96967f96fe992c2f6c57`, 2026-09-09)

- `packages/react/src/NavList/NavList.tsx`: the 12-part namespace object; `Root` rendering `<nav aria-label={ariaLabel} aria-labelledby={navLabelledby}>` with the `NavList.Heading` fallback (lines 55-84); `NavListItemProps` typing `'aria-current'` as the ARIA token set (line 138); `active={Boolean(ariaCurrent) && ariaCurrent !== 'false'}` (line 187); `ItemWithSubNav`'s `aria-expanded`/`aria-controls` and `active={!isOpen && containsCurrentItem}` (lines 241-290); `hasCurrentNavItem` React-tree walk (lines 219-238) and the `querySelector('[aria-current]:not([aria-current=false])')` DOM fallback (line 257). Zero `localStorage`/`cookie`/`keydown`/`matchMedia` in the file.
- `packages/react/src/PageLayout/PageLayout.tsx`: `Pane`'s responsive `hidden`, `position`, `divider` and `resizable` props — the app-shell half Primer keeps separate from `NavList`.

### IBM Carbon (repo `12277c649e7851ac7db3f4d9a2993a4e149987ba`, `@carbon/react` 1.116.0)

- `packages/react/src/components/UIShell/index.ts`: the 13 SideNav exports plus 15 shell exports.
- `.../UIShell/SideNav.tsx`: `expanded`/`defaultExpanded`/`onToggle`, the `useRef`-latched controlled check, the parallel `expandedViaHoverState`, the inline overlay `<div>`, `useMatchMedia` used only to set `inert`, the boolean class-name variants, and the Escape / Tab window listeners.
- `.../UIShell/SideNavContext.tsx`: `createContext<SideNavContextData>({})` — no throw outside the provider.
- `.../UIShell/SideNavMenu.tsx`: the `<li>` > `<button aria-expanded>` > sibling `<ul>` markup with no `aria-controls`; `defaultExpanded` uncontrolled only; `hasActiveDescendant` walking `React.Children`.
- `.../UIShell/SideNavLink.tsx`, `SideNavMenuItem.tsx`, `Link.tsx`: `isActive` → `--current`, polymorphic `as` (deprecated `element`), `createCustomSideNavLink`.
- `packages/styles/scss/components/ui-shell/side-nav/_side-nav.scss` and `.../_functions.scss`: `mini-units(6)`/`mini-units(32)` widths, the `breakpoint-down('lg')` mobile regime, the overlay rules, the `[aria-expanded='true'] + .cds--side-nav__menu` reveal, and the submenu-only scoping of `[aria-current='page']`. No CSS custom properties.

### Mantine (repo `61049ecd950f6fb9ddc631decfec2edbdffe58e1`, `@mantine/core` 9.6.1)

- `packages/@mantine/core/src/components/AppShell/AppShell.types.ts`: `AppShellNavbarConfiguration` — `width`, `breakpoint`, `collapsed?: { desktop?, mobile? }`. No `defaultCollapsed`, no `onCollapsedChange`.
- `.../AppShell/AppShell.context.ts` and `.../core/utils/create-safe-context/create-safe-context.tsx`: the context carries styles and config only, and throws `"AppShell was not found in tree"`.
- `.../AppShell/AppShellMediaStyles/AppShellMediaStyles.tsx` and `.../assign-navbar-variables/assign-navbar-variables.ts`: generated `<style>` media queries, every `--app-shell-navbar-*` custom property, and the desktop/mobile split with no JS `matchMedia`.
- `.../NavLink/NavLink.tsx`, `NavLink.module.css`, `NavLink.test.tsx`: `active` → `data-active` via `mod`; the CSS selector `&:where([data-active], [aria-current='page'])`; the hrefless `<a>` group trigger with `data-expanded` and no `aria-expanded`, asserted by its own test; polymorphic `component`.

### Ant Design (repo `bdbbdd5179e440c2269c27355f1187bf2bf1b7f9`, `antd` 6.6.3; `@rc-component/menu` 1.6.0 at `8dfdef45`)

- `components/layout/Sider.tsx`: `collapsed`/`defaultCollapsed`/`onCollapse(collapsed, type)`, `useControlledState`, `dimensionMaxMap`, the `matchMedia` listener writing into the same state with `type: 'responsive'`, `SiderContext { siderCollapsed }`, `width`/`collapsedWidth` stamped as inline `flex`/`maxWidth`/`minWidth`/`width`, and `zeroWidthTrigger`.
- `components/menu/menu.tsx` and `components/menu/index.tsx`: `mergedInlineCollapsed = inlineCollapsed ?? siderCollapsed`, and the `{...props} {...context}` spread order.
- `components/menu/MenuItem.tsx`: the collapsed-mode `Tooltip` wrapper and the `inline-collapsed-noicon` first-character fallback.
- `rc-menu` `src/Menu.tsx`, `src/MenuItem.tsx`, `src/SubMenu/index.tsx`: `role="menu"` root; the inline→vertical flip under `inlineCollapsed`; `aria-selected` emitted only under `role="option"`; the `<li role="none">` > `<div role="menuitem" aria-expanded aria-haspopup aria-controls>` > `<ul role="menu" id>` group markup.

### Specs and accessibility guidance

- https://w3c.github.io/aria/#aria-current (ARIA 1.3 ED) and https://www.w3.org/TR/wai-aria-1.2/#aria-current: token set, "token type", unrecognised → `true`, default `false` with MUST-NOT-expose, SHOULD-only-one-per-set, SHOULD-NOT-substitute-for-`aria-selected`.
- https://w3c.github.io/aria/#global_states and https://www.w3.org/TR/wai-aria-1.2/#global_states: `aria-current` is a global state, not deprecated for global use.
- https://w3c.github.io/aria/#change-log: the only 1.2→1.3 `aria-current` change is commit `72063a0`, examples reworded, nothing normative.
- https://w3c.github.io/aria/#navigation: `navigation` role has Name From author and no accessible-name-required characteristic.
- https://www.w3.org/TR/core-aam-1.2/ §§3.5.2.21-3.5.2.23: `current:<value>` mapping; unrecognised → `current:true`; false or undefined → "Not mapped" on every platform API.
- https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes: "User agents must not derive any implementation behavior from these attributes or values"; `data-*` is private to the page.
- https://html.spec.whatwg.org/multipage/sections.html#the-nav-element: what `<nav>` is for, that not every group of links needs one, and the two-`nav` labelled-by-heading example.
- https://www.w3.org/TR/WCAG22/#info-and-relationships, #use-of-color, #name-role-value: SC text for 1.3.1, 1.4.1, 4.1.2.
- https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html and .../use-of-color.html and .../name-role-value.html: the Intent for 1.3.1; 1.4.1's 3:1-lightness note and its "addresses color perception specifically" scoping; 4.1.2 naming expanded/collapsed as a control state.
- https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA26 (updated 2026-03-09): `aria-current` is a **Sufficient** technique for 1.3.1 and 2.4.8, with the nav-bar example and the test procedure. The load-bearing citation for "visual-only is not enough".
- https://www.w3.org/WAI/WCAG22/Techniques/general/G128: current-location-in-navbar, filed under 2.4.8 (AAA) only.
- https://www.w3.org/WAI/tutorials/menus/structure/: nav as a list; label with a heading, `aria-label` or `aria-labelledby`; both current-item techniques, the historical invisible-text-and-remove-the-anchor one and `aria-current="page"`.
- https://www.w3.org/WAI/tutorials/menus/styling/: W3C's own `nav [aria-current=page] { … }` rule, pairing colour with a border.
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/: the list-with-buttons structure and its "semantics of the list structure" rationale; "does not use the WAI-ARIA `menu` role"; `[aria-expanded]` as the sanctioned styling hook; `aria-current="page"` on `a`; the Tab/Enter/Space/Escape keyboard set with arrows optional; Escape required for SC 1.4.13.
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/: the pattern's total mandatory keyboard contract — Enter and Space.
- https://www.w3.org/WAI/ARIA/apg/patterns/treeview/ and .../treeview/examples/treeview-navigation/: the full tree keyboard and ARIA contract; the **Caution** against trees for site navigation; the SPA focus-movement guidance and its two options.
- https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/: `<nav>` over `role="navigation"`; unique labels when a role repeats; heading-via-`aria-labelledby` preferred; do not put the role in the label.
- https://a11ysupport.io/tests/tech__aria__aria-current (data at `data/tests/tech/aria/aria-current.json`): per-AT verbatim announcements, 2019-03-29 to 2021-11-19; Narrator and Orca fail every token.
- https://a11ysupport.io/tests/tech__aria__aria-current-change (data at `data/tests/tech/aria/aria-current-change.json`, all 2023-03-04): only NVDA and VoiceOver iOS re-announce when the attribute changes.
- `data/tech/aria/aria-current_attribute.json` in the same repo: conveying each token is MUST; conveying an added state is SHOULD.
- https://aria-at.w3.org/reports (via https://aria-at.w3.org/api/graphql): `apg/disclosure-navigation`, phase CANDIDATE, plan version 2025-10-27 — JAWS 2025.2508.120 + Chrome 5/5, NVDA 2023.3 + Chrome 6/6, VoiceOver 13.7.2 + Safari 3/4 on the "current page is conveyed" assertion.
- https://adrianroselli.com/2021/06/using-css-to-enforce-accessibility.html: "do not use a class. At least not at first"; ARIA states as styling hooks; the Tailwind friction that drives the `data-*` mirror.
- https://adrianroselli.com/2019/06/link-disclosure-widget-navigation.html: list + `<button aria-expanded aria-controls>`; `a[aria-current="page"]` as the styling selector; "Do not add `aria-expanded` to a link"; why menu roles are wrong for navigation.
- https://tink.uk/using-the-aria-current-attribute/ (Léonie Watson, 2017): origin of the a11ysupport test corpus; "Home, current page link". Her support table at design-patterns.tink.uk no longer resolves.
- https://heydonworks.com/article/the-accessible-current-page-link-conundrum/ (2014): the pre-`aria-current` record; "Classes do not climb accessibility trees"; why `aria-label` fails by replacing the text node.
- https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing/ (Marcy Sutton with Fable Tech Labs): focus a heading beats live-region-only; endorses `aria-current` as an adjunct.
- https://react-aria.adobe.com/styling: React Aria exposes state as `data-selected` / `data-hovered` / `data-pressed` and never mentions `aria-current` — evidence the "ship both" pattern is a library idiom, not published guidance.

### Ultima's own constraints

- `docs/spec/ultima.md` → Principles, Release scope and core coverage (v0's Sidebar line and the promote-Sheet-or-Drawer escape), The v0 set, One file per component, The shared lib, Props every component accepts, Compound components, Styled parts, Variants sizes and tones (including the closed local-custom-property route and [facebook/stylex#1611](https://github.com/facebook/stylex/issues/1611)), State styling, Tokens in component code, Focus ring, Accessibility contract, Overlays, Iconography, Naming, The registry item, Docs site → Docs navigation and component ownership, Testing → Environment / What a build ticket proves / Accessibility checks.
- `docs/research/2026-09-08-base-ui-inventory.md`: the existing record of Base UI's `useRender` state-to-`data-*` conversion and the styling contract this note builds on.
