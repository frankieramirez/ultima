import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { palette } from '@ultima/tokens';
import { expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { GROUPS, components } from '../components';
import { INSTALL_TARGETS } from '../install-commands';
import { countInWords } from '../routes/home';
import { routeTree } from '../router';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

test('every count the landing shows matches the catalogue', async () => {
  const screen = await mount('/');
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  const count = components.length;

  expect(screen.getByText(`${count} COMPONENTS / ${palette.length} SCALES / 2 MODES`).element()).toBeInTheDocument();
  expect(screen.getByText(`${countInWords(count)} accessible React components`, { exact: false }).element()).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'The six scales' }).getByRole('listitem').all()).toHaveLength(palette.length);

  const filter = screen.getByRole('group', { name: 'Filter the index' });
  expect(filter.getByRole('button', { name: `All ${count}` }).element()).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Components' }).getByRole('listitem').all()).toHaveLength(count);

  for (const group of GROUPS) {
    await userEvent.click(filter.getByRole('button', { name: group.label, exact: true }).element());
    const shown = screen.getByRole('list', { name: 'Components' }).getByRole('listitem').all();
    expect(shown).toHaveLength(components.filter((entry) => entry.group === group.id).length);
  }
});

test('countInWords spells the catalogue count', () => {
  expect(countInWords(54)).toBe('Fifty-four');
  expect(countInWords(60)).toBe('Sixty');
  expect(countInWords(13)).toBe('Thirteen');
  expect(() => countInWords(100)).toThrow(RangeError);
});

test('the hero copies the default target pair, which the guide documents', async () => {
  const written: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (written.push(text), Promise.resolve()) },
  });
  const screen = await mount('/');
  const hero = screen.getByRole('button', { name: 'Copy the Vite install commands' }).first();
  await expect.element(hero).toBeVisible();
  await userEvent.click(hero.element());
  expect(written.at(-1)).toBe(INSTALL_TARGETS[0].commands.join('\n'));
  await expect.element(screen.getByRole('link', { name: 'Installation guide' })).toHaveAttribute('href', '/install');
  await expect.element(screen.getByRole('link', { name: 'Read the index' })).toHaveAttribute('href', '/#index');
});

test('the plate follows the index and wears the previewed preset', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/');
  const plate = screen.getByRole('region', { name: 'Dialog plate' });
  await expect.element(plate).toBeVisible();
  expect(plate.getByText('npx shadcn add @ultima/dialog').element()).toBeInTheDocument();

  await userEvent.hover(screen.getByRole('link', { name: /Tooltip/ }).element());
  const tooltip = screen.getByRole('region', { name: 'Tooltip plate' });
  await expect.element(tooltip).toBeVisible();
  expect(tooltip.getByText('npx shadcn add @ultima/tooltip').element()).toBeInTheDocument();

  const stage = () => tooltip.element().querySelector<HTMLElement>('[data-preset]')!;
  expect(stage().dataset.preset).toBe('neutral');
  const neutral = stage().style.getPropertyValue('--ult-color-accent');

  await userEvent.click(screen.getByRole('button', { name: 'Preview as accent' }).element());
  expect(screen.getByRole('group', { name: 'PREVIEW PRESET' }).getByRole('button', { name: 'Ultima' }).element()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(stage().dataset.preset).toBe('ultima');
  expect(stage().style.getPropertyValue('--ult-color-accent')).not.toBe(neutral);
});

test('below the wide breakpoint the index folds to eight rows until asked', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/');
  const rows = () =>
    screen
      .getByRole('list', { name: 'Components' })
      .getByRole('listitem')
      .all()
      .filter((row) => getComputedStyle(row.element()).display !== 'none');
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  expect(rows()).toHaveLength(8);
  await userEvent.click(screen.getByRole('button', { name: `Show all ${components.length} components` }).element());
  expect(rows()).toHaveLength(components.length);
  expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
});
