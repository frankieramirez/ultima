import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import axe from 'axe-core';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { routeTree } from '../router';
import { RECENT_KEY } from '../search-index';
import { THEME_STORAGE_KEY } from '../theme';
import '../styles.css';

async function mount(path = '/components/button') {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) });
  return { router, screen: await render(<RouterProvider router={router} />) };
}

async function openSearch(screen: Awaited<ReturnType<typeof render>>, query?: string) {
  await expect.element(screen.getByRole('button', { name: 'Search Ultima' })).toBeVisible();
  await userEvent.keyboard('{Control>}k{/Control}');
  const dialog = screen.getByRole('dialog', { name: 'Search Ultima', exact: true });
  await expect.element(dialog).toBeVisible();
  const input = dialog.getByRole('combobox', { name: 'Search components, blocks and docs' });
  if (query) await userEvent.fill(input, query);
  return { dialog, input };
}

const groupLabels = (dialog: Element) =>
  [...dialog.querySelectorAll('[role="group"][aria-labelledby]')].map((group) => document.getElementById(group.getAttribute('aria-labelledby')!)?.textContent);

afterEach(async () => {
  localStorage.removeItem(RECENT_KEY);
  vi.restoreAllMocks();
  await page.viewport(1280, 720);
});

test('the header registers one global key listener, and Ctrl K toggles the palette', async () => {
  const added: string[] = [];
  for (const target of [document, window]) {
    const add = target.addEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation((type: string, ...rest: [EventListenerOrEventListenerObject, (boolean | AddEventListenerOptions)?]) => {
      if (type === 'keydown') added.push(type);
      return add(type, ...rest);
    });
  }
  const { screen } = await mount();
  await expect.element(screen.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible();
  expect(added).toEqual(['keydown']);
  await openSearch(screen);
  await userEvent.keyboard('{Control>}k{/Control}');
  await expect.poll(() => document.querySelector('[role="dialog"]')).toBeNull();
});

test('"button" at 1440 lists Components, Blocks using Button and Elements, with the preview pane', async () => {
  await page.viewport(1440, 900);
  const { screen } = await mount();
  const { dialog } = await openSearch(screen, 'button');
  await expect.element(dialog.getByRole('option', { name: /^Button A button/ })).toBeVisible();
  expect(groupLabels(dialog.element())).toEqual(['Components · 4', 'Blocks using Button · 4', 'Elements · 2']);
  const options = dialog.getByRole('option').elements().map((option) => option.textContent);
  expect(options.slice(0, 4).map((text) => text?.slice(0, 6))).toEqual(['008But', '009But', '054Tog', '055Tog']);
  expect(options.slice(4, 8)).toEqual(['CRM 01', 'Dashboard 01', 'Settings 01', 'Sign-in 01']);

  const pane = dialog.getByRole('complementary', { name: 'Button preview' });
  await expect.element(pane).toBeVisible();
  expect(pane.element().querySelector('[data-component-preview] [data-theme-boundary="neutral"] button')).not.toBeNull();
  await expect.element(pane.getByText('npx shadcn add @ultima/button')).toBeVisible();
  await expect.element(dialog.getByText('Copy install', { exact: false })).toBeVisible();

  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
  const block = dialog.getByRole('complementary', { name: 'CRM 01 preview' });
  await expect.element(block).toBeVisible();
  const frame = block.element().querySelector('iframe')!;
  expect([frame.getAttribute('loading'), frame.inert]).toEqual(['lazy', true]);
  await expect.element(block.getByText(/^Built from Avatar, Badge, Button/)).toBeVisible();

  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
  const element = dialog.getByRole('complementary', { name: 'Button element preview' });
  await expect.element(element.getByText('<ult-button>', { exact: true }).first()).toBeVisible();
  await expect.element(dialog.getByText('Copy install', { exact: false })).not.toBeInTheDocument();
});

test('Ctrl Enter copies the install command, keeps the palette open and announces it', async () => {
  await page.viewport(1440, 900);
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const { screen } = await mount();
  const { dialog } = await openSearch(screen, 'button');
  await expect.element(dialog.getByRole('option', { name: /^Button A button/ })).toBeVisible();
  const region = [...dialog.element().querySelectorAll('[role="status"]')].at(-1)!;
  expect(region.getAttribute('aria-atomic')).toBe('true');
  expect(region.textContent).toBe('');

  await userEvent.keyboard('{Control>}{Enter}{/Control}');
  expect(write).toHaveBeenCalledWith('npx shadcn add @ultima/button');
  await expect.poll(() => region.textContent).toBe('Copied npx shadcn add @ultima/button');
  await expect.element(dialog).toBeVisible();

  await userEvent.keyboard('{Control>}{Enter}{/Control}');
  await expect.poll(() => region.textContent).toBe('Copied npx shadcn add @ultima/button⁠');

  await userEvent.fill(dialog.getByRole('combobox'), 'install');
  await expect.element(dialog.getByRole('option', { name: 'Install' })).toBeVisible();
  await expect.element(dialog.getByText('Copy install', { exact: false })).not.toBeInTheDocument();
  await userEvent.keyboard('{Control>}{Enter}{/Control}');
  expect(write).toHaveBeenCalledTimes(2);
});

test('Ctrl Enter that confirms an IME composition copies nothing', async () => {
  await page.viewport(1440, 900);
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const { screen } = await mount();
  const { dialog, input } = await openSearch(screen, 'button');
  await expect.element(dialog.getByRole('option', { name: /^Button A button/ })).toBeVisible();
  const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true, bubbles: true, cancelable: true });
  // A composing keydown reports keyCode 229, which is what Base UI checks.
  for (const key of ['keyCode', 'which']) Object.defineProperty(event, key, { value: 229 });
  input.element().dispatchEvent(event);
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(write).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(false);
  await expect.element(dialog).toBeVisible();
});

test('opening an element goes to its web-component section and lands in Recent', async () => {
  const { router, screen } = await mount('/install');
  const { dialog } = await openSearch(screen, 'ult-button');
  await userEvent.click(dialog.getByRole('option', { name: /Button element/ }));
  await expect.poll(() => [router.state.location.pathname, router.state.location.hash]).toEqual(['/components/button', 'web-component']);
  expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual([{ kind: 'element', id: 'button' }]);

  const reopened = await openSearch(screen);
  expect(groupLabels(reopened.dialog.element())).toEqual(['Go to', 'Recent', 'Appearance']);
  await expect.element(reopened.dialog.getByRole('option', { name: /Button element/ })).toBeVisible();
});

test('below WIDE the palette fills the screen, Cancel replaces Esc, and there is no pane or shortcut', async () => {
  await page.viewport(390, 844);
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const { screen } = await mount();
  const { dialog } = await openSearch(screen, 'button');
  await expect.element(dialog.getByRole('option', { name: /^Button A button/ })).toBeVisible();
  await expect
    .poll(() => {
      const box = dialog.element().getBoundingClientRect();
      return [box.left, box.top, box.width, box.height];
    })
    .toEqual([0, 0, 390, 844]);
  await expect.element(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
  expect(dialog.element().querySelector('aside')).toBeNull();
  expect(dialog.element().textContent).not.toContain('Copy install');
  await userEvent.keyboard('{Control>}{Enter}{/Control}');
  expect(write).not.toHaveBeenCalled();
  await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
  await expect.poll(() => document.querySelector('[role="dialog"]')).toBeNull();
});

for (const width of [1440, 390])
  for (const mode of ['dark', 'light'])
    for (const query of ['', 'button'])
      test(`axe passes on the open palette at ${width}px in ${mode}${query ? ` for "${query}"` : ''}`, async () => {
        await page.viewport(width, 900);
        localStorage.setItem(THEME_STORAGE_KEY, mode);
        localStorage.setItem(RECENT_KEY, JSON.stringify([{ kind: 'component', id: 'command' }, { kind: 'block', id: 'dashboard-01' }]));
        onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
        const { screen } = await mount();
        const { dialog } = await openSearch(screen, query);
        await expect.element(dialog.getByRole('option').first()).toBeVisible();
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { violations } = await axe.run(dialog.element());
        expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ html }) => html).join(', ')}`)).toEqual([]);
      });
