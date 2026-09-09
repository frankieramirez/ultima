import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Code, type CodeProps, type CodeVariant } from '@ultima/ui';

test('both variants mount', async () => {
  const screen = await render(
    <>
      <Code variant="inline">npx shadcn add button</Code>
      <Code variant="block">{'const a = 1;\nconst b = 2;'}</Code>
    </>,
  );
  await expect.element(screen.getByText('npx shadcn add button')).toBeVisible();
  await expect.element(screen.getByText('const a = 1;', { exact: false })).toBeVisible();
});

test('no props is the inline variant, a bare code element', async () => {
  const screen = await render(<><Code>implicit</Code><Code variant="inline">explicit</Code></>);
  const implicit = screen.getByText('implicit').element();
  const explicit = screen.getByText('explicit').element();
  expect(implicit.tagName).toBe('CODE');
  expect(implicit.parentElement?.tagName).not.toBe('PRE');
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('the block variant is a pre whose child is code', async () => {
  const screen = await render(<Code variant="block" data-testid="block">block text</Code>);
  const pre = screen.getByTestId('block').element();
  expect(pre.tagName).toBe('PRE');
  expect(pre.children).toHaveLength(1);
  expect(pre.firstElementChild?.tagName).toBe('CODE');
  expect(pre.firstElementChild?.textContent).toBe('block text');
});

test('the block variant wraps long lines instead of scrolling', async () => {
  const screen = await render(<Code variant="block" data-testid="block">{'x'.repeat(400)}</Code>);
  const pre = screen.getByTestId('block').element();
  expect(getComputedStyle(pre).whiteSpace).toBe('pre-wrap');
  expect(pre.scrollWidth).toBe(pre.clientWidth);
  expect(pre).not.toHaveAttribute('tabindex');
});

test('tabbing through either variant focuses nothing inside it', async () => {
  const screen = await render(
    <div data-testid="wrap">
      <Code>inline</Code>
      <Code variant="block">block</Code>
    </div>,
  );
  const wrap = screen.getByTestId('wrap').element();
  await userEvent.tab();
  expect(wrap.contains(document.activeElement)).toBe(false);
  for (const part of wrap.querySelectorAll('*')) {
    expect(getComputedStyle(part).outlineStyle).toBe('none');
  }
});

test('render and ref reach the root of each variant', async () => {
  const inlineRef = createRef<HTMLElement>();
  const blockRef = createRef<HTMLElement>();
  const screen = await render(
    <>
      <Code ref={inlineRef} render={<kbd data-custom="inline" />}>Ctrl</Code>
      <Code ref={blockRef} variant="block" render={<samp data-custom="block" />}>output</Code>
    </>,
  );
  const inline = screen.getByText('Ctrl').element();
  expect(inline.tagName).toBe('KBD');
  expect(inlineRef.current).toBe(inline);
  const block = screen.getByText('output').element().parentElement;
  expect(block?.tagName).toBe('SAMP');
  expect(blockRef.current).toBe(block);
  expect(block).toHaveAttribute('data-custom', 'block');
});

test('public prop types expose the variant axis and no className', () => {
  expectTypeOf<CodeVariant>().toEqualTypeOf<'inline' | 'block'>();
  expectTypeOf<CodeProps>().not.toHaveProperty('className');
  expectTypeOf<CodeProps>().toHaveProperty('render');
  expectTypeOf<CodeProps>().toHaveProperty('style');
});
