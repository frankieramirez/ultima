import { expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button, Input } from '@ultima/ui';
import { useState } from 'react';

import { Demo } from '../demo';

function Example() {
  const [count, setCount] = useState(0);
  return (
    <>
      <Button onClick={() => setCount(count + 1)}>Clicked {count}</Button>
      <Input aria-label="Example input" />
    </>
  );
}
const SOURCE =
  'export default function Example() {\n  return <Button>Solid</Button>;\n}';

test('Preview is the default; switching to Code shows the exact source and preserves live state', async () => {
  const screen = await render(<Demo component={Example} source={SOURCE} />);
  await expect
    .element(screen.getByRole('tab', { name: 'Preview' }))
    .toHaveAttribute('aria-selected', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Clicked 0' }));
  await userEvent.click(screen.getByRole('tab', { name: 'Code' }));
  expect(screen.container.querySelector('pre')?.textContent).toBe(SOURCE);
  expect(screen.getByRole('button', { name: 'Clicked 1' }).query()).toBeNull();
  await userEvent.click(screen.getByRole('tab', { name: 'Preview' }));
  await expect
    .element(screen.getByRole('button', { name: 'Clicked 1' }))
    .toBeVisible();
});

test("the toolbar copies the source from either tab and the demo wears Neutral's Tight radii", async () => {
  const written: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (value: string) => (written.push(value), Promise.resolve()),
    },
  });
  const screen = await render(<Demo component={Example} source={SOURCE} />);
  const copy = screen.getByRole('button', { name: 'Copy example source' });
  expect(getComputedStyle(copy.element()).borderRadius).toBe('0px');
  expect(
    getComputedStyle(
      screen.getByRole('button', { name: 'Clicked 0' }).element(),
    ).borderRadius,
  ).toBe('4px');
  expect(
    getComputedStyle(
      screen.getByRole('textbox', { name: 'Example input' }).element(),
    ).borderRadius,
  ).toBe('4px');
  await userEvent.click(copy);
  expect(written.at(-1)).toBe(SOURCE);
  await userEvent.click(screen.getByRole('tab', { name: 'Code' }));
  await userEvent.click(copy);
  expect(written).toEqual([SOURCE, SOURCE]);
});

test('the example toolbar and horizontally scrolling code fit a narrow viewport', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await render(
    <Demo component={Example} source={SOURCE + 'x'.repeat(200)} />,
  );
  await userEvent.click(screen.getByRole('tab', { name: 'Code' }));
  const figure = screen.container.querySelector('figure')!;
  expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
  await expect
    .element(screen.getByRole('button', { name: 'Copy example source' }))
    .toBeVisible();
});
