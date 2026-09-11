# How do comparable systems wire a field's label, description, and error message?

## Findings

**Every system surveyed puts the error message in `aria-describedby`, not `aria-errormessage`, and none of them makes the error a live region. The mechanism they use instead is moving focus to the first invalid control on submit.** That is unanimous across Base UI 1.8.0, React Aria/React Spectrum, Primer React, Primer ViewComponents and the ARIA spec's own supporting prose — and it is the answer to the crux, because `aria-errormessage` still fails on VoiceOver on macOS in testing dated 2025-12-24.

Three findings matter more than the survey.

**Base UI already ships the whole convention, and `aria-errormessage` appears nowhere in the package.** `Field.Root`/`Label`/`Control`/`Description`/`Error`/`Item`/`Validity` plus `Fieldset.Root`/`Legend` plus `Form` is ten parts that already emit: a real `<label for>` (with an explicit `nativeLabel={false}` escape for non-labelable controls), `aria-describedby` carrying the description *and* the error ids in one space-separated list, `aria-invalid` only when `state.valid === false`, `aria-required` on each group and control, `role="group"`/`role="radiogroup"` named by `aria-labelledby`, and a `<form noValidate>` that focuses the first invalid control on submit. A grep of the whole published tarball finds zero occurrences of `aria-errormessage` and zero occurrences of `role="alert"` or `aria-live` in the field, fieldset or form directories. The wiring question is settled upstream; what is left for Ultima is which parts to expose and how to style them.

**shadcn's Field wires nothing at all, which makes it the ceiling for surface and the floor for behavior.** Ten parts, `role="group"` on the root, a `role="alert"` on `FieldError` — and not one `id`, `htmlFor`, `aria-describedby` or `aria-invalid` generated anywhere in the 224-line file, in any of its four parallel copies. The docs tell the consumer to write `htmlFor` and `aria-invalid` by hand, and across 638 lines of shadcn's own React Hook Form documentation the string `aria-describedby` does not appear once. shadcn's older `form.tsx` (react-hook-form, surviving only in the legacy `new-york-v4` copy) *does* wire `aria-describedby` and `aria-invalid` correctly — so the repo ships two contradictory answers, and the newer one is the worse one. shadcn's Field docs also make a claim the source does not support: "`Field` outputs `role="group"` so nested controls inherit labeling from `FieldLabel` and `FieldLegend` when combined." An unnamed `role="group"` confers no labelling on anything inside it, and no part writes `aria-labelledby`.

**The live-region question has a clean spec answer, and it is not "add `role="alert"`".** SC 4.1.3 Status Messages applies only to a "change in content that is **not a change of context**", and WCAG's definition of change of context lists "focus" — "moving focus to a different component" is its own example. So a system that focuses the first invalid control on submit has taken the error out of 4.1.3's scope and needs no live region; a system that reveals an inline error on blur without moving focus is in scope and does. Primer's own documentation states the choice as a rule: "**Live regions should not be used for form validation. Always use focus management** (e.g. moving focus to the first link in the interactive summary, or the first invalid field), and appropriate markup to connect the error message to the field." And where a live region *is* used, ARIA19's operative constraint rules out shadcn's shape outright: "**The error container must be present in the DOM on page load for the error message to be spoken by most screen readers.**" shadcn's `FieldError` returns `null` when it has no content, so its `role="alert"` mounts with its text already in it — the case screen readers miss.

Versions read: `@base-ui/react` 1.8.0 (published tarball) plus repo HEAD `a4f5e0e` (2026-09-11); shadcn/ui HEAD `3ba91b1` (2026-09-08), across its three parallel bases (`bases/base` on Base UI, `bases/radix` on Radix, `bases/aria` on React Aria Components) plus the legacy `new-york-v4` copy; Primer React HEAD `c880319` (2026-09-11); Primer ViewComponents HEAD `53e6c75` (2026-09-09) with `primer/design` at `87f799f`; adobe/react-spectrum HEAD `4693fcc` (2026-09-09), covering `react-aria` hooks, `react-aria-components` and `@adobe/react-spectrum`.

### 1. The public surface: zero parts and seventeen

| System | Parts for one field | Error message is | Group parts |
| --- | --- | --- | --- |
| React Spectrum | **0.** `<TextField label description errorMessage isRequired necessityIndicator />` | a **prop** (`errorMessage?: ReactNode \| ((v: ValidationResult) => ReactNode)`) | props on `RadioGroup` / `CheckboxGroup` |
| Primer ViewComponents | **0.** `f.text_field(label:, caption:, validation_message:, required:, invalid:)` | a **keyword argument**, defaulting to the Rails model's first error | props on `check_box_group` / `radio_button_group` |
| React Aria Components | **5** composed elements: `TextField`, `Label`, `Input`, `Text slot="description"`, `FieldError` | a **part** whose children default to the validation result | `RadioGroup`/`CheckboxGroup` + the same 4 |
| Primer React | **5**: `FormControl` + `.Label`, `.Caption`, `.Validation`, `.LeadingVisual` | a **slot part** taking `variant: 'error' \| 'success'` and the caller's children | `CheckboxGroup`/`RadioGroup` + `.Label`, `.Caption`, `.Validation` (4 each) |
| Base UI | **7** (`Field.Root`, `.Label`, `.Control`, `.Description`, `.Error`, `.Item`, `.Validity`) + `Fieldset` 2 + `Form` 1 = **10** | a **part** with a `match?: boolean \| keyof ValidityState` prop; children are the caller's, or Base UI injects the validity message | `Fieldset.Root`/`Legend` + `Field.Item` |
| shadcn/ui | **10** (`FieldSet`, `FieldLegend`, `FieldGroup`, `Field`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldSeparator`, `FieldError`) plus the legacy 7-part `Form` family and `useFormField` = **17 exports + 1 hook** | a **part** taking children *or* an `errors?: Array<{ message?: string } \| undefined>` array | `FieldSet` + `FieldLegend` (a real `<fieldset>`/`<legend>`, unnamed) |

**The floor is zero parts and the ceiling is seventeen exports across two overlapping families.** Two of the six systems — the two with the longest accessibility track record — do not expose the description or the error as parts at all. React Spectrum's entire field surface is `label`, `description`, `errorMessage`, `isRequired`, `necessityIndicator`, `labelPosition`, `labelAlign`, `isInvalid`, `validate`, `validationBehavior`, `contextualHelp`. Primer ViewComponents' `Primer::Alpha::TextField` declares **zero ViewComponent slots** — it is generated from a DSL input (`TextField = Primer::FormComponents.from_input(Primer::Forms::Dsl::TextFieldInput)`) and label/caption/validation are keyword arguments.

Two of shadcn's ten parts exist only for layout (`FieldContent`, `FieldSeparator`) and one duplicates another's `data-slot` value: `FieldTitle` renders `<div data-slot="field-label">`, the same slot name `FieldLabel` uses, so the two are indistinguishable to any selector keyed on `data-slot`.

shadcn's four copies of `field.tsx` are byte-identical apart from import paths and one extra class name. The interesting divergence is one level down. `bases/aria/ui/label.tsx` actively *defeats* React Aria's automatic label association whenever you pass `htmlFor`:

```tsx
if (htmlFor && slot === undefined) {
  return <LabelContext.Provider value={null}>{label}</LabelContext.Provider>
}
```

So even on the React Aria base, where RAC would have wired label, description and error for free, shadcn's Field forces the manual `id`/`htmlFor` path.

### 2. Which attribute carries the error: unanimous

**All six systems put the error id in `aria-describedby`. Not one generates `aria-errormessage`.**

**Base UI** routes both the description and the error through one registry. `Field.Description` and `Field.Error` each push their id into `setMessageIds` from a shared `LabelableContext`; the provider joins them into a single attribute:

```js
const getDescriptionProps = React.useCallback(externalProps => {
  const ids = externalProps['aria-describedby'] ? externalProps['aria-describedby'].split(' ') : [];
  ids.push(...parentMessageIds, ...messageIds);
  return {
    ...externalProps,
    'aria-describedby': Array.from(new Set(ids)).join(' ') || undefined
  };
}, [parentMessageIds, messageIds]);
```

and `aria-invalid` is merged in from the validation layer:

```js
const getValidationProps = React.useCallback((disabled, externalProps = {}) =>
  mergeProps(getDescriptionProps(externalProps),
    state.valid === false && !state.disabled && !disabled ? { 'aria-invalid': true } : EMPTY_OBJECT),
  [getDescriptionProps, state.disabled, state.valid]);
```

Base UI's own tests assert the emitted markup, including that a caller's own value survives:

```tsx
<Field.Control aria-describedby="external-description" />
<Field.Description>Message</Field.Description>
// → aria-describedby === `external-description ${messageId}`
```

A grep of the entire published 1.8.0 tarball for `aria-errormessage` returns nothing.

**React Aria** states the reason in a source comment — the single most quotable line in the survey:

```ts
fieldProps = mergeProps(fieldProps, {
  'aria-describedby':
    [
      descriptionId,
      // Use aria-describedby for error message because aria-errormessage is unsupported using VoiceOver or NVDA. See https://github.com/adobe/react-spectrum/issues/1346#issuecomment-740136268
      errorMessageId,
      props['aria-describedby']
    ]
      .filter(Boolean)
      .join(' ') || undefined
});
```

The referenced comment (2020-12-07) reads in full: "`aria-errormessage` is unsupported using VoiceOver or NVDA, we should probably favor `aria-describedby` for the time being." React Aria *does* emit `aria-errormessage` — but only as a pass-through of a value the consumer supplied, never one it generated: `'aria-errormessage': props['aria-errormessage']` in both `useTextField` and `useRadioGroup`.

**Primer ViewComponents** decides it in one place, and the non-React implementation is the only one that keeps the reference permanently:

```ruby
@ids = {}.tap do |id_map|
  id_map[:validation] = "validation-#{@base_id}" if supports_validation?
  id_map[:character_limit_caption] = "character_limit-#{@base_id}" if character_limit?
  id_map[:caption] = "caption-#{@base_id}" if caption? || caption_template?
end

add_input_aria(:required, true) if required?
add_input_aria(:invalid, true) if invalid?
add_input_aria(:describedby, ids.values) if ids.any?
```

The validation id enters `aria-describedby` whenever the input `supports_validation?`, valid or not, and the target element is always rendered with `hidden: valid? || validation_messages.empty?`. A GitHub code search for `aria-errormessage repo:primer/view_components` returns zero results.

**Primer React** builds the list per render and drops ids when the slot is absent: `['aria-describedby']: [validationMessageId, captionId].filter(Boolean).join(' ')`.

**shadcn** emits neither attribute from any part. The consumer writes them, and the documentation only ever shows `aria-invalid`:

```tsx
<Field data-invalid>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" type="email" aria-invalid />
  <FieldError>Enter a valid email address.</FieldError>
</Field>
```

### 3. `aria-invalid`: when it is set, what value, and on what element

| System | Emitted | Value | Also on the group |
| --- | --- | --- | --- |
| Base UI | only when `state.valid === false` and neither field nor control disabled | `true` (attribute present) | yes, through the same `getValidationProps` on `RadioGroup` and `CheckboxGroup` |
| React Aria | `'aria-invalid': isInvalid \|\| undefined` | `true` or omitted | `useRadioGroup` yes; `useCheckboxGroup` **no** |
| Primer React (TextInput) | `aria-invalid={isValid === 'error' ? 'true' : undefined}` | `"true"` or omitted | — |
| Primer React (Checkbox) | `['aria-invalid']: validationStatus === 'error' ? 'true' : 'false'` | **always present**, `"true"` or `"false"` | — |
| Primer ViewComponents | only when invalid, plus a **non-ARIA `invalid="true"`** attribute for CSS | `"true"` | yes, on the `<fieldset>`; asserted as `fieldset[invalid=true][aria-invalid=true]` |
| shadcn | never; the consumer passes it | — | no |

Three things worth carrying forward.

**`aria-invalid="false"` is noise, not information.** Technique ARIA21: "The `aria-invalid` attribute should not be set to `"true"` before input validation is performed. **Setting `aria-invalid` to `"false"` is the same as not placing the attribute for the form control.**" Base UI's mapping omits the attribute rather than writing `false`; Primer's `Checkbox` writes the string either way.

**The spec forbids pre-emptive invalidity.** ARIA 1.3 on `aria-invalid`: "When the user attempts to submit data involving a field for which `aria-required` is true, authors MAY use the `aria-invalid` attribute to signal there is an error. **However, if the user has not attempted to submit the form, authors SHOULD NOT set the `aria-invalid` attribute on required widgets simply because the user has not yet entered data.**" Base UI's default `validationMode` is `'onSubmit'`, which matches this exactly.

**`aria-invalid` is not allowed on `role="group"`.** Its Used in Roles list is `application checkbox combobox gridcell listbox radiogroup slider spinbutton textbox tree`, inheriting into `columnheader rowheader searchbox switch treegrid` — `group` is not on it, and the spec notes "This state is being deprecated as a global state in ARIA 1.2. In future versions it will only be allowed on roles where it is specifically supported." `radiogroup` is on the list; a checkbox group's `role="group"` is not. Base UI puts `aria-invalid` on both. React Aria puts it on `radiogroup` only, and its `useCheckboxGroup` conspicuously omits it. A native `<fieldset>` (Primer ViewComponents) has no ARIA role constraint problem, which is one more argument for the native element.

### 4. Is the error a live region? Only shadcn says yes, and it says it wrong

| System | Role / live attributes on the error element | Element |
| --- | --- | --- |
| Base UI `Field.Error` | **none** | `<div>` (conditionally mounted, with enter/exit transition states) |
| React Aria `FieldError` | **none** | `<span slot="errorMessage">` (returns `null` when valid) |
| React Spectrum `HelpText` | **none** | `<div>` inside `.spectrum-HelpText` |
| Primer React `InputValidation` | **none** | `<Text>` wrapper + `<span id>`; wrapped in a CSS-animated container |
| Primer ViewComponents | **none** | `<div class="FormControl-inlineValidation" id hidden>`; `role=alert` returns 0 results repo-wide |
| shadcn `FieldError` | **`role="alert"`, unconditionally** | `<div role="alert">`, returning `null` when there is no content |

**Five of six ship no live region. The one that does, ships the version that does not work.** ARIA19, the sufficient technique for exactly this, is explicit about the constraint: "In the example there is an empty error message container element with `aria-atomic=true` and an `aria-live` property or `alert` role **present in the DOM on page load**. **The error container must be present in the DOM on page load for the error message to be spoken by most screen readers.** `aria-atomic=true` is necessary to make Voiceover on iOS read the error messages after more than one invalid submission." shadcn's `FieldError` does the opposite: `if (!content) { return null }`, so the `role="alert"` element and its text appear together.

The ARIA spec's own `aria-errormessage` prose agrees, and shows the same shape — an always-present empty alert:

```html
<!-- Initial valid state -->
<label for="startTime">Please enter a start time for the meeting:</label>
<input id="startTime" type="text" aria-errormessage="msgID" value="" aria-invalid="false">
<span id="msgID" role="alert"></span>
```

with the normative framing being a MAY, and the mechanism being insertion rather than mounting: "Authors **MAY** call attention to a new error message with a live region by modifying inserting the error message into the contents of a existing, rendered element with a live region role, such as `alert`."

**There is a second hazard in combining the two.** a11ysupport's "aria-describedby attribute that references `role="alert"`" test exists because the description calculation and live-region content interact badly: VoiceOver on macOS, VoiceOver on iOS and Orca (browse mode) all **fail** to convey the description when `aria-describedby` points at a `role="alert"` element. So pointing `aria-describedby` at shadcn's `FieldError` — the obvious thing a consumer would do — loses the description on VoiceOver entirely.

**What the five do instead is move focus.** Base UI's `Form` renders `noValidate` and focuses the first invalid control, picked by document position:

```js
const focusFirstInvalid = useStableCallback(() => {
  // A field can be invalid without a focusable control (for example a checkbox group whose
  // custom validation failed while every checkbox is unmounted, disabled, or reassociated).
  // Keep submission blocked, but move focus to the first invalid field that has a usable control.
  // Registration order can diverge from DOM order (keyed fields reordered without
  // remounting, portals), so pick the first control by document position.
  ...
  if (firstControl) {
    firstControl.focus();
    if (firstControl.tagName === 'INPUT') { firstControl.select(); }
    return true;
  }
  return hasInvalid;
});
```

React Aria does the same on the native `invalid` event, suppressing the browser bubble: "Auto focus the first invalid input in a form, unless the error already had its default prevented… `e.preventDefault()` // Prevent default browser error UI from appearing." Primer ViewComponents does it server-side in `before_render`, calling `input.autofocus!` on the first invalid focusable input, and its Lookbook page states the policy: "Primer forms will automatically focus the first invalid input in accordance with accessibility best-practices."

Primer's design documentation is the only place any system writes the rule down as a rule:

> Live regions should not be used for form validation. Always use focus management (e.g. moving focus to the first link in the interactive summary, or the first invalid field), and appropriate markup to connect the error message to the field. If there are no focusable elements in the error summary banner, you may focus on the heading in the banner.

and names the cost of the inline-validation alternative honestly: "When a screen reader user moves focus from the invalid input to the next form control, they will be interrupted by the validation message of the previous form control."

### 5. How description and error coexist: both, or one, and in which order

Three distinct answers, and the order disagreement is real.

**Both ids, error first:** Primer, in both implementations.

```tsx
// primer/react, FormControl.tsx
['aria-describedby']: [validationMessageId, captionId].filter(Boolean).join(' ')
```

```ruby
# primer/view_components, dsl/input.rb — ids is an ordered Hash
aria-describedby="validation-<uuid> character_limit-<uuid> caption-<uuid>"
```

DOM order matches in both. Primer React's own test asserts the emitted attribute for each half separately.

**Both ids, mount order, so description first in practice:** Base UI. The array is built by layout effect via `setMessageIds(v => v.concat(id))`, so at first paint the order is DOM order, but an error that appears *after* first paint is **appended after the description** regardless of where it sits in the markup. Base UI's own documented demo puts `Field.Error` before `Field.Description` in the JSX, which makes that gap visible: the visual order is error-then-description while the announced order is description-then-error. The cleanup also runs when the error stops matching rather than when the node unmounts, so the `aria-describedby` reference is dropped while the node is still in the DOM finishing its exit transition.

**Both ids, description first:** React Aria. `[descriptionId, errorMessageId, props['aria-describedby']]`, fixed order, regardless of DOM. Both ids come from `useSlotId`, which only keeps an id if something actually rendered it — "Used to generate an id, and after render, check if that id is rendered so we know if we can use it in places such as labelledby" — so an absent description leaves no dangling reference.

**One or the other, never both:** React Spectrum. `HelpText` is a single slot with a branch:

```tsx
let isErrorMessage = errorMessage && (isInvalid || validationState === 'invalid');
…
{isErrorMessage ? (<div {...errorMessageProps}>{errorMessage}</div>)
               : (<div {...descriptionProps}>{description}</div>)}
```

So in React Spectrum the error **replaces** the description visually and in the accessibility tree, while `useField` has already reserved both ids. `useSlotId` then resolves the unrendered one to `undefined`, so `aria-describedby` holds exactly one id at a time.

**The missing half of the question is where both land and whether they are heard.** The APG's names-and-descriptions practice is blunt about how descriptions are presented: "Because descriptions are optional strings that are usually significantly longer than names, they are presented last, sometimes after a slight delay… **To reduce verbosity, some screen readers do not announce descriptions by default but instead inform users of their presence so that users can press a key that will announce the description.**" That is the strongest published argument for Primer's error-first order and for Primer's legend-stuffing in groups (§8): text in the *name* is always spoken; text in the *description* may not be.

shadcn has no answer here, because it never writes the attribute.

### 6. Required and optional marking: four mechanisms, no consensus

| System | Native `required` | `aria-required` | Visible marker | In the accessible name? |
| --- | --- | --- | --- | --- |
| Base UI | yes, the caller's prop passes through to `Field.Control` | yes, on `Checkbox`, `Switch`, `RadioGroup`, `Select.Trigger`, `Combobox.Input`/`Trigger` as `required \|\| undefined` | none shipped | n/a |
| React Spectrum | only when `validationBehavior === 'native'` | only when `validationBehavior === 'aria'` (the hooks' default) | `necessityIndicator: 'icon' \| 'label'`, default `'icon'` when `isRequired` is set | **no** — the asterisk icon and the "(required)" text are hidden from AT |
| React Aria Components | default, since RAC resolves `validationBehavior` to `'native'` | no, in the default config | caller's | n/a |
| Primer React | yes — `required: required && !isRadioInput` cloned onto the input | yes, via `aria-required={required}` | a separate `<span>` inside the label holding `requiredText ?? '*'` | **yes** by default (`aria-hidden={requiredIndicator ? undefined : true}`, and `requiredIndicator` defaults to `true`) |
| Primer ViewComponents | **deliberately deleted** | yes | `<span aria-hidden="true">*</span>` inside the `<label>` | no |
| shadcn | caller's | caller's | none shipped | n/a |

**React Spectrum and Primer React land on opposite sides of the same question.** React Spectrum states its reasoning in a source comment:

```tsx
{/* necessityLabel is hidden to screen readers if the field is required because
  * aria-required is set on the field in that case. That will already be announced,
  * so no need to duplicate it here. If optional, we do want it to be announced here. */}
{necessityIndicator === 'label' && (
  <span aria-hidden={!includeNecessityIndicatorInAccessibilityName ? isRequired : undefined}>
    {necessityLabel}
  </span>
)}
```

— the asterisk is decoration, `aria-required` is the announcement, and the *optional* case is the one that needs text because there is no ARIA state for it. Primer React leaves the `*` in the name by default, so the accessible name becomes "Email *".

**Primer ViewComponents refuses the native attribute on purpose**, and says why in the API docs:

> Note that this option explicitly does _not_ add a `required` HTML attribute. Doing so would enable native browser validations, which are inaccessible and inconsistent with the Primer design system.

implemented as `add_input_aria(:required, true) if required?` followed by `input_arguments.delete(:required)`, with the comment `# avoid browser-native validation, which doesn't match Primer's style`. Its design docs back this at the policy level: "Use Primer instead of browser-native validation UI. Browser-native validation messages are not accessible to screen readers, and they visually clash with Primer styles." Base UI arrives at the same place from the other direction — `Form` renders `noValidate: true` while still using the native `ValidityState` API for the *data*.

**W3C's own recommendation is all three at once.** The WAI forms tutorial: label text reading "Name (required):", plus the native attribute, plus the ARIA one —

```html
<label for="name">Name (required):</label>
<input type="text" name="name" id="name" required aria-required="true">
```

with the note: "The `aria-required` attribute informs assistive technologies about required controls… **Most current web browsers automatically set its value to true when the HTML5 `required` attribute is present.** In this example, it is provided redundantly to support web browsers that don't communicate the `required` attribute to assistive technology."

**Support for `aria-required` is near-universal with one hole.** a11ysupport's `aria-required` test passes on JAWS (Chrome/Edge/IE/Firefox), Narrator+Edge, NVDA (Chrome/Edge/Firefox), VoiceOver iOS, VoiceOver macOS and Orca, and **fails only on TalkBack + Chrome** ("edit box, veggie, double tap to activate" — no "required"). On a radio group it is much worse: TalkBack fails every assertion, VoiceOver iOS fails most, and the test's own note says "**Currently, the most robust solution to mark a group of radio buttons as required is to place the text 'required' in the group label.**" Primer React does exactly that (`{required && <VisuallyHidden>, required</VisuallyHidden>}` inside the `<legend>`); Primer ViewComponents does not.

### 7. The label element: a real `<label for>`, with a documented escape

**Every system defaults to a real `<label>` with `for`, and every system that supports non-labelable controls has an explicit switch for it.**

**Base UI** makes the switch a public prop with a stated rationale:

> `nativeLabel` — `boolean`, default `true`. Whether the component renders a native `<label>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a label (for example, `<div>`). This is useful to avoid inheriting label behaviors on `<button>` controls (such as `<Select.Trigger>` and `<Combobox.Trigger>`), including avoiding `:hover` on the button when hovering the label, and preventing clicks on the label from firing on the button.

It also warns in development when the prop and the rendered tag disagree, in both directions. The implementation splits cleanly:

```js
return native ? {
  id, htmlFor: resolvedControlId, onMouseDown: handleInteraction
} : {
  id, onClick: handleInteraction, onPointerDown(event) { event.preventDefault(); }
};
```

With `nativeLabel={false}` there is **no `for`** at all (asserted by Base UI's own test) and the name comes from `aria-labelledby={labelId}` on the control, with a hand-rolled click-to-focus using `element.focus({ focusVisible: true })`. The cost of the non-native path is precisely that: the browser's label-activation behavior, the expanded hit target and the double-click text-selection suppression all become JavaScript.

**React Aria** takes the same parameter as `labelElementType`, and emits both associations when a visible label exists:

```ts
if (label) {
  ariaLabelledby = ariaLabelledby ? `${labelId} ${ariaLabelledby}` : labelId;
  labelProps = { id: labelId, htmlFor: labelElementType === 'label' ? id : undefined };
}
```

`useCheckboxGroup` and `useRadioGroup` both pass `labelElementType: 'span'`, with the reason in a comment: "Checkbox group is not an HTML input element so it shouldn't be labeled by a `<label>` element."

**Primer ViewComponents** uses the Rails form builder's `<label for>` and reaches for `aria-labelledby` in exactly one place — the toggle switch, whose control is a `<button>`: `assert_selector("toggle-switch button[aria-labelledby='#{label_id}']")`. Its `visually_hide_label: true` keeps the real `<label>` and adds `sr-only`. Primer React's `FormControl.Label` switches element via `as: 'label' | 'legend' | 'span'` and drops `htmlFor` for the latter two, and drops it entirely for `SelectPanel` (`isReferenced === false`).

**shadcn's `FieldLabel` is a plain `<label>` with no `for` of its own**, so every example in its documentation repeats an `htmlFor`/`id` pair by hand.

**The APG puts its thumb on the native scale.** Rule 3 of the Cardinal Rules of Naming: "**Prefer Native Techniques.** In HTML documents, whenever possible, rely on HTML naming techniques, such as the HTML `label` element for form elements and `caption` element for tables. While less flexible, their simplicity and reliance on visible text help ensure robust accessible experiences." And the warning that bears on any `aria-labelledby` scheme: "**The `aria-labelledby` property cannot be chained**, i.e., if an element with `aria-labelledby` references another element that also has `aria-labelledby`, the `aria-labelledby` attribute on the referenced element will be ignored. If an element is referenced by `aria-labelledby` more than one time during a name calculation, the second and any subsequent references will be ignored."

### 8. Grouped controls: `<fieldset>` everywhere it is possible, and two ways to name it

| System | Element | Name | Group error |
| --- | --- | --- | --- |
| Base UI | `Fieldset.Root` → `<fieldset aria-labelledby={legendId}>`; `Fieldset.Legend` renders a **`<div>`**, not a `<legend>`. Composed as `Fieldset.Root render={<CheckboxGroup />}`, so the rendered element is the group's `<div role="group">` or `<div role="radiogroup">` | `aria-labelledby`; `RadioGroup` resolves `labelId ?? fieldsetContext?.legendId` | the group carries `getDescriptionProps`, so `aria-describedby` lists the `Field.Description` and `Field.Error` ids; per-item labels and descriptions nest through `Field.Item`, which mounts its own `LabelableProvider` and inherits `parentMessageIds` |
| React Aria | `<div role="group">` (checkbox) / `<div role="radiogroup">` (radio) | `aria-labelledby` pointing at a `<span>` | `aria-describedby` with both ids; `aria-invalid` on `radiogroup` only |
| Primer React | a real `<fieldset>` **when a `Label` child is present**, otherwise an inner `<div role="group" aria-labelledby aria-describedby>` | `<legend>` when native, `aria-labelledby` otherwise | **the error text is duplicated inside the `<legend>` as visually hidden content, and the visible copy is marked `aria-hidden`** |
| Primer ViewComponents | **always** a real `<fieldset>`; radio groups additionally get `role: 'radiogroup'` | `<legend>` | the validation `<div>` sits **outside** the `<fieldset>` and is referenced across the boundary by `aria-describedby` on the fieldset, which also carries `aria-invalid="true"`, `invalid="true"` and `aria-required="true"` |
| shadcn | `<fieldset>` + `<legend>`, unnamed and unwired | nothing | nothing |

Two things here are worth more than the table.

**Base UI's comment explains why a group cannot be labelled by `htmlFor`:**

```js
// The group is the field's control and takes its name from `aria-labelledby`, so `Field.Label`
// must not point `htmlFor` at one arbitrary checkbox inside the group.
useLabelableId({ id: null });
```

**Primer React duplicates the error into the `<legend>` on purpose, and cites its source:**

```tsx
{labelChild ? (
  /*
        Placing the caption text and validation text in the <legend> provides a better user
        experience for more screenreaders.

        Reference: https://blog.tenon.io/accessible-validation-of-checkbox-and-radiobutton-groups/
      */
  <legend className={classes.GroupLegend} data-legend-visible={isLegendVisible ? '' : undefined}>
    {slots.label}
    {required && <VisuallyHidden>, required</VisuallyHidden>}
    {slots.caption}
    {React.isValidElement(slots.validation) && slots.validation.props.children && (
      <VisuallyHidden>{slots.validation.props.children}</VisuallyHidden>
    )}
  </legend>
) : ( … )}
```

with the visible copy then suppressed: `<ValidationAnimationContainer aria-hidden={Boolean(labelChild)} show>`. That moves the group's error from the *description* into the *name*, which is the only version of this that survives the APG's "some screen readers do not announce descriptions by default" caveat and the forms-mode caveat below. **Primer ViewComponents does not do this** — `tenon repo:primer/view_components` returns zero results, and its Playwright accessibility snapshot shows the error outside the group:

```yaml
- 'radiogroup "Question: what kind of bear is best?"':
  - text: "Question: what kind of bear is best?"
  - radio "Bears"
  …
- text: Please select an option
```

So GitHub's two first-party implementations of the same design system disagree on group error announcement, and the React one is the more careful.

**Both Primer implementations forbid a per-item error.** Primer React warns: "Validation messages are not rendered for an individual checkbox or radio. The validation message should be shown for all options" and "An individual radio cannot be a required field." Primer ViewComponents enforces it structurally — `CheckBoxInput#supports_validation?` and `RadioButtonInput#supports_validation?` both `return false`, which removes the validation id from `ids`, skips the message template and forces `invalid?` false. Its docs state the rule: "An individual checkbox or radio should not have its own validation message or style."

**The forms-mode fact that underwrites the whole legend question** is from the WAI forms tutorial, flagged as Important: "**Screen readers often switch to 'Forms Mode' when they are processing content within a `<form>` element. In this mode they usually only read aloud form elements such as `<input>`, `<select>`, `<textarea>`, `<legend>`, and `<label>`.** It is critical to include form instructions in ways that can be read aloud." `<legend>` is on that list. A sibling `<div>` is not.

### 9. What the spec and the APG actually require

#### 9.1 `aria-errormessage` is normatively coupled to `aria-invalid`, and changed shape in 1.3

ARIA 1.3 ED, `aria-errormessage` (property): "Identifies the element (or elements) that provides an error message for an object." Four statements bear on a component API, verbatim:

- "**Authors MUST use `aria-invalid` in conjunction with `aria-errormessage`.**"
- "Authors MAY use `aria-errormessage` on an object that is currently valid, but only if the elements referenced by `aria-errormessage` are hidden from all users, because the message they contain is not pertinent."
- "When `aria-errormessage` is pertinent, authors **MUST** ensure the content is not hidden from all users… Similarly, when `aria-errormessage` is not pertinent, authors **MUST** either ensure the content is hidden from all users or remove the `aria-errormessage` attribute or its value."
- "**User agents MUST NOT expose `aria-errormessage` for an object with an `aria-invalid` value of false.**"

The live-region sentence is a MAY and prescribes insertion, not mounting: "Authors MAY call attention to a new error message with a live region by modifying inserting the error message into the contents of a existing, rendered element with a live region role, such as `alert`."

**The one normative change between 1.2 and 1.3 is cardinality.** ARIA 1.2 REC: "Identifies the element that provides an error message", "references **another element**", Value characteristic **`ID reference`**. ARIA 1.3 ED: "the element (or elements)", "references **other elements**", Value characteristic **`ID reference list`**. So a multi-error field could only reference one message under 1.2. Its Used in Roles list is identical to `aria-invalid`'s and does **not** include `group`.

#### 9.2 What assistive technology actually does with it, measured

a11ysupport's `aria-errormessage` with `aria-invalid="true"` test, asking whether the error message *text* is conveyed. The `convey_pertinent` assertion is MUST-priority.

| AT + browser | AT / browser version | Date tested | Spoken | Result |
| --- | --- | --- | --- | --- |
| JAWS + Chrome | 2023.2306.38 / 114 | 2023-06-20 | "…edit, invalid entry, has error, **example error text**, type in text" | pass |
| JAWS + Edge | 2023.2306.38 / 114 | 2023-06-20 | "…invalid entry Has Error **example error text** Type in text." | pass |
| JAWS + Firefox | 2023.2306.38 / 114 | 2023-06-20 | "…Edit invalid entry" | **fail** |
| NVDA + Chrome | 2024.4.2 / 137 | 2025-05-23 | "…edit, invalid entry, **example error text**" | pass |
| NVDA + Firefox | 2024.4.2 / 138 | 2025-05-23 | "…invalid entry has auto complete **example error text**" | pass |
| NVDA + Edge | 2023.1 / 114 | 2023-06-20 | "…edit, invalid entry" | **fail** |
| Narrator + Edge | Win 11 22H2 / 114 | 2023-06-20 | "…edit, invalid" | **fail** |
| VoiceOver macOS + Safari | 15.7.3 / 18.6 | **2025-12-24** | "…invalid data, edit text" | **fail** |
| VoiceOver iOS + Safari | 18.5 / 18.5 | 2025-12-24 | "…text field, invalid data, **example error text**" | pass |
| TalkBack + Chrome | 16.2 / 143 | 2025-12-24 | "**Error: Invalid entry example error text.** …" | pass |
| Orca + Firefox | 3.31.4 / 69 | 2019-09-16 | "…entry, invalid entry, **example error text**" | pass |

**Stated plainly, with the age caveats:** the most recently retested pairs are TalkBack, VoiceOver iOS and VoiceOver macOS (all 2025-12-24) and NVDA on Chrome and Firefox (2025-05-23). Of those five, the only failure is **VoiceOver on macOS with Safari**, and it is a current result on Safari 18.6, not a stale one. JAWS+Firefox, NVDA+Edge and Narrator+Edge are 2023 results and the Orca pass is 2019, so treat all four as unverified today. React Aria's source comment ("unsupported using VoiceOver or NVDA") is therefore half stale — NVDA now passes on Chrome and Firefox — and half still true, on the platform where it matters most for a documentation site.

For comparison, the plain `aria-describedby` test passes on JAWS (all four browsers), Narrator, NVDA (all three), TalkBack, and the `aria-required` test passes everywhere except TalkBack. `aria-describedby` is the better-supported attribute by a clear margin, which is what the five systems chose.

#### 9.3 `aria-describedby` is a global property with no role restriction

ARIA 1.3: "Identifies the element (or elements) that describes the object… The element or elements referenced by the `aria-describedby` comprise the entire description. Include ID references to multiple elements if necessary." It is global, so it is legal on `role="group"`, a `<fieldset>`, a `<div>` or anything else — the one attribute in this whole survey with no placement constraint. The APG adds that the target need not be visible: "it is possible to reference an element using `aria-describedby` even if that element is hidden."

#### 9.4 WCAG: which SCs are actually in play

- **3.3.1 Error Identification (Level A):** **ARIA21** ("Using `aria-invalid` to Indicate An Error Field") is *Sufficient* for 3.3.1. **ARIA19** ("Using ARIA `role=alert` or Live Regions to Identify Errors") is *Sufficient* for 3.3.1 **and** for 4.1.3 "using a more specific technique". **There is no WCAG technique for `aria-errormessage` at all** — the string does not appear in the WCAG 2.2 techniques index or the quickref.
- **4.1.3 Status Messages (Level AA):** applies to "a change in content that is **not a change of context**". Understanding 4.1.3 names the exact case as in scope: "After a user enters incorrect text in an input called Postal Code, a message appears above the input reading 'Invalid entry'. The screen reader announces, 'Invalid entry' or 'Postal code, invalid entry'." And names the escape: "An author displays an error message in a dialog. Since the dialog takes focus, it is defined as a change of context and does not meet the definition of a status message."
- **The definition that joins them:** "changes of context — major changes that, if made without user awareness, can disorient users… Changes in context include changes of: user agent; viewport; **focus**; content that changes the meaning of the web page", with "moving focus to a different component" given as an example.

**So the rule is mechanical.** Error appears *and focus moves to the control* → change of context → out of 4.1.3's scope → no live region required. Error appears inline on blur or on submit *without* focus moving → status message → 4.1.3 applies → a role or live region is required, and ARIA19's "present in the DOM on page load" constraint applies with it. Every system surveyed took the first branch.

#### 9.5 The APG has no Field pattern, one `aria-errormessage` example, and a Required-vs-Discretionary split on group names

**There is no APG pattern for a form field.** `aria-errormessage` appears in exactly **one** place in the whole `w3c/aria-practices` repository: the Quantity Spin Button example. Its own property-coverage CSV records this as `"aria-errormessage","0","1"` — zero patterns, one example. The markup is static and the error element is always in the DOM:

```html
<input id="adults" aria-errormessage="error-adults" role="spinbutton" type="text" …>
…
<small id="error-adults">Must be between 1 and 8</small>
<small id="help-adults">1 to 8</small>
<output for="adults" data-self-destruct="2000" class="visually-hidden"></output>
```

with the rationale spelling out the three-part recipe — "The spin button is visually styled to indicate an error state. `aria-invalid="true"` is added to the input to inform assistive technologies of the invalid state. An error message is displayed and associated with the input using `aria-errormessage`" — and, notably, declining to use `aria-describedby` for the adjacent help text: "The minimum and maximum values are also visually expressed with adjacent help text, but is **purposefully not associated using `aria-describedby`** since the same information is already programmatically defined." The error message carries no `role="alert"`; the separate `<output>` (implicit `role="status"`) is the live region, and it announces values, not errors.

**The Accessible Name Guidance by Role table settles the group-name asymmetry outright**, which is the nearest thing here to ULT-50's Caution note:

| Role | Naming | APG guidance |
| --- | --- | --- |
| `radiogroup` | **Required** | "Recommended to help assistive technology users understand the purpose of the group of radio buttons. Use `aria-labelledby` if a visible label is present, otherwise use `aria-label`." |
| `group` | **Discretionary** | "When using the HTML `fieldset` element, the accessible name can be derived from the `legend` element… Otherwise, use `aria-labelledby` if a visible label is present, otherwise use `aria-label`." |
| `textbox` / `combobox` / `listbox` / `slider` / `spinbutton` / `searchbox` | **Required** | "If the role is applied to an HTML `input` element, can be named with an HTML `label` element. Otherwise use `aria-labelledby` if a visible label is present. Use `aria-label` if a visible label is not present." |
| `checkbox` / `radio` | Required Only If Content Insufficient | "Warning! Using `aria-label` or `aria-labelledby` will hide any descendant content from assistive technologies. If based on HTML `type="checkbox"`, use a `label` element." |

So a **Radio Group must be named and a Checkbox Group's name is discretionary**, which is exactly the asymmetry Base UI and React Aria both encode (both set `aria-labelledby` on either, but only `radiogroup` also gets `aria-invalid`/`aria-required` as spec-permitted states).

The APG also states the native preference for the group itself: "Using the `legend` element to name a `fieldset` element satisfies Rule 2: Prefer Visible Text and Rule 3: Prefer Native Techniques." WAI's forms tutorial goes further in imperative form: "**Radio button groups should always be grouped using `<fieldset>`**", with `role="group"` + `aria-labelledby` presented as the alternative that "provides additional styling possibilities."

**Neither the APG nor any WAI tutorial recommends a Field component shape**, and no W3C source anywhere in this survey uses `aria-errormessage` for a plain text input. The WAI forms tutorial's error recipe is `aria-describedby` pointing at the message, plus a separate `role="alert"` container for the page-level error summary, plus `aria-live="polite"`/`"assertive"` spans for instant feedback during typing.

### 10. Where each surveyed shape would violate an Ultima convention

| Surveyed shape | Ultima rule it breaks | Where |
| --- | --- | --- |
| shadcn's 10 flat `FieldLabel`-style exports, plus the parallel 7-export `Form` family | "A multi-part component exports one namespace object of parts… Flat `DialogPopup`-style exports do not exist." Field must be `Field.Label`. | Compound components |
| `className` on all ten parts; `cn()` merging | "No `className`. Registry consumers own the source and edit it instead." `style?: StyleProp` is the only hatch. | Props every component accepts |
| shadcn's `cva` `fieldVariants` table for `orientation` | "There is no `cva`." One `stylex.create` table per axis, indexed by the prop. | Variants, sizes, and tones |
| `orientation: "vertical" \| "horizontal" \| "responsive"` on shadcn's `Field` | Not an axis (`variant`/`size`/`tone`), so the contract has to name it as behavior. The `responsive` value is a `@container` query, and the spec already fixes Sidebar as the one component that writes a media query. | Variants, sizes, and tones; Per-component notes → Sidebar |
| `FieldError` with `role="alert"` mounted together with its text | ARIA19's "must be present in the DOM on page load", and the a11ysupport finding that `aria-describedby` → `role="alert"` loses the description on VoiceOver. Also: Ultima's contract is "Base UI supplies the roles… Ultima adds nothing and removes nothing there", and Base UI's `Field.Error` has no role. | Accessibility contract |
| shadcn's `data-invalid` on `Field` plus hand-written `aria-invalid` on the control | Two sources of truth for one state, and the spec's State styling rule uses presence selectors. Base UI emits `data-invalid` (only when invalid) and `aria-invalid` from one code path, which is the only version that cannot drift. | State styling; Accessibility contract |
| `aria-invalid` on a `role="group"` root | `aria-invalid`'s Used in Roles list excludes `group`, and ARIA 1.2 deprecated it as a global state. `radiogroup` is permitted; a checkbox group's `role="group"` is not. | Accessibility contract |
| Primer's `aria-required="false"` / `aria-invalid="false"` always emitted on Checkbox | ARIA21: "Setting `aria-invalid` to `"false"` is the same as not placing the attribute." Base UI's state mapping omits `false`; writing the string is DOM noise that a presence selector would also match. | State styling |
| React Spectrum's `description`/`errorMessage` as `ReactNode` props | Ultima's existing parts take children, and a `ReactNode` prop for rendered content has no precedent in v0 — compare `Meter.Label`, `Card.Title`, `Table.Caption`, all parts. | Compound components; Styled parts |
| shadcn's `errors?: Array<{ message?: string }>` on `FieldError`, and the docs' unimplemented `issues` prop | A form-library-shaped prop on a design-system part. Base UI's equivalent is `match?: boolean \| keyof ValidityState`, which reads native `ValidityState` and needs no library. The docs also claim an `issues` prop the source does not have. | — |
| Primer ViewComponents' deleted native `required` | Not a spec violation, but it is a behavior decision Field cannot make silently: Base UI's `Form` already sets `noValidate`, so whether Ultima exposes `Form` at all decides whether the native bubble ever appears. | Release scope |
| `FieldTitle` rendering `data-slot="field-label"`, the same value as `FieldLabel` | Ultima parts are distinguishable by their own names; a duplicated slot value makes a styled part unaddressable. | Styled parts |
| A separate `label` registry item as a dependency (shadcn's `field.json` declares `["label", "separator"]`) | Separator is v0.2, and Ultima has no Label component — `Field.Label` would be a part of `field.tsx`, one file. | Release scope; The registry item |

Three things Ultima already has that shrink whatever surface is chosen:

- **`Field.Label`, `Field.Description` and `Field.Error` need no id plumbing of their own.** Base UI's `LabelableProvider` already owns `controlId`, `labelId` and `messageIds`, and `Field.Control`, `Input`, `Checkbox`, `Switch`, `Select.Trigger`, `RadioGroup`, `CheckboxGroup` and `Combobox.Input` all consume it. Wrapping the parts is a styling job.
- **The spec's existing Input row already says the right thing.** "Input works without Field. Its validation state is the consumer's `aria-invalid`, styled through `':is([aria-invalid="true"])'` with `--ult-color-danger-border`." Base UI emits `aria-invalid` with no value when invalid and omits it otherwise, so `[aria-invalid="true"]` would not match Base UI's own output — the selector needs checking against `aria-invalid=""` versus `"true"` before Field lands.
- **`Fieldset.Legend` renders a `<div>`, not a `<legend>`.** Base UI's `Fieldset.Root` renders a real `<fieldset>` but names it with `aria-labelledby` pointing at a `<div>`, deliberately, because `<legend>` is nearly unstylable. That trades the forms-mode guarantee (`<legend>` is on the list of elements screen readers read in forms mode; a `<div>` is not) for styling freedom, and it is a decision the contract has to make knowingly rather than inherit.

### 11. The range

Not a recommendation. The two ends, so the decision ticket sees the span.

**Smallest that carries the wiring: four parts, and they are all Base UI's.** `Root`, `Label`, `Description`, `Error` — with the control being any Base UI primitive, since `Field.Control` is optional ("You can omit this part and use any Base UI input component instead"). That gets `<label for>`, `aria-describedby` with both messages, `aria-invalid`, `aria-required` and the data attributes, and it is four `stylex.create` tables. Grouped controls add `Fieldset.Root` and `Fieldset.Legend` (2) and `Field.Item` (1) for per-option labels; a `<form>` that focuses the first invalid control adds `Form` (1). So **four parts for a single field, eight for the full story**, all of them one-to-one with a Base UI part — which is what the spec's compound rule already requires: "a component built on a Base UI primitive exposes every Base UI part under its own name."

`Field.Validity` is the ninth and the one genuinely optional part: a render-prop that hands the caller the `ValidityState`, with no element of its own.

**Largest anyone ships: shadcn's 17 exports plus a hook**, across two families that overlap (`FieldError` and `FormMessage` do the same job, one with ARIA wiring and one without), with two layout-only parts, one duplicated `data-slot`, and zero generated accessibility attributes. The middle of the range is where the other four sit, and React Spectrum — the only one of the six with zero parts — is also the only one that refuses to render the description and the error at the same time.

## Facts later tickets will need

- **`aria-errormessage` appears zero times in `@base-ui/react` 1.8.0**, and zero times in `primer/view_components`. React Aria emits it only as a pass-through of `props['aria-errormessage']`. No surveyed system generates it.
- **Base UI's wiring, in one line each.** `aria-describedby` = a de-duplicated join of the caller's own value, then `parentMessageIds`, then `messageIds` (description and error ids, in mount order). `aria-invalid: true` only when `state.valid === false && !disabled`. `aria-required: required || undefined` on `Checkbox`, `Switch`, `RadioGroup`, `Select.Trigger`, `Combobox.Input`, `Combobox.Trigger`. `Field.Label` emits `htmlFor` when `nativeLabel` (default `true`), and nothing when `false`, where the control takes `aria-labelledby={labelId}` instead.
- **Base UI `Field.Error` has no `role` and no `aria-live`**, is conditionally mounted, and its `aria-describedby` id is removed when it stops matching — before the node leaves the DOM at the end of its exit transition.
- **`Field.Error`'s `match` prop is `boolean | keyof ValidityState`**, reading the native `ValidityState` (`badInput`, `customError`, `patternMismatch`, `rangeOverflow`, `rangeUnderflow`, `stepMismatch`, `tooLong`, `tooShort`, `typeMismatch`, `valueMissing`, `valid`). `match={true}` means always show and hands control to an external library.
- **`Field.Root`'s `validationMode` default is `'onSubmit'`** (`'onBlur'` and `'onChange'` are the alternatives), and `Form` renders `noValidate: true` and focuses the first invalid control **by document position**, calling `.select()` if it is an `<input>`.
- **`Fieldset.Root` renders `<fieldset aria-labelledby={legendId}>` and `Fieldset.Legend` renders a `<div>`, not a `<legend>`.** `<legend>` is on WAI's list of elements screen readers read in forms mode; a `<div>` is not.
- **`CheckboxGroup` is `role="group"` + `aria-labelledby`; `RadioGroup` is `role="radiogroup"` + `aria-labelledby`, falling back to `labelId ?? fieldsetContext?.legendId`.** Both receive `getValidationProps`, so both get `aria-describedby` and `aria-invalid`. `Field.Item` mounts a nested `LabelableProvider` so a group-level description cascades into every item's `aria-describedby` via `parentMessageIds`.
- **`aria-invalid` and `aria-errormessage` are not permitted on `role="group"`.** Their Used in Roles list is `application checkbox combobox gridcell listbox radiogroup slider spinbutton textbox tree`. `aria-required`'s is `checkbox combobox gridcell listbox radiogroup spinbutton textbox tree`. `aria-describedby` is global.
- **ARIA 1.2 → 1.3 changed `aria-errormessage` from `ID reference` to `ID reference list`.** Under 1.2 a multi-error field can only reference one message element.
- **`aria-errormessage` fails on VoiceOver macOS + Safari as of 2025-12-24** (VO 15.7.3 / Safari 18.6), and passes on NVDA+Chrome, NVDA+Firefox (2025-05-23), VoiceOver iOS and TalkBack (2025-12-24). JAWS+Firefox, NVDA+Edge and Narrator+Edge fail on 2023 data.
- **`aria-describedby` pointing at a `role="alert"` element fails on VoiceOver macOS, VoiceOver iOS and Orca browse mode.** Do not combine them on one node.
- **`aria-required` fails only on TalkBack + Chrome for a single input.** On a `radiogroup` it fails on TalkBack entirely and on most VoiceOver iOS assertions, and a11ysupport's own note says the robust answer is "place the text 'required' in the group label."
- **4.1.3 Status Messages applies only when focus does not move.** WCAG's change-of-context definition lists "focus", with "moving focus to a different component" as an example, and a status message is "a change in content that is **not** a change of context". Focus-the-first-invalid removes the live-region requirement.
- **ARIA19's constraint if a live region is ever used:** "The error container must be present in the DOM on page load for the error message to be spoken by most screen readers", plus `aria-atomic="true"` "to make Voiceover on iOS read the error messages after more than one invalid submission."
- **ARIA21 is the Sufficient technique for 3.3.1 via `aria-invalid`; ARIA19 via a live region. There is no WCAG technique for `aria-errormessage`.**
- **`aria-invalid="false"` is equivalent to omitting the attribute** (ARIA21), and the spec forbids setting it pre-submission on a required-but-empty field.
- **APG name requirement by role:** `radiogroup` **Required**, `group` **Discretionary**, `textbox`/`combobox`/`listbox`/`slider`/`spinbutton` **Required**, `checkbox`/`radio` Required Only If Content Insufficient. `aria-labelledby` cannot be chained.
- **Order disagreement, for the record.** Primer (both implementations): error id first, then caption. React Aria: description first, then error, fixed. Base UI: mount order, so a late error is appended last. React Spectrum: exactly one of the two, ever.
- **shadcn's Field generates no `id`, `htmlFor`, `aria-describedby` or `aria-invalid`** in any of its four copies, and `aria-describedby` appears zero times in its 638-line React Hook Form documentation. Its `FieldError` is `role="alert"`, mounted with its content. Its docs claim `role="group"` makes nested controls "inherit labeling", which no part implements. Registry item `field`, `registryDependencies: ["label", "separator"]`, one file, 224 lines.
- **shadcn's `bases/aria/ui/label.tsx` wraps the label in `<LabelContext.Provider value={null}>` whenever `htmlFor` is set**, disabling React Aria's automatic association.
- **Primer ViewComponents deletes the native `required` attribute on purpose** — `input_arguments.delete(:required)`, documented as "Doing so would enable native browser validations, which are inaccessible and inconsistent with the Primer design system" — and keeps `aria-required`. It keeps the validation id in `aria-describedby` permanently, pointing at an always-rendered `hidden` container, which contradicts its own docs' rule that the id should be removed with the message.
- **Primer's design documentation is the only published rule on the live-region question:** "Live regions should not be used for form validation. Always use focus management… and appropriate markup to connect the error message to the field."
- **Primer React copies the group's caption and error text into the `<legend>` as visually hidden content and marks the visible copy `aria-hidden`**, citing `blog.tenon.io/accessible-validation-of-checkbox-and-radiobutton-groups/`. Primer ViewComponents does not.
- **W3C's recommended required-field recipe is all three at once:** "(required)" in the label text, the native `required` attribute, and `aria-required="true"` "provided redundantly".
- **Forms mode matters for where text lives:** "In this mode they usually only read aloud form elements such as `<input>`, `<select>`, `<textarea>`, `<legend>`, and `<label>`."
- **React Aria's `validationBehavior` default differs by layer:** `'aria'` in the hooks (`aria-required`, no native validation), `'native'` in React Aria Components (`required`, `setCustomValidity`, `invalid` event, browser bubble suppressed). That switch alone decides whether `required` or `aria-required` is emitted.
- **`Field.Root` renders a plain `<div>` with no role.** shadcn's `Field` renders `<div role="group">`. Base UI's is the one that does not add an unnamed group to the accessibility tree.

Three notes filed the same day carry the adjacent halves this one deliberately leaves alone, and the decision ticket wants all four: `docs/research/2026-09-11-live-regions.md` (what Base UI's live regions cover, and what a status announcement needs beyond a `role="status"` element — the other side of §4), `docs/research/2026-09-11-form-integration.md` (which form integration v0.1's examples document, which settles whether Ultima wraps Base UI's `Form` and therefore owns the focus-the-first-invalid behavior this note's live-region argument depends on), and `docs/research/2026-09-11-base-ui-v01-inventory.md` (what Field, Fieldset, Form, Checkbox Group, Radio and the rest cost to wrap under Ultima's rules).

## Sources

### Base UI (`@base-ui/react` 1.8.0; repo HEAD `a4f5e0ed25575f4abe94bec08bac50903085b034`, 2026-09-11)

- `package/field/index.parts.d.ts` in the published 1.8.0 tarball: the seven parts — `Root`, `Label`, `Error`, `Description`, `Control`, `Validity`, `Item` — plus the `ValidityData` type export. `package/fieldset/index.parts.d.ts`: `Root`, `Legend`.
- `package/internals/labelable-provider/LabelableProvider.mjs`: `getDescriptionProps` joining `externalProps['aria-describedby']`, `parentMessageIds` and `messageIds` through a `Set`; the `controlId` registration map and its hidden-subtree comment.
- `package/internals/labelable-provider/LabelableContext.mjs`: the context shape (`controlId`, `registerControlId`, `resetControlId`, `labelId`, `setLabelId`, `messageIds`, `setMessageIds`, `getDescriptionProps`) and its doc comment pointing at HTML's labelable-elements category.
- `package/internals/labelable-provider/useLabel.mjs`: the `native ? { id, htmlFor, onMouseDown } : { id, onClick, onPointerDown }` split, and `focusElementWithVisible` using `focus({ focusVisible: true })`.
- `package/field/root/useFieldValidation.mjs` (lines 294-296): `getValidationProps` = `mergeProps(getDescriptionProps(externalProps), state.valid === false && !state.disabled && !disabled ? { 'aria-invalid': true } : EMPTY_OBJECT)`.
- `package/field/error/FieldError.mjs`: `setMessageIds` registration gated on `rendered`; the `match === true` / `fieldState.disabled` / `hasSpecificMatch` / `hasFormError || validityData.state.valid === false` branch order; `useTransitionStatus`; `if (!mounted) return null`. No `role`, no `aria-live`.
- `package/field/description/FieldDescription.mjs`: renders `<p>`, registers its id unconditionally.
- `package/field/label/FieldLabel.mjs`: `nativeLabel = true` default, `useLabel({ id: labelId ?? idProp, native: nativeLabel })`, and the two development-mode errors when the rendered tag and the prop disagree.
- `package/field/control/FieldControl.mjs`: `'aria-labelledby': labelId` on the control, `validation.getValidationProps(disabled, props)` as the last props entry, and the doc comment "You can omit this part and use any Base UI input component instead."
- `package/field/root/FieldRoot.d.ts` and `FieldRoot.mjs`: renders a `<div>` with no role; `validationMode` default `'onSubmit'`; `FieldValidityData.state` listing all eleven `ValidityState` keys; the `invalid`, `dirty`, `touched`, `validate`, `validationDebounceTime`, `actionsRef` props.
- `package/field/error/FieldError.d.ts`: `match?: boolean | keyof ValidityState`.
- `package/field/item/FieldItem.mjs`: wraps its element in a nested `LabelableProvider` plus `FieldItemContext`.
- `package/fieldset/root/FieldsetRoot.mjs` and `package/fieldset/legend/FieldsetLegend.mjs`: `<fieldset aria-labelledby={legendId}>`, and a `Legend` that renders a `<div>`.
- `package/radio-group/RadioGroup.mjs` (lines 155-213): `const ariaLabelledby = labelId ?? fieldsetContext?.legendId`; `role: 'radiogroup'`, `aria-required`, `aria-disabled`, `aria-readonly`, `aria-labelledby`; `validation.getValidationProps` as the last props entry.
- `package/checkbox-group/CheckboxGroup.mjs` (lines 79-140): the comment "The group is the field's control and takes its name from `aria-labelledby`, so `Field.Label` must not point `htmlFor` at one arbitrary checkbox inside the group"; `useLabelableId({ id: null })`; `role: 'group'`, `'aria-labelledby': labelId`, and `getDescriptionProps` in the props chain.
- `package/form/Form.mjs` (lines 37-105): `focusFirstInvalid` with its three-part comment, `comesBeforeInSameTree` document-position pick, `firstControl.select()`, `noValidate: true`, and the post-`errors` effect that re-focuses after a server response.
- Grep of the whole published tarball: zero occurrences of `aria-errormessage`; `aria-invalid` only in `otp-field/input`, `number-field/input` and `field/root/useFieldValidation`; `aria-live` only in `toast/viewport`, `slider/value`, `combobox/empty`, `combobox/status`.
- `package/docs/react/components/field.md` and https://base-ui.com/react/components/field: the anatomy, the `nativeLabel` prop description quoted in §7, and the demo that orders `Field.Error` before `Field.Description`.
- `package/docs/react/components/checkbox-group.md` (lines 333-355) and `radio.md` (lines 293-309): the documented grouped-control composition, `<Field.Root name><Fieldset.Root render={<CheckboxGroup />}><Fieldset.Legend/><Field.Item><Field.Label/>`.
- https://github.com/mui/base-ui/blob/a4f5e0ed25575f4abe94bec08bac50903085b034/packages/react/src/field/description/FieldDescription.test.tsx and `.../error/FieldError.test.tsx`: the emitted-markup assertions — automatic `aria-describedby`, preservation of a caller's `external-description` value, and `does not register an empty description id`.
- https://github.com/mui/base-ui/blob/a4f5e0ed25575f4abe94bec08bac50903085b034/packages/react/src/field/label/FieldLabel.test.tsx: `should set htmlFor referencing the control automatically`; with `nativeLabel={false}`, `expect(label).not.toHaveAttribute('for')` plus click-focuses-control; the control-selection fallback tests.

### shadcn/ui (repo HEAD `3ba91b1cc83e1bbe4ab35a422ff2a694849c5048`, 2026-09-08)

- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/base/ui/field.tsx: the primary source. All ten exports; `role="group"` on `Field` (line 71); `role="alert"` on `FieldError` (line 203) with `if (!content) return null`; the `errors` array de-duplication via `new Map(errors.map(e => [e?.message, e]))` and the `<ul>` fallback; `FieldTitle` rendering `data-slot="field-label"`; the `cva` `fieldVariants` `orientation` table with its `@md/field-group` container queries. Grep confirms zero `aria-`, `useId`, `htmlFor` or generated `id` in the file.
- The same path under `bases/radix/` and `bases/aria/`: byte-identical apart from import paths and one extra `cn-field-label-aria` class.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/new-york-v4/ui/field.tsx: the legacy copy, which additionally carries `data-[invalid=true]:text-destructive` in `fieldVariants` — a selector for an attribute no part writes.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/new-york-v4/ui/form.tsx: the react-hook-form family that *does* wire it — `formItemId`/`formDescriptionId`/`formMessageId`, `htmlFor={formItemId}` on `FormLabel`, and on `FormControl` `aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}` plus `aria-invalid={!!error}`. `FormMessage` carries no role. This file does not exist under `bases/base` or `bases/radix` (404 at this SHA).
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/aria/ui/label.tsx: `if (htmlFor && slot === undefined) return <LabelContext.Provider value={null}>{label}</LabelContext.Provider>`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/registry/bases/base/ui/label.tsx and `input.tsx`: a bare `<label data-slot="label">` with no `htmlFor` of its own; `Input` as Base UI's `Input` primitive.
- https://ui.shadcn.com/docs/components/field and its source `apps/v4/content/docs/components/base/field.mdx`: the three composition trees, the Anatomy block with hand-written `htmlFor="input-id"`, the "Validation and Errors" section ("Add `data-invalid` to `Field`… Add `aria-invalid` on the input itself"), the Accessibility section's `role="group"` inheritance claim, and the `FieldError` API table (`errors` only) alongside the prose claim that it "also accepts issues".
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/content/docs/forms/react-hook-form.mdx: 638 lines, every example pairing a manual `id` with `aria-invalid={fieldState.invalid}` and `data-invalid={fieldState.invalid}`; zero occurrences of `aria-describedby`.
- https://github.com/shadcn-ui/ui/blob/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/apps/v4/public/r/styles/default/field.json: `registryDependencies: ["label", "separator"]`, one `files` entry.

### Adobe React Spectrum / React Aria (repo HEAD `4693fcc844a341107e7dd26fe456edb1e269e44c`, 2026-09-09)

- https://github.com/adobe/react-spectrum/blob/4693fcc844a341107e7dd26fe456edb1e269e44c/packages/react-aria/src/label/useField.ts: the full `aria-describedby` merge with the "`aria-errormessage` is unsupported using VoiceOver or NVDA" comment; both ids from `useSlotId` with the same four-element dep array.
- `.../packages/react-aria/src/label/useLabel.ts`: `htmlFor: labelElementType === 'label' ? id : undefined`, the simultaneous `aria-labelledby` when a `label` is given, and the development warning when neither label nor `aria-label`/`aria-labelledby` is present.
- `.../packages/react-aria/src/utils/useId.ts` (`useSlotId`, lines 129-150): "Used to generate an id, and after render, check if that id is rendered so we know if we can use it in places such as labelledby."
- `.../packages/react-aria/src/textfield/useTextField.ts` (lines 198-239): `validationBehavior = 'aria'` default; `required: isRequired && validationBehavior === 'native'`; `'aria-required': (isRequired && validationBehavior === 'aria') || undefined`; `'aria-invalid': isInvalid || undefined`; `'aria-errormessage': props['aria-errormessage']`.
- `.../packages/react-aria/src/radio/useRadioGroup.ts` (lines 60-163): `labelElementType: 'span'`; `role: 'radiogroup'`, `aria-invalid`, `aria-errormessage` pass-through, `aria-readonly`, `aria-required`, `aria-disabled`, `aria-orientation`.
- `.../packages/react-aria/src/checkbox/useCheckboxGroup.ts`: `role: 'group'`, `aria-disabled`, `...fieldProps`; the comment "Checkbox group is not an HTML input element so it shouldn't be labeled by a `<label>` element"; no `aria-invalid`.
- `.../packages/react-aria/src/form/useFormValidation.ts`: the `validationBehavior === 'native'` `setCustomValidity` path, `input.title = ''` to suppress the Firefox tooltip (bugzilla 605277), the `invalid`-event handler that focuses the first invalid input via `getFirstInvalidInput(form)`, `setInteractionModality('keyboard')`, and `e.preventDefault()` "Prevent default browser error UI from appearing."
- `.../packages/react-aria-components/src/FieldError.tsx`: `if (!validation?.isInvalid) return null`; renders `<Text slot="errorMessage">`; `elementType` defaulting to `'span'`; no role, no `aria-live`.
- `.../packages/react-aria-components/src/TextField.tsx` (line 107): `let validationBehavior = props.validationBehavior ?? formValidationBehavior ?? 'native'`; the `TextContext` slot map `{ description: descriptionProps, errorMessage: errorMessageProps }` and `FieldErrorContext`.
- `.../packages/@adobe/react-spectrum/src/label/HelpText.tsx`: `let isErrorMessage = errorMessage && (isInvalid || validationState === 'invalid')` and the single either/or branch; `showErrorIcon`; no role, no `aria-live`.
- `.../packages/@adobe/react-spectrum/src/label/Label.tsx` (lines 56-118): `necessityIndicator = isRequired != null ? 'icon' : null`; the localised `(required)`/`(optional)` strings; the `Asterisk` icon whose `aria-label` is set only when `includeNecessityIndicatorInAccessibilityName`; the three-line comment explaining why the necessity label is hidden when required and announced when optional; `htmlFor={ElementType === 'label' ? labelFor || htmlFor : undefined}`.
- `.../packages/@adobe/react-spectrum/src/label/Field.tsx`: the `descriptionProps`/`errorMessageProps` plumbing into one `HelpText`, and the `aria-labelledby` composition with `contextualHelpId`.
- `.../packages/@react-types/shared/src/inputs.d.ts`: `HelpTextProps` (`description`, `errorMessage`); `Validation` (`isRequired`, `isInvalid`, deprecated `validationState`, `validationBehavior?: 'aria' | 'native'` default `'aria'`, `validate`); `ValidationResult`.
- `.../packages/@react-types/shared/src/labelable.d.ts`: `NecessityIndicator = 'icon' | 'label'`; `SpectrumLabelableProps` with `labelPosition`, `labelAlign`, `necessityIndicator` (default `'icon'`), `isRequired`, `contextualHelp`.
- https://github.com/adobe/react-spectrum/issues/1346#issuecomment-740136268 (2020-12-07): "`aria-errormessage` is unsupported using VoiceOver or NVDA, we should probably favor `aria-describedby` for the time being." — the comment the source cites.

### Primer React (repo HEAD `c8803199ddb0e669596f6e2370fd4117a055cfc3`, 2026-09-11)

- `packages/react/src/FormControl/FormControl.tsx`: the four-slot `useSlots` call; `validationMessageId = slots.validation ? `${id}-validationMessage` : undefined`; the cloned input receiving `{ id, required, disabled, validationStatus, ['aria-describedby']: [validationMessageId, captionId].filter(Boolean).join(' ') }`; the choice-input branch passing `['aria-describedby']: captionId` only; the `console.error` when no `Label` child exists; the warnings against a validation message on an individual choice and against a required individual radio.
- `packages/react/src/FormControl/_FormControlValidation.tsx` and `packages/react/src/internal/components/InputValidation.tsx`: `variant: FormValidationStatus`; the rendered `<Text>` + `aria-hidden` icon span + `<span id>`; no role, no `aria-live`.
- `packages/react/src/FormControl/FormControlLabel.tsx` and `packages/react/src/internal/components/InputLabel.tsx`: `as: 'label' | 'legend' | 'span'` with `htmlFor` dropped for the latter two and for `SelectPanel` (`isReferenced === false`); the required marker `<span aria-hidden={requiredIndicator ? undefined : true}>{requiredText ?? '*'}</span>` with `requiredIndicator = true` by default.
- `packages/react/src/internal/components/CheckboxOrRadioGroup/CheckboxOrRadioGroup.tsx`: `const Component = labelChild ? 'fieldset' : 'div'`; the `<legend>` holding label, `<VisuallyHidden>, required</VisuallyHidden>`, caption and a visually hidden copy of the validation text, with the Tenon citation comment; `aria-hidden={Boolean(labelChild)}` on the visible validation container; the no-label fallback `{ ['aria-labelledby']: ariaLabelledby, ['aria-describedby']: [validationMessageId, captionId, requiredMessageId].filter(Boolean).join(' '), role: 'group' }`.
- `packages/react/src/internal/components/ValidationAnimationContainer.tsx`: a height/overflow animation wrapper with no role or live attributes.
- `packages/react/src/TextInput/TextInput.tsx` (lines 237-245): `aria-required={required}`, `aria-invalid={isValid === 'error' ? 'true' : undefined}`, and the `aria-describedby` composition that prepends the character-count id.
- `packages/react/src/Checkbox/Checkbox.tsx` (lines 93-95): `required`, `['aria-required']: required ? 'true' : 'false'`, `['aria-invalid']: validationStatus === 'error' ? 'true' : 'false'` — both always emitted.
- `packages/react/src/FormControl/__tests__/FormControl.test.tsx`: the emitted-markup assertions — `aria-required="true"`, `aria-describedby` equal to `${fieldId}-caption` and to `${fieldId}-validationMessage`, and the slot-detection tests that assert both ids reach the attribute.

### Primer ViewComponents (repo HEAD `53e6c75aef616fbda2ddcc022a0f4293ed24d261`, 2026-09-09) and `primer/design` (`87f799f202ec95df15c99f473c9c0c803da8e6b3`)

- `app/components/primer/alpha/text_field.rb` (line 5) and `lib/primer/form_components.rb` (lines 8-53): `TextField = Primer::FormComponents.from_input(Primer::Forms::Dsl::TextFieldInput)` — no `renders_one` anywhere, so no slots; the standalone component and the `f.text_field` builder method share one code path. Same shape for `check_box_group.rb` and `radio_button_group.rb`.
- `app/lib/primer/forms/dsl/input.rb`: lines 10-28, the keyword-argument API docs for `caption`, `label`, `invalid`, `validation_message`, `required`; lines 107-110, the `for` comment and assignment; lines 116-131, the `@ids` hash and `add_input_aria(:required/:invalid/:describedby)` block with `input_arguments.delete(:required)` and its comment; lines 238-243, the four spellings `required?` accepts; lines 257-266, `validation_messages` falling back to `builder.object.errors.full_messages_for(name)`; lines 310-316, `validation_arguments` with `hidden: valid? || validation_messages.empty?`.
- `app/lib/primer/forms/form_control.html.erb`: the whole template — `builder.label` with the `aria-hidden` asterisk, then content, then `ValidationMessage`, then `Caption`.
- `app/lib/primer/forms/validation_message.html.erb`: the rendered `<div class="FormControl-inlineValidation" id hidden>` with two `aria-hidden` icon spans and a bare text span. No role, no `aria-live`.
- `app/lib/primer/forms/caption.html.erb` (line 2): the only live region in the forms framework, `<span class="sr-only" aria-live="polite" role="status">` for the character counter.
- `app/lib/primer/forms/check_box_group.html.erb` and `radio_button_group.html.erb`: always a real `<fieldset>` carrying `@input.input_arguments`, with `role: 'radiogroup'` added for radio groups, a `<legend>` holding the label only, and the `ValidationMessage` rendered in a sibling `<div>` outside the fieldset.
- `app/lib/primer/forms/dsl/check_box_input.rb` (lines 49-51) and `radio_button_input.rb` (lines 42-44): `def supports_validation?; false; end`.
- `app/lib/primer/forms/base.rb` (lines 81-88): `before_render` calling `input.autofocus!` on the first invalid focusable input.
- `app/lib/primer/forms/primer_text_field.ts` (lines 77, 98) versus `app/lib/primer/forms/character_counter.ts` (lines 104-105, 119-120): the remote-validation path sets only the non-ARIA `invalid` attribute; the character counter sets both `invalid` and `aria-invalid`.
- `app/components/primer/alpha/form_control.rb`: the escape-hatch component — its own docs saying it "cannot semantically connect the input and its associated label… consumers are highly encouraged to use Primer's pre-made form components like `TextField`"; one `renders_one :caption`; lines 121-130 building `aria-describedby` with validation before caption and setting `aria-required` but never `aria-invalid`.
- `test/lib/primer/forms_test.rb` (lines 13-18, 308-309) and `test/lib/primer/forms/checkbox_group_input_test.rb` (lines 62-71): the emitted-markup assertions — the `aria-hidden` asterisk plus `input[aria-required='true']`; `toggle-switch button[aria-labelledby=…]`; `fieldset[invalid=true][aria-invalid=true]` with `refute_selector "input[type=checkbox][invalid]"` and `input[type=checkbox][value=lopez][autofocus]`.
- `.playwright/screenshots/snapshots.test.ts-snapshots/primer/alpha/radio_button_group/invalid/aria-snapshot.yml` and `.../primer/forms/invalid_form/aria-snapshot.yml`: accessibility-tree snapshots showing the validation text as plain text with no role, outside the group.
- `primer/design` `content/ui-patterns/forms/overview.mdx`: line 28-39 on required-field indicators and marking the form control rather than the input; line 66 ("An individual radio button cannot be marked as required") and line 114; line 149 ("An individual checkbox or radio should not have its own validation message or style"); line 168 ("Show the validation message and remove the caption"); line 372 ("Use Primer instead of browser-native validation UI"); lines 402-408, the `aria-invalid` + `aria-describedby` rule including "If the inline error message is removed from the DOM, _also_ remove the `aria-describedby` attribute"; line 410, the live-region prohibition; line 446, the focus-moves-to-next-control caveat.
- `previews/pages/forms/08_validations.md.erb`: "Primer forms will automatically focus the first invalid input in accordance with accessibility best-practices."
- GitHub code search at this SHA: `aria-errormessage repo:primer/view_components` → 0; `role=alert repo:primer/view_components` → 0; `tenon repo:primer/view_components` → 0. `@github/auto-check-element` (`f67668a1bc4f957c26b5ddfe4b79ba8ffcf41fad`) `src/auto-check-element.ts` sets no ARIA, only `setCustomValidity`.

### Specs, WCAG, and accessibility guidance

- https://w3c.github.io/aria/#aria-errormessage (ARIA 1.3 ED): the MUST-use-with-`aria-invalid` rule, the hidden-when-not-pertinent MUSTs, "User agents MUST NOT expose `aria-errormessage` for an object with an `aria-invalid` value of false", the live-region MAY, Example 37's always-present empty `<span role="alert">`, and the `ID reference list` Value characteristic.
- https://www.w3.org/TR/wai-aria-1.2/#aria-errormessage: the same prose in the singular — "another element", `ID reference` — which is the 1.2 → 1.3 cardinality change.
- https://w3c.github.io/aria/#aria-invalid: "if the user has not attempted to submit the form, authors SHOULD NOT set the `aria-invalid` attribute on required widgets simply because the user has not yet entered data"; token-type treatment of unrecognised values; the default-`false` rule; the "being deprecated as a global state in ARIA 1.2" note; the Used in Roles list that excludes `group`.
- https://w3c.github.io/aria/#aria-required: "Unless an exactly equivalent native attribute is available, host languages SHOULD allow authors to use the `aria-required` attribute"; Related Concepts `required` attribute in HTML; the Used in Roles list.
- https://w3c.github.io/aria/#aria-describedby: "The element or elements referenced by the `aria-describedby` comprise the entire description. Include ID references to multiple elements if necessary."
- https://www.w3.org/TR/WCAG22/#dfn-change-of-context and #dfn-status-messages: "Changes in context include changes of: user agent; viewport; focus; content that changes the meaning of the web page", with "moving focus to a different component" as an example; a status message is "a change in content that is not a change of context".
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html: the Postal Code inline-error example as an in-scope status message; the dialog-takes-focus exclusion; "The purpose of this success criterion is not to force authors to generate new status messages."
- https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21: Sufficient for 3.3.1; "The `aria-invalid` attribute should not be set to `"true"` before input validation is performed. Setting `aria-invalid` to `"false"` is the same as not placing the attribute for the form control."
- https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19: Sufficient for 3.3.1 and 4.1.3; "The error container must be present in the DOM on page load for the error message to be spoken by most screen readers. `aria-atomic=true` is necessary to make Voiceover on iOS read the error messages after more than one invalid submission."
- https://www.w3.org/WAI/WCAG22/Techniques/ and the quickref: zero occurrences of `aria-errormessage` — there is no WCAG technique for it.
- https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/: the Cardinal Rules (notably Rule 2 Prefer Visible Text and Rule 3 Prefer Native Techniques); the description-presentation paragraph ("presented last, sometimes after a slight delay… some screen readers do not announce descriptions by default"); "Naming Fieldsets with the Legend Element" and its "satisfies Rule 2… and Rule 3" line; the `aria-labelledby` cannot-be-chained warning; the Accessible Name Guidance by Role table rows for `group` (Discretionary), `radiogroup` (Required), `textbox`/`combobox`/`listbox`/`slider`/`spinbutton`/`searchbox` (Required), `checkbox`/`radio` (Required Only If Content Insufficient), `form` (Recommended).
- https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/examples/quantity-spinbutton/ (source `content/patterns/spinbutton/examples/quantity-spinbutton.html` in `w3c/aria-practices`): the only APG use of `aria-errormessage` — static attribute, always-rendered `<small id="error-adults">`, no `role="alert"`, a separate `<output data-self-destruct>` live region, the three-step error rationale, and the explicit refusal to use `aria-describedby` for adjacent help text. `content/about/coverage-and-quality/prop-coverage.csv` records `"aria-errormessage","0","1"`.
- https://www.w3.org/WAI/tutorials/forms/notifications/: the page-level `<div role="alert">` error summary, `aria-describedby="firstname_error"` for the per-field association, the `aria-live="polite"` and `"assertive"` instant-feedback spans with their verbosity reasoning, "If the submitted data contains errors, it is convenient to set the focus to the first `<input>` element that contains an error", and the Related Techniques list (ARIA18, ARIA19, ARIA21, G83, G85). Zero occurrences of `aria-errormessage` across all five tutorial pages.
- https://www.w3.org/WAI/tutorials/forms/validation/: the three-mechanism required recipe — "(required)" in the label, the native `required` attribute, and `aria-required="true"` — with the note that browsers usually set `aria-required` from `required` and that the redundancy exists for those that do not.
- https://www.w3.org/WAI/tutorials/forms/labels/: "Whenever possible, use the `label` element to associate text with form elements explicitly"; the hidden-`<label>`, `aria-label`, `aria-labelledby` and `title` alternatives in descending order of preference; "Generally, explicit labels are better supported by assistive technology."
- https://www.w3.org/WAI/tutorials/forms/grouping/: "Radio button groups should always be grouped using `<fieldset>`"; the `role="group"` + `aria-labelledby` alternative presented as providing "additional styling possibilities"; "The legend for a group of controls can also highlight common attributes of all controls, for example, to advise that all fields in the group are required."
- https://www.w3.org/WAI/tutorials/forms/instructions/: the Important note on forms mode — "they usually only read aloud form elements such as `<input>`, `<select>`, `<textarea>`, `<legend>`, and `<label>`. It is critical to include form instructions in ways that can be read aloud."
- https://a11ysupport.io/tests/tech__aria__aria-errormessage-with-aria-invalid-true (data at `data/tests/tech/aria/aria-errormessage-with-aria-invalid-true.json` on `master`): the per-AT verbatim table in §9.2 with its per-pair AT, browser, OS and test dates.
- https://a11ysupport.io/tests/tech__aria__aria-describedby-with-role-alert (`data/tests/tech/aria/aria-describedby-with-role-alert.json`): the description is lost on VoiceOver macOS, VoiceOver iOS and Orca browse mode, with the test description citing https://bugzilla.mozilla.org/show_bug.cgi?id=1505974.
- https://a11ysupport.io/tests/tech__aria__aria-required and `.../aria-required-radiogroup`: universal support except TalkBack for a single input; widespread failure on `radiogroup`, with the note "the most robust solution to mark a group of radio buttons as required is to place the text 'required' in the group label."
- https://blog.tenon.io/accessible-validation-of-checkbox-and-radiobutton-groups/: the source Primer React cites in its `<legend>` duplication comment. Cited here as the reference the implementation names, not as independent authority.

### Ultima's own constraints

- `docs/spec/ultima.md` → Principles, The v0 set, One file per component, Props every component accepts, Compound components, Styled parts, Variants sizes and tones, State styling, Tokens in component code, Focus ring, Accessibility contract (the Input row's "Input works without Field… Field is planned for v0.1 and moves into v0 if the docs needs it; adding it preserves standalone Input usage", and the `':is([aria-invalid="true"])'` selector it names), Iconography, Naming, The registry item, Testing → What a build ticket proves / Accessibility checks.
- `docs/research/2026-09-08-base-ui-inventory.md`: the existing record of Base UI's `useRender` state-to-`data-*` conversion that this note's `data-invalid` claims build on.
- `docs/research/2026-09-09-sidebar-surfaces.md`: the `getStateAttributesProps` finding (`true` → `data-<key>=""`, `false` → attribute omitted) that §3's "`aria-invalid="false"` is noise" argument reuses, and the method this note follows.
