# The proof bar

Every component ticket ships a test file at `packages/ui/src/__tests__/<name>.test.tsx` covering the component's own row of the [Accessibility contract](../../../docs/spec/ultima.md#accessibility-contract) and its own axes. The eight items are fixed by [What a build ticket proves](../../../docs/spec/ultima.md#what-a-build-ticket-proves); this is the form to copy into the file and answer. It is a bar, not a suite: a component with no axes and no state still costs a file, and an item with no instance is answered "none, because ____" rather than deleted.

## The checklist

Paste this at the top of the new test file, replace each blank with what this component does, then write the tests it names and delete the comment.

```tsx
/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: ____ × ____ × ____, and no props matches the declared default.
 * 2. The name resolves: role ____, named by ____.
 * 3. The focus ring lands where the contract says: on ____; ____ renders none.
 * 4. The primitive is still wired: ____.
 * 5. Documented state drives its style: ____.
 * 6. Typecheck passes: className is rejected, and each axis union is exactly its values.
 * 7. Behavior this component wires itself: ____ (none, because every interaction is ____).
 * 8. CSS the primitive reads: ____.
 */
```

Item by item:

1. **Every combination renders.** Loop the axes rather than writing the cells out; `button.test.tsx` nests three `for` loops over the literal unions. Prove the default separately by rendering one component with no props beside one with every axis passed explicitly, and comparing the two class strings.
2. **The name resolves** through the source the contract row names, queried by role and accessible name.
3. **The focus ring** shows after keyboard focus on the part the contract names, and a part the contract says renders no ring shows none. Menu and Select items assert their `data-highlighted` styling instead.
4. **The primitive is still wired.** One assertion per contract row marked Base UI in the Keyboard column: Escape closes, arrows move and loop, focus returns to the trigger. This confirms the composition did not break Base UI. It is not a re-test of Base UI, which tests itself.
5. **Documented state drives its style.** Each `data-*` attribute the [per-component notes](../../../docs/spec/ultima.md#per-component-notes) name actually produces its change. Assert the change, not the value: read the computed style, flip the attribute, read it again, and compare the two.
6. **Typecheck passes.** `expectTypeOf<Props>().not.toHaveProperty('className')`, and each axis union equals exactly its values.
7. **Behavior the component wires itself.** Every behavior in the per-component notes that is neither the primitive's nor a style. Item 4 covers what Base UI does; this covers what Ultima does on top of it, and nothing else in the bar reaches it. The v0 instances are `Sidebar.Link` closing the mobile menu, `Sidebar.Trigger` toggling whichever state the current width applies, `Table.Scroll` taking focus and scrolling when its content really overflows, and a single-selection Toggle Group emptying along with the `eventDetails.cancel()` that prevents it. **No v0.1 component fills it**, so a v0.1 file answers the line with the reason: every interaction is the primitive's, which is item 4, or a style reacting to a `data-*` attribute, which is items 5 and 8. Writing a pointer handler, a focus move, or a state change that is not in the contract means the contract did not anticipate it — stop and say so rather than testing it in.
8. **CSS the primitive reads.** A part styled under the second clause of [Styled parts](../../../docs/spec/ultima.md#styled-parts) asserts the declaration the primitive depends on, because these failures look correct in a screenshot and item 5 cannot see them. `Collapsible.Panel` is the worked case: `transition-duration` is not `0s`, `animation-name` is `none`, and `display` is not overridden while the panel is `[hidden]`. The named v0.1 successors are `Combobox.List` as a scroll container and `Combobox.Popup` tracking `--anchor-width`; `Slider.Control`'s `touch-action: none` and `user-select: none`, and `Slider.Track`'s explicit cross-axis size; `Toast.Root`'s intra-stack `z-index`, its height clamp reading `--toast-frontmost-height`, and its swipe vars in `transform`; `Progress.Track`'s explicit height and `overflow: hidden`, plus the `animation-name` split every looping part owes — not `none` by default, `none` under `prefers-reduced-motion: reduce` — which Skeleton and Spinner assert the same way.

**No test asserts a color value.** An outline width that is not `0px`, a background that differs from its resting background: yes. An `rgb(...)` or a hex literal: never. Palette values are regenerated, and a suite that pins them turns every regeneration into a day of updating tests.

## The environment

Vitest in browser mode on Playwright's Chromium, one environment and no jsdom project ([Environment](../../../docs/spec/ultima.md#environment)). Half of what these tests prove is only true in a real browser, so `getComputedStyle` is the instrument, not an attribute assertion standing in for one.

Three traps, each of which reads as a broken component and is not:

- **Never call `.unmount()` between renders in one test.** The next `render()` leaves an empty container, and every synchronous `.element()` after it fails with "Cannot find element". Render both cases in one tree and tell them apart by accessible name, the way `button.test.tsx` does with two Buttons.
- **`outline-width` computes to `3px` even when `outline-style` is `none`**, because `medium` is the initial width. A "this part renders no ring" assertion checks `outlineStyle === 'none'`, not a zero width. Where a part sets `outlineWidth: 0` explicitly, as the menu popup does, the width assertion is the right one.
- **Base UI appends a visually hidden `<span>` after some parts' children.** `querySelector('span:last-of-type')` grabs that instead of the part you want. Select by rendered text or by a `data-testid` on the part.

**The full suite is not deterministic locally.** Two `pnpm test` runs over an identical tree produce different failure sets, concentrated in the overlay and focus-return assertions of `dropdown-menu`, `select`, `tabs`, and `tooltip`. Before spending time on a failure, run your own file alone: a component whose own tests pass in isolation and repeatedly is not the cause of a red run elsewhere. Judge your change against a run of the tree without it, not against green.

## Beyond the file

`apps/docs` holds one sweep that walks every demo through `import.meta.glob`, mounts each in both color modes, and runs axe ([Accessibility checks](../../../docs/spec/ultima.md#accessibility-checks)). Adding a demo adds its coverage, so a component with demos is already covered there and its test file does not repeat the sweep.
