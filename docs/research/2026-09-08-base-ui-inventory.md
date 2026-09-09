# What does Base UI ship today, and how does it take styles from an external engine?

## Findings

Base UI is `@base-ui/react` 1.8.0, stable since 1.0.0 on 2025-12-11, released monthly, MIT, no CSS in the package. It covers every interactive part of the v0 set (Dialog, Menu, Select, Tabs, Tooltip, Switch, Input, Meter, Toast, Button). Badge, Card, Table, Stat, and Code have no primitive; Ultima renders those as plain elements. Every part takes `className` and `style` as either a value or a function of the part's state, exposes state as `data-*` attributes, and can be swapped for another element or component through `render`. That contract fits StyleX with no adapter: `stylex.props()` returns `{className, style}`, and both keys are accepted by every Base UI part.

### Package, version, stability

- Package name is `@base-ui/react`. The old `@base-ui-components/react` is deprecated on npm with the message "Package was renamed to @base-ui/react"; its last version is `1.0.0-rc.0`.
- Current version is 1.8.0, published 2026-09-04. The `latest` dist-tag points at it. Version history since stable: 1.0.0 (2025-12-11), 1.1.0 (2026-01-15), 1.2.0 (2026-02-12), 1.3.0 (2026-03-12), 1.4.0 (2026-04-13), 1.4.1 (2026-04-20), 1.5.0 (2026-05-19), 1.6.0 (2026-06-18), 1.7.0 (2026-08-04), 1.8.0 (2026-09-04). Roughly one minor a month.
- GitHub releases v1.4.0 through v1.8.0 are all `prerelease=false`. The v1.0.0 release notes list one breaking change: the package rename.
- Peer dependencies: `react` and `react-dom` at `^17 || ^18 || ^19`. `@types/react`, `date-fns`, and `@date-fns/tz` are peers marked optional.
- Runtime dependencies: `@babel/runtime`, `@base-ui/utils`, `@floating-ui/utils`, `@floating-ui/react-dom`, `use-sync-external-store`. Floating UI's React hooks are vendored into the package under `packages/react/src/floating-ui-react/`, not pulled from `@floating-ui/react`.
- The 1.8.0 tarball has 3269 files and none of them is a `.css` file. The docs say the same: "Base UI components are unstyled, don't bundle CSS, and are compatible with Tailwind, CSS Modules, CSS-in-JS, or any other styling solution you prefer."
- Every component has its own subpath export (`@base-ui/react/dialog`, `@base-ui/react/menu`, and so on), plus `./merge-props`, `./use-render`, `./types`, `./csp-provider`, `./direction-provider`.

### Inventory against the v0 set

Full export list from `packages/react/package.json`: accordion, alert-dialog, autocomplete, avatar, button, checkbox, checkbox-group, collapsible, combobox, context-menu, dialog, drawer, field, fieldset, form, input, menu, menubar, meter, navigation-menu, number-field, otp-field, popover, preview-card, progress, radio, radio-group, scroll-area, select, separator, slider, switch, tabs, toast, toggle, toggle-group, toolbar, tooltip.

| v0 component | Base UI primitive | Notes |
|---|---|---|
| Dialog | `Dialog` | Parts: Root, Trigger, Portal, Backdrop, Viewport, Popup, Title, Description, Close. `AlertDialog` is a separate export that reuses the same root with `role="alertdialog"`. |
| Dropdown Menu | `Menu` | Parts: Root, Trigger, Portal, Backdrop, Positioner, Popup, Viewport, Arrow, Item, LinkItem, SubmenuRoot, SubmenuTrigger, Group, GroupLabel, RadioGroup, RadioItem, RadioItemIndicator, CheckboxItem, CheckboxItemIndicator, Separator. `ContextMenu` and `Menubar` are separate exports. |
| Select | `Select` | Parts: Root, Label, Trigger, Value, Icon, Portal, Backdrop, Positioner, Popup, ScrollUpArrow, ScrollDownArrow, Arrow, List, Item, ItemText, ItemIndicator, Separator, Group, GroupLabel. Renders a hidden `<input>` for form submission. |
| Tabs | `Tabs` | Parts: Root, List, Tab, Indicator, Panel. |
| Tooltip | `Tooltip` | Parts: Provider, Root, Trigger, Portal, Positioner, Popup, Arrow, Viewport. |
| Switch | `Switch` | Parts: Root, Thumb. Root renders `<span>` plus a hidden `<input type="checkbox">`. |
| Input | `Input` | Single part rendering a native `<input>`. Gets validation state attributes when wrapped in `Field.Root`. |
| Meter | `Meter` | Parts: Root, Label, Track, Indicator, Value. `Progress` is a separate export for task progress. |
| Toast | `Toast` | Parts: Provider, Portal, Viewport, Root, Content, Title, Description, Action, Close, Positioner, Arrow. Plus `useToastManager` and `createToastManager`. |
| Button | `Button` | Single part rendering a native `<button>`, with `nativeButton` and `focusableWhenDisabled` props. |
| Badge | none | Plain element. |
| Card | none | Plain element. |
| Table | none | Plain element. |
| Stat | none | Plain element. |
| Code | none | Plain element. |

Adjacent primitives Ultima may want later: `Field`, `Fieldset`, `Form` (validation state and labels for Input, Select, Switch), `Separator`, `Avatar`, `ScrollArea`, `Popover`.

### The styling contract

Every part's props type is `BaseUIComponentProps<ElementType, State>` in `packages/react/src/internals/types.ts`. It takes the element's native props, removes `className`, `color`, `defaultValue`, `defaultChecked`, and `style`, and adds three:

- `className?: string | ((state: State) => string | undefined)`
- `style?: React.CSSProperties | ((state: State) => React.CSSProperties | undefined)`
- `render?: React.ReactElement | ((props, state) => React.ReactElement)`

How those resolve, from `packages/react/src/internals/useRenderElement.tsx`:

1. `resolveClassName(className, state)` calls the function with the state if it is a function, else returns the string as is.
2. `resolveStyle(style, state)` does the same for `style`.
3. `getStateAttributesProps(state, mapping)` turns the state object into `data-*` attributes: a `true` value becomes `data-<key>=""`, a truthy non-boolean becomes `data-<key>="<value>"`, and `false`/`undefined`/`null` produce no attribute. Component-specific mappings override this (for example `transitionStatus: 'starting'` becomes `data-starting-style`).
4. The consumer `className` is merged with the internal one through `mergeClassNames(ours, theirs)`, which produces `"<theirs> <ours>"`. The consumer `style` is merged over the internal style object with `mergeObjects`.
5. If `render` is an element, Base UI merges its computed props with the element's own props (`mergeProps(props, render.props)`) and calls `React.cloneElement`. If `render` is a function, it calls `render(props, state)` and the function owns spreading. Otherwise it renders the default tag.

`mergeProps` rules (documented at `/react/utils/merge-props`): `className` strings concatenate, `style` objects merge with the rightmost key winning, event handlers chain with the rightmost running first, `ref` is not merged, and a handler can call `event.preventBaseUIHandler()` to stop Base UI's own logic.

The public `useRender` hook (`@base-ui/react/use-render`) gives Ultima's own plain-element components (Badge, Card, Table, Stat, Code) the same `render` prop and the same state-to-`data-*` conversion, so the whole system can share one composition contract.

### Passing StyleX output

`stylex.props(...styles)` returns `{ className: string; style: { [key: string]: string } }`, and dynamic styles land in `style` as CSS variables. Both keys are exactly what `BaseUIComponentProps` accepts, so the two paths are:

- Static: `<Dialog.Popup {...stylex.props(styles.popup)} />`. Base UI appends its own class after the StyleX one and merges the `style` object.
- State-driven: `<Switch.Thumb className={(s) => stylex.props(styles.thumb, s.checked && styles.thumbOn).className} />`, or select on `data-*` inside the StyleX rule (`':is([data-checked])'`), which keeps the class static and skips the function call. The data-attribute route is the one the docs demonstrate for CSS Modules and works unchanged with StyleX.
- Through `render` for elements StyleX already owns: `render={<MyCard />}` where `MyCard` forwards `ref` and spreads props, since Base UI clones the element and merges `className` and `style` into it.

Nothing in the library reads `className` back or requires a specific class, so generated atomic class names are fine.

### CSS variables the primitives expose

All set as inline styles on the part, readable from any stylesheet.

- Positioner (Menu, Select, Tooltip, Toast.Positioner, and the other anchored popups): `--anchor-width`, `--anchor-height`, `--available-width`, `--available-height`, `--transform-origin`, and on Menu and Tooltip also `--positioner-width` and `--positioner-height`. `useAnchorPositioning` seeds `--available-width: 100vw` and `--available-height: 100vh` on first render so `max-height: min(x, var(--available-height))` resolves before Floating UI measures.
- Viewport (Menu, Tooltip): `--popup-width`, `--popup-height` on the outgoing content container during content transitions.
- Dialog.Popup: `--nested-dialogs`.
- Tabs.Indicator: `--active-tab-left`, `--active-tab-right`, `--active-tab-top`, `--active-tab-bottom`, `--active-tab-width`, `--active-tab-height`.
- Toast.Root: `--toast-index`, `--toast-height`, `--toast-offset-y`, `--toast-swipe-movement-x`, `--toast-swipe-movement-y`. Toast.Viewport: `--toast-frontmost-height`.
- Meter.Indicator sets `insetInlineStart: 0` and `width: <percentage>%` inline; no variable.
- Switch, Input, Button, Meter.Root expose no CSS variables.

### Required CSS

Base UI ships no stylesheet, and the popups position themselves through inline styles, so the only CSS the library asks the app to provide is:

1. A stacking context on the app root so portaled popups sit above everything: `.root { isolation: isolate; }` (Quick Start).
2. For iOS 26+ Safari: `body { position: relative; }` so backdrops using `position: absolute` cover the visual viewport after scroll (Quick Start).
3. If the app runs a strict CSP: `ScrollArea.Viewport` and `Select.Popup`/`Select.List` (with `alignItemWithTrigger`) inject an inline `<style>` to hide native scrollbars. Wrap the app in `<CSPProvider nonce={...}>`, or pass `disableStyleElements` and supply the `.base-ui-disable-scrollbar` rule yourself.

What Ultima's stylesheet owns:

- Anchored popups (Menu, Select, Tooltip): the Positioner receives `position`, `top`/`left` (or the logical sides), and the variables above as inline styles from `useAnchorPositioning`. The Popup inside needs no positioning CSS. The docs demo styles `.Positioner { outline: 0 }` and gives `.Popup` `transform-origin: var(--transform-origin)` plus a `transition` on `transform` and `opacity` with `[data-starting-style]` and `[data-ending-style]` at `opacity: 0; transform: scale(0.98)`.
- Dialog: the Popup is not positioned by the library. The docs demo gives `.Popup` `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)` and `.Backdrop` `position: fixed; inset: 0; min-height: 100dvh`, switching to `position: absolute` under `@supports (-webkit-touch-callout: none)`.
- Transitions are opt-in. `data-starting-style` is the state to transition from, `data-ending-style` the state to transition to, alongside `data-open` and `data-closed`. Base UI waits for running transitions or `element.getAnimations()` before unmounting. The docs prefer transitions over keyframe animations because a transition can be cancelled midway. `keepMounted` keeps the closed popup in the DOM.
- Toast stacking: `z-index: calc(1000 - var(--toast-index))`, translate by `--toast-offset-y` and the swipe variables, and clamp collapsed height with `--toast-frontmost-height`.
- Focus rings: "it's the developer's responsibility to visually indicate focus" with `:focus-visible`.

### Data attributes per v0 primitive

- Dialog. Trigger: `data-popup-open`, `data-disabled`. Backdrop: `data-open`, `data-closed`, `data-starting-style`, `data-ending-style`. Viewport and Popup: those four plus `data-nested`, `data-nested-dialog-open`. Close: `data-disabled`.
- Menu. Trigger: `data-popup-open`, `data-pressed`, `data-disabled`. Positioner: `data-open`, `data-closed`, `data-anchor-hidden`, `data-align`, `data-side`. Popup: `data-open`, `data-closed`, `data-align`, `data-side`, `data-instant`, `data-starting-style`, `data-ending-style`. Item: `data-highlighted`, `data-disabled`. Arrow: `data-open`, `data-closed`, `data-uncentered`, `data-align`, `data-side`. Viewport: `data-activation-direction`, `data-current`, `data-previous`, `data-instant`, `data-transitioning`.
- Select. Trigger: `data-popup-open`, `data-popup-side`, `data-pressed`, `data-disabled`, `data-readonly`, `data-required`, `data-valid`, `data-invalid`, `data-dirty`, `data-touched`, `data-filled`, `data-focused`, `data-placeholder`. Value: `data-placeholder`. Icon: `data-popup-open`. Positioner and Popup: as Menu, with `data-side="none"` when `alignItemWithTrigger` is active. Item: `data-selected`, `data-highlighted`, `data-disabled`. ItemIndicator: `data-starting-style`, `data-ending-style`. Scroll arrows: `data-direction`, `data-side`, `data-visible`, `data-starting-style`, `data-ending-style`.
- Tabs. Root and List: `data-orientation`, `data-activation-direction`. Tab: those plus `data-active`, `data-disabled`. Indicator: `data-orientation`, `data-activation-direction`. Panel: `data-orientation`, `data-activation-direction`, `data-hidden`, `data-index`, `data-starting-style`, `data-ending-style`.
- Tooltip. Trigger: `data-popup-open`, `data-trigger-disabled`. Positioner, Popup, Arrow, Viewport: as Menu.
- Switch. Root and Thumb: `data-checked`, `data-unchecked`, `data-disabled`, `data-readonly`, `data-required`, `data-valid`, `data-invalid`, `data-dirty`, `data-touched`, `data-filled`, `data-focused`.
- Input: `data-disabled`, and inside `Field.Root` also `data-focused`, `data-filled`, `data-dirty`, `data-touched`, `data-valid`, `data-invalid`.
- Meter: none. `MeterRootState` is an empty interface.
- Toast. Viewport: `data-expanded`. Root: `data-type`, `data-expanded`, `data-limited`, `data-swiping`, `data-swipe-direction`, `data-starting-style`, `data-ending-style`. Content: `data-behind`, `data-expanded`. Title, Description, Action, Close: `data-type`. Positioner: `data-side`, `data-align`, `data-anchor-hidden`. Arrow: `data-side`, `data-align`, `data-uncentered`.
- Button: `data-disabled`.

### Accessibility guarantees

Library-wide (docs, Accessibility page): components follow the WAI-ARIA Authoring Practices for keyboard support (arrow keys, alphanumeric typeahead, Home, End, Enter, Escape), set ARIA and role attributes, manage focus, and expose `initialFocus` and `finalFocus`. The consumer owns visible focus indication, color contrast, and accessible names.

Per primitive, from source:

- Dialog: Popup gets `role="dialog"` (or `"alertdialog"` through `AlertDialog`), `aria-labelledby` from Title, `aria-describedby` from Description. Backdrop and Viewport are `role="presentation"`. Focus moves into the popup on open (`initialFocus`, default first tabbable), returns on close (`finalFocus`, default trigger). Tab and Shift+Tab loop inside. `modal: true` traps focus, locks scroll, and marks outside content with `aria-hidden` or `inert` through `markOthers`; `'trap-focus'` traps focus only; `false` leaves the page interactive. Escape closes.
- Menu: Trigger gets `aria-haspopup="menu"` and `aria-expanded`. Popup gets `role="menu"`, `aria-orientation` when horizontal, and `aria-labelledby` pointing at the trigger. Items get `role="menuitem"` (radio and checkbox items carry checked state). Arrow keys move highlight (looping by default), Enter and Space activate, typeahead matches item text, Escape closes, Tab closes and moves focus. GroupLabel labels its Group.
- Select: Trigger is `role="combobox"` with `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, `aria-labelledby` from Label. List is `role="listbox"` with `aria-multiselectable` and `aria-readonly` when set. Items are `role="option"` with `aria-selected`. Hidden `<input>` carries `name` for forms. Arrow keys, typeahead, Escape.
- Tabs: List is `role="tablist"` with `aria-orientation` when vertical. Tab is `role="tab"` with `aria-selected` and `aria-controls`. Panel is `role="tabpanel"` with `aria-labelledby` and the `hidden` attribute when inactive. Arrow keys move between tabs (`loopFocus`), `activateOnFocus` for automatic activation.
- Tooltip: no `role` is set on the popup and no `aria-describedby` on the trigger. The docs are explicit: "Tooltips are visual-only elements and are not a replacement for labeling the trigger. The tooltip's trigger must have an `aria-label` attribute that closely matches the tooltip's content." Opens on hover after `delay` (default 600ms), on focus, closes on Escape, disabled on touch. Provider shares delay across adjacent tooltips.
- Switch: Root gets `role="switch"`, `aria-checked`, `aria-readonly`, `aria-required`; keyboard activation (Space, Enter) comes from the shared `useButton`. A hidden `<input type="checkbox">` beside it carries `name` and form participation; with `nativeButton` the root is a `<button>` instead of a `<span>`.
- Input: a native `<input>`; the docs require an accessible name from a `<label>` or `Field.Label`. `Field` supplies validation state, `aria-invalid`, and error/description association.
- Meter: Root sets `role="meter"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (clamped), `aria-valuetext` (formatted percent by default, overridable with `getAriaValueText`), and `aria-labelledby` from Label.
- Toast: Viewport is `role="region"` with `aria-label="Notifications"`, `aria-live="polite"`, `aria-relevant="additions text"`, and `tabIndex=-1`; F6 jumps focus to it. High-priority toasts are additionally announced through an inner `role="alert"` node. Each Root is `role="dialog"` (or `"alertdialog"` when `priority: 'high'`) with `aria-modal="false"`, `aria-labelledby` from Title, `aria-describedby` from Description, and is `inert` when over the `limit`. Swipe to dismiss on pointer.
- Button: native `<button>` by default; with `nativeButton={false}` it keeps `role="button"` and keyboard handlers on the replacement element. `focusableWhenDisabled` keeps a disabled button in the tab order. Submit buttons need an explicit `type="submit"`. The docs say not to use it for links.

### Facts later tickets will need

- Install target: `@base-ui/react@^1.8.0`, React 17 to 19.
- Import per subpath (`@base-ui/react/dialog`) to keep bundles small; the root export also works.
- Global CSS Ultima must ship or document: `isolation: isolate` on the app root, `body { position: relative }` for iOS 26, and a Dialog Popup/Backdrop positioning rule since Dialog does not position itself.
- StyleX dynamic styles emit CSS variables into `style`; Base UI merges consumer `style` over its own, so a StyleX variable name that collides with a Base UI variable (`--available-height`, `--transform-origin`, `--toast-index`, and so on) would overwrite it. Namespace Ultima variables.
- The `render` prop clones the element with merged `className` and `style`, so any Ultima primitive that wants to be a valid `render` target must forward `ref` and spread props.
- `useRender` and `mergeProps` are public, so Ultima's non-Base-UI components can offer the same `render` contract.
- Tooltip content is not wired to the trigger for assistive tech. Ultima's Tooltip wrapper should enforce or derive an `aria-label` on the trigger.

## Sources

- https://www.npmjs.com/package/@base-ui/react (`npm view @base-ui/react version dist-tags time peerDependencies peerDependenciesMeta dependencies`): current version 1.8.0 published 2026-09-04, `latest` tag, full release timeline since 1.0.0 on 2025-12-11, peer and runtime dependencies, optional peers.
- `npm view @base-ui-components/react deprecated`: "Package was renamed to @base-ui/react"; last version `1.0.0-rc.0`.
- `npm pack @base-ui/react@1.8.0 --dry-run`: 3269 files, no `.css` in the tarball.
- https://github.com/mui/base-ui (`gh api repos/mui/base-ui/releases`): v1.4.0 through v1.8.0 tagged `prerelease=false`; repo description and default branch `master`.
- https://github.com/mui/base-ui/releases/tag/v1.0.0: package rename listed as the one breaking change.
- https://github.com/mui/base-ui/blob/master/packages/react/package.json: package name, MIT license, full list of subpath exports (the component inventory).
- https://base-ui.com/react/overview/quick-start: install command, component list, the `isolation: isolate` root rule, the iOS 26 `body { position: relative }` rule, "since Base UI is unstyled, you can use CSS-in-JS, plain CSS, or any other styling solution you prefer."
- https://base-ui.com/react/overview/releases: v1.8.0 on 2026-09-04 as latest; monthly cadence.
- https://base-ui.com/react/handbook/styling: `className` and `style` as string/object or function of state, data attributes, CSS variables, "Base UI components are unstyled, don't bundle CSS".
- https://base-ui.com/react/handbook/animation: `data-starting-style`, `data-ending-style`, `data-open`, `data-closed`, transitions preferred over animations, `element.getAnimations()` detection, `keepMounted`.
- https://base-ui.com/react/handbook/composition: `render` as element or function, custom components must forward `ref` and spread props, nesting `render` across components.
- https://base-ui.com/react/utils/use-render: `useRender` options (`render`, `props`, `state`, `ref`, `stateAttributesMapping`), state converted to `data-*`.
- https://base-ui.com/react/utils/merge-props: merge rules for `className`, `style`, handlers, `ref`; `preventBaseUIHandler`.
- https://base-ui.com/react/utils/csp-provider: `nonce`, which components inject inline `<style>`, `disableStyleElements` and `.base-ui-disable-scrollbar`.
- https://base-ui.com/react/overview/accessibility: WAI-ARIA APG keyboard support, focus management, developer responsibility for focus indication, contrast, and names.
- https://base-ui.com/react/components/dialog: anatomy and default elements, data attributes, `--nested-dialogs`, `initialFocus`/`finalFocus`, modal modes, keyboard.
- https://base-ui.com/react/components/menu: anatomy, data attributes, Positioner and Viewport CSS variables, keyboard and typeahead, submenu defaults.
- https://base-ui.com/react/components/select: anatomy, data attributes, Positioner variables, hidden input, `alignItemWithTrigger` and `data-side="none"`.
- https://base-ui.com/react/components/tabs: anatomy, data attributes, `--active-tab-*` variables, `loopFocus`, `activateOnFocus`.
- https://base-ui.com/react/components/tooltip: anatomy, Provider delays, data attributes, CSS variables, "Tooltips are visual-only elements" and the `aria-label` requirement, disabled on touch.
- https://base-ui.com/react/components/switch: Root renders `<span>` plus hidden `<input>`, data attributes, `nativeButton`.
- https://base-ui.com/react/components/input: native input, Field integration, data attributes, accessible-name requirement.
- https://base-ui.com/react/components/meter: anatomy, `value`/`min`/`max`/`format`, `getAriaValueText`.
- https://base-ui.com/react/components/toast: anatomy, Provider, `useToastManager`, `createToastManager`, data attributes, CSS variables, swipe, F6, live-region roles.
- https://base-ui.com/react/components/button: native button, `nativeButton`, `focusableWhenDisabled`, `data-disabled`, guidance on links and submit type.
- https://github.com/mui/base-ui/blob/master/packages/react/src/internals/types.ts: `BaseUIComponentProps` omits `className`, `color`, `defaultValue`, `defaultChecked`, `style` and redefines `className`, `render`, `style`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/types/index.ts: `ComponentRenderFn<Props, State>` and `BaseUIEvent.preventBaseUIHandler`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/utils/resolveClassName.ts: function-or-string resolution.
- https://github.com/mui/base-ui/blob/master/packages/react/src/internals/useRenderElement.tsx: order of resolution, `mergeClassNames`, `mergeObjects` for style, `cloneElement` for element `render`, direct call for function `render`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/internals/getStateAttributesProps.ts: `true` becomes `data-key=""`, truthy becomes `data-key="value"`, custom mappings override.
- https://github.com/mui/base-ui/blob/master/packages/react/src/internals/stateAttributesMapping.ts: `transitionStatus` mapped to `data-starting-style` / `data-ending-style`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/merge-props/mergeProps.ts: `mergeClassNames` returns `theirs + ' ' + ours`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/internals/useAnchorPositioning.ts: positioner inline `position`/`top`/`left`, seeding `--available-width: 100vw` and `--available-height: 100vh`, `opacity: 0` until positioned.
- https://github.com/mui/base-ui/blob/master/packages/react/src/meter/root/MeterRoot.tsx: `role="meter"`, `aria-valuemin/max/now/text`, `aria-labelledby`, empty `MeterRootState`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/meter/indicator/MeterIndicator.tsx: inline `insetInlineStart: 0` and `width: <percentage>%`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/switch/root/SwitchRoot.tsx: `role="switch"`, `aria-checked`, hidden `<input type="checkbox">`, `useButton`, `nativeButton`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/tabs/list/TabsList.tsx, `tabs/tab/TabsTab.tsx`, `tabs/panel/TabsPanel.tsx`: `role="tablist"`, `role="tab"` with `aria-selected`/`aria-controls`, `role="tabpanel"` with `aria-labelledby` and `hidden`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/select/trigger/SelectTrigger.tsx, `select/list/SelectList.tsx`, `select/item/SelectItem.tsx`: `role="combobox"` with `aria-haspopup="listbox"`, `role="listbox"`, `role="option"` with `aria-selected`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/menu/root/MenuRoot.tsx and `menu/item/useMenuItemCommonProps.ts`: `aria-haspopup="menu"`, `role="menu"`, `aria-labelledby`, `role="menuitem"`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/dialog/root/useRenderDialogRoot.tsx, `dialog/popup/DialogPopup.tsx`, `dialog/backdrop/DialogBackdrop.tsx`, `dialog/viewport/DialogViewport.tsx`: `role="dialog"` or `"alertdialog"`, `aria-labelledby`/`aria-describedby`, `role="presentation"` on Backdrop and Viewport.
- https://github.com/mui/base-ui/blob/master/packages/react/src/floating-ui-react/components/FloatingFocusManager.tsx and `floating-ui-react/utils/markOthers.ts`: `modal` focus trap, outside content marked with `aria-hidden` or `inert` (`data-base-ui-inert`).
- https://github.com/mui/base-ui/blob/master/packages/react/src/tooltip/root/TooltipRoot.tsx and `tooltip/popup/TooltipPopup.tsx`: trigger props are only dismiss and client-point handlers; popup props carry no `role`.
- https://github.com/mui/base-ui/blob/master/packages/react/src/toast/viewport/ToastViewport.tsx and `toast/root/ToastRoot.tsx`: `role="region"`, `aria-live="polite"`, F6 listener, inner `role="alert"`, per-toast `role="dialog"`/`"alertdialog"`, `aria-modal=false`, `inert` when limited, `--toast-*` inline variables.
- https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)/react/components/dialog/demos/hero/css-modules/index.module.css: consumer-owned `.Popup { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) }` and `.Backdrop { position: fixed; inset: 0 }` with the iOS `position: absolute` fallback.
- https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)/react/components/menu/demos/hero/css-modules/index.module.css: `.Positioner { outline: 0 }`, `.Popup { transform-origin: var(--transform-origin); transition: transform, opacity }` with `[data-starting-style]`/`[data-ending-style]`.
- https://stylexjs.com/docs/api/javascript/props/: `stylex.props()` returns `{ className: string; style: { [key: string]: string } }`; dynamic styles emit CSS variables in `style`.
