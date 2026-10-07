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
- [The v0 set](../../docs/spec/ultima.md#the-v0-set), or [The v0.1 set](../../docs/spec/ultima.md#the-v01-set) for a component from that release. Find the component's row: what it is built on, its parts, its axes, its defaults. That row is the contract, and the v0.1 table carries its own styled split and its own prose beneath it rather than adding rows to the v0 tables above. A component with no row yet needs the same four answers from its ticket before you write; where the ticket is silent, the table's neighbours decide, and a component whose contract is genuinely unsettled is a decision ticket rather than a build ([Release scope and core coverage](../../docs/spec/ultima.md#release-scope-and-core-coverage)).
- [Accessibility contract](../../docs/spec/ultima.md#accessibility-contract). The same row again: element or primitive, name source, which part carries the focus ring, who owns the keyboard. Base UI owns roles, ARIA state, and keyboard handling. Ultima owns names, focus visibility, and element choice.
- [Per-component notes](../../docs/spec/ultima.md#per-component-notes). What you would otherwise guess.
- [`CONTEXT.md`](../../CONTEXT.md). The project's own words. Use them for parts, props, and prose.
- The shipped file nearest in shape to what you are writing. [`references/worked-example.md`](references/worked-example.md) walks the two poles, and [`docs/agents/canonical-examples.md`](../../docs/agents/canonical-examples.md) indexes the validated exemplars with their contracts and proof files.
- The registered features and scenarios that own the behavior you are touching. `pnpm verify list --search "<name>"` finds them; `pnpm verify describe feature <id>` and `pnpm verify describe scenario <id>` give the owning contract, sources, routes and reproduction steps. A change to a user-facing obligation updates its scenario record's steps in the same review as the contract and the executable assertion ([Author guidance and maintenance](../../docs/spec/agent-infrastructure.md#author-guidance-and-maintenance)).

## 2. Decide the shape

**Base UI compound, or plain.** A single-part component exports one function. A multi-part component exports one namespace object of parts under Base UI's own part names. Flat `DialogPopup`-style exports do not exist ([Compound components](../../docs/spec/ultima.md#compound-components)).

**Which parts you paint.** A part carries Ultima styles if it paints — background, border, shadow, or color — or sets its own type or spacing. A part passes through unstyled if its whole job is to portal, position, or group. A trigger that wraps the consumer's element ships no styles at all, not even the reset or the focus ring ([Styled parts](../../docs/spec/ultima.md#styled-parts)). That section's table is the decided answer for the components it lists; the rule decides the parts it does not.

**A compound exposes every Base UI part**, styled or passed through, so a consumer imports one name.

## 3. The file skeleton

One file, `packages/ui/src/<name>.tsx`, and one registry item of the same name. It starts with `'use client'` ([One file per component](../../docs/spec/ultima.md#one-file-per-component)).

Order inside the file: imports, the StyleX tables at module scope, any private glyphs, the prop types, the parts, the namespace or the single function, the export.

**Tables.** One `stylex.create` per axis. `styles` is keyed by part; the axis tables are `variants`, `sizes`, `tones` ([Naming](../../docs/spec/ultima.md#naming)). Each prop union is `keyof typeof` its table, exported as `<Component>Variant`, `<Component>Size`, `<Component>Tone` ([Variants, sizes, and tones](../../docs/spec/ultima.md#variants-sizes-and-tones)).

**The one compound.** `variant` and `size` layer, because they never set the same property. `variant` and `tone` both set color, so where a component has both they merge into one nested lookup read as `variants[variant][tone]`: one `stylex.create` per variant, named for the variant, collected in `variants`. Every cell is written out. There is no `cva`, and no component invents a fourth axis.

Defaults are declared in the destructure, and they match the defaults the component's own set table names, [The v0 set](../../docs/spec/ultima.md#the-v0-set) or [The v0.1 set](../../docs/spec/ultima.md#the-v01-set).

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
- **No media queries for motion or forced colors, with one exception.** Transitions need none: the duration tokens already collapse to `1ms`, and native elements degrade on their own ([Accessibility contract](../../docs/spec/ultima.md#accessibility-contract)). A **looping** animation is the exception, because collapsing a loop to `1ms` is a strobe: it reads `--ult-motion-loop`, which goes to `0s`, and the file also writes `@media (prefers-reduced-motion: reduce)` to set `animation-name: none` and whatever static shape the component rests at ([Motion](../../docs/spec/ultima.md#motion)). Progress, Spinner, and Skeleton are the three that do.

## 6. Overlays and glyphs

Only if the component portals a floating surface, or fills a slot Base UI leaves empty.

- [Overlays](../../docs/spec/ultima.md#overlays). One surface recipe and one enter and exit transition across all seven: Dialog, Dropdown Menu, Select, Tooltip, Sidebar's mobile menu, Combobox, and Alert Dialog. A new overlay joins the recipe rather than varying it, and restates the tokens in its own file rather than importing a sibling. Toast is not an overlay: it reads `z.toast`, not `z.popup`, and keeps its own enter and exit. Border and shadow always together, never a shadow alone. `keepMounted` is never set by Ultima.
- [Iconography](../../docs/spec/ultima.md#iconography). Glyphs are inline SVG private to the file that uses them: not exported, not a shared lib item, and no icon package is imported by any registry item. They size at `1em` with `flex-shrink: 0` and take their color from `currentColor`, so a glyph never names a token. A slot whose whole content is a glyph renders the default and takes `children` as a replacement.

## 7. Wire it up

Start a new component from the scaffold, once steps 1 and 2 have settled its contract, primitive, parts, axes and defaults ([Scaffolding](../../docs/spec/agent-infrastructure.md#scaffolding)). Write those decisions and the descriptor fields into a request file, then:

```bash
pnpm scaffold react <name> --from <request.json>          # dry run: validates and prints the plan
pnpm scaffold react <name> --from <request.json> --write  # creates the files, regenerates the wiring
```

The request is `{ "descriptor": { … }, "brief": { … } }`. The descriptor half is the table below without `id` and `kind`. The brief names the `primitive` (`native` with its `element`, `base-ui` with its `module` and `export`, or `zag`), the `shape` (`plain` or `compound`, with its `parts` and whether each is `styled`), the `axes` with their values and defaults (`{}` for none), and `proofBar`, your eight answers from step 8. A missing answer fails by name before anything is written. A missing `order` fails with the next free position, which you accept by writing it in; the scaffold never picks one. A missing `group` fails with the six group ids; the scaffold never assigns one either.

The write creates the descriptor, the component file, its test under `packages/ui/src/__tests__/`, a demo and the page, each marked `@ultima-scaffold-incomplete`, and runs the generator. It is a skeleton, not the component: the tables are empty, the demo is a stub, and every proof-bar item is a `test.todo`. Complete steps 3 to 8 in those files and delete every marker. It never overwrites: a name, path, export or `order` that is taken stops it before writing. If a write is interrupted, the rerun stops and names the partial files and the manifest under `.scaffold/`; finish or delete them yourself.

Revising an existing component, or adding by hand, edits the same three inputs:

| File | What it needs |
| --- | --- |
| `registry/metadata/react/<name>.ts` | The descriptor, checked by `satisfies ReactDescriptor` ([Descriptor variants](../../docs/spec/agent-infrastructure.md#descriptor-variants)): `title`, the registry `description`, and install `docs` as `installDocs` ([The registry item](../../docs/spec/ultima.md#the-registry-item)); a `docsDescription` only when the visitor summary differs on purpose; the `contract` anchor of the owning specification section; the `primaryExport`; and the `release` and an unused `order` within it ([Release scope and core coverage](../../docs/spec/ultima.md#release-scope-and-core-coverage)); and the `group`, chosen by the rules in [Catalogue groups](../../docs/spec/ultima.md#catalogue-groups). Descriptors are data: no imports beyond types, no calls. |
| `apps/docs/src/content/components/<name>.mdx` and `apps/docs/src/demos/<name>/` | The page and its demos ([Authoring](../../docs/spec/ultima.md#authoring)). Demos are real modules the page imports twice, once as the component and once as `?raw` source, so the running example and the printed code cannot diverge. The page carries Install, a section per behavior, a Props table covering only what Ultima adds, and an Accessibility section restating the contract row. |
| `packages/ui/package.json` | Any new npm package the component imports, so the registry item and the browser-test optimizer can resolve it. |

The wiring files are generated from them: never edit a file whose first line reads `Generated by \`pnpm catalogue:generate\``. After a hand edit, run `pnpm catalogue:generate`. From the descriptor and the component's explicit exports and imports it writes the UI barrel, `registry/items.config.ts`, the docs catalogue and page map under `apps/docs/src/generated/`, and the browser-test optimizer lists in `scripts/generated/browser-dependencies.ts`. A missing page, test or demo, a source file without a descriptor, a duplicate `order` or export, or an import no package declares fails it before anything is written, naming the file. Commit the regenerated files with the component: every `pnpm dev`, `test`, `typecheck` and `build` runs `pnpm catalogue:check` first and stops on a stale copy.

Adding a demo adds its axe coverage; no list is maintained ([Accessibility checks](../../docs/spec/ultima.md#accessibility-checks)). Everything under `registry/` except `static/`, `metadata/` and the generated `items.config.ts` is build output, regenerated by `pnpm registry:build` ([Generation](../../docs/spec/ultima.md#generation)).

Run `pnpm check:architecture` before you commit. It is the static gate for everything above: source layout, import boundaries, primitive sources, token values, the `style` slot and registry metadata, and its findings are blocking, not advisory ([Architectural checks](../../docs/spec/agent-infrastructure.md#architectural-checks)). `pnpm catalogue:check` is the generated-wiring freshness gate and already runs ahead of `dev`, `test`, `typecheck` and `build`.

## 8. The proof bar

Eight items in `packages/ui/src/__tests__/<name>.test.tsx`, never beside the component ([What a build ticket proves](../../docs/spec/ultima.md#what-a-build-ticket-proves)). The last two exist for what a static screenshot would pass: behavior Ultima wires itself, and a declaration the primitive reads. Copy the checklist out of [`references/proof-bar.md`](references/proof-bar.md) into the test file and answer each line for this component. That reference also carries the browser-environment traps, which read as broken components and are not.

One standing rule: **no test asserts a color value.**

When the change creates or alters a user-facing obligation, register or revise its scenario in the same review: the record under `verification/scenarios/<feature>/<name>.json` states the contract, steps and required targets, and the binding is the existing test wrapped in `scenario('<id>', '<target>', …)` from `scripts/verification/register.ts` — the dialog and theme-studio suites are the worked examples. Static validation rejects an incomplete record, so a placeholder names its missing fields rather than pretending to pass.

Verify at the scope of the change: `pnpm verify component <name>` runs the item's proof-bar suite and the checks the plan selects, and reports its own scope. A full `pnpm test` and the release checks still own the whole tree — a scoped pass never claims their coverage ([Verification CLI](../../docs/spec/agent-infrastructure.md#verification-cli)).

## 9. Self-review

Read the diff against this list before you commit. Each line is a rule above, in the form it is usually broken.

- [ ] No raw color, length, or duration literal outside a token read, the `border` and `z` constants, SVG geometry, and the overlay's own `scale()` and `opacity`.
- [ ] No fourth axis, and no axis value the component's row does not list.
- [ ] No `className`: not in the props, not in the types, not in a test fixture.
- [ ] No `@font-face` and no `forced-colors`. No `prefers-reduced-motion` either, unless the component loops: then exactly one, setting `animation-name: none` and the resting shape.
- [ ] No `keepMounted`.
- [ ] No icon package imported.
- [ ] `'use client'` on the first line; tables at module scope.
- [ ] No `@ultima-scaffold-incomplete` marker and no `test.todo` left from the scaffold.
- [ ] Every Base UI part on the namespace, styled or passed through; wrapper triggers carry no styles.
- [ ] `style` destructured out and passed last in every `stylex.props` call.
- [ ] The test file lives under `packages/ui/src/__tests__/`.
- [ ] `pnpm check:architecture`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass; a failed required check is retained and investigated, never rerun in isolation to excuse it.

## References

| Reference | Read when |
| --- | --- |
| [`references/worked-example.md`](references/worked-example.md) | Before writing, to pattern-match against shipped code: Button as the single-part case, Dropdown Menu as the compound with glyphs. |
| [`references/proof-bar.md`](references/proof-bar.md) | At step 8, for the checklist to copy and the environment traps. |
