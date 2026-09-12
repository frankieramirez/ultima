import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import * as stylex from '@stylexjs/stylex';

import Playground from '../demos/home/playground';

test('playground switches preview and code views', async () => {
  const screen = await render(<Playground />);
  await expect.element(screen.getByText('Your next big thing')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Code' }).element());
  await expect.element(screen.getByText(/theme\.stylex\.ts/)).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Preview' }).element());
  await expect.element(screen.getByText('Your next big thing')).toBeVisible();
});

test('publish confirms the project and updates status', async () => {
  const screen = await render(<Playground />);
  await userEvent.click(screen.getByRole('button', { name: 'Publish project' }).element());
  await expect.element(screen.getByRole('dialog')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Publish' }).element());
  await expect.element(screen.getByText('● Project published')).toBeVisible();
});

test('settings exposes the project name and notification switch', async () => {
  const screen = await render(<main><Playground /></main>);
  await userEvent.click(screen.getByRole('tab', { name: 'Settings' }).element());
  await expect.element(screen.getByRole('textbox', { name: 'Project name' })).toBeVisible();
  const notifications = screen.getByRole('switch', { name: 'Notifications' }).element();
  expect(notifications).toHaveAttribute('data-checked');
  await userEvent.click(notifications);
  expect(notifications).not.toHaveAttribute('data-checked');
});

for (const [name, theme, scheme] of [
  ['dark', darkTheme, colorScheme.dark],
  ['light', lightTheme, colorScheme.light],
] as const) {
  test(`playground passes axe in ${name}`, async () => {
    const classes = stylex.props(theme, scheme).className?.split(/\s+/).filter(Boolean) ?? [];
    document.documentElement.classList.add(...classes);
    try {
      await render(<main><Playground /></main>);
      const results = await axe.run(document.body);
      expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.html).join(', ')}`)).toEqual([]);
    } finally {
      document.documentElement.classList.remove(...classes);
    }
  });
}
