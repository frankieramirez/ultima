# 4. Semantic tokens carry stable names and are the only override surface

Date: 2026-09-09

## Context

StyleX hashes custom property names by default, which makes a tokens CSS export unreadable and makes plain-CSS overrides impossible. A key that starts with `--` is emitted verbatim, at the cost of component code reading `color['--ult-color-surface']` instead of `color.surface`. Separately, the palette could be emitted as variables so consumers swap whole scales, or kept as compile-time constants so only semantic tokens exist at runtime.

## Decision

Every semantic token key is its custom property name, `--ult-<group>-<name>`. Palette scales are `defineConsts` and never reach CSS. Consumers re-skin Ultima by overriding semantic tokens, through plain CSS or a StyleX theme.

## Consequences

The StyleX build and the tokens CSS export emit identical names, so one override works for every consumer, and the export is a readable file. Component authors pay a small ergonomic tax on every token read. A consumer cannot swap a palette scale by name; promoting the palette to `defineVars` later is additive because semantic names do not change. Names are now part of the public contract: renaming a token is a breaking change for installed consumers.
