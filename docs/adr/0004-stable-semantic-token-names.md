# 4. Semantic tokens carry stable names and are the only override surface

Date: 2026-09-09

## Context

StyleX hashes custom property names by default, which makes a tokens CSS export unreadable and makes plain-CSS overrides impossible. A key that starts with `--` is emitted verbatim, at the cost of component code reading `color['--ult-color-surface']` instead of `color.surface`. Separately, the palette could be emitted as variables so consumers swap whole scales, or kept as compile-time constants so only semantic tokens exist at runtime.

## Decision

Every semantic token key is its custom property name, `--ult-<group>-<name>`. Palette scales are `defineConsts` and never reach CSS. Consumers re-skin Ultima by overriding semantic tokens, through plain CSS or a StyleX theme.

## Consequences

The StyleX build and the tokens CSS export emit identical names, so one override works for every consumer, and the export is a readable file. Component authors pay a small ergonomic tax on every token read. A consumer cannot swap a palette scale by name; promoting the palette to `defineVars` later is additive because semantic names do not change. Names are now part of the public contract: renaming a token is a breaking change for installed consumers.

Amended 2026-09-09, on Sidebar's responsive state model (ULT-54). A token is a custom property, and CSS confines `var()` to property values, so anything that is not a property value cannot be a token however useful it would be. A breakpoint is the first case: it lives in a media condition, and both shapes fail. A `defineVars` value in a media condition compiles with no error and no warning and emits a dead rule. A `defineConsts` value cannot be interpolated into a condition at all, and holding the whole at-rule string as the key compiles correctly but at priority property+3000 rather than property+200, which puts the rule a whole cascade layer above the pseudo-class rules it should be losing to, and forfeits the pass that makes overlapping ranges mutually exclusive. So Ultima's one breakpoint is a named module constant in the file that uses it, and the token layer stays the set of things a consumer can re-skin. The evidence is in `docs/research/2026-09-09-stylex-responsive.md`, run against this repo's installed compiler.
