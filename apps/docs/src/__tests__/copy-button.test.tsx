import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { CopyButton } from '../copy-button';

function stubClipboard(writeText: () => Promise<void> = () => Promise.resolve()) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

test('a second copy inside the confirmation window mutates the status region', async () => {
  stubClipboard();

  const screen = await render(<CopyButton text="hello" />);
  const status = screen.getByRole('status').element();
  expect(status).toHaveAttribute('aria-atomic', 'true');
  expect(status.textContent).toBe('');

  const mutations: MutationRecord[] = [];
  const observer = new MutationObserver((records) => {
    mutations.push(...records);
  });
  observer.observe(status, { subtree: true, characterData: true, childList: true });

  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  await expect.poll(() => status.textContent).toMatch(/Copied/);

  const afterFirst = mutations.length;
  expect(afterFirst).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  await expect.poll(() => mutations.length).toBeGreaterThan(afterFirst);

  observer.disconnect();
});

test('a rejected copy announces Copy failed through the status region', async () => {
  stubClipboard(() => Promise.reject(new Error('denied')));

  const screen = await render(<CopyButton text="hello" />);
  const status = screen.getByRole('status').element();

  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  await expect.element(screen.getByRole('button', { name: 'Copy failed' })).toBeVisible();
  await expect.poll(() => status.textContent).toBe('Copy failed');
});
