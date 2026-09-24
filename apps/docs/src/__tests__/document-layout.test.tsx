import axe from 'axe-core';
import { expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';

import { DocumentLayout } from '../document-layout';
import { renderWithRouter as render } from './render-with-router';

test('renders a labelled article index from headings and keeps heading anchors addressable', async () => {
  const screen = await render(
    <DocumentLayout breadcrumb={[{ label: 'Documentation' }, { label: 'Install' }]}>
      <h1>Install</h1>
      <h2>Commands</h2>
      <p>Install the package.</p>
      <h2>For an agent</h2>
    </DocumentLayout>,
  );

  await expect.element(screen.getByRole('heading', { name: 'Commands', level: 2 })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Commands', level: 2 }).element()).toHaveAttribute(
    'id',
    'commands',
  );
  expect(screen.getByRole('complementary', { name: 'On this page' }).element().textContent).toContain('Commands');
  expect(screen.getByRole('link', { name: 'For an agent' }).element()).toHaveAttribute(
    'href',
    '#for-an-agent',
  );
});

test('the trail is a Breadcrumb landmark whose parent links out and whose last crumb is a current link', async () => {
  const screen = await render(
    <DocumentLayout breadcrumb={[{ label: 'Documentation', to: '/install' }, { label: 'Install' }]}>
      <h1>Install</h1>
    </DocumentLayout>,
  );

  await expect.element(screen.getByRole('heading', { name: 'Install', level: 1 })).toBeVisible();
  const trail = screen.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  expect(trail.querySelectorAll('li:not([role="presentation"])')).toHaveLength(2);
  expect(trail.querySelector('a[href="/install"]')?.textContent).toBe('Documentation');
  expect(trail.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  const current = trail.querySelector('[aria-current="page"]')!;
  expect(current.textContent).toBe('Install');
  expect(current.tagName).toBe('A');
  expect(current).toHaveAttribute('href', '/');
  expect(trail.querySelector('[role="presentation"]')?.textContent).toBe('/');
});

test('the index marks the section at the reading line and keeps the last one passed', async () => {
  await page.viewport(1440, 900);
  const screen = await render(
    <DocumentLayout breadcrumb={[{ label: 'Components' }, { label: 'Button' }]}>
      <h1>Button</h1>
      <h2>Variants</h2>
      <p style={{ blockSize: '150vh' }}>Variants.</p>
      <h2>Sizes</h2>
      <p style={{ blockSize: '150vh' }}>Sizes.</p>
      <h2>Tones</h2>
      <p style={{ blockSize: '150vh' }}>Tones.</p>
    </DocumentLayout>,
  );
  onTestFinished(() => window.scrollTo(0, 0));
  const rail = screen.getByRole('complementary', { name: 'On this page' });
  await expect.element(rail.getByRole('link', { name: 'Sizes' })).toBeVisible();
  const current = () => rail.element().querySelector('[aria-current="location"]')?.textContent ?? null;
  const reach = (name: string) =>
    window.scrollTo(0, window.scrollY + document.getElementById(name)!.getBoundingClientRect().top);

  expect(current()).toBeNull();

  reach('sizes');
  await expect.poll(current).toBe('Sizes');
  expect(rail.getByRole('link', { name: 'Sizes' }).element()).toHaveStyle({ fontWeight: '500' });

  window.scrollBy(0, window.innerHeight / 2);
  await expect.poll(current).toBe('Sizes');

  reach('tones');
  await expect.poll(current).toBe('Tones');
  expect(rail.element().querySelectorAll('[aria-current]')).toHaveLength(1);

  const { violations } = await axe.run(rail.element());
  expect(violations).toEqual([]);
});

test('renders no index when the article has no headings to list', async () => {
  const screen = await render(
    <DocumentLayout breadcrumb={[{ label: 'Components' }]}>
      <h1>Components</h1>
      <p>No sections on this page.</p>
    </DocumentLayout>,
  );

  expect(screen.getByRole('complementary', { name: 'On this page' }).query()).toBeNull();
});

test('hides the article index on a narrow viewport', async () => {
  await page.viewport(390, 844);
  const screen = await render(
    <DocumentLayout breadcrumb={[{ label: 'Components' }, { label: 'Button' }]}>
      <h1>Button</h1>
      <h2>Variants</h2>
    </DocumentLayout>,
  );

  expect(screen.container.querySelector('aside[aria-label="On this page"]')).toHaveStyle({ display: 'none' });
  await page.viewport(1280, 720);
});
