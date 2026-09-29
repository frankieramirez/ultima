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
  const code = Array.from(container.querySelectorAll('code')).find(
    (node) => node.textContent === name,
  );
  if (!code?.parentElement) throw new Error(`no row for ${name}`);
  return code.parentElement;
}

function box(element: Element) {
  return element.getBoundingClientRect();
}

test('every token in every group has a purpose', () => {
  const missing = tokenGroups
    .flatMap((group) => group.tokens)
    .filter((token) => !describeToken(token.name));
  expect(missing.map((token) => token.name)).toEqual([]);
});

test('a desktop row puts the purpose under its name and modes on the right', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await renderWithRouter(<TokensPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  const row = rowOf(screen.container, '--ult-color-surface-raised');
  const [name, purpose, dark, light, copy] = Array.from(row.children).map(box);
  expect(purpose!.top).toBeGreaterThanOrEqual(name!.bottom);
  expect(copy!.left).toBeGreaterThan(name!.right);
  expect(dark!.left).toBeGreaterThan(copy!.right);
  expect(light!.left).toBeGreaterThan(dark!.right);
  expect(dark!.top).toBeLessThan(purpose!.bottom);
});

test('a row stacks to three lines at 390px, the copy button beside the name', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await renderWithRouter(<TokensPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  const { container } = screen;

  const row = rowOf(container, '--ult-color-surface-raised');
  const [name, purpose, dark, light, copy] = Array.from(row.children).map(box);
  expect(copy!.top).toBeLessThan(name!.bottom);
  expect(copy!.left).toBeGreaterThan(name!.left);
  expect(purpose!.top).toBeGreaterThanOrEqual(
    Math.max(name!.bottom, copy!.bottom),
  );
  expect(dark!.top).toBeGreaterThanOrEqual(purpose!.bottom);
  expect(light!.top).toBe(dark!.top);
  expect(light!.left).toBeGreaterThan(dark!.right);
});

test('each mode shows a swatch, value, and palette step', async () => {
  const screen = await renderWithRouter(<TokensPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  const { container } = screen;

  const row = rowOf(container, '--ult-color-surface-raised');
  const titles = Array.from(row.querySelectorAll('[title]')).map((chip) =>
    chip.getAttribute('title'),
  );
  expect(titles).toEqual(['mithril 2', 'mithril 2']);
  expect(row.textContent).toContain('dark · mithril 2');
  expect(row.textContent).toContain('light · mithril 2');
});

test('every row closes with a separator and ends in a copy button that copies its name', async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  const screen = await renderWithRouter(<TokensPage />);

  await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  for (const token of tokenGroups.flatMap((group) => group.tokens)) {
    const row = rowOf(screen.container, token.name);
    expect(row.lastElementChild?.getAttribute('role')).toBe('separator');
    const button = row.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe(`Copy ${token.name}`);
  }

  await userEvent.click(
    screen.getByRole('button', { name: 'Copy --ult-space-4' }),
  );
  expect(writeText).toHaveBeenCalledWith('--ult-space-4');
});

test('/tokens has the on-this-page rail and /palette does not', async () => {
  const tokens = await renderWithRouter(<TokensPage />);
  const rail = tokens.getByRole('complementary', { name: 'On this page' });
  await expect.element(rail).toBeInTheDocument();
  expect(
    Array.from(
      rail.element().querySelectorAll('a'),
      (link) => link.textContent,
    ),
  ).toEqual([
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
  await tokens.unmount();

  const palette = await renderWithRouter(<PalettePage />);
  await expect
    .element(palette.getByRole('heading', { level: 1, name: 'Palette' }))
    .toBeVisible();
  expect(
    palette.getByRole('complementary', { name: 'On this page' }).query(),
  ).toBeNull();
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
    const classes =
      stylex.props(theme, scheme).className?.split(/\s+/).filter(Boolean) ?? [];
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

test('groups collapse independently and search opens matches then restores the prior state', async () => {
  const screen = await renderWithRouter(<TokensPage />);
  const radius = screen.getByRole('button', { name: 'Radius', exact: true });
  const space = screen.getByRole('button', { name: 'Space', exact: true });
  await expect.element(radius).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(radius);
  await expect.element(radius).toHaveAttribute('aria-expanded', 'true');
  await expect.element(space).toHaveAttribute('aria-expanded', 'false');
  const input = screen.getByRole('textbox', { name: 'Search tokens' });
  await userEvent.fill(input, 'surface-raised');
  await expect
    .element(screen.getByRole('button', { name: 'Color', exact: true }))
    .toHaveAttribute('aria-expanded', 'true');
  await expect
    .element(screen.getByRole('button', { name: 'Surfaces colors', exact: true }))
    .toHaveAttribute('aria-expanded', 'true');
  await expect
    .poll(() =>
      rowOf(screen.container, '--ult-color-surface-raised').checkVisibility(),
    )
    .toBe(true);
  await userEvent.fill(input, '');
  await expect.element(radius).toHaveAttribute('aria-expanded', 'true');
  await expect.element(space).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  await expect.element(space).toHaveAttribute('aria-expanded', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
  await expect.element(radius).toHaveAttribute('aria-expanded', 'false');
  await userEvent.fill(input, 'nothing-with-this-name');
  await expect
    .element(screen.getByRole('status', { name: 'Token search results' }))
    .toHaveTextContent('0 tokens · 0 groups');
  await expect
    .element(
      screen.getByText('No tokens match this search. Try a name or purpose.'),
    )
    .toBeVisible();
});

test('a table of contents link opens the target disclosure before navigation', async () => {
  const screen = await renderWithRouter(<TokensPage />);
  const radius = screen.getByRole('button', { name: 'Radius', exact: true });
  await userEvent.click(
    screen
      .getByRole('complementary', { name: 'On this page' })
      .getByRole('link', { name: 'Radius', exact: true }),
  );
  await expect.element(radius).toHaveAttribute('aria-expanded', 'true');
  await expect
    .poll(() => rowOf(screen.container, '--ult-radius-lg').checkVisibility())
    .toBe(true);
});
