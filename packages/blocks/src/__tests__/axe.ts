import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { color } from '@ultima/tokens/tokens.stylex';
import axe from 'axe-core';
import { onTestFinished } from 'vitest';

export const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

export const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'narrow', width: 390, height: 844 },
];

const canvas = stylex.create({
  root: { backgroundColor: color['--ult-color-surface'] },
});

/**
 * Themes the root, as the consumer's page would, and paints its surface: a block paints none of its
 * own, and axe would otherwise fall through to the UA's white page.
 */
export function themeDocument(mode: (typeof themes)[number]) {
  const classes = stylex.props(mode.theme, mode.scheme, canvas.root).className?.split(/\s+/).filter(Boolean) ?? [];
  document.documentElement.classList.add(...classes);
  onTestFinished(() => document.documentElement.classList.remove(...classes));
}

export async function violations(target: axe.ElementContext = document.body): Promise<string[]> {
  // WCAG 2.2's target-size is off in axe by default; a block's controls must meet it.
  const results = await axe.run(target, { rules: { 'target-size': { enabled: true } } });
  return results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`);
}
