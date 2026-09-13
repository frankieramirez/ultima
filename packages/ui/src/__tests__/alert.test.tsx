import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Alert,
  type AlertDescriptionProps,
  type AlertIconProps,
  type AlertRootProps,
  type AlertTitleProps,
  type AlertTone,
} from '@ultima/ui';

const tones = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const satisfies readonly AlertTone[];

function Callout({
  tone,
  title,
  description = '87% of 500 GB used.',
}: {
  tone?: AlertTone;
  title: string;
  description?: string;
}) {
  return (
    <Alert.Root tone={tone} data-testid={title}>
      <Alert.Title>{title}</Alert.Title>
      <Alert.Description>{description}</Alert.Description>
    </Alert.Root>
  );
}

test('every tone mounts', async () => {
  const screen = await render(
    <>
      {tones.map((tone) => (
        <Callout key={tone} tone={tone} title={tone} />
      ))}
    </>,
  );
  for (const tone of tones) {
    await expect.element(screen.getByRole('heading', { level: 3, name: tone })).toBeVisible();
  }
});

test('no props is the neutral tone', async () => {
  const screen = await render(
    <>
      <Callout title="implicit" />
      <Callout tone="neutral" title="explicit" />
      <Callout tone="danger" title="other" />
    </>,
  );
  const implicit = screen.getByTestId('implicit').element();
  const explicit = screen.getByTestId('explicit').element();
  const other = screen.getByTestId('other').element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
  expect(implicit.className).not.toBe(other.className);
  expect(getComputedStyle(implicit).backgroundColor).not.toBe(getComputedStyle(other).backgroundColor);
});

test('the title is a level 3 heading and the root is a div with no live role', async () => {
  const screen = await render(<Callout title="Disk almost full" />);
  await expect.element(screen.getByRole('heading', { level: 3, name: 'Disk almost full' })).toBeVisible();
  const root = screen.getByTestId('Disk almost full').element();
  expect(root.tagName).toBe('DIV');
  expect(root).not.toHaveAttribute('role');
  expect(screen.container.querySelector('[role="alert"], [role="status"]')).toBeNull();
});

test('description names the callout when there is no title', async () => {
  const screen = await render(
    <Alert.Root data-testid="root">
      <Alert.Description>Saved just now.</Alert.Description>
    </Alert.Root>,
  );
  await expect.element(screen.getByText('Saved just now.')).toBeVisible();
  expect(screen.container.querySelector('h3')).toBeNull();
});

test('tabbing through an alert focuses nothing inside it', async () => {
  const screen = await render(<Callout title="Disk almost full" />);
  const root = screen.getByTestId('Disk almost full').element();
  await userEvent.tab();
  expect(root.contains(document.activeElement)).toBe(false);
  expect(getComputedStyle(root).outlineStyle).toBe('none');
  for (const part of root.querySelectorAll('*')) {
    expect(getComputedStyle(part).outlineStyle).toBe('none');
  }
});

test('render and ref reach the root and the title', async () => {
  const rootRef = createRef<HTMLDivElement>();
  const titleRef = createRef<HTMLHeadingElement>();
  const screen = await render(
    <Alert.Root ref={rootRef} render={<section data-custom="root" />} data-testid="root">
      <Alert.Title ref={titleRef} render={<h2 data-custom="title" />}>
        Section
      </Alert.Title>
    </Alert.Root>,
  );
  const root = screen.getByTestId('root').element();
  expect(root.tagName).toBe('SECTION');
  expect(rootRef.current).toBe(root);
  expect(root).toHaveAttribute('data-custom', 'root');
  await expect.element(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeVisible();
  const title = screen.getByRole('heading', { level: 2, name: 'Section' }).element();
  expect(titleRef.current).toBe(title);
  expect(title).toHaveAttribute('data-custom', 'title');
});

test('Icon is aria-hidden, omitted when unused, and takes the caller glyph', async () => {
  const screen = await render(
    <>
      <Alert.Root data-testid="with-icon">
        <Alert.Icon data-testid="icon">
          <svg data-testid="glyph" viewBox="0 0 16 16" width="1em" height="1em" />
        </Alert.Icon>
        <Alert.Title>With icon</Alert.Title>
      </Alert.Root>
      <Alert.Root data-testid="empty-icon">
        <Alert.Icon />
        <Alert.Title>Empty icon</Alert.Title>
      </Alert.Root>
      <Alert.Root data-testid="no-icon">
        <Alert.Title>No icon</Alert.Title>
      </Alert.Root>
    </>,
  );
  const icon = screen.getByTestId('icon').element();
  expect(icon).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByTestId('glyph').element().parentElement).toBe(icon);
  expect(screen.getByTestId('empty-icon').element().querySelector('[aria-hidden]')).toBeNull();
  expect(screen.getByTestId('no-icon').element().querySelector('[aria-hidden]')).toBeNull();
});

test('public prop types expose tone and no className', () => {
  expectTypeOf<AlertTone>().toEqualTypeOf<'neutral' | 'accent' | 'highlight' | 'success' | 'warning' | 'danger'>();
  expectTypeOf<AlertRootProps>().not.toHaveProperty('className');
  expectTypeOf<AlertTitleProps>().not.toHaveProperty('className');
  expectTypeOf<AlertDescriptionProps>().not.toHaveProperty('className');
  expectTypeOf<AlertIconProps>().not.toHaveProperty('className');
  expectTypeOf<AlertRootProps>().toHaveProperty('tone');
  expectTypeOf<AlertTitleProps>().not.toHaveProperty('tone');
  expectTypeOf<AlertDescriptionProps>().not.toHaveProperty('tone');
  expectTypeOf<AlertIconProps>().not.toHaveProperty('tone');
  expectTypeOf<AlertRootProps>().toHaveProperty('render');
  expectTypeOf<AlertTitleProps>().toHaveProperty('render');
  expectTypeOf<AlertDescriptionProps>().not.toHaveProperty('render');
  expectTypeOf<AlertIconProps>().not.toHaveProperty('render');
  expectTypeOf<AlertRootProps>().toHaveProperty('style');
});
