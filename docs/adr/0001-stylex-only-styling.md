# 1. StyleX is the only styling engine inside Ultima

Date: 2026-09-08

## Context

Ultima's author works daily with Tailwind, Base UI, and shadcn/ui, and wants to build with StyleX. shadcn's registry and most public component libraries assume Tailwind. A mixed system (StyleX components with a Tailwind escape hatch) would feel familiar to shadcn users but would carry two styling models, two token sources, and two sets of conventions for agents to learn.

## Decision

Components in Ultima are authored in StyleX only. Tokens are defined once with StyleX variables. A build step emits the same tokens as CSS custom properties for consumers that cannot run StyleX. Tailwind is not used inside Ultima.

## Consequences

One styling model to document and for agents to follow. Consumers need a StyleX compiler plugin in their bundler, which the registry install flow must set up or explain. Tailwind-only consumers can adopt the tokens CSS export but not the components. The shadcn registry distributes non-Tailwind items through `add`, but `init` refuses a project without Tailwind, so Ultima ships a universal setup item instead of relying on `init` (see `docs/research/2026-09-08-shadcn-registry-non-tailwind.md`). Both v0 targets, Vite and Next.js, have an official StyleX integration.
