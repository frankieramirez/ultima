import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme, resolveDraft, stockDraft } from '@ultima/tokens';
import axe from 'axe-core';
import { beforeEach, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { MENU_LABEL } from '../site-menu';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY } from '../theme';
import '../styles.css';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

beforeEach(() => {
  localStorage.clear();
});

const stock = {
  dark: stylex.props(darkTheme, colorScheme.dark),
  light: stylex.props(lightTheme, colorScheme.light),
};

const themeClasses = (mode: keyof typeof stock) =>
  stock[mode].className?.split(/\s+/).filter(Boolean) ?? [];

function prefer(mode: keyof typeof stock) {
  const root = document.documentElement;
  root.classList.remove(...themeClasses('dark'), ...themeClasses('light'));
  root.classList.add(...themeClasses(mode));
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
}

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

test('the studio route joins the site shell with the rail collapsed and no footer', async () => {
  const screen = await mount('/theme-studio');

  const site = screen.getByRole('navigation', { name: 'Site', exact: true });
  await expect.element(site.getByRole('link', { name: 'Studio' })).toBeVisible();
  expect(document.querySelectorAll('[aria-label="Ultima home"]').length).toBe(1);

  const menu = screen.container.querySelector(`nav[aria-label="${MENU_LABEL}"]`);
  expect(menu).not.toBeNull();
  expect(menu).toHaveAttribute('data-closed');

  await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Theme Studio' }).element()).toBe(
    screen.container.querySelector('h1'),
  );
  expect(screen.container.textContent).not.toContain('Untitled theme');
  await expect.element(screen.getByText('Saved locally')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Open' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Export/ })).toBeVisible();

  expect(screen.container.querySelector('footer')).toBeNull();
  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
});

for (const mode of ['dark', 'light'] as const) {
  test(`the shared header follows the ${mode} preference while the workbench stays pinned dark`, async () => {
    prefer(mode);
    const screen = await mount('/theme-studio');

    const header = screen.container.querySelector('header')!;
    expect(readSurface(header)).toBe(stockValue(mode, '--ult-color-surface'));

    const subBar = screen.getByRole('heading', { name: 'Theme Studio' }).element().parentElement!;
    expect(readSurface(subBar)).toBe(stockValue('dark', '--ult-color-surface'));
  });
}

test('below the breakpoint the hamburger opens the site menu over the studio', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const screen = await mount('/theme-studio');
  expect(document.querySelector(`nav[aria-label="${MENU_LABEL}"]`)).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }).element());
  await expect.element(screen.getByRole('dialog', { name: MENU_LABEL })).toBeVisible();
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

test('the editor rail scrolls its groups through a styled scroll area and never overflows horizontally', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();

  const viewport = () => editor.querySelector<HTMLElement>('[role="presentation"][tabindex]')!;
  expect(viewport()).not.toBeNull();
  await expect.poll(() => viewport().scrollHeight).toBeGreaterThan(viewport().clientHeight);
  await expect.poll(() => editor.querySelector('[data-orientation="vertical"]')).not.toBeNull();
  expect(viewport().scrollWidth).toBeLessThanOrEqual(viewport().clientWidth + 1);

  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  expect(viewport().scrollWidth).toBeLessThanOrEqual(viewport().clientWidth + 1);
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

test('the workspace scene keeps a space-8 step between the tab strip and the form', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const list = pane.querySelector('[aria-label="Workspace sections"]');
  const label = screen.getByText('Project name').element();
  expect(list).not.toBeNull();

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const declared = readToken(pane, '--ult-space-8');
  const step = declared.endsWith('rem') ? parseFloat(declared) * rem : parseFloat(declared);

  const gap = label.getBoundingClientRect().top - list!.getBoundingClientRect().bottom;
  expect(gap).toBeCloseTo(step, 0);
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

test('below 840px the rail keeps the group header fully visible in a usable scroll region', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const viewport = editor.querySelector<HTMLElement>('[role="presentation"][tabindex]')!;
  const selector = screen.getByRole('group', { name: 'Theme groups' }).element();
  const headerRow = screen.getByRole('heading', { name: 'Color', level: 2 }).element().parentElement!;

  const view = viewport.getBoundingClientRect();
  const header = headerRow.getBoundingClientRect();
  expect(view.height).toBeGreaterThanOrEqual(96);
  expect(header.top).toBeGreaterThanOrEqual(view.top);
  expect(header.bottom).toBeLessThanOrEqual(view.bottom);
  expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);

  const thumb = editor.querySelector<HTMLElement>('[data-orientation="vertical"] > *');
  expect(thumb).not.toBeNull();
  const sel = selector.getBoundingClientRect();
  const bar = thumb!.getBoundingClientRect();
  expect(sel.bottom <= bar.top || sel.top >= bar.bottom).toBe(true);

  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
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

test('the shuffle bar carries shuffle, variation, undo, redo, and the state fingerprint', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();

  await expect.element(screen.getByRole('button', { name: 'Shuffle' })).toBeVisible();
  const variation = screen.getByRole('group', { name: 'Shuffle variation' });
  await expect.element(variation.getByRole('button', { name: 'Broad' })).toBeVisible();
  await expect.element(variation.getByRole('button', { name: 'Subtle' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Redo' })).toBeVisible();
  await expect.element(screen.getByText(/^seed [0-9a-f]{6}$/)).toBeVisible();

  expect(editor.contains(screen.getByRole('button', { name: 'Shuffle' }).element())).toBe(true);
  expect(editor.getBoundingClientRect().top).toBeLessThanOrEqual(
    screen.getByRole('button', { name: 'Shuffle' }).element().getBoundingClientRect().top,
  );
});

test('shuffle, locks, undo, redo, and reset theme walk one linear history', async () => {
  const screen = await mount('/theme-studio');
  const fingerprint = () =>
    screen.getByText(/^seed [0-9a-f]{6}$/).element().textContent?.replace('seed ', '') ?? '';
  const undoButton = () => screen.getByRole('button', { name: 'Undo' }).element();
  const redoButton = () => screen.getByRole('button', { name: 'Redo' }).element();

  const initial = fingerprint();
  expect(undoButton()).toHaveAttribute('data-disabled');
  expect(redoButton()).toHaveAttribute('data-disabled');

  await userEvent.click(screen.getByRole('button', { name: 'Lock Color' }));
  await userEvent.click(screen.getByRole('button', { name: 'Lock Density' }));
  const afterLocks = fingerprint();
  expect(afterLocks).not.toBe(initial);

  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const spaceBefore = readToken(pane, '--ult-space-1');
  await userEvent.click(screen.getByRole('button', { name: 'Shuffle' }));
  const shuffled = fingerprint();
  expect(shuffled).not.toBe(afterLocks);
  expect(readToken(pane, '--ult-space-1')).toBe(spaceBefore);

  await userEvent.click(undoButton());
  expect(fingerprint()).toBe(afterLocks);
  await userEvent.click(redoButton());
  expect(fingerprint()).toBe(shuffled);

  await userEvent.click(screen.getByRole('button', { name: 'Reset theme' }));
  const reset = fingerprint();
  expect(reset).not.toBe(shuffled);
  expect(screen.getByRole('button', { name: 'Lock Density' }).element()).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await userEvent.click(undoButton());
  expect(fingerprint()).toBe(shuffled);
  expect(screen.getByRole('button', { name: 'Lock Density' }).element()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await userEvent.click(redoButton());
  expect(fingerprint()).toBe(reset);
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

test('token override rows are linked by default and a committed edit writes both modes', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const stock = resolveDraft(stockDraft());

  expect(document.querySelector('[aria-label="--ult-color-accent"]')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const input = screen.getByRole('textbox', { name: '--ult-color-accent' });
  await expect.element(input).toBeVisible();
  expect(document.querySelector('[aria-label="--ult-color-accent dark"]')).toBeNull();

  await userEvent.clear(input.element());
  await userEvent.type(input.element(), '#ff0000');
  expect(readAccent(pane)).toBe('#ff0000');

  await userEvent.click(screen.getByRole('button', { name: 'Light' }).element());
  const lightPane = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(readAccent(lightPane)).toBe('#ff0000');
  expect(readAccent(lightPane)).not.toBe(stock.light['--ult-color-accent']);
});

test('unlinking splits modes per row, relinking writes dark to both, and reset clears both', async () => {
  const screen = await mount('/theme-studio');
  const stock = resolveDraft(stockDraft());

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const linked = screen.getByRole('textbox', { name: '--ult-color-accent' });
  await expect.element(linked).toBeVisible();
  await userEvent.clear(linked.element());
  await userEvent.type(linked.element(), '#ff0000');
  await expect.element(screen.getByText('Overridden · Linked')).toBeVisible();

  const link = screen.getByRole('button', { name: 'Link --ult-color-accent modes' });
  await userEvent.click(link.element());
  const dark = screen.getByRole('textbox', { name: '--ult-color-accent dark' });
  const light = screen.getByRole('textbox', { name: '--ult-color-accent light' });
  await expect.element(dark).toBeVisible();
  await expect.element(light).toBeVisible();
  expect(link.element()).toHaveAttribute('aria-pressed', 'false');
  await expect.element(screen.getByText('Overridden · Unlinked')).toBeVisible();

  await userEvent.clear(light.element());
  await userEvent.type(light.element(), '#00ff00');
  let pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(readAccent(pane)).toBe('#ff0000');
  await userEvent.click(screen.getByRole('button', { name: 'Light' }).element());
  pane = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(readAccent(pane)).toBe('#00ff00');

  await userEvent.click(screen.getByRole('button', { name: 'Link --ult-color-accent modes' }).element());
  expect(readAccent(pane)).toBe('#ff0000');
  await expect.element(screen.getByRole('textbox', { name: '--ult-color-accent' })).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Reset --ult-color-accent' }).element());
  expect(readAccent(pane)).toBe(stock.light['--ult-color-accent']);
  await userEvent.click(screen.getByRole('button', { name: 'Dark' }).element());
  expect(readAccent(screen.getByRole('region', { name: 'Dark preview' }).element())).toBe(
    stock.dark['--ult-color-accent'],
  );
});

test('the token contrast panel reports every pairing per mode at full precision', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('button', { name: 'Pairing results' }));

  const panel = screen.getByRole('region', { name: 'Token contrast' }).element();
  expect(panel.querySelectorAll('li').length).toBe(49);
  await expect.element(screen.getByText('All pairings pass')).toBeVisible();

  const pair = [...panel.querySelectorAll('li')].find((li) => li.textContent?.startsWith('text on surface ·'));
  expect(pair).toBeDefined();
  expect(pair!.textContent).toMatch(/min 4\.5:1/);
  expect(pair!.textContent).toMatch(/Dark \d+(\.\d+)?:1 pass/);
  expect(pair!.textContent).toMatch(/Light \d+(\.\d+)?:1 pass/);

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const surface = screen.getByRole('textbox', { name: '--ult-color-surface' });
  await expect.element(surface).toBeVisible();
  await userEvent.clear(surface.element());
  await userEvent.type(surface.element(), '#ffffff');
  const text = screen.getByRole('textbox', { name: '--ult-color-text' });
  await userEvent.clear(text.element());
  await userEvent.type(text.element(), '#000000');

  const updated = [...panel.querySelectorAll('li')].find((li) => li.textContent?.startsWith('text on surface ·'));
  expect(updated!.textContent).toContain('Dark 21:1 pass');
  expect(updated!.textContent).toContain('Light 21:1 pass');
});

test('a failing override applies marked, not blocked, and the row is flagged', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  await userEvent.click(screen.getByRole('button', { name: 'Pairing results' }));
  const panel = screen.getByRole('region', { name: 'Token contrast' }).element();

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const text = screen.getByRole('textbox', { name: '--ult-color-text' });
  await expect.element(text).toBeVisible();
  await userEvent.clear(text.element());
  await userEvent.type(text.element(), '#101011');

  expect(readToken(pane, '--ult-color-text')).toBe('#101011');
  await expect.element(screen.getByText(/pairings? failing/)).toBeVisible();

  const pair = [...panel.querySelectorAll('li')].find((li) => li.textContent?.startsWith('text on surface ·'));
  expect(pair!.textContent).toMatch(/Dark [\d.]+:1 fail/);
  expect(Number(pair!.textContent!.match(/Dark ([\d.]+):1/)?.[1])).toBeLessThan(4.5);
  expect(pair!.textContent).toMatch(/Light [\d.]+:1 pass/);
  expect(text.element()).toHaveAttribute('aria-invalid', 'true');
});

test('overrides pin resolved values through regeneration and group reset clears them', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const stock = resolveDraft(stockDraft());

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const accent = screen.getByRole('textbox', { name: '--ult-color-accent' });
  await expect.element(accent).toBeVisible();
  await userEvent.clear(accent.element());
  await userEvent.type(accent.element(), '#ff0000');
  expect(readAccent(pane)).toBe('#ff0000');

  const before = readToken(pane, '--ult-color-accent-hover');
  const hue = screen.getByRole('slider', { name: 'Accent hue' });
  hue.element().focus();
  await userEvent.keyboard('{End}');
  expect(readToken(pane, '--ult-color-accent-hover')).not.toBe(before);
  expect(readAccent(pane)).toBe('#ff0000');

  await userEvent.click(screen.getByRole('button', { name: 'Reset Color' }).element());
  expect(readAccent(pane)).toBe(stock.dark['--ult-color-accent']);
});

test('non-color rows commit on Enter, not mid-keystroke, and shape rows clamp to 96px', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const stock = resolveDraft(stockDraft());

  await userEvent.click(screen.getByRole('button', { name: 'Density token overrides' }));
  const space = screen.getByRole('textbox', { name: '--ult-space-1' });
  await expect.element(space).toBeVisible();
  await userEvent.clear(space.element());
  await userEvent.type(space.element(), '1rem');
  expect(readToken(pane, '--ult-space-1')).toBe(stock.dark['--ult-space-1']);
  await userEvent.keyboard('{Enter}');
  expect(readToken(pane, '--ult-space-1')).toBe('1rem');

  await userEvent.click(screen.getByRole('button', { name: 'Shape token overrides' }));
  const radius = screen.getByRole('textbox', { name: '--ult-radius-md' });
  await expect.element(radius).toBeVisible();
  await userEvent.clear(radius.element());
  await userEvent.type(radius.element(), '200');
  await userEvent.keyboard('{Enter}');
  expect(readToken(pane, '--ult-radius-md')).toBe('96px');
});

test('the studio passes axe in its default dark preview', async () => {
  const screen = await mount('/theme-studio');
  await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  await userEvent.click(screen.getByRole('button', { name: 'Pairing results' }));
  await expect.element(screen.getByRole('textbox', { name: '--ult-color-accent' })).toBeVisible();
  const results = await axe.run(document.body);
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
});

test('at 390px the document fits the viewport in every preview mode', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const screen = await mount('/theme-studio');
  await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
  const modes = screen.getByRole('group', { name: 'Preview color mode' });

  for (const mode of ['Dark', 'Light', 'Compare'] as const) {
    await userEvent.click(modes.getByRole('button', { name: mode }).element());
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  }

  const scenes = screen.getByRole('tablist', { name: 'Preview scenes' }).element();
  expect(scenes.getBoundingClientRect().right).toBeLessThanOrEqual(390);
  expect(modes.element().getBoundingClientRect().right).toBeLessThanOrEqual(390);
  const groups = screen.getByRole('group', { name: 'Theme groups' }).element();
  expect(groups.getBoundingClientRect().right).toBeLessThanOrEqual(390);

  const status = screen.getByRole('button', { name: 'Reset theme' }).element().parentElement!;
  const items = [...status.children].map((item) => item.getBoundingClientRect());
  expect(new Set(items.map((rect) => Math.round(rect.left))).size).toBe(1);
});
