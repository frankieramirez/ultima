# @ultima/ui

Ultima's components. Source-only: the consumer compiles them.

## Tests

Vitest in browser mode on Playwright's Chromium. There is no jsdom project, because
half of what Ultima has to prove is only true in a real browser: `:focus-visible`
renders an outline, popups position against real layout, cascade layers order.

Chromium is not installed by `pnpm install`. Once per machine, and once in CI:

```sh
pnpm exec playwright install chromium
```

Then `pnpm test` from the repo root, or `pnpm --filter @ultima/ui test` here.

Tests live in `src/__tests__/` and nowhere else; a file outside that directory is
not collected. A co-located `<name>.test.tsx` would sit one character away from
shipping to a consumer.
