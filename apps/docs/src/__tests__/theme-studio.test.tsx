import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, resolveDraft, stockDraft, presetDraft, AUTOSAVE_KEY, draftFingerprint, PAIRINGS, serializeDraft } from '@ultima/tokens';
import axe from 'axe-core';
import { beforeEach, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { scenario } from '../../../../scripts/verification/register.ts';
import { draftHistory } from '../../tests/fixtures/theme-studio-history';
import { MENU_LABEL } from '../site-menu';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY, siteTheme } from '../theme';
import { MONO_PRESETS, SANS_PRESETS } from '../theme-studio-draft';
import '../styles.css';

/** The Studio's pane-mode switch, apart from the site header's color-mode switch. */
function previewMode(screen: Awaited<ReturnType<typeof mount>>, name: 'Dark' | 'Light') {
  return screen.getByRole('group', { name: 'Preview color mode' }).getByRole('button', { name }).element();
}

async function selectHueFill(screen: Awaited<ReturnType<typeof mount>>) {
  await userEvent.click(screen.getByRole('group', { name: 'Accent fill' }).getByRole('button', { name: 'Hue', exact: true }));
}

async function mount(path: string, expandGroups = true) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const screen = await render(<RouterProvider router={createRouter({ routeTree, history })} />);
  if (expandGroups && window.innerWidth >= 840) for (const group of ['Typography', 'Density', 'Shape', 'Elevation', 'Motion']) await userEvent.click(screen.getByRole('button', { name: `Edit ${group}`, exact: true }));
  return screen;
}

beforeEach(() => {
  localStorage.clear();
});

test('the default collage shows several live compositions and complete themes are recoverable', async () => {
  const screen = await mount('/theme-studio', false);
  await userEvent.click(screen.getByRole('button', { name: 'Edit Density', exact: true }));
  const pane = screen.getByRole('region', { name: 'Dark preview' });
  await expect.element(screen.getByRole('tab', { name: 'All examples' })).toHaveAttribute('aria-selected', 'true');
  await expect.element(pane.getByRole('heading', { name: 'Create your workspace' })).toBeInTheDocument();
  await expect.element(pane.getByRole('table', { name: 'Recent projects' })).toBeInTheDocument();
  await expect.element(pane.getByText('Notifications', { exact: true })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('combobox', { name: 'Complete theme' }));
  await userEvent.click(screen.getByRole('option', { name: /Grove/ }));
  expect(readToken(pane.element(), '--ult-space-1')).toBe('0.15625rem');
  await userEvent.click(screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Compact' }));
  await expect.element(screen.getByRole('combobox', { name: 'Complete theme' })).toHaveTextContent('Grove · Edited');
  await userEvent.click(screen.getByRole('button', { name: 'Reset theme', exact: true }));
  expect(readToken(pane.element(), '--ult-space-1')).toBe('0.15625rem');
  await userEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));
  expect(readToken(pane.element(), '--ult-space-1')).toBe('0.09375rem');
});

test('the complete-theme popup paints above the preview tabs and pads its hint', async () => {
  const screen = await mount('/theme-studio', false);
  await userEvent.click(screen.getByRole('combobox', { name: 'Complete theme', exact: true }));
  const option = screen.getByRole('option', { name: /Neutral/ }).element();
  const popup = option.closest('[data-side]')!;
  await Promise.all(popup.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})));
  const box = popup.getBoundingClientRect();
  const tabs = screen.getByRole('tablist', { name: 'Preview scenes' }).element().getBoundingClientRect();
  const x = Math.max(box.left, tabs.left) + 4;
  const y = Math.max(box.top, tabs.top) + 4;
  expect(x).toBeLessThan(Math.min(box.right, tabs.right));
  expect(y).toBeLessThan(Math.min(box.bottom, tabs.bottom));
  expect(popup.contains(document.elementFromPoint(x, y))).toBe(true);
  const hint = screen.getByText('Applies a complete theme. Undo restores your draft.').element();
  expect(parseFloat(getComputedStyle(hint).paddingInlineStart)).toBeGreaterThanOrEqual(12);
  expect(hint.getBoundingClientRect().bottom).toBeLessThanOrEqual(box.bottom);
});

for (const width of [390, 1280]) {
  test(`slider endpoints and focus rings fit the editor at ${width}px`, async () => {
    await page.viewport(width, 844);
    onTestFinished(() => page.viewport(1280, 720));
    const screen = await mount('/theme-studio', false);
    if (width < 840) {
      await userEvent.click(screen.getByRole('button', { name: 'Edit theme', exact: true }));
      const drawer = screen.getByRole('dialog', { name: 'Edit theme' }).element();
      await Promise.all(drawer.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})));
    }
    const slider = screen.getByRole('slider', { name: 'Accent saturation' }).element();
    slider.focus();
    const viewport = slider.closest('[role="presentation"][tabindex]')!;
    for (const key of ['{Home}', '{End}']) {
      await userEvent.keyboard(key);
      const thumb = slider.parentElement!.getBoundingClientRect();
      const bounds = viewport.getBoundingClientRect();
      expect(thumb.left - 4).toBeGreaterThanOrEqual(bounds.left);
      expect(thumb.right + 4).toBeLessThanOrEqual(bounds.right);
    }
  });
}

test('the mobile gallery opens a focused editor drawer and Escape returns to Edit theme', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/theme-studio');
  const edit = screen.getByRole('button', { name: 'Edit theme', exact: true });
  await expect.element(edit).toBeVisible();
  await userEvent.click(edit);
  const drawer = screen.getByRole('dialog', { name: 'Edit theme' });
  await expect.element(drawer).toBeVisible();
  await userEvent.click(drawer.getByRole('group', { name: 'Theme groups' }).getByRole('button', { name: 'Density', exact: true }));
  await userEvent.click(drawer.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Roomy', exact: true }));
  await userEvent.keyboard('{Escape}');
  await expect.element(drawer).not.toBeInTheDocument();
  await expect.element(edit).toHaveFocus();
  expect(readToken(screen.getByRole('region', { name: 'Dark preview' }).element(), '--ult-space-1')).toBe('0.15625rem');
  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
});

test('the draft report names the working failure and focuses its editable token', async () => {
  const draft = presetDraft('neutral');
  draft.overrides.dark['--ult-color-text'] = '#ffffff';
  draft.overrides.dark['--ult-color-surface'] = '#ffffff';
  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(draft));
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('button', { name: /View draft report/ }));
  const report = screen.getByRole('dialog', { name: 'Draft report' });
  await expect.element(report.getByText('text on surface · min 4.5:1', { exact: true })).toBeVisible();
  await userEvent.click(report.getByRole('button', { name: 'Edit text', exact: true }).first());
  await expect.element(report.getByRole('textbox', { name: '--ult-color-text dark', exact: true })).toHaveFocus();
  await userEvent.fill(report.getByRole('textbox', { name: '--ult-color-text dark', exact: true }), '#101011');
  await userEvent.keyboard('{Enter}');
  expect(readToken(screen.getByRole('region', { name: 'Dark preview' }).element(), '--ult-color-text')).toBe('#101011');
  await expect.element(report.getByRole('region', { name: 'Repair token' })).toBeVisible();
  await expect.element(report.getByRole('textbox', { name: '--ult-color-text dark', exact: true })).toHaveValue('#101011');
  const pairing = report.getByText('text on surface · min 4.5:1', { exact: true }).element().closest('li')!;
  expect(pairing.textContent).toMatch(/Dark [\d.]+:1 pass/);
  expect(pairing.querySelector('button')).toBeNull();
  await userEvent.click(report.getByRole('button', { name: 'Close draft report', exact: true }));
  await expect.element(report).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /View draft report/ }));
  await expect.element(report.getByRole('region', { name: 'Repair token' })).not.toBeInTheDocument();
  await userEvent.click(report.getByRole('button', { name: 'Edit text', exact: true }).first());
  await expect.element(report.getByRole('region', { name: 'Repair token' })).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(report).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /View draft report/ }));
  await expect.element(report.getByRole('region', { name: 'Repair token' })).not.toBeInTheDocument();
});

function failingSubtle() {
  const draft = presetDraft('neutral');
  draft.overrides.dark['--ult-color-text-subtle'] = '#555555';
  draft.overrides.light['--ult-color-text-subtle'] = '#bbbbbb';
  return draft;
}

async function openReport(screen: Awaited<ReturnType<typeof mount>>) {
  await userEvent.click(screen.getByRole('button', { name: 'View draft report', exact: true }));
  const report = screen.getByRole('dialog', { name: 'Draft report' });
  await expect.element(report).toBeVisible();
  await Promise.all(report.element().getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})));
  return report;
}

function failure(report: ReturnType<Awaited<ReturnType<typeof mount>>['getByRole']>, name: string) {
  return report.getByRole('list', { name: 'Failing pairings' }).getByRole('listitem').filter({ hasText: name });
}

test('Use closest passing value turns the pairing green in both modes and is one Undo step', async () => {
  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(failingSubtle()));
  const screen = await mount('/theme-studio', false);
  const footer = checksFooter(screen);
  await expect.element(footer.getByText('90 of 98 pass', { exact: true })).toBeVisible();
  const hiddenFooter = footer.element();
  const count = () => hiddenFooter.querySelector('p')?.textContent;
  const marks = () => checkMarks(hiddenFooter).filter((mark) => mark.dataset.pairing === '--ult-color-text-subtle on --ult-color-surface');
  expect(marks().map((mark) => mark.dataset.pass)).toEqual(['false', 'false']);

  const report = await openReport(screen);
  const item = failure(report, 'text-subtle on surface · min 4.5:1');
  await expect.element(item.getByText('Sets text-subtle to #8e8e8e in dark and #696969 in light.', { exact: true })).toBeVisible();
  await expect.element(item.getByRole('button', { name: 'Reset to derived', exact: true })).toBeVisible();
  await userEvent.click(item.getByRole('button', { name: 'Use closest passing value', exact: true }));

  await expect.poll(count).toBe('98 of 98 pass');
  expect(marks().map((mark) => mark.dataset.pass)).toEqual(['true', 'true']);
  await expect.element(report.getByText('All pairings pass', { exact: true })).toBeVisible();
  await expect.element(report.getByRole('heading', { name: 'Token contrast', exact: true })).toHaveFocus();
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(readToken(pane, '--ult-color-text-subtle')).toBe('#8e8e8e');

  await userEvent.keyboard('{Escape}');
  await expect.element(report).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'View draft report', exact: true })).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));
  await expect.element(footer.getByText('90 of 98 pass', { exact: true })).toBeVisible();
  expect(readToken(pane, '--ult-color-text-subtle')).toBe('#555555');
  await expect.element(screen.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('a derived target fixes only its failing mode and offers no reset', async () => {
  const draft = presetDraft('neutral');
  draft.color.ruin = { hue: 270, saturation: 1.5 };
  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(draft));
  const screen = await mount('/theme-studio', false);
  const hiddenFooter = checksFooter(screen).element();
  const report = await openReport(screen);
  const item = failure(report, 'danger-contrast on danger · min 4.5:1');
  await expect.element(item).toBeVisible();
  expect(item.getByRole('button', { name: 'Reset to derived' }).query()).toBeNull();
  await expect.element(item.getByText('Sets danger-contrast to #fefefe in light.', { exact: true })).toBeVisible();
  await userEvent.click(item.getByRole('button', { name: 'Use closest passing value', exact: true }));
  await expect.poll(() => hiddenFooter.querySelector('p')?.textContent).toBe('98 of 98 pass');
  const stored = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!);
  expect(stored.overrides.dark['--ult-color-danger-contrast']).toBeUndefined();
  expect(stored.overrides.light['--ult-color-danger-contrast']).toBe('#fefefe');
});

test('Reset to derived clears the target in both modes, and an unreachable fix is disabled with its reason', async () => {
  const draft = failingSubtle();
  draft.overrides.dark['--ult-color-text'] = '#3a3a3a';
  draft.overrides.dark['--ult-color-surface-hover'] = '#7c7c7c';
  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(draft));
  const screen = await mount('/theme-studio', false);
  const report = await openReport(screen);

  const stuck = failure(report, 'text on surface-hover · min 4.5:1');
  const fix = stuck.getByRole('button', { name: 'Use closest passing value', exact: true });
  await expect.element(fix).toHaveAttribute('aria-disabled', 'true');
  await expect.element(fix).toHaveAccessibleDescription('No lightness at this hue passes every pairing for text.');

  await userEvent.click(failure(report, 'text-subtle on surface · min 4.5:1').getByRole('button', { name: 'Reset to derived', exact: true }));
  await expect.poll(() => document.activeElement?.closest('[aria-label="Failing pairings"]') !== null && document.activeElement?.hasAttribute('data-fix')).toBe(true);
  const stored = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!);
  expect(stored.overrides.dark['--ult-color-text-subtle']).toBeUndefined();
  expect(stored.overrides.light['--ult-color-text-subtle']).toBeUndefined();
  expect(report.getByRole('list', { name: 'Failing pairings' }).getByText(/^text-subtle on surface ·/).query()).toBeNull();
});

for (const mode of ['dark', 'light'] as const) {
  test(`the open draft report passes axe in the ${mode} site mode and returns focus to its trigger`, async () => {
    prefer(mode);
    const draft = failingSubtle();
    draft.overrides.dark['--ult-color-text'] = '#3a3a3a';
    draft.overrides.dark['--ult-color-surface-hover'] = '#7c7c7c';
    localStorage.setItem(AUTOSAVE_KEY, serializeDraft(draft));
    const screen = await mount('/theme-studio', false);
    const report = await openReport(screen);
    await expect.element(report.getByRole('button', { name: 'Use closest passing value' }).first()).toBeVisible();
    const results = await axe.run(report.element());
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
    await userEvent.click(report.getByRole('button', { name: 'Close draft report', exact: true }));
    await expect.element(report).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'View draft report', exact: true })).toHaveFocus();
  });
}

test('the gallery-bar count names the draft report it opens and takes focus back', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/theme-studio', false);
  const trigger = screen.getByRole('button', { name: '98 of 98 pass. View draft report', exact: true });
  await userEvent.click(trigger);
  const report = screen.getByRole('dialog', { name: 'Draft report' });
  await expect.element(report).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(report).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
});

test('a palette source is separate from the generated role colors and exact overrides', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' });
  await selectHueFill(screen);
  const source = screen.getByRole('textbox', { name: 'Accent hex', exact: true });
  await userEvent.fill(source, '#224466');
  await userEvent.keyboard('{Enter}');
  expect(readAccent(pane.element())).toBe('#9e9e9e');
  await userEvent.click(screen.getByRole('button', { name: 'Generate Accent palette', exact: true }));
  expect(readAccent(pane.element())).toBe('#7da2c9');
  expect(source.element()).toHaveValue('#224466');
  await userEvent.click(screen.getByRole('button', { name: 'Set exact Accent colors', exact: true }));
  await expect.element(screen.getByRole('textbox', { name: '--ult-color-accent', exact: true })).toHaveFocus();
});

const siteModes = {
  dark: stylex.props(siteTheme.dark, colorScheme.dark),
  light: stylex.props(siteTheme.light, colorScheme.light),
};

const themeClasses = (mode: keyof typeof siteModes) => siteModes[mode].className?.split(/\s+/).filter(Boolean) ?? [];

function prefer(mode: keyof typeof siteModes) {
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

function siteValue(mode: keyof typeof siteModes, token: '--ult-color-accent' | '--ult-color-surface') {
  const probe = document.createElement('div');
  probe.className = siteModes[mode].className ?? '';
  document.body.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(token).trim();
  probe.remove();
  return value;
}

test('the studio route joins the site shell with the rail collapsed and no footer', async () => {
  const screen = await mount('/theme-studio');

  const site = screen.getByRole('navigation', { name: 'Site', exact: true });
  await expect.element(site.getByRole('link', { name: 'Tokens' })).toBeVisible();
  expect(document.querySelectorAll('[aria-label="Ultima home"]').length).toBe(1);

  const menu = screen.container.querySelector(`nav[aria-label="${MENU_LABEL}"]`);
  expect(menu).not.toBeNull();
  expect(menu).toHaveAttribute('data-closed');

  await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Theme Studio' }).element()).toBe(
    screen.container.querySelector('h1'),
  );
  expect(screen.container.textContent).not.toContain('Untitled theme');
  await expect.element(screen.getByText('Saved on this device')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Import' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Export/ })).toBeVisible();

  expect(screen.container.querySelector('footer')).toBeNull();
  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
});

for (const mode of ['dark', 'light'] as const) {
  test(`the shared header and workbench follow the ${mode} preference`, async () => {
    prefer(mode);
    const screen = await mount('/theme-studio');

    const header = screen.container.querySelector('header')!;
    expect(readSurface(header)).toBe(siteValue(mode, '--ult-color-surface'));

    const subBar = screen.getByRole('heading', { name: 'Theme Studio' }).element().parentElement!;
    expect(readSurface(subBar)).toBe(siteValue(mode, '--ult-color-surface'));
  });
}

test('changing the site mode updates studio chrome while keeping the draft preview independent', async () => {
  prefer('dark');
  const screen = await mount('/theme-studio', false);
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const preview = screen.getByRole('region', { name: 'Dark preview' }).element();
  const draftSurface = readSurface(preview);
  for (const mode of ['light', 'dark'] as const) {
    await userEvent.click(screen.getByRole('group', { name: 'Color mode', exact: true }).getByRole('button', { name: mode === 'light' ? 'Light' : 'Dark', exact: true }));
    expect(readSurface(editor)).toBe(siteValue(mode, '--ult-color-surface'));
    expect(getComputedStyle(editor).colorScheme).toBe(mode);
    expect(readSurface(preview)).toBe(draftSurface);
    expect(getComputedStyle(preview).colorScheme).toBe('dark');
  }
});

test('elevation changes painted gallery shadows in both modes and undo restores them', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('group', { name: 'Preview color mode' }).getByRole('button', { name: 'Compare', exact: true }));
  const shadows = () => ['Dark', 'Light'].map((mode) => {
    const pane = screen.getByRole('region', { name: `${mode} preview` }).element();
    const card = pane.querySelector('[data-gallery-example="Create your workspace"]')!;
    return getComputedStyle(card).boxShadow;
  });
  const elevation = screen.getByRole('group', { name: 'Elevation strength' });
  await userEvent.click(elevation.getByRole('button', { name: 'Flat', exact: true }));
  expect(shadows()).toEqual(['none', 'none']);
  await userEvent.click(elevation.getByRole('button', { name: 'Subtle', exact: true }));
  const subtle = shadows();
  expect(subtle.every((value) => value !== 'none')).toBe(true);
  await userEvent.click(elevation.getByRole('button', { name: 'Pronounced', exact: true }));
  expect(shadows()[0]).not.toBe(subtle[0]);
  expect(shadows()[1]).not.toBe(subtle[1]);
  await userEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));
  expect(shadows()).toEqual(subtle);
});

test('the named font choices load real faces and reach both preview modes', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('group', { name: 'Preview color mode' }).getByRole('button', { name: 'Compare', exact: true }));
  for (const [label, presets, token] of [
    ['Sans family', SANS_PRESETS, '--ult-font-sans'],
    ['Mono family', MONO_PRESETS, '--ult-font-mono'],
  ] as const) {
    for (const preset of presets.filter((item) => !['System', 'Serif', 'Humanist'].includes(item.label))) {
      await userEvent.click(screen.getByRole('combobox', { name: label, exact: true }));
      await userEvent.click(screen.getByRole('option', { name: preset.label, exact: true }));
      for (const mode of ['Dark', 'Light']) {
        expect(readToken(screen.getByRole('region', { name: `${mode} preview` }).element(), token)).toBe(preset.value);
      }
      const family = preset.value.split(',')[0]!;
      for (const weight of [400, 500, 600]) {
        const faces = await document.fonts.load(`${weight} 16px ${family}`, 'Release 29');
        expect(faces.length, `${preset.label} ${weight} loads a self-hosted face`).toBeGreaterThan(0);
        expect(faces.every((face) => face.status === 'loaded')).toBe(true);
      }
    }
  }
});

for (const width of [390, 1280]) {
  test(`the roomy calendar keeps all seven columns inside its gallery card at ${width}px`, async () => {
    await page.viewport(width, 844);
    onTestFinished(() => page.viewport(1280, 720));
    const draft = presetDraft('neutral');
    draft.density = 1.25;
    draft.typography.baseSizePx = 18;
    localStorage.setItem(AUTOSAVE_KEY, serializeDraft(draft));
    const screen = await mount('/theme-studio', false);
    const card = screen.container.querySelector('[data-gallery-example="Plan your next release"]')!;
    const calendar = card.querySelector('[data-part="root"]')!;
    const grid = card.querySelector('table')!;
    const bounds = calendar.getBoundingClientRect();
    expect(grid.querySelectorAll('th').length).toBe(7);
    for (const cell of grid.querySelectorAll('th, td, button')) {
      const box = cell.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(bounds.left);
      expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
    }
    const date = card.querySelector<HTMLButtonElement>('[data-part="table-cell-trigger"]:not([data-outside-range])')!;
    await userEvent.click(date);
    expect(date).toHaveAttribute('data-selected');
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
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

test('the rail sits beside the preview, with persistent draft status below both', async () => {
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

  await expect.element(screen.getByRole('button', { name: /View draft report/ })).toBeVisible();
  await expect.element(screen.getByText(/Editing both modes/)).toBeVisible();
  await expect.element(screen.getByText(/^Editing both modes ·/)).toBeVisible();
  await expect.element(screen.getByText(/locked group/)).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Reset theme' })).toBeVisible();
  expect(editor.contains(screen.getByRole('button', { name: 'Reset theme' }).element())).toBe(false);
});

test('the editor rail runs picker, Shuffle, history, then the six groups, each header ordering lock, shuffle and reset', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' });
  const sequence = [
    editor.getByRole('combobox', { name: 'Complete theme' }),
    editor.getByRole('button', { name: 'Shuffle', exact: true }),
    editor.getByRole('button', { name: 'Undo', exact: true }),
    editor.getByRole('button', { name: 'Redo', exact: true }),
    ...['Color', 'Typography', 'Density', 'Shape', 'Elevation', 'Motion'].map((group) => editor.getByRole('heading', { name: group, level: 2 })),
  ].map((locator) => locator.element());
  for (let index = 1; index < sequence.length; index += 1) {
    expect(sequence[index - 1]!.compareDocumentPosition(sequence[index]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  for (const group of ['Color', 'Typography', 'Density', 'Shape', 'Elevation', 'Motion']) {
    const header = editor.getByRole('heading', { name: group, level: 2 }).element().closest('header')!;
    const names = [...header.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'));
    expect(names.slice(0, 3)).toEqual([`Lock ${group}`, `Shuffle ${group}`, `Reset ${group}`]);
    expect(header.querySelector('p')?.textContent).toBeTruthy();
  }
  const accent = editor.getByRole('group', { name: 'Accent fill' }).element();
  const exact = editor.getByRole('button', { name: /^Set exact .* colors$/ }).element();
  const color = editor.getByRole('heading', { name: 'Color', level: 2 }).element().closest('section')!;
  expect(color.contains(accent)).toBe(true);
  expect(color.contains(exact)).toBe(true);
});

test('the editor rail scrolls its groups without a visible scrollbar and never overflows horizontally', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();

  const viewport = () => editor.querySelector<HTMLElement>('[role="presentation"][tabindex]')!;
  expect(viewport()).not.toBeNull();
  await expect.poll(() => viewport().scrollHeight).toBeGreaterThan(viewport().clientHeight);
  expect(editor.querySelector('[data-orientation="vertical"]')).toBeNull();
  expect(getComputedStyle(viewport()).scrollbarWidth).toBe('none');
  expect(viewport().scrollWidth).toBeLessThanOrEqual(viewport().clientWidth + 1);

  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  await userEvent.click(screen.getByRole('button', { name: 'Edit theme', exact: true }));
  const mobileEditor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const mobileViewport = mobileEditor.querySelector<HTMLElement>('[role="presentation"][tabindex]')!;
  expect(mobileViewport.scrollWidth).toBeLessThanOrEqual(mobileViewport.clientWidth + 1);
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

  const tables = resolveDraft(presetDraft('neutral'));
  expect(readAccent(dark)).toBe(tables.dark['--ult-color-accent']);
  expect(readAccent(light)).toBe(tables.light['--ult-color-accent']);
  expect(dark.querySelectorAll('[data-gallery-example]').length).toBe(10);
  expect(light.querySelectorAll('[data-gallery-example]').length).toBe(10);
});

const SCENES = ['All examples', 'Workspace', 'Typography', 'Controls', 'Surfaces', 'Overlays', 'States', 'Motion'] as const;

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

  await expect.element(screen.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
  expect(pane.querySelector('input')).not.toBeNull();

  const tables = resolveDraft(presetDraft('neutral'));
  expect(readAccent(pane)).toBe(tables.dark['--ult-color-accent']);
});

test('gallery and focused scene tabs show one scene at a time in each pane', async () => {
  const screen = await mount('/theme-studio');
  const tabs = screen.getByRole('tablist', { name: 'Preview scenes' });

  for (const scene of SCENES) {
    await expect.element(tabs.getByRole('tab', { name: scene })).toBeVisible();
  }

  await expect.element(screen.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
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
  const tables = resolveDraft(presetDraft('neutral'));
  expect(readAccent(dark)).toBe(tables.dark['--ult-color-accent']);
  expect(readAccent(light)).toBe(tables.light['--ult-color-accent']);
});

function canvasParts(pane: Element) {
  const canvas = pane.querySelector<HTMLElement>('[data-preview-canvas]')!;
  const sheet = canvas.querySelector<HTMLElement>('[data-preview-scene]')!;
  return { canvas, sheet, scene: sheet.firstElementChild as HTMLElement };
}

test('a short focused scene centres inside its independently scrollable canvas', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'Motion' }));
  const { sheet, scene } = canvasParts(screen.getByRole('region', { name: 'Dark preview' }).element());
  const box = sheet.getBoundingClientRect();
  const body = scene.getBoundingClientRect();
  expect(body.top - box.top).toBeGreaterThan(40);
  expect(Math.abs(body.top - box.top - (box.bottom - body.bottom))).toBeLessThanOrEqual(2);
});

test('the collage scrolls independently while its controls and footer stay reachable', async () => {
  const screen = await mount('/theme-studio');
  const { sheet } = canvasParts(screen.getByRole('region', { name: 'Dark preview' }).element());
  const footer = screen.getByRole('button', { name: /View draft report/ }).element().getBoundingClientRect();
  expect(sheet.scrollHeight).toBeGreaterThan(sheet.clientHeight);
  sheet.scrollTop = sheet.scrollHeight;
  await expect.poll(() => sheet.scrollTop).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /View draft report/ }).element().getBoundingClientRect().top).toBe(footer.top);
  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
});

test('compare shows the same gallery in both modes with aligned canvas bounds', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('button', { name: 'Compare', exact: true }));
  const dark = canvasParts(screen.getByRole('region', { name: 'Dark preview' }).element());
  const light = canvasParts(screen.getByRole('region', { name: 'Light preview' }).element());
  expect(dark.sheet.getBoundingClientRect().top).toBe(light.sheet.getBoundingClientRect().top);
  expect(dark.sheet.getBoundingClientRect().bottom).toBe(light.sheet.getBoundingClientRect().bottom);
  expect([...dark.scene.querySelectorAll('[data-gallery-example]')].map((el) => el.getAttribute('data-gallery-example'))).toEqual([...light.scene.querySelectorAll('[data-gallery-example]')].map((el) => el.getAttribute('data-gallery-example')));
  expect(readSurface(dark.scene)).not.toBe(readSurface(light.scene));
});

test('the focused workspace remains an interactive application example', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'Workspace', exact: true }));
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(pane.querySelector('[data-preview-scene="workspace"]')).not.toBeNull();
  expect(pane.querySelector('[data-preview-specimen]')).toBeNull();
  await expect.element(screen.getByRole('heading', { name: 'Forma' })).toBeVisible();
  await expect.element(screen.getByRole('tab', { name: 'Members' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Project name' })).toBeVisible();
  expect(pane.querySelector('table')).not.toBeNull();
});

test('the workspace scene keeps a space-8 step between the tab strip and the form', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'Workspace', exact: true }));
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
  await userEvent.click(screen.getByRole('tab', { name: 'Workspace', exact: true }));
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const target = pane.querySelector<HTMLElement>('[data-tokens*="--ult-color-surface-raised"]');
  const readout = screen.getByRole('status', { name: 'Token readout' });

  expect(target).not.toBeNull();
  await userEvent.hover(target!);
  await expect.element(readout).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Inspect tokens' }).element());
  expect(screen.getByRole('button', { name: 'Inspect tokens' }).element()).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await userEvent.hover(target!);
  await expect.element(readout.getByText('--ult-color-surface-raised')).toBeVisible();
  const darkRaised = getComputedStyle(target!).getPropertyValue('--ult-color-surface-raised').trim();
  expect(readout.element().textContent).toContain(darkRaised);
  expect(pane.contains(readout.element())).toBe(true);
  await expect.poll(() => readout.element().getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
  await expect.poll(() => readout.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);

  await userEvent.click(previewMode(screen, 'Light'));
  const lightPane = screen.getByRole('region', { name: 'Light preview' }).element();
  const lightTarget = lightPane.querySelector<HTMLElement>('[data-tokens*="--ult-color-surface-raised"]');
  expect(lightTarget).not.toBeNull();
  await userEvent.hover(lightTarget!);
  const lightRaised = getComputedStyle(lightTarget!).getPropertyValue('--ult-color-surface-raised').trim();
  expect(lightRaised).not.toBe(darkRaised);
  await expect
    .element(screen.getByRole('status', { name: 'Token readout' }).getByText('--ult-color-surface-raised'))
    .toBeVisible();
  expect(screen.getByRole('status', { name: 'Token readout' }).element().textContent).toContain(lightRaised);
});

test('hovering a gallery example names it and lists each token it reads, swatching colors in that pane\'s mode', async () => {
  const screen = await mount('/theme-studio', false);
  await userEvent.click(previewMode(screen, 'Light'));
  await userEvent.click(screen.getByRole('button', { name: 'Inspect tokens', exact: true }));
  const pane = screen.getByRole('region', { name: 'Light preview' }).element();
  const example = pane.querySelector<HTMLElement>('[data-gallery-example="Create your workspace"]')!;
  await userEvent.hover(example.querySelector('h3, p') ?? example);
  const readout = screen.getByRole('status', { name: 'Token readout' });
  await expect.element(readout.getByText('Create your workspace', { exact: true })).toBeVisible();
  const names = example.dataset.tokens!.split(',');
  await expect.element(readout.getByText(`${names.length} tokens`, { exact: true })).toBeVisible();
  const light = resolveDraft(presetDraft('neutral')).light;
  for (const name of names) {
    const row = readout.element().querySelector<HTMLElement>(`[data-token="${name}"]`)!;
    expect(row.textContent).toContain(getComputedStyle(example).getPropertyValue(name).trim());
    const swatch = row.querySelector<HTMLElement>('[aria-hidden]');
    if (name.startsWith('--ult-color-')) expect(getComputedStyle(swatch!).backgroundColor).toBe(paintedColor(light[name]!));
    else expect(swatch).toBeNull();
  }
});

test('inspect targets take keyboard focus and drive the readout on focus and blur', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'Workspace', exact: true }));
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const readout = screen.getByRole('status', { name: 'Token readout' });

  expect(pane.querySelector('button[aria-label^="Inspect --ult-"]')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Inspect tokens' }).element());
  const target = pane.querySelector<HTMLElement>('[data-tokens*="--ult-color-surface-raised"]');
  const inspect = screen.getByRole('button', { name: /Inspect --ult-color-surface-raised/ });
  await expect.element(inspect).toBeVisible();

  inspect.element().focus();
  await expect.element(readout.getByText('--ult-color-surface-raised')).toBeVisible();
  const darkRaised = getComputedStyle(target!).getPropertyValue('--ult-color-surface-raised').trim();
  expect(readout.element().textContent).toContain(darkRaised);

  inspect.element().blur();
  await expect.element(readout).not.toBeInTheDocument();
});

test('a tapped gallery inspector opens an anchored card and Escape dismisses it', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/theme-studio', false);
  await userEvent.click(screen.getByRole('button', { name: 'Inspect tokens', exact: true }));
  const trigger = screen.getByRole('button', { name: 'Inspect Create your workspace tokens', exact: true });
  await userEvent.click(trigger);
  const readout = screen.getByRole('status', { name: 'Token readout' });
  await expect.element(readout.getByText('--ult-shadow-md')).toBeVisible();
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(pane.contains(readout.element())).toBe(true);
  const box = readout.element().getBoundingClientRect();
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(window.innerWidth);
  expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
  await userEvent.keyboard('{Escape}');
  await expect.element(readout).not.toBeInTheDocument();
});

test('inspect targets keep pane order across the compare panes', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'Workspace', exact: true }));
  await userEvent.click(screen.getByRole('button', { name: 'Inspect tokens' }).element());
  await userEvent.click(screen.getByRole('button', { name: 'Compare' }).element());
  const dark = screen.getByRole('region', { name: 'Dark preview' }).element();
  const light = screen.getByRole('region', { name: 'Light preview' }).element();

  const darkTargets = dark.querySelectorAll('button[aria-label^="Inspect "]');
  const lightTargets = light.querySelectorAll('button[aria-label^="Inspect "]');
  expect(darkTargets.length).toBeGreaterThan(0);
  expect(lightTargets.length).toBeGreaterThan(0);
  for (const target of darkTargets) {
    for (const other of lightTargets) {
      expect(target.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  }

  const last = darkTargets[darkTargets.length - 1] as HTMLElement;
  last.focus();
  await userEvent.keyboard('{Tab}');
  expect(dark.contains(document.activeElement)).toBe(true);
  expect(document.activeElement).toHaveAttribute('aria-label', 'Inspected tokens');
  await userEvent.keyboard('{Tab}');
  expect(light.contains(document.activeElement)).toBe(true);
});

test('the inspect target shows the dashed outline on keyboard focus', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'Workspace', exact: true }));
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  await userEvent.click(screen.getByRole('button', { name: 'Inspect tokens' }).element());

  const inspect = pane.querySelector<HTMLButtonElement>('button[aria-label^="Inspect --ult-"]')!;
  inspect.focus();
  await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}');
  const focused = document.activeElement as HTMLElement;
  expect(focused.getAttribute('aria-label')).toMatch(/^Inspect --ult-/);
  expect(getComputedStyle(focused).outlineStyle).toBe('dashed');
});

test('the studio passes axe with inspect targets shown', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('tab', { name: 'Workspace', exact: true }));
  await userEvent.click(screen.getByRole('button', { name: 'Inspect tokens' }).element());
  await expect.element(screen.getByRole('button', { name: /Inspect --ult-color-surface-raised/ })).toBeVisible();
  const results = await axe.run(document.body);
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
});

test('editor chrome keeps the stock site mode when the preview is light', async () => {
  prefer('dark');
  const screen = await mount('/theme-studio');
  await userEvent.click(previewMode(screen, 'Light'));

  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const pane = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(readSurface(editor)).toBe(siteValue('dark', '--ult-color-surface'));
  expect(readSurface(pane)).not.toBe(siteValue('dark', '--ult-color-surface'));
  expect(readAccent(pane)).toBe(resolveDraft(presetDraft('neutral')).light['--ult-color-accent']);
});

test('the mobile editor keeps its header, selected group and footer inside the viewport', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('button', { name: 'Edit theme', exact: true }));
  const drawer = screen.getByRole('dialog', { name: 'Edit theme' });
  const editor = drawer.getByRole('complementary', { name: 'Theme editor' }).element();
  const viewport = editor.querySelector<HTMLElement>('[role="presentation"][tabindex]')!;
  expect(viewport.getBoundingClientRect().height).toBeGreaterThanOrEqual(96);
  expect(getComputedStyle(drawer.getByRole('group', { name: 'Theme groups' }).element()).flexDirection).toBe('row');
  await expect.element(drawer.getByRole('heading', { name: 'Color', level: 2 })).toBeVisible();
  for (const control of [drawer.getByRole('button', { name: 'Close editor' }), drawer.getByRole('button', { name: 'Reset theme' })]) {
    const box = control.element().getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
  await Promise.all(drawer.element().getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})));
  const results = await axe.run(document.body);
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test('the mobile drawer offers the six groups as chips, one shown at a time, with the checks count', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/theme-studio');
  await expect.element(screen.getByRole('button', { name: '98 of 98 pass. View draft report', exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Edit theme', exact: true }));
  const drawer = screen.getByRole('dialog', { name: 'Edit theme' });
  const chips = drawer.getByRole('group', { name: 'Theme groups' });
  const items = [...chips.element().querySelectorAll<HTMLElement>('button')];
  expect(items.map((item) => item.textContent)).toEqual(['Color', 'Typography', 'Density', 'Shape', 'Elevation', 'Motion']);
  const bounds = drawer.element().getBoundingClientRect();
  for (const item of items) {
    expect(getComputedStyle(item).borderTopLeftRadius).not.toBe('0px');
    expect(item.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
  }
  await userEvent.click(chips.getByRole('button', { name: 'Shape', exact: true }));
  await expect.element(drawer.getByRole('heading', { name: 'Shape', level: 2 })).toBeVisible();
  expect(drawer.getByRole('heading', { name: 'Color', level: 2 }).query()).toBeNull();
  await expect.element(drawer.getByRole('region', { name: 'Token checks' }).getByText('98 of 98 pass', { exact: true })).toBeVisible();
});

for (const width of [1280, 390] as const) for (const mode of ['dark', 'light'] as const) {
  test(`the studio with its checks footer passes axe in the ${mode} site mode at ${width}px`, async () => {
    prefer(mode);
    await page.viewport(width, width === 390 ? 844 : 720);
    onTestFinished(() => page.viewport(1280, 720));
    const screen = await mount('/theme-studio', false);
    await expect.element(screen.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
    if (width === 390) {
      await userEvent.click(screen.getByRole('button', { name: 'Edit theme', exact: true }));
      const drawer = screen.getByRole('dialog', { name: 'Edit theme' }).element();
      await Promise.all(drawer.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})));
    }
    await expect.element(checksFooter(screen)).toBeVisible();
    const results = await axe.run(document.body);
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
  });
}

test('guided controls write contracted draft parameters and the preview follows', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const stock = resolveDraft(presetDraft('neutral'));

  expect(readToken(pane, '--ult-space-1')).toBe(stock.dark['--ult-space-1']);
  await userEvent.click(
    screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Compact' }),
  );
  expect(readToken(pane, '--ult-space-1')).toBe('0.09375rem');

  await selectHueFill(screen);
  const saturation = screen.getByRole('slider', { name: 'Accent saturation' });
  saturation.element().focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(readAccent(pane)).not.toBe(stock.dark['--ult-color-accent']);

  await userEvent.click(
    screen.getByRole('group', { name: 'Shape preset' }).getByRole('button', { name: 'Sharp' }),
  );
  expect(readToken(pane, '--ult-radius-xs')).toBe('0px');

  await userEvent.click(
    screen.getByRole('group', { name: 'Elevation strength' }).getByRole('button', { name: 'Flat' }),
  );
  expect(readToken(pane, '--ult-shadow-sm')).toBe('none');

  await userEvent.click(
    screen.getByRole('group', { name: 'Motion speed' }).getByRole('button', { name: 'Brisk' }),
  );
  expect(readToken(pane, '--ult-motion-fast')).toBe('70ms');

  await userEvent.click(
    screen.getByRole('group', { name: 'Type scale' }).getByRole('button', { name: '1.25' }),
  );
  const size = screen.getByRole('slider', { name: 'Base size' });
  size.element().focus();
  await userEvent.keyboard('{Home}');
  expect(readToken(pane, '--ult-text-5')).toBe('0.875rem');
});

test('group lock and reset live on the draft', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();

  await userEvent.click(
    screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Roomy' }),
  );
  expect(readToken(pane, '--ult-space-1')).not.toBe('0.125rem');

  await userEvent.click(screen.getByRole('button', { name: 'Lock Density' }));
  expect(screen.getByRole('button', { name: 'Lock Density' }).element()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.element(screen.getByText(/1 locked group/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Reset Density' }));
  expect(readToken(pane, '--ult-space-1')).toBe('0.125rem');
  expect(
    screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Cosy' }).element(),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('Accent fill switches the accent roles between Ink and the Accent hue, and the focus ring stays on Accent', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const ink = resolveDraft(presetDraft('neutral'));
  const hue = resolveDraft({ ...presetDraft('neutral'), accentFill: 'hue' });
  const fill = screen.getByRole('group', { name: 'Accent fill' });
  await expect.element(fill.getByRole('button', { name: 'Ink', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(readAccent(pane)).toBe('#e8e8e8');
  await userEvent.click(fill.getByRole('button', { name: 'Hue', exact: true }));
  expect(readAccent(pane)).toBe(hue.dark['--ult-color-accent']);
  expect(readToken(pane, '--ult-color-border-focus')).toBe(ink.dark['--ult-color-border-focus']);
  await userEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));
  expect(readAccent(pane)).toBe('#e8e8e8');
});

test('the Shape control lists four presets on a version-3 draft and three on a version-2 draft', async () => {
  const shapes = (screen: Awaited<ReturnType<typeof mount>>) =>
    [...screen.getByRole('group', { name: 'Shape preset' }).element().querySelectorAll('button')].map((button) => button.textContent);
  const fresh = await mount('/theme-studio');
  expect(shapes(fresh)).toEqual(['Sharp', 'Default', 'Soft', 'Round']);
  await fresh.unmount();

  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(presetDraft({ id: 'grove', revision: 1 })));
  const saved = await mount('/theme-studio');
  await expect.element(saved.getByRole('combobox', { name: 'Complete theme' })).toHaveTextContent('Grove');
  expect(shapes(saved)).toEqual(['Sharp', 'Default', 'Round']);
  for (const button of saved.getByRole('group', { name: 'Accent fill' }).element().querySelectorAll('button')) {
    expect(button).toHaveAttribute('data-disabled');
  }
});

test('selecting a preset moves a version-2 draft to revision 2 in one entry and Undo restores it exactly', async () => {
  const saved = presetDraft({ id: 'neutral', revision: 1 });
  saved.overrides.dark['--ult-color-text'] = '#f0f0f0';
  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(saved));
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const fingerprint = screen.getByText(/^seed [0-9a-f]{6}$/);
  await expect.element(fingerprint).toHaveTextContent(`seed ${draftFingerprint(saved)}`);
  expect(readAccent(pane)).toBe('#9e9e9e');
  await userEvent.click(screen.getByRole('button', { name: 'Reset theme', exact: true }));
  expect(readAccent(pane)).toBe('#9e9e9e');
  expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(serializeDraft(presetDraft({ id: 'neutral', revision: 1 })));
  await userEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));

  await userEvent.click(screen.getByRole('combobox', { name: 'Complete theme' }));
  await userEvent.click(screen.getByRole('option', { name: /Neutral/ }));
  expect(readAccent(pane)).toBe('#e8e8e8');
  await expect.element(fingerprint).toHaveTextContent(`seed ${draftFingerprint(presetDraft('neutral'))}`);
  expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(serializeDraft(presetDraft('neutral')));
  await userEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));
  await expect.element(fingerprint).toHaveTextContent(`seed ${draftFingerprint(saved)}`);
  expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(serializeDraft(saved));
  expect(screen.getByRole('button', { name: 'Undo', exact: true }).element()).toHaveAttribute('data-disabled');
});

test('the shuffle bar carries shuffle, variation, undo, redo, and the state fingerprint', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();

  await expect.element(screen.getByRole('button', { name: 'Shuffle' })).toBeVisible();
  const variation = screen.getByRole('combobox', { name: 'Shuffle variation' });
  await expect.element(variation).toHaveTextContent('Broad');
  await userEvent.click(variation);
  await expect.element(screen.getByText('Small changes to your current theme.')).toBeVisible();
  await userEvent.click(screen.getByRole('option', { name: /^Subtle/ }));
  await expect.element(variation).toHaveTextContent('Subtle');
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
    screen
      .getByText(/^seed [0-9a-f]{6}$/)
      .element()
      .textContent?.replace('seed ', '') ?? '';
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

test(
  'reset theme clears an edit, an override and a lock, and one undo restores all three',
  scenario('theme-studio.draft-history', 'docs-vitest', async () => {
    const { densityGroup, stockDensity, editedDensity, stockSpace1, overrideToken, overrideValue } = draftHistory;
    const screen = await mount('/theme-studio');
    const pane = () => screen.getByRole('region', { name: 'Dark preview' }).element();
    const density = (name: string) =>
      screen.getByRole('group', { name: `${densityGroup} preset` }).getByRole('button', { name });
    const lock = () => screen.getByRole('button', { name: `Lock ${densityGroup}` }).element();
    const stockAccent = resolveDraft(presetDraft('neutral')).dark[overrideToken];

    await userEvent.click(density(editedDensity));
    const editedSpace = readToken(pane(), '--ult-space-1');
    expect(editedSpace).not.toBe(stockSpace1);

    await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
    const accent = screen.getByRole('textbox', { name: overrideToken });
    await expect.element(accent).toBeVisible();
    await userEvent.clear(accent.element());
    await userEvent.type(accent.element(), overrideValue);
    expect(readToken(pane(), overrideToken)).toBe(overrideValue);

    await userEvent.click(lock());
    expect(lock()).toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByText(/1 locked group/)).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Reset theme' }));
    expect(density(stockDensity).element()).toHaveAttribute('aria-pressed', 'true');
    expect(lock()).toHaveAttribute('aria-pressed', 'false');
    expect(readToken(pane(), '--ult-space-1')).toBe(stockSpace1);
    expect(readToken(pane(), overrideToken)).toBe(stockAccent);

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(density(editedDensity).element()).toHaveAttribute('aria-pressed', 'true');
    expect(lock()).toHaveAttribute('aria-pressed', 'true');
    expect(readToken(pane(), '--ult-space-1')).toBe(editedSpace);
    expect(readToken(pane(), overrideToken)).toBe(overrideValue);
  }),
);

test('the editor rail keeps a pre-mounted status region that announces a shuffle result', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const status = () => document.querySelector('[role="status"][aria-label="Draft status"]')!;

  expect(status()).not.toBeNull();
  expect(status()).toHaveAttribute('aria-atomic', 'true');
  expect(status().textContent).toBe('');

  await userEvent.click(screen.getByRole('button', { name: 'Shuffle' }));
  await expect.poll(() => status().textContent).toMatch(/^\d+ overrides · \d+ locked groups?$/);
});

test('a shuffle against locked targets announces why nothing changed', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const status = () => document.querySelector('[role="status"][aria-label="Draft status"]')!;

  for (const group of ['Color', 'Typography', 'Density', 'Shape', 'Elevation', 'Motion']) {
    await userEvent.click(screen.getByRole('button', { name: `Lock ${group}` }));
  }
  await userEvent.click(screen.getByRole('button', { name: 'Shuffle' }));
  await expect.poll(() => status().textContent).toBe('All groups are locked');

  for (const group of ['Typography', 'Density', 'Shape', 'Elevation', 'Motion']) {
    await userEvent.click(screen.getByRole('button', { name: `Lock ${group}` }));
  }
  await userEvent.click(screen.getByRole('button', { name: 'Shuffle Color' }));
  await expect.poll(() => status().textContent).toBe('Color is locked');
});

test('shuffle exhaustion announces the attempt limit', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  const status = () => document.querySelector('[role="status"][aria-label="Draft status"]')!;

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  for (const name of ['--ult-color-surface', '--ult-color-text']) {
    const field = screen.getByRole('textbox', { name });
    await expect.element(field).toBeVisible();
    await userEvent.clear(field.element());
    await userEvent.type(field.element(), '#ffffff');
  }

  await userEvent.click(screen.getByRole('button', { name: 'Shuffle' }));
  await expect.poll(() => status().textContent).toBe('No passing palette in 50 attempts');
  await expect.element(screen.getByText(/Failing pairings/)).toBeVisible();
});

test('every editor control is a catalogue component, including Color Field seeds', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();

  expect(editor.querySelector('select')).toBeNull();
  expect(editor.querySelector('input[type="color"]')).toBeNull();
  for (const role of ['Neutral', 'Accent', 'Action', 'Success', 'Warning', 'Danger']) {
    await userEvent.click(
      screen
        .getByRole('group', { name: 'Color roles' })
        .getByRole('button', { name: role, exact: true })
        .element(),
    );
    await expect.element(screen.getByRole('button', { name: `${role} seed` })).toBeVisible();
    await expect.element(screen.getByRole('slider', { name: `${role} hue` })).toBeVisible();
    await expect.element(screen.getByRole('slider', { name: `${role} saturation` })).toBeVisible();
  }
  await expect.element(screen.getByRole('combobox', { name: 'Sans family' })).toBeVisible();
  await expect.element(screen.getByRole('combobox', { name: 'Mono family' })).toBeVisible();
});

test('the hue and saturation sliders are named by an aria-hidden mono header with no tab stop', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  await expect.element(screen.getByRole('slider', { name: 'Accent hue' })).toBeVisible();
  const headers = [...editor.querySelectorAll<HTMLElement>('[data-seed-header]')];

  expect(headers.map((header) => header.firstElementChild?.textContent)).toEqual(['HUE', 'SAT']);
  for (const header of headers) {
    expect(header).toHaveAttribute('aria-hidden', 'true');
    expect(header.querySelector('a, button, input, [tabindex]')).toBeNull();
    expect(getComputedStyle(header).fontFamily).not.toBe(getComputedStyle(editor).fontFamily);
  }
});

test('token override rows are linked by default and a committed edit writes both modes', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const stock = resolveDraft(presetDraft('neutral'));

  expect(document.querySelector('[aria-label="--ult-color-accent"]')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const input = screen.getByRole('textbox', { name: '--ult-color-accent' });
  await expect.element(input).toBeVisible();
  expect(document.querySelector('[aria-label="--ult-color-accent dark"]')).toBeNull();

  await userEvent.clear(input.element());
  await userEvent.type(input.element(), '#ff0000');
  expect(readAccent(pane)).toBe('#ff0000');

  await userEvent.click(previewMode(screen, 'Light'));
  const lightPane = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(readAccent(lightPane)).toBe('#ff0000');
  expect(readAccent(lightPane)).not.toBe(stock.light['--ult-color-accent']);
});

test('unlinking splits modes per row, relinking writes dark to both, and reset clears both', async () => {
  const screen = await mount('/theme-studio');
  const stock = resolveDraft(presetDraft('neutral'));

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
  await userEvent.click(previewMode(screen, 'Light'));
  pane = screen.getByRole('region', { name: 'Light preview' }).element();
  expect(readAccent(pane)).toBe('#00ff00');

  await userEvent.click(screen.getByRole('button', { name: 'Link --ult-color-accent modes' }).element());
  expect(readAccent(pane)).toBe('#ff0000');
  await expect.element(screen.getByRole('textbox', { name: '--ult-color-accent' })).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Reset --ult-color-accent' }).element());
  expect(readAccent(pane)).toBe(stock.light['--ult-color-accent']);
  await userEvent.click(previewMode(screen, 'Dark'));
  expect(readAccent(screen.getByRole('region', { name: 'Dark preview' }).element())).toBe(
    stock.dark['--ult-color-accent'],
  );
});

function checksFooter(screen: Awaited<ReturnType<typeof mount>>) {
  return screen.getByRole('region', { name: 'Token checks', exact: true });
}

function checkMarks(footer: Element) {
  return [...footer.querySelectorAll<HTMLElement>('[data-check-mark]')];
}

test('the checks footer counts every manifest pairing in both modes, dark marks first, in an inert strip', async () => {
  const screen = await mount('/theme-studio');
  const footer = checksFooter(screen);
  const total = PAIRINGS.length * 2;
  expect(total).toBe(98);
  await expect.element(footer.getByText(`${total} of ${total} pass`, { exact: true })).toBeVisible();

  const strip = footer.element().querySelector('[data-checks-strip]')!;
  expect(strip).toHaveAttribute('aria-hidden', 'true');
  expect(strip.querySelectorAll('button, a, input, select, textarea, [tabindex]').length).toBe(0);
  const marks = checkMarks(footer.element());
  expect(marks.length).toBe(total);
  expect(marks.map((mark) => mark.dataset.mode)).toEqual([...PAIRINGS.map(() => 'dark'), ...PAIRINGS.map(() => 'light')]);
  expect(marks.map((mark) => mark.dataset.pairing)).toEqual([...PAIRINGS, ...PAIRINGS].map((pair) => `${pair.foreground} on ${pair.background}`));
  expect(marks.every((mark) => mark.dataset.pass === 'true')).toBe(true);

  await expect.element(screen.getByRole('button', { name: 'View draft report', exact: true })).toBeVisible();
});

test('a failing override applies marked, turns its marks to danger and changes the count', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const footer = checksFooter(screen).element();

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const text = screen.getByRole('textbox', { name: '--ult-color-text' });
  await expect.element(text).toBeVisible();
  await userEvent.clear(text.element());
  await userEvent.type(text.element(), '#101011');

  expect(readToken(pane, '--ult-color-text')).toBe('#101011');
  expect(text.element()).toHaveAttribute('aria-invalid', 'true');
  const marks = checkMarks(footer);
  const textOnSurface = marks.find((mark) => mark.dataset.mode === 'dark' && mark.dataset.pairing === '--ult-color-text on --ult-color-surface')!;
  expect(textOnSurface.dataset.pass).toBe('false');
  expect(getComputedStyle(textOnSurface).backgroundColor).toBe(paintedColor(readToken(footer, '--ult-color-danger')));
  const lightTextOnSurface = marks.find((mark) => mark.dataset.mode === 'light' && mark.dataset.pairing === '--ult-color-text on --ult-color-surface')!;
  expect(lightTextOnSurface.dataset.pass).toBe('true');
  expect(getComputedStyle(lightTextOnSurface).backgroundColor).toBe(paintedColor(readToken(footer, '--ult-color-success')));
  const failing = marks.filter((mark) => mark.dataset.pass === 'false').length;
  expect(failing).toBeGreaterThan(0);
  await expect.element(checksFooter(screen).getByText(`${98 - failing} of 98 pass`, { exact: true })).toBeVisible();
});

test('the draft report lists every pairing per mode at full precision', async () => {
  const screen = await mount('/theme-studio');
  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const surface = screen.getByRole('textbox', { name: '--ult-color-surface' });
  await expect.element(surface).toBeVisible();
  await userEvent.clear(surface.element());
  await userEvent.type(surface.element(), '#ffffff');
  const text = screen.getByRole('textbox', { name: '--ult-color-text' });
  await userEvent.clear(text.element());
  await userEvent.type(text.element(), '#000000');

  await userEvent.click(screen.getByRole('button', { name: 'View draft report', exact: true }));
  const report = screen.getByRole('dialog', { name: 'Draft report' });
  const panel = report.getByRole('region', { name: 'Token contrast' }).element();
  expect(panel.querySelectorAll('li').length).toBe(49);
  const pair = [...panel.querySelectorAll('li')].find((li) => li.textContent?.startsWith('text on surface ·'));
  expect(pair!.textContent).toMatch(/min 4\.5:1/);
  expect(pair!.textContent).toContain('Dark 21:1 pass');
  expect(pair!.textContent).toContain('Light 21:1 pass');
});

test('the editor rail holds no inline validation panel', async () => {
  const screen = await mount('/theme-studio');
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  expect(editor.querySelector('[aria-label="Token contrast"]')).toBeNull();
  expect(editor.contains(checksFooter(screen).element())).toBe(false);
});

test('overrides pin resolved values through regeneration and group reset clears them', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const stock = resolveDraft(presetDraft('neutral'));
  await selectHueFill(screen);

  await userEvent.click(screen.getByRole('button', { name: 'Color token overrides' }));
  const accent = screen.getByRole('textbox', { name: '--ult-color-accent' });
  await expect.element(accent).toBeVisible();
  await userEvent.clear(accent.element());
  await userEvent.type(accent.element(), '#ff0000');
  expect(readAccent(pane)).toBe('#ff0000');

  const before = readToken(pane, '--ult-color-accent-hover');
  const saturation = screen.getByRole('slider', { name: 'Accent saturation' });
  saturation.element().focus();
  await userEvent.keyboard('{End}');
  expect(readToken(pane, '--ult-color-accent-hover')).not.toBe(before);
  expect(readAccent(pane)).toBe('#ff0000');

  await userEvent.click(screen.getByRole('button', { name: 'Reset Color' }).element());
  expect(readAccent(pane)).toBe(stock.dark['--ult-color-accent']);
});

test('non-color rows commit on Enter, not mid-keystroke, and shape rows clamp to 96px', async () => {
  const screen = await mount('/theme-studio');
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  const stock = resolveDraft(presetDraft('neutral'));

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
    for (const pane of document.querySelectorAll<HTMLElement>('[aria-label="Dark preview"], [aria-label="Light preview"]')) {
      const box = pane.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
      expect(box.bottom).toBeLessThanOrEqual(844);
      expect(pane.querySelector('[data-gallery-example]')?.getBoundingClientRect().left).toBeLessThan(390);
    }
  }

  const scenes = screen.getByRole('tablist', { name: 'Preview scenes' }).element();
  expect(scenes.getBoundingClientRect().right).toBeLessThanOrEqual(390);
  expect(modes.element().getBoundingClientRect().right).toBeLessThanOrEqual(390);
  await userEvent.click(screen.getByRole('button', { name: 'Edit theme', exact: true }));
  const groups = screen.getByRole('group', { name: 'Theme groups' }).element();
  expect(groups.getBoundingClientRect().right).toBeLessThanOrEqual(390);

  const status = screen.getByRole('button', { name: 'Reset theme' }).element().parentElement!;
  const items = [...status.children].map((item) => item.getBoundingClientRect());
  expect(items.every((rect) => rect.right <= 390)).toBe(true);
});
