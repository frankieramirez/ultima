import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { PAIRINGS, colorScheme, gate, presetDraft, resolveDraft } from '@ultima/tokens';
import * as ui from '@ultima/ui';
import axe from 'axe-core';
import { beforeEach, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import * as demoUi from '../demo-ui';
import SidebarCollapse from '../demos/sidebar/collapse';
import { routeTree } from '../router';
import { neutralDraft, renderSiteThemes, siteDraft } from '../site-theme-draft';
import committed from '../site-themes.ts?raw';
import { THEME_STORAGE_KEY, neutralTheme, siteTheme, type Scheme } from '../theme';
import { ThemeBoundary } from '../theme-boundary';
import '../styles.css';

const MODES = ['dark', 'light'] as const;
const site = resolveDraft(siteDraft());
const neutral = resolveDraft(neutralDraft());

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

function startInMode(mode: Scheme) {
  const classesOf = (scheme: Scheme) => stylex.props(siteTheme[scheme], colorScheme[scheme]).className?.split(/\s+/).filter(Boolean) ?? [];
  const classes = classesOf(mode);
  document.documentElement.classList.remove(...classesOf('dark'), ...classesOf('light'));
  document.documentElement.classList.add(...classes);
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  onTestFinished(() => {
    document.documentElement.classList.remove(...classes);
    localStorage.removeItem(THEME_STORAGE_KEY);
  });
}

function readToken(el: Element, token: string) {
  return getComputedStyle(el).getPropertyValue(token).trim();
}

/** StyleX compiles `#006644` to `#064`, so a short hex is widened back before comparing. */
function widen(value: string) {
  return /^#[0-9a-f]{3,4}$/i.test(value) ? `#${[...value.slice(1)].map((digit) => digit + digit).join('')}` : value;
}

const THEMED = /^--ult-(color|radius)-/;

function computedTokens(theme: (typeof siteTheme)[Scheme] | (typeof neutralTheme)[Scheme]) {
  const probe = document.createElement('div');
  probe.className = stylex.props(theme).className ?? '';
  document.body.append(probe);
  const table = Object.fromEntries(Object.keys(site.dark).filter((token) => THEMED.test(token)).map((token) => [token, widen(readToken(probe, token))]));
  probe.remove();
  return table;
}

function themedOf(table: Record<string, string>) {
  return Object.fromEntries(Object.entries(table).filter(([token]) => THEMED.test(token)));
}

function colorsOf(table: Record<string, string>) {
  return Object.fromEntries(Object.entries(table).filter(([token]) => token.startsWith('--ult-color-')));
}

function describe(violation: axe.Result) {
  return `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`;
}

beforeEach(() => {
  localStorage.clear();
});

test('site resolves Neutral with Ultima revision 1 mana and passes all 49 pairings in each mode', () => {
  const results = gate(site);
  expect(results).toHaveLength(49);
  expect(PAIRINGS).toHaveLength(49);
  for (const mode of MODES) {
    expect(results.filter((result) => !result[mode].pass).map((result) => `${result.foreground} on ${result.background}`)).toEqual([]);
  }
  expect([site.dark['--ult-color-highlight'], site.light['--ult-color-highlight']]).toEqual(['#44d4e1', '#00818b']);
  expect(colorsOf(site.light)['--ult-color-text']).toBe('#1b1b1b');
  const differs = Object.keys(colorsOf(site.dark)).filter((token) => MODES.some((mode) => site[mode][token] !== neutral[mode][token]));
  expect(differs.every((token) => /^--ult-color-(action|highlight)/.test(token))).toBe(true);
  expect(siteDraft().color.mana).toEqual(presetDraft({ id: 'ultima', revision: 1 }).color.mana);
});

test('the committed site and Neutral themes match the recipe, colors and Tight corners', () => {
  expect(committed).toBe(renderSiteThemes());
  for (const mode of MODES) {
    expect(computedTokens(siteTheme[mode])).toEqual(themedOf(site[mode]));
    expect(computedTokens(neutralTheme[mode])).toEqual(themedOf(neutral[mode]));
  }
  expect(['xs', 'sm', 'md', 'lg'].map((step) => neutral.dark[`--ult-radius-${step}`])).toEqual(['1px', '2px', '4px', '6px']);
});

test('every catalogue portal part mounts into the demo boundary', () => {
  const portalled = Object.entries(ui).filter(([, value]) => typeof value === 'object' && value !== null && 'Portal' in value).map(([name]) => name);
  expect(portalled.length).toBeGreaterThan(0);
  for (const name of portalled) {
    const wrapped = demoUi[name as keyof typeof demoUi] as { Portal: unknown };
    expect(wrapped.Portal, name).not.toBe((ui[name as keyof typeof ui] as { Portal: unknown }).Portal);
  }
  expect(demoUi.Sidebar.Panel).not.toBe(ui.Sidebar.Panel);
});

for (const mode of MODES) {
  test(`a Sidebar demo's mobile menu computes Neutral in ${mode}`, async () => {
    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 720));
    startInMode(mode);
    const screen = await render(
      <ThemeBoundary mode={mode}>
        <SidebarCollapse />
      </ThemeBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle the collapsing navigation' }));
    const dialog = screen.getByRole('dialog', { name: 'Collapsing navigation' });
    await expect.element(dialog).toBeVisible();
    expect(dialog.element().closest('[data-theme-boundary="neutral"]')).not.toBeNull();
    expect(readToken(dialog.element(), '--ult-color-highlight')).toBe(neutral[mode]['--ult-color-highlight']);
    expect(readToken(dialog.element(), '--ult-radius-lg')).toBe('6px');
    await userEvent.keyboard('{Escape}');
  });
}

test('a boundary given another preset resolves that preset instead of Neutral', async () => {
  const ultima = resolveDraft(presetDraft('ultima'));
  const screen = await render(
    <ThemeBoundary preset="ultima" mode="dark" data-testid="boundary">
      <span>inside</span>
    </ThemeBoundary>,
  );
  const boundary = screen.getByTestId('boundary').element();
  expect(boundary.getAttribute('data-theme-boundary')).toBe('ultima');
  expect(readToken(boundary, '--ult-color-accent')).toBe(ultima.dark['--ult-color-accent']);
  expect(readToken(boundary, '--ult-color-accent')).not.toBe(neutral.dark['--ult-color-accent']);
});

for (const mode of MODES) {
  test(`a Select popup in a ${mode} demo computes Neutral, under site chrome`, async () => {
    startInMode(mode);
    const screen = await mount('/components/select');
    expect(readToken(document.documentElement, '--ult-color-highlight')).toBe(site[mode]['--ult-color-highlight']);

    const trigger = screen.getByRole('combobox', { name: 'Crafting material' });
    await userEvent.click(trigger);
    const option = screen.getByRole('option', { name: 'Oak' });
    await expect.element(option).toBeVisible();
    const popup = option.element().closest('[data-side]')!;
    expect(popup.closest('[data-theme-boundary="neutral"]')).toBe(trigger.element().closest('[data-theme-boundary="neutral"]'));
    expect(readToken(popup, '--ult-color-highlight')).toBe(neutral[mode]['--ult-color-highlight']);
    expect(readToken(popup, '--ult-color-surface-raised')).toBe(neutral[mode]['--ult-color-surface-raised']);
    expect(getComputedStyle(popup).colorScheme).toBe(mode);
    await userEvent.keyboard('{Escape}');
  });

  test(`a Dialog popup in a ${mode} demo computes Neutral, and the page passes axe`, async () => {
    startInMode(mode);
    const screen = await mount('/components/dialog');
    await expect.element(screen.getByRole('heading', { name: 'Dialog', level: 1 })).toBeVisible();
    expect((await axe.run(document.body)).violations.map(describe)).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }).first());
    const dialog = screen.getByRole('dialog', { name: 'Archive report' });
    await expect.element(dialog).toBeVisible();
    expect(dialog.element().closest('[data-theme-boundary="neutral"]')).not.toBeNull();
    expect(readToken(dialog.element(), '--ult-color-action')).toBe(neutral[mode]['--ult-color-action']);
    expect(readToken(dialog.element(), '--ult-color-action')).not.toBe(site[mode]['--ult-color-action']);
    await userEvent.keyboard('{Escape}');
  });

  test(`the studio chrome computes site and its preview the draft in ${mode}, and passes axe`, async () => {
    startInMode(mode);
    const screen = await mount('/theme-studio');
    await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
    const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
    const header = document.querySelector('header')!;
    for (const chrome of [header, editor]) {
      expect(readToken(chrome, '--ult-color-highlight')).toBe(site[mode]['--ult-color-highlight']);
      expect(readToken(chrome, '--ult-color-surface')).toBe(site[mode]['--ult-color-surface']);
    }
    const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
    const draft = resolveDraft(presetDraft('neutral')).dark;
    expect(readToken(pane, '--ult-color-highlight')).toBe(draft['--ult-color-highlight']);
    expect(readToken(pane, '--ult-color-highlight')).not.toBe(site.dark['--ult-color-highlight']);

    expect((await axe.run(document.body)).violations.map(describe)).toEqual([]);
  });
}

test('in system mode the chrome follows the operating system', async () => {
  const screen = await mount('/components/select');
  await expect.element(screen.getByRole('heading', { name: 'Select', level: 1 })).toBeVisible();
  const scheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  expect(readToken(document.documentElement, '--ult-color-highlight')).toBe(site[scheme]['--ult-color-highlight']);
  const boundary = document.querySelector('[data-theme-boundary="neutral"]')!;
  expect(readToken(boundary, '--ult-color-highlight')).toBe(neutral[scheme]['--ult-color-highlight']);
});
