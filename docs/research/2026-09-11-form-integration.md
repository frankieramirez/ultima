# Which form integration should v0.1's form examples document, measured across Base UI's own `Form`, React Hook Form, TanStack Form, and a fourth candidate?

## Findings

**Base UI's `Field` is the accessible surface and is not a candidate on this list.** It is a primitive ADR 0002 already adopted, it renders DOM by design, and it is the only one of the four that supplies any ARIA at all. The three libraries are engines in ADR 0007's sense, they all pass the headless gate, and none of them overlaps `Field`, because **none of them emits a single `aria-*` attribute**. That is verified by grepping their published builds, not inferred: zero matches for `aria-` in `react-hook-form@7.87.0`'s `dist/index.esm.mjs`, in every file of `@tanstack/react-form@1.33.5`'s `dist/esm/`, and in `@formisch/react@1.1.0`'s `dist/index.js`. ADR 0002 needs no amendment and ADR 0007's gate rules none of them out.

So the question is not accessibility. It is which engine the recipe documents, and what that engine costs.

**The answer the evidence supports: React Hook Form as the documented integration, shipped as a recipe over `field`, with TanStack Form as a second recipe if v0.1 wants two.** React Hook Form is the only candidate that both Base UI and shadcn/ui document, it is dual-published so it adds no ESM-only caveat, it has zero runtime dependencies, and it is the only one whose field state maps onto `Field.Root`'s three external-state props with nothing left over. TanStack Form is the cleaner engine by the gate (it renders no DOM whatsoever) and is also documented by both, at the cost of four transitive packages. Formisch, the fourth candidate, is ruled out on cost rather than on the gate.

### The fourth candidate, and why it is Formisch

shadcn/ui's `/docs/forms` index lists **four** frameworks, not one: React Hook Form, TanStack Form, Formisch, and "React `useActionState` (Coming Soon)". Each of the first three has a full guide in `apps/v4/content/docs/forms/`, and a fourth guide for Next.js `useActionState` already exists at `forms/next.mdx` even though the index card is still marked coming soon. Base UI's own handbook documents exactly two, React Hook Form and TanStack Form, and Base UI's `Form` page documents the `useActionState` path through its `errors` prop. Formisch therefore qualifies under the brief's test (a primary source shows a comparable system documents it) and nothing else does.

The zero-cost fifth option is worth naming: **React `useActionState` with Base UI `Form`'s `errors` prop is not a library at all.** Base UI documents it on both its `Form` page and the handbook, and it adds no dependency to anything. If v0.1 wants a documented submission-and-validation example that costs a consumer nothing, that is it.

### What each supplies, and what it leaves to the caller

| | Base UI `Form` + `Field` | React Hook Form | TanStack Form | Formisch |
|---|---|---|---|---|
| Validation state | per-field `valid`/`dirty`/`touched`/`filled`/`focused`, from native `ValidityState` plus `validate` | `formState` (`isDirty`, `isValid`, `isValidating`, `dirtyFields`, `touchedFields`, `errors`, `submitCount`) and per-field `fieldState` (`invalid`, `isTouched`, `isDirty`, `isValidating`, `error`) | `form.state` and `field.state.meta` (`isValid`, `isDirty`, `isTouched`, `errors`) | `field.errors`, `field.input`, form store read through top-level `getErrors`/`getInput` |
| Submission | native `<form>` with `noValidate`, validates every registered field on submit, `preventDefault`s and focuses the first invalid control, `onFormSubmit` hands back values as an object | `handleSubmit(fn)` wrapping your handler; `isSubmitting`, `isSubmitSuccessful`; optional `<Form>` component that can POST an `action` itself | `form.handleSubmit()` called from your own `onSubmit`; `onSubmit` parameter on `useForm` | `<Form of={form} onSubmit={...}>` wrapping the native `<form>`, plus a top-level `submit(form)` |
| Error messages | `Field.Error`, auto-renders the native message, `match` prop selects a `ValidityState` key or takes a boolean; `Form.errors` merges server errors by field name and clears each on change | `errors[name].message`, rendering is entirely yours | `field.state.meta.errors`, rendering is yours | `field.errors`, rendering is yours |
| Field registration | `name` on `Field.Root` (takes precedence over `Field.Control`'s); controls register into a `Map` on the form context | uncontrolled `register(name, rules)` returning `{name, onChange, onBlur, ref}`, or controlled `<Controller>`/`useController` | `form.Field` render-prop component, typed from `defaultValues` | `<Field of={form} path={[...]}>` render prop, paths typed from the schema |
| Async validation | `validate` may return a `Promise`, with `validationDebounceTime`. **Documented limitation:** "Asynchronous functions are supported, but they do not prevent form submission when using `validationMode=\"onSubmit\"`", and `Form.tsx` says so in a comment at the submit handler: "Async validation isn't supported to stop the submit event." | `validate` rules and resolvers may be async; `isValidating`/`validatingFields` expose it | `validators.onChangeAsync` and friends, with per-validator debounce | async validation through the schema |
| Schema support | none. The Zod demo is the consumer's own `schema.safeParse()` plus `z.flattenError(...).fieldErrors` mapped onto `Form.errors` | none in core. `resolver` is a bare function type; schemas come from **`@hookform/resolvers`**, a separate install, which ships 21 adapter subpaths including `./standard-schema` and `./zod` | built in. `@tanstack/form-core` ships `standardSchemaValidator.js`, so any Standard Schema library (Zod, Valibot, ArkType) works with no adapter package | built in but **not optional**: `valibot` is a required peer dependency, so the schema library is part of the install |

What Base UI leaves to the caller is the thing the other three exist for: there is no form-level values store (values live in the DOM and are read back at submit), no field arrays, no `isSubmitting`, no schema hook, and no way to block submission on an async validator. What the three leave to the caller is every id, every label association, and every ARIA attribute.

One accessibility gap belongs to Base UI rather than to any engine, and the recipe has to close it: **`Field.Error` renders a bare `<div>` with no `role` and no live region.** It joins `aria-describedby` when rendered, so a screen reader reaching the control hears it, but an error appearing after submit announces nothing on its own.

### The headless gate

ADR 0007 requires an engine to render no DOM and no styles. None of the three emits `className` or `style`, and the DOM each one can render is countable:

- **React Hook Form** — one element, in one optional component. Its whole ESM bundle contains exactly three `createElement` calls: `createElement("form", ...)` in the `<Form>` component, and two context providers. `useForm`, `register`, `Controller`, and `useController` render nothing. `<Form>` is optional and the documented Base UI path does not use it, so the recipe renders no RHF DOM.
- **TanStack Form** — zero elements. No `jsx(...)` or `createElement(...)` with a string tag anywhere in `@tanstack/react-form`'s `dist/esm/`, and nothing DOM-shaped in `@tanstack/form-core`. `form.Field` is a pure render prop. The TanStack Form docs call it "headless UI components, and a framework-agnostic design" in as many words. It passes the gate the most cleanly of the three, the same way TanStack Table did.
- **Formisch** — one element, `jsx("form", ...)`, from its `<Form>` component, which the shadcn guide describes as the point of that component ("`<Form />` component to wrap the native `<form>` element with submit handling"). Its dist also references `noValidate`.

The gate passes for all three. It is not the discriminator here, which is why the cost column is.

### What each costs a consumer

| | React Hook Form | TanStack Form | Formisch |
|---|---|---|---|
| Package | `react-hook-form` | `@tanstack/react-form` | `@formisch/react` |
| Version | 7.87.0 | 1.33.5 | 1.1.0 |
| License | MIT | MIT | MIT |
| Runtime dependencies | **none** | `@tanstack/form-core`, `@tanstack/react-store`, and transitively `@tanstack/store`, `@tanstack/pacer-lite`, `@tanstack/devtools-event-client`, `use-sync-external-store` — **six packages** | none |
| Peer requirements | `react ^16.8 \|\| ^17 \|\| ^18 \|\| ^19` | `react ^17 \|\| ^18 \|\| ^19`; `@tanstack/react-start` optional | `react >=16.8 <20`, `react-dom >=16.8 <20`, **`valibot >=1.4.1 <2` (not optional)**, `typescript` optional |
| Module format | CJS + ESM + **UMD**. `exports["."]` has both `import` and `require` | CJS + ESM throughout the tree. Every one of the six packages publishes a `require` condition | **ESM-only.** `exports["."]` is `{types, import}` with no `require`; `type: "module"`; `main` points at `dist/index.js` |
| Published tarball | 1.22 MB unpacked, 227 files | 567 KB / 69 files, plus 1.66 MB form-core, 64 KB react-store, 123 KB store, 267 KB pacer-lite, 112 KB devtools-event-client | 159 KB, 6 files |
| Shipped JS (gzipped) | 27.6 KB for the single ESM entry | 3.0 KB for the React adapter plus 23.7 KB for form-core | 4.8 KB, plus whatever of `valibot` the schema pulls |
| Schema install | `@hookform/resolvers` 5.9.1 (MIT, CJS+ESM+UMD, one dependency `@standard-schema/utils`, every validator an optional peer) plus the validator | none | `valibot` is already a required peer |
| `engines.node` | `>=18` | unset on the adapter; `>=18` on pacer-lite and devtools-event-client | unset |

**ESM-only matters, and only Formisch changes the paragraph.** Ultima's one existing ESM-only caveat is TanStack Table v9, and that is still accurate: `@tanstack/react-table@9.2.4` and `@tanstack/table-core@9.2.4` publish `exports["."]` as a bare `"./dist/index.js"` string with no `main`, no `require` condition, and `engines.node >= 20`. TanStack **Form** is a different package family and is dual-published end to end, so choosing it adds nothing to that paragraph. React Hook Form adds nothing either, and ships a UMD build on top. Choosing Formisch would make it two caveats, and would also put a schema library in the consumer's required install rather than in their choice.

Two smaller costs to note. `@tanstack/form-core` imports `@tanstack/devtools-event-client` unconditionally at module scope in `EventClient.js` and `@tanstack/pacer-lite` in `utils.js`, so a devtools event client is in the dependency graph of every production build that uses TanStack Form. And `@hookform/resolvers` declares 25 peer dependencies, 24 of them optional, which is noisy in a lockfile even though only the one you use installs.

### How each interacts with Base UI's `Field`

**Base UI documents both RHF and TanStack Form, in its own handbook, with working demos.** The page is `/react/handbook/forms` and it opens by saying the form control components "also integrate seamlessly with third-party libraries like React Hook Form and TanStack Form". `Field.Root` carries three props that exist for exactly this, each documented with the same sentence in the source, "Useful when the field state is controlled by an external library": `invalid`, `dirty`, and `touched`. The documented shape is the same for both libraries:

```tsx
<Field.Root name={field.name} invalid={invalid} touched={isTouched} dirty={isDirty}>
```

`Field` supplies the accessible wiring under that: `aria-labelledby` from `Field.Label` (set in `FieldControl.tsx`), `aria-describedby` accumulated from `Field.Description` and `Field.Error` (`LabelableProvider.tsx`), and `aria-invalid` when the field is invalid and not disabled (`useFieldValidation.ts`). That is the whole of what the engines do not do.

**Two sources of validation state: only with React Hook Form, and they merge rather than fight.** The external `invalid` prop does not replace Base UI's verdict, it ANDs with it — `getCombinedFieldValidityData` computes `valid: !invalid && validityData.state.valid` — and the combined value is what the form's registered-field map holds. But `Form`'s submit handler still runs its own pass over every field (`formRef.current.fields.forEach((field) => field.validate())`) and `preventDefault`s before calling your `onSubmit` if any field is invalid. So with the documented RHF shape, `<Form onSubmit={handleSubmit(submitForm)}>`, Base UI's gate runs first and can block the submit before `handleSubmit` is ever reached. A native `required` with no matching RHF rule blocks on Base UI's side alone. The two sources co-operate, but both are live, and the recipe has to pick which one owns each rule.

**TanStack Form has one source, because Base UI says to drop its `Form`.** The handbook states it plainly: "The Base UI `<Form>` component is not needed when using TanStack Form." The documented shape is a native `<form>` with `form.handleSubmit()`, and `Field.Root` used purely for the accessible wiring with `invalid`/`dirty`/`touched` fed from `field.state.meta`. No second validation pass, no submit gate to reconcile. For a v0.1 recipe that has to be correct rather than clever, that is the simpler contract to write down.

Formisch is not documented by Base UI at all. Whether `Field.Root`'s external-state props accept its `field.errors !== null` shape is obvious enough from the types, but **no primary source documents that integration and I did not verify it running**.

### The recipe shape applies, and `scripts/build-registry.ts` forces it

ADR 0007's mechanic is exact here. `item()` in `scripts/build-registry.ts` builds a `registry:ui` item's `dependencies` from `dependenciesOf(staged)`, which is derived purely from the staged file's own import specifiers, and `describe(name)` only destructures `title`, `description`, `docs` for that path. `dependencies` and `devDependencies` from `registry/items.config.ts` are read by `setupItem()` alone, for the two universal setup items. There is no way to declare a form-library dependency on a `registry:ui` item and no way to mark a derived one optional.

So: **a `field.tsx` that imports a form library puts that library in `@ultima/field`'s `dependencies`, and every consumer of Field installs it.** Field is the most widely depended-on item in v0.1 — Textarea, Checkbox, Radio Group, Combobox, and Slider all sit inside one — so that import would reach nearly the whole milestone. The recipe shape is not a preference here, it is the only shape that keeps v0.1's items free of a data layer, exactly as ADR 0007's first consequence requires.

What that costs is what it cost Data Table: the copyable example is the whole contract, it has to name its component dependencies, and it has to be covered by the applicable checks.

### What shadcn/ui documents, checked against the real registry JSON

This is the precedent, and it cuts the opposite way from Data Table. shadcn ships **both** a Field item with no form-library dependency **and** per-library guides.

| Item | Real registry JSON | `dependencies` | `registryDependencies` |
|---|---|---|---|
| `field` | `https://ui.shadcn.com/r/styles/new-york-v4/field.json` | `["cn"]` | `["label", "separator"]` |
| `form` | `https://ui.shadcn.com/r/styles/new-york-v4/form.json` | `["cn", "radix-ui", "@hookform/resolvers", "zod", "react-hook-form"]` | `["button", "label"]` |

The `field` item carries **no form library at all**. The `form` item — the React-Hook-Form-coupled `form.tsx` with `FormProvider`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` — is still served by the registry, and the older `new-york` style serves the same item with `@radix-ui/react-label` and `@radix-ui/react-slot` in place of `radix-ui`. But **it has no docs page in the v4 content tree**: `apps/v4/content/docs/components/form.mdx` returns 404, while `components/{aria,base,radix}/field.mdx` all exist. All four form guides build on `<Field />`, not on `form.tsx`. Each one says so in the same words: "We'll build our form using the `<Field />` component, which gives you **complete flexibility over the markup and styling**." I found no primary source calling `form` deprecated; what is verifiable is that the item is still published and the docs no longer reference it.

The second half of the precedent is the warning. shadcn's `field.tsx` supplies **zero `aria-*` attributes** — it sets `role="group"` and `role="alert"`, has no `htmlFor` and no `useId`, and leaves every id and every association to the consumer. And across all four guides:

- **Zero occurrences of `aria-describedby`.** Not one of the four wires a description or an error message to its control.
- **Zero occurrences of the word `required`.** Not one guide demonstrates a required field.
- `aria-invalid` appears 16, 16, 15, and 3 times, always hand-written by the consumer at each call site, and the guides say so: "Add the `aria-invalid` prop to the form control such as `<Input />`, `<SelectTrigger />`, `<Checkbox />`, etc."
- Only the Next.js guide has a "Disabled States" section. The other three mention `disabled` twice each, both times on an unrelated add-item button.
- Three of the four intros promise accessibility ("error handling, accessibility, and more", "handle errors, and ensure accessibility" twice) and **none of the four has an accessibility section**.

That is the `aria-sort` finding from ADR 0007 again, on the exact three states v0.1's checklist names. Ultima gets the description and error wiring for free from Base UI `Field`, which shadcn's Field does not supply, so the recipe inherits a better starting position — and the checklist's "disabled, required, and invalid states" is precisely the part the precedent gets wrong and Ultima has to get right.

### Could not be verified

- Whether Formisch integrates with `Field.Root`'s external-state props in practice. No primary source documents it and this worktree has no `node_modules` to test against.
- Whether shadcn considers the `form` item deprecated. The item is published; the docs page does not exist. No source states intent.
- Download or adoption figures for any candidate. Not fetched, and none of the claims above rest on popularity.
- Real-world gzipped cost inside a bundler. The figures above are `gzip -c` over the published ESM files, which is a ceiling for RHF (one entry, tree-shakeable, `sideEffects: false`) and a sum across files for the TanStack packages.

## Sources

- `docs/adr/0007-engines-ship-as-recipes.md`: the headless gate ("An engine must still be headless, rendering no DOM and no styles, or it is not a candidate at all"), the recipe shape, the no-engine-dependency consequence, and the `aria-sort` precedent for what a recipe gets wrong when nobody owns the contract.
- `docs/adr/0002-base-ui-primitives.md`: the four things Base UI owns, which fixes what an overlap would have to be.
- `docs/spec/ultima.md`, Release scope and core coverage: the v0.1 line under measurement, "The form examples must demonstrate submission and validation with a documented form integration, including disabled, required, and invalid states", and the five hand edits a new item costs.
- `docs/spec/ultima.md`, Registry and install: the derived-dependency rule, and the existing TanStack Table v9 ESM-only caveat this research checked against.
- `scripts/build-registry.ts` lines 108–122 and 148–161: `dependenciesOf` derives a `registry:ui` item's `dependencies` from import specifiers alone; `item()` destructures only `title`, `description`, `docs` from `describe(name)`, so a form-library import cannot be declared away.
- `scripts/build-registry.ts` lines 176–190: `setupItem()` is the only path that reads `dependencies`/`devDependencies` from `registry/items.config.ts`.
- https://base-ui.com/react/handbook/forms (source: `docs/src/app/(docs)/react/handbook/forms/page.mdx` at tag `v1.8.0`): Base UI documents React Hook Form and TanStack Form with demos; "they also integrate seamlessly with third-party libraries like React Hook Form and TanStack Form"; the `<Controller>` shape forwarding `name`/`invalid`/`touched`/`dirty` and `ref`; the `form.Field` shape; "The Base UI `<Form>` component is not needed when using TanStack Form"; the constraint-validation attribute list (`required`, `minLength`, `maxLength`, `pattern`, `step`); the hidden-input note; `validationMode` and `validationDebounceTime`; the server-error and `useActionState` paths.
- https://base-ui.com/react/components/form (source: `.../react/components/form/page.mdx` at `v1.8.0`): Form composes with Field, `onFormSubmit` returns values as an object and calls `preventDefault`, the Zod example is `schema.safeParse()` plus `z.flattenError(result.error).fieldErrors`, and the Server Function demo.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/form/Form.tsx: "A native form element with consolidated error handling. Renders a `<form>` element"; `noValidate: true`; the submit handler's `fields.forEach((field) => field.validate())` then `if (focusFirstInvalid()) { event.preventDefault(); return; }` before `onSubmit?.(event)`; the comment "Async validation isn't supported to stop the submit event."; `onFormSubmit` assembling `formValues` from registered field names; `clearErrors` deleting a field's entry from `errors`; `actionsRef.validate`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/root/FieldRoot.tsx lines 264–326: the `FieldRootProps` interface. `invalid`, `dirty`, and `touched` each documented "Useful when the field state is controlled by an external library"; `validate` documented "Asynchronous functions are supported, but they do not prevent form submission when using `validationMode=\"onSubmit\"`"; `name` takes precedence over `Field.Control`'s.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/root/useFieldValidation.ts: `aria-invalid` set only when `state.valid === false && !state.disabled && !disabled` (line 372); the async branch publishing `valid: null` while a promise is pending; `getNativeErrors`/`setCustomValidity` bridging to `ValidityState`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/utils/getCombinedFieldValidityData.ts: `valid: !invalid && validityData.state.valid`, which is how an external library's `invalid` merges with Base UI's own verdict.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/control/FieldControl.tsx line 136: `'aria-labelledby': labelId`, and the doc comment that Input, Checkbox and Select "will work with Field out of the box".
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/internals/labelable-provider/LabelableProvider.tsx lines 70–77: `aria-describedby` accumulated and deduped from description and error ids.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/field/error/FieldError.tsx: "Renders a `<div>` element", and no `role` or `aria-live` anywhere in `packages/react/src/field` — the announcement gap the recipe has to close.
- https://registry.npmjs.org/react-hook-form/latest: 7.87.0, MIT, no `dependencies`, peer `react ^16.8.0 || ^17 || ^18 || ^19`, `engines.node >=18.0.0`, `sideEffects: false`, `exports["."]` with both `import` (`dist/index.esm.mjs`) and `require` (`dist/index.cjs.js`), 1,217,691 bytes unpacked over 227 files.
- `react-hook-form@7.87.0` `dist/index.esm.mjs` (from the npm tarball): zero `aria-` matches; exactly three `createElement` calls, one of them `createElement("form"`; no `className` or `style:`; 139,051 bytes raw, 27,626 gzipped. `dist/index.umd.js` exists, so the package is triple-published.
- `react-hook-form@7.87.0` `dist/types/form.d.ts` lines 62–79 and `dist/types/controller.d.ts` lines 4–18: `UseFormProps` (`mode`, `disabled`, `resolver`, `shouldUseNativeValidation`, `progressive`, `criteriaMode`, `delayError`, `shouldFocusError`); `Resolver` is a bare function type, so core has no schema support; `ControllerFieldState` is `{invalid, isTouched, isDirty, isValidating, error}` and `ControllerRenderProps` is `{onChange, onBlur, value, disabled?, name, ref}`.
- `react-hook-form@7.87.0` `dist/index.esm.mjs` lines 3118–3135: `register` returns `name`/`onChange`/`onBlur`/`ref`, `disabled` when defined, and native `required`/`min`/`max`/`minLength`/`maxLength`/`pattern` **only** under `_options.progressive`.
- `react-hook-form@7.87.0` `README.md`: "Embraces native HTML form validation", "Small size and no dependencies", "Supports Yup, Zod, AJV, Superstruct, Joi and others".
- https://registry.npmjs.org/@hookform/resolvers/latest: 5.9.1, MIT, one dependency `@standard-schema/utils ^0.3.0`, 25 peer dependencies of which 24 are optional, `exports` with `import`/`require`/`umd`, and 21 validator subpaths including `./standard-schema` and `./zod`, 1,164,823 bytes unpacked.
- https://registry.npmjs.org/@tanstack/react-form/latest: 1.33.5, MIT, `type: "module"` with both `import` and `require` conditions, dependencies `@tanstack/form-core@1.33.5` and `@tanstack/react-store ^0.11.0`, peer `react ^17 || ^18 || ^19`, `@tanstack/react-start` optional, no `engines`, 566,798 bytes over 69 files.
- https://registry.npmjs.org/@tanstack/form-core/latest, `/@tanstack/react-store/latest`, `/@tanstack/store/latest`, `/@tanstack/pacer-lite/latest`, `/@tanstack/devtools-event-client/latest`: the six-package tree, all MIT, all publishing a `require` condition, unpacked at 1,659,426 / 63,848 / 123,093 / 267,008 / 112,149 bytes.
- `@tanstack/react-form@1.33.5` `dist/esm/*.js` (from the npm tarball): zero `aria-` matches, zero `jsx("tag")` or `createElement("tag")` matches, no `className` or `style:`; 16,876 bytes raw, 2,997 gzipped. `@tanstack/form-core@1.33.5` `dist/esm/*.js`: zero `aria-`, no `document.`, no `createElement`; 133,230 bytes raw, 23,684 gzipped.
- `@tanstack/form-core@1.33.5` `dist/esm/standardSchemaValidator.js` (matches `~standard`), `dist/esm/EventClient.js` (`import { EventClient } from "@tanstack/devtools-event-client"`), `dist/esm/utils.js` (`import { liteThrottle } from "@tanstack/pacer-lite"`): built-in Standard Schema support, and two unconditional module-scope imports.
- https://github.com/TanStack/form/blob/main/docs/overview.md: "Designed with first-class TypeScript support, headless UI components, and a framework-agnostic design". "Accessibility and responsive design" appears in the list of "common form-related challenges" a developer can tackle with it, which is not a claim to supply ARIA, and the dist confirms it supplies none.
- https://registry.npmjs.org/@tanstack/react-table/latest and `/@tanstack/table-core/latest`: 9.2.4, `exports["."]` is the bare string `"./dist/index.js"` with no `main` and no `require` condition, `engines.node >=20` — the existing ESM-only caveat, re-verified and still accurate, and a different package family from TanStack Form.
- https://registry.npmjs.org/@formisch/react/latest: 1.1.0, MIT, `type: "module"`, `exports["."]` is `{types, import}` with **no `require`**, `main: "./dist/index.js"`, no dependencies, peers `react >=16.8.0 <20`, `react-dom >=16.8.0 <20`, `valibot >=1.4.1 <2`, `typescript >=5 <8`, with only `typescript` marked optional; 159,377 bytes over 6 files; repository `github.com/open-circle/formisch`.
- `@formisch/react@1.1.0` `dist/index.js` (from the npm tarball): zero `aria-` matches, exactly one `jsx("form"`, references `noValidate`; 25,852 bytes raw, 4,807 gzipped.
- https://registry.npmjs.org/valibot/latest: 1.5.0, MIT, dual-published, 1,865,457 bytes unpacked — the schema library Formisch makes mandatory.
- https://ui.shadcn.com/r/styles/new-york-v4/field.json: `name: "field"`, `type: "registry:ui"`, `dependencies: ["cn"]`, `registryDependencies: ["label", "separator"]`. No form library. Its `field.tsx` contains zero `aria-*` attributes, no `htmlFor`, no `useId`, and sets only `role="group"` and `role="alert"`.
- https://ui.shadcn.com/r/styles/new-york-v4/form.json: `name: "form"`, `type: "registry:ui"`, `dependencies: ["cn", "radix-ui", "@hookform/resolvers", "zod", "react-hook-form"]`, `registryDependencies: ["button", "label"]`. The file hand-builds `htmlFor`, `aria-describedby`, `aria-invalid` and the three ids that Base UI `Field` supplies. https://ui.shadcn.com/r/styles/new-york/form.json is the same item with `@radix-ui/react-label` and `@radix-ui/react-slot`.
- https://ui.shadcn.com/r/index.json: 63 items, including both `field` and `form` as `registry:ui`, and no TanStack-, Formisch-, or RHF-specific integration item.
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/forms/index.mdx: the "Pick Your Framework" cards — React Hook Form, TanStack Form, Formisch, and "useActionState (Coming Soon)".
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/forms/react-hook-form.mdx: built on `<Field />` with `<Controller />`, `zodResolver`, the validation-mode table, and "Add the `aria-invalid` prop to the form control". Zero `aria-describedby`, zero `required`, no accessibility section, and `disabled` only on an array add-item button.
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/forms/tanstack-form.mdx and `.../formisch.mdx`: same shape on `<Field />`; zero `aria-describedby` and zero `required` in each. The Formisch page states Formisch is "the lightweight, schema-first, and fully type-safe form library for React", validated with Valibot, and that its `<Form />` wraps the native `<form>`.
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/forms/next.mdx: the fourth guide, `useActionState` plus Server Actions over `<Field />`; the only one with a "Disabled States" section; still zero `aria-describedby` and zero `required`.
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/base/field.mdx (and the `aria/` and `radix/` siblings): shadcn ships a Base-UI-backed Field variant; installation is `npx shadcn@latest add field`; every example writes `htmlFor` and `aria-invalid` by hand. `apps/v4/content/docs/components/form.mdx` returns 404, so the RHF-coupled `form` item has no v4 docs page while remaining in the registry.
