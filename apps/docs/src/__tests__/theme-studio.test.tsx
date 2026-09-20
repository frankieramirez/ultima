import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme, resolveDraft, stockDraft } from '@ultima/tokens';
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

function readToken(el: Element, token: string) {
  return getComputedStyle(el).getPropertyValue(token).trim();
}

function readAccent(el: Element) {
  return readToken(el, '--ult-color-accent');
}

function readSurface(el: Element) {
  return readToken(el, '--ult-color-surface');
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

  const selector = document.querySelector('[aria-label="Theme groups"]');
  expect(selector).not.toBeNull();
  expect(getComputedStyle(selector as Element).display).toBe('none');
  for (const group of ['Color', 'Typography', 'Density', 'Shape', 'Elevation', 'Motion']) {
    await expect.element(screen.getByRole('heading', { name: group, level: 2 })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: `Shuffle ${group}` })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: `Lock ${group}` })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: `Reset ${group}` })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: `${group} token overrides` })).toBeVisible();
  }

  await expect.element(screen.getByRole('button', { name: /Token contrast/ })).toBeVisible();
  await expect.element(screen.getByText('Editing both modes')).toBeVisible();
  await expect.element(screen.getByText(/overrides/)).toBeVisible();
  await expect.element(screen.getByText(/locked group/)).toBeVisible();
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

  const tables = resolveDraft(stockDraft());
  expect(readAccent(dark)).toBe(tables.dark['--ult-color-accent']);
  expect(readAccent(light)).toBe(tables.light['--ult-color-accent']);
  expect(dark.querySelectorAll('[data-preview-specimen]').length).toBeGreaterThan(0);
  expect(light.querySelectorAll('[data-preview-specimen]').length).toBeGreaterThan(0);
});

const SCENES = ['Workspace', 'Typography', 'Controls', 'Surfaces', 'Overlays', 'States', 'Motion'] as const;

function paintedColor(value: string) {
  const probe = document.createElement('div');
  probe.style.backgroundColor = value;
  document.body.append(probe);
  const painted = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return painted;
}

test('preview components follow the draft', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();

  await expect.element(screen.getByRole('heading', { name: 'Forma' })).toBeVisible();
  expect(pane.querySelector('input')).not.toBeNull();

  const tables = resolveDraft(stockDraft());
  expect(readAccent(pane)).toBe(tables.dark['--ult-color-accent']);
});

test('seven scene tabs show one scene at a time in each pane', async () => {
  const screen = await mount('/theme-studio');
  const tabs = screen.getByRole('tablist', { name: 'Preview scenes' });

  for (const scene of SCENES) {
    await expect.element(tabs.getByRole('tab', { name: scene })).toBeVisible();
  }

  await expect.element(screen.getByRole('heading', { name: 'Forma' })).toBeVisible();
  expect(document.querySelector('[data-preview-scene="typography"]')).toBeNull();

  await userEvent.click(tabs.getByRole('tab', { name: 'Typography' }).element());
  await expect.element(screen.getByText('Mireval at dusk')).toBeVisible();
  expect(document.querySelector('[data-preview-scene="workspace"]')).toBeNull();
  expect(screen.getByRole('tab', { name: 'Typography' }).element()).toHaveAttribute('aria-selected', 'true');

  await userEvent.click(screen.getByRole('button', { name: 'Compare' }).element());
  const dark = screen.getByRole('region', { name: 'Dark preview' }).element();
  const light = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(dark.querySelectorAll('[data-preview-scene="typography"]').length).toBe(1);
  expect(light.querySelectorAll('[data-preview-scene="typography"]').length).toBe(1);
  const tables = resolveDraft(stockDraft());
  expect(readAccent(dark)).toBe(tables.dark['--ult-color-accent']);
  expect(readAccent(light)).toBe(tables.light['--ult-color-accent']);
});

test('the workspace scene is an application mock and the specimen strip sits below it', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const scene = pane.querySelector('[data-preview-scene="workspace"]');
  const strip = pane.querySelector('[data-preview-specimen]');

  expect(scene).not.toBeNull();
  expect(strip).not.toBeNull();
  await expect.element(screen.getByRole('heading', { name: 'Forma' })).toBeVisible();
  await expect.element(screen.getByRole('tab', { name: 'Members' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Project name' })).toBeVisible();
  expect(pane.querySelector('table')).not.toBeNull();
  expect(strip?.textContent).toMatch(/01 \/ TYPE/);
  expect(strip?.textContent).toMatch(/02 \/ INTERACTION/);
  expect(strip?.textContent).toMatch(/03 \/ INSPECT/);
  expect(scene!.getBoundingClientRect().bottom).toBeLessThanOrEqual(strip!.getBoundingClientRect().top + 1);
});

test('the states scene shows forced rest, hover, and active beside live controls', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'States' }).element());

  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const hover = screen.getByRole('button', { name: 'Forced hover' }).element();
  const live = screen.getByRole('button', { name: 'Live solid' });

  await expect.element(screen.getByRole('button', { name: 'Forced rest' })).toBeVisible();
  await expect.element(hover).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Forced active' })).toBeVisible();
  await expect.element(live).toBeVisible();

  const token = getComputedStyle(pane).getPropertyValue('--ult-color-accent-hover').trim();
  expect(getComputedStyle(hover).backgroundColor).toBe(paintedColor(token));

  await userEvent.click(live.element());
  await expect.element(live).toBeVisible();
});

function namedButton(pane: Element, name: string) {
  const match = [...pane.querySelectorAll('button')].find((button) => button.textContent?.trim() === name);
  if (!match) throw new Error(`no button named ${name}`);
  return match;
}

test('the overlay scene portals into each compare pane', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'Overlays' }).element());
  await userEvent.click(screen.getByRole('button', { name: 'Compare' }).element());

  const dark = screen.getByRole('region', { name: 'Dark preview' }).element();
  const light = screen.getByRole('region', { name: 'Light preview' }).element();

  await userEvent.click(namedButton(dark, 'Open overlay'));
  const darkPopup = dark.querySelector<HTMLElement>('[role="dialog"]');
  expect(darkPopup).not.toBeNull();
  await expect.element(darkPopup!).toBeVisible();
  expect(dark.contains(darkPopup)).toBe(true);
  expect(darkPopup!.textContent).toMatch(/pane/i);

  await userEvent.click(namedButton(light, 'Open overlay'));
  const lightPopup = light.querySelector<HTMLElement>('[role="dialog"]');
  expect(lightPopup).not.toBeNull();
  await expect.element(lightPopup!).toBeVisible();
  expect(light.contains(lightPopup)).toBe(true);
});

test('inspect tokens lists declared variables and resolved values per pane mode', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const target = pane.querySelector<HTMLElement>('[data-tokens*="--ult-color-surface-raised"]');
  const readout = screen.getByRole('status', { name: 'Token readout' });

  expect(target).not.toBeNull();
  await userEvent.hover(target!);
  expect(readout.element().textContent).not.toMatch(/--ult-color-surface-raised/);

  await userEvent.click(screen.getByRole('button', { name: 'Inspect tokens' }).element());
  expect(screen.getByRole('button', { name: 'Inspect tokens' }).element()).toHaveAttribute('aria-pressed', 'true');

  await userEvent.hover(target!);
  await expect.element(readout.getByText('--ult-color-surface-raised')).toBeVisible();
  const darkRaised = getComputedStyle(target!).getPropertyValue('--ult-color-surface-raised').trim();
  expect(readout.element().textContent).toContain(darkRaised);

  await userEvent.click(screen.getByRole('button', { name: 'Light' }).element());
  const lightPane = screen.getByRole('region', { name: 'Light preview' }).element();
  const lightTarget = lightPane.querySelector<HTMLElement>('[data-tokens*="--ult-color-surface-raised"]');
  expect(lightTarget).not.toBeNull();
  await userEvent.hover(lightTarget!);
  const lightRaised = getComputedStyle(lightTarget!).getPropertyValue('--ult-color-surface-raised').trim();
  expect(lightRaised).not.toBe(darkRaised);
  await expect.element(screen.getByRole('status', { name: 'Token readout' }).getByText('--ult-color-surface-raised')).toBeVisible();
  expect(screen.getByRole('status', { name: 'Token readout' }).element().textContent).toContain(lightRaised);
});

test('editor chrome stays stock dark when the preview is light', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('button', { name: 'Light' }).element());

  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const pane = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(readSurface(editor)).toBe(stockValue('dark', '--ult-color-surface'));
  expect(readSurface(pane)).not.toBe(stockValue('dark', '--ult-color-surface'));
  expect(readAccent(pane)).toBe(resolveDraft(stockDraft()).light['--ult-color-accent']);
});

test('below 840px the editor becomes a bottom sheet with a horizontal group selector', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const preview = screen.getByRole('region', { name: 'Live preview' }).element();
  await expect.element(editor).toBeVisible();
  expect(preview.getBoundingClientRect().bottom).toBeLessThanOrEqual(editor.getBoundingClientRect().top + 1);
  const groups = screen.getByRole('group', { name: 'Theme groups' }).element();
  expect(getComputedStyle(groups).flexDirection).toBe('row');
  await expect.element(screen.getByRole('heading', { name: 'Color', level: 2 })).toBeVisible();
  expect(screen.container.querySelector('h2')?.textContent).toBe('Color');

  await userEvent.click(screen.getByRole('button', { name: 'Compare' }).element());
  const dark = screen.getByRole('region', { name: 'Dark preview' }).element();
  const light = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(dark.getBoundingClientRect().bottom).toBeLessThanOrEqual(light.getBoundingClientRect().top + 1);
});

test('guided controls write contracted draft parameters and the preview follows', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const stock = resolveDraft(stockDraft());

  expect(readToken(pane, '--ult-space-1')).toBe(stock.dark['--ult-space-1']);
  await userEvent.click(screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Compact' }));
  expect(readToken(pane, '--ult-space-1')).toBe('0.09375rem');

  const hue = screen.getByRole('slider', { name: 'Accent hue' });
  hue.element().focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(readAccent(pane)).not.toBe(stock.dark['--ult-color-accent']);

  await userEvent.click(screen.getByRole('group', { name: 'Shape preset' }).getByRole('button', { name: 'Sharp' }));
  expect(readToken(pane, '--ult-radius-xs')).toBe('0px');

  await userEvent.click(screen.getByRole('group', { name: 'Elevation strength' }).getByRole('button', { name: 'Flat' }));
  expect(readToken(pane, '--ult-shadow-sm')).toBe('none');

  await userEvent.click(screen.getByRole('group', { name: 'Motion speed' }).getByRole('button', { name: 'Brisk' }));
  expect(readToken(pane, '--ult-motion-fast')).toBe('70ms');

  await userEvent.click(screen.getByRole('group', { name: 'Type scale' }).getByRole('button', { name: '1.25' }));
  const size = screen.getByRole('slider', { name: 'Base size' });
  size.element().focus();
  await userEvent.keyboard('{Home}');
  expect(readToken(pane, '--ult-text-5')).toBe('0.875rem');
});

test('group lock and reset live on the draft', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();

  await userEvent.click(screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Roomy' }));
  expect(readToken(pane, '--ult-space-1')).not.toBe('0.125rem');

  await userEvent.click(screen.getByRole('button', { name: 'Lock Density' }));
  expect(screen.getByRole('button', { name: 'Lock Density' }).element()).toHaveAttribute('aria-pressed', 'true');
  await expect.element(screen.getByText(/1 locked group/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Reset Density' }));
  expect(readToken(pane, '--ult-space-1')).toBe('0.125rem');
  expect(screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Cosy' }).element()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('every editor control is a catalogue component, including Color Field seeds', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();

  expect(editor.querySelector('select')).toBeNull();
  expect(editor.querySelector('input[type="color"]')).toBeNull();
  for (const role of ['Neutral', 'Accent', 'Action', 'Success', 'Warning', 'Danger']) {
    await expect.element(screen.getByRole('button', { name: `${role} seed` })).toBeVisible();
    await expect.element(screen.getByRole('slider', { name: `${role} hue` })).toBeVisible();
    await expect.element(screen.getByRole('slider', { name: `${role} saturation` })).toBeVisible();
  }
  await expect.element(screen.getByRole('combobox', { name: 'Sans family' })).toBeVisible();
  await expect.element(screen.getByRole('combobox', { name: 'Mono family' })).toBeVisible();
});

test('the studio passes axe in its default dark preview', async () => {
  const screen = await mount('/theme-studio');
  await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
  const results = await axe.run(document.body);
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
});
