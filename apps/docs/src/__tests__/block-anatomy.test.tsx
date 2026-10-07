import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import axe from 'axe-core';
import { describe, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { recipeRoots } from '../block-anatomy';
import { PREVIEW_SIZES, type PreviewSize } from '../block-frame';
import { blocks, type BlockEntry, type BuiltFrom } from '../generated/blocks';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY } from '../theme';
// axe resolves a text contrast against the nearest painted ancestor, and the ground is on `body`.
import '../styles.css';

type Rect = { left: number; top: number; right: number; bottom: number };
const rectOf = (node: Element): Rect => node.getBoundingClientRect();
const intersects = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const within = (inner: Rect, outer: Rect) =>
  inner.left >= outer.left - 0.5 && inner.top >= outer.top - 0.5 && inner.right <= outer.right + 0.5 && inner.bottom <= outer.bottom + 0.5;

const HAIRLINE_SLACK = 1.5;

const keyOf = (entry: BuiltFrom) => `${entry.kind}-${entry.id}`;
const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

async function openAnatomy(block: BlockEntry, size: PreviewSize = 'desktop', mode?: 'dark' | 'light') {
  if (mode) {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
  }
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const history = createMemoryHistory({ initialEntries: [`/blocks/${block.id}`] });
  const screen = await render(<RouterProvider router={createRouter({ routeTree, history })} />);
  await expect.element(screen.getByRole('heading', { level: 1, name: block.title })).toBeVisible();
  await userEvent.click(screen.getByRole('tab', { name: 'Anatomy' }));
  if (size === 'narrow') await userEvent.click(screen.getByRole('button', { name: 'Narrow' }));
  const legend = screen.getByRole('list', { name: 'Built from' });
  await expect.element(legend).toBeVisible();
  const panel = legend.element().closest('[role="tabpanel"]') as HTMLElement;
  const frame = panel.querySelector('iframe') as HTMLIFrameElement;
  await expect.poll(() => frame.contentDocument?.querySelector('[data-anatomy-item]'), { timeout: 15_000 }).toBeTruthy();
  await frame.contentDocument?.fonts.ready;
  return { screen, panel, frame };
}

function expectedOutlines(block: BlockEntry, frame: HTMLIFrameElement): Map<string, Rect> {
  const doc = frame.contentDocument as Document;
  const { clientWidth, clientHeight } = doc.documentElement;
  const origin = frame.getBoundingClientRect();
  const scale = origin.width / Number(frame.width);
  const outlines = new Map<string, Rect>();
  for (const entry of block.builtFrom) {
    const instances = entry.kind === 'recipe' ? recipeRoots(entry.root, doc) : [...doc.querySelectorAll(`[data-anatomy-item="${entry.id}"]`)];
    for (const element of instances) {
      const rect = element.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const top = Math.max(0, rect.top);
      const right = Math.min(clientWidth, rect.right);
      const bottom = Math.min(clientHeight, rect.bottom);
      if (right <= left || bottom <= top) continue;
      outlines.set(keyOf(entry), {
        left: origin.left + left * scale,
        top: origin.top + top * scale,
        right: origin.left + right * scale,
        bottom: origin.top + bottom * scale,
      });
      break;
    }
  }
  return outlines;
}

function drawnOutlines(panel: HTMLElement) {
  const round = ({ left, top, right, bottom }: Rect) => [left, top, right, bottom].map((value) => Math.round(value * 10) / 10);
  return Object.fromEntries(
    [...panel.querySelectorAll<HTMLElement>('[data-anatomy-outline]')].map((node) => [node.dataset.anatomyOutline, round(rectOf(node))]),
  );
}

async function outlinesSettle(block: BlockEntry, panel: HTMLElement, frame: HTMLIFrameElement) {
  const matches = () => {
    const expected = expectedOutlines(block, frame);
    const drawn = drawnOutlines(panel);
    if (Object.keys(drawn).length !== expected.size) return false;
    return [...expected].every(([key, rect]) => {
      const at = [rect.left, rect.top, rect.right, rect.bottom];
      return drawn[key]?.every((value: number, index: number) => Math.abs(value - (at[index] as number)) <= HAIRLINE_SLACK);
    });
  };
  await expect.poll(matches, { timeout: 10_000 }).toBe(true).catch(() => {
    throw new Error(`drawn ${JSON.stringify(drawnOutlines(panel))} expected ${JSON.stringify([...expectedOutlines(block, frame)].map(([k, r]) => [k, [r.left, r.top, r.right, r.bottom].map(Math.round)]))} client ${frame.contentDocument?.documentElement.clientWidth}x${frame.contentDocument?.documentElement.clientHeight}`);
  });
  return expectedOutlines(block, frame);
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

async function checkCell(block: BlockEntry, panel: HTMLElement, frame: HTMLIFrameElement, cell: string) {
  expect(frame.inert, `${cell}: the framed block is inert behind the scrim`).toBe(true);
  const visible = [...(await outlinesSettle(block, panel, frame)).keys()];
  const overlay = panel.querySelector('[data-anatomy-overlay]') as HTMLElement;
  expect(overlay.getAttribute('aria-hidden')).toBe('true');
  expect(visible.length).toBeGreaterThan(0);
  const labels = await settledLabels(panel, visible);
  expect(labels).toHaveLength(visible.length);
  const bounds = rectOf(overlay);
  for (const label of labels) expect(within(rectOf(label), bounds), `${cell}: ${label.dataset.anatomyLabel} lies inside the preview`).toBe(true);
  for (const [index, label] of labels.entries()) {
    for (const other of labels.slice(index + 1)) {
      expect(intersects(rectOf(label), rectOf(other)), `${cell}: ${label.dataset.anatomyLabel} and ${other.dataset.anatomyLabel}`).toBe(false);
    }
  }
  const wide = rectOf(overlay).right - rectOf(overlay).left >= 768;
  for (const label of labels) {
    const entry = block.builtFrom.find((candidate) => keyOf(candidate) === label.dataset.anatomyLabel) as BuiltFrom;
    expect(label.textContent).toBe(wide ? `${entry.title} ${entry.number}` : entry.number);
  }

  const rows = [...panel.querySelectorAll('ol[aria-label="Built from"] > li')];
  expect(rows.map((row) => row.firstChild?.textContent)).toEqual(block.builtFrom.map(({ number }) => number));
  for (const [index, entry] of block.builtFrom.entries()) {
    const row = rows[index] as Element;
    const link = row.querySelector('a');
    const href = entry.kind === 'component' ? `/components/${entry.id}` : `/components/${entry.page}#${entry.section}`;
    expect(link?.getAttribute('href'), entry.title).toBe(href);
    expect(text(link)).toBe(entry.kind === 'component' ? entry.title : `${entry.title} recipe`);
    expect(text(row).endsWith('not shown in this preview'), `${cell}: ${entry.title} is marked not shown only when it is`).toBe(!visible.includes(keyOf(entry)));
  }

  // A mode change transitions the page's colors in; axe reads the settled ones.
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  const results = await axe.run(panel.closest('figure') as HTMLElement, { rules: { 'target-size': { enabled: true } } });
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`)).toEqual([]);
}

const CELLS = [
  ['desktop', 'dark'],
  ['narrow', 'dark'],
  ['narrow', 'light'],
  ['desktop', 'light'],
] as const;

for (const block of blocks) {
  test(`${block.title} outlines and labels each visible entry once, apart and inside, at both preview widths in both modes`, async () => {
    const { screen, panel, frame } = await openAnatomy(block, 'desktop', 'dark');
    for (const [size, mode] of CELLS) {
      await userEvent.click(screen.getByRole('button', { name: size === 'desktop' ? 'Desktop' : 'Narrow', exact: true }));
      const control = screen.getByRole('group', { name: 'Color mode' }).elements().find((group) => group.getClientRects().length > 0);
      const option = [...(control?.querySelectorAll('button') ?? [])].find((button) => text(button) === (mode === 'dark' ? 'Dark' : 'Light'));
      await userEvent.click(option as HTMLElement);
      await expect.poll(() => [frame.width, frame.height]).toEqual([String(PREVIEW_SIZES[size].width), String(PREVIEW_SIZES[size].height)]);
      await expect.poll(() => getComputedStyle(document.documentElement).colorScheme).toBe(mode);
      await checkCell(block, panel, frame, `${size} in ${mode}`);
    }
  });
}

test('Dashboard 01 outlines the Chart recipe on the figure named "Revenue"', async () => {
  const block = blocks.find(({ id }) => id === 'dashboard-01') as BlockEntry;
  const { panel, frame } = await openAnatomy(block);
  await outlinesSettle(block, panel, frame);
  const doc = frame.contentDocument as Document;
  const figures = [...doc.querySelectorAll('figure')].filter((figure) => text(doc.getElementById(figure.getAttribute('aria-labelledby') ?? '')) === 'Revenue');
  expect(figures).toHaveLength(1);
  const figure = figures[0]!.getBoundingClientRect();
  const origin = frame.getBoundingClientRect();
  const scale = origin.width / Number(frame.width);
  const outline = rectOf(panel.querySelector('[data-anatomy-outline="recipe-chart"]') as HTMLElement);
  expect(outline.left).toBeCloseTo(origin.left + figure.left * scale, 0);
  expect(outline.top).toBeCloseTo(origin.top + figure.top * scale, 0);
  expect(outline.right).toBeCloseTo(origin.left + figure.right * scale, 0);
  expect(outline.bottom).toBeCloseTo(origin.top + figure.bottom * scale, 0);
  await settledLabels(panel, [...expectedOutlines(block, frame).keys()]);
  expect(panel.querySelector('[data-anatomy-label="recipe-chart"]')?.textContent).toBe('Chart 002');
});

test('resizing the frame or toggling narrow repositions every outline and label, with no stale box', async () => {
  const block = blocks.find(({ id }) => id === 'dashboard-01') as BlockEntry;
  const { screen, panel, frame } = await openAnatomy(block);
  const check = async () => {
    const visible = [...(await outlinesSettle(block, panel, frame)).keys()];
    const labels = await settledLabels(panel, visible);
    const bounds = rectOf(panel.querySelector('[data-anatomy-overlay]') as HTMLElement);
    for (const label of labels) expect(within(rectOf(label), bounds), `${label.dataset.anatomyLabel} lies inside the preview`).toBe(true);
    return drawnOutlines(panel);
  };
  const desktop = await check();

  await page.viewport(1000, 900);
  const resized = await check();
  expect(resized).not.toEqual(desktop);

  await userEvent.click(screen.getByRole('button', { name: 'Narrow' }));
  await expect.poll(() => frame.width).toBe('390');
  const narrow = await check();
  expect(Object.keys(narrow).sort()).not.toEqual(Object.keys(desktop).sort());

  await userEvent.click(screen.getByRole('button', { name: 'Desktop' }));
  await expect.poll(() => frame.width).toBe('1200');
  expect(Object.keys(await check()).sort()).toEqual(Object.keys(resized).sort());
});

test('the switch hides the labels and keeps the outlines and the legend; focusing an entry emphasises its outline', async () => {
  const block = blocks.find(({ id }) => id === 'dashboard-01') as BlockEntry;
  const { screen, panel, frame } = await openAnatomy(block);
  const visible = [...(await outlinesSettle(block, panel, frame)).keys()];
  await settledLabels(panel, visible);
  const outline = () => panel.querySelector<HTMLElement>('[data-anatomy-outline="component-meter"]') as HTMLElement;
  const hairline = getComputedStyle(outline()).borderTopWidth;

  (panel.querySelector('ol[aria-label="Built from"] a[href="/components/meter"]') as HTMLElement).focus();
  await expect.poll(() => getComputedStyle(outline()).borderTopWidth).not.toBe(hairline);
  expect([...panel.querySelectorAll<HTMLElement>('[data-anatomy-label]')].at(-1)?.dataset.anatomyLabel).toBe('component-meter');

  const toggle = screen.getByRole('switch', { name: 'Label components' });
  await expect.element(toggle).toBeChecked();
  await userEvent.click(toggle);
  expect(panel.querySelectorAll('[data-anatomy-label]')).toHaveLength(0);
  expect(panel.querySelectorAll('[data-anatomy-outline]')).toHaveLength(visible.length);
  expect(panel.querySelectorAll('ol[aria-label="Built from"] > li')).toHaveLength(block.builtFrom.length);
});

describe('the index', () => {
  test('never draws an overlay on a thumbnail', async () => {
    await page.viewport(1440, 900);
    onTestFinished(() => page.viewport(1280, 720));
    const history = createMemoryHistory({ initialEntries: ['/blocks'] });
    const screen = await render(<RouterProvider router={createRouter({ routeTree, history })} />);
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Blocks' })).toBeVisible();
    const [first] = [...document.querySelectorAll('main iframe')] as HTMLIFrameElement[];
    first?.scrollIntoView();
    await expect.poll(() => first?.contentDocument?.querySelector('[data-anatomy-item]'), { timeout: 15_000 }).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(document.querySelector('[data-anatomy-overlay]')).toBeNull();
  });
});
