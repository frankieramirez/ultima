import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Tooltip,
  type TooltipArrowProps,
  type TooltipPopupProps,
  type TooltipPositionerProps,
  type TooltipShortcutProps,
  type TooltipTriggerProps,
} from '@ultima/ui';

import { expectArrowOnEdge, resolved } from './overlay';
import { themeDocument, themes, violations } from './axe';
import { parkPointer } from './setup';

function OpenTooltip({ text = 'Copied to clipboard' }: { text?: string }) {
  return (
    <Tooltip.Provider delay={0}>
      <Tooltip.Root defaultOpen>
        <Tooltip.Trigger aria-label={text} render={<button type="button" />}>
          Copy
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup data-testid="popup">
              <Tooltip.Arrow />
              <Tooltip.Viewport>{text}</Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

test('mounts with a native button in the trigger slot', async () => {
  const screen = await render(
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger aria-label="Copy" render={<button type="button" />}>
          Copy
        </Tooltip.Trigger>
      </Tooltip.Root>
    </Tooltip.Provider>,
  );
  await expect.element(screen.getByRole('button', { name: 'Copy' })).toBeVisible();
});

test('opening yields a tooltip named by its text and the trigger carries aria-label', async () => {
  const screen = await render(<OpenTooltip />);
  await expect.element(screen.getByRole('tooltip', { name: 'Copied to clipboard' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Copied to clipboard' }).element()).toHaveAttribute(
    'aria-label',
    'Copied to clipboard',
  );
});

test('the arrow straddles the edge facing the trigger', async () => {
  const screen = await render(
    <div style={{ paddingBlockStart: 120 }}>
      <Tooltip.Provider delay={0}>
        <Tooltip.Root defaultOpen>
          <Tooltip.Trigger aria-label="Copy" render={<button type="button" />}>
            Copy
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={8}>
              <Tooltip.Popup data-testid="popup">
                <Tooltip.Arrow data-testid="arrow" />
                Copy
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>,
  );
  await expect.element(screen.getByTestId('popup')).toBeVisible();
  await expect.poll(() => getComputedStyle(screen.getByTestId('popup').element()).opacity).toBe('1');
  expectArrowOnEdge(screen.getByTestId('arrow').element(), screen.getByTestId('popup').element(), 'down');
});

// #944: a Viewport pins the popup to the positioner's far edge on a top or left side, so a
// positioner that ignores the size the Viewport measures collapses the popup to nothing.
for (const side of ['top', 'left', 'bottom'] as const) {
  test(`a ${side}-side tooltip inside a Viewport stays on one line and centres on its trigger`, async () => {
    const screen = await render(
      <div style={{ paddingBlock: 160, paddingInline: 320 }}>
        <Tooltip.Provider delay={0}>
          <Tooltip.Root defaultOpen>
            <Tooltip.Trigger aria-label="Add to library" render={<button type="button" />}>
              Add
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner side={side} sideOffset={8}>
                <Tooltip.Popup data-testid="popup">
                  <Tooltip.Arrow />
                  <Tooltip.Viewport>Add to library</Tooltip.Viewport>
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>,
    );
    const popup = screen.getByTestId('popup').element();
    await expect.poll(() => getComputedStyle(popup).opacity).toBe('1');
    const style = getComputedStyle(popup);
    const oneLine =
      parseFloat(style.lineHeight) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) * 2;
    const box = popup.getBoundingClientRect();
    expect(box.height).toBeLessThanOrEqual(oneLine + 1);
    const trigger = screen.getByRole('button', { name: 'Add to library' }).element().getBoundingClientRect();
    if (side === 'left') {
      expect(Math.abs((box.top + box.bottom) / 2 - (trigger.top + trigger.bottom) / 2)).toBeLessThan(1);
      expect(box.right).toBeLessThanOrEqual(trigger.left);
    } else {
      expect(Math.abs((box.left + box.right) / 2 - (trigger.left + trigger.right) / 2)).toBeLessThan(1);
      if (side === 'top') expect(box.bottom).toBeLessThanOrEqual(trigger.top);
      else expect(box.top).toBeGreaterThanOrEqual(trigger.bottom);
    }
  });
}

test('a shortcut follows the label in the subtle ink, tracked, on the same line', async () => {
  const screen = await render(
    <Tooltip.Provider delay={0}>
      <Tooltip.Root defaultOpen>
        <Tooltip.Trigger aria-label="Search" aria-keyshortcuts="Meta+K" render={<button type="button" />}>
          Search
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup data-testid="popup">
              <Tooltip.Viewport>
                <span data-testid="label">Search</span>
                <Tooltip.Shortcut data-testid="shortcut">⌘K</Tooltip.Shortcut>
              </Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>,
  );
  await expect.element(screen.getByTestId('shortcut')).toBeVisible();
  const shortcut = screen.getByTestId('shortcut').element();
  const style = getComputedStyle(shortcut);
  expect(style.color).toBe(resolved('color', 'var(--ult-color-text-subtle)'));
  expect(style.fontSize).toBe(resolved('font-size', 'var(--ult-text-2)'));
  expect(style.letterSpacing).not.toBe('normal');
  expect(style.whiteSpace).toBe('nowrap');
  const label = screen.getByTestId('label').element().getBoundingClientRect();
  const keys = shortcut.getBoundingClientRect();
  expect(keys.left - label.right).toBeGreaterThanOrEqual(parseFloat(resolved('width', 'var(--ult-space-4)')) - 0.5);
  expect(Math.abs(keys.top - label.top)).toBeLessThan(2);
});

test('the popup has no outline', async () => {
  const screen = await render(<OpenTooltip />);
  const popup = screen.getByTestId('popup').element();
  expect(getComputedStyle(popup).outlineWidth).toBe('0px');
});

test('focusing the trigger opens the tooltip and Escape closes it', async () => {
  const text = 'Keyboard tooltip';
  const screen = await render(
    <Tooltip.Provider delay={0} closeDelay={0}>
      <Tooltip.Root>
        <Tooltip.Trigger aria-label={text} render={<button type="button" />}>
          Copy
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>{text}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>,
  );
  const tooltip = screen.getByRole('tooltip', { name: text });
  // delay={0} opens on hover. A leftover pointer from the previous file would already
  // be sitting on this trigger; park it so the keyboard path starts from closed.
  await parkPointer();
  expect(tooltip.query()).toBeNull();
  await userEvent.tab();
  await expect.element(tooltip).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => tooltip.query()).toBeNull();
});

test('data-starting-style sets opacity to 0', async () => {
  const screen = await render(<OpenTooltip />);
  const popup = screen.getByTestId('popup').element();
  popup.style.transitionDuration = '0s';
  popup.setAttribute('data-starting-style', '');
  expect(getComputedStyle(popup).opacity).toBe('0');
});

test('public prop types require aria-label on Trigger and drop className on styled parts', () => {
  expectTypeOf<TooltipTriggerProps>().toHaveProperty('aria-label');
  expectTypeOf<TooltipTriggerProps['aria-label']>().toEqualTypeOf<string>();
  expectTypeOf<TooltipTriggerProps>().not.toHaveProperty('className');
  expectTypeOf<TooltipPopupProps>().not.toHaveProperty('className');
  expectTypeOf<TooltipPositionerProps>().not.toHaveProperty('className');
  expectTypeOf<TooltipArrowProps>().not.toHaveProperty('className');
  expectTypeOf<TooltipPopupProps>().toHaveProperty('style');
  expectTypeOf<TooltipShortcutProps>().not.toHaveProperty('className');
  expectTypeOf<TooltipShortcutProps>().toHaveProperty('style');
});

for (const mode of themes) {
  test(`the open popup has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <OpenTooltip />
      </main>,
    );
    await expect.element(screen.getByRole('tooltip', { name: 'Copied to clipboard' })).toBeVisible();

    expect(await violations(screen.getByTestId('popup').element())).toEqual([]);
  });
}
