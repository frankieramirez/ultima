import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { Placeholder } from '../routes/placeholder';

test('the unwritten component page renders inside the document chrome', async () => {
  const screen = await render(<Placeholder title="Widget" ticket="a later component-page ticket" />);

  expect(screen.container.textContent).toContain('COMPONENTS / WIDGET');
  await expect.element(screen.getByRole('heading', { name: 'Widget', level: 1 })).toBeVisible();
  expect(screen.container.textContent).toContain('a later component-page ticket');
});
