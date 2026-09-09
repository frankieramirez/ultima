# 2. Base UI is the primitive layer

Date: 2026-09-08

## Context

Interactive components need accessible, unstyled primitives for focus management, keyboard behavior, and ARIA wiring. Radix is the shadcn default. Base UI is the newer MUI-backed library that shadcn/ui and other libraries are moving toward, and it is the primitive named in the work Ultima is modeled on.

## Decision

Every interactive Ultima component is built on Base UI. Radix is out of scope.

## Consequences

One primitive vocabulary. Component availability in v0 is bounded by what Base UI ships, which a research ticket inventories. Base UI's styling hooks must compose with StyleX-generated props, which a prototype verifies before authoring conventions lock.
