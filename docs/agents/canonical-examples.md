# Canonical examples

The validated exemplars for the patterns a contributor or agent is most likely to copy. Each entry names its owning contract, the real source symbol or part, a demo or fixture, and the proof file. Follow the links to production source and tests rather than copying implementations out of this index ([Canonical examples and recurring corrections](../spec/agent-infrastructure.md#canonical-examples-and-recurring-corrections)).

A candidate exemplar is validated against the current rules before it is cited here. When a listed contract changes, revisit the example in the same review; a source that stops passing its rules is repaired or replaced, not kept as frozen authority.

## React components

### Button — the single-part baseline

- Contract: `docs/spec/ultima.md#the-v0-set`, with the shared rules under `#the-shared-lib` and `#props-every-component-accepts`
- Source: `Button` in `packages/ui/src/button.tsx` (`ButtonProps`, `ButtonVariant`, `ButtonSize`, `ButtonTone`)
- Demos: `apps/docs/src/demos/button/` (`variants`, `sizes`, `danger`, `disabled`, `icon-only`, `leading-icon`)
- Proof: `packages/ui/src/__tests__/button.test.tsx`
- Pattern: one exported function, `PartProps` with `style` merged last, one `stylex.create` per axis, the reset and the focus ring written beside each other.

### Dropdown Menu — the compound namespace

- Contract: `docs/spec/ultima.md#the-v0-set`, the styled split under `#styled-parts`
- Source: `DropdownMenu` in `packages/ui/src/dropdown-menu.tsx`
- Demo: `apps/docs/src/demos/dropdown-menu/features.tsx`
- Proof: `packages/ui/src/__tests__/dropdown-menu.test.tsx`
- Pattern: every Base UI part on one namespace, styled parts next to pass-through parts, private glyphs sized `1em` on `currentColor`.

### Dialog — composition plus registered keyboard proof

- Contract: `docs/spec/ultima.md#the-v0-set`, its `#accessibility-contract` row, and scenario `dialog.keyboard-dismissal` (`verification/scenarios/dialog/keyboard-dismissal.json`)
- Source: `Dialog` in `packages/ui/src/dialog.tsx`
- Demo and fixture: `apps/docs/src/demos/dialog/basic.tsx` (trigger "Open dialog", dialog "Archive report")
- Proof: `packages/ui/src/__tests__/dialog.test.tsx` (the registered `ui-vitest` binding) and `apps/docs/tests/production/dialog.keyboard-dismissal.ts` (the four production cells)
- Pattern: the overlay recipe worn whole, focus containment and Escape dismissal asserted as behavior, one scenario record joining the unit and production bindings.

### Date Picker — the bounded Zag React contract

- Contract: `docs/spec/ultima.md#the-date-set`, admitted by the ADR 0002 amendment (`docs/adr/0002-base-ui-primitives.md`)
- Source: `DatePicker` in `packages/ui/src/date-picker.tsx`
- Demos: `apps/docs/src/demos/date-picker/` (`basic`, `presets`, `range`, `selects`)
- Proof: `packages/ui/src/__tests__/date-picker.test.tsx`
- Pattern: the prop-getter shape — `useMachine` and `connect` on `Root`, file-private context to the parts, getters spread onto fixed semantic elements, `stylex.props` merged through Zag's `mergeProps`, and no `render` because the machine owns the element.

### Toast — runtime geometry and token expressions

- Contract: `docs/spec/ultima.md#the-v01-set`, the runtime-variable policy in `docs/spec/agent-infrastructure.md#values-and-runtime-styles`
- Source: `Toast` in `packages/ui/src/toast.tsx`, reading the primitive-owned `--toast-*` variables in its transforms and stack arithmetic
- Demo: `apps/docs/src/demos/toast/stacked.tsx`
- Proof: `packages/ui/src/__tests__/toast.test.tsx` (intra-stack `z-index`, the `--toast-frontmost-height` clamp, the swipe vars in `transform`)
- Pattern: `var()` reads only where the policy names the writer, `calc()` scaling tokens and runtime values, a local `z-index` range that stays inside the component's own stack.

## Elements

### `ult-button` — the element lifecycle

- Contract: `docs/spec/ultima.md#web-components`, including `#light-dom` and `#one-file-per-element`
- Source: `UltButton` in `packages/elements/src/ult-button.element.ts`, defined by the guarded `customElements.define('ult-button', …)`
- Fixture: `apps/docs/public/elements.html`, served at `/elements.html`
- Proof: `packages/elements/src/__tests__/ult-button.test.ts` and the shared `packages/elements/src/__tests__/parity.test.ts`
- Pattern: a light-DOM custom element with its own attribute/property lifecycle, staying React-free under its ADR 0008 primitive layer.

### `ult-tabs` — the interactive family and the parity gate

- Contract: `docs/spec/ultima.md#web-components`, with `#parity-gate` and the `ult-<item>-<part>` family naming under the same section
- Source: `UltTabs`, `UltTabsList`, `UltTabsTab`, `UltTabsPanel`, `UltTabsIndicator` in `packages/elements/src/ult-tabs.element.ts`
- Fixture: `apps/docs/public/elements.html`, covered by scenario `elements.fixture-interactions` (`verification/scenarios/elements/fixture-interactions.json`)
- Proof: `packages/elements/src/__tests__/ult-tabs.test.ts`, the shared `packages/elements/src/__tests__/parity.test.ts`, and `apps/docs/tests/production/elements.fixture-interactions.ts`
- Pattern: a compound family shipped as `ult-tabs-*` tags, keyboard behavior proved in the fixture, and parity with the React `Tabs` asserted rather than assumed.

## Registry kinds beyond components

### Command dialog — a recipe

- Contract: `docs/spec/ultima.md#the-command-set`
- Descriptor: `registry/metadata/recipe/command-dialog.ts` (`kind: 'recipe'`, no registry item)
- Demo: `apps/docs/src/demos/command/command-dialog.tsx`, rendered as a section on Command's page
- Proof: `apps/docs/src/__tests__/command-dialog.test.tsx` and the axe sweep the demo joins
- Pattern: a recipe composes shipped items on a docs page; its engine stays a consumer-installed dependency wired through the primitive's own props, and its checks are the live demo and the documented states.

### `setup-vite` and `setup-next` — setup items

- Contract: `docs/spec/ultima.md#setup-items`
- Descriptors: `registry/metadata/setup/setup-vite.ts`, `registry/metadata/setup/setup-next.ts`
- Payload: `registry/static/setup-vite/` and `registry/static/setup-next/`, served verbatim to the consumer
- Proof: the consumer smoke, `scripts/smoke-install.sh`, running as the `consumer-smoke` check in `pnpm verify`
- Pattern: a setup item is install guidance plus static files, not a component; its proof is a real consumer install, not a rendered demo.

## Application state

### Theme studio — history, export and parity

- Contract: `docs/spec/theme-studio.md#contracts`; `draft-history` owns `#shuffle-manual-overrides-and-validation`, `pane-boundaries` owns `#theme-studio-layout-and-live-preview`
- Source: `useStudioDraft` and the draft types in `apps/docs/src/theme-studio-store.ts` and `apps/docs/src/theme-studio-draft.ts`, under route `apps/docs/src/routes/theme-studio.tsx`
- Scenarios: `theme-studio.draft-history` and `theme-studio.pane-boundaries` (`verification/scenarios/theme-studio/`)
- Proof: `apps/docs/src/__tests__/theme-studio.test.tsx` (the registered `docs-vitest` binding for draft history), `apps/docs/src/__tests__/theme-studio-export.test.tsx` (downloads, share links, autosave recovery), `apps/docs/src/__tests__/theme-studio-parity.test.tsx` (exported CSS and StyleX resolve to the values the preview paints), and the production bindings under `apps/docs/tests/production/`
- Pattern: application behavior gets the same treatment as a component — a feature record owns the source roots, a scenario record states the steps, and the binding asserts observed values rather than control clicks.
