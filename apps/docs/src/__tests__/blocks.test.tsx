import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { resolveDraft } from '@ultima/tokens';
import axe from 'axe-core';
import { describe, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { BlockPage } from '../block-page';
import { components } from '../components';
import { blocks } from '../generated/blocks';
import { routeTree } from '../router';
import { neutralDraft, siteDraft } from '../site-theme-draft';
import { THEME_STORAGE_KEY } from '../theme';
import { renderWithRouter } from './render-with-router';
// axe resolves a text contrast against the nearest painted ancestor, and the ground is on `body`.
import '../styles.css';

const raw = import.meta.glob<string>('../../../../packages/blocks/src/*/*.tsx', { query: '?raw', import: 'default', eager: true });

const NEUTRAL = resolveDraft(neutralDraft());
const SITE = resolveDraft(siteDraft());

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

async function at(width: number, path: string, mode?: 'dark' | 'light') {
  if (mode) {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
  }
  await page.viewport(width, 900);
  onTestFinished(() => page.viewport(1280, 720));
  return mount(path);
}

const text = (node: Element | null) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

async function noViolations() {
  // A mount under a freshly themed root transitions its colors in; axe reads the settled ones.
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  const { violations } = await axe.run(document.body, { rules: { 'color-contrast': { enabled: true } } });
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);
}

test('/blocks holds one card per block in number order, each opening its page', async () => {
  const screen = await at(1440, '/blocks');
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Blocks' })).toBeVisible();
  const cards = screen.getByRole('list', { name: 'Blocks' }).getByRole('listitem').elements();
  expect(blocks.map(({ number }) => number)).toEqual(['001', '002', '003', '004']);
  expect(cards.map((card) => card.querySelector('h2 a')?.textContent)).toEqual(blocks.map(({ title }) => title));
  expect(cards.map((card) => card.querySelector('h2 a')?.getAttribute('href'))).toEqual(blocks.map(({ id }) => `/blocks/${id}`));
  expect(cards.map((card) => text(card.querySelector('code')))).toEqual(blocks.map(({ install }) => install));
});

test('each index thumbnail frames its preview route lazily and inert, so none is a tab stop', async () => {
  const screen = await at(1440, '/blocks');
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Blocks' })).toBeVisible();
  const frames = [...document.querySelectorAll('main iframe')] as HTMLIFrameElement[];
  expect(frames.map((frame) => frame.getAttribute('src'))).toEqual(blocks.map(({ id }) => `/blocks/${id}/preview`));
  for (const frame of frames) {
    expect(frame.inert).toBe(true);
    expect(frame.loading).toBe('lazy');
  }

  const links = screen.getByRole('list', { name: 'Blocks' }).getByRole('link').elements();
  links[0]!.focus();
  const stops = [document.activeElement];
  for (let press = 1; press < blocks.length; press++) {
    await userEvent.keyboard('{Tab}');
    stops.push(document.activeElement);
  }
  expect(stops).toEqual(links);
});

describe.each(blocks)('$title', (block) => {
  test('its page shows the framed preview, install command, file tree, sources and Built from', async () => {
    const screen = await at(1440, `/blocks/${block.id}`);
    await expect.element(screen.getByRole('heading', { level: 1, name: block.title })).toBeVisible();
    const main = document.querySelector('main')!;

    const frame = main.querySelector('figure iframe') as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toBe(`/blocks/${block.id}/preview`);
    expect(frame.inert).toBe(false);
    expect(text(main.querySelector('pre code'))).toBe(block.install);
    await expect.element(screen.getByRole('button', { name: 'Copy install command' })).toBeVisible();

    const files = screen.getByRole('region', { name: 'Files' }).element();
    expect([...files.querySelectorAll('ul ul li')].map(text)).toEqual(block.files);
    expect(text(files.querySelector('li'))).toMatch(new RegExp(`^components/${block.id}/`));

    const builtFrom = screen.getByRole('region', { name: 'Built from' }).element();
    const rows = [...builtFrom.querySelectorAll('li')];
    expect(rows.map((row) => text(row.firstElementChild?.firstElementChild ?? null))).toEqual(block.builtFrom.map(({ number }) => number));
    const used = block.builtFrom.filter(({ kind }) => kind === 'component');
    const numbers = used.map(({ number }) => number);
    expect(numbers).toEqual([...numbers].sort());
    for (const { id, title, number } of used) {
      expect(components.find(({ item }) => item === id)?.number).toBe(number);
      expect(builtFrom.querySelector(`a[href="/components/${id}"]`)?.textContent).toBe(title);
    }

    await userEvent.click(screen.getByRole('tab', { name: 'Code' }));
    const tabs = screen.getByRole('tablist', { name: 'Files' }).getByRole('tab');
    await expect.poll(() => tabs.elements().map((tab) => tab.textContent)).toEqual(block.files);
    for (const file of block.files) {
      await userEvent.click(screen.getByRole('tab', { name: file, exact: true }));
      const shown = screen.getByRole('tabpanel', { name: file }).element().querySelector('pre');
      expect(shown?.textContent).toBe(raw[`../../../../packages/blocks/src/${block.id}/${file}`]);
    }
  });
});

test("a block file's copy button sits above its numbered source and copies that file", async () => {
  const copied: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (value: string) => (copied.push(value), Promise.resolve()) },
  });
  const [block] = blocks;
  const [file] = block!.files;
  const screen = await renderWithRouter(<BlockPage block={block!} />);
  await userEvent.click(screen.getByRole('tab', { name: 'Code' }));
  const copy = screen.getByRole('button', { name: `Copy ${file}` });
  await expect.element(copy).toBeVisible();
  const box = copy.element().getBoundingClientRect();
  expect(copy.element().contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))).toBe(true);
  await userEvent.click(copy);
  expect(copied).toEqual([raw[`../../../../packages/blocks/src/${block!.id}/${file}`]]);
});

test('a source that fails to load says so rather than loading forever', async () => {
  const [block] = blocks;
  const screen = await renderWithRouter(<BlockPage block={{ ...block!, files: [...block!.files, 'missing.tsx'] }} />);
  await userEvent.click(screen.getByRole('tab', { name: 'Code' }));
  await expect.element(screen.getByText('The source could not be loaded.')).toBeVisible();
  expect(screen.getByText('Loading the source…').query()).toBeNull();
});

test('the narrow toggle lays the block out at 390 inside the frame, and the desktop frame scales to the column', async () => {
  const screen = await at(1440, '/blocks/sign-in-01');
  const frame = () => document.querySelector('main figure iframe') as HTMLIFrameElement;
  await expect.poll(() => frame()?.getBoundingClientRect().width).toBeGreaterThan(0);
  const column = (frame().closest('[data-preview-size]') as HTMLElement).clientWidth;
  expect([frame().width, frame().height]).toEqual(['1200', '760']);
  expect(frame().getBoundingClientRect().width).toBeCloseTo(column, 0);
  expect(frame().getBoundingClientRect().height).toBeCloseTo((760 * column) / 1200, 0);

  await userEvent.click(screen.getByRole('button', { name: 'Narrow' }));
  await expect.poll(() => frame().width).toBe('390');
  expect(frame().height).toBe('844');
  expect(frame().getBoundingClientRect().width).toBeCloseTo(390, 0);
  await expect.element(screen.getByText('390 × 844')).toBeVisible();
});

describe.each(['dark', 'light'] as const)('a block preview in %s', (mode) => {
  test('wears Neutral on <html>, so the Sidebar menu and a Toast portalled to body compute Neutral values', async () => {
    const screen = await at(390, '/blocks/settings-01/preview', mode);
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
    expect(document.querySelector('header nav[aria-label="Site"]')).toBeNull();
    await expect.poll(() => document.title).toBe('Settings 01 preview - Ultima');

    const token = (element: Element, name: string) => getComputedStyle(element).getPropertyValue(name).trim();
    expect(NEUTRAL[mode]['--ult-color-action']).not.toBe(SITE[mode]['--ult-color-action']);

    await userEvent.click(screen.getByRole('button', { name: 'Open settings navigation' }));
    const menu = screen.getByRole('navigation', { name: 'Settings' });
    await expect.element(menu).toBeVisible();
    const panel = menu.element();
    expect(screen.container.contains(panel)).toBe(false);
    expect(token(panel, '--ult-color-action')).toBe(NEUTRAL[mode]['--ult-color-action']);
    expect(token(panel, '--ult-color-surface')).toBe(NEUTRAL[mode]['--ult-color-surface']);
    await userEvent.keyboard('{Escape}');

    await page.viewport(1280, 720);
    await userEvent.click(screen.getByRole('switch', { name: 'Marketing' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    const toast = page.getByText('Notification settings saved');
    await expect.element(toast).toBeVisible();
    expect(screen.container.contains(toast.element())).toBe(false);
    expect(token(toast.element(), '--ult-color-action')).toBe(NEUTRAL[mode]['--ult-color-action']);
  });
});

describe.each([
  ['dark', 1440],
  ['dark', 390],
  ['light', 1440],
  ['light', 390],
] as const)('axe in %s at %ipx', (mode, width) => {
  test.each(['/blocks', '/blocks/sign-in-01'])('passes on %s', async (path) => {
    const screen = await at(width, path, mode);
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
    await noViolations();
  });
});
