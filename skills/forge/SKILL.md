---
name: forge
description: "Author or revise a component in the Ultima design system: Base UI composition, per-axis StyleX tables, the style slot, the part-naming rules, the proof bar, and the registry and docs wiring. Use when asked to add a component, build a new Ultima component, change the Button's variants or any component's variant, size, or tone, restyle a part, forge a component, or /forge."
argument-hint: "[component name | ticket id | blank for the component in this conversation]"
---

# Forge

Author or revise one Ultima component in this repository.

Every rule lives in [`docs/spec/ultima.md`](../../docs/spec/ultima.md). This skill is the order to read it in and the shape the rules add up to, so it links rather than restates. Where a step and the specification disagree, the specification wins and this file is the bug.

**Scope.** Components in this repository. This skill does not install components into a consumer's project and does not audit a codebase; that is mana's generic `ultima` skill, and the split is deliberate ([The authoring skill](../../docs/spec/ultima.md#the-authoring-skill)).

## 1. Read before writing

- [Principles](../../docs/spec/ultima.md#principles). The generators, not a record. Read them every time, before anything else.
- [The v0 set](../../docs/spec/ultima.md#the-v0-set). Find the component's row: what it is built on, its parts, its axes, its defaults. That row is the contract. A component with no row yet needs the same four answers from its ticket before you write; where the ticket is silent, the table's neighbours decide, and a component whose contract is genuinely unsettled is a decision ticket rather than a build ([Release scope and core coverage](../../docs/spec/ultima.md#release-scope-and-core-coverage)).
- [Accessibility contract](../../docs/spec/ultima.md#accessibility-contract). The same row again: element or primitive, name source, which part carries the focus ring, who owns the keyboard. Base UI owns roles, ARIA state, and keyboard handling. Ultima owns names, focus visibility, and element choice.
- [Per-component notes](../../docs/spec/ultima.md#per-component-notes). What you would otherwise guess.
- [`CONTEXT.md`](../../CONTEXT.md). The project's own words. Use them for parts, props, and prose.
- The shipped file nearest in shape to what you are writing. [`references/worked-example.md`](references/worked-example.md) walks the two poles.

## 2. Decide the shape

**Base UI compound, or plain.** A single-part component exports one function. A multi-part component exports one namespace object of parts under Base UI's own part names. Flat `DialogPopup`-style exports do not exist ([Compound components](../../docs/spec/ultima.md#compound-components)).

**Which parts you paint.** A part carries Ultima styles if it paints — background, border, shadow, or color — or sets its own type or spacing. A part passes through unstyled if its whole job is to portal, position, or group. A trigger that wraps the consumer's element ships no styles at all, not even the reset or the focus ring ([Styled parts](../../docs/spec/ultima.md#styled-parts)). That section's table is the decided answer for the components it lists; the rule decides the parts it does not.

**A compound exposes every Base UI part**, styled or passed through, so a consumer imports one name.

## 3. The file skeleton

One file, `packages/ui/src/<name>.tsx`, and one registry item of the same name. It starts with `'use client'` ([One file per component](../../docs/spec/ultima.md#one-file-per-component)).

Order inside the file: imports, the StyleX tables at module scope, any private glyphs, the prop types, the parts, the namespace or the single function, the export.

**Tables.** One `stylex.create` per axis. `styles` is keyed by part; the axis tables are `variants`, `sizes`, `tones` ([Naming](../../docs/spec/ultima.md#naming)). Each prop union is `keyof typeof` its table, exported as `<Component>Variant`, `<Component>Size`, `<Component>Tone` ([Variants, sizes, and tones](../../docs/spec/ultima.md#variants-sizes-and-tones)).

**The one compound.** `variant` and `size` layer, because they never set the same property. `variant` and `tone` both set color, so where a component has both they merge into one nested lookup read as `variants[variant][tone]`: one `stylex.create` per variant, named for the variant, collected in `variants`. Every cell is written out. There is no `cva`, and no component invents a fourth axis.

Defaults are declared in the destructure, and they match the defaults [The v0 set](../../docs/spec/ultima.md#the-v0-set) names.

## 4. Props

- `PartProps` for a Base UI part, `PlainProps` for a native element, both imported from `@ultima/ui/lib/component` ([The shared lib](../../docs/spec/ultima.md#the-shared-lib)).
- `style?: StyleProp` on every part and slot. Destructure it out and pass it **last** to `stylex.props`, so a caller override wins per property. It is the only escape hatch, and there is no `className` ([Props every component accepts](../../docs/spec/ultima.md#props-every-component-accepts)).
- `render` passes through on every Base UI part, and reaches a plain root through Base UI's `useRender`. Plain slots are two-line functions with no `render`.
- `ref` is a plain prop under React 19. No `forwardRef`.
- Type names follow [Naming](../../docs/spec/ultima.md#naming): `<Component>Props`, `<Component><Part>Props`.

## 5. State, tokens, the reset, and the ring

- **Tokens only.** Import the token groups and read them by literal key. No local aliases, no raw values; a new need becomes a new token ([Tokens in component code](../../docs/spec/ultima.md#tokens-in-component-code)).
- **State.** Pointer states use pseudo-classes and the `-hover` and `-active` tokens, never a color derived at the use site. Component state uses Base UI's data attributes inside the value, `':is([data-disabled])'` and its siblings, so the class stays static. Dynamic styles are for runtime numbers only ([State styling](../../docs/spec/ultima.md#state-styling)).
- **The reset.** A component may assume nothing about the consumer's CSS, so every root sets its own `box-sizing`, `margin`, `appearance`, `font-family`, and `line-height` ([What a component may assume about the consumer's CSS](../../docs/spec/ultima.md#what-a-component-may-assume-about-the-consumers-css)).
- **The ring.** One rule, copied verbatim beside the reset, on the parts the contract names and nowhere else ([Focus ring](../../docs/spec/ultima.md#focus-ring)).
- **No media queries for motion or forced colors.** The motion tokens already collapse, and native elements degrade on their own ([Accessibility contract](../../docs/spec/ultima.md#accessibility-contract)).

## 6. Overlays and glyphs

Only if the component portals a floating surface, or fills a slot Base UI leaves empty.

- [Overlays](../../docs/spec/ultima.md#overlays). One surface recipe and one enter and exit transition across all four. Border and shadow always together, never a shadow alone. `keepMounted` is never set by Ultima.
- [Iconography](../../docs/spec/ultima.md#iconography). Glyphs are inline SVG private to the file that uses them: not exported, not a shared lib item, and no icon package is imported by any registry item. They size at `1em` with `flex-shrink: 0` and take their color from `currentColor`, so a glyph never names a token. A slot whose whole content is a glyph renders the default and takes `children` as a replacement.

## 7. Wire it up

Six files outside the component itself, and missing one fails a different command each time.

| File | What it needs |
| --- | --- |
| `packages/ui/src/index.ts` | The component and every props and axis type it exports. |
| `packages/ui/vitest.config.ts` | Its Base UI entry point in `optimizeDeps.include`. Missing, every test in the file dies against a second React copy. |
| `registry/items.config.ts` | One entry keyed by the file name, with `title`, `description`, and `docs` ([The registry item](../../docs/spec/ultima.md#the-registry-item)). Missing, `pnpm build` throws and `pnpm test` does not. |
| `apps/docs/src/components.ts` and `apps/docs/src/__tests__/components.test.ts` | The catalogue entry and the same name in the same position; the test pins specification order. A component from a later milestone goes after the v0 set, in its own release's order, and the test's name changes with it ([Release scope and core coverage](../../docs/spec/ultima.md#release-scope-and-core-coverage)). |
| `apps/docs/src/content/components/<name>.mdx` and `apps/docs/src/demos/<name>/` | The page and its demos ([Authoring](../../docs/spec/ultima.md#authoring)). Demos are real modules the page imports twice, once as the component and once as `?raw` source, so the running example and the printed code cannot diverge. The page carries Install, a section per behavior, a Props table covering only what Ultima adds, and an Accessibility section restating the contract row. |
| `apps/docs/src/router.tsx` | The MDX import and its `writtenPages` entry, or the route falls back to the placeholder. |

Adding a demo adds its axe coverage; no list is maintained ([Accessibility checks](../../docs/spec/ultima.md#accessibility-checks)). Everything under `registry/` except `static/` and `items.config.ts` is build output, regenerated by `pnpm registry:build` ([Generation](../../docs/spec/ultima.md#generation)).

## 8. The proof bar

Six items in `packages/ui/src/__tests__/<name>.test.tsx`, never beside the component ([What a build ticket proves](../../docs/spec/ultima.md#what-a-build-ticket-proves)). Copy the checklist out of [`references/proof-bar.md`](references/proof-bar.md) into the test file and answer each line for this component. That reference also carries the browser-environment traps, which read as broken components and are not.

One standing rule: **no test asserts a color value.**

## 9. Self-review

Read the diff against this list before you commit. Each line is a rule above, in the form it is usually broken.

- [ ] No raw color, length, or duration literal outside a token read, the `border` and `z` constants, SVG geometry, and the overlay's own `scale()` and `opacity`.
- [ ] No fourth axis, and no axis value the component's row does not list.
- [ ] No `className`: not in the props, not in the types, not in a test fixture.
- [ ] No `@font-face`, no `prefers-reduced-motion`, no `forced-colors`.
- [ ] No `keepMounted`.
- [ ] No icon package imported.
- [ ] `'use client'` on the first line; tables at module scope.
- [ ] Every Base UI part on the namespace, styled or passed through; wrapper triggers carry no styles.
- [ ] `style` destructured out and passed last in every `stylex.props` call.
- [ ] The test file lives under `packages/ui/src/__tests__/`.
- [ ] `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass.

## References

| Reference | Read when |
| --- | --- |
| [`references/worked-example.md`](references/worked-example.md) | Before writing, to pattern-match against shipped code: Button as the single-part case, Dropdown Menu as the compound with glyphs. |
| [`references/proof-bar.md`](references/proof-bar.md) | At step 8, for the checklist to copy and the environment traps. |
