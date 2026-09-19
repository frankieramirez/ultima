# 8. Zag.js is the primitive layer for custom elements

Date: 2026-09-18

## Context

The element catalogue re-implements Ultima components for hosts that cannot run React, so Base UI, a React library, cannot be its primitive layer. The element map graded every candidate against ADR 0002's test: supply roles, ARIA, keyboard handling, and focus management, and render no styles. The web-component libraries that supply the four all render styles of their own and require shadow DOM, which the light-DOM decision ruled out. The platform alone supplies at most two of the four and nothing for Tabs.

Zag.js's vanilla adapter (`@zag-js/vanilla`, MIT) is the one candidate that passes, measured in a light-DOM custom element against both interactive report-set components. Its tabs machine emits the full APG contract: `role="tablist"|"tab"|"tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`, `aria-orientation`, roving `tabindex`, and arrows, Home, and End with wrap and disabled-skip. Its tooltip machine emits `role="tooltip"`, `aria-describedby`, hover and focus opens with delays, Escape and blur closes, and no touch opens. Neither injects a stylesheet.

## Decision

The element catalogue's primitive layer is Zag.js through `@zag-js/vanilla`. ADR 0002 stands unchanged and continues to govern the React catalogue. The principle "one styling engine, one primitive library" reads per render target: one styling engine (StyleX, ADR 0001) and one primitive vocabulary per target, Base UI for React components and Zag for elements.

## Consequences

Elements inherit Zag's `data-part` attribute vocabulary rather than Base UI's, so parity between the two catalogues is a naming decision for the element grammar ticket, not something the primitive supplies for free.

Zag is bundled into each element artifact: elements are vendored, so a consumer never installs it, and the 13 to 23 KB gzipped per-element cost (12.9 KB tabs, 22.8 KB tooltip, 27.8 KB combined) lands inside the bundle budget. `@zag-js/popper` brings `@floating-ui/dom` for positioning; a positioning library supplies none of the four things ADR 0002 names, so it is an engine by ADR 0007's test, but that ADR governs dependencies a consumer installs and says nothing about what a vendored artifact contains.

Zag's measured deviations are patched at the element layer: `aria-controls` lands on the selected tab only, where APG and Base UI put it on every tab; its `aria-label` prop produces a dangling `aria-describedby`, which elements avoid by never passing it; and its positioner and arrow carry inline layout styles (`isolation`, `min-width`, `pointer-events`, `z-index`, arrow `background` and `transform`) that tokens reach through the CSS variables it exposes, since inline style wins over the sheet.

Hand-rolling was priced and rejected: Tabs alone is the entire APG keyboard contract, and Tooltip still needs a JavaScript fallback for hover and focus outside Chromium 142+. The reasoning that adopted Base UI for React applies unchanged to elements.

Recorded on [What the primitive layer for elements is, and whether ADR 0002 gains an amendment or a sibling](https://github.com/frankieramirez/ultima/issues/155).
