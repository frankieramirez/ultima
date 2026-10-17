import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Card, type CardHeaderProps, type CardRootProps, type CardTitleProps } from '@ultima/ui';
import { tokenValue } from './token-value';

function FullCard() {
  return (
    <Card.Root data-testid="root">
      <Card.Header>
        <Card.Title>Latency</Card.Title>
        <Card.Description>p95 over the last hour</Card.Description>
      </Card.Header>
      <Card.Body>Body</Card.Body>
      <Card.Footer>Footer</Card.Footer>
    </Card.Root>
  );
}

test('every part mounts', async () => {
  const screen = await render(<FullCard />);
  await expect.element(screen.getByText('Latency')).toBeVisible();
  await expect.element(screen.getByText('p95 over the last hour')).toBeVisible();
  await expect.element(screen.getByText('Body')).toBeVisible();
  await expect.element(screen.getByText('Footer')).toBeVisible();
});

test('the title is a level 3 heading by default', async () => {
  const screen = await render(<FullCard />);
  await expect.element(screen.getByRole('heading', { level: 3, name: 'Latency' })).toBeVisible();
});

test('render changes the heading level of the title', async () => {
  const screen = await render(<Card.Title render={<h2 />}>Section</Card.Title>);
  await expect.element(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeVisible();
});

test('tabbing through the card focuses nothing inside it', async () => {
  const screen = await render(<FullCard />);
  const root = screen.getByTestId('root').element();
  await userEvent.tab();
  expect(root.contains(document.activeElement)).toBe(false);
  expect(getComputedStyle(root).outlineStyle).toBe('none');
});

test('render and ref reach the root element', async () => {
  const ref = createRef<HTMLDivElement>();
  const screen = await render(<Card.Root ref={ref} render={<section data-custom="yes" />}>Custom</Card.Root>);
  const root = screen.getByText('Custom').element();
  expect(root.tagName).toBe('SECTION');
  expect(ref.current).toBe(root);
  expect(root).toHaveAttribute('data-custom', 'yes');
});

test('public prop types carry the style slot and no className', () => {
  expectTypeOf<CardRootProps>().not.toHaveProperty('className');
  expectTypeOf<CardTitleProps>().not.toHaveProperty('className');
  expectTypeOf<CardHeaderProps>().not.toHaveProperty('className');
  expectTypeOf<CardHeaderProps>().not.toHaveProperty('render');
  expectTypeOf<CardRootProps>().toHaveProperty('render');
  expectTypeOf<CardHeaderProps>().toHaveProperty('style');
});

test('the card is a 12px surface on a hairline and a small shadow, with card padding', async () => {
  const screen = await render(<FullCard />);
  const root = getComputedStyle(screen.getByTestId('root').element());
  expect(root.borderTopLeftRadius).toBe(tokenValue('border-top-left-radius', 'var(--ult-radius-xl)'));
  expect(root.boxShadow).toBe(tokenValue('box-shadow', 'var(--ult-shadow-sm)'));
  const header = screen.getByText('Latency').element().parentElement as HTMLElement;
  expect(getComputedStyle(header).paddingTop).toBe(tokenValue('padding-top', 'var(--ult-space-8)'));
  expect(getComputedStyle(header).rowGap).toBe(tokenValue('row-gap', 'var(--ult-space-3)'));
  expect(getComputedStyle(screen.getByText('Body').element()).paddingLeft).toBe(tokenValue('padding-left', 'var(--ult-space-8)'));
});

test('the description sets its own line height and margin', async () => {
  const screen = await render(<FullCard />);
  const description = getComputedStyle(screen.getByText('p95 over the last hour').element());
  expect(description.lineHeight).toBe(tokenValue('line-height', 'calc(var(--ult-text-4) * var(--ult-font-leading-normal))'));
  expect(description.marginTop).toBe('0px');
});
