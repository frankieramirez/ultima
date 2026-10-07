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
        name: 'Search components, blocks and docs',
      });
      await userEvent.fill(input, 'aspect ratio');
      await expect
        .element(
          dialog.getByRole('option', { name: /^Aspect Ratio A / }),
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

function textLeft(node: Element) {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect().left;
}

for (const width of [1440, 1920])
  test(`the chrome pins to the viewport edges around an 840px column at ${width}px`, async () => {
    await page.viewport(width, 900);
    onTestFinished(() => page.viewport(1280, 720));
    const screen = await mount();
    await expect
      .element(screen.getByRole('heading', { name: 'Button', level: 1 }))
      .toBeVisible();

    const header = screen.getByRole('banner').element();
    const rule = header.querySelector('[role="separator"]');
    expect(rule).not.toBeNull();
    expect(rule!.getBoundingClientRect().width).toBe(width);

    const menu = screen.getByRole('navigation', { name: 'Ultima' }).element();
    const panel = menu.getBoundingClientRect();
    expect(panel.left).toBe(0);
    expect(getComputedStyle(menu).borderInlineEndWidth).toBe('1px');
    expect(
      Math.abs(panel.top - rule!.getBoundingClientRect().bottom),
    ).toBeLessThanOrEqual(1);

    const logo = screen
      .getByRole('link', { name: 'Ultima home' })
      .element()
      .getBoundingClientRect().left;
    expect(logo).toBe(24);
    for (const node of [menu.querySelector('h3')!, menu.querySelector('a')!])
      expect(textLeft(node)).toBe(24);
    const subgroup = textLeft(menu.querySelector('h4')!);
    expect(subgroup).toBeGreaterThan(24);
    expect(textLeft(menu.querySelector('a[aria-current="page"]')!)).toBe(subgroup);
    expect(
      Math.round(
        width -
          header
            .querySelector('a[href*="github"]')!
            .getBoundingClientRect().right,
      ),
    ).toBe(24);

    const search = screen.getByRole('button', { name: 'Search Ultima' }).element();
    expect(getComputedStyle(search).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(menu.querySelector('input')).toBeNull();

    const rail = screen
      .getByRole('complementary', { name: 'On this page' })
      .element();
    const index = rail.getBoundingClientRect();
    expect(Math.round(width - index.right)).toBe(24);
    expect(rail.querySelector('[role="separator"], hr')).toBeNull();

    const article = document.querySelector('article')!.getBoundingClientRect();
    expect(article.width).toBe(840);
    expect(
      Math.abs(article.left - panel.right - (index.left - article.right)),
    ).toBeLessThanOrEqual(1);
  });

test('the chrome sits above scrolled tab labels', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => {
    window.scrollTo(0, 0);
    return page.viewport(1280, 720);
  });
  const screen = await mount();
  const header = screen.getByRole('banner').element();
  const menu = screen.getByRole('navigation', { name: 'Ultima' }).element();
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
    const links = Array.from(group.querySelectorAll('a'));
    expect(links.every((link) => !link.hasAttribute('aria-label'))).toBe(true);
    const labels = links.map((link) => link.textContent?.trim() ?? '');
    expect(labels.every((label) => label.length > 0 && !label.startsWith('--'))).toBe(true);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  }
});
