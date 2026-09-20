import * as stylex from '@stylexjs/stylex';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Resizable,
  useResizable,
  type ResizableHandleProps,
  type ResizableOrientation,
  type ResizablePanelProps,
  type ResizableRootProps,
} from '@ultima/ui';

import { themeDocument, themes, violations } from './axe';

const styles = stylex.create({
  bounds: { blockSize: '400px', inlineSize: '640px' },
  override: { backgroundColor: 'transparent' },
});

function SplitFixture({ orientation = 'horizontal' }: { orientation?: ResizableOrientation }) {
  return (
    <div {...stylex.props(styles.bounds)}>
      <Resizable.Root orientation={orientation} panels={[{ id: 'nav' }, { id: 'main' }]}>
        <Resizable.Panel id="nav">Navigation</Resizable.Panel>
        <Resizable.Handle id="nav:main" aria-label="Resize navigation">
          <Resizable.HandleIndicator />
        </Resizable.Handle>
        <Resizable.Panel id="main">Content</Resizable.Panel>
      </Resizable.Root>
    </div>
  );
}

test('the splitter renders its panels and a separator between them, defaulting to horizontal', async () => {
  await render(<SplitFixture />);
  const handle = page.getByRole('separator', { name: 'Resize navigation' }).element();
  const root = handle.parentElement as HTMLElement;
  expect(root).toHaveAttribute('data-part', 'root');
  expect(getComputedStyle(root).display).toBe('flex');
  expect(getComputedStyle(root).flexDirection).toBe('row');
  expect(handle).toHaveAttribute('aria-orientation', 'horizontal');
  expect(handle).toHaveAttribute('aria-valuemin');
  expect(handle).toHaveAttribute('aria-valuemax');
  expect(handle.getAttribute('aria-controls')).toContain('nav');
  expect(handle.getAttribute('aria-controls')).toContain('main');
});

test('useResizable outside Root throws, and inside it hands back the machine api', async () => {
  function Outside() {
    useResizable();
    return null;
  }
  await expect(render(<Outside />)).rejects.toThrowError('useResizable must be used inside Resizable.Root');

  let sizes: number[] | undefined;
  function Reader() {
    const api = useResizable();
    sizes = api.getSizes();
    return null;
  }
  await render(
    <Resizable.Root panels={[{ id: 'a' }, { id: 'b' }]}>
      <Resizable.Panel id="a" />
      <Resizable.Handle id="a:b" aria-label="Between" />
      <Resizable.Panel id="b" />
      <Reader />
    </Resizable.Root>,
  );
  expect(sizes?.length).toBe(2);
});

test('the name resolves from aria-labelledby too', async () => {
  await render(
    <div {...stylex.props(styles.bounds)}>
      <h2 id="split-label">Editor panes</h2>
      <Resizable.Root panels={[{ id: 'a' }, { id: 'b' }]}>
        <Resizable.Panel id="a" />
        <Resizable.Handle id="a:b" aria-labelledby="split-label" />
        <Resizable.Panel id="b" />
      </Resizable.Root>
    </div>,
  );
  await expect.element(page.getByRole('separator', { name: 'Editor panes' })).toBeVisible();
});

test('keyboard focus lands the ring on the handle, and root and panel render none', async () => {
  await render(<SplitFixture />);
  await userEvent.tab();
  const handle = page.getByRole('separator', { name: 'Resize navigation' }).element();
  expect(document.activeElement).toBe(handle);
  expect(getComputedStyle(handle).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(handle).outlineWidth)).toBeGreaterThan(0);

  const root = handle.parentElement as HTMLElement;
  const panel = handle.previousElementSibling as HTMLElement;
  expect(getComputedStyle(root).outlineStyle).toBe('none');
  expect(getComputedStyle(panel).outlineStyle).toBe('none');
});

test('arrows resize the boundary by keyboardResizeBy pixels and F6 cycles the handles', async () => {
  await render(
    <div {...stylex.props(styles.bounds)}>
      <Resizable.Root panels={[{ id: 'a' }, { id: 'b' }, { id: 'c' }]} keyboardResizeBy={10}>
        <Resizable.Panel id="a" />
        <Resizable.Handle id="a:b" aria-label="First boundary" />
        <Resizable.Panel id="b" />
        <Resizable.Handle id="b:c" aria-label="Second boundary" />
        <Resizable.Panel id="c" />
      </Resizable.Root>
    </div>,
  );
  const first = page.getByRole('separator', { name: 'First boundary' }).element();
  const before = Number(first.getAttribute('aria-valuenow'));
  // The machine drops keyboard input until its first root measurement lands; the
  // panel flex share flips from '1' to the resolved value once it has.
  const panelA = document.querySelector('[data-part="panel"][data-id="a"]') as HTMLElement;
  await vi.waitFor(() => {
    expect(panelA.style.flexGrow).not.toBe('1');
  });
  // Every root ResizeObserver delivery re-syncs panel sizes and can reset a
  // resize that lands between deliveries; wait for a quiet window first.
  const root = first.parentElement as HTMLElement;
  let lastDelivery = Date.now();
  const observer = new ResizeObserver(() => {
    lastDelivery = Date.now();
  });
  observer.observe(root);
  await vi.waitFor(() => {
    expect(Date.now() - lastDelivery).toBeGreaterThan(250);
  });
  observer.disconnect();
  first.focus();
  await userEvent.keyboard('{ArrowRight}');
  await vi.waitFor(
    () => {
      expect(Number(first.getAttribute('aria-valuenow'))).toBeGreaterThan(before);
    },
    { timeout: 3000 },
  );

  await userEvent.keyboard('{F6}');
  await vi.waitFor(() => {
    expect(document.activeElement).toBe(page.getByRole('separator', { name: 'Second boundary' }).element());
  });
});

test('orientation drives the layout axis and flips the bar', async () => {
  await render(<SplitFixture orientation="vertical" />);
  const handle = page.getByRole('separator', { name: 'Resize navigation' }).element();
  const root = handle.parentElement as HTMLElement;
  expect(root).toHaveAttribute('data-orientation', 'vertical');
  expect(getComputedStyle(root).flexDirection).toBe('column');
  expect(handle).toHaveAttribute('aria-orientation', 'vertical');
  expect(getComputedStyle(handle).blockSize).toBe('1px');
  expect(getComputedStyle(handle).inlineSize).toBe('640px');
});

test('the handle paints a hairline and stretches its hit area past it', async () => {
  await render(<SplitFixture />);
  const handle = page.getByRole('separator', { name: 'Resize navigation' }).element();
  expect(getComputedStyle(handle).inlineSize).toBe('1px');
  expect(getComputedStyle(handle).blockSize).toBe('400px');

  const stretch = getComputedStyle(handle, '::before');
  expect(parseFloat(stretch.insetInlineStart)).toBeLessThan(0);
  expect(stretch.position).toBe('absolute');

  expect(getComputedStyle(handle).touchAction).toBe('none');
  const panel = handle.previousElementSibling as HTMLElement;
  expect(getComputedStyle(panel).overflow).toBe('hidden');
});

test('the style slot merges on top of the paint', async () => {
  await render(
    <div {...stylex.props(styles.bounds)}>
      <Resizable.Root panels={[{ id: 'a' }, { id: 'b' }]}>
        <Resizable.Panel id="a" />
        <Resizable.Handle id="a:b" aria-label="Boundary" data-testid="handle" style={styles.override} />
        <Resizable.Panel id="b" />
      </Resizable.Root>
    </div>,
  );
  const handle = page.getByTestId('handle').element();
  expect(getComputedStyle(handle).backgroundColor).toBe('rgba(0, 0, 0, 0)');
});

test('the handle type demands a name and the parts take no className', () => {
  expectTypeOf<ResizableHandleProps>().not.toHaveProperty('className');
  expectTypeOf<ResizableHandleProps>().toHaveProperty('style');
  expectTypeOf<ResizableRootProps>().not.toHaveProperty('className');
  expectTypeOf<ResizablePanelProps>().not.toHaveProperty('className');
  expectTypeOf<ResizableRootProps['orientation']>().toEqualTypeOf<ResizableOrientation | undefined>();
  expectTypeOf<ResizableRootProps['panels']>().not.toBeUndefined();

  // @ts-expect-error a boundary with neither aria-label nor aria-labelledby is rejected
  const unnamed = <Resizable.Handle id="a:b" />;
  expect(unnamed).toBeTruthy();
  expect(<Resizable.Handle id="a:b" aria-label="Resize" />).toBeTruthy();
  expect(<Resizable.Handle id="a:b" aria-labelledby="label" />).toBeTruthy();
});

for (const mode of themes) {
  test(`the splitter has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    await render(
      <main>
        <SplitFixture />
      </main>,
    );

    expect(await violations()).toEqual([]);
  });
}
