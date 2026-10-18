# How do shadcn/ui, DaisyUI, Mantine and Base UI draw a read-only field next to a disabled one?

## Findings

**None of the four gives a read-only text field its own fill, border or ink.** Disabled is always styled. Read-only gets nothing beyond the browser default in shadcn/ui, DaisyUI and Base UI. Mantine adds one rule: it hides the caret. A read-only field in all four looks like an editable one. Where they tell the two apart, they do it through behavior: a read-only field still takes focus, shows the normal focus mark and keeps its value selectable. A disabled one is dimmed, refuses focus and shows a not-allowed cursor. Mantine and Base UI also remove or disable the controls that would change the value: steppers, clear buttons and dropdowns.

The browser behavior underneath is the same everywhere. MDN: "read-only controls can still function and are still focusable, whereas disabled controls cannot receive focus and are not submitted with the form". Browsers grey out disabled controls by default and do nothing visual for `readonly` ([MDN readonly](#sources), [MDN disabled](#sources)). CSS `:read-only` matches anything that isn't `:read-write`, so it matches a disabled input as well ([MDN :read-only](#sources)). That's why Ultima's `input.tsx` can put one `:read-only` key on both states.

All source was read at these commits: shadcn-ui/ui `d2fba50` (2026-10-16), saadeghi/daisyui `bf3bac3` (5.7.50, 2026-10-13), mantinedev/mantine `2d0a040` (@mantine/core 9.7.3, 2026-10-17), mui/base-ui `8e91039` (@base-ui/react 1.9.0, 2026-10-16), guilhermerodz/input-otp `cf81845` (2026-09-10). Statements about focus rings and carets on segmented inputs come from reading the source. I didn't run them in a browser.

### shadcn/ui

**Read-only: no styling at all.** No component in `apps/v4/registry` uses Tailwind's `read-only:` variant, `[readonly]` or `:read-only`. A text search for "read-only" and "readonly" across the registry and `apps/v4/content/docs` finds only demos that pass `readOnly`, such as `<InputGroupInput placeholder="https://x.com/shadcn" readOnly />` in `input-group-button.tsx`, and none of them changes the class list. The docs have no read-only section for Input, Textarea, Input Group or Input OTP.

**Disabled** (`new-york-v4/ui/input.tsx` line 10, and the same classes in `bases/base/ui/input.tsx` line 11):
- Fill: unchanged. It stays `bg-transparent` (`dark:bg-input/30`). Two of the eight newer styles, Nova and Lyra, add a disabled fill, `disabled:bg-input/50 dark:disabled:bg-input/80`, in `style-nova.css`/`style-lyra.css`. Vega, Maia, Mira, Luma, Rhea and Sera don't.
- Border, value ink, placeholder: all dimmed together by `disabled:opacity-50`. No color changes.
- Glyphs: Input Group addons dim through `group-data-[disabled=true]/input-group:opacity-50`, which needs `data-disabled` set by hand on the group. In Nova the group uses `has-disabled:opacity-50` plus the fill. Field labels and descriptions dim through `group-data-[disabled=true]/field:opacity-50`.
- Cursor: `disabled:cursor-not-allowed`, but `disabled:pointer-events-none` sits next to it. With pointer events off, the hover never reaches the input, so the not-allowed cursor never shows. You get whatever cursor the element underneath has.
- Focus and selection: the browser keeps a disabled input out of focus, and `pointer-events-none` also stops mouse selection.

**Read-only behavior:** a focused read-only field gets the full editable focus treatment (`focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`), and the value stays selectable with the brand selection colors (`selection:bg-primary selection:text-primary-foreground`).

**Input OTP** wraps guilhermerodz/input-otp. Disabled: the container gets `has-disabled:opacity-50` and the hidden input gets `disabled:cursor-not-allowed`. The library itself sets the root's `cursor` to `default` when `disabled` and `text` otherwise (`input.tsx` line 369). There's no read-only rule in either layer. The library spreads every prop onto one transparent native `<input>` (`color: transparent; caretColor: transparent`). A slot is "active" whenever that input is focused and the selection covers it (`isActive`, line 482), and an empty active slot draws the fake caret (`hasFakeCaret: isActive && char === null`, line 498). From that source, a `readOnly` OTP still shows the active ring (`data-[active=true]:ring-[3px]`) and a blinking fake caret in the next empty slot when focused. Read-only looks fully editable there. The root sets `user-select: none`, and the real input's text is transparent, so the value can't be visibly selected in either state.

### DaisyUI

**Read-only: no styling at all.** `components/input.css`, `textarea.css` and `otp.css` contain no `readonly` or `:read-only` selector, and the only "read-only" in the docs is the Rating component. A read-only `.input` gets the same focus outline as an editable one: `outline: 2px solid var(--input-color)` with `--input-color: var(--color-base-content)` on `:focus, :focus-within`.

**Disabled** (`input.css` lines 101–121, under `:has(> input[disabled])`, `:is(:disabled, [disabled])` and `fieldset:disabled &`):
- Fill: `bg-base-200`, one step down from the `bg-base-100` resting fill.
- Border: `border-base-200`, the same as the fill, so the edge disappears. `box-shadow: none` drops the depth shadow too.
- Value ink: `text-base-content/40`, an alpha of the body ink.
- Placeholder: `text-base-content opacity-20`, half of the resting placeholder's `opacity-50`.
- Glyphs: no separate rule. Icons and text placed inside the `.input` wrapper keep their own color.
- Cursor: `cursor-not-allowed` on the wrapper and on the inner input. There's no `pointer-events: none`, so the cursor shows.
- `textarea.css` (lines 50–61) is the same, except it puts the `/40` ink on the textarea itself.

**OTP** (`otp.css`) is one native input drawn over `<span>` boxes. Disabled (`:has(> input:disabled)`, line 155): `cursor-not-allowed`, value ink `text-base-content/40`, boxes `border-base-200 bg-base-200` with no shadow, matching `.input`. Read-only has no rule. Focus outlines the boxes through `:focus-within` and `:has(input:valid:focus)`, so a read-only OTP shows the same focus outline. The input is `pointer-events-none` (line 33), and `::selection` is made transparent with a 20% text color (line 40), so the value can't be visibly selected in either state.

### Mantine

**Read-only: one rule.** `Input.module.css` lines 256–258: `&[readonly] { caret-color: transparent; }`. Fill, border, value ink, placeholder, section ink, cursor (`--input-cursor: text`) and focus border (`--input-bd: var(--input-bd-focus)`, the primary filled color) all stay as on an editable field.

What Mantine does instead is take away the controls that would change the value:
- Select and the other comboboxes hide the options dropdown (`hidden={readOnly || disabled}`) and drop the clear button (`clearable && … && !disabled && !readOnly`, `Select.tsx` lines 308 and 415). The docs say: "When `readOnly` is set, `Select` will not show suggestions and will not call the `onChange` function."
- NumberInput hides its stepper controls when `readOnly` (`NumberInput.tsx` lines 876–885).

**Disabled** (`Input.module.css` lines 240–254, on `:disabled`, `[data-disabled]` and `:has(input:disabled)`):
- Fill: `--input-disabled-bg`, which is `--mantine-color-disabled`: gray-2 `#e9ecef` light, dark-6 in dark mode.
- Value ink: `--input-disabled-color`, which is `--mantine-color-disabled-color`: gray-5 `#adb5bd` light, dark-3 dark. That's the same token as the placeholder (`--mantine-color-placeholder`, gray-5/dark-3), so a disabled value and a placeholder are one color.
- On top of that, `opacity: 0.6` on the whole input, border included. The border color itself doesn't change. `--mantine-color-disabled-border` exists, but the input never reads it.
- Placeholder: keeps `--input-placeholder-color` and gets dimmed by the 0.6 opacity.
- Glyphs: left and right sections are siblings of the input inside the wrapper. They keep `--input-section-color`/`--mantine-color-dimmed` at full opacity, because no section rule keys on disabled.
- Cursor: `not-allowed`. No `pointer-events: none` on the input, so it shows.

**PinInput** renders one Mantine `Input` per cell, so it inherits the rules above. Its CSS module only sets cell size. `readOnly` passes the native attribute to every cell (line 468). Delete, Backspace and paste are blocked in code (lines 355–397). Focus calls `event.target.select()` (line 384). A read-only PinInput cell still takes the primary focus border, has no caret, and selects its character on focus. Disabled passes native `disabled` to every cell and gets the disabled fill, ink, opacity and cursor.

### Base UI

**Unstyled: neither state has visual styling.** Base UI ships behavior and state attributes, and the consumer writes the CSS.
- `Input` (and `Field.Control`) exposes `data-disabled` but no `data-readonly` (`InputDataAttributes.ts`). Read-only is the native attribute, so authors style it with `[readonly]` or `:read-only`.
- The docs' hero demos for Input and OTP Field style rest, placeholder and `:focus` only. They have no disabled or read-only rule (`components/input/demos/hero/css-modules/index.module.css`, `components/otp-field/demos/hero/css-modules/index.module.css`). The Number Field demo styles `[data-disabled]` stepper buttons only.
- Number Field marks read-only with `data-readonly` on root, input and steppers, and treats the steppers as disabled when read-only: `disabled: disabled || readOnly` (`useNumberFieldStepperButton.ts` lines 102, 177). The source comment says `data-readonly` "is preserved for styling".

**OTP Field** (`@base-ui/react/otp-field`, added as a preview in 1.4.0 and stable as `OTPField` since 1.6.0) uses one native input per slot. Root and each input get `data-readonly` and `data-disabled`, plus `data-focused`, `data-filled` and `data-complete`. A read-only slot stays focusable, sets `data-focused`, and selects its character on focus (`handleInputFocus` → `event.currentTarget.select()`, `OTPFieldRoot.tsx` line 296). Changes, composition and paste are dropped when `readOnly` (`OTPFieldInput.tsx` lines 203–208, 258, 306). Disabled skips the focus handlers. No shipped CSS draws either state.

### Comparison

| | shadcn/ui (new-york-v4) | DaisyUI 5 | Mantine 9 | Base UI 1.9 |
| --- | --- | --- | --- | --- |
| **Read-only fill** | unchanged | unchanged | unchanged | none shipped |
| **Read-only border / ink / placeholder** | unchanged | unchanged | unchanged | none shipped |
| **Read-only caret** | browser default | browser default | `caret-color: transparent` | browser default |
| **Read-only focus** | full editable ring | full editable outline | primary focus border | consumer's |
| **Read-only value selectable** | yes (native) | yes (native) | yes; PinInput selects on focus | yes; OTP selects on focus |
| **Read-only affordances** | none removed | none removed | dropdown, clear and steppers removed | steppers disabled |
| **Disabled fill** | unchanged (Nova/Lyra: `input/50`) | `base-200` (one step down) | `disabled` gray-2 | none shipped |
| **Disabled border** | dimmed by opacity | same as fill (edge vanishes), no shadow | dimmed by opacity | none shipped |
| **Disabled value ink** | opacity 0.5 | `base-content/40` | gray-5 (= placeholder) at opacity 0.6 | none shipped |
| **Disabled placeholder** | opacity 0.5 | opacity 0.2 | gray-5 at opacity 0.6 | none shipped |
| **Disabled glyphs** | addon opacity 0.5 (needs `data-disabled`) | not handled | not handled (sections stay dimmed ink) | none shipped |
| **Disabled cursor** | `not-allowed` declared, hidden by `pointer-events: none` | `not-allowed` | `not-allowed` | consumer's |
| **OTP read-only** | no rule; focus ring and fake caret still show | no rule; focus outline shows | caret hidden, focus border, select on focus | `data-readonly` attribute only |
| **OTP disabled** | container opacity 0.5 | `base-200` boxes, `/40` ink | per-cell disabled input | `data-disabled` attribute only |

### What tells read-only apart most clearly

1. **Read-only keeps the resting look, and disabled alone changes.** Three of the four leave the read-only fill, border and ink as they are, and the fourth is unstyled. None greys a read-only field. Ultima gives both states the `surface-sunken` fill, which none of the four does, and then relies on a small ink difference (`text-subtle` against `text-disabled`) to separate them. That is the reason the two states look alike in Ultima.
2. **Focus is the strongest cue in practice.** Read-only fields take focus and show the normal focus mark, and disabled ones never do. Every library keeps that native difference.
3. **Remove the editing affordances.** Mantine hides the caret, the clear button, the dropdown and the steppers on read-only fields. Base UI disables the Number Field steppers. A read-only field with no caret and no controls reads as "display", without a grey fill.
4. **The value stays readable and selectable.** Read-only keeps full-contrast value ink and native selection. Mantine PinInput and Base UI OTP Field select the slot's character on focus. Disabled dims the value (opacity or a lighter ink) and blocks selection.
5. **Disabled always pairs a fill or opacity drop with a not-allowed cursor.** DaisyUI is the only one that also removes the edge (border = fill) and the shadow. That's the most legible "inert" cue among the four, and it costs nothing in read-only.

Segmented inputs are where read-only is weakest. shadcn's Input OTP still draws an active ring and a blinking fake caret in a read-only field, and DaisyUI's OTP still draws its focus outline. Neither has a read-only rule. Only Mantine (hidden caret) and Base UI (a `data-readonly` hook) give a segmented field anything to work with.

## Sources

- https://github.com/shadcn-ui/ui/blob/d2fba50ee5b9113008b5bb908563527b7efd2f27/apps/v4/registry/new-york-v4/ui/input.tsx: disabled is `pointer-events-none cursor-not-allowed opacity-50`, the fill stays transparent, focus is a `ring-[3px]`, selection uses `bg-primary`, and there's no read-only class.
- https://github.com/shadcn-ui/ui/blob/d2fba50ee5b9113008b5bb908563527b7efd2f27/apps/v4/registry/bases/base/ui/input.tsx: the Base UI-based shadcn input has the same disabled classes and no read-only class.
- https://github.com/shadcn-ui/ui/blob/d2fba50ee5b9113008b5bb908563527b7efd2f27/apps/v4/registry/new-york-v4/ui/textarea.tsx: disabled is `cursor-not-allowed opacity-50`, and there's no read-only class.
- https://github.com/shadcn-ui/ui/blob/d2fba50ee5b9113008b5bb908563527b7efd2f27/apps/v4/registry/new-york-v4/ui/input-group.tsx: addons dim through `group-data-[disabled=true]/input-group:opacity-50`, and there's no read-only rule.
- https://github.com/shadcn-ui/ui/blob/d2fba50ee5b9113008b5bb908563527b7efd2f27/apps/v4/registry/new-york-v4/ui/input-otp.tsx: the OTP container has `has-disabled:opacity-50`, slots draw `data-[active=true]` rings and a fake caret, and there's no read-only rule.
- https://github.com/shadcn-ui/ui/blob/d2fba50ee5b9113008b5bb908563527b7efd2f27/apps/v4/registry/new-york-v4/ui/field.tsx: field label and description dim through `group-data-[disabled=true]/field:opacity-50`.
- https://github.com/shadcn-ui/ui/blob/d2fba50ee5b9113008b5bb908563527b7efd2f27/apps/v4/registry/new-york-v4/examples/input-group-button.tsx: a shipped demo passes `readOnly` with no styling change.
- https://github.com/shadcn-ui/ui/blob/d2fba50ee5b9113008b5bb908563527b7efd2f27/apps/v4/registry/styles/style-nova.css: Nova adds `disabled:bg-input/50 dark:disabled:bg-input/80` to `.cn-input` and `has-disabled` fill and opacity to `.cn-input-group`. `style-vega.css` adds no disabled fill, and no style has a read-only rule.
- https://github.com/guilhermerodz/input-otp/blob/cf81845e59ff43c5885c66b4755085a36f071cc1/packages/input-otp/src/input.tsx: the root cursor is `default` only when disabled, the root has `userSelect: none`, the input is transparent, and `isActive`/`hasFakeCaret` depend only on focus and selection, never on `readOnly`.
- https://github.com/saadeghi/daisyui/blob/bf3bac3a397b543e55641ecb2d60a2ed961f09ec/packages/daisyui/src/components/input.css: the disabled fill and border are `base-200`, the shadow is dropped, value ink is `base-content/40`, the placeholder is opacity 0.2, the cursor is not-allowed, focus is a 2px outline, and there's no read-only selector.
- https://github.com/saadeghi/daisyui/blob/bf3bac3a397b543e55641ecb2d60a2ed961f09ec/packages/daisyui/src/components/textarea.css: the same disabled rule for textarea, and no read-only selector.
- https://github.com/saadeghi/daisyui/blob/bf3bac3a397b543e55641ecb2d60a2ed961f09ec/packages/daisyui/src/components/otp.css: OTP disabled gives `base-200` boxes, `/40` ink and a not-allowed cursor, the input is `pointer-events-none`, selection is made transparent, focus comes from `:focus-within`, and there's no read-only selector.
- https://github.com/saadeghi/daisyui/blob/bf3bac3a397b543e55641ecb2d60a2ed961f09ec/packages/docs/src/routes/(routes)/components/otp/+page.md: the OTP docs list no disabled or read-only class or example.
- https://github.com/mantinedev/mantine/blob/2d0a040f42011e791caf0bc56b9fbdd36ce55cef/packages/@mantine/core/src/components/Input/Input.module.css: read-only gets `caret-color: transparent` only; disabled gets the `--input-disabled-bg` fill, `--input-disabled-color` ink, `opacity: 0.6` and a not-allowed cursor; focus switches the border to `--input-bd-focus`; sections take `--input-section-color`/dimmed with no disabled rule.
- https://github.com/mantinedev/mantine/blob/2d0a040f42011e791caf0bc56b9fbdd36ce55cef/packages/@mantine/core/src/core/MantineProvider/MantineCssVariables/default-css-variables-resolver.ts: disabled fill gray-2/dark-6, disabled ink gray-5/dark-3, placeholder gray-5/dark-3 (the same as disabled ink), and a disabled border token gray-3/dark-4 that Input doesn't use.
- https://github.com/mantinedev/mantine/blob/2d0a040f42011e791caf0bc56b9fbdd36ce55cef/packages/@mantine/core/src/components/PinInput/PinInput.tsx: `readOnly` blocks Delete, Backspace and paste, focus selects the cell, and `readOnly`/`disabled` pass to every cell.
- https://github.com/mantinedev/mantine/blob/2d0a040f42011e791caf0bc56b9fbdd36ce55cef/packages/@mantine/core/src/components/PinInput/PinInput.module.css: PinInput CSS sets cell size only.
- https://github.com/mantinedev/mantine/blob/2d0a040f42011e791caf0bc56b9fbdd36ce55cef/packages/@mantine/core/src/components/Select/Select.tsx: read-only hides the dropdown and the clear button.
- https://github.com/mantinedev/mantine/blob/2d0a040f42011e791caf0bc56b9fbdd36ce55cef/packages/@mantine/core/src/components/NumberInput/NumberInput.tsx: read-only hides the stepper controls.
- https://github.com/mantinedev/mantine/blob/2d0a040f42011e791caf0bc56b9fbdd36ce55cef/apps/mantine.dev/src/pages/core/select.mdx: the docs describe read-only as behavior ("will not show suggestions and will not call the `onChange` function").
- https://github.com/mui/base-ui/blob/8e91039af173650b1acbb5061fa98fe76aaba52d/packages/react/src/input/InputDataAttributes.ts: Input exposes `data-disabled` and no `data-readonly`.
- https://github.com/mui/base-ui/blob/8e91039af173650b1acbb5061fa98fe76aaba52d/packages/react/src/otp-field/root/OTPFieldRootDataAttributes.ts: OTP Field root has `data-readonly`, `data-disabled`, `data-focused`, `data-filled` and `data-complete` (the same set on `input/OTPFieldInputDataAttributes.ts`).
- https://github.com/mui/base-ui/blob/8e91039af173650b1acbb5061fa98fe76aaba52d/packages/react/src/otp-field/root/OTPFieldRoot.tsx: focusing a slot calls `select()`.
- https://github.com/mui/base-ui/blob/8e91039af173650b1acbb5061fa98fe76aaba52d/packages/react/src/otp-field/input/OTPFieldInput.tsx: read-only drops change, composition commits and paste, and disabled skips focus handling.
- https://github.com/mui/base-ui/blob/8e91039af173650b1acbb5061fa98fe76aaba52d/packages/react/src/number-field/root/useNumberFieldStepperButton.ts: steppers are disabled when read-only, with `data-readonly` kept for styling.
- https://github.com/mui/base-ui/blob/8e91039af173650b1acbb5061fa98fe76aaba52d/docs/src/app/(docs)/react/components/input/demos/hero/css-modules/index.module.css: the Input demo CSS styles rest, placeholder and focus only.
- https://github.com/mui/base-ui/blob/8e91039af173650b1acbb5061fa98fe76aaba52d/docs/src/app/(docs)/react/components/otp-field/demos/hero/css-modules/index.module.css: the OTP demo CSS styles rest and focus only.
- https://github.com/mui/base-ui/blob/8e91039af173650b1acbb5061fa98fe76aaba52d/docs/src/app/(docs)/react/overview/releases/v1-4-0/page.mdx: OTP Field arrived as a preview in 1.4.0 (`v1-6-0/page.mdx`: renamed to the stable `OTPField`).
- https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/attributes/readonly/index.md: read-only controls stay focusable and functional, and disabled ones don't.
- https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/attributes/disabled/index.md: browsers grey out disabled controls, which receive no focus or mouse events.
- https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/selectors/_colon_read-only/index.md: `:read-only` is `:not(:read-write)`, so it also matches disabled inputs.
- /home/user/ultima/packages/ui/src/input.tsx: Ultima puts the `surface-sunken` fill and quiet border on `:read-only`, which also matches disabled, and the disabled ink on `:disabled` for value and placeholder.
- /home/user/ultima/docs/spec/design-foundations.md (Opacity, Color): the current rule that both states take `surface-sunken` and that read-only keeps `text-subtle` for placeholder and glyphs.
