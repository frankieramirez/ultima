import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import * as stylex from '@stylexjs/stylex';
import { ScrollArea, type ScrollAreaThumbProps } from '@ultima/ui';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

const styles = stylex.create({
  bound: { blockSize: '9rem', inlineSize: '18rem' },
  tall: { blockSize: '36rem' },
  wide: { inlineSize: '36rem', blockSize: '36rem' },
});

const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

function Sample() {
  return (
    <ScrollArea.Root data-testid="root" style={styles.bound}>
      <ScrollArea.Viewport data-testid="viewport">
        <ScrollArea.Content data-testid="content">
          <div {...stylex.props(styles.tall)}>Release notes</div>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar data-testid="scrollbar">
        <ScrollArea.Thumb data-testid="thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

function BothAxes() {
  return (
    <ScrollArea.Root data-testid="root" style={styles.bound}>
      <ScrollArea.Viewport data-testid="viewport">
        <ScrollArea.Content data-testid="content">
          <div {...stylex.props(styles.wide)}>Wide and tall</div>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar data-testid="scrollbar-y">
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar data-testid="scrollbar-x" orientation="horizontal">
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner data-testid="corner" />
    </ScrollArea.Root>
  );
}

test('a scroll area renders its content with no props', async () => {
  const screen = await render(
    <ScrollArea.Root>
      <ScrollArea.Viewport>
        <ScrollArea.Content>Plain text</ScrollArea.Content>
      </ScrollArea.Viewport>
    </ScrollArea.Root>,
  );
  await expect.element(screen.getByText('Plain text')).toBeVisible();
});

test('the structural parts are presentational and the viewport is unnamed', async () => {
  const screen = await render(<BothAxes />);
  const viewport = screen.getByTestId('viewport').element();
  await expect.element(screen.getByTestId('scrollbar-y')).toBeInTheDocument();
  await expect.element(screen.getByTestId('corner')).toBeInTheDocument();

  expect(screen.container.querySelectorAll('[role="presentation"]')).toHaveLength(3);
  for (const testid of ['root', 'viewport', 'content']) {
    expect(screen.getByTestId(testid).element()).toHaveAttribute('role', 'presentation');
  }
  expect(screen.getByTestId('scrollbar-y').element()).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByTestId('corner').element()).toHaveAttribute('aria-hidden', 'true');
  expect(viewport).not.toHaveAttribute('aria-label');
  expect(viewport).not.toHaveAttribute('aria-labelledby');
});

function Fitting() {
  return (
    <ScrollArea.Root style={styles.bound}>
      <ScrollArea.Viewport data-testid="viewport">
        <ScrollArea.Content>Short</ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

test('the scrollbar mounts only while its axis overflows', async () => {
  const screen = await render(<Sample />);
  const scrollbar = await waitForPart(screen, 'scrollbar');
  expect(scrollbar).toHaveAttribute('data-orientation', 'vertical');
});

test('a scrollbar whose axis fits stays unmounted', async () => {
  const screen = await render(<Fitting />);
  await expect.poll(() => screen.container.querySelector('[data-orientation]')).toBeNull();
  expect(screen.container.querySelectorAll('[role="presentation"]')).toHaveLength(3);
});

async function waitForPart(screen: Awaited<ReturnType<typeof render>>, testid: string) {
  const locator = screen.getByTestId(testid);
  await expect.element(locator).toBeInTheDocument();
  return locator.element();
}

for (const mode of themes) {
  test(`the viewport draws the focus ring on keyboard focus in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Sample />
      </div>,
    );
    const viewport = screen.getByTestId('viewport').element();
    await userEvent.tab();
    expect(document.activeElement).toBe(viewport);
    const ring = getComputedStyle(viewport);
    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineWidth).not.toBe('0px');
  });
}

test('a pointer-focused viewport shows no ring', async () => {
  const screen = await render(<Sample />);
  const viewport = screen.getByTestId('viewport').element();
  await userEvent.click(viewport);
  expect(document.activeElement).toBe(viewport);
  expect(getComputedStyle(viewport).outlineStyle).toBe('none');
});

test('an overflowing viewport is a tab stop whose content overflows', async () => {
  const screen = await render(<Sample />);
  const viewport = screen.getByTestId('viewport').element();
  await expect.poll(() => viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
  expect(viewport).toHaveAttribute('tabindex', '0');
});

test('a fitting viewport stays out of the tab order', async () => {
  const screen = await render(<Fitting />);
  expect(screen.getByTestId('viewport').element()).toHaveAttribute('tabindex', '-1');
});

test('the thumb darkens while a pointer is over the area', async () => {
  const screen = await render(<Sample />);
  const thumb = (await waitForPart(screen, 'thumb')) as HTMLElement;
  const resting = getComputedStyle(thumb).backgroundColor;

  await userEvent.hover(screen.getByTestId('root').element());
  const scrollbar = screen.getByTestId('scrollbar').element();
  await expect.poll(() => scrollbar.hasAttribute('data-hovering')).toBe(true);
  await expect.poll(() => getComputedStyle(thumb).backgroundColor !== resting).toBe(true);
});

test('the thumb darkens while the area scrolls', async () => {
  const screen = await render(<Sample />);
  const thumb = (await waitForPart(screen, 'thumb')) as HTMLElement;
  const resting = getComputedStyle(thumb).backgroundColor;

  const viewport = screen.getByTestId('viewport').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(viewport);
  await userEvent.keyboard('{ArrowDown}');

  const scrollbar = screen.getByTestId('scrollbar').element();
  await expect.poll(() => scrollbar.hasAttribute('data-scrolling'), { timeout: 400 }).toBe(true);
  await expect.poll(() => getComputedStyle(thumb).backgroundColor !== resting).toBe(true);
});

test('a horizontal scrollbar joins the vertical one and a corner fills the intersection', async () => {
  const screen = await render(<BothAxes />);
  const horizontal = await waitForPart(screen, 'scrollbar-x');
  expect(horizontal).toHaveAttribute('data-orientation', 'horizontal');
  expect(screen.getByTestId('scrollbar-y').element()).toHaveAttribute('data-orientation', 'vertical');
  expect(screen.getByTestId('corner').element()).toHaveAttribute('aria-hidden', 'true');
});

test('the horizontal thumb rides its track from the start edge', async () => {
  const screen = await render(<BothAxes />);
  const horizontal = (await waitForPart(screen, 'scrollbar-x')) as HTMLElement;
  const thumb = horizontal.firstElementChild as HTMLElement;
  await expect.poll(() => thumb.offsetWidth).toBeGreaterThan(0);
  expect(thumb.offsetLeft).toBeLessThan(20);
});

test('the thumb type exposes the style slot and no className', () => {
  expectTypeOf<ScrollAreaThumbProps>().not.toHaveProperty('className');
  expectTypeOf<ScrollAreaThumbProps>().toHaveProperty('style');
});
