import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { expect, onTestFinished, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComingSoon } from '../coming-soon';
import '../styles.css';

const modes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

function themeDocument(mode: (typeof modes)[number]) {
  const classes = stylex.props(mode.theme, mode.scheme).className?.split(/\s+/).filter(Boolean) ?? [];
  document.documentElement.classList.add(...classes);
  onTestFinished(() => document.documentElement.classList.remove(...classes));
}

test('the coming-soon page reads as one headline between the brand and the footer', async () => {
  const screen = await render(<ComingSoon />);

  await expect
    .element(screen.getByRole('heading', { level: 1, name: 'Ultima is still charging.' }))
    .toBeVisible();
  await expect.element(screen.getByRole('img', { name: 'Ultima' })).toBeVisible();
  expect(screen.getByRole('main').element()).toBeInTheDocument();
  expect(screen.getByRole('contentinfo').element()).toBeInTheDocument();
});

for (const mode of modes) {
  test(`the coming-soon page has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    await render(<ComingSoon />);

    const results = await axe.run(document.body);
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
  });
}
