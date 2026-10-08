import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme } from '@ultima/tokens';
import { expect, onTestFinished, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { Kicker } from '../page';

function useDarkTheme() {
  const classes =
    stylex.props(darkTheme, colorScheme.dark).className?.split(/\s+/).filter(Boolean) ?? [];
  document.documentElement.classList.add(...classes);
  onTestFinished(() => document.documentElement.classList.remove(...classes));
}

test('a kicker renders its label in the mono eyebrow style', async () => {
  useDarkTheme();
  const screen = await render(<Kicker tone="subtle">On this page</Kicker>);
  const style = getComputedStyle(screen.getByText('On this page').element());

  expect(style.fontFamily).toContain('IBM Plex Mono');
  expect(style.letterSpacing).not.toBe('normal');
});

test('tone picks between the subtle and muted text tokens', async () => {
  useDarkTheme();
  const screen = await render(
    <>
      <Kicker tone="subtle">Subtle</Kicker>
      <Kicker tone="muted">Muted</Kicker>
    </>,
  );

  expect(getComputedStyle(screen.getByText('Subtle').element()).color).toBe('rgb(146, 146, 146)');
  expect(getComputedStyle(screen.getByText('Muted').element()).color).toBe('rgb(183, 183, 183)');
});
