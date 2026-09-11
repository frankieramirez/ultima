# What do Base UI's live regions actually cover, and what does a status announcement require that a `role="status"` element alone does not?

## Findings

Base UI 1.8.0 has exactly two live-region surfaces and neither is reusable for a general announcement. `Toast.Viewport` is a permanently-mounted polite region that announces whatever toast subtree the consumer renders into it, plus a separate visually hidden `role="alert"` clone for `priority: 'high'` toasts. `Combobox.Status` and `Combobox.Empty` are `role="status"` parts, and their own JSDoc states the rule the rest of this note confirms from the spec: the region's element must stay mounted, and announcements come from content changes inside it. There is no standalone live-region, status, announcer, or `useAnnounce` export. Ultima builds from plain elements.

Three facts decide whether a naive implementation is silent. The region's element must exist in the accessibility tree before the text lands in it, because Core-AAM only maps changes that occur *inside* a live region to a live-region event and never maps the insertion of the region itself. The text has to actually change, because the event is a text-change event and setting the same string twice is not a change. And `role="status"` is atomic by default in the spec but not in every environment, so `aria-atomic="true"` is written explicitly by everyone who ships this.

Every mature implementation works around the same-text problem, and they disagree on how: Base UI appends U+2060, Primer appends U+00A0, React Aria appends a whole new child node into a `role="log"`. Ultima's copy button is the case that needs this. Nothing about an announcement is assertable in browser-mode Vitest beyond structure and text, and axe checks none of it.

### Base UI's Toast, confirmed against v1.8.0

The prior inventory's Toast row is correct and incomplete. `ToastViewport.tsx` at tag `v1.8.0` sets, as `defaultProps` on the rendered `<div>`:

```
tabIndex: -1,
role: 'region',
'aria-live': 'polite',
'aria-atomic': false,
'aria-relevant': 'additions text',
'aria-label': 'Notifications',
```

`aria-atomic: false` is the one attribute the prior note missed, and it is deliberate: a polite region whose children are whole toast subtrees wants only the added node announced, not the entire stack re-read on every addition. The F6 handler is a `keydown` listener on the owner window that calls `viewport.focus({ preventScroll: true })`, pauses the dismiss timers, and stores the previously focused element for restore.

**The live region is always mounted, with one qualifier.** The viewport element is produced by an unconditional `useRenderElement('div', ...)` call. Nothing in `ToastViewport` gates the element on `isEmpty`; `isEmpty` only gates the window event listeners (with a source comment explaining that `store.state.viewport` is not available on the first render because the portal node does not exist yet) and the `FocusGuard` siblings. So once `Toast.Portal` and `Toast.Viewport` are rendered, the polite region is in the DOM whether or not a toast exists. The qualifier is the portal: `ToastPortal` is `FloatingPortalLite`, which returns `null` until `useFloatingPortalNode` resolves a container, and that resolution happens in a `useIsoLayoutEffect`. The region therefore does not exist during SSR and appears on the first client layout effect — before any user-triggered toast, but not on the server-rendered HTML. A consumer who conditionally renders `<Toast.Portal>` only when `toasts.length > 0` defeats the whole arrangement.

**High-priority toasts announce through a second, separate node.** `ToastViewport` renders, as a sibling of the viewport rather than a child:

```tsx
{!focused && highPriorityToasts.length > 0 && (
  <div style={visuallyHidden}>
    {highPriorityToasts.map((toast) => (
      <div key={toast.id} role="alert" aria-atomic>
        <div>{toast.title}</div>
        <div>{toast.description}</div>
      </div>
    ))}
  </div>
)}
```

and `ToastRoot` correspondingly sets `'aria-hidden': isHighPriority && !focused ? true : undefined`, so the visible toast is hidden from assistive technology while the clone speaks. That is why the docs say "For high priority toasts, the `title` and `description` strings are what are used to announce the toast to screen readers. Screen readers do not announce any extra content rendered inside `<Toast.Root>`." The clone disappears once the viewport takes focus, at which point the real toast becomes visible to AT again. `ToastRoot` is `role="dialog"`, or `role="alertdialog"` at high priority, with `aria-modal: false`, `aria-labelledby` from Title, `aria-describedby` from Description, and `inert` when over the `limit`.

**Announcing without a visible toast is not supported, but high priority does it by accident.** There is no `announce`-only option on `ToastManagerAddOptions`; the add options are the `ToastObject` fields minus the managed ones. For a low-priority toast the polite region's content is whatever the consumer renders, so adding a toast and rendering no `Toast.Root` for it announces nothing. For a high-priority toast the hidden `role="alert"` clone is driven straight off `store.useState('toasts')` filtered by `priority === 'high'`, independent of whether any `Toast.Root` is rendered, so `add({ title, priority: 'high' })` would produce an announcement with no visible toast at all. That is a consequence of the source, not a documented API, and it still burns a toast id and a dismiss timer. Do not build on it.

### Base UI ships two other live-region parts, and no announcer

Grepping the published 1.8.0 package for `aria-live`, `role: 'status'`, and `'alert'` returns five files: `toast/viewport/ToastViewport.js`, `combobox/status/ComboboxStatus.js`, `combobox/empty/ComboboxEmpty.js`, `slider/value/SliderValue.js` (which defaults `aria-live` to `'off'` and only exposes it as a prop), and `floating-ui-react/utils/markOthers.js` (unrelated — it is the `aria-hidden` bookkeeping). `Field.Error` carries no role and no `aria-live`: a Base UI form error is associated by `aria-describedby` and is not a live region.

`Combobox.Status` and `Combobox.Empty` (re-exported as `Autocomplete.Status` and `Autocomplete.Empty`) both render:

```
role: 'status', 'aria-live': 'polite', 'aria-atomic': true
```

Their JSDoc, which is also the published text on base-ui.com, is the clearest statement of the mechanic available from any implementation:

> This component's root element must remain mounted in the DOM to announce changes consistently across screen readers. Avoid hiding or removing the component itself with `display: none`, `hidden`, `aria-hidden`, or conditional rendering. Prefer updating or conditionally rendering its children instead.

`ComboboxStatus` reads no Combobox context at all — it is a context-free `role="status"` div plus one hook — so it would technically work outside a Combobox. `ComboboxEmpty` does read context (`useComboboxDerivedItemsContext`) and cannot. Neither is documented for use outside Combobox, so treating `Combobox.Status` as Ultima's general-purpose status region is off-label.

Both call `useInitialLiveRegionTextMutation`, which is Base UI's workaround for the mount-with-content case and is worth reading in full because it encodes three separate facts:

```ts
// Word Joiner is invisible and zero-width, so it forces a text mutation without shifting layout.
const LIVE_REGION_MARKER = '⁠';
// Safari VoiceOver needed roughly 200ms to reliably notice the initial polite live-region change.
const INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY = 200;
```

On mount (skipped entirely when `platform.os.ios`), it finds the last non-empty text node, appends U+2060, and removes it 200ms later. The comment `// Only the initial mounted announcement needs the marker; later text updates announce naturally` is the library stating that a region which mounts with its text already in place does not announce, while a region that is already mounted and then has its text replaced does.

**There is no standalone export.** The full `exports` map of `@base-ui/react@1.8.0` has 44 public subpaths plus `internals/*`, and none is `./live-region`, `./status`, `./announcer`, or `./alert`. No function named `announce` exists anywhere in the package. `visuallyHidden` exists but lives in the separate `@base-ui/utils` package (`@base-ui/utils/visuallyHidden`, v0.4.0), which `@base-ui/react` depends on rather than re-exports; it is `clipPath: 'inset(50%)'`, `overflow: hidden`, `whiteSpace: 'nowrap'`, `border: 0`, `padding: 0`, `width: 1`, `height: 1`, `margin: -1`, plus `position: 'fixed'; top: 0; left: 0`.

### The mechanics that actually work

**`role="status"` versus `aria-live="polite"` are not equivalent.** WAI-ARIA 1.2 defines `status` as "A type of live region whose content is advisory information for the user but is not important enough to justify an alert" and says "Elements with the role `status` have an implicit `aria-live` value of `polite` and an implicit `aria-atomic` value of `true`." So `role="status"` is `aria-live="polite"` plus `aria-atomic="true"` plus a named role in the accessibility tree; bare `aria-live="polite"` gets the politeness and nothing else (`aria-atomic` defaults to `false`). `role="status"` also does not require an accessible name (Name From: author, no Accessible Name Required row), so a bare hidden `<span role="status">` is conformant. The native equivalent is `<output>`, which HTML-AAM §3.5.100 maps to the `status` role — a live region with no ARIA attributes written at all.

**The region must be in the DOM before the text changes.** This is not folklore; it is what the user-agent mapping says and what both W3C techniques test for.

Core-AAM 1.2 §3.8.2 is the normative table of what user agents fire. Every row is conditioned on the change happening inside an existing live region: "When text is inserted → `IA2_EVENT_TEXT_INSERTED` / `EVENT_OBJECT_LIVEREGIONCHANGED` / `text_changed::insert` / **If in a live region**, `AXLiveRegionChanged`", and likewise for subtree insertion: "When an accessibility subtree is inserted → ... **If in a live region**, `AXLiveRegionChanged`." There is no row for "a live region is itself inserted". The section is normative for conformance: "user agents MUST implement the behavior described in this section whenever WAI-ARIA attributes are applied to dynamic content on a Web page."

WCAG technique ARIA22 (Using `role=status` to present status messages) makes it a test step: "Check that the container destined to hold the status message has a `role` attribute with a value of `status` **before the status message occurs**."

WCAG technique ARIA19 says it outright in prose and in its procedure:

> In the example there is an empty error message container element with `aria-atomic=true` and an `aria-live` property or `alert` role present in the DOM on page load. **The error container must be present in the DOM on page load for the error message to be spoken by most screen readers.** `aria-atomic=true` is necessary to make Voiceover on iOS read the error messages after more than one invalid submission.

> Procedure: 1. Determine that an empty error container with `role=alert` or `aria-live=assertive` attribute is present in the DOM (Document Object Model). at page load.

The APG's own reference implementation does the same thing. `content/patterns/alert/examples/alert.html` ships `<div id="example" role="alert"></div>` — empty, in the static markup — and `alert.js` does nothing but `example.innerHTML = template`.

There is one genuine nuance worth not overstating. The APG's Alert Pattern text says "Dynamically rendered alerts are automatically announced by most screen readers", which is the APG claiming that *inserting* a `role="alert"` node works in practice, even though the mapping table does not promise it. Base UI relies on exactly that: its high-priority `role="alert"` clone is conditionally rendered. Radix does not rely on it (see below). Treat assertive-on-insertion as "works in most screen readers, per the APG" and polite-on-insertion as "do not". The same APG page also records the hard limit: "screen readers do not inform users of alerts that are present on the page before page load completes."

### `role="alert"` against `role="status"`

| | `role="alert"` | `role="status"` |
| --- | --- | --- |
| Implicit `aria-live` | `assertive` | `polite` |
| Implicit `aria-atomic` | `true` | `true` |
| What it does to the speech queue | "cause immediate notification"; AT "MAY choose to clear queued changes when an assertive change occurs" | "announce updates at the next graceful opportunity, such as at the end of speaking the current sentence or when the user pauses typing" |
| Superclass | `section` (and `alert` is "a specialized form of the `status` role") | `section` |
| Accessible name required | No | No |
| Focus | "Neither authors nor user agents are required to set or manage focus to an alert"; "authors SHOULD NOT require users to close an alert" | "Authors SHOULD ensure an element with role `status` does not receive focus as a result of change in status" |
| APG pattern | Alert Pattern (keyboard interaction: "Not applicable") | none — the APG has no status pattern |

The choosing rule, quoted from WAI-ARIA 1.2 `aria-live`: "Because an interruption may disorient users or cause them to not complete their current task, authors SHOULD NOT use the `assertive` value unless the interruption is imperative." And from the `alert` role: "If an author desires focus to move to a message when it is conveyed, the author SHOULD use `alertdialog` instead of `alert`."

The APG is notably thin here. There are seven Practices pages (Landmark Regions, Providing Accessible Names and Descriptions, Developing a Keyboard Interface, Grid and Table Properties, Communicating Value and Limits for Range Widgets, Structural Roles, Hiding Semantics with the `presentation` Role) and **none of them is about live regions**; and the 30-odd Patterns include Alert and Alert Dialog but no Status, no Toast, and no Live Region. So for anything past `role="alert"` on a form error, the APG has no guidance to cite and the spec plus the WCAG techniques are the whole authority.

**Both Ultima cases land on `status`, not `alert`.** A form error message is the one case the W3C points at `alert`: ARIA19 is a sufficient technique for both SC 3.3.1 Error Identification and SC 4.1.3, and its example is `<p id="errors" role="alert" aria-atomic="true">`. A toast is the case where the ecosystem openly disagrees with Base UI. Radix's `toast.tsx` carries the comment `// Toasts are always role=status to avoid stuttering issues with role=alert in SRs.` and renders `role="status"` with `aria-live={type === ToastType.Foreground ? 'assertive' : 'polite'}` — same politeness, different role, specifically to avoid `alert`. Base UI uses a real `role="alert"` node for `priority: 'high'`. Ultima inherits Base UI's choice for Toast because the viewport owns it; for anything Ultima writes itself there is no reason to reach for `alert` unless it is a form error or equally imperative.

WCAG 4.1.3's definition also matters for scoping. A status message is one that "provides information to the user on the success or results of an action, on the waiting state of an application, on the progress of a process, or on the existence of errors" and "is not delivered via a change in context". The Understanding document names "18 results returned" and "No results returned" as status messages, and explicitly excludes search results themselves. It also sanctions the hidden-text approach: the "Non-displayed text specific to AT users" section says authors "may wish to designate additional content for inclusion in the status message, including non-displayed text which can be provided to the assistive technologies, for added context."

### Whether the text must change to announce

Yes, and this is the copy-button bug. The user-agent mapping fires a text-change event; setting the same string produces no change and no event. All three reference implementations work around it, differently:

- **Base UI** appends U+2060 WORD JOINER (`'⁠'`) and removes it 200ms later. Only for the initial mount, skipped on iOS.
- **`@primer/live-region-element`** checks and forces a mutation on every announcement: `if (container.textContent === contents) { container.textContent = `${contents} ` } else { container.textContent = contents }` — a trailing non-breaking space.
- **React Aria** avoids the problem structurally. Its regions are `role="log"` with `aria-live` and `aria-relevant="additions"`, and each `announce()` call `appendChild`s a brand-new `<div>` with the message, removing it after a 7000ms timeout. A node addition is a different event from a text change, so the same message twice announces twice with no marker character needed. `role="log"` has implicit `aria-live: polite` and, unlike `status`, **no** implicit `aria-atomic`, which is what makes per-node announcement work.

Note that Primer's React wrapper undoes its own element's workaround. `Announce.tsx` bails before announcing when `textContent === previousAnnouncementText.current`, so `<AriaStatus>Copied</AriaStatus>` re-rendered with the same children will not re-announce, while `announce('Copied')` called twice will.

`apps/docs/src/copy-button.tsx` as it stands has this shape:

```tsx
<span role="status" {...stylex.props(styles.status)}>{copied ? 'Copied' : ''}</span>
```

The region is mounted from the first render (correct) and empty at first (correct, and what ARIA19 and the APG example both do). The `''` reset after the 2000ms timer is what lets a later copy announce again, by taking the text from `'Copied'` to `''` to `'Copied'`. But a second copy *inside* the 2s window calls `setCopied(true)` when `copied` is already `true`, React bails out of the re-render, the text node never changes, and nothing is announced. It also does not set `aria-atomic` explicitly, which ARIA22 advises: "since `role="status"` is currently not treated as atomic by default in some environments, it is advisable to add an explicit `aria-atomic="true"`."

### `aria-atomic` and `aria-relevant`

`aria-atomic` defaults to `false`, and WAI-ARIA 1.2 describes the resolution as an ancestor walk: "When the content of a live region changes, user agents SHOULD examine the changed element and traverse the ancestors to find the first element with `aria-atomic` set." `false` (explicit or by default) means "assistive technologies will only present the changed node to the user"; `true` means "assistive technologies will present the entire contents of the element, including the author-defined live region label if one exists", and AT "MAY choose to combine several changes and present the entire changed region at once". `role="status"` and `role="alert"` both carry an implicit `true`; `role="log"` does not.

For a region whose text is replaced wholesale, `aria-atomic="true"` is what you want and what `status` already gives you — with the caveat from ARIA22 above that it is worth writing anyway. The case where it matters most is partial replacement: WCAG's Understanding 4.1.3 works the example of a cart going from "0 items" to "3 items" and notes that "where only the number in this string was coded as an updated chunk of content, the resulting experience for screen reader users could be to only hear 'three'". That is precisely the Data Table row count shape, where only the number changes.

`aria-relevant` defaults to `additions text`: "When the `aria-relevant` attribute is not provided, the default value, `additions text`, indicates that text modifications and node additions are relevant, but that node removals are irrelevant." So Base UI's explicit `aria-relevant="additions text"` on `Toast.Viewport` restates the default rather than changing anything. Two further spec notes matter for a wholesale text swap:

> Text removals should only be considered relevant if one of the specified values is 'removals' or 'all'. For example, for a text change from 'foo' to 'bar' in a live region with a default `aria-relevant` value, the text addition ('bar') would be spoken, but the text removal ('foo') would not.

> When `aria-relevant` is not defined, an element's value is inherited from the nearest ancestor with a defined value. Although the value is a token list, inherited values are not additive; the value provided on a descendant element completely overrides any inherited value from an ancestor element.

So replacing a region's whole text reads only the new text, which is the desired behaviour, and nothing needs `aria-relevant` written. `removals` and `all` are flagged by the spec as "to be used sparingly".

### `ariaNotify`, the thing that makes all of this obsolete later

ARIA 1.3 (Editor's Draft, 29 August 2026) defines `ARIANotifyMixin`, mixed into both `Element` and `Document`: `undefined ariaNotify(DOMString announcement, optional AriaNotificationOptions options = {})` with `AriaNotifyPriority` of `"normal" | "high"`. It is an imperative announcement with no live region, no pre-mounted element, and no same-text problem, gated on a `"aria-notify"` permissions-policy feature with a default allowlist of `*`, and it aborts if the node "is excluded from the accessibility tree".

Per MDN's browser-compat data for `Element.ariaNotify`: Chrome 141 **partial** ("Fully supported on Windows and Linux, no support on ChromeOS", "Method exposed on macOS, but notifications are not reliably spoken"), Firefox 150, Safari 27, standard track, not flagged experimental. The macOS/Chrome caveat is the one that matters for a design system: a macOS user on Chrome gets a method that resolves and says nothing. It is a progressive enhancement on top of a live region, not a replacement, and it is not a v0 decision.

### What comparable systems ship

| System | Name | Shape | Mechanism |
| --- | --- | --- | --- |
| React Aria | `@react-aria/live-announcer` → `announce(message, assertiveness, timeout)`, `clearAnnouncer`, `destroyAnnouncer` | **Imperative function**, not a component. Published, Apache-2.0, currently v3.5.1, now a thin re-export of `react-aria/private/live-announcer`. | Singleton written in vanilla DOM, deliberately not React ("as a global API, we can't use portals without introducing a breaking API change"). `document.body.prepend`s one visually hidden wrapper containing two children, each `role="log"` + `aria-live="assertive"`/`"polite"` + `aria-relevant="additions"`. Each announcement appends a new `<div>`, removed after 7000ms. Defaults to `assertive`. On first use it waits 100ms before announcing, because "otherwise Safari won't announce the message if it's added too quickly" (and skips the wait under `IS_REACT_ACT_ENVIRONMENT`). |
| React Spectrum | the same `announce()` | — | Spectrum has no live-region component; it calls React Aria's announcer. |
| Primer | `announce()` / `announceFromElement()` from `@primer/live-region-element` (v0.8.0), plus `AriaStatus`, `AriaAlert`, and `Announce` components from `@primer/react` | **Both.** A framework-agnostic imperative API and a thin React component over it. | A `<live-region>` custom element whose shadow root is visually hidden and contains `<div id="polite" aria-live="polite" aria-atomic="true">` and `<div id="assertive" aria-live="assertive" aria-atomic="true">` — no `role="status"` or `role="alert"` anywhere. Announcements go through a min-heap priority queue (assertive first) with `delayMs` and `cancel()`. `AriaStatus` = `Announce politeness="polite"`, `AriaAlert` = assertive. `Announce` renders its children into an ordinary element with no ARIA at all, watches it with a `MutationObserver`, and copies the text into the shared region. |
| Radix | none exported | — | Toast-internal only: a `role="status"` + `aria-live` node portalled into an `announcerContainer`, rendered with the text withheld for one frame ("render text content in the next frame to ensure toast is announced in NVDA"), then removed after 1000ms. Also ships `Toast.AnnounceExclude` to keep decorative content out of the announcement. |
| Base UI | none | — | Toast viewport and `Combobox.Status` only, as above. |

Three design conclusions fall out of the table. First, everyone who built this centralised it: one region per document, created once, shared. Primer's ADR-020 is explicit that it will "lint against usage of `aria-live` and the corresponding roles" inside `@primer/react` and route everything through the one component, and `@primer/live-region-element`'s README says "It is **essential** that the `live-region` element exists in the initial HTML payload of your application. Having multiple live regions on a page is discouraged so we recommend having a single global live region." Second, the imperative call is the dominant shape — React Aria has only that, Primer has both and uses the imperative one underneath. Third, none of the centralised announcers uses `role="status"`; they all use bare `aria-live` or `role="log"`, because the singleton is never the visible element.

There is direct prior art for both Ultima callers. React Aria's `useTable` announces sort changes: `useUpdateEffect(() => { if (sortDescription) announce(sortDescription, 'assertive', 500) }, [sortDescription])`, with the comment "Only announce after initial render, tabbing to the table will tell you the initial sort info already" — assertive, 500ms timeout, and suppressed on mount. Its `useComboBox` announces the option count whenever `optionCount` changes while open, which is the filter-result shape. Primer's `DataTable/Pagination.tsx` uses `AriaStatus` for the same job. And Primer's ADR-020 names the note Ultima will hit if it ships a component: "Both `AriaStatus` and `AriaAlert` will trigger an announcement when the component is rendered. As a result, they should only be used for dynamically rendered content. Otherwise, they will trigger announcements on page load. In cases where they should always be present, then the first message passed to the component should be an empty string."

### Testing

**An announcement is not assertable.** Nothing in the browser exposes what a screen reader said. Browser-mode Vitest drives a real Chromium through Playwright and has no accessibility-API channel, so the assertion ceiling is structure, attributes, text, and computed style. Base UI's own suite draws the line in exactly that place, which is the best available evidence of the ceiling. `ComboboxStatus.test.tsx` asserts `expect(screen.getByRole('status')).toBe(screen.getByTestId('status'))`, then `expect(screen.getByTestId('status').textContent).toBe('Searching…⁠')`, then ticks the clock by `INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY` and asserts the marker is gone. `useToastManager.test.tsx` asserts `highRoot.getAttribute('role') === 'alertdialog'`, `screen.getByRole('alert')` is not null, `screen.getByRole('alert').getAttribute('aria-atomic') === 'true'`, the visible root's `aria-hidden === 'true'`, and that `queryByRole('alert')` is null after close. Not one assertion claims anything was spoken.

What is assertable in Ultima's environment, concretely:

1. **The region exists before the action.** `screen.getByRole('status')` resolves on first render, before the click. `status`, `alert`, and `log` are all in ivya's supported-role list (`src/roleUtils.ts`), which is what backs Vitest's `getByRole`, so the role query works. ivya also maps `<output>` to `status`, so a native `<output>` is queryable the same way.
2. **The text changed.** Read `.element().textContent` before and after. This is the assertion that catches the copy-button bug directly: copy, assert `'Copied'`, copy again, assert the text changed rather than merely still reading `'Copied'`. For the same-string case the honest assertion is on the mutation, not the value — attach a `MutationObserver` with `{ subtree: true, characterData: true, childList: true }` in the test, act twice, and assert it fired twice. That is an inference from how the mechanism works, not something any doc prescribes; it is however exactly what Primer's own `Announce` uses at runtime to detect the change.
3. **The region is hidden but not hidden from AT.** Browser mode has a real cascade, so `getComputedStyle` can assert `clip-path` is not `none` while `display` is not `none` and `visibility` is not `hidden` — which is the whole content of Base UI's "avoid `display: none`, `hidden`, `aria-hidden`" warning, turned into a check. This is the same class of test as item 8 of the proof bar (`CSS the primitive reads`).
4. **The attributes.** `role`, `aria-live`, `aria-atomic` are plain attribute assertions.

**axe checks none of it.** axe-core 4.13 has 105 rules and not one concerns live regions; `aria-live` appears in the source only in `lib/standards/aria-attrs.js` (the attribute table, so `aria-valid-attr-value` will reject `aria-live="gentle"`) and in `lib/commons/aria/lookup-table.js`. `aria-allowed-attr` will reject `aria-live` on a role that prohibits it and `aria-roles` will reject a misspelled `role="statsu"`, and that is the entire extent of it. Neither `alert` nor `status` requires an accessible name in ARIA 1.2, so no name rule applies either.

One concrete and useful interaction with Ultima's existing sweep: axe's `region` rule (`Ensure all page content is contained by landmarks`, best-practice, already live in the docs sweep per the known Tooltip flake) explicitly skips live regions. `lib/checks/navigation/region-evaluate.js` declares `const implicitAriaLiveRoles = ['alert', 'log', 'status']` and returns early with `// Ignore content inside of aria-live` when the node's `aria-live` is `polite`/`assertive` or its role is one of those three. So a visually hidden announcer appended to `document.body` will not trip the landmark rule, and neither does `Toast.Viewport` (which is a `role="region"` landmark with a name anyway).

### Facts later tickets will need

- `Toast.Viewport` in 1.8.0: `role="region"`, `aria-label="Notifications"`, `aria-live="polite"`, **`aria-atomic={false}`**, `aria-relevant="additions text"`, `tabIndex={-1}`. The element renders unconditionally; only the window listeners and focus guards are gated on `isEmpty`.
- The region does not exist during SSR, because `Toast.Portal` resolves its container in a layout effect. It exists from the first client commit onward. Ultima must not let a consumer conditionally render `Toast.Portal`.
- High-priority toasts announce through a *sibling* visually hidden `<div role="alert" aria-atomic>` holding only `toast.title` and `toast.description`, while the visible `Toast.Root` gets `aria-hidden="true"`. Styling or restructuring `Toast.Root` cannot change what is announced.
- Base UI has no announcer, no standalone status, and no hook. `Combobox.Status` is the closest thing and is context-free, but it is documented as a Combobox part. Ultima builds from plain elements.
- `role="status"` = `aria-live="polite"` + `aria-atomic="true"` + a role. `<output>` is the native form of the same thing (HTML-AAM §3.5.100). Neither needs an accessible name.
- The region's element must be mounted before the text lands in it, and must not be hidden with `display: none`, `hidden`, `aria-hidden`, or conditional rendering. Mount it empty. ARIA19 and ARIA22 both test for this; the APG's alert example is built this way.
- Identical consecutive text does not re-announce. Pick one of: append an invisible marker (U+2060 per Base UI, U+00A0 per Primer), clear then set after a tick (ARIA19's example waits 500ms with the comment "This helps screen readers notice when new content appears"), or append a node into a `role="log"` with `aria-relevant="additions"` (React Aria). Only the third needs no character trick.
- Safari/VoiceOver needs time: Base UI budgets 200ms for the initial polite change, React Aria 100ms before the first announcement after creating the region, Radix one animation frame for NVDA. Any Ultima announcer that wants to speak immediately on mount needs one of these delays.
- Base UI skips its marker workaround entirely on iOS (`platform.os.ios`). ARIA19 says `aria-atomic="true"` is what makes VoiceOver on iOS re-read a repeated message.
- For Ultima's two non-Toast callers: copy confirmation is `status`/polite, and the Data Table row count is `status`/polite too. `alert` is for form errors and equally imperative messages; Radix deliberately refuses `alert` even for toasts.
- Prior art to copy for Data Table: React Aria announces the sort description assertively with a 500ms timeout and suppresses it on first render (`useUpdateEffect`); it announces option counts on change. Primer's `DataTable/Pagination` uses `AriaStatus`.
- The announcement itself is not assertable anywhere. Assert: the region resolves by role before the action, the text changed after it, the mutation fired (for the repeat case), the hiding technique is clip-based rather than `display: none`, and the attributes are present. axe adds nothing; axe's `region` rule actively ignores live-region subtrees (`implicitAriaLiveRoles = ['alert', 'log', 'status']`).
- `ariaNotify()` is real and shipping (Chrome 141 partial, Firefox 150, Safari 27) but Chrome on macOS exposes it without reliably speaking. Enhancement only, post-v0.
- The APG has no live-region practice page and no status or toast pattern. For anything past `role="alert"` on an error, the citable authorities are WAI-ARIA 1.2, Core-AAM 1.2 §3.8.2, and the WCAG techniques.

## Sources

### Spec

- https://www.w3.org/TR/wai-aria-1.2/#status: `status` role definition; "implicit `aria-live` value of `polite` and an implicit `aria-atomic` value of `true`"; "Authors SHOULD ensure an element with role `status` does not receive focus as a result of change in status"; Name From: author, no accessible name required.
- https://www.w3.org/TR/wai-aria-1.2/#alert: `alert` role definition; "a specialized form of the `status` role, which is processed as an atomic live region"; implicit `assertive` + `aria-atomic: true`; "Neither authors nor user agents are required to set or manage focus to an alert"; "authors SHOULD NOT require users to close an alert"; "the author SHOULD use `alertdialog` instead of `alert`".
- https://www.w3.org/TR/wai-aria-1.2/#log: `log` role; implicit `aria-live: polite` with **no** implicit `aria-atomic`.
- https://www.w3.org/TR/wai-aria-1.2/#aria-live: politeness semantics; "authors SHOULD NOT use the `assertive` value unless the interruption is imperative"; AT "MAY choose to clear queued changes when an assertive change occurs"; `off` is the default.
- https://www.w3.org/TR/wai-aria-1.2/#aria-atomic: default `false`; the ancestor walk; what `true` and `false` present.
- https://www.w3.org/TR/wai-aria-1.2/#aria-relevant: default `additions text`; the foo→bar example ("the text addition ('bar') would be spoken, but the text removal ('foo') would not"); inherited values are not additive; `removals`/`all` "to be used sparingly".
- https://www.w3.org/TR/wai-aria-1.2/#live_region_roles: the five live-region roles are `alert`, `log`, `marquee`, `status`, `timer`.
- https://www.w3.org/TR/wai-aria-1.2/#dfn-live-region: the definition of a live region.
- https://www.w3.org/TR/core-aam-1.2/#mapping_events_document-contentchange (§3.8.2): the normative event table; every live-region event row is conditioned on "If in a live region"; "user agents MUST implement the behavior described in this section whenever WAI-ARIA attributes are applied to dynamic content".
- https://w3c.github.io/aria/#ARIANotifyMixin: ARIA 1.3 ED (29 Aug 2026) `ariaNotify(announcement, options)` on `Element` and `Document`; `AriaNotifyPriority` `"normal" | "high"`; `"aria-notify"` permissions-policy feature with allowlist `*`; aborts when the node is excluded from the accessibility tree.
- https://www.w3.org/TR/html-aam-1.0/ §3.5.100: the `output` element maps to the `status` role.

### APG and WCAG

- https://www.w3.org/WAI/ARIA/apg/patterns/alert/: "Dynamically rendered alerts are automatically announced by most screen readers"; "screen readers do not inform users of alerts that are present on the page before page load completes"; keyboard interaction "Not applicable"; the WCAG 2.2.3 caution against alerts that disappear automatically.
- https://www.w3.org/WAI/ARIA/apg/practices/ and https://www.w3.org/WAI/ARIA/apg/patterns/: the full Practices list (seven pages, none about live regions) and the full Patterns list (Alert and Alert Dialog, but no Status, Toast, or Live Region pattern).
- https://github.com/w3c/aria-practices/blob/main/content/patterns/alert/examples/alert.html and `.../examples/js/alert.js`: the reference implementation pre-renders `<div id="example" role="alert"></div>` empty and only sets `example.innerHTML`.
- https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22: `role=status` technique; test step "Check that the container ... has a `role` attribute with a value of `status` before the status message occurs"; "since `role="status"` is currently not treated as atomic by default in some environments, it is advisable to add an explicit `aria-atomic="true"`".
- https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19: `role=alert` for errors; "The error container must be present in the DOM on page load for the error message to be spoken by most screen readers"; "`aria-atomic=true` is necessary to make Voiceover on iOS read the error messages after more than one invalid submission"; the clear-then-wait-500ms pattern; procedure step 1.
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html: SC 4.1.3 text and the definition of a status message; "18 results returned" / "No results returned" as examples; search results themselves excluded; the "0 items" → "3 items" partial-update problem; "Non-displayed text specific to AT users" sanctioning hidden live-region text.

### Base UI 1.8.0

- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/toast/viewport/ToastViewport.tsx: the `defaultProps` block including `aria-atomic: false`; the unconditional `useRenderElement('div', ...)`; the `isEmpty` gate on listeners only; the F6 handler; the sibling `<div style={visuallyHidden}>` of `<div role="alert" aria-atomic>` gated on `!focused && highPriorityToasts.length > 0`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/toast/root/ToastRoot.tsx: `role: isHighPriority ? 'alertdialog' : 'dialog'`, `aria-modal: false`, `'aria-hidden': isHighPriority && !focused ? true : undefined`, `inert: inertValue(toast.limited)`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/toast/portal/ToastPortal.tsx and `packages/react/src/utils/FloatingPortalLite.tsx` and `packages/react/src/floating-ui-react/components/FloatingPortal.tsx`: the portal returns `null` until `useFloatingPortalNode` resolves a container in a `useIsoLayoutEffect`, so the viewport has no SSR output.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/toast/useToastManager.ts: `ToastManagerAddOptions` has no announce-only option; `priority` is documented as `low` → "announced politely", `high` → "announced urgently".
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/combobox/status/ComboboxStatus.tsx: `role: 'status'`, `aria-live: 'polite'`, `aria-atomic: true`; reads no Combobox context; the JSDoc "must remain mounted in the DOM to announce changes consistently across screen readers. Avoid hiding or removing the component itself with `display: none`, `hidden`, `aria-hidden`, or conditional rendering."
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/combobox/empty/ComboboxEmpty.tsx: same attributes and same JSDoc warning; does read `useComboboxDerivedItemsContext`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/combobox/utils/useInitialLiveRegionTextMutation.ts: `LIVE_REGION_MARKER = '⁠'` with the Word Joiner comment; `INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY = 200` with the Safari VoiceOver comment; the iOS bail-out; "Only the initial mounted announcement needs the marker; later text updates announce naturally."
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/combobox/status/ComboboxStatus.test.tsx: asserts `getByRole('status')`, `textContent === 'Searching…⁠'`, the reset after the delay, the marker restored on unmount — and never asserts an announcement.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/toast/useToastManager.test.tsx: the `option: priority` test asserting `role="alertdialog"`, `getByRole('alert')`, its `aria-atomic="true"`, and `queryByRole('alert') === null` after close; the dialog test asserting the visible root's `aria-hidden="true"`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/toast/viewport/ToastViewport.test.tsx: contains no `priority` case, so the high-priority alert path is covered only from `useToastManager.test.tsx`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/src/slider/value/SliderValue.tsx: `aria-live` defaults to `'off'` and is only a pass-through prop.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/react/package.json: the 44 public subpath exports — no `./live-region`, `./status`, `./announcer`, or `./alert`.
- https://github.com/mui/base-ui/blob/v1.8.0/packages/utils/src/visuallyHidden.ts: the exact `visuallyHidden` declarations, published as `@base-ui/utils@0.4.0`'s `visuallyHidden` entry point.
- https://base-ui.com/react/components/toast: "For high priority toasts, the `title` and `description` strings are what are used to announce the toast to screen readers. Screen readers do not announce any extra content rendered inside `<Toast.Root>`"; "F6 lets users jump into the toast viewport landmark region"; the `priority` and `limit` option descriptions.
- https://base-ui.com/react/components/combobox: the published form of the `Combobox.Status` / `Combobox.Empty` "must remain mounted in the DOM to announce changes" text.
- Published tarball `@base-ui/react@1.8.0` (verified `name`/`version` from its own `package.json`), grepped for `aria-live`, `role: 'status'`, and `'alert'`: exactly five matching files — `toast/viewport/ToastViewport.js`, `combobox/status/ComboboxStatus.js`, `combobox/empty/ComboboxEmpty.js`, `slider/value/SliderValue.js`, `floating-ui-react/utils/markOthers.js`. No `announce` function anywhere. `field/error/FieldError.js` has no `role` and no `aria-*`.

### Comparable systems

- https://github.com/adobe/react-spectrum/blob/main/packages/react-aria/src/live-announcer/LiveAnnouncer.tsx: `announce` / `clearAnnouncer` / `destroyAnnouncer`; the vanilla-DOM singleton and why it is not React; `document.body.prepend`; two `role="log"` + `aria-live` + `aria-relevant="additions"` children; node-per-message with a 7000ms removal; the 100ms first-announcement delay and its Safari comment; the `IS_REACT_ACT_ENVIRONMENT` test-environment bypass; default assertiveness `assertive`.
- https://github.com/adobe/react-spectrum/blob/main/packages/%40react-aria/live-announcer/package.json and `src/index.ts`: published as `@react-aria/live-announcer` v3.5.1, Apache-2.0, now re-exporting `react-aria/private/live-announcer/LiveAnnouncer`. Confirmed on npm (`npm view @react-aria/live-announcer version` → `3.5.1`).
- https://github.com/adobe/react-spectrum/blob/main/packages/react-aria/src/table/useTable.ts: `announce(sortDescription, 'assertive', 500)` inside `useUpdateEffect`, with "Only announce after initial render, tabbing to the table will tell you the initial sort info already".
- https://github.com/adobe/react-spectrum/blob/main/packages/react-aria/src/combobox/useComboBox.ts: the `countAnnouncement` on option-count change, the focused-option announcement, and the Apple-only selection announcement.
- https://github.com/adobe/react-spectrum/blob/main/packages/react-aria-components/src/Button.tsx: `announce({'aria-labelledby': ...}, 'assertive')` on `isPending` transitions — the `aria-labelledby` message form.
- https://github.com/primer/react/blob/main/contributor-docs/adrs/adr-020-live-regions.md: ADR-020; "both of these approaches do not announce consistently across screen readers"; the decision to centralise on `<live-region>`; "we should lint against usage of `aria-live` and the corresponding roles"; the note that `AriaStatus`/`AriaAlert` announce on render and that a persistent one should start with an empty string; the inventory of which Primer components used `aria-live`, `role="status"`, and `LiveRegion` (DataTable).
- https://github.com/primer/react/blob/main/packages/react/src/live-region/index.ts, `AriaStatus.tsx`, `Announce.tsx`: `Announce` / `AriaAlert` / `AriaStatus`; `AriaStatus` is `Announce politeness="polite" announceOnShow={false}`; `Announce` renders a plain element with no ARIA, watches it with a `MutationObserver` (`subtree`, `childList`, `characterData`), skips when `textContent === previousAnnouncementText.current`, and delegates to `announceFromElement`.
- https://www.npmjs.com/package/@primer/live-region-element (v0.8.0) README: `announce()` / `announceFromElement()`; "It is **essential** that the `live-region` element exists in the initial HTML payload of your application. Having multiple live regions on a page is discouraged so we recommend having a single global live region"; the declarative-shadow-DOM template with `<div id="polite" aria-live="polite" aria-atomic="true">` and `<div id="assertive" aria-live="assertive" aria-atomic="true">`; `delayMs` and cancellation.
- `@primer/live-region-element@0.8.0` `dist/esm/index.js` (published build): the same-text workaround ``if (container.textContent === contents) { container.textContent = `${contents}\xA0` }``, the min-heap priority ordering that puts assertive first, and the visually hidden `:host` style.
- https://github.com/radix-ui/primitives/blob/main/packages/react/toast/src/toast.tsx: `ToastAnnounce` with "Toasts are always role=status to avoid stuttering issues with role=alert in SRs", `aria-live` switched by foreground/background, "render text content in the next frame to ensure toast is announced in NVDA", removal after 1000ms, the `announcerContainer` prop, and `Toast.AnnounceExclude`.

### Testing

- https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md: 105 rules in 4.13, none about live regions; `aria-allowed-attr`, `aria-valid-attr-value`, `aria-roles` are the only ones that touch `aria-live` or the roles at all.
- https://github.com/dequelabs/axe-core/blob/develop/lib/checks/navigation/region-evaluate.js: `const implicitAriaLiveRoles = ['alert', 'log', 'status']` and the `// Ignore content inside of aria-live` early return for `polite`/`assertive` — the `region` landmark rule skips live regions.
- axe-core source search for `aria-live` (GitHub code search over `dequelabs/axe-core` `lib/`): only `lib/standards/aria-attrs.js`, `lib/commons/aria/lookup-table.js`, `lib/checks/navigation/region-evaluate.js`, `lib/checks/aria/aria-errormessage*`, and the generic matchers — no live-region check.
- https://github.com/vitest-dev/ivya/blob/master/src/roleUtils.ts: `status`, `alert`, and `log` are all in the supported-role list that backs Vitest browser-mode `getByRole`; `OUTPUT: () => 'status'` gives `<output>` the implicit role.
- https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaNotify, compat data at https://github.com/mdn/browser-compat-data/blob/main/api/Element.json: Chrome 141 partial ("Fully supported on Windows and Linux, no support on ChromeOS"; "Method exposed on macOS, but notifications are not reliably spoken"), Firefox 150, Safari 27; standard track, not experimental.

### Repository

- `docs/research/2026-09-08-base-ui-inventory.md`: the Toast and Accessibility-guarantees rows this note confirms and extends.
- `docs/spec/ultima.md`, Testing section: one environment (browser-mode Vitest on Playwright Chromium), the eight-item proof bar, the `apps/docs` axe sweep over every demo in both color modes with the default rule set, and open overlays proven in the component's own test file.
- `apps/docs/src/copy-button.tsx`: the existing `<span role="status">` with `copied ? 'Copied' : ''`, mounted from the first render, visually hidden by `clipPath: inset(50%)` rather than `display: none`; no explicit `aria-atomic`; a repeat copy inside the 2000ms window sets state to the value it already has, so no text mutation occurs.
- `packages/ui/src/__tests__/axe.ts` and `packages/ui/package.json`: the sweep helper and `axe-core ^4.13.0`, `vitest ^5.0.0`, `vitest-browser-react ^2.3.0`, `@vitest/browser-playwright ^5.0.0`.
