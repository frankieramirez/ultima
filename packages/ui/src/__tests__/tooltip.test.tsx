import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Tooltip,
  type TooltipArrowProps,
  type TooltipPopupProps,
  type TooltipPositionerProps,
  type TooltipTriggerProps,
} from '@ultima/ui';

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
