import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Card, type CardHeaderProps, type CardRootProps, type CardTitleProps } from '@ultima/ui';

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
