# 6. A compound component may hold state in its own context, and exports a hook when it does

Date: 2026-09-09

## Context

Ultima's first two stateful compound components answered this differently in the same commit. Tabs put `variant` in a context private to `tabs.tsx` so its list, tabs, and indicator agree. Meter made the caller pass `tone` to `Indicator` and `Value` separately, which meant two props for one decision and no way to be wrong quietly. Sidebar then arrived needing an open state that its trigger and its panel both read, and a width switch that decides which of two DOM shapes mounts.

The alternatives were real. Prop-drilling every shared value keeps each part independent and needs no provider, at the cost of repeating one decision at every part that reads it. A flat Sidebar taking navigation as a data prop removes the tree entirely, so nothing has to cross it. A consumer-facing provider component, which is how several kits ship this, puts the state above the component and makes the consumer remember to mount it.

Distribution is what raises the stakes. Ultima hands over source (ADR 0003), so a hook a component exports is a name in the consumer's own file that their code calls.

## Decision

A value the parts must agree on lives in a context created in the component's own file, with `Root` as the provider. A value that can sensibly differ per part stays a prop on the part, and where both apply the prop wins. Context is never a separate registry item and never a provider the consumer mounts.

A component with shared runtime state exports `use<Component>()` beside itself, and that hook throws outside its `Root`. A component whose context carries only an axis exports no hook and degrades to its default instead of throwing.

## Consequences

One file per component still holds, so the context and every part that reads it install together and the registry item shape does not change. Meter's `tone` moves to `Root`. Sidebar can own the switch between its two layouts rather than leaving every consumer to write the same viewport hook.

`useSidebar()` and its return type are public surface in code the consumer owns. Renaming it, or changing what it returns, is a breaking change for anyone who has already installed the file and called it — the same weight as renaming a token under ADR 0004. `scripts/build-agent-guide.ts` had to learn that a component file may export two values.

Two failure modes are now possible that prop-drilling did not have: a part rendered outside its root, which axis context survives and a hook rejects by design, and state that disagrees with what CSS is showing, which is why Sidebar's breakpoint is one string read by both halves.
