import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { describe, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { placeLabels } from '../anatomy';
import { hasAnatomyTab } from '../component-page';
import { components } from '../components';
import SidebarCollapse from '../demos/sidebar/collapse';
import { anatomyTabs } from '../generated/anatomy-tabs';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY } from '../theme';
import { ThemeBoundary } from '../theme-boundary';
// axe resolves a text contrast against the nearest painted ancestor, and the ground is on `body`.
import '../styles.css';

describe('placeLabels', () => {
  const size = { width: 30, height: 10 };
  const box = { x: 0, y: 0, width: 100, height: 40 };

  test('takes the first of the four spots that lies inside the preview and hits no label', () => {
    const preview = { width: 200, height: 200 };
    const lower = { x: 20, y: 50, width: 100, height: 40 };
    expect(placeLabels([{ box: lower, size }, { box: lower, size }, { box: lower, size }, { box: lower, size }], preview)).toEqual([
      { x: 20, y: 40, ...size },
      { x: 20, y: 50, ...size },
      { x: 90, y: 50, ...size },
      { x: 20, y: 90, ...size },
    ]);
  });

  test('stacks inside the box below the last label it collided with when no spot is free, the same way every time', () => {
    const targets = [{ box, size }, { box, size }, { box, size }, { box, size }];
    const preview = { width: 100, height: 40 };
    const placed = placeLabels(targets, preview);
    expect(placed).toEqual([
      { x: 0, y: 0, ...size },
      { x: 70, y: 0, ...size },
      { x: 0, y: 10, ...size },
      { x: 0, y: 20, ...size },
    ]);
    expect(placeLabels(targets, preview)).toEqual(placed);
  });
});

const modes = {
  dark: stylex.props(darkTheme, colorScheme.dark),
  light: stylex.props(lightTheme, colorScheme.light),
};
const themeClasses = (mode: keyof typeof modes) => modes[mode].className?.split(/\s+/).filter(Boolean) ?? [];

function seedDocumentTheme(mode: keyof typeof modes) {
  const root = document.documentElement;
  root.classList.remove(...themeClasses('dark'), ...themeClasses('light'));
  root.classList.add(...themeClasses(mode));
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  onTestFinished(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    root.classList.remove(...themeClasses(mode));
  });
}

async function openAnatomy(width: number, item: string) {
  await page.viewport(width, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const history = createMemoryHistory({ initialEntries: [`/components/${item}`] });
  const screen = await render(<RouterProvider router={createRouter({ routeTree, history })} />);
  await expect.element(screen.getByRole('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
  await userEvent.click(screen.getByRole('tab', { name: 'Anatomy' }));
  const legend = screen.getByRole('list', { name: 'Parts' });
  await expect.element(legend).toBeVisible();
  const panel = legend.element().closest('[role="tabpanel"]') as HTMLElement;
  return { screen, panel };
}

type Rect = { left: number; top: number; right: number; bottom: number };
const rectOf = (node: Element): Rect => node.getBoundingClientRect();
const intersects = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const within = (inner: Rect, outer: Rect) =>
  inner.left >= outer.left - 0.5 && inner.top >= outer.top - 0.5 && inner.right <= outer.right + 0.5 && inner.bottom <= outer.bottom + 0.5;

function partsIn(stage: Element, item: string) {
  const seen = new Map<string, boolean>();
  for (const node of stage.querySelectorAll<HTMLElement>(`[data-anatomy-item="${item}"]`)) {
    const rect = node.getBoundingClientRect();
    const part = node.dataset.anatomyPart as string;
    seen.set(part, seen.get(part) === true || (rect.width > 0 && rect.height > 0));
  }
  return seen;
}

async function settledLabels(panel: HTMLElement, visible: string[]) {
  await expect
    .poll(() =>
      [...panel.querySelectorAll<HTMLElement>('[data-anatomy-label]')]
        .filter((label) => getComputedStyle(label).visibility === 'visible')
        .map((label) => label.dataset.anatomyLabel)
        .sort(),
    )
    .toEqual([...visible].sort());
  return [...panel.querySelectorAll<HTMLElement>('[data-anatomy-label]')];
}

const tabbed = components.filter(hasAnatomyTab);

test('the tab reaches every compound page outside the overlays, and Dialog through its open anatomy demo', () => {
  expect(tabbed.length).toBeGreaterThan(30);
  expect(tabbed.some((entry) => entry.item === 'dialog')).toBe(true);
  expect(tabbed.filter((entry) => entry.group === 'overlays').map((entry) => entry.item)).toEqual(['dialog']);
});

for (const entry of tabbed) {
  for (const width of [1440, 390]) {
    for (const mode of ['dark', 'light'] as const) {
      test(`${entry.item} labels each visible part once, inside the preview and apart, at ${width}px in ${mode}`, async () => {
        seedDocumentTheme(mode);
        const { panel } = await openAnatomy(width, entry.item);
        const stage = panel.querySelector('[inert]') as HTMLElement;
        const overlay = panel.querySelector('[data-anatomy-overlay]') as HTMLElement;
        expect(overlay.getAttribute('aria-hidden')).toBe('true');

        await expect.poll(() => partsIn(stage, entry.item).size).toBeGreaterThan(0);
        const parts = partsIn(stage, entry.item);
        const visible = [...parts].filter(([, shown]) => shown).map(([part]) => part);
        const labels = await settledLabels(panel, visible);

        const outlines = [...panel.querySelectorAll<HTMLElement>('[data-anatomy-outline]')].map((node) => node.dataset.anatomyOutline);
        expect(outlines.sort()).toEqual([...visible].sort());
        const bounds = rectOf(overlay);
        for (const label of labels) expect(within(rectOf(label), bounds), `${label.dataset.anatomyLabel} lies inside the preview`).toBe(true);
        for (const [index, label] of labels.entries()) {
          for (const other of labels.slice(index + 1)) {
            expect(intersects(rectOf(label), rectOf(other)), `${label.dataset.anatomyLabel} and ${other.dataset.anatomyLabel}`).toBe(false);
          }
        }

        const legend = [...panel.querySelectorAll('ol[aria-label="Parts"] > li')].map((item) => item.childNodes[1]?.textContent);
        expect(legend).toEqual([...parts.keys()]);
        for (const part of parts.keys()) expect(anatomyTabs[entry.item]?.parts).toContain(part);

        const results = await axe.run(panel.closest('figure') as HTMLElement);
        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`)).toEqual([]);
      });
    }
  }
}

test("Dialog's tab draws its parts open, named by the part alone", async () => {
  const { panel } = await openAnatomy(1440, 'dialog');
  const parts = ['Backdrop', 'Viewport', 'Popup', 'Title', 'Description', 'Close'];
  const labels = await settledLabels(panel, parts);
  expect(labels.map((label) => label.textContent).sort()).toEqual([...parts].sort());
  expect([...panel.querySelectorAll('ol[aria-label="Parts"] > li')].map((item) => item.childNodes[1]?.textContent)).toEqual(parts);
  expect(document.activeElement?.closest('[inert]')).toBeNull();
});

test('below the wide breakpoint a label shows its number and the legend maps it to the part', async () => {
  const { panel } = await openAnatomy(390, 'dialog');
  const labels = await settledLabels(panel, ['Backdrop', 'Viewport', 'Popup', 'Title', 'Description', 'Close']);
  const legend = [...panel.querySelectorAll('ol[aria-label="Parts"] > li')];
  const numbers = new Map(legend.map((item) => [item.childNodes[1]?.textContent, item.firstChild?.textContent]));
  for (const label of labels) expect(label.textContent).toBe(numbers.get(label.dataset.anatomyLabel));
});

test('the switch hides the labels and keeps the outlines and the legend; focusing an entry emphasises its outline', async () => {
  const { screen, panel } = await openAnatomy(1440, 'dialog');
  await settledLabels(panel, ['Backdrop', 'Viewport', 'Popup', 'Title', 'Description', 'Close']);
  const outline = () => panel.querySelector<HTMLElement>('[data-anatomy-outline="Popup"]') as HTMLElement;
  const hairline = getComputedStyle(outline()).borderTopWidth;

  const popup = screen.getByRole('listitem').filter({ hasText: 'Popup' });
  popup.element().focus();
  await expect.poll(() => getComputedStyle(outline()).borderTopWidth).not.toBe(hairline);
  const raised = [...panel.querySelectorAll<HTMLElement>('[data-anatomy-label]')].at(-1);
  expect(raised?.dataset.anatomyLabel).toBe('Popup');

  const toggle = screen.getByRole('switch', { name: 'Label parts' });
  await expect.element(toggle).toBeChecked();
  await userEvent.click(toggle);
  expect(panel.querySelectorAll('[data-anatomy-label]')).toHaveLength(0);
  expect(panel.querySelectorAll('[data-anatomy-outline]')).toHaveLength(6);
  expect(panel.querySelectorAll('ol[aria-label="Parts"] > li')).toHaveLength(6);
});

test("Button's page has no Anatomy tab", async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const history = createMemoryHistory({ initialEntries: ['/components/button'] });
  const screen = await render(<RouterProvider router={createRouter({ routeTree, history })} />);
  await expect.element(screen.getByRole('tab', { name: 'Preview' }).first()).toBeVisible();
  expect(screen.getByRole('tab', { name: 'Anatomy' }).query()).toBeNull();
});

test('a demo keeps its Anatomy marks and still portals its popup into the Neutral boundary', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const history = createMemoryHistory({ initialEntries: ['/components/select'] });
  const screen = await render(<RouterProvider router={createRouter({ routeTree, history })} />);
  const trigger = screen.getByRole('combobox', { name: 'Crafting material' });
  expect(trigger.element().getAttribute('data-anatomy-part')).toBe('Trigger');
  await userEvent.click(trigger);
  const option = screen.getByRole('option', { name: 'Oak' });
  await expect.element(option).toBeVisible();
  const popup = option.element().closest('[data-anatomy-part="Popup"]') as HTMLElement;
  expect(popup.dataset.anatomyItem).toBe('select');
  expect(popup.closest('[data-theme-boundary="neutral"]')).toBe(trigger.element().closest('[data-theme-boundary="neutral"]'));
  expect(option.element().closest('[data-anatomy-part="Item"]')).not.toBeNull();
  await userEvent.keyboard('{Escape}');
});

test("a Sidebar demo's mobile menu keeps its Panel mark inside the Neutral boundary", async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await render(
    <ThemeBoundary>
      <SidebarCollapse />
    </ThemeBoundary>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Toggle the collapsing navigation' }));
  const dialog = screen.getByRole('dialog', { name: 'Collapsing navigation' });
  await expect.element(dialog).toBeVisible();
  const panel = dialog.element().querySelector('[data-anatomy-part="Panel"]');
  expect(panel?.getAttribute('data-anatomy-item')).toBe('sidebar');
  expect(dialog.element().closest('[data-theme-boundary="neutral"]')).not.toBeNull();
  await userEvent.keyboard('{Escape}');
});

test('the Anatomy stage applies Neutral, and the open dialog sits inside it', async () => {
  const { panel } = await openAnatomy(1440, 'dialog');
  await settledLabels(panel, ['Backdrop', 'Viewport', 'Popup', 'Title', 'Description', 'Close']);
  const stage = panel.querySelector('[inert]') as HTMLElement;
  const boundary = stage.querySelector('[data-theme-boundary="neutral"]');
  expect(boundary).not.toBeNull();
  expect(boundary?.contains(stage.querySelector('[data-anatomy-part="Popup"]'))).toBe(true);
  expect(panel.querySelector('[data-anatomy-overlay]')?.closest('[data-theme-boundary]')).toBeNull();
});

test('the stage gives back the room a stack took once a new width no longer needs it', async () => {
  const { panel } = await openAnatomy(1440, 'slider');
  const parts = ['Root', 'Label', 'Value', 'Control', 'Track', 'Indicator', 'Thumb'];
  const stage = panel.querySelector('[inert]') as HTMLElement;
  const height = () => Math.round(stage.getBoundingClientRect().height);
  const settled = async () => {
    await settledLabels(panel, parts);
    let last = -1;
    await expect.poll(() => (last === (last = height()) ? 'still' : 'moving'), { interval: 100 }).toBe('still');
    return height();
  };
  const wide = await settled();
  await page.viewport(390, 900);
  const narrow = await settled();
  expect(narrow).not.toBe(wide);
  await page.viewport(1440, 900);
  expect(await settled()).toBe(wide);
});
