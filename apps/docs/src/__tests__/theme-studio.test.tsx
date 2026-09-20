import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { MENU_LABEL } from '../site-menu';
import { routeTree } from '../router';
import '../styles.css';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

const stock = {
  dark: stylex.props(darkTheme, colorScheme.dark),
  light: stylex.props(lightTheme, colorScheme.light),
};

function readAccent(el: Element) {
  return getComputedStyle(el).getPropertyValue('--ult-color-accent').trim();
}

function readSurface(el: Element) {
  return getComputedStyle(el).getPropertyValue('--ult-color-surface').trim();
}

function stockValue(mode: keyof typeof stock, token: '--ult-color-accent' | '--ult-color-surface') {
  const probe = document.createElement('div');
  probe.className = stock[mode].className ?? '';
  document.body.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(token).trim();
  probe.remove();
  return value;
}

test('the studio route renders its workbench header in place of docs navigation', async () => {
  const screen = await mount('/theme-studio');

  await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
  await expect.element(screen.getByText('Untitled theme')).toBeVisible();
  await expect.element(screen.getByText('Saved locally')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Open' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Export/ })).toBeVisible();
  expect(screen.container.querySelector('nav[aria-label="Site"]')).toBeNull();
  expect(screen.container.querySelector(`nav[aria-label="${MENU_LABEL}"]`)).toBeNull();
});

test('the rail sits beside the preview, with the status bar under the editor', async () => {
  const screen = await mount('/theme-studio');

  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const preview = screen.getByRole('region', { name: 'Live preview' }).element();
  await expect.element(editor).toBeVisible();
  await expect.element(preview).toBeVisible();
  expect(editor.getBoundingClientRect().right).toBeLessThanOrEqual(preview.getBoundingClientRect().left + 1);

  await expect.element(screen.getByRole('group', { name: 'Theme groups' })).toBeVisible();
  for (const group of ['Color', 'Typography', 'Density', 'Shape', 'Elevation', 'Motion']) {
    await expect.element(screen.getByRole('button', { name: group, exact: true })).toBeVisible();
  }
  expect(getComputedStyle(screen.getByRole('group', { name: 'Theme groups' }).element()).flexDirection).toBe(
    'column',
  );

  await expect.element(screen.getByRole('button', { name: /Token contrast/ })).toBeVisible();
  await expect.element(screen.getByText('Editing both modes')).toBeVisible();
  await expect.element(screen.getByText(/overrides/)).toBeVisible();
  await expect.element(screen.getByText(/locked groups/)).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Reset theme' })).toBeVisible();
  expect(editor.contains(screen.getByRole('button', { name: 'Reset theme' }).element())).toBe(true);
});

test('dark, light, and compare force pane modes and share one draft', async () => {
  const screen = await mount('/theme-studio');
  const modes = screen.getByRole('group', { name: 'Preview color mode' });

  await expect.element(screen.getByRole('region', { name: 'Dark preview' })).toBeVisible();
  expect(document.querySelector('[aria-label="Light preview"]')).toBeNull();

  await userEvent.click(modes.getByRole('button', { name: 'Light' }).element());
  await expect.element(screen.getByRole('region', { name: 'Light preview' })).toBeVisible();
  expect(document.querySelector('[aria-label="Dark preview"]')).toBeNull();

  await userEvent.click(modes.getByRole('button', { name: 'Compare' }).element());
  const dark = screen.getByRole('region', { name: 'Dark preview' }).element();
  const light = screen.getByRole('region', { name: 'Light preview' }).element();
  await expect.element(dark).toBeVisible();
  await expect.element(light).toBeVisible();

  const draftDark = readAccent(dark);
  const draftLight = readAccent(light);
  expect(draftDark).not.toBe(stockValue('dark', '--ult-color-accent'));
  expect(draftLight).not.toBe(stockValue('light', '--ult-color-accent'));
  expect(dark.querySelectorAll('[data-preview-specimen]').length).toBeGreaterThan(0);
  expect(light.querySelectorAll('[data-preview-specimen]').length).toBeGreaterThan(0);
});

test('preview components follow the draft and an overlay mounts inside the pane', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();

  expect(pane.textContent).toMatch(/Solid/);
  expect(pane.querySelector('input')).not.toBeNull();
  expect(pane.textContent).toMatch(/Badge/);

  const accent = readAccent(pane);
  expect(accent).toBe('#56cb98');
  expect(accent).not.toBe(stockValue('dark', '--ult-color-accent'));

  await userEvent.click(screen.getByRole('button', { name: 'Notes' }).element());
  const popup = screen.getByRole('dialog', { name: /pane/i });
  await expect.element(popup).toBeVisible();
  expect(pane.contains(popup.element())).toBe(true);
});

test('editor chrome stays stock dark when the preview is light', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('button', { name: 'Light' }).element());

  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const pane = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(readSurface(editor)).toBe(stockValue('dark', '--ult-color-surface'));
  expect(readSurface(pane)).not.toBe(stockValue('dark', '--ult-color-surface'));
  expect(readAccent(pane)).toBe('#008359');
});

test('below 840px the editor becomes a bottom sheet with a horizontal group selector', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const preview = screen.getByRole('region', { name: 'Live preview' }).element();
  await expect.element(editor).toBeVisible();
  expect(preview.getBoundingClientRect().bottom).toBeLessThanOrEqual(editor.getBoundingClientRect().top + 1);
  expect(getComputedStyle(screen.getByRole('group', { name: 'Theme groups' }).element()).flexDirection).toBe(
    'row',
  );

  await userEvent.click(screen.getByRole('button', { name: 'Compare' }).element());
  const dark = screen.getByRole('region', { name: 'Dark preview' }).element();
  const light = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(dark.getBoundingClientRect().bottom).toBeLessThanOrEqual(light.getBoundingClientRect().top + 1);
});

test('the studio passes axe in its default dark preview', async () => {
  const screen = await mount('/theme-studio');
  await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
  const results = await axe.run(document.body);
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
});
