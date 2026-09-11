# What does Base UI ship for the v0.1 set — Field, Fieldset, Form, Checkbox, Checkbox Group, Radio, Slider, Combobox, Progress, Alert Dialog — and what does each cost to wrap under Ultima's rules?

## Findings

All eleven candidates exist in `@base-ui/react` 1.8.0 and all of them were already there at 1.0.0, the first stable release (2025-12-11). Nothing on the list is preview, experimental, or `unstable-`; the package has exactly one `unstable-` export and it is `./unstable-use-media-query`, which none of these touch. **There is no Textarea**, and Base UI never plans one: `Input` *is* `Field.Control` under another name, and the maintainers ship a committed type spec asserting `render={<textarea />}` with an `HTMLTextAreaElement` ref on both. The shapes Ultima would have to name itself are the combobox family: Base UI ships **two** filterable-input components, `Combobox` (value restricted to the item set) and `Autocomplete` (free-form text, suggestions only), and Autocomplete is mostly Combobox's parts re-exported.

Cost, one line each, in Ultima's terms:

| Component | Cost | Why |
| --- | --- | --- |
| Form | **Trivial** | One part, a `<form>`, no data attributes, no variables, no injection. All of the cost is the validation contract, not the styling. |
| Fieldset | **Trivial** | Two parts. The only real work is the UA reset (`border: 0; margin: 0; padding: 0`) and knowing `Legend` is a `<div>`, not a `<legend>`. |
| Checkbox Group | **Trivial** | One component, one `<div role="group">`, one data attribute. It is a provider with a box around it. |
| Progress | **Low** | Five parts that all paint, no variables, no injection — but `Track` has a two-rule CSS contract (`height`, `overflow: hidden`) and the indeterminate animation is 100% the consumer's, because Base UI writes no inline style at all in that mode. |
| Alert Dialog | **Low** | Six of its nine parts *are* Dialog's components, re-exported. Ultima's Dialog styles, transition, and overlay recipe apply verbatim. The only new facts are `role="alertdialog"`, `modal` forced true, and outside-click dismissal forced off. |
| Checkbox | **Low** | Two parts. `Indicator` needs one rule to stay hidden during its exit window and is an empty glyph slot. |
| Radio + Radio Group | **Low** | Two subpaths, three parts. Same shape as Checkbox plus a roving-tabindex group. `Radio.Indicator` is an empty glyph slot the demo fills with `::before`. |
| Field | **Moderate** | Seven parts, six elements, and the whole v0.1 milestone hangs off it: every other form control changes behavior inside `Field.Root`. Styling is easy; the association and validation contract is where the work is. |
| Slider | **High** | Seven parts, and three of them are second-clause parts. `Control` is read back with `getComputedStyle`, `Track` must carry an explicit size or the indicator has none, and `Thumb`'s focus ring has to be written `:has(:focus-visible)` because the focusable element is a nested visually-hidden `<input type="range">`. Plus the one new runtime injection in the set. |
| Combobox | **High** | 24 parts, two scroll contracts, a grid mode, chips, virtualization, and a second component (Autocomplete) sharing most of it. Bigger than Select by every measure. |
| Autocomplete | **High** | Not a separate cost so much as a second public surface over the same machinery: 21 parts, 14 of which are literally Combobox's components. |

### Existence, stability, and version

Every component below has its own subpath export in `packages/react/package.json` at tag `v1.8.0`.

| Asked for | Ships as | Subpath | Present at | Stability |
| --- | --- | --- | --- | --- |
| Field | `Field` | `@base-ui/react/field` | 1.0.0 | stable |
| Fieldset | `Fieldset` | `@base-ui/react/fieldset` | 1.0.0 | stable |
| Form | `Form` | `@base-ui/react/form` | 1.0.0 | stable |
| Checkbox | `Checkbox` | `@base-ui/react/checkbox` | 1.0.0 | stable |
| Checkbox Group | `CheckboxGroup` | `@base-ui/react/checkbox-group` | 1.0.0 | stable — **yes, one exists** |
| Radio | `Radio` | `@base-ui/react/radio` | 1.0.0 | stable |
| Radio Group | `RadioGroup` | `@base-ui/react/radio-group` | 1.0.0 | stable — **separate subpath, not `Radio.Group`** |
| Slider | `Slider` | `@base-ui/react/slider` | 1.0.0 | stable |
| Combobox / Autocomplete | **both**: `Combobox` and `Autocomplete` | `@base-ui/react/combobox`, `@base-ui/react/autocomplete` | 1.0.0 | stable |
| Progress | `Progress` | `@base-ui/react/progress` | 1.0.0 | stable |
| Alert Dialog | `AlertDialog` | `@base-ui/react/alert-dialog` | 1.0.0 | stable |
| **Textarea** | — | — | — | **does not exist** |

Nothing on this list is missing except Textarea, so the only v0.1 component Ultima would build from plain elements on these grounds is none of them. (The v0.1 milestone's Alert, Skeleton, Spinner, and Empty are outside this ticket's question; `Combobox.Empty` below is a part of Combobox, not the v0.1 `Empty` component.)

Two of the eleven have *parts* newer than 1.0.0, which matters only if Ultima ever needs to widen the peer range:

- `Combobox.InputGroup` and `Autocomplete.InputGroup` landed in 1.3.0 (PR #3745). `Combobox.Label` landed in 1.3.0 (#4167). `Combobox.Collection` / `createItems` landed in 1.8.0 (#5326).
- `Slider.Label` landed in 1.3.0 (#4167). Before that, a visible label had to be a plain element plus `aria-labelledby`.

No breaking rename, preview flag, or `Preview` suffix ever applied to any component on this list. For comparison, the two components that *did* carry preview markers were `Drawer` (unmarked in 1.3.0) and `OTPField` (renamed from `OTPFieldPreview` in 1.6.0).

### Is there a Textarea?

No, and the documented route is a `render` swap rather than a second component.

1. **`Input` is `Field.Control`.** `packages/react/src/input/Input.tsx` is, in full, `return <Field.Control ref={forwardedRef} {...props} />`. Its props type is `BaseUIComponentProps<'input', InputState>` with `InputState extends FieldControlState`. There is no second implementation, so anything true of `Field.Control` is true of `Input`.
2. **The maintainers ship a type spec for the textarea case.** `packages/react/src/input/Input.spec.tsx` is four lines: `const ref = React.useRef<HTMLTextAreaElement>(null); return <Input ref={ref} render={<textarea />} />;`. `packages/react/src/field/control/FieldControl.spec.tsx` is the same four lines for `Field.Control`. These are type-level specs that the repo typechecks, so `render={<textarea />}` with a textarea ref is a first-party supported signature, not a loophole.
3. **The Field integration is element-agnostic.** `FieldControl` contributes `id`, `disabled`, `name`, `aria-labelledby`, `value`/`defaultValue`, `onChange`, `onFocus`, `onBlur`, `onKeyDown`, a ref into `validation.inputRef`, and the `aria-invalid` / `aria-describedby` merge. `useRegisterFieldControl` reads `.value`; `useFieldValidation` reads the native `validity` object and calls `setCustomValidity`, both of which `<textarea>` has. The one element-specific branch is in `onKeyDown`: the Enter-key implicit-submission fallback is guarded by `event.currentTarget.tagName === 'INPUT'`, so it does not fire on a textarea — which is the correct behavior for a textarea anyway, since Enter there inserts a newline.
4. **Nothing documents multiline.** "textarea" and "multiline" appear nowhere in the prose of the Input, Field, Form, or Forms-handbook pages. The only textarea in the published docs is a plain `<textarea>` inside the Dialog and Drawer close-confirmation demos, not wired to Field at all. The Input page's SEO keyword list includes the string "Textarea Alternative", which is as close as the docs come to naming the pattern.

So: the `render` swap typechecks by the maintainers' own spec, and the Field wiring is element-agnostic by source inspection. What I cannot settle from source alone is runtime behavior under a real browser — whether `data-filled`, `data-dirty`, and `setCustomValidity` sequencing all behave on a textarea. That needs the component running, not reading. This worktree has no `node_modules`, so it was not run here.

### Parts, in anatomy order, and what each renders

Required means the component does not function without it. Optional means it can be omitted.

**Field** — `@base-ui/react/field`, 7 parts

| Part | Renders | Required? |
| --- | --- | --- |
| `Root` | `<div>` | Required. Provides the context every other part reads. |
| `Label` | `<label>` | Optional, but it is the name source — see the association section. |
| `Control` | `<input>` | Optional *as a part*: any Base UI form control (`Input`, `Select.Trigger`, `Switch`, `Checkbox.Root`, `RadioGroup`, `Slider.Root`, `Combobox.Input`) registers itself as the field's control instead. |
| `Description` | `<p>` | Optional. |
| `Item` | `<div>` | Optional. Groups one control inside a checkbox or radio group with its own label and description. |
| `Error` | `<div>` | Optional. |
| `Validity` | **no element** | Optional. Requires a function child taking the validity state. |

**Fieldset** — `@base-ui/react/fieldset`, 2 parts. `Root` renders `<fieldset>` (required); `Legend` renders a **`<div>`**, not a `<legend>` (optional). `Root` carries `aria-labelledby` pointing at the Legend's id, which is how a `<div>` can name a `<fieldset>`.

**Form** — `@base-ui/react/form`, 1 part. `Form` renders `<form>`. Not `Form.Root`; the export is the component.

**Checkbox** — `@base-ui/react/checkbox`, 2 parts. `Root` renders `<span>` **plus a hidden `<input>` beside it** (required); `Indicator` renders `<span>` (optional).

**Checkbox Group** — `@base-ui/react/checkbox-group`, 1 part. `CheckboxGroup` renders `<div role="group">`. Not `CheckboxGroup.Root`.

**Radio + Radio Group** — two subpaths, 3 parts. `RadioGroup` renders `<div role="radiogroup">` (required — the docs say "Radio is always placed within Radio Group", and `Radio.Root` reads `checkedValue` from the group context); `Radio.Root` renders `<span>` plus a hidden `<input>` beside it (required); `Radio.Indicator` renders `<span>` (optional).

**Slider** — `@base-ui/react/slider`, 7 parts

| Part | Renders | Required? |
| --- | --- | --- |
| `Root` | `<div role="group">` | Required. |
| `Label` | `<div>` | Optional. Without it, each `Thumb` needs `aria-label`. |
| `Value` | `<output>` | Optional. |
| `Control` | `<div>` | Required. It is the drag surface and the element the pointer math measures. |
| `Track` | `<div>` | Required if `Indicator` or `Thumb` is used — Base UI gives it the inline `position: relative` both of them resolve against. |
| `Indicator` | `<div>` | Optional. |
| `Thumb` | `<div>` **plus a nested `<input type="range">`** | Required. One per value; `index` is needed per thumb for SSR of a range slider. |

**Progress** — `@base-ui/react/progress`, 5 parts, anatomy order `Root > Label, Track > Indicator, Value`. `Root` renders `<div role="progressbar">` (required); `Label` renders `<span role="presentation">`; `Track` renders `<div>`; `Indicator` renders `<div>`; `Value` renders `<span aria-hidden>`. All four children optional.

**Alert Dialog** — `@base-ui/react/alert-dialog`, 9 parts, anatomy order `Root > Trigger, Portal > Backdrop, Viewport > Popup > Title, Description, Close`. **Only three are its own:** `Root`, `Trigger`, and the `Handle`/`createHandle` pair. `Backdrop`, `Close`, `Description`, `Popup`, `Portal`, `Title`, and `Viewport` are re-exports of the Dialog components of the same name, from `alert-dialog/index.parts.ts`. `Root` renders no element; `Trigger` and `Close` render `<button>`; `Title` renders `<h2>`; `Description` renders `<p>`; the rest render `<div>`.

**Combobox** — `@base-ui/react/combobox`, 24 parts

`Root` (no element, required) > `Label` (`<div>`) > `InputGroup` (`<div role="group">`) > `Input` (`<input>`), `Trigger` (`<button>`), `Icon` (`<span>`), `Clear` (`<button>`), `Value` (no element), `Chips` (`<div>`) > `Chip` (`<div>`) > `ChipRemove` (`<button>`); then `Portal` (`<div>`) > `Backdrop` (`<div>`) > `Positioner` (`<div>`) > `Popup` (`<div>`) > `Arrow` (`<div>`), `Status` (`<div>`), `Empty` (`<div>`), `List` (`<div>`) > `Row` (`<div>`) > `Item` (`<div>`) > `ItemIndicator` (`<span>`), plus `Separator` (`<div>`), `Group` (`<div>`) > `GroupLabel` (`<div>`), and `Collection` (no element).

Required for a working combobox: `Root`, `Input`, `Portal`, `Positioner`, `Popup`, `List`, `Item`. Everything else is optional. `Row` is only for `grid` mode. `Chips`/`Chip`/`ChipRemove` are only for `multiple`. `Collection` is the 1.8.0 `createItems` API.

**Autocomplete** — `@base-ui/react/autocomplete`, 21 parts. Its own: `Root`, `Value`, `Trigger`, `InputGroup`, `Item`, `Separator`. Re-exported from Combobox verbatim: `Input`, `Icon`, `Clear`, `List`, `Status`, `Portal`, `Backdrop`, `Positioner`, `Popup`, `Arrow`, `Group`, `GroupLabel`, `Row`, `Collection`, `Empty`. It has **no** `Label`, `Chips`, `Chip`, `ChipRemove`, or `ItemIndicator`, because its input holds free text rather than a selection.

### Where each part falls under the Styled parts rule

Ultima's rule, both clauses: *a part carries Ultima styles if it paints or sets its own type or spacing, and also when the primitive's behavior depends on CSS the primitive does not supply.* Second-clause parts are marked **[clause 2]** — those are the expensive ones.

**Field.** `Root` styled (it owns the vertical rhythm between label, control, description, and error; the maintainers' demo gives it `display: flex; flex-direction: column; gap`). `Label` styled (type). `Control` styled — and it is Ultima's existing Input, so the decision is whether `Field.Control` is a separate part at all or documented as `render={<Input />}`. `Description` styled (type, plus `margin: 0` to kill the UA `<p>` margin). `Error` styled (type and danger colour). `Item` styled (it is the per-row `display: flex; gap` in a group). `Validity` renders no element, so there is nothing to style — the only part in the v0.1 set with no DOM at all.

**Fieldset.** `Root` styled, and it is the one part in the set whose styling exists mostly to *undo* something: the UA stylesheet gives `<fieldset>` a border, margin, and padding, and the demo resets all three. `Legend` styled (type, and the demo's bottom border).

**Form.** Styled only if a form has layout, which it does; nothing the primitive needs.

**Checkbox.** `Root` styled (box, border, background, the `[data-checked]` fill). `Indicator` **[clause 2]** — `keepMounted` defaults to `false`, so the indicator unmounts when unchecked, but only *after* its exit transition finishes (`shouldRender = keepMounted || mounted`, with `mounted` coming from `useTransitionStatus`). During that window it is in the DOM carrying `data-unchecked`, and the demo's `&[data-unchecked] { display: none }` is what keeps it invisible. Leave the rule out and the glyph flashes on uncheck. Also a glyph slot.

**Checkbox Group.** Styled (column layout and gap). Nothing the primitive needs.

**Radio Group / Radio.** `RadioGroup` styled (layout). `Radio.Root` styled (circle, border, `[data-checked]` fill). `Radio.Indicator` **[clause 2]**, same `data-unchecked` rule as Checkbox, plus the demo paints the dot with a `::before` rather than a glyph.

**Slider.** The expensive one.

| Part | Verdict |
| --- | --- |
| `Root` | Groups. Pass through — the hero demo gives it no CSS at all. |
| `Label` | Styled (type). |
| `Value` | Styled (type). |
| `Control` | **[clause 2]**, twice over. `SliderControl` caches `getComputedStyle(element)` and reads `borderInlineStartWidth`/`paddingInlineStart` (and the block equivalents when vertical) to compute the drag offset, so the Control's own box model is an input to the pointer math. Separately, the demo's `touch-action: none` is what stops a touch drag from scrolling the page, and `user-select: none` is what stops a drag from selecting text. Base UI supplies none of the three. |
| `Track` | **[clause 2]**. Base UI gives it exactly one inline style, `position: relative`. `Slider.Indicator`'s inline style is `height: inherit` (horizontal) or `width: inherit` (vertical), so if the Track has no explicit cross-axis size the indicator inherits `auto` and has no size — a silent failure, the Collapsible.Panel shape again. |
| `Indicator` | Styled (paints). Position and length come inline. |
| `Thumb` | Styled (paints) — **and the focus ring cannot be written the way every other Ultima control writes it.** The focusable element is the nested visually-hidden `<input type="range">`, not the Thumb `<div>`, so both maintainers' demos use `&:has(:focus-visible)` on the Thumb. `:focus-visible` on the Thumb itself never matches. |

**Progress.**

| Part | Verdict |
| --- | --- |
| `Root` | Styled (the demo makes it the grid that places label, value, and track). |
| `Label` | Styled (type). |
| `Value` | Styled (type, right-aligned). |
| `Track` | **[clause 2]**. Same `height: inherit` problem as Slider.Track — `Progress.Indicator` sets `height: inherit` inline, so Track needs an explicit height. It also needs `overflow: hidden`, which is what clips the indicator. |
| `Indicator` | Styled (paints) — **and [clause 2] in indeterminate mode.** When `value` is `null` or non-finite, `ProgressIndicator` computes `indicatorStyle = {}` and sets **no inline style at all**: no width, no inset. The entire indeterminate animation is the consumer's CSS. In determinate mode it sets `insetInlineStart: 0; height: inherit; width: <n>%`, and the `transition: width` that makes the fill move smoothly is still the consumer's (`transition: width 500ms` in the demo). |

**Alert Dialog.** Identical to Ultima's existing Dialog row, because the parts are the same components: `Viewport`, `Backdrop`, `Popup`, `Title`, `Description` styled; `Root`, `Trigger`, `Portal`, `Close` pass through, with `Trigger` and `Close` falling under the wrapper-trigger rule. `Popup` stays `[clause 2]` for the same reason `Dialog.Popup` is: the library does not position it, so `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)` is the consumer's, and so is the `@supports (-webkit-touch-callout: none) { position: absolute }` iOS backdrop fallback.

**Combobox.** Eight of the 24 parts are pass-through by clause 1: `Root`, `Value`, and `Collection` render no element at all, and `Portal`, `Backdrop`, `Group`, `Row`, and `Chips` only group or portal. The other sixteen paint or set type. Three of those are clause 2:

| Part | Verdict |
| --- | --- |
| `Positioner` | `outline: 0` and nothing else, the same near-exception Menu, Select, and Tooltip already take. |
| `Popup` | **[clause 2]**. Needs `width: var(--anchor-width)` to match the input's width and `max-width: var(--available-width)` not to overflow the viewport, plus `transform-origin: var(--transform-origin)` for the transition. |
| `List` | **[clause 2]**, the load-bearing one. It must be its own scroll container: `overflow-y: auto; overscroll-behavior: contain; max-height: min(<n>, var(--available-height))`. Without it a long filtered list runs off the screen, and the scroll-into-view that follows the keyboard highlight has nothing to scroll. The demo also sets `outline: 0`, `padding-block`, and a matching `scroll-padding-block` so the first and last items are not flush against the clip edge. |
| `Item` | Styled, and it owns the indicator gutter: `display: grid; grid-template-columns: 1rem 1fr` with `ItemIndicator` in column 1. Same shape as Ultima's Select leading-indicator slot. |
| `InputGroup` | Styled. The demo makes it the bordered box with `:focus-within` for the ring, and `position: relative` so the absolutely-positioned Trigger and Clear sit inside it. |
| `Input` | Styled, but `border: none` and `outline: none` — the border and ring live on `InputGroup`, which inverts Ultima's Input-owns-its-own-box assumption. |

When `Combobox.Popup` holds the input (the input-inside-popup pattern) the Popup becomes `role="dialog"` instead of `role="presentation"`, and the demo's `max-height` arithmetic then has to subtract the input's height — the demos do it with an author-declared `--input-container-height` on the Popup, which is **not** a Base UI variable.

**Autocomplete.** Same verdicts, part for part, since 14 of the parts are the same components.

### Data attributes per part

**Field.** Every element-rendering part — `Root`, `Item`, `Label`, `Control`, `Description`, `Error` — carries the identical seven: `data-disabled`, `data-valid`, `data-invalid`, `data-dirty`, `data-touched`, `data-filled`, `data-focused`. `Error` adds `data-starting-style` and `data-ending-style`. This is one set of state mirrored onto six elements, which means a StyleX rule can key off state on whichever part needs it without lifting anything.

**Fieldset** and **Form.** None. No data attributes on any part.

**Checkbox.** `Root` and `Indicator` both: `data-checked`, `data-unchecked`, `data-disabled`, `data-readonly`, `data-required`, `data-indeterminate`, plus the six Field ones (`data-valid`, `data-invalid`, `data-dirty`, `data-touched`, `data-filled`, `data-focused`) which appear only inside `Field.Root`. `Indicator` adds `data-starting-style` / `data-ending-style`.

**Checkbox Group.** `data-disabled`, and nothing else.

**Radio Group.** `data-disabled`, and nothing else. **Radio.Root** and **Radio.Indicator**: as Checkbox minus `data-indeterminate`; `Indicator` adds the two transition attributes.

**Slider.** `Root`, `Value`, `Indicator`, `Track`, `Thumb`, `Control` all carry the same set: `data-dragging`, `data-orientation` (`'horizontal' | 'vertical'`), `data-disabled`, and the Field five (`data-valid`, `data-invalid`, `data-dirty`, `data-touched`, `data-focused` — note **no** `data-filled`). `Thumb` adds `data-index`. `Label` has none. `Indicator` additionally gets a bare `data-base-ui-slider-indicator` attribute, but only when `thumbAlignment="edge"`.

**Progress.** `Root`, `Value`, `Indicator`, `Track`, `Label` all carry the same three: `data-complete`, `data-indeterminate`, `data-progressing`. Exactly one is present at a time.

**Alert Dialog.** `Trigger`: `data-popup-open`, `data-disabled`. `Backdrop`: `data-open`, `data-closed`, `data-starting-style`, `data-ending-style`. `Popup` and `Viewport`: those four plus `data-nested` and `data-nested-dialog-open`. `Close`: `data-disabled`. `Portal`, `Title`, `Description`: none. Identical to Dialog's.

**Combobox.** `Input`, `Trigger`, `InputGroup`, and `Group` share a long set: `data-popup-open`, `data-popup-side`, `data-list-empty`, `data-pressed`, `data-disabled`, `data-readonly`, `data-required` (Input and Trigger only), `data-valid`, `data-invalid`, `data-dirty`, `data-touched`, `data-filled`, `data-focused`, `data-placeholder`. `Clear`: `data-popup-open`, `data-disabled`, `data-visible`, `data-starting-style`, `data-ending-style`. `Positioner`: `data-open`, `data-closed`, `data-anchor-hidden`, `data-align`, `data-side`, `data-empty`. `Popup`: those six plus `data-starting-style` / `data-ending-style`. `Arrow`: `data-open`, `data-closed`, `data-uncentered`, `data-align`, `data-side`. `Item`: `data-selected`, `data-highlighted`, `data-disabled`. `ItemIndicator`: `data-starting-style`, `data-ending-style`. `Backdrop`: the four open/closed/transition ones. `List`, `GroupLabel`, `Separator`, `Label`, `Status`, `Empty`, `Row`, `Chips`, `Chip`, `ChipRemove`, `Icon`: none.

**Autocomplete.** The same, with two differences: `Item` has only `data-highlighted` and `data-disabled` (no `data-selected`, because there is no selection), and neither `Trigger` nor `InputGroup` carries `data-placeholder`.

### CSS variables each part exposes

This is the short section. **Nine of the eleven components expose no CSS variables at all:** Field, Fieldset, Form, Checkbox, Checkbox Group, Radio, Radio Group, Progress, and (see the caveat) Slider. The two that do, expose only variables Ultima already handles.

- **`AlertDialog.Popup`**: `--nested-dialogs` (a count), exactly as `Dialog.Popup`.
- **`Combobox.Positioner`** and **`Autocomplete.Positioner`**: `--anchor-width`, `--anchor-height`, `--available-width`, `--available-height`, `--transform-origin`. The same five `useAnchorPositioning` seeds on every other anchored popup, including the `100vw`/`100vh` first-render seed so `max-height: min(x, var(--available-height))` resolves before Floating UI measures. Nothing Combobox-specific, and no `--popup-width` / `--popup-height` because neither has a content-morphing Viewport.
- **`Slider`, conditionally.** With the default `thumbAlignment="center"`, no variables. With `thumbAlignment="edge"` or `"edge-client-only"`, `SliderIndicator` writes `--start-position` inline (and `--relative-size` as well for a range slider), and `SliderThumb` writes `--position` inline, then reads each back in the same inline style object. They are an internal indirection, not an extension point: the consumer never needs to read them, and overwriting them breaks the thumb's placement.
- **Not Base UI's:** `--input-container-height` and `--total-size` appear in the Combobox and Autocomplete demos and are **author-declared** in those demos' own CSS and inline styles. They are not set by the library and must not be treated as a contract.
- `Progress.Indicator` and `Slider.Indicator` set sizes as plain inline `width` / `height`, with no variable.

### Required CSS — what breaks without a rule Base UI does not ship

Base UI still ships no stylesheet, so the global rules from the v0 note stand unchanged: `isolation: isolate` on the app root, `body { position: relative }` for iOS 26, and the consumer-owned Dialog positioning. What this set adds:

1. **`Fieldset.Root` needs a UA reset.** `border: 0; margin: 0; padding: 0`. Without it every fieldset arrives with the browser's groove border and 2px inline padding.
2. **`Slider.Track` and `Progress.Track` need an explicit cross-axis size.** Their indicators are `height: inherit` / `width: inherit`. No size on the track, no visible indicator, and nothing in the console.
3. **`Progress.Track` needs `overflow: hidden`**, which is what clips the indicator — and the determinate `transition: width` is the consumer's too.
4. **Progress indeterminate mode has no inline style whatsoever.** Base UI computes `{}`. The whole animation is a rule Ultima writes, keyed on `[data-indeterminate]`.
5. **`Slider.Control` needs `touch-action: none` and `user-select: none`.** Without the first, a touch drag scrolls the page instead of moving the thumb; without the second, a pointer drag selects text. Base UI supplies neither and the demos supply both.
6. **`Slider.Control`'s border and padding are read back.** `getComputedStyle` caches them and subtracts them from the drag math. Changing the Control's padding is a behavioral change, not a cosmetic one.
7. **`Slider.Thumb`'s ring must be `:has(:focus-visible)`.** The focus target is the nested visually-hidden range input.
8. **`Checkbox.Indicator` and `Radio.Indicator` need `[data-unchecked] { display: none }`** (or an equivalent), or the glyph is visible through the exit-transition window.
9. **`Combobox.List` and `Autocomplete.List` must be a scroll container**: `overflow-y: auto; overscroll-behavior: contain; max-height: min(<n>, var(--available-height))`, plus matching `padding-block` and `scroll-padding-block`.
10. **`Combobox.Popup` needs `width: var(--anchor-width); max-width: var(--available-width)`** to track the input.
11. **`AlertDialog.Popup` and `AlertDialog.Backdrop` need the Dialog positioning rules**, verbatim, because they are the Dialog components.
12. **`Field.Description` needs `margin: 0`** — it is a `<p>`.

### Accessibility: what Base UI supplies, what Ultima owns

Split the way Ultima's Accessibility contract splits it.

| Component | Roles and ARIA Base UI sets | Keyboard and focus Base UI handles | Name source and element choice Ultima owns |
| --- | --- | --- | --- |
| Field | No role. `Label` → `<label htmlFor>` plus a registered `labelId` the control reads as `aria-labelledby`. `Description` and `Error` ids are collected into the control's `aria-describedby`. `aria-invalid="true"` on the control when invalid and not disabled. | Native. `Enter` inside a `Form` triggers validation once (the implicit-submission fallback). | Which part is the control. Whether `Label` is a real `<label>` (`nativeLabel`, default `true`; it `error()`s in dev if the rendered tag disagrees). The `Error`/`Description` wording. |
| Fieldset | `Root` gets `aria-labelledby` pointing at `Legend`'s id. | Native. | Whether to use `Fieldset` at all versus `aria-labelledby` on the group. |
| Form | Nothing beyond `<form>`. On submit it focuses the first invalid field in document order (since 1.7.0). | Native submission. | The submit button's `type="submit"`, and error message copy. |
| Checkbox | `Root`: `role="checkbox"`, `aria-checked` (`"mixed"` when indeterminate), `aria-readonly`, `aria-required`, and automatic `aria-labelledby` (since 1.3.0). The beside-input is `tabIndex={-1}`, `aria-hidden`, visually hidden. | `useButton` supplies Space and Enter; Enter submits the owning form (since 1.5.0). | The accessible name — an enclosing `<label>`, `Field.Label`, or `aria-label`. Whether `nativeButton` is set: default `false` means a `<span role="checkbox">`, which is what makes the enclosing-`<label>` pattern legal; the docs recommend `nativeButton` with sibling `htmlFor`/`id` labels. |
| Checkbox Group | `role="group"`, `aria-labelledby` from the labelable scope. The **group**, not each checkbox, is the field's control. | Native Tab between checkboxes. No roving tabindex. | The group's name — `aria-labelledby` to a sibling, or `Field.Label` + `Fieldset`. |
| Radio Group | `role="radiogroup"`, `aria-required`, `aria-disabled`, `aria-readonly`, `aria-labelledby`. | `CompositeRoot`: roving tabindex, arrow keys move **and** select, looping. `enableHomeAndEndKeys={false}` — Home and End are deliberately off, per the APG radio pattern. Space selects. | The group's name. Per-radio labels. |
| Radio | `Root`: `role="radio"`, `aria-checked`, automatic `aria-labelledby`. 1.7.0 removed redundant ARIA from `Radio.Root`. | From the group's composite, plus `useButton`. | Per-radio name; `nativeButton` choice, same trade as Checkbox. |
| Slider | `Root`: `role="group"`, `aria-labelledby`. Each `Thumb`'s nested `<input type="range">` carries `aria-orientation`, `aria-valuenow`, `aria-valuetext` (locale-formatted by default, overridable per thumb), `aria-labelledby` or `aria-label`, `disabled`, `min`, `max`, `step`, `name`, `form`. `Value` is an `<output htmlFor>` with `aria-live="off"` by default — deliberately, so dragging does not spam the live region. | Arrow keys (RTL-aware), Shift+arrow and PageUp/PageDown for `largeStep`, Home and End (clamped to the neighbouring thumb in a range slider). Focus is restored with `focusVisible: true` after a keyboard change. | `Slider.Label`, or `aria-label` per `Thumb` when there is no visible label. For a multi-thumb slider, a distinct `aria-label` per thumb — the group label alone does not distinguish them. |
| Progress | `Root`: `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (clamped; omitted when indeterminate), `aria-valuetext` (defaults to `'indeterminate progress'` when indeterminate, else the formatted value), `aria-labelledby` from `Label`. It also appends a visually hidden `<span role="presentation">x</span>` inside `Root` purely to force NVDA to read the label (mui/base-ui#4184). `Label` is `role="presentation"`; `Value` is `aria-hidden`. | None. Not focusable. | `Progress.Label`. Whether the visible `Value` text and `aria-valuetext` agree — Base UI derives both from the same formatted value, so overriding one means overriding the other. |
| Alert Dialog | `Popup`: `role="alertdialog"`, `aria-labelledby` from `Title`, `aria-describedby` from `Description`. `modal` is **forced `true`** and `disablePointerDismissal` is **forced `true`** — neither is a prop on `AlertDialog.Root`, because the type `Omit`s them from `DialogRoot.Props`. Backdrop and Viewport are `role="presentation"`. | Dialog's: focus into the popup on open, Tab loops inside, focus returns to the trigger on close, Escape closes. **Clicking the backdrop does not close it** — that is the whole difference from Dialog. `initialFocus` and `finalFocus` on `Popup`. | `AlertDialog.Title`, always rendered (Base UI sets `aria-labelledby` only when one exists). The confirm/cancel button labels and which one takes `initialFocus`. |
| Combobox | The input gets `role="combobox"`, `aria-expanded`, `aria-haspopup` (`"listbox"`, or `"grid"` in grid mode), `aria-controls`, `aria-autocomplete` (`"none"` when readonly), `autoComplete="off"`, `spellCheck="false"`, `autoCorrect="off"`, `autoCapitalize="none"`, plus `aria-activedescendant` for virtual focus. `List`: `role="listbox"` (or `"grid"`), `aria-multiselectable`, `aria-readonly`, `tabIndex={-1}`. `Item`: `role="option"` (or `"gridcell"` in a Row), `aria-selected`. `Row`: `role="row"`. `Group`: `role="group"` (or `"rowgroup"` in grid mode, since 1.8.0), `aria-labelledby`. `GroupLabel`: `aria-hidden` (1.8.0 hid group labels from the tree). `Status` and `Empty`: `role="status"`, `aria-live="polite"`, `aria-atomic`. `Chips`: `role="toolbar"` when it holds selection chips, to stop NVDA entering browse mode. `Icon`: `aria-hidden`. `Popup`: `role="presentation"`, or `role="dialog"` when the input is inside it. | Arrow keys with `loopFocus` defaulting to `true`, Enter to select, Escape to close, typeahead on the Trigger, grid-aware arrow handling, scroll-into-view on highlight, focus trapping for the modal and input-inside-popup patterns. | **The name, and it depends on the pattern.** If `Combobox.Input` is the form control, name it with a native `<label>`, `Field.Label`, or `aria-label`. `Combobox.Label` names the **Trigger**, not the Input, and exists for the input-inside-popup pattern where the Trigger is the control. Getting this backwards gives an unnamed combobox. |
| Autocomplete | Same as Combobox, minus `aria-selected` on items. | Same, plus `mode` (`'list' | 'both' | 'inline' | 'none'`) controlling whether the input text is completed. | The name — `<label>`, `Field.Label`, or `aria-label`. There is no `Autocomplete.Label` part. |

#### Field specifically: how the name, description, and error get associated, and which attribute carries the error

Four mechanisms, all in `internals/labelable-provider/` and `field/root/useFieldValidation.ts`:

1. **The name is associated twice.** `Field.Label` calls `useLabel({ native: true })`, which returns `{ id, htmlFor: controlId, onMouseDown }` — a real `<label for>`. It *also* registers its own id into the labelable context as `labelId`, and `FieldControl` reads that back and emits `aria-labelledby={labelId}`. So the label-to-control link exists natively *and* through ARIA. `controlId` comes from `LabelableProvider`, which keeps a `Map` of registered control ids so a checkbox or radio **group** can claim the role of "the field's control" instead of an individual checkbox — that is the comment in `CheckboxGroup.tsx`: "The group is the field's control and takes its name from `aria-labelledby`". Setting `nativeLabel={false}` drops `htmlFor` and substitutes a click handler that focuses the control by id, which is what you want when the control is a `<button>` like `Select.Trigger`.
2. **The description and the error share one channel.** Both `Field.Description` and `Field.Error` generate an id with `useBaseUiId` and push it into the context's `messageIds` array on mount, removing it on unmount. `LabelableProvider.getDescriptionProps` then concatenates the parent scope's message ids and the local ones, de-duplicates, and emits a single space-separated **`aria-describedby`** onto the control. `Field.Error` only registers when it is actually rendered (`hasFormError || validityData.state.valid === false`), so the error id enters and leaves `aria-describedby` as the error appears and disappears. There is no separate `aria-errormessage`.
3. **The attribute that carries the error is `aria-invalid`.** `getValidationProps` in `useFieldValidation.ts` merges the describedby props with `{ 'aria-invalid': true }` when `state.valid === false && !state.disabled && !disabled`. Nothing else. It is a boolean on the control, and the message itself reaches assistive tech through `aria-describedby`.
4. **Disabled suppresses `aria-invalid` but not `data-invalid`.** The condition above excludes disabled controls from `aria-invalid`, while 1.7.0 explicitly kept `data-invalid` on disabled fields ("Keep invalid state on disabled fields", #5116). So a disabled invalid field still styles as invalid but is not announced as invalid — Ultima's styling should key off `data-invalid`, not `[aria-invalid="true"]`, inside a Field. (Ultima's current standalone-Input rule, `':is([aria-invalid="true"])'`, stays correct for Input used without Field, where the consumer sets the attribute by hand.)

`Field.Error` takes a `match` prop keyed to a `ValidityState` name (`'valueMissing'`, `'typeMismatch'`, `'patternMismatch'`, `'tooShort'`, `'tooLong'`, `'rangeUnderflow'`, `'rangeOverflow'`, `'stepMismatch'`, `'badInput'`, `'customError'`, `'valid'`, or a plain boolean), so one field can hold several `Error` parts and each shows for one failure mode. `Field.Validity` renders no element and hands a function child the full validity object plus `errors`, `error`, `value`, `initialValue`, and `transitionStatus`.

### Inline `<style>` and `<script>` injection

**The `<style>` paragraph in Ultima's CSP note does not change.** Nothing in this set injects a `<style>` element. The only producer of one in the whole library is `utils/styles.tsx`'s `styleDisableScrollbar`, and its only four importers are `select/list/SelectList.tsx`, `select/popup/SelectPopup.tsx`, `scroll-area/root/ScrollAreaRoot.tsx`, and `scroll-area/viewport/ScrollAreaViewport.tsx` — the same two components the CSP Provider docs name. Combobox and Autocomplete have scrollable popups and inject nothing; their `List` relies on the consumer's `overflow-y: auto` instead.

**But Slider adds a third injection of a different kind: an inline `<script>`.** `SliderThumb` renders `<PrehydrationScript>` when `inset && last && renderBeforeHydration`, and those map to exactly one public setting: `thumbAlignment="edge"`. (`SliderRoot` computes `inset: thumbAlignment !== 'center'` and `renderBeforeHydration: thumbAlignment === 'edge'`.) The default `thumbAlignment="center"` injects nothing, and `"edge-client-only"` is documented as the variant that avoids the script at the cost of rendering only after hydration. Only two components in 1.8.0 ever emit this script: `Tabs.Indicator` and `Slider.Thumb`.

Three facts that follow:

- It is a `<script>`, so it is governed by `script-src`, not `style-src-elem`, and **`CSPProvider`'s `disableStyleElements` does not suppress it.** The docs are explicit: "`<script>` tags across all components are opt-in, so they are not affected by this prop and don't have their own disable flag. A `nonce` is required if any component uses inline scripts." `PrehydrationScript` reads `nonce` from `useCSPContext`.
- It is avoidable by construction. `thumbAlignment` defaults to `center`, so Ultima ships zero inline scripts unless a Slider explicitly asks for edge alignment, and `edge-client-only` is the documented escape hatch.
- Separately, every Base UI part sets inline `style` **attributes**, which `CSPProvider` does not cover at all and which `style-src-attr` governs. That is already true of v0 (Positioner, Meter.Indicator, Toast.Root) and this set adds Slider.Track, Slider.Thumb, Slider.Indicator, and Progress.Indicator to the list.

### Empty glyph slots

Three categories, and the middle one is a correction to what Ultima's Iconography section currently asserts.

**Genuinely empty — no default children, Ultima must supply the glyph:**

- `Checkbox.Indicator` (`<span>`, no children in source)
- `Radio.Indicator` (`<span>`, no children; the maintainers' demo draws the dot with `::before` and `background-color: currentcolor` rather than an SVG)
- `Menu.CheckboxItemIndicator` and `Menu.RadioItemIndicator` (unchanged from v0)
- `Combobox.Clear` / `Autocomplete.Clear` — not empty, see below, but its default is plainly a placeholder
- `Combobox.ChipRemove`

**Has a default text glyph, `aria-hidden`, overridable through `children`:**

- `Select.Icon` → `'▼'`
- `Select.ItemIndicator` → `'✔️'`
- `Combobox.Icon` / `Autocomplete.Icon` → `'▼'`
- `Combobox.ItemIndicator` → `'✔️'`
- `Combobox.Clear` / `Autocomplete.Clear` → `'x'`

**This contradicts the spec.** Ultima's Iconography section says "`Select.Icon`, `Select.ItemIndicator`, `Menu.CheckboxItemIndicator`, and `Menu.RadioItemIndicator` are empty containers." At 1.8.0 the first two are not: they render a literal `'▼'` and `'✔️'` as default children. The practical effect is the same — Ultima's `{children ?? <ChevronDown />}` pattern replaces them and nothing leaks — but the sentence is wrong about two of its four examples, and a reviewer reading it would expect an empty span. Worth a correction wherever that paragraph is restated.

**No glyph slots at all:** Field, Fieldset, Form, Checkbox Group, Radio Group, Slider, Progress, Alert Dialog. Slider marks are the consumer's own elements positioned by percentage, documented as "Render your own tick marks", with no Base UI part behind them. Alert Dialog's `Close` follows Dialog's rule: it is a wrapper trigger handed the consumer's element, so there is nothing for Ultima to put an X inside.

### Providers and context above the component

**None of the eleven needs an app-root provider.** There is no `Field.Provider`, `Form.Provider`, `CheckboxGroup.Provider`, or `Combobox.Provider` — nothing in this set resembles `Toast.Provider` or `Tooltip.Provider`. Every one of them can ship as a self-contained registry item with no setup item and no change to Ultima's entry point.

What they do have is component-scoped context, which is a composition constraint rather than an install one:

| Wrapper | Required? | What depends on it |
| --- | --- | --- |
| `Field.Root` | Required for `Field.Label`, `Control`, `Description`, `Error`, `Item`, `Validity`. | Also switches on the Field data attributes and `aria-invalid` for `Input`, `Select`, `Switch`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Slider`, and `Combobox` when they sit inside it. Every one of those components documents its Field attributes as "when wrapped in `Field.Root`". |
| `Field.Item` | Optional. | Provides a nested disabled/validity scope so one checkbox or radio in a group can have its own label and description. |
| `Form` | Optional. | `Field` works standalone. `Form` adds consolidated `errors` keyed by field `name`, a shared `validationMode`, `onFormSubmit` with values as an object, an `actionsRef.validate()` that can target one field, and focus-the-first-invalid-field on submit. `Field.Error`'s `hasFormError` path reads it. |
| `Fieldset.Root` | Required for `Fieldset.Legend`. | Commonly used as `Fieldset.Root render={<RadioGroup />}` or `render={<CheckboxGroup />}` so the group element *is* the fieldset. |
| `CheckboxGroup` | Optional. | `Checkbox.Root` works standalone. Inside a group it reads `value`, `allValues` (for the `parent` checkbox), shared `disabled`, and the group's `registerControlId`, which is how the group rather than the checkbox becomes the field's control. |
| `RadioGroup` | **Effectively required.** | `useRadioGroupContext` returns `undefined` rather than throwing, so a bare `Radio.Root` does not crash — but it has no `checkedValue`, no name, no roving tabindex, and no `role="radiogroup"` around it. The docs state "Radio is always placed within Radio Group." |
| `Slider.Root`, `Progress.Root`, `AlertDialog.Root`, `Combobox.Root`, `Autocomplete.Root` | Required. | Ordinary compound-component roots. `AlertDialog.Root`, `Combobox.Root`, and `Autocomplete.Root` render no element at all. |

One thing that looks like a provider and is not: `AlertDialog.createHandle()` creates a handle object that lets a `Trigger` live outside its `Root`. It is a value, not a component, the imperative calls are ignored while no `Root` is mounted, and each `Root` mount starts from fresh state.

## Facts later tickets will need

- **`Input` is `Field.Control`.** One line of source. Any contract written for one applies to the other, and a v0.1 Field ticket that re-specifies Input's behavior is duplicating work.
- **No Textarea.** `render={<textarea />}` on `Input` or `Field.Control` is the documented-by-type-spec route, with an `HTMLTextAreaElement` ref. The only element-specific branch it loses is the Enter-key implicit-submit fallback, which a textarea should not have. Runtime behavior was not verified here.
- **Radio Group is `@base-ui/react/radio-group`, a second import.** A one-file-per-component `radio-group.tsx` will import from two subpaths, the same way `toggle-group.tsx` already does.
- **`CheckboxGroup` and `Form` are bare components, not `.Root` namespaces.** `<CheckboxGroup>` and `<Form>`, not `<CheckboxGroup.Root>`. If Ultima exposes `CheckboxGroup.Root` it is inventing a name rather than mirroring one.
- **`Fieldset.Legend` is a `<div>`.** Ultima's accessibility table needs the `aria-labelledby` mechanism, not a `<legend>` row.
- **`aria-invalid` is the error attribute; `aria-describedby` carries the message.** No `aria-errormessage`. A disabled invalid field keeps `data-invalid` but drops `aria-invalid`, so inside a Field the styling hook is `[data-invalid]`.
- **Three second-clause parts in Slider and two in Progress**, and all of them fail silently: a Track with no explicit cross-axis size gives an invisible indicator, a Control without `touch-action: none` scrolls the page on touch, and an indeterminate Progress with no consumer animation just sits there. These belong in the contracts as required CSS, not as suggestions.
- **`Slider.Thumb`'s focus ring is `:has(:focus-visible)`**, not `:focus-visible`. This is the first v0.1 control whose focus target is not the part Ultima styles, and Ultima's focus-ring helper may need to accept the `:has()` form.
- **The CSP paragraph keeps its two `<style>` occurrences and gains one `<script>`**, from `Slider.Thumb` under `thumbAlignment="edge"` only. `disableStyleElements` does not cover it; a `nonce` does. `thumbAlignment="edge-client-only"` avoids it entirely, and the default `"center"` never emits it.
- **`Select.Icon` and `Select.ItemIndicator` are not empty containers** at 1.8.0; they default to `'▼'` and `'✔️'`. The Iconography paragraph that says otherwise needs a correction. `Checkbox.Indicator` and `Radio.Indicator` *are* genuinely empty and are the two new glyph slots, which makes the check glyph's third copy (after `select.tsx` and `dropdown-menu.tsx`) a question the Checkbox contract has to answer.
- **`Checkbox.Indicator` and `Radio.Indicator` default to `keepMounted: false`** and unmount only after their exit transition, so `[data-unchecked] { display: none }` is required, not decorative.
- **AlertDialog is Dialog with three values changed.** `role="alertdialog"`, `modal: true` forced, `disablePointerDismissal: true` forced — and `modal` and `disablePointerDismissal` are `Omit`ed from its props type, so they cannot be passed. Six of its nine parts are Dialog's components, so Ultima's Dialog styles, the overlay recipe, and the always-render-a-Title rule carry over unchanged.
- **Combobox and Autocomplete are both real and both needed if the v0.1 "Combobox" is meant to cover free-text search.** Combobox restricts the value to the item set; Autocomplete allows free text. Autocomplete re-exports 14 of Combobox's 21 parts, so one Ultima file could cover both, but they have different Roots, different `Item` semantics, and Autocomplete has no `Label` part.
- **`Combobox.Label` names the Trigger, not the Input.** The Input is named by a native `<label>`, `Field.Label`, or `aria-label`. This is the most likely accessibility mistake in the whole set.
- **`Combobox.List` owns the scroll.** `overflow-y: auto` plus `max-height: min(<n>, var(--available-height))`. The same `--available-height` contract Ultima's Select popup already reads, on a different part.
- **`--input-container-height` and `--total-size` are the demos' own variables**, not Base UI's. Do not put them in a contract as library-provided.
- **No component in this set needs a provider, a setup item, or an app-root change.** Eleven self-contained registry items, modulo the cross-component dependencies (`Radio` needs `RadioGroup`; `Checkbox` optionally needs `CheckboxGroup`; everything form-shaped optionally needs `Field`).

## Sources

- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/package.json: `version` is `1.8.0`; the full subpath export list (every component above has one); the single `unstable-` export is `./unstable-use-media-query`.
- https://base-ui.com/llms.txt: the canonical component index — Field, Fieldset, Form, Checkbox, Checkbox Group, Combobox, Autocomplete, Progress, Radio, Slider, Alert Dialog all listed; **no Textarea entry**.
- https://base-ui.com/react/overview/releases/v1-0-0.md: 2025-12-11, the first stable release; Combobox, Select, Tabs, Toast, Menu sections, so those components predate stable. Only breaking change is the package rename.
- https://base-ui.com/react/overview/releases/v1-1-0.md: `Field.actionsRef`, `Field.Label` `nativeLabel` prop, `Form.actionsRef`, `Combobox.Chips` `role="toolbar"` for NVDA, `Combobox.Value` `placeholder`.
- https://base-ui.com/react/overview/releases/v1-2-0.md: `Checkbox.Indicator` and `Radio.Indicator` exit animations with `keepMounted={false}`; Field transition attributes.
- https://base-ui.com/react/overview/releases/v1-3-0.md: `Combobox.InputGroup` and `Autocomplete.InputGroup` (#3745), `Combobox.Label` (#4167), `Slider.Label` (#4167), automatic `aria-labelledby` for Checkbox and Radio Group (#4142), Drawer unmarked as preview.
- https://base-ui.com/react/overview/releases/v1-6-0.md: `Field.Item` disabled state reflected in Label and Description; OTPField renamed from `OTPFieldPreview` (the only other preview marker in the library).
- https://base-ui.com/react/overview/releases/v1-7-0.md: Field "Keep invalid state on disabled fields" (#5116); Form "Focus the first invalid field in document order" (#5287); Radio Group "Remove unnecessary ARIA attributes from `<Radio.Root>`" (#5213); Slider "Exclude the prehydration script from client bundles" (#5003).
- https://base-ui.com/react/overview/releases/v1-8-0.md: Combobox `createItems` collection API (#5326); Combobox/Autocomplete `rowgroup` role in grid mode (#5564) and group labels hidden from the accessibility tree (#5598).
- https://base-ui.com/react/components/field: anatomy (Root, Label, Control, Description, Item, Error, Validity), elements per part, the seven shared data attributes on all six element parts, `Error` `match` values, `Validity` state shape, `Field.Root` props (`validate`, `validationMode`, `validationDebounceTime`, `actionsRef`, `invalid`, `dirty`, `touched`), the CSS Modules demo.
- https://base-ui.com/react/components/fieldset: anatomy; `Root` renders `<fieldset>`, `Legend` renders a `<div>`; no data attributes; the demo's `border: 0; margin: 0; padding: 0` reset.
- https://base-ui.com/react/components/form: single `<form>` part; props `errors`, `actionsRef`, `onFormSubmit`, `validationMode` (default `'onSubmit'`); the `actionsRef.current?.validate('email')` example; Server Function and Zod examples.
- https://base-ui.com/react/components/input: "A native input element that automatically works with Field"; single part; data attributes qualified "when wrapped in Field.Root"; the accessible-name usage guideline; no textarea or multiline prose.
- https://base-ui.com/react/components/checkbox: `Root` renders `<span>` plus a hidden `<input>` beside; `Indicator` renders `<span>`; full data-attribute lists including `data-indeterminate`; `nativeButton` guidance for sibling vs enclosing labels; `parent`, `indeterminate`, `uncheckedValue` props; the `[data-unchecked] { display: none }` demo rule.
- https://base-ui.com/react/components/checkbox-group: `CheckboxGroup` as a bare component; `data-disabled` only; `allValues` and the parent-checkbox recipe; `aria-labelledby` labeling guidance.
- https://base-ui.com/react/components/radio: anatomy across two subpaths; `RadioGroup` renders `<div>`; `Radio.Root` renders `<span>` plus hidden input; "Radio is always placed within Radio Group"; data attributes; the `::before` dot in the demo.
- https://base-ui.com/react/components/slider: anatomy Root > Label, Value, Control > Track > Indicator, Thumb; elements per part including `Thumb`'s nested `<input type="range">`; data attributes; `thumbAlignment` `'center' | 'edge' | 'edge-client-only'` with "A client-only alternative `thumbAlignment="edge-client-only"` can be used to reduce bundle size but only renders after React hydration"; `step`/`largeStep` keyboard description; "Render your own tick marks"; the demo's `touch-action: none`, `user-select: none`, `height` on Track, and `:has(:focus-visible)` ring.
- https://base-ui.com/react/components/progress: anatomy; `Label` `<span>`, `Value` `<span>`, `Track`/`Indicator` `<div>`; the three data attributes; the demo's `overflow: hidden` on Track and `transition: width 500ms` on Indicator.
- https://base-ui.com/react/components/alert-dialog: anatomy; `Root` props list with **no `modal` and no `disablePointerDismissal`**; `initialFocus`/`finalFocus` on `Popup`; `--nested-dialogs` on Popup; detached triggers and `createHandle` semantics; the demo's fixed-centre Popup and iOS `position: absolute` backdrop fallback.
- https://base-ui.com/react/components/combobox: 24-part anatomy; per-part elements and data attributes; Positioner CSS variables; "Combobox is a filterable Select", "Combobox does not allow free-form text input", and the `Combobox.Label` labels the Trigger guidance; the demo's `List` scroll rules, `Popup` `var(--anchor-width)`, and the `Item` indicator grid.
- https://base-ui.com/react/components/autocomplete: 21-part anatomy; "Unlike Combobox, Autocomplete's input can contain free-form text"; `mode` prop; `Item` has only `data-highlighted`/`data-disabled`.
- https://base-ui.com/react/handbook/forms: the forms guide every control's accessible-name guideline points at; `Fieldset.Root render={<RadioGroup />}` / `render={<CheckboxGroup />}` / `render={<Slider.Root />}` patterns; no mention of textarea or multiline anywhere in 4586 lines.
- https://base-ui.com/react/utils/csp-provider: "The relevant components are `<ScrollArea.Viewport>` and `<Select.Popup>` or `<Select.List>` when `alignItemWithTrigger` is enabled" — the `<style>` list, unchanged; "`<script>` tags across all components are opt-in, so they are not affected by this prop and don't have their own disable flag. A `nonce` is required if any component uses inline scripts."; the `style-src-attr` discussion for inline style attributes.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/input/Input.tsx: `Input` is `return <Field.Control ref={forwardedRef} {...props} />`, props `BaseUIComponentProps<'input', InputState>`, `InputState extends FieldControlState`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/input/Input.spec.tsx: `const ref = React.useRef<HTMLTextAreaElement>(null); return <Input ref={ref} render={<textarea />} />;` — the type spec for the textarea swap.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/control/FieldControl.spec.tsx: the same spec for `Field.Control`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/control/FieldControl.tsx: `useRenderElement('input', ...)`; contributed props `id`, `disabled`, `name`, `aria-labelledby: labelId`, value/defaultValue, `onChange`, `onFocus`, `onBlur`, `onKeyDown`; the `event.currentTarget.tagName === 'INPUT'` guard on the Enter implicit-submission fallback; `useLabelableId`, `useRegisterFieldControl`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/root/useFieldValidation.ts: `getValidationProps` merges `getDescriptionProps(externalProps)` with `{ 'aria-invalid': true }` only when `state.valid === false && !state.disabled && !disabled`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/internals/labelable-provider/LabelableProvider.tsx: `controlId` registration `Map`, `labelId`, `messageIds`, and `getDescriptionProps` concatenating parent and local message ids into one de-duplicated `aria-describedby`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/internals/labelable-provider/useLabel.ts: `native: true` returns `{ id, htmlFor: resolvedControlId, onMouseDown }`; `native: false` returns a click handler that focuses the control by id; `focusElementWithVisible` uses `focus({ focusVisible: true })`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/label/FieldLabel.tsx: `useRenderElement('label', ...)`, `nativeLabel` default `true`, and the dev-only `error()` when the rendered tag disagrees with `nativeLabel`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/error/FieldError.tsx and `field/description/FieldDescription.tsx`: both push their generated id into `setMessageIds` on mount; `FieldError` only when `hasFormError || validityData.state.valid === false`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/index.parts.ts (and the same file at tag `v1.0.0`): the seven Field parts, `Item` included, identical at both tags.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/checkbox/root/CheckboxRoot.tsx: `role: 'checkbox'`, `aria-checked: indeterminate ? 'mixed' : checked`, `aria-readonly`, `aria-required`, `aria-labelledby`; the beside-input with `tabIndex: -1`, `aria-hidden: true`, `visuallyHiddenInput`; `nativeButton = false` default; `useButton`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/checkbox/indicator/CheckboxIndicator.tsx: `keepMounted = false` default, `shouldRender = keepMounted || mounted`, `useTransitionStatus(checked || indeterminate)`, `useOpenChangeComplete`; no default `children`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/radio/indicator/RadioIndicator.tsx: same `keepMounted = false` / `shouldRender` shape; no default `children`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/checkbox-group/CheckboxGroup.tsx: `useRenderElement('div', ...)`, `role: 'group'`, `aria-labelledby: labelId`, and the comment "The group is the field's control and takes its name from `aria-labelledby`".
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/radio-group/RadioGroup.tsx: `role: 'radiogroup'`, `aria-required`, `aria-disabled`, `aria-readonly`, `aria-labelledby`; rendered through `CompositeRoot` with `enableHomeAndEndKeys={false}`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/radio-group/RadioGroupContext.ts and `checkbox-group/CheckboxGroupContext.ts`: both `useXContext()` return `React.useContext(...)` without throwing, so absence is `undefined` rather than an error.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/slider/track/SliderTrack.tsx: the only inline style is `position: 'relative'`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/slider/indicator/SliderIndicator.tsx: `getIndicatorStyles` sets `position`, `height: 'inherit'` (or `width` when vertical), `insetInlineStart`/`bottom`, and size; `--start-position` and `--relative-size` only when `inset`; `data-base-ui-slider-indicator` only when `renderBeforeHydration`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/slider/control/SliderControl.tsx: `getComputedStyle(element)` cached in `stylesRef` and `getControlOffset` reading `border*Width` and `padding*` to compute the drag offset.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/slider/thumb/SliderThumb.tsx: `position: absolute` with `--position` when inset; the nested `<input type="range">` with `visuallyHidden` plus `width: 100%; height: 100%` "so that VoiceOver's focus indicator matches the thumb's dimensions"; `aria-orientation`, `aria-valuenow`, `aria-valuetext`, `aria-label`/`aria-labelledby`; the `onKeyDown` switch over ArrowUp/Down/Left/Right (RTL-aware), PageUp/PageDown with `largeStep`, Home/End clamped to the neighbouring thumb; `<PrehydrationScript>` rendered when `inset && last && renderBeforeHydration`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/slider/root/SliderRoot.tsx: `role: 'group'`, `aria-labelledby`; `inset: thumbAlignment !== 'center'`; `renderBeforeHydration: thumbAlignment === 'edge'`; `thumbAlignment` default `'center'`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/slider/value/SliderValue.tsx: `<output>` with `aria-live` defaulting to `'off'` and the comment "off by default because it will keep announcing when the slider is being dragged"; `htmlFor` pointing at the thumb inputs.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/progress/root/ProgressRoot.tsx: `role: 'progressbar'`, `aria-valuemin/max/now/text`, `aria-labelledby`; `'indeterminate progress'` default value text; the appended `<span role="presentation" style={visuallyHidden}>x</span>` with the comment "force NVDA to read the label https://github.com/mui/base-ui/issues/4184".
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/progress/indicator/ProgressIndicator.tsx: `percentageValue == null ? {} : { insetInlineStart: 0, height: 'inherit', width: '<n>%' }` — no inline style at all when indeterminate.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/progress/label/ProgressLabel.tsx and `progress/value/ProgressValue.tsx`: `role: 'presentation'` on Label, `aria-hidden: true` on Value.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/alert-dialog/index.parts.ts: `Backdrop`, `Close`, `Description`, `Popup`, `Portal`, `Title`, `Viewport` are re-exports of the Dialog components; only `Root`, `Trigger`, and the handle are Alert Dialog's own.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/alert-dialog/root/AlertDialogRoot.tsx: `useRenderDialogRoot('alert-dialog', props)` and `Omit<DialogRoot.Props<Payload>, 'modal' | 'disablePointerDismissal' | ...>`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/dialog/root/useRenderDialogRoot.tsx: `const isAlertDialog = mode === 'alert-dialog'; const modal = isAlertDialog ? true : modalProp; const disablePointerDismissal = isAlertDialog || disablePointerDismissalProp; const role = isAlertDialog ? 'alertdialog' : 'dialog'`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/combobox/root/AriaCombobox.tsx: `role: 'combobox'`, `aria-expanded`, `aria-haspopup` (`'grid'` in grid mode else `'listbox'`), `aria-controls`, `aria-autocomplete` (`'none'` when readonly), `autoComplete: 'off'`, `spellCheck: 'false'`; floating element `role: 'presentation'`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/combobox/list/ComboboxList.tsx, `combobox/item/ComboboxItem.tsx`, `combobox/row/ComboboxRow.tsx`, `combobox/group/ComboboxGroup.tsx`, `combobox/group-label/ComboboxGroupLabel.tsx`, `combobox/status/ComboboxStatus.tsx`, `combobox/empty/ComboboxEmpty.tsx`, `combobox/chips/ComboboxChips.tsx`, `combobox/popup/ComboboxPopup.tsx`, `combobox/input-group/ComboboxInputGroup.tsx`, `combobox/trigger/ComboboxTrigger.tsx`: `role="listbox"|"grid"` with `tabIndex: -1`; `role="option"|"gridcell"` with `aria-selected`; `role="row"`; `role="group"|"rowgroup"`; `aria-hidden` on GroupLabel; `role="status" aria-live="polite" aria-atomic` on Status and Empty; `role="toolbar"` on Chips when it holds selection chips; `role="dialog"` on Popup when the input is inside it else `role="presentation"`; `role="group"` on InputGroup; Trigger's `role="combobox"` only in the input-inside-popup case.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/combobox/icon/ComboboxIcon.tsx, `combobox/item-indicator/ComboboxItemIndicator.tsx`, `combobox/clear/ComboboxClear.tsx`, `select/icon/SelectIcon.tsx`, `select/item-indicator/SelectItemIndicator.tsx`: default `children` of `'▼'`, `'✔️'`, `'x'`, `'▼'`, `'✔️'` respectively, each with `aria-hidden: true`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/menu/checkbox-item-indicator/MenuCheckboxItemIndicator.tsx and `menu/radio-item-indicator/MenuRadioItemIndicator.tsx`: `aria-hidden: true` and **no** default `children` — genuinely empty, unlike their Select counterparts.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/autocomplete/index.parts.ts: 14 of the 21 parts are `Combobox*` components re-exported; `Root`, `Value`, `Trigger`, `InputGroup`, `Item`, `Separator` are Autocomplete's own; no `Label`, `Chips`, `Chip`, `ChipRemove`, or `ItemIndicator`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/utils/styles.tsx: `styleDisableScrollbar.getElement(nonce)` is the library's only `<style>` element, with class `base-ui-disable-scrollbar`. Its only importers are `select/list/SelectList.tsx`, `select/popup/SelectPopup.tsx`, `scroll-area/root/ScrollAreaRoot.tsx`, `scroll-area/viewport/ScrollAreaViewport.tsx` (GitHub code search for `from '../../utils/styles'`).
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/internals/PrehydrationScript.tsx: renders `<script nonce={nonce} dangerouslySetInnerHTML>` while hydrating; the doc comment names its two consumers, "`Tabs.Indicator`, `Slider.Thumb`"; `nonce` comes from `useCSPContext`. GitHub code search for `PrehydrationScript` returns only those two component files.
- `/Users/f/orca/workspaces/ultima/cornetfish/docs/research/2026-09-08-base-ui-inventory.md`: the v0 inventory this note extends — package identity, the styling contract, `BaseUIComponentProps`, `useAnchorPositioning`'s variables and `100vw`/`100vh` seeding, the global CSS rules, and the two-occurrence CSP paragraph.
- `/Users/f/orca/workspaces/ultima/cornetfish/docs/research/2026-09-09-base-ui-docs-patterns.md`: the ULT-49 note this one is modelled on, and the source of the second Styled-parts clause via `NavigationMenu.Positioner`/`Viewport` and `Collapsible.Panel`.
- `/Users/f/orca/workspaces/ultima/cornetfish/docs/spec/ultima.md`, sections "Styled parts", "Accessibility contract", "Iconography": the two-clause styling rule, the four-column accessibility split, the wrapper-trigger rule, the standalone-Input `[aria-invalid="true"]` rule, and the Iconography claim about empty glyph slots that this note corrects.
- `/Users/f/orca/workspaces/ultima/cornetfish/packages/ui/package.json`: `"@base-ui/react": "^1.8.0"`.
