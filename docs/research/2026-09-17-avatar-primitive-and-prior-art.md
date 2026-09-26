# What does Base UI 1.8's Avatar actually do, and how do comparable systems size, shape, and name an avatar?

## Findings

Base UI's Avatar is three parts and one piece of state. `Root` renders a `<span>` and holds `imageLoadingStatus`; `Image` renders an `<img>` and drives that status; `Fallback` renders a `<span>` and hides itself once the status is `loaded`. The primitive sets **no ARIA at all** in its default mode, emits **no data attribute for the loading status on any part**, and does nothing with `alt`. The only attributes it ever writes are on `Image`: `data-starting-style` and `data-ending-style` always, and `data-loading`, `data-error`, plus `aria-hidden` only when `keepMounted` is on.

Answering the ticket's questions in one line each:

1. Default mode preloads `src` with a detached `new window.Image()` and mounts the real `<img>` only after the preload succeeds. `keepMounted` mounts the `<img>` immediately and reads the status from that element's own `load` and `error` events, plus an `img.complete` check on every commit.
2. The machine is `idle` on mount, then `loading`, then `loaded` or `error`. It short-circuits to `error` synchronously when there is no `src` and no `srcSet`, and to `loaded`/`error` synchronously when the browser reports the image already `complete`. It returns to `idle` only when `Image` unmounts.
3. `Fallback.delay` is a first-render gate: with `delay > 0` the fallback renders nothing until the timer fires, so a fast image never flashes initials. Default is `0`, changed in v1.4.0 so `delay={0}` shows immediately.
4. `Image` under `keepMounted` genuinely works with `next/image` and `loading="lazy"`, and that is what it was added for (v1.8.0, PR #5536). Without it, `render={<NextImage/>}` puts `src` on the rendered element rather than on `Avatar.Image`, so the preloader sees no `src`, sets `error` synchronously, and the image never mounts; and a `loading="lazy"` on the default path is defeated because the preloader fetches the raw URL eagerly before the attribute ever reaches the DOM.
5. Prior art splits cleanly. Every styled system (shadcn, Chakra, Mantine, React Spectrum) carries a `size`; only Chakra (`shape`) and Mantine (`radius`) carry a shape axis; Chakra and Mantine also carry a `variant` and a colour axis. Radix, Base UI and Ark carry nothing. Nobody type-requires `alt`; React Spectrum is the only one that documents the default as decorative (`alt=""`). Chakra and Mantine derive initials from a `name` prop; shadcn, Radix and Base UI leave initials as fallback children. shadcn, Chakra, Mantine and React Spectrum each ship a group, always a sibling container, never a `Root` prop.

Nothing below proposes Ultima's contract.

### 1. The three parts

| Part | Renders | What Base UI writes on it | Consumes |
|---|---|---|---|
| `Root` | `<span>` | Nothing. `avatarStateAttributesMapping` maps `imageLoadingStatus` to `() => null`, so the state reaches `className`/`style` functions but never the DOM. | Owns `useState('idle')` and provides `{ imageLoadingStatus, setImageLoadingStatus }` through `AvatarRootContext`. |
| `Image` | `<img>` | Always: `data-starting-style` and `data-ending-style` from `transitionStatusMapping`. With `keepMounted`: `data-loading`, `data-error`, `aria-hidden` (while not `loaded`), and its own `onLoad`/`onError`. Props `src`, `srcSet`, `sizes` are split out and applied **last**, because React 17/18 set attributes in prop order and Safari and Firefox begin fetching as soon as `src` lands. | Context (throws outside `Root`: "Base UI: AvatarRootContext is missing. Avatar parts must be placed within <Avatar.Root>."). |
| `Fallback` | `<span>` | Nothing. Same null mapping as Root. Rendering is gated by `enabled: imageLoadingStatus !== 'loaded' && (delay === 0 \|\| delayPassed)`; when disabled `useRenderElement` returns `null`. | Context. |

`Root` is not a layout primitive: the shipped demo gives it `display: inline-flex`, `overflow: hidden`, `border-radius: 100%`, `2rem` square, and `user-select: none`, and gives `Image` `object-fit: cover; width: 100%; height: 100%`. Every one of those is the consumer's. The demo also shows `<Avatar.Root>LT</Avatar.Root>` with no `Image` and no `Fallback`, which is a valid tree because `Root` only supplies context.

No part sets `role`, `alt`, `aria-label`, or anything else in the accessibility tree by default. `alt` is whatever the caller passes through `elementProps` to the `<img>`.

### 2. The `imageLoadingStatus` machine

The union is `'idle' | 'loading' | 'loaded' | 'error'`, exported as `ImageLoadingStatus`. Two components keep a copy: `Image` holds the local one, and mirrors it upward.

**Default mode** (`useImageLoadingStatus(src, props, enabled = !keepMounted)`), in a layout effect:

1. `enabled` false: do nothing (the `keepMounted` path).
2. No `src` and no `srcSet`: set `error` and stop. The `<img>` never mounts.
3. Otherwise set `loading`, build `new window.Image()`, copy `referrerPolicy`, `crossOrigin` (set to `null` when absent), `sizes`, `srcset`, then `src`, and wire `onload` → `loaded`, `onerror` → `error`.
4. Fast path: if `image.complete` is already true after assigning `src` (cached, decoded), set `loaded` when `naturalWidth > 0` and `error` otherwise, synchronously in the same effect. The v1.4.1 changelog entry "Fix flash when image is cached (#4469)" is this branch.
5. Cleanup flips an `isMounted` flag so a late `onload` cannot write into an unmounted or re-keyed component. Dependencies are `[enabled, src, srcSet, sizes, crossOrigin, referrerPolicy]`, so a `src` change re-runs the whole sequence from `loading`.

Mounting follows the status through `useTransitionStatus(isVisible)` where `isVisible = status === 'loaded'`: the element mounts with `transitionStatus: 'starting'` for one frame (so `data-starting-style` is present for one commit), then clears; when `isVisible` drops it goes `'ending'` and `useOpenChangeComplete` waits for CSS animations on the `<img>` to finish before `setMounted(false)`. So the default `Image` supports an enter and exit transition and is otherwise absent from the DOM.

**Mirroring.** A layout effect calls `onLoadingStatusChange(status)` and `setRootImageLoadingStatus(status)` for every status except `idle`. On `Image` unmount the root is reset to `idle`. Hence `Root`'s state is `idle` when there is no `Image` at all, and `Fallback` shows in that case because `idle !== 'loaded'`.

**`keepMounted` mode.** `shouldRender = keepMounted || mounted`, so the `<img>` is always in the tree, and `sourceProps` puts `src`/`srcSet`/`sizes` on it directly. Status comes from three places:

- the element's `onLoad` → `loaded`, `onError` → `error`, merged into props before `elementProps` so a caller's own handlers still run (`useRenderElement` merges handler arrays);
- a layout effect that runs on `[keepMounted, src, srcSet, sizes, crossOrigin, referrerPolicy, render]`: if `imageRef.current` is null (the `render` element did not forward the ref) it returns and leaves the events as the only source of truth; else if `!image.complete` it sets `loading`; else it sets `loaded`/`error` by `naturalWidth`, and on the **first** commit with an already-loaded image calls `setMounted(true)` directly so the enter transition is skipped ("painted before hydration, so mount it without going through `'starting'`");
- `transitionStatus` is forced to `undefined` when it would be `'ending'`, because the element never leaves so an exit animation would play and then reverse when the status clears. `data-loading`/`data-error` are the replacement hooks.

`aria-hidden` is `true` on the `<img>` for every status except `loaded`, including in server HTML (initial state is `idle`). The source comment: "Until the image is displayable, the fallback owns the accessible name; without this both would be exposed to assistive technology at once (including in server HTML)." This is the only ARIA the primitive ever writes, and it exists only under `keepMounted`.

The two modes therefore differ in what the DOM looks like while not loaded:

| | Default | `keepMounted` |
|---|---|---|
| `<img>` in DOM before load | No | Yes, `aria-hidden`, `data-loading` |
| `<img>` in DOM on error | No | Yes, `aria-hidden`, `data-error` (browser paints the broken-image icon unless hidden) |
| Fallback and image coexist | Never | Always until `loaded`; the doc tells the consumer to stack them with `position: absolute; inset: 0`, put `Image` after `Fallback` in DOM order, and hide `[data-loading]`/`[data-error]` with `visibility: hidden`, not `display: none`, because an element without a box never intersects the viewport and lazy loading would never trigger |
| Enter transition | `data-starting-style` on mount after load | Same, except skipped for images already complete on first commit |
| Exit transition | `data-ending-style`, waits for animations | Never |
| SSR | Server HTML has no `<img>`; Fallback present | Server HTML has the `<img>` (fetch starts before hydration) and the Fallback |

### 3. `Fallback.delay`

`delay` (ms, default `0`) exists for one reason, stated by Radix, whose design Base UI ported: "If you notice a flash during loading, you can provide a `delayMs` prop to delay its rendering so it only renders for those with slower connections." Implementation: `useState(delay === 0)` seeds `delayPassed`; an effect starts `useTimeout` for `delay > 0`, or sets `delayPassed = true` immediately otherwise, with the comment that once shown without a delay it stays shown so a later change from `0` to a number does not re-hide it. The `enabled` condition then requires both the status not to be `loaded` and (delay 0 or timer fired). v1.4.0 changelog: "Show `<Avatar.Fallback>` immediately when `delay={0}` (#5147)"; before that the semantics matched Radix's `delayMs === undefined` check.

The timer runs from `Fallback` mount, not from when loading starts, and it is not cancelled by a `loaded` status; the `enabled` check handles that. With `keepMounted` and SSR the doc notes the fallback "stays visible until hydration resolves the loading status", which means a nonzero `delay` is also the thing that keeps server HTML from showing initials under a cached image: the timer has not started on the server, so `delayPassed` is false and the fallback is absent from the server markup.

### 4. `keepMounted` with `next/image` and `loading="lazy"`

**Why the default path breaks.** Two independent failures, both from the source:

- *`next/image`.* The doc's own example is `<Avatar.Image keepMounted render={<Image src="/avatar.png" width={32} height={32} alt="" />} />`. `src` is on the `render` element, so `componentProps.src` is `undefined`. On the default path `useImageLoadingStatus` hits step 2 above (`!src && !srcSet`) and sets `error` synchronously; the `<img>` never mounts and the fallback stays forever. Passing `src` on `Avatar.Image` instead would preload the raw `/avatar.png` while `next/image` renders `src="/_next/image?url=%2Favatar.png&w=…&q=75"` with a generated `srcset`, so the preload measures a URL the page never displays, the optimizer URL is then fetched a second time after mount, and the PR description calls this the "image optimizer incompatibility". Next's own reference shows the rewritten `src`/`srcset` output.
- *`loading="lazy"`.* The detached `new window.Image()` has no `loading` attribute and fetches on `src` assignment, regardless of viewport. The rendered `<img loading="lazy">` mounts only after that eager fetch completes, so `lazy` never has anything to defer. PR #5536's summary: "The `loading="lazy"` attribute never took effect because preloading was always eager."

**Why `keepMounted` works.** The `<img>` is in the tree from the first render, with `src`/`srcSet` (or the `render` element's own attributes) in place, so the browser applies `loading="lazy"` natively and `next/image` (which defaults `loading` to `lazy` and has forwarded `ref` since v13.0.6) fetches only its optimizer URL. Status is read from that element. The `img.complete` layout effect covers the cached and pre-hydration cases; the ref-missing branch covers a `render` element that does not forward `ref`, degrading to the `load`/`error` events alone.

**What the consumer still owes it.** Base UI's doc is explicit: stack `Image` over `Fallback`, hide the not-loaded image with `visibility` or `opacity` rather than `display: none`, and give lazy images a width and height (MDN: "Lazy-loaded images will never be loaded if they do not intersect a visible part of an element ... because unloaded images have a `width` and `height` of `0`"). The `next/image` case needs `alt` on the rendered element because Next requires it, and Next's guidance for a decorative image is `alt=""`.

### 5. Prior art

#### Size and shape

| System | Size axis | Shape axis | Other axes | Where |
|---|---|---|---|---|
| Base UI 1.8 | none | none | none | headless |
| Radix Primitives | none | none | none | headless |
| Ark UI (Chakra's primitive) | none | none | none | headless |
| shadcn (Radix and Base UI flavours) | `size`: `"default" \| "sm" \| "lg"`, emitted as `data-size` on the root; root classes `size-8`, `data-[size=lg]:size-10`, `data-[size=sm]:size-6` (32 / 40 / 24 px) | none; root is `rounded-full` | none | `Avatar` root prop |
| Chakra v3 | `size`: `'full' \| '2xs' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'`, default `md` | `shape`: `'square' \| 'rounded' \| 'full'`, default `full` | `variant`: `'solid' \| 'subtle' \| 'outline'`, default `subtle`; `colorPalette`; `borderless` | `Avatar.Root` recipe props |
| Mantine | `size`: `xs`..`xl` or a number (rem), default `md` | `radius`: `theme.radius` key or CSS value, default `'1000px'` in source | `variant`: `filled`, `light`, `outline`, `transparent`, `white`, `default`; `color` (theme colour or `"initials"`); `autoContrast` | `Avatar` props |
| React Spectrum S2 | `size`: `16 \| 20 \| 24 \| 28 \| 32 \| 36 \| 40 \| 44 \| 48 \| 56 \| 64 \| 80 \| 96 \| 112` or a number, default `24` | none, always circular | `isOverBackground` | `Avatar` props |
| React Spectrum v3 | `size`: `avatar-size-50` .. `avatar-size-700` or px number | none | `isDisabled` | `Avatar` props |
| React Aria Components | no Avatar component exists | | | |

Against Ultima's three-axis rule:

- **`size` is a precedent Ultima can take in name only.** Every styled system has it, but none uses control heights. shadcn's three steps are 24/32/40 px; Chakra runs eight; Spectrum runs fourteen numeric steps. Ultima's `size` is defined as "the three control heights" (space steps 9, 10, 11: 32/40/48 px), so an avatar `size` either means those three heights, which shadcn's `lg` (40) and `default` (32) happen to sit on, or it is not `size`. The spec already refused `size` on Checkbox, Radio Group, Switch and Field on the grounds that the axis belongs to controls.
- **`shape` / `radius` is not a precedent Ultima can take.** Chakra's `shape` and Mantine's `radius` are a fourth axis. The spec defines `variant` as "shape and emphasis", so a square-vs-circle choice, if Ultima wants one, is a `variant` value or nothing.
- **`variant` and colour are precedents with a mapping.** Chakra's `solid | subtle | outline` and Mantine's `filled | light | outline` are the same three shapes Button uses; Chakra's `colorPalette` and Mantine's `color` are `tone`. Mantine's `color="initials"` (hash the name to a colour) has no Ultima equivalent, because `tone` values are named colour roles, not derived.
- **`borderless`, `isOverBackground`, `autoContrast`, `isDisabled` are booleans outside the three axes** and have no home in Ultima's rule.

#### `alt` and accessibility

| System | `alt` default | Required? | Fallback and name |
|---|---|---|---|
| Base UI 1.8 | none set; passes through | no (plain `img` props) | Under `keepMounted` only, `aria-hidden` on the `<img>` until `loaded` so "the fallback provides the accessible name on its own". The docs' `next/image` example uses `alt=""`. |
| Radix | none set; source has no ARIA and no `alt` handling | no | Docs say nothing about `alt`. |
| Ark UI | none documented | no | `Fallback` carries `data-state="hidden" \| "visible"`. |
| shadcn | none; docs example passes `alt="@shadcn"` | no | Initials are `AvatarFallback` children (`CN`). |
| Chakra v3 | none; `Image` defaults `draggable="false"` and `referrerPolicy="no-referrer"` | no | `Avatar.Fallback name="…"` → `getInitials` (first letter of first and last word); no `name` → `Avatar.Icon` generic glyph. |
| Mantine | none; `alt` "also used as `title` attribute for placeholder" | no | `name` → `getInitials(name, limit = 2)` (uppercased, first letters of the first two words, or first two letters of a single word) when `src` is unset; `children` override; otherwise a placeholder icon. |
| React Spectrum v3 | "By default, avatars are decorative and have an empty `alt` attribute." | Documented, not typed: "Standalone avatars with no surrounding context must have a custom `alt` prop defined for accessibility." | No initials, no fallback. |

WAI's rule for the decorative case is `alt=""` "so that they can be ignored by assistive technologies", and MDN adds that visual browsers "hide the broken image icon if the `alt` attribute is empty and the image failed to display". Omitting `alt` entirely is the case WAI warns about (some screen readers read the filename).

Only Spectrum states a default; only Spectrum states a requirement, and it does so in prose. Nobody in this set enforces `alt` in the type. Ultima's accessibility contract type-enforces three attributes today (`'aria-label'` on `Tooltip.Trigger`, one of `'aria-label' | 'aria-labelledby'` on `Sidebar.Panel`, and the same union on `Menubar`); a required `alt` on an avatar image would be the fourth, and it has no primitive-level precedent. Base UI's `keepMounted` `aria-hidden` is the one accessibility behaviour that is not the consumer's, and it turns off in the default mode.

#### Initials as fallback

Two models. Base UI, Radix and shadcn: the fallback is a layout slot the caller fills with text (`<Avatar.Fallback>LT</Avatar.Fallback>`), and the primitive does not know a name exists. Chakra and Mantine: a `name` prop and a `getInitials` helper on the fallback (Chakra) or the root (Mantine), with a generic person icon when there is no name. Spectrum has neither.

For Ultima's glyph-slot definition: a `Fallback` that takes initials from the caller is a layout slot, like `Alert.Icon` and `Empty.Icon`, not a glyph slot. A person icon shown when the caller supplies neither image nor initials, as Chakra's `Avatar.Icon` and Mantine's placeholder do, would be a glyph Ultima supplies with `children` as the override, which is exactly the `Breadcrumb.Separator` / `Pagination.Ellipsis` shape.

#### Group and stacked arrangement

| System | Group part | Element | Mechanism | Overflow count |
|---|---|---|---|---|
| Base UI, Radix, Ark | none | | | |
| shadcn | `AvatarGroup` | `<div data-slot="avatar-group">` | `flex -space-x-2`, and `*:data-[slot=avatar]:ring-2 ring-background` on each child root | `AvatarGroupCount`, a `<div>` sized by `group-has-data-[size=…]` selectors that read the children's `data-size` |
| Chakra v3 | `AvatarGroup` | Chakra `Group` with `gap="0" spaceX="-3"` | negative horizontal space; passes recipe props (size etc.) down through context; `stacking` prop controls overlap order | consumer renders a plain `Avatar.Root` with `<Avatar.Fallback>+3</Avatar.Fallback>` |
| Mantine | `Avatar.Group` | `Box` | `--ag-spacing` CSS variable from `spacing` (default `'sm'`), `AvatarGroupContext { withinGroup: true }`; children must be direct `Avatar`s (non-rendering wrappers like `Tooltip` allowed) | consumer renders an `Avatar` with `+5` as children |
| React Spectrum S2 | `AvatarGroup` | separate component | `size` `16 \| 20 \| 24 \| 28 \| 32 \| 36 \| 40` (default 24) applied to children; `label`, `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-details` | none |

In every case the group is a **sibling container component**, never a prop on the avatar root, and it owns two things: the negative spacing between children and, where the system has a `size`, a way to push one `size` onto all children (shadcn reads it back from the children's `data-size`; Chakra and Spectrum push it down). Spectrum is the only one that gives the group an accessible name; the others are unlabeled `<div>`s. shadcn is the only one with a dedicated count part, and it is a plain `div` with no behaviour.

#### shadcn's `AvatarBadge`

Both shadcn flavours also ship `AvatarBadge`, a `<span>` absolutely positioned bottom-right with a `ring-2 ring-background` and a size ladder keyed off the root's `data-size`. Chakra documents the same thing as a composition of `Float` and `Circle`. Neither the Radix nor the Base UI primitive knows about it.

### 6. Facts later tickets will need

- `Avatar.Root` emits no DOM attribute for `imageLoadingStatus`. A consumer that wants `[data-loaded]` styling on the root has to derive it from the `className`/`style` function form of `Root` or from `onLoadingStatusChange`.
- `Root` reads `idle` whenever no `Image` is mounted, and `Fallback` shows for `idle`; so `<Avatar.Root><Avatar.Fallback>LT</Avatar.Fallback></Avatar.Root>` is a complete initials-only avatar.
- Without `src` and without `srcSet`, the default `Image` sets `error` synchronously and never mounts. This is also why `render={<NextImage/>}` needs `keepMounted`.
- `keepMounted` writes `aria-hidden` on the `<img>` until `loaded`, in server HTML too. It is the only ARIA the primitive sets. The default mode sets none.
- `data-loading` and `data-error` exist **only** under `keepMounted`; `data-starting-style` exists in both modes; `data-ending-style` only in the default mode.
- Under `keepMounted`, the doc requires `Fallback` before `Image` in DOM order and both `position: absolute; inset: 0`, with `visibility: hidden` (never `display: none`) on `[data-loading]` and `[data-error]`.
- `Fallback.delay` is measured from `Fallback` mount and is `0` by default. A nonzero `delay` also removes the fallback from server HTML.
- `src`, `srcSet`, `sizes` are applied last on the `<img>` on purpose (React 17/18 attribute order, Safari and Firefox fetch on `src`).
- `useImageLoadingStatus` copies `referrerPolicy`, `crossOrigin`, `sizes`, `srcset`, `src` only; any other `<img>` attribute (`loading`, `decoding`, `fetchPriority`) does not reach the preloader.
- No system in this set type-requires `alt`; React Spectrum is the only one documenting a decorative default. Ultima's contract type-enforces three attributes today, all of them names on interactive or landmark roots (Tooltip.Trigger, Sidebar.Panel, Menubar).
- Every group is a sibling component. Three of the four push a `size` to children; shadcn reads it back from `data-size`.
- `shape`/`radius` is a fourth axis in Chakra and Mantine and has no place in Ultima's three; Chakra's `solid | subtle | outline` and Mantine's `filled | light | outline` map onto Ultima's `variant`, and their colour props onto `tone`.
- Ultima's control heights are 32/40/48. shadcn's avatar sizes are 24/32/40; Base UI's demo is 32.

## Sources

Paths below are relative to `~/Projects/private/ultima/node_modules/.pnpm/@base-ui+react@1.8.0_@types+react@19.2.18_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/@base-ui/react/`.

- `avatar/index.parts.d.ts` — the three exports `Root`, `Image`, `Fallback`; nothing else.
- `avatar/root/AvatarRoot.js`, `avatar/root/AvatarRoot.d.ts` — `<span>`; `useState('idle')`; context value `{ imageLoadingStatus, setImageLoadingStatus }`; `ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error'`; `AvatarRootProps extends BaseUIComponentProps<'span', AvatarRootState>` with no extra props.
- `avatar/root/stateAttributesMapping.js` — `imageLoadingStatus: () => null`, the reason no part emits a status attribute.
- `avatar/root/AvatarRootContext.js` — the throw text "Base UI: AvatarRootContext is missing. Avatar parts must be placed within <Avatar.Root>."
- `avatar/image/AvatarImage.js` — `src`/`srcSet`/`sizes` split and applied last with the React 17/18 and Safari/Firefox comment (l. 37–43); `useImageLoadingStatus(src, componentProps, !keepMounted)` (l. 48); `isVisible = status === 'loaded'` (l. 49); the `keepMounted` layout effect with the ref-missing branch, the `!image.complete` → `loading` branch, the `naturalWidth` branch and the first-commit `setMounted(true)` (l. 60–84); `renderedStatusProps` with `data-loading`, `data-error`, `aria-hidden` and the "fallback owns the accessible name" comment (l. 85–100); mirroring to root and `onLoadingStatusChange` for every status except `idle` (l. 105–109); reset to `idle` on unmount (l. 110–112); `useOpenChangeComplete` unmounting after exit animation (l. 113–122); `transitionStatus` forced `undefined` when `'ending'` under `keepMounted` with the reverse-animation comment (l. 123–128); `shouldRender = keepMounted || mounted` (l. 129).
- `avatar/image/AvatarImage.d.ts` — `keepMounted` prop doc: "Whether the image element stays mounted and loads in place instead of being preloaded. Supports `loading="lazy"` and optimized image components such as `next/image`. @default false"; `AvatarImageState` adds `transitionStatus`.
- `avatar/image/useImageLoadingStatus.js` — `enabled` guard; `!src && !srcSet` → `error`; `new window.Image()`; the copied attributes in order `referrerPolicy`, `crossOrigin ?? null`, `sizes`, `srcset`, `src`; the `image.complete` / `naturalWidth > 0` fast path; the `isMounted` cleanup; the dependency list.
- `avatar/image/AvatarImageDataAttributes.js` — `data-loading`, `data-error`, and `startingStyle`/`endingStyle` re-exported from `TransitionStatusDataAttributes`.
- `avatar/fallback/AvatarFallback.js`, `avatar/fallback/AvatarFallback.d.ts` — `<span>`; `delay` default `0`; `useState(delay === 0)`; the `useTimeout` effect and the "keep it visible" comment; `enabled: imageLoadingStatus !== 'loaded' && (delay === 0 || delayPassed)`.
- `internals/useRenderElement.js` — `if (params.enabled === false) return null` (l. 35–37), which is how `Fallback` and the default `Image` leave the DOM.
- `internals/useTransitionStatus.js` — `'starting'` on the first mounted render, cleared on the next frame; `'ending'` when `open` drops while mounted; `animateInitialOpen` default `false`.
- `internals/stateAttributesMapping.js` — `transitionStatusMapping` emitting `data-starting-style` / `data-ending-style`.
- `internals/useOpenChangeComplete.js` — waits for animations on `ref` before `onComplete`.
- `docs/react/components/avatar.md` — the shipped docs, headed "treat this documentation as authoritative": the Tailwind and CSS Modules demos with `Fallback delay={600}` and the bare `<Avatar.Root>LT</Avatar.Root>` (l. 21–115); the anatomy (l. 121–128); "Optimized and lazy-loaded images" with the `next/image` example `render={<Image src="/avatar.png" width={32} height={32} alt="" />}` (l. 130–143); "Stacking" including "The image is hidden from assistive technology until then, so the fallback provides the accessible name on its own", the `Fallback`-before-`Image` order, and "Avoid `display: none` here" (l. 145–170); "Server rendering" (l. 172–174); the API tables (l. 176–276).
- `CHANGELOG.md` — v1.8.0 "Add `keepMounted` prop to `<Avatar.Image>` (#5536)"; v1.4.0 "Show `<Avatar.Fallback>` immediately when `delay={0}` (#5147)"; v1.4.1 "Fix flash when image is cached (#4469)"; v1.3.0 "Remove fallback transition logic and prevent premature image display (#4110)"; v1.2.0 "Add transition attributes (#3939)"; v1.0.0-rc "Add Avatar component (#1210)", "Support cross origin in useImageLoadingStatus (#1433)".
- https://base-ui.com/react/components/avatar — the live page has the same headings, the same `keepMounted` / Stacking / Server rendering prose, and the same four Image data attributes as the shipped `avatar.md`.
- https://github.com/mui/base-ui/pull/5536 — the `keepMounted` PR, merged 2026-08-28 for v1.8.0: preload of the raw `src` conflicts with optimizers that "fetch transformed URLs", and "The `loading="lazy"` attribute never took effect because preloading was always eager"; linked issues #5529 and #2597.
- https://www.radix-ui.com/primitives/docs/components/avatar — props `asChild`, `onLoadingStatusChange`, `delayMs`; no size, shape, or group; the `delayMs` rationale "so it only renders for those with slower connections"; nothing on `alt`.
- https://raw.githubusercontent.com/radix-ui/primitives/main/packages/react/avatar/src/avatar.tsx — `Primitive.span` root, `Primitive.img` only when `Loaded`, `Primitive.span` fallback gated by `canRender && status !== Loaded`; `useImageLoadingStatus` with `new window.Image()`, `referrerPolicy`, `crossOrigin`, `image.complete`; `canRender` seeded `delayMs === undefined`; no ARIA, no `alt` handling.
- https://raw.githubusercontent.com/radix-ui/website/main/data/primitives/docs/components/avatar.mdx — anatomy and the `delayMs` wording.
- https://ui.shadcn.com/docs/components/avatar — exports `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`; `size` `"default" | "sm" | "lg"`; `alt="@shadcn"` in the example; `+3` count example; Radix, Base UI and React Aria flavours.
- https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/avatar.tsx — the Radix flavour: `data-size={size}`, `size-8 … data-[size=lg]:size-10 data-[size=sm]:size-6`, `rounded-full overflow-hidden`, `AvatarGroup` `flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background`, `AvatarGroupCount` sized by `group-has-data-[size=…]/avatar-group`, `AvatarBadge` `absolute right-0 bottom-0 … ring-2 ring-background`.
- https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/ui/avatar.tsx — the Base UI flavour, same six exports and the same `size` union, built on `@base-ui/react/avatar`.
- https://chakra-ui.com/docs/components/avatar — `size` `'full' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'` (default `md`), `shape` `'square' | 'rounded' | 'full'` (default `full`), `variant` `'solid' | 'subtle' | 'outline'` (default `subtle`), `colorPalette` (default `gray`), `borderless`, `onStatusChange`; `Avatar.Icon`; `AvatarGroup` with `stacking`; badge via `Float` + `Circle`; nothing on `alt`.
- https://raw.githubusercontent.com/chakra-ui/chakra-ui/main/packages/react/src/components/avatar/avatar.tsx — `getInitials` (first letter of first and last word); `Fallback` `name` prop, "If not provided, the fallback will display a generic icon"; `Image` defaults `draggable="false"`, `referrerPolicy="no-referrer"`, no default `alt`; `AvatarGroup` is `Group` with `gap="0" spaceX="-3"`; wraps Ark `Avatar.Root`/`Fallback`/`Image`.
- https://ark-ui.com/docs/components/avatar — Ark's headless parts: `<div>` root, `<img>`, `<span>` fallback with `data-state="hidden" | "visible"`; no size or shape; nothing on `alt`.
- https://mantine.dev/core/avatar/ — `size`, `radius`, `variant` values; `name` initials; `color="initials"` and `allowedInitialsColors`; "Set the `alt` prop to describe the image – it is also used as the `title` attribute for the avatar placeholder when the image cannot be loaded"; `Avatar.Group` `spacing` and the direct-children rule.
- https://raw.githubusercontent.com/mantinedev/mantine/master/packages/@mantine/core/src/components/Avatar/Avatar.tsx — prop docs: `size` "numbers are converted to rem @default 'md'", `radius` "@default '1000px'", `color` "@default 'gray'", `alt` "also used as `title` attribute for placeholder", `name` "used to display initials and to generate color"; `error` state from `onError`; `title={alt}` on the placeholder span.
- https://raw.githubusercontent.com/mantinedev/mantine/master/packages/@mantine/core/src/components/Avatar/get-initials/get-initials.ts — `getInitials(name, limit = 2)`, uppercased.
- https://raw.githubusercontent.com/mantinedev/mantine/master/packages/@mantine/core/src/components/Avatar/AvatarGroup/AvatarGroup.tsx — `Box` root, `spacing` default `'sm'` → `--ag-spacing`, `AvatarGroupContext { withinGroup: true }`.
- https://react-spectrum.adobe.com/react-spectrum/Avatar.html — v3 Avatar: "By default, avatars are decorative and have an empty `alt` attribute." and "Standalone avatars with no surrounding context must have a custom `alt` prop defined for accessibility."; sizes `avatar-size-50`..`avatar-size-700` or px; `isDisabled`; no shape, no fallback, no group.
- https://react-spectrum.adobe.com/Avatar — S2 Avatar: `size` `16 … 112` or number, default `24`; `isOverBackground`; no initials.
- https://react-spectrum.adobe.com/AvatarGroup — S2 AvatarGroup: `size` `16 | 20 | 24 | 28 | 32 | 36 | 40` (default 24), `label`, `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-details`.
- https://react-aria.adobe.com/ — the React Aria Components index; no Avatar component is listed.
- https://nextjs.org/docs/app/api-reference/components/image — `alt` required, "If the image is purely decorative … the `alt` property should be an empty string (`alt=""`)"; `loading` "Defaults to lazy"; `src`/`srcset` rewritten to `/_next/image?url=…&w=…&q=75`; `onLoad`; `ref` prop added in v13.0.6.
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/complete — `complete` is true with no `src`/`srcset`, with an empty `src`, when fully fetched, or when "broken"; the basis for the `complete` + `naturalWidth` check in both Base UI paths.
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img — `loading="lazy"` "Defers loading the image until it reaches a calculated distance from the viewport"; "Lazy-loaded images will never be loaded if they do not intersect a visible part of an element … because unloaded images have a `width` and `height` of `0`"; `alt=""` means decorative and "Visual browsers will also hide the broken image icon if the `alt` attribute is empty".
- https://www.w3.org/WAI/tutorials/images/decorative/ — "a null (empty) `alt` text should be provided (`alt=""`) so that they can be ignored by assistive technologies".
- `~/Projects/private/ultima/docs/spec/ultima.md` — "Variants, sizes, and tones" (l. 849–870): three axes and no others, `variant` is "shape and emphasis", `size` is "the three control heights"; control heights are steps 9, 10, 11 = 32/40/48 px (l. 77); `size` refused on Field (l. 631) and on Checkbox/Radio Group/Switch (l. 641); "Iconography" (l. 1108–1130): a glyph slot is an element "whose whole content is a glyph Ultima supplies", `Alert.Icon` and `Empty.Icon` are layout slots the caller fills; "Accessibility contract" (l. 976 ff.): the three type-enforced rows are Tooltip (l. 989), Sidebar (l. 997) and Menubar (l. 1022).
