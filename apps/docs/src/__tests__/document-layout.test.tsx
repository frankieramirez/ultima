import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { DocumentLayout } from '../document-layout';

test('renders a labelled article index from headings and keeps heading anchors addressable', async () => {
  const screen = await render(
    <DocumentLayout breadcrumb="DOCUMENTATION / INSTALL">
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

test('hides the article index on a narrow viewport', async () => {
  await page.viewport(390, 844);
  const screen = await render(
    <DocumentLayout breadcrumb="COMPONENTS / BUTTON">
      <h1>Button</h1>
      <h2>Variants</h2>
    </DocumentLayout>,
  );

  expect(screen.container.querySelector('aside[aria-label="On this page"]')).toHaveStyle({ display: 'none' });
  await page.viewport(1280, 720);
});
