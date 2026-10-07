import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme, palette } from '@ultima/tokens';
import { Card } from '@ultima/ui';
import axe from 'axe-core';
import { expect, onTestFinished, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { PalettePage } from '../routes/palette';
import { TokensPage } from '../routes/tokens';
import { tokenGroups } from '../token-data';
import { describeToken } from '../token-roles';
import { renderWithRouter } from './render-with-router';

function rowOf(container: HTMLElement, name: string): HTMLElement {
  const row = container.querySelector<HTMLElement>(`[data-token="${name}"]`);
  if (!row) throw new Error(`no row for ${name}`);
  return row;
}

function box(element: Element) {
  return element.getBoundingClientRect();
}

function parts(row: HTMLElement) {
  const [swatch, name, dark, light, copy] = Array.from(row.children).map(box);
  return { swatch: swatch!, name: name!, dark: dark!, light: light!, copy: copy! };
}

test('every token in every group has a purpose', () => {
  const missing = tokenGroups.flatMap((group) => group.tokens).filter((token) => !describeToken(token.name));
  expect(missing.map((token) => token.name)).toEqual([]);
});

test('a desktop color row reads swatch, name, dark, light, copy on one line', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await renderWithRouter(<TokensPage />);
  const { swatch, name, dark, light, copy } = parts(rowOf(screen.container, '--ult-color-surface-raised'));
  expect(name.left).toBeGreaterThan(swatch.right);
  expect(dark.left).toBeGreaterThan(name.right);
  expect(light.left).toBeGreaterThan(dark.right);
  expect(copy.left).toBeGreaterThan(light.right);
  expect(Math.abs(dark.top + dark.height / 2 - (name.top + name.height / 2))).toBeLessThan(4);
});

test('a color row at 390px keeps the copy button beside the name and puts the values under it', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await renderWithRouter(<TokensPage />);
  const { name, dark, light, copy } = parts(rowOf(screen.container, '--ult-color-surface-raised'));
  expect(copy.left).toBeGreaterThan(name.right - 1);
  expect(dark.top).toBeGreaterThanOrEqual(name.bottom);
  expect(light.top).toBe(dark.top);
  expect(light.left).toBeGreaterThan(dark.right);
});

test('each color row shows the dark and the light value beside a split swatch', async () => {
  const screen = await renderWithRouter(<TokensPage />);
  const row = rowOf(screen.container, '--ult-color-surface-raised');
  const token = tokenGroups.flatMap((group) => group.tokens).find((entry) => entry.name === '--ult-color-surface-raised')!;
  expect(row.textContent).toContain(`dark ${token.dark.value}`);
  expect(row.textContent).toContain(`light ${token.light.value}`);
  const halves = row.querySelectorAll('[aria-hidden] > span');
  expect([...halves].map((half) => getComputedStyle(half).backgroundColor)).toHaveLength(2);
});

test('no scale name appears on /tokens, which /palette alone may show', async () => {
  const screen = await renderWithRouter(<TokensPage />);
  const text = screen.container.textContent ?? '';
  for (const scale of palette) expect(text).not.toMatch(new RegExp(`\\b${scale.name}\\b`));
});

test('every token has a copy button that copies its name, and every row closes with a separator', async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const screen = await renderWithRouter(<TokensPage />);

  for (const token of tokenGroups.flatMap((group) => group.tokens)) {
    const row = rowOf(screen.container, token.name);
    expect(row.querySelector('button')?.getAttribute('aria-label')).toBe(`Copy ${token.name}`);
    if (!['radius', 'shadow', 'filter'].includes(token.group)) {
      expect(row.lastElementChild?.getAttribute('role')).toBe('separator');
    }
  }

  await userEvent.click(screen.getByRole('button', { name: 'Copy --ult-space-4' }));
  expect(writeText).toHaveBeenCalledWith('--ult-space-4');
});

test('/tokens has the on-this-page rail and /palette, at full content width, does not', async () => {
  const tokens = await renderWithRouter(<TokensPage />);
  const rail = tokens.getByRole('complementary', { name: 'On this page' });
  await expect.element(rail).toBeInTheDocument();
  expect(Array.from(rail.element().querySelectorAll('a'), (link) => link.textContent)).toEqual([
    '01Color',
    '02Space',
    '03Type',
    '04Radius',
    '05Shadow and filter',
    '06Motion',
    '07Pairings',
    '08Overriding',
  ]);
  await tokens.unmount();

  const palettePage = await renderWithRouter(<PalettePage />);
  await expect.element(palettePage.getByRole('heading', { level: 1, name: 'Palette' })).toBeVisible();
  expect(palettePage.getByRole('complementary', { name: 'On this page' }).query()).toBeNull();
});

test('the anchors that ultima check and older links point at still resolve', async () => {
  const screen = await renderWithRouter(<TokensPage />);
  for (const id of ['color', 'space', 'text', 'font', 'radius', 'shadow', 'filter', 'motion', 'pairings', 'overriding']) {
    expect(screen.container.querySelector(`[id="${id}"]`), id).not.toBeNull();
  }
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

test('search keeps only the sections with a match and restores the page when cleared', async () => {
  const screen = await renderWithRouter(<TokensPage />);
  const status = screen.getByRole('status', { name: 'Token search results' });
  const input = screen.getByRole('textbox', { name: 'Search tokens' });

  await userEvent.fill(input, 'surface-raised');
  await expect.element(status).toHaveTextContent('1 tokens · 1 groups');
  await expect.element(screen.getByRole('heading', { level: 2, name: 'Color' })).toBeVisible();
  expect(screen.container.querySelector('#space')).toBeNull();
  expect(screen.container.querySelector('#pairings')).toBeNull();

  await userEvent.fill(input, '');
  await expect.element(status).toHaveTextContent(`${tokenGroups.flatMap((group) => group.tokens).length} tokens · ${tokenGroups.length} groups`);
  expect(screen.container.querySelector('#space')).not.toBeNull();

  await userEvent.fill(input, 'nothing-with-this-name');
  await expect.element(status).toHaveTextContent('0 tokens · 0 groups');
  await expect.element(screen.getByText('No tokens match this search. Try a name or purpose.')).toBeVisible();
});

test('a group tile jumps to its section, clearing a search that hides it', async () => {
  const screen = await renderWithRouter(<TokensPage />);
  await userEvent.fill(screen.getByRole('textbox', { name: 'Search tokens' }), 'radius');
  expect(screen.container.querySelector('#motion')).toBeNull();

  const tiles = screen.getByRole('navigation', { name: 'Token groups' });
  await userEvent.click(tiles.getByRole('link', { name: /^Motion/ }));
  await expect.element(screen.getByRole('textbox', { name: 'Search tokens' })).toHaveValue('');
  expect(screen.container.querySelector('#motion')).not.toBeNull();
});

test('each step band of the convention table is its own row group with a rowgroup header', async () => {
  const screen = await renderWithRouter(<PalettePage />);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Palette' })).toBeVisible();
  const table = screen.container.querySelector('#steps-caption')!.closest('table')!;
  const bodies = [...table.tBodies];
  expect(bodies.map((body) => body.rows[0]?.querySelector('th')?.getAttribute('scope'))).toEqual(Array(5).fill('rowgroup'));
  expect(bodies.reduce((rows, body) => rows + body.rows.length - 1, 0)).toBe(12);
  expect(table.querySelector('[scope="colgroup"]')).toBeNull();
});
