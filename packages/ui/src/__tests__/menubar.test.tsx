import { createRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button, DropdownMenu, Menubar, type MenubarProps } from '@ultima/ui';

import { themeDocument, themes, violations } from './axe';

const styles = stylex.create({
  wide: { inlineSize: '640px' },
  override: { borderRadius: '0px' },
});

const MENUS = [
  { title: 'File', items: ['New', 'Open'] },
  { title: 'Edit', items: ['Undo', 'Redo'] },
  { title: 'View', items: ['Zoom in', 'Zoom out'] },
  { title: 'Help', items: ['Documentation', 'About'] },
];

function BarFixture({ orientation }: { orientation?: MenubarProps['orientation'] }) {
  return (
    <div {...stylex.props(styles.wide)}>
      <Menubar aria-label="Document" orientation={orientation} data-testid="bar">
        {MENUS.map(({ title, items }) => (
          <DropdownMenu.Root key={title}>
            <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" />}>{title}</DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Positioner>
                <DropdownMenu.Popup>
                  {items.map((item) => (
                    <DropdownMenu.Item key={item}>{item}</DropdownMenu.Item>
                  ))}
                  {title === 'File' && (
                    <DropdownMenu.SubmenuRoot>
                      <DropdownMenu.SubmenuTrigger>Recent</DropdownMenu.SubmenuTrigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Positioner>
                          <DropdownMenu.Popup>
                            <DropdownMenu.Item>Report.pdf</DropdownMenu.Item>
                          </DropdownMenu.Popup>
                        </DropdownMenu.Positioner>
                      </DropdownMenu.Portal>
                    </DropdownMenu.SubmenuRoot>
                  )}
                </DropdownMenu.Popup>
              </DropdownMenu.Positioner>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ))}
      </Menubar>
    </div>
  );
}

test('the bar renders, holds the menus it was given, and defaults to horizontal', async () => {
  await render(<BarFixture />);
  const bar = page.getByRole('menubar', { name: 'Document' }).element();
  expect(bar.tagName).toBe('DIV');
  expect(bar).toHaveAttribute('data-orientation', 'horizontal');
  expect(getComputedStyle(bar).flexDirection).toBe('row');
  for (const { title } of MENUS) {
    await expect.element(page.getByRole('menuitem', { name: title })).toBeVisible();
  }
});

test('the name resolves from either attribute, and render and ref reach the bar', async () => {
  const ref = createRef<HTMLDivElement>();
  const screen = await render(
    <>
      <Menubar aria-label="Document" />
      <h2 id="bar-heading">Editor</h2>
      <Menubar aria-labelledby="bar-heading" ref={ref} render={<div data-testid="custom" />} />
    </>,
  );
  expect(screen.getByRole('menubar', { name: 'Document' }).element()).toBeInTheDocument();
  const labelledBy = screen.getByRole('menubar', { name: 'Editor' }).element();
  expect(labelledBy).toBe(screen.getByTestId('custom').element());
  expect(ref.current).toBe(labelledBy);
});

test('the bar renders no ring; the triggers the caller rendered carry it', async () => {
  await render(<BarFixture />);
  const bar = page.getByRole('menubar', { name: 'Document' }).element();
  expect(getComputedStyle(bar).outlineStyle).toBe('none');
  expect(bar.tabIndex).toBeLessThan(0);

  await userEvent.tab();
  const file = page.getByRole('menuitem', { name: 'File' }).element();
  expect(document.activeElement).toBe(file);
  expect(getComputedStyle(bar).outlineStyle).toBe('none');
  expect(parseFloat(getComputedStyle(file).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(file).outlineStyle).toBe('solid');
});

test('arrows move between triggers, Home and End jump to the ends, and the roving stop loops', async () => {
  await render(<BarFixture />);
  const trigger = (name: string) => page.getByRole('menuitem', { name }).element();

  trigger('File').focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(trigger('Edit'));
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(trigger('File'));
  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(trigger('Help'));
  await userEvent.keyboard('{Home}');
  expect(document.activeElement).toBe(trigger('File'));
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(trigger('Help'));

  expect(trigger('Help').tabIndex).toBe(0);
  expect(trigger('File').tabIndex).toBe(-1);
});

test('orientation drives flex-direction, and the style slot wins over the paint', async () => {
  await render(<BarFixture orientation="vertical" />);
  const bar = page.getByRole('menubar', { name: 'Document' }).element();
  expect(bar).toHaveAttribute('data-orientation', 'vertical');
  expect(getComputedStyle(bar).flexDirection).toBe('column');
});

test('the style slot wins over the paint, and className is rejected', async () => {
  const screen = await render(<Menubar aria-label="Overridden" data-testid="plain" style={styles.override} />);
  const plain = screen.getByTestId('plain').element();
  expect(getComputedStyle(plain).borderRadius).toBe('0px');
  expect(getComputedStyle(plain).borderStyle).toBe('solid');
});

test('the bar type exposes the style slot, no className, and demands a name', () => {
  expectTypeOf<MenubarProps>().not.toHaveProperty('className');
  expectTypeOf<MenubarProps>().toHaveProperty('style');
  expectTypeOf<MenubarProps['orientation']>().toEqualTypeOf<'horizontal' | 'vertical' | undefined>();

  // @ts-expect-error a bar with neither aria-label nor aria-labelledby is rejected
  const unnamed = <Menubar />;
  expect(unnamed).toBeTruthy();
  expect(<Menubar aria-label="Named" />).toBeTruthy();
  expect(<Menubar aria-labelledby="bar-heading" />).toBeTruthy();
});

test('the box is tight around its triggers and wears no shadow', async () => {
  await render(<BarFixture />);
  const bar = page.getByRole('menubar', { name: 'Document' }).element();
  const parent = bar.parentElement as HTMLElement;

  expect(parent.clientWidth).toBe(640);
  expect(bar.getBoundingClientRect().width).toBeLessThan(parent.clientWidth);
  const last = page.getByRole('menuitem', { name: 'Help' }).element().getBoundingClientRect();
  expect(bar.getBoundingClientRect().right - last.right).toBeLessThan(8);
  expect(getComputedStyle(bar).boxShadow).toBe('none');
});

for (const mode of themes) {
  test(`the bar has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    await render(
      <main>
        <BarFixture />
      </main>,
    );

    expect(await violations()).toEqual([]);
  });
}
