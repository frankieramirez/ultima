# Worked example

Two shipped files, at the two poles of the system. Read the one nearest your component before you write, and copy its shape rather than inventing one. Line references are to the files as shipped; the files are the authority.

## Button: the single-part case

[`packages/ui/src/button.tsx`](../../../packages/ui/src/button.tsx), with [`__tests__/button.test.tsx`](../../../packages/ui/src/__tests__/button.test.tsx).

**The skeleton.** `'use client'`, the Base UI primitive, `stylex`, the token groups, the shared types:

```tsx
'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';
```

Every token group is named at the import and read by literal key at the use site. Nothing is aliased.

**The base reset and the ring**, in `styles.root`, are the whole of what the component may not assume about the consumer's CSS:

```tsx
appearance: 'none',
boxSizing: 'border-box',
fontFamily: font['--ult-font-sans'],
lineHeight: font['--ult-font-leading-none'],
margin: 0,
':focus-visible': {
  outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
  outlineOffset: border.focusOffset,
},
```

The ring is copied verbatim into every component that renders one. It is not a helper.

**State lives inside the value**, never in a second table and never in a `className` function:

```tsx
cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
opacity: { default: 1, ':is([data-disabled])': 0.5 },
```

**The nested variant-by-tone lookup.** Three `stylex.create` calls named for their variants, collected into one object, and both unions read off the tables:

```tsx
const solid = stylex.create({ accent: { /* ... */ }, danger: { /* ... */ } });
const outline = stylex.create({ accent: { /* ... */ }, danger: { /* ... */ } });
const ghost = stylex.create({ accent: { /* ... */ }, danger: { /* ... */ } });
const variants = { solid, outline, ghost };

type ButtonVariant = keyof typeof variants;
type ButtonTone = keyof typeof solid;
```

Six cells, each written out. `sizes` stays its own flat table, because `size` sets no color.

**The component is one line**, and `style` is last:

```tsx
function Button({ variant = 'solid', size = 'md', tone = 'accent', style, ...props }: ButtonProps) {
  return <BaseButton {...props} {...stylex.props(styles.root, variants[variant][tone], sizes[size], style)} />;
}
```

The defaults are in the destructure, which is the only place they are declared.

## The plain root

Not every component has a Base UI primitive. A plain root reaches `render` and `ref` through Base UI's `useRender` instead, and that is the only difference. From [`packages/ui/src/stat.tsx`](../../../packages/ui/src/stat.tsx):

```tsx
type StatRootProps = PartProps<useRender.ComponentProps<'div'>>;

function Root({ ref, render, style, ...props }: StatRootProps) {
  return useRender({ defaultTagName: 'div', ref, render, props: { ...props, ...stylex.props(styles.root, style) } });
}
```

`ref` and `render` are destructured out beside `style` and handed to `useRender`; everything else spreads. An axis composes exactly as it does on Button, by adding its table to the `stylex.props` call before `style`.

A plain **slot** below the root is simpler still, a two-line function with no `render`:

```tsx
function Label({ style, ...props }: StatLabelProps) {
  return <span {...props} {...stylex.props(styles.label, style)} />;
}
```

`PartProps<useRender.ComponentProps<'div'>>` for the root, `PlainProps<'span'>` for the slot. Both come from the shared lib.

## Dropdown Menu: the compound with glyphs

[`packages/ui/src/dropdown-menu.tsx`](../../../packages/ui/src/dropdown-menu.tsx), with [`__tests__/dropdown-menu.test.tsx`](../../../packages/ui/src/__tests__/dropdown-menu.test.tsx).

**One shared item style, composed per part.** Five Base UI parts wear the same item look, and each adds only what makes it different:

```tsx
function Item({ style, ...props }: DropdownMenuItemProps) {
  return <Menu.Item {...props} {...stylex.props(styles.item, style)} />;
}

function LinkItem({ style, ...props }: DropdownMenuLinkItemProps) {
  return <Menu.LinkItem {...props} {...stylex.props(styles.item, styles.linkItem, style)} />;
}
```

Composing keys off one `styles` table is how a shared look stays shared. A second copy of the item style would be the bug.

**The namespace carries every Base UI part**, styled ones as local functions and pass-throughs re-exported untouched:

```tsx
const DropdownMenu = {
  Root: Menu.Root,
  Trigger: Menu.Trigger,
  Portal: Menu.Portal,
  Backdrop: Menu.Backdrop,
  Positioner,
  Popup,
  // ...
};
```

`Trigger` is the wrapper-trigger rule in code: it is on the object, and it has no style table and no local function at all. `Positioner` is the near-exception, a local function whose whole table is `{ outline: 0 }`.

**Prop types are declared per part**, `PartProps` for the styled ones and Base UI's own props for the pass-throughs:

```tsx
export type DropdownMenuPopupProps = PartProps<ComponentProps<typeof Menu.Popup>>;
export type DropdownMenuPortalProps = ComponentProps<typeof Menu.Portal>;
```

A pass-through part keeps `className` in its type, because Ultima is not styling it and the type is Base UI's.

**The overlay recipe** is `styles.popup`: the raised surface, the hairline border with the shadow, `z.popup`, `transformOrigin: 'var(--transform-origin)'`, and the enter and exit halves as data-attribute states inside the values:

```tsx
transitionTimingFunction: { default: easing.enter, ':is([data-ending-style])': easing.exit },
opacity: { default: 1, ':is([data-starting-style])': 0, ':is([data-ending-style])': 0 },
```

No `prefers-reduced-motion` query anywhere: the duration token collapses on its own.

**Glyphs are private functions in the same file**, and there are exactly three:

```tsx
function Check() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}
```

They are not exported, not shared with `select.tsx`, which writes its own check, and no icon package is imported. `Dot` is the one glyph with a fill, and it fills with `currentColor`.

**A glyph slot renders a default and takes `children` as the replacement:**

```tsx
function CheckboxItemIndicator({ style, children, ...props }: DropdownMenuCheckboxItemIndicatorProps) {
  return <Menu.CheckboxItemIndicator {...props} {...stylex.props(styles.indicator, style)}>{children ?? <Check />}</Menu.CheckboxItemIndicator>;
}
```

`SubmenuTrigger` is the exception the specification names: its children are the item's label, so the chevron is appended after them and is not overridable.

## Traps the shipped files already hit

Not rules, just facts that cost a red run each.

- **A native attribute can collide with an axis.** `<input size>` is a number, so `InputProps` has to `Omit` `size` from the Base UI props before adding the `sm | md | lg` union, or the intersection resolves to `never`. See `input.tsx`.
- **A stale optimizer list looks like a broken component.** A Base UI entry point missing from the generated `scripts/generated/browser-dependencies.ts` is pre-bundled against a second React copy, and every test in that file fails with `Cannot read properties of null (reading 'useContext')`. `pnpm catalogue:generate` adds it from the component's imports; `pnpm catalogue:check` catches a forgotten run.
- **A component file without a descriptor fails every entry point.** The catalogue model reports `source-without-metadata` for `packages/ui/src/<name>.tsx` until `registry/metadata/react/<name>.ts` exists, and `pnpm catalogue:generate` writes nothing until it does.
