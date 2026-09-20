import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { color } from '@ultima/tokens/tokens.stylex';
import axe from 'axe-core';
import { onTestFinished } from 'vitest';

export const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

const canvas = stylex.create({
  root: { backgroundColor: color['--ult-color-surface'] },
});

/**
 * The root, not a wrapper: a portalled popup is outside the wrapper and would be scanned unthemed.
 * Theme classes override the tokens; the canvas paints the surface so axe does not fall through
 * a transparent ancestor to the UA's white page.
 */
export function themeDocument(mode: (typeof themes)[number]) {
  const classes =
    stylex.props(mode.theme, mode.scheme, canvas.root).className?.split(/\s+/).filter(Boolean) ?? [];
  document.documentElement.classList.add(...classes);
  onTestFinished(() => document.documentElement.classList.remove(...classes));
}

/**
 * A non-modal popup portals to `document.body` outside the fixture's landmark, so scanning
 * the document reports axe's region rule against the fixture rather than against the
 * component. Those callers pass their popup; axe still resolves a contrast against the real
 * painted ancestors above it. A modal popup needs no target: everything outside it is inert.
 *
 * A context object rather than an element is for a primitive that renders its own focus guards
 * inside the part under test, which axe reports as `aria-hidden-focus` and which are not
 * Ultima's to fix. Navigation Menu's Viewport is the only one.
 */
export async function violations(target: axe.ElementContext = document.body): Promise<string[]> {
  const results = await axe.run(target);
  return results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`);
}
