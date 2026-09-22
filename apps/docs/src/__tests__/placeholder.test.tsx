import { expect, test } from 'vitest';

import { Placeholder } from '../routes/placeholder';
import { renderWithRouter } from './render-with-router';

test('the unwritten component page renders inside the document chrome', async () => {
  const screen = await renderWithRouter(
    <Placeholder title="Widget" ticket="a later component-page ticket" />,
  );

  const trail = screen.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  expect(trail.querySelector('a[href="/components"]')?.textContent).toBe('Components');
  expect(trail.querySelector('[aria-current="page"]')?.textContent).toBe('Widget');
  await expect.element(screen.getByRole('heading', { name: 'Widget', level: 1 })).toBeVisible();
  expect(screen.container.textContent).toContain('a later component-page ticket');
});
