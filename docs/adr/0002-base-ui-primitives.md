# 2. Base UI is the primitive layer

Date: 2026-09-08

## Context

Interactive components need accessible, unstyled primitives for focus management, keyboard behavior, and ARIA wiring. Radix is the shadcn default. Base UI is the newer MUI-backed library that shadcn/ui and other libraries are moving toward, and it is the primitive named in the work Ultima is modeled on.

## Decision

Every interactive Ultima component is built on Base UI. Radix is out of scope.

## Consequences

One primitive vocabulary. Component availability in v0 is bounded by what Base UI ships, which a research ticket inventories. Base UI's styling hooks must compose with StyleX-generated props, which a prototype verifies before authoring conventions lock.

## Amendment (2026-09-20)

Recorded on [Item or recipe on each of the six remaining v0.2 lines](https://github.com/frankieramirez/ultima/issues/277), exercised first on [Calendar and Date Picker: shape, engine, and the ADR 0002 question](https://github.com/frankieramirez/ultima/issues/281). `@base-ui/react@1.8.0` ships no path for three v0.2 entries — Calendar, Date Picker, and Resizable — and hand-rolling their APG contracts is what ADR 0008 already priced and rejected for elements.

Base UI stays the React catalogue's primitive layer. This amendment admits a bounded second source, Zag.js through `@zag-js/react`, for the entries Base UI cannot cover. It is bounded three ways: an entry reaches for Zag only when Base UI ships no primitive for it; the candidate still has to supply the four things this ADR names — roles, ARIA state, keyboard handling, and focus management — while shipping no styles, the same test ADR 0008 graded Zag against for elements; and Zag is the second source rather than a new third library because it is already the element primitive layer, so one vocabulary serves both targets.

A prop-getter library is a primitive by that test, not an engine under ADR 0007: it renders nothing and ships no styles yet supplies everything this ADR adopted Base UI for. An item built on one is a catalogue item like any other — one file, the primitive in its derived `dependencies` — and Calendar, Date Picker, and Resizable are the first.
