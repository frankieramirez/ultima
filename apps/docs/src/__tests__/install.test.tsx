import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';

import { routeTree } from '../router';
import { parseDraft, resolveDraft } from '@ultima/tokens';
import legacy from '../../../../packages/tokens/src/__tests__/fixtures/pre-base-theme-drafts.json';
import { setupItems } from '../../../../registry/items.config.ts';
import '../styles.css';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

test('built setup items print every hand step and keep theme assertions manual', async () => {
  for (const [id, { handSteps }] of Object.entries(setupItems)) {
    const item = await (await fetch(`/r/${id}.json`)).json();
    for (const [index, step] of handSteps.entries()) expect(item.docs).toContain(`${index + 1}. ${step.prose}`);
    const theme = handSteps.filter((step) => step.prose.includes('theme'));
    expect(theme).toHaveLength(2);
    for (const step of theme) {
      expect(step.assertion).toBeUndefined();
      expect(step.unverifiable).toBeTruthy();
    }
  }
});

test('hosted guide and install page teach discovery and offline work without planned flags', async () => {
  const guide = await (await fetch('/llms.txt')).text();
  expect(new TextEncoder().encode(guide).byteLength).toBeLessThanOrEqual(64 * 1024);
  expect(guide).toContain('## Theme adoption');
  expect(guide).toContain('## Discover and maintain the product theme');
  expect(guide).not.toContain('doctor --theme');
  const screen = await mount('/install');
  await expect.element(screen.getByRole('link', { name: 'discovery and safe-update workflow' })).toHaveAttribute('href', '/llms.txt#discover-and-maintain-the-product-theme');
  const prose = document.querySelector('main')!.textContent!;
  expect(prose).toContain('npx --no-install ultima-design doctor');
  expect(prose).toContain('npx --no-install ultima-design check');
  expect(prose).toContain('Preserve those choices');
  expect(prose).toContain('preserve consumer prose');
  expect(prose).not.toContain('doctor --theme');
});

test('install links to update guidance with a working frozen Ultima preset command', async () => {
  const install = await mount('/install');
  await expect.element(install.getByRole('link', { name: 'Update the base theme', exact: true }).last()).toHaveAttribute('href', '/install/update');
  await install.unmount();
  const screen = await mount('/install/update');
  await expect.element(screen.getByRole('heading', { name: 'Update the base theme', level: 1 })).toBeVisible();
  await expect.poll(() => document.querySelector('main pre code')?.textContent).toMatch(/^npx shadcn add "https:\/\/ultima.systems\/r\/theme.json\?theme=/);
  const command = document.querySelector('main pre code')?.textContent ?? '';
  const publicUrl = new URL(command.match(/"([^"]+)"/)![1]!);
  const item = await (await fetch(`${publicUrl.pathname}${publicUrl.search}`)).json();
  expect(item.files.map((file: { target: string }) => file.target)).toEqual(['~/ultima-theme.css', '~/ultima-theme.json', '~/DESIGN.md']);
  const parsed = parseDraft(item.files.find((file: { target: string }) => file.target === '~/ultima-theme.json').content);
  if (!parsed.ok) throw new Error(parsed.message);
  expect(parsed.draft.preset).toEqual({ id: 'ultima', revision: 2 });
  expect(resolveDraft(parsed.draft)).toEqual(legacy.cases.find(({ name }) => name === 'preset-ultima-revision-2')!.resolved);
  expect(document.querySelector('main')?.textContent).toContain('never rewrites');
  expect(document.querySelector('main')?.textContent).toContain('unpinned');
  for (const link of document.querySelectorAll<HTMLAnchorElement>('main a[href^="/"]')) {
    expect(Object.keys(createRouter({ routeTree }).routesByPath)).toContain(link.pathname);
  }
});

test('Commands is one tab list with a fence per target, Vite first', async () => {
  const screen = await mount('/install');
  const list = screen.getByRole('tablist', { name: 'Setup target' });
  await expect.element(list).toBeVisible();
  expect(document.querySelectorAll('[role="tablist"]')).toHaveLength(1);

  const vite = screen.getByRole('tab', { name: 'Vite' });
  const next = screen.getByRole('tab', { name: 'Next.js' });
  await expect.element(vite).toHaveAttribute('aria-selected', 'true');

  const panel = screen.getByRole('tabpanel');
  expect(panel.element().querySelector('pre')?.textContent).toContain('/r/setup-vite.json');
  expect(panel.element().textContent).toContain('npx shadcn add @ultima/button');

  await userEvent.click(next);
  await expect.element(next).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel').element().querySelector('pre')?.textContent).toContain(
    '/r/setup-next.json',
  );
});

test('the per-target prose stays as labelled runs outside the tabs', async () => {
  const screen = await mount('/install');
  await expect.element(screen.getByRole('tablist', { name: 'Setup target' })).toBeVisible();
  const runs = [...document.querySelectorAll('p > strong:first-child')].map((node) => node.textContent);
  expect(runs).toEqual(expect.arrayContaining(['Vite.', 'Next.js App Router.', 'Both.', 'Next.js.']));
  for (const strong of document.querySelectorAll('p > strong:first-child')) {
    expect(strong.closest('[role="tabpanel"]')).toBeNull();
  }
});

test('no install paragraph reads like a table of inline-code chips', async () => {
  const screen = await mount('/install');
  await expect.element(screen.getByRole('heading', { name: 'Install', level: 1 })).toBeVisible();
  const paragraphs = document.querySelectorAll('main p');
  expect(paragraphs.length).toBeGreaterThan(10);
  for (const paragraph of paragraphs) {
    expect(paragraph.querySelectorAll('code').length, paragraph.textContent ?? '').toBeLessThanOrEqual(4);
  }
});
