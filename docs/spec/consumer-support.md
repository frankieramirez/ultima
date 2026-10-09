# Browser and integration support

Decision: [Decide the browser and integration support promise](https://github.com/frankieramirez/ultima/issues/618), under [Production and portfolio readiness](https://github.com/frankieramirez/ultima/issues/613).

Status: accepted plan, pending implementation and evidence. This document does not certify current browser support. The React and element Vitest configurations currently select Chromium. The existing consumer smoke builds applications; it does not establish rendered cross-engine behavior or hydration. Publish the support promise only after the gates below pass.

## Support matrix

| Target | Initial promise | Required evidence |
| --- | --- | --- |
| Desktop Chrome and Edge | Current stable release on Windows and macOS | Chromium production cases plus a branded-browser smoke on each OS before launch; refresh on browser major changes. |
| Desktop Firefox | Current stable release on Windows and macOS | Firefox production cases plus stable Firefox smoke on each OS before launch and on browser major changes. |
| Safari | Current stable Safari on the current stable macOS | WebKit production cases plus actual Safari smoke before launch and on Safari major changes. |
| Mobile | Current Safari on current stable iOS; current Chrome on current stable Android | Narrow touch emulation plus one physical iPhone and one Android phone. Record device, OS and browser versions. |
| Older browsers, Firefox ESR, embedded webviews and other mobile browsers | Outside the initial tested support promise | Investigate reported defects; add a target only with retained evidence and an explicit policy amendment. |

“Current” is resolved to exact versions and a date in the published evidence manifest. At least monthly and before a production recommendation, maintainers refresh that manifest against stable releases. A new version enters verified coverage only after its checks pass. If it is still pending, publish the last tested version and the gap rather than implying current coverage. Existing source copies retain their recorded baseline; this policy applies to the registry revision being recommended. There is no promised historical version floor beyond that baseline.

Playwright pins browser binaries to its own version, and its WebKit and mobile emulation are test environments. Actual Safari and phone evidence remain separate obligations ([Playwright browser documentation](https://playwright.dev/docs/browsers), consulted September 26, 2026).

| Application target | Contract |
| --- | --- |
| Vite React with TypeScript | Documented `src` layout and alias, production StyleX extraction, layered reset and theme installation. |
| Next.js App Router with TypeScript | Both root `app` and `src/app` layouts, server rendering followed by browser hydration, client boundaries and production StyleX extraction. [Next setup and doctor repair](https://github.com/frankieramirez/ultima/issues/612) fixed the identified src extraction defect; rendered consumer proof is still pending. |
| Custom elements | Existing nine-element catalogue in a plain HTML consumer, with CSS tokens, registration and lifecycle behavior. |
| Other framework layouts | Consumer integrations outside the initial verified setup contract, including Next Pages Router and custom compiler arrangements. |

Record exact framework, React, StyleX, primitive-library and CLI versions from the fixture lockfiles. Support follows the validated dependency set and declared peers; a broad semver range alone does not establish every combination. Framework upgrades rerun the affected fixtures before the documented baseline changes.

## Behavior boundaries

Ultima owns installed-source wiring, emitted styles, documented props, focus behavior and theme inheritance in its documented compositions. Consumers own their changes, content translations, fonts, application validation, server data and their chosen theme's rendered accessibility. Reproduce a report against unmodified installed source before attributing a consumer edit to Ultima. This ownership does not excuse a defect in the supplied setup or component.

The initial localization baseline is Gregorian date entry in `en-US` and `en-GB`, with explicit locale and deterministic parsing in the documented fixture. Pin expected values and input strings in tests. Custom parsing must have a documented commit trigger and invalid-input behavior. Consumers supply localized copy and supported upstream translation props. Additional locales and calendars remain unverified until demonstrated.

Date Picker represents calendar dates in this baseline. Keep year/month/day unchanged through typed input, selection, form submission and hydration in UTC and America/New_York, including a daylight-saving transition and a leap day. Consumers choose the conversion from a calendar date to an instant and the application's time zone. Appointment scheduling, arbitrary time-zone conversion and non-Gregorian calendars are outside this promise.

RTL support is initially conditional: advertise it only for the components whose direction propagation, logical spacing, popup placement and keyboard behavior have passed the representative RTL cases. Document the actual provider/prop recipe for Base UI and Zag separately. An HTML `dir` attribute or inherited upstream capability alone does not establish catalogue-wide support. Test the fixture's navigation, Tabs, Select and Date Picker with `dir="rtl"`; include Arabic labels and explicit translations as a layout fixture, without claiming Arabic date parsing. Any remaining component exclusions must be named on the public support page.

## Bounded production proof

Share the installed consumer fixture and source identity with [Decide the rendered consumer proof required for a production recommendation](https://github.com/frankieramirez/ultima/issues/617). That decision owns export/install permutations and fixture construction. This decision adds engine and integration obligations to those same fixtures. It does not require every engine crossed with every framework, locale, export and viewport.

Retain the full existing Chromium component, axe, element and production suites. Add the following production bundles on one canonical Vite fixture in both modes across Chromium, Firefox and WebKit: 6 bundles × 2 modes × 3 engines = 36 cells. Each cell executes every assertion in its bundle.

| Bundle | Assertions |
| --- | --- |
| Theme and CSS | Non-stock computed token values and actual control paint; layered reset; state styles; scoped portal inheritance; reduced-motion result. |
| Overlay and keyboard | Dialog open, initial focus, Tab containment, Escape and restored trigger focus; Select selection; clipping and scroll behavior. |
| Form | Labels, controlled update and uncontrolled defaults, disabled/read-only behavior, required rejection, submitted FormData and reset. Include checkbox/select alongside text input. |
| Date Picker | Type and commit valid/invalid dates; controlled parent update; clear; single/range values; min/max/unavailable dates; leap day; submit/reset; locale and time-zone cases above. Assert values and event payloads, not just popup visibility. |
| Direction and locale | The bounded RTL components above, direction-aware arrows, logical spacing, translated labels and popup placement. Run both date locales within the date bundle. |
| Narrow touch | Fixed 390px-wide touch context: open and dismiss overlays, reach all controls while scrolling, date selection and input. Emulation supplies repeatable regression evidence only. |

Add hydration/theme/portal smoke on Next root and src layouts in every engine and both modes: 12 cells. Fail on hydration diagnostics, missing CSS/assets or unhandled page errors; verify interaction after hydration. Add element registration, reconnect, attribute/property update and `ult-tabs` keyboard/theme smoke in every engine and both modes: 6 cells. Total initial added matrix: 54 cells, reusing builds across browsers. Fold equivalent cases from the rendered-consumer plan into these cells rather than running duplicate suites.

All six bundles run on the Vite fixture in all three engines: the 36 cells. The runner's [cross-engine bundles](consumer-proof.md#cross-engine-bundles) exercise implements them: theme and CSS, overlay and keyboard, and form on [#770](https://github.com/frankieramirez/ultima/issues/770), and Date Picker, direction and locale, and narrow touch on [#771](https://github.com/frankieramirez/ultima/issues/771). The 12 Next hydration cells and the 6 element cells run through the same runner ([Next hydration and element cells](consumer-proof.md#next-hydration-and-element-cells), [#772](https://github.com/frankieramirez/ultima/issues/772)), so the registered matrix is the full 54 cells. The seeded src-extraction, portal-theming, hydration-mismatch and wrong-submitted-date faults run through the same runner. The first complete warm CI run, which covered the 36 cells registered before #771, and the per-bundle deadlines set from it are recorded under [Gates and cost](consumer-proof.md#gates-and-cost).

### Date entry in the fixture

The Date Picker cells pin these values. Typed text commits on Enter. The Date Picker uses Zag's default `parse` and adds no parsing of its own, so its invalid-input behavior is Zag's. The input accepts only digits and separators, so `abc` leaves the value unchanged. An out-of-range field is constrained to the nearest real date, and the result is then clamped to `min` and `max`: `04/31/2024` commits 2024-04-30, and `13/45/2024` with a `max` of 2024-12-15 commits 2024-12-15. Each commit fires one `onValueChange`. A parent's controlled update fires none. A consumer that needs typed invalid dates rejected rather than constrained supplies its own `parse` and documents that behavior. The fixture submits `DateValue.toString()`, the calendar date's ISO year, month and day. Typed and picked values on both daylight-saving days of 2024 (March 10 and November 3) and on February 29 survive submission unchanged in UTC and America/New_York.

### RTL recipe and exclusions

The RTL fixture sets `dir="rtl"` and `lang` on the document and wraps the app in Base UI's `DirectionProvider direction="rtl"` from `@base-ui/react/direction-provider`, which Base UI components read. Zag components do not read either: each Date Picker or Calendar `Root` takes `dir="rtl"` itself. A `start` or `end` placement on a Zag popup then aligns to the inline start or end. Zag's default Date Picker placement, `bottom`, is centered.

Under that recipe the direction cells assert the document's direction, translated accessible names, and per component: Sidebar navigation's inline-start panel, its inline-end border and inline-start active mark, and keyboard navigation; Tabs' order, indicator and arrow keys; Select's icon side, popup direction, text alignment, placement over the trigger's value, and keyboard selection; and Date Picker's trigger side, week order, previous/next placement, popup placement, chevron direction and grid arrow keys. Two components fail a case in Chromium and Firefox and are named exclusions from the RTL claim:

- **Tabs**: `Tabs.Indicator` sets `inset-inline-start` from Base UI's physical `--active-tab-left`, so the indicator sits at the far end of the list instead of under the selected tab.
- **Date Picker**: `PrevTrigger` and `NextTrigger` draw fixed left and right chevrons, so in RTL "previous" points away from the inline start. Its keyboard, layout and placement cases pass.

Sidebar and Select pass every RTL case in Chromium and Firefox; WebKit's first result comes from the installed-consumer workflow. A component leaves this list only when its excluded case passes in every engine.

### First narrow touch results

At 390 pixels the narrow touch cells fail on two findings. In Chromium and Firefox, the fixture's range Date Picker sits inside a grid form like the Projects scene's own form stacks, and its two inputs' intrinsic widths give `DatePicker.Control` a min-content of about 410 pixels, so the page scrolls horizontally. In Firefox's touch emulation, tapping the backdrop of a modal Base UI Dialog does not dismiss it. That covers the Sidebar drawer and the Edit dialog. The same tap dismisses a Popover, and Chromium dismisses all three. Emulation is regression evidence only, so the Firefox finding still needs a physical Android check before it is attributed to Ultima.

Maintain explicit expected/executed case IDs. A missing, skipped, timed-out or unlaunchable required case leaves verification incomplete or failed. Preserve traces, failure screenshots, console/network errors and actual values alongside revision, fixture hash, dependency lock and browser/OS identity. Seed regressions for missing src extraction, broken portal theming, hydration mismatch and wrong submitted date to prove the assertions catch the claimed failures.

## Cadence, cost and manual proof

On relevant PRs, run the affected bundles in all engines and both modes. Changes to tokens, compiler/setup, shared helpers, dependencies or unknown scope run all 54 cells. Pure prose changes need link/content checks. Before recommending a registry revision, run all cells plus existing release obligations. Run the full added matrix weekly and when browser or framework baselines change; a scheduled failure opens a tracked support gap. The installed-consumer workflow's [weekly run](consumer-proof.md#matrix-and-weekly-run) implements the schedule and the issue.

Compile each fixture once per run and reuse its immutable build. Keep browser jobs bounded to two concurrent workers initially. Budget the added matrix at 15 minutes of warm CI wall time, with installs/downloads reported separately; this is a planning budget, not a measured result. Measure the first complete run and set per-case deadlines from it. Exceeding the budget triggers fixture reuse or sharding work, never silent removal of required cases.

Before launch, perform the matrix's short keyboard/form/overlay smoke in actual desktop browsers listed above. On each physical phone, check touch targets, virtual-keyboard opening and viewport resize, scrolling, popup dismissal, date entry and orientation changes. Include VoiceOver with Safari and NVDA with Chrome for labels, announced state and focus order. Record operator, date, versions, steps, result and evidence. Repeat affected manual checks after relevant interaction changes and refresh the whole manual set at least quarterly. Missing device access is an explicit gap that keeps the corresponding support claim pending.

## Delivery and named gaps

The readiness build plan must deliver the support page and install/agent-guide links, shared fixture assertions, browser adapters and scheduled jobs, then retained automated and manual evidence. The support page lists tested versions, revision/date, supported recipes and exclusions. Keep its public claims synchronized with the evidence manifest.

Open evidence gaps: actual browser/device checks, rendered Next src extraction and hydration, Date Picker hydration in the Next layouts, and RTL beyond the four fixture components and their named exclusions. This document records a plan; it ran none of those new checks. Existing upstream suites remain useful; duplicate only behavior that Ultima's wrapper, styling or installation can break. The decision closes the policy question; implementation and launch readiness remain separate from this planning map.
