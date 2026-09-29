import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router';
import axe from 'axe-core';
import { expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY } from '../theme';
import '../styles.css';

function mount() {
  return render(
    <RouterProvider
      router={createRouter({
        routeTree,
        history: createMemoryHistory({
          initialEntries: ['/components/button'],
        }),
      })}
    />,
  );
}
for (const width of [1440, 390])
  for (const mode of ['dark', 'light'])
    test(`global search navigates from the keyboard at ${width}px in ${mode}`, async () => {
      await page.viewport(width, 844);
      onTestFinished(() => {
        localStorage.removeItem(THEME_STORAGE_KEY);
        return page.viewport(1280, 720);
      });
      localStorage.setItem(THEME_STORAGE_KEY, mode);
      const screen = await mount();
      await userEvent.keyboard('{Control>}k{/Control}');
      const dialog = screen.getByRole('dialog', {
        name: 'Search Ultima',
        exact: true,
      });
      await expect.element(dialog).toBeVisible();
      const input = dialog.getByRole('combobox', {
        name: 'Search pages and components',
      });
      await userEvent.fill(input, 'aspect ratio');
      await expect
        .element(
          dialog.getByRole('option', { name: 'Aspect Ratio', exact: true }),
        )
        .toBeVisible();
      expect(
        dialog.element().getBoundingClientRect().right,
      ).toBeLessThanOrEqual(width);
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(
        (await axe.run(dialog.element())).violations.map(
          ({ id, nodes }) =>
            `${id}: ${nodes.map(({ html }) => html).join(', ')}`,
        ),
      ).toEqual([]);
      await userEvent.keyboard('{Enter}');
      await expect
        .element(
          screen
            .getByRole('main')
            .getByRole('heading', { name: 'Aspect Ratio', level: 1 }),
        )
        .toBeVisible();
      await userEvent.click(
        screen.getByRole('button', { name: 'Search Ultima' }),
      );
      await userEvent.keyboard('{Escape}');
      await expect
        .element(screen.getByRole('button', { name: 'Search Ultima' }))
        .toHaveFocus();
    });

test('the chrome has no dividers and sits above scrolled tab labels', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => {
    window.scrollTo(0, 0);
    return page.viewport(1280, 720);
  });
  const screen = await mount();
  const header = screen.getByRole('banner').element();
  expect(header.querySelector('hr, [role="separator"]')).toBeNull();
  const menu = screen.getByRole('navigation', { name: 'Ultima' }).element();
  expect(getComputedStyle(menu).borderInlineEndWidth).toBe('0px');
  expect(
    screen
      .getByRole('complementary', { name: 'On this page' })
      .element()
      .querySelector('[role="separator"], hr'),
  ).toBeNull();
  const tab = screen
    .getByRole('main')
    .getByRole('tab', { name: 'Preview', exact: true })
    .first()
    .element();
  window.scrollTo(0, window.scrollY + tab.getBoundingClientRect().top - 16);
  const rect = tab.getBoundingClientRect();
  expect(
    document.elementFromPoint(rect.left + 10, rect.top + 10)?.closest('header'),
  ).toBe(header);
  for (const group of menu.querySelectorAll('ul')) {
    const labels = Array.from(
      group.querySelectorAll('a'),
      (link) => link.textContent?.trim() ?? '',
    );
    expect(labels.every((label) => /^--[a-z]+(?:-[a-z]+)*$/.test(label))).toBe(
      true,
    );
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  }
});
