import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Stat, type StatLabelProps, type StatRootProps, type StatValueProps } from '@ultima/ui';

function FullStat() {
  return (
    <Stat.Root data-testid="root">
      <Stat.Label>Findings</Stat.Label>
      <Stat.Value>42</Stat.Value>
    </Stat.Root>
  );
}

test('every part mounts', async () => {
  const screen = await render(<FullStat />);
  await expect.element(screen.getByText('Findings')).toBeVisible();
  await expect.element(screen.getByText('42')).toBeVisible();
});

test('label and value are spans inside a div root', async () => {
  const screen = await render(<FullStat />);
  const root = screen.getByTestId('root').element();
  expect(root.tagName).toBe('DIV');
  expect(screen.getByText('Findings').element().tagName).toBe('SPAN');
  expect(screen.getByText('42').element().tagName).toBe('SPAN');
});

test('tabbing through the stat focuses nothing inside it', async () => {
  const screen = await render(<FullStat />);
  const root = screen.getByTestId('root').element();
  await userEvent.tab();
  expect(root.contains(document.activeElement)).toBe(false);
  expect(getComputedStyle(root).outlineStyle).toBe('none');
});

test('render and ref reach the root element', async () => {
  const ref = createRef<HTMLDivElement>();
  const screen = await render(<Stat.Root ref={ref} render={<dl data-custom="yes" />}>Custom</Stat.Root>);
  const root = screen.getByText('Custom').element();
  expect(root.tagName).toBe('DL');
  expect(ref.current).toBe(root);
  expect(root).toHaveAttribute('data-custom', 'yes');
});

test('public prop types carry the style slot and no className', () => {
  expectTypeOf<StatRootProps>().not.toHaveProperty('className');
  expectTypeOf<StatLabelProps>().not.toHaveProperty('className');
  expectTypeOf<StatValueProps>().not.toHaveProperty('className');
  expectTypeOf<StatLabelProps>().not.toHaveProperty('render');
  expectTypeOf<StatRootProps>().toHaveProperty('render');
  expectTypeOf<StatValueProps>().toHaveProperty('style');
});
