import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { Card } from '@ultima/ui';
import axe from 'axe-core';
import { expect, onTestFinished, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { PalettePage } from '../routes/palette';
import { TokensPage } from '../routes/tokens';
import { tokenGroups } from '../token-data';
import { describeToken } from '../token-roles';
import { renderWithRouter } from './render-with-router';

/** The row a token's name sits in: the `code` element's grid parent. */
function rowOf(container: HTMLElement, name: string): HTMLElement {
  const code = Array.from(container.querySelectorAll('code')).find((node) => node.textContent === name);
  if (!code?.parentElement) throw new Error(`no row for ${name}`);
  return code.parentElement;
}

function box(element: Element) {
  return element.getBoundingClientRect();
}

test('every token in every group has a purpose', () => {
  const missing = tokenGroups.flatMap((group) => group.tokens).filter((token) => !describeToken(token.name));
  expect(missing.map((token) => token.name)).toEqual([]);
});

test('a row holds name, purpose, and both modes on one line at desktop', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const { container } = await renderWithRouter(<TokensPage />);

  const row = rowOf(container, '--ult-color-surface-raised');
  const [name, purpose, dark, light, copy] = Array.from(row.children).map(box);
  for (const cell of [purpose, dark, light, copy]) {
    expect(cell!.top).toBeLessThan(name!.bottom);
    expect(cell!.bottom).toBeGreaterThan(name!.top);
  }
  expect(purpose!.left).toBeGreaterThan(name!.right);
  expect(dark!.left).toBeGreaterThan(purpose!.right);
  expect(light!.left).toBeGreaterThan(dark!.right);
  expect(copy!.left).toBeGreaterThan(light!.right);
});

test('a row stacks to three lines at 390px, the copy button beside the name', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const { container } = await renderWithRouter(<TokensPage />);

  const row = rowOf(container, '--ult-color-surface-raised');
  const [name, purpose, dark, light, copy] = Array.from(row.children).map(box);
  expect(copy!.top).toBeLessThan(name!.bottom);
  expect(copy!.left).toBeGreaterThan(name!.left);
  expect(purpose!.top).toBeGreaterThanOrEqual(Math.max(name!.bottom, copy!.bottom));
  expect(dark!.top).toBeGreaterThanOrEqual(purpose!.bottom);
  expect(light!.top).toBe(dark!.top);
  expect(light!.left).toBeGreaterThan(dark!.right);
});

test('each mode is an inline swatch whose chip carries the palette step', async () => {
  const { container } = await renderWithRouter(<TokensPage />);

  const row = rowOf(container, '--ult-color-surface-raised');
  const titles = Array.from(row.querySelectorAll('[title]')).map((chip) => chip.getAttribute('title'));
  expect(titles).toEqual(['mithril 2', 'mithril 2']);
  expect(row.textContent).not.toContain('mithril');
});

test('every row closes with a separator and ends in a copy button that copies its name', async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const screen = await renderWithRouter(<TokensPage />);

  for (const token of tokenGroups.flatMap((group) => group.tokens)) {
    const row = rowOf(screen.container, token.name);
    expect(row.lastElementChild?.getAttribute('role')).toBe('separator');
    const button = row.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe(`Copy ${token.name}`);
  }

  await userEvent.click(screen.getByRole('button', { name: 'Copy --ult-space-4' }));
  expect(writeText).toHaveBeenCalledWith('--ult-space-4');
});

test('/tokens has the on-this-page rail and /palette does not', async () => {
  const tokens = await renderWithRouter(<TokensPage />);
  const rail = tokens.getByRole('complementary', { name: 'On this page' });
  await expect.element(rail).toBeInTheDocument();
  expect(Array.from(rail.element().querySelectorAll('a'), (link) => link.textContent)).toEqual([
    'Color',
    'Space',
    'Text',
    'Font',
    'Radius',
    'Shadow',
    'Filter',
    'Motion',
    'Pairings',
    'Overriding',
  ]);
  tokens.unmount();

  const palette = await renderWithRouter(<PalettePage />);
  await expect.element(palette.getByRole('heading', { level: 1, name: 'Palette' })).toBeVisible();
  expect(palette.getByRole('complementary', { name: 'On this page' }).query()).toBeNull();
});

test('the tokens page has no axe violations in either mode', async () => {
  // The site's body paints the page ground; mounted bare, a Card stands in for it.
  const { container } = await renderWithRouter(
    <Card.Root>
      <TokensPage />
    </Card.Root>,
  );
  await expect.poll(() => container.querySelector('aside')).not.toBeNull();

  for (const [theme, scheme] of [
    [darkTheme, colorScheme.dark],
    [lightTheme, colorScheme.light],
  ] as const) {
    const classes = stylex.props(theme, scheme).className?.split(/\s+/).filter(Boolean) ?? [];
    document.documentElement.classList.add(...classes);
    // Links transition their color, so a mode switch reads half-way through until it settles.
    await new Promise((resolve) => setTimeout(resolve, 500));
    const results = await axe.run(container);
    document.documentElement.classList.remove(...classes);
    expect(results.violations.map(describe)).toEqual([]);
  }
});

function describe(violation: axe.Result) {
  return `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`;
}
