import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import {
  Avatar,
  type AvatarFallbackProps,
  type AvatarImageProps,
  type AvatarRootProps,
} from '@ultima/ui';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

const PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const BROKEN = 'data:image/gif;base64,not-a-real-gif';

const styles = stylex.create({
  larger: { inlineSize: space['--ult-space-12'], blockSize: space['--ult-space-12'] },
});

test('an avatar with no props renders its fallback inside the circle', async () => {
  const screen = await render(
    <Avatar.Root data-testid="root">
      <Avatar.Fallback>FR</Avatar.Fallback>
    </Avatar.Root>,
  );
  const root = screen.getByTestId('root').element();
  expect(root.tagName).toBe('SPAN');
  await expect.element(screen.getByText('FR')).toBeVisible();
  const computed = getComputedStyle(root);
  expect(computed.display).toBe('inline-flex');
  expect(computed.overflow).toBe('hidden');
});

test('the fallback initials track the box through the container query', async () => {
  const screen = await render(
    <Avatar.Root data-testid="root" style={styles.larger}>
      <Avatar.Fallback data-testid="fallback">FR</Avatar.Fallback>
    </Avatar.Root>,
  );
  const box = parseFloat(getComputedStyle(screen.getByTestId('root').element()).inlineSize);
  const fontSize = parseFloat(
    getComputedStyle(screen.getByTestId('fallback').element()).fontSize,
  );
  expect(fontSize).toBeCloseTo(box * 0.4, 1);
});

test('the root carries no role and the image is named by alt once loaded', async () => {
  const screen = await render(
    <Avatar.Root data-testid="root">
      <Avatar.Fallback>FR</Avatar.Fallback>
      <Avatar.Image src={PIXEL} alt="Frankie" />
    </Avatar.Root>,
  );
  const root = screen.getByTestId('root').element();
  expect(root).not.toHaveAttribute('role');
  expect(root).not.toHaveAttribute('aria-label');
  await expect.element(screen.getByRole('img', { name: 'Frankie' })).toBeInTheDocument();
  await expect.element(screen.getByText('FR')).not.toBeInTheDocument();
});

test('no part is focusable or draws a focus ring', async () => {
  const screen = await render(
    <Avatar.Root data-testid="root">
      <Avatar.Fallback data-testid="fallback">FR</Avatar.Fallback>
      <Avatar.Image data-testid="image" src={BROKEN} alt="Frankie" keepMounted />
    </Avatar.Root>,
  );
  for (const part of ['root', 'fallback', 'image']) {
    const element = screen.getByTestId(part).element();
    expect(element).not.toHaveAttribute('tabindex');
    expect(getComputedStyle(element).outlineStyle).toBe('none');
  }
});

test('the primitive reports the loading status and mounts the loaded image', async () => {
  const statuses: string[] = [];
  const screen = await render(
    <Avatar.Root>
      <Avatar.Fallback>FR</Avatar.Fallback>
      <Avatar.Image
        src={PIXEL}
        alt="Frankie"
        onLoadingStatusChange={(status) => statuses.push(status)}
      />
    </Avatar.Root>,
  );
  await expect.element(screen.getByRole('img', { name: 'Frankie' })).toBeInTheDocument();
  expect(statuses).toContain('loaded');
});

test('a kept-mounted lazy image stays displayable and hidden while it loads', async () => {
  const screen = await render(
    <div style={{ paddingBlockStart: 20000 }}>
      <Avatar.Root>
        <Avatar.Fallback>FR</Avatar.Fallback>
        <Avatar.Image
          data-testid="image"
          src="/missing-avatar.png"
          alt="Frankie"
          keepMounted
          loading="lazy"
        />
      </Avatar.Root>
    </div>,
  );
  const image = screen.getByTestId('image').element();
  await expect.poll(() => image.hasAttribute('data-loading')).toBe(true);
  let computed = getComputedStyle(image);
  expect(computed.display).not.toBe('none');
  expect(computed.visibility).toBe('hidden');
  image.scrollIntoView();
  await expect.poll(() => image.hasAttribute('data-error')).toBe(true);
  computed = getComputedStyle(image);
  expect(computed.display).not.toBe('none');
  expect(computed.visibility).toBe('hidden');
});

test('a kept-mounted image drops the hide once it loads', async () => {
  const screen = await render(
    <Avatar.Root>
      <Avatar.Fallback>FR</Avatar.Fallback>
      <Avatar.Image data-testid="image" src={PIXEL} alt="Frankie" keepMounted />
    </Avatar.Root>,
  );
  const image = screen.getByTestId('image').element();
  await expect.poll(
    () => !image.hasAttribute('data-loading') && !image.hasAttribute('data-error'),
  ).toBe(true);
  expect(getComputedStyle(image).visibility).toBe('visible');
});

test('a kept-mounted broken image is marked data-error and hidden', async () => {
  const screen = await render(
    <Avatar.Root>
      <Avatar.Fallback>FR</Avatar.Fallback>
      <Avatar.Image data-testid="image" src={BROKEN} alt="Frankie" keepMounted />
    </Avatar.Root>,
  );
  const image = screen.getByTestId('image').element();
  await expect.poll(() => image.hasAttribute('data-error')).toBe(true);
  expect(getComputedStyle(image).visibility).toBe('hidden');
});

test('the prop types carry the style slot, no className, and none of the declined props', () => {
  expectTypeOf<AvatarRootProps>().toHaveProperty('style');
  expectTypeOf<AvatarRootProps>().not.toHaveProperty('className');
  expectTypeOf<AvatarRootProps>().not.toHaveProperty('size');
  expectTypeOf<AvatarRootProps>().not.toHaveProperty('shape');
  expectTypeOf<AvatarRootProps>().not.toHaveProperty('radius');
  expectTypeOf<AvatarImageProps>().toHaveProperty('style');
  expectTypeOf<AvatarImageProps>().not.toHaveProperty('className');
  expectTypeOf<AvatarFallbackProps>().toHaveProperty('style');
  expectTypeOf<AvatarFallbackProps>().not.toHaveProperty('className');
  expectTypeOf<AvatarFallbackProps>().not.toHaveProperty('name');
});
