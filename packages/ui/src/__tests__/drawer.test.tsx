/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so one tree holding all fifteen parts, and the no-props
 *    default is Base UI's `down`, with the swipe area defaulting to the opposite of it.
 * 2. The name resolves from a rendered Title, and the Description describes the popup. Both are
 *    Dialog's own components, so this is Dialog's row.
 * 3. The focus ring lands on what the consumer renders into Close, and the popup itself has
 *    `outline: none` the way Dialog's does.
 * 4. The primitive is still wired: Tab loops inside the popup, Escape closes it, and focus
 *    returns to the trigger.
 * 5. Documented state drives its style: `data-swipe-direction` places the panel on all four
 *    edges, and `data-swiping` carries the backdrop's zero duration.
 * 6. Typecheck passes: className is rejected on every styled part, and the three parts that
 *    render no element expose no style slot.
 * 7. Not this component. Ultima wires no behavior here: the gestures, the focus manager, and the
 *    dismissal are all the primitive's, which is item 4.
 * 8. CSS the primitive reads, and it is heavier here than anywhere: the popup's resting transform
 *    reads the swipe-movement variables, its height carries the `auto` fallback, the backdrop's
 *    opacity reads the swipe progress and drops to a zero duration mid-gesture, the viewport is
 *    `position: fixed` with no `overflow`, and the swipe area has a non-zero box.
 *
 * Two behaviors sit outside the bar and are not faked. The touch swipe runs on a document-level
 * non-passive listener a desktop Chromium viewport cannot reach, and the Android back gesture is
 * `CloseWatcher`, which is Android-gated. Asserting the CSS whose absence breaks each is the
 * coverage, which is what item 8 is for.
 */
import type { ReactNode } from 'react';
import { expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Button,
  Drawer,
  type DrawerBackdropProps,
  type DrawerDescriptionProps,
  type DrawerIndentProps,
  type DrawerPopupProps,
  type DrawerProviderProps,
  type DrawerSwipeAreaProps,
  type DrawerTitleProps,
  type DrawerViewportProps,
} from '@ultima/ui';
import source from '../drawer?raw';

import { themeDocument, themes, violations } from './axe';

type Direction = 'up' | 'down' | 'left' | 'right';

function SampleDrawer({
  open,
  swipeDirection,
  title = 'Filters',
  extra,
}: {
  open?: boolean;
  swipeDirection?: Direction;
  title?: string;
  extra?: ReactNode;
}) {
  return (
    <Drawer.Provider>
      <Drawer.IndentBackground data-testid="indent-background" />
      <Drawer.Indent data-testid="indent">
        <Drawer.Root defaultOpen={open} swipeDirection={swipeDirection}>
          <Drawer.VirtualKeyboardProvider>
            <Drawer.Trigger render={<Button />} data-testid="trigger">
              Open
            </Drawer.Trigger>
            <Drawer.SwipeArea data-testid="swipe-area" />
            <Drawer.Portal>
              <Drawer.Backdrop data-testid="backdrop" />
              <Drawer.Viewport data-testid="viewport">
                <Drawer.Popup data-testid="popup">
                  <Drawer.Content data-testid="content">
                    <Drawer.Title>{title}</Drawer.Title>
                    <Drawer.Description>Narrow the report to one team.</Drawer.Description>
                    {extra}
                    <Drawer.Close render={<Button variant="ghost" />}>Done</Drawer.Close>
                  </Drawer.Content>
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.VirtualKeyboardProvider>
        </Drawer.Root>
      </Drawer.Indent>
    </Drawer.Provider>
  );
}

test('every part renders, and no prop is needed to reach the declared default', async () => {
  const screen = await render(<SampleDrawer open />);

  for (const part of ['indent-background', 'indent', 'trigger', 'swipe-area']) {
    expect(screen.getByTestId(part).element()).toBeTruthy();
  }
  for (const part of ['backdrop', 'viewport', 'popup', 'content']) {
    expect(page.getByTestId(part).element()).toBeTruthy();
  }
  await expect.element(page.getByRole('button', { name: 'Done' })).toBeVisible();

  expect(page.getByTestId('popup').element().getAttribute('data-swipe-direction')).toBe('down');
  expect(screen.getByTestId('swipe-area').element().getAttribute('data-swipe-direction')).toBe('up');
});

test('the namespace carries all fifteen parts and the handle pair, and imports no sibling component', () => {
  expect(Object.keys(Drawer)).toEqual([
    'Root',
    'Provider',
    'Trigger',
    'Portal',
    'Backdrop',
    'Viewport',
    'Popup',
    'Content',
    'Title',
    'Description',
    'Close',
    'Indent',
    'IndentBackground',
    'SwipeArea',
    'VirtualKeyboardProvider',
    'Handle',
    'createHandle',
  ]);

  const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, specifier]) => specifier);
  expect([...new Set(imports)].sort()).toEqual([
    '@base-ui/react/drawer',
    '@stylexjs/stylex',
    '@ultima/tokens/tokens.stylex',
    '@ultima/ui/lib/component',
    'react',
  ]);
});

test('the popup is a dialog named by Title and described by Description', async () => {
  const screen = await render(<SampleDrawer open title="Choose a team" />);
  void screen;

  const popup = page.getByRole('dialog', { name: 'Choose a team' });
  await expect.element(popup).toBeVisible();
  expect(popup.element()).toHaveAccessibleDescription('Narrow the report to one team.');
});

test('the ring is on the element rendered into Close, and the popup declares none', async () => {
  const screen = await render(<SampleDrawer open />);
  void screen;

  const popup = page.getByTestId('popup').element();
  popup.focus();
  expect(document.activeElement).toBe(popup);
  expect(getComputedStyle(popup).outlineWidth).toBe('0px');

  const close = page.getByRole('button', { name: 'Done' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(close);
  expect(parseFloat(getComputedStyle(close).outlineWidth)).toBeGreaterThan(0);
});

test('Tab loops inside the popup, Escape closes it, and focus returns to the trigger', async () => {
  const screen = await render(<SampleDrawer extra={<Button data-testid="inside">Apply</Button>} />);
  const trigger = screen.getByRole('button', { name: 'Open' }).element();

  await userEvent.click(trigger);
  await expect.element(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();

  const inside = page.getByTestId('inside').element();
  const close = page.getByRole('button', { name: 'Done' }).element();
  inside.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(close);
  await userEvent.tab();
  // Tabbing past the last tabbable lands on the focus guard for a frame before the
  // manager redirects to the first; poll for the settled element like select does.
  await expect.poll(() => document.activeElement).toBe(inside);

  await userEvent.keyboard('{Escape}');
  await expect.poll(() => page.getByRole('dialog').query()).toBeNull();
  await expect.poll(() => document.activeElement).toBe(trigger);
});

const EDGE: Record<Direction, (popup: DOMRect, viewport: DOMRect) => void> = {
  down: (popup, viewport) => {
    expect(popup.bottom).toBeCloseTo(viewport.bottom, 0);
    expect(popup.width).toBeCloseTo(viewport.width, 0);
  },
  up: (popup, viewport) => {
    expect(popup.top).toBeCloseTo(viewport.top, 0);
    expect(popup.width).toBeCloseTo(viewport.width, 0);
  },
  left: (popup, viewport) => {
    expect(popup.left).toBeCloseTo(viewport.left, 0);
    expect(popup.height).toBeCloseTo(viewport.height, 0);
  },
  right: (popup, viewport) => {
    expect(popup.right).toBeCloseTo(viewport.right, 0);
    expect(popup.height).toBeCloseTo(viewport.height, 0);
  },
};

for (const direction of ['down', 'up', 'left', 'right'] as const) {
  test(`data-swipe-direction="${direction}" places the panel on the matching edge`, async () => {
    const screen = await render(<SampleDrawer open swipeDirection={direction} />);
    void screen;

    const popup = page.getByTestId('popup').element();
    await expect.poll(() => getComputedStyle(popup).transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
    expect(popup.getAttribute('data-swipe-direction')).toBe(direction);

    EDGE[direction](popup.getBoundingClientRect(), page.getByTestId('viewport').element().getBoundingClientRect());
  });
}

test('the enter and exit states slide the panel from its edge, one rule per direction', async () => {
  const screen = await render(<SampleDrawer open />);
  void screen;
  const popup = page.getByTestId('popup').element();

  expect(declaresWhen(popup, 'transform', '[data-swipe-direction="down"]')).toEqual(['translateY(100%)']);
  expect(declaresWhen(popup, 'transform', '[data-swipe-direction="up"]')).toEqual(['translateY(-100%)']);
  expect(declaresWhen(popup, 'transform', '[data-swipe-direction="left"]')).toEqual(['translateX(-100%)']);
  expect(declaresWhen(popup, 'transform', '[data-swipe-direction="right"]')).toEqual(['translateX(100%)']);
  for (const direction of ['down', 'up', 'left', 'right'] as const) {
    expect(declaresWhen(popup, 'transform', `[data-swipe-direction="${direction}"]`)).toHaveLength(1);
  }

  expect(getComputedStyle(popup).opacity).toBe('1');
  expect(declaresWhen(popup, 'opacity', '[data-starting-style]')).toEqual(['0']);
  expect(declaresWhen(popup, 'opacity', '[data-ending-style]')).toEqual(['0']);
});

test('the popup wears the overlay surface and the velocity-scaled exit', async () => {
  const screen = await render(<SampleDrawer open />);
  void screen;
  const element = page.getByTestId('popup').element();
  const popup = getComputedStyle(element);

  expect(parseFloat(popup.borderTopWidth)).toBeGreaterThan(0);
  expect(popup.borderTopStyle).toBe('solid');
  expect(popup.boxShadow).not.toBe('none');
  expect(parseFloat(popup.paddingTop)).toBeGreaterThan(0);
  expect(popup.zIndex).not.toBe('auto');
  expect(popup.transitionProperty).toBe('opacity, transform');
  expect(popup.transitionDuration).not.toBe('0s');
  expect(declares(element, 'transform-origin')).toEqual([]);
  expect(declaresWhen(element, 'transition-duration', '[data-ending-style]')).toEqual([
    'calc(var(--drawer-swipe-strength) * var(--ult-motion-base))',
  ]);
});

test('the popup’s resting transform reads the swipe movement, and its height falls back to auto', async () => {
  const screen = await render(<SampleDrawer open />);
  void screen;
  const popup = page.getByTestId('popup').element();

  const transform = declares(popup, 'transform');
  expect(transform).toHaveLength(1);
  expect(transform[0]).toContain('--drawer-swipe-movement-x');
  expect(transform[0]).toContain('--drawer-swipe-movement-y');
  expect(transform[0]).toContain('--drawer-snap-point-offset');

  expect(declares(popup, 'height')).toEqual(['var(--drawer-height, auto)']);
});

test('the backdrop’s opacity reads the swipe progress and its duration is zero mid-gesture', async () => {
  const screen = await render(<SampleDrawer open />);
  void screen;
  const backdrop = page.getByTestId('backdrop').element();

  expect(declares(backdrop, 'opacity')).toContain('calc(1 - var(--drawer-swipe-progress))');
  expect(getComputedStyle(backdrop).opacity).toBe('1');
  expect(declaresWhen(backdrop, 'transition-duration', '[data-swiping]')).toEqual(['0s']);
  expect(declaresWhen(backdrop, 'transition-duration', '[data-ending-style]')).toEqual([
    'calc(var(--drawer-swipe-strength) * var(--ult-motion-base))',
  ]);
});

test('the viewport is fixed and sets no overflow, and the swipe area has a real box', async () => {
  const screen = await render(<SampleDrawer open />);
  const viewport = page.getByTestId('viewport').element();

  expect(getComputedStyle(viewport).position).toBe('fixed');
  for (const property of ['overflow', 'overflow-x', 'overflow-y']) {
    expect(declares(viewport, property)).toEqual([]);
  }

  const area = screen.getByTestId('swipe-area').element().getBoundingClientRect();
  expect(area.width).toBeGreaterThan(0);
  expect(area.height).toBeGreaterThan(0);
});

test('Indent and IndentBackground pass through, carrying no Ultima class', async () => {
  const screen = await render(<SampleDrawer open />);

  for (const part of ['indent', 'indent-background']) {
    expect(screen.getByTestId(part).element().getAttribute('class')).toBeNull();
  }
});

test('the file writes no duration literal but the mid-gesture zero', () => {
  expect(source.match(/\d+m?s['"]/g)).toEqual(["0s'"]);
  expect(source).toContain('--ult-motion-base');
});

test('className is rejected on the styled parts, and the element-less parts have no style slot', () => {
  expectTypeOf<DrawerBackdropProps>().not.toHaveProperty('className');
  expectTypeOf<DrawerViewportProps>().not.toHaveProperty('className');
  expectTypeOf<DrawerPopupProps>().not.toHaveProperty('className');
  expectTypeOf<DrawerTitleProps>().not.toHaveProperty('className');
  expectTypeOf<DrawerDescriptionProps>().not.toHaveProperty('className');
  expectTypeOf<DrawerSwipeAreaProps>().not.toHaveProperty('className');
  expectTypeOf<DrawerPopupProps>().toHaveProperty('style');

  expectTypeOf<DrawerProviderProps>().not.toHaveProperty('style');
  expectTypeOf<DrawerIndentProps>().toHaveProperty('className');
});

for (const mode of themes) {
  test(`the open drawer has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <SampleDrawer open />
      </main>,
    );
    void screen;
    await expect.element(page.getByTestId('popup')).toBeVisible();
    expect(await violations({ include: [page.getByTestId('popup').element()] })).toEqual([]);
  });
}

/** StyleX writes into `@layer`, so the walk recurses through grouping rules. */
function styleRules(): CSSStyleRule[] {
  const walk = (rules: CSSRuleList): CSSStyleRule[] =>
    [...rules].flatMap((rule) =>
      rule instanceof CSSStyleRule ? [rule] : rule instanceof CSSGroupingRule ? walk(rule.cssRules) : [],
    );
  return [...document.styleSheets].flatMap((sheet) => walk(sheet.cssRules));
}

/**
 * What this element's own rules say about one property, as `[condition, value]`, where the
 * condition is whatever follows the StyleX class in the selector and `''` is the unconditional
 * rule. StyleX groups equal declarations from several components into one rule, so each selector
 * in a group is read on its own and matched back to the element by its class. The popup carries
 * the class of all four directions at once, which is how a direction the rendered tree is not in
 * is read without rendering another drawer.
 */
function declarations(element: Element, property: string): Array<[condition: string, value: string]> {
  return styleRules()
    .filter((rule) => rule.style.getPropertyValue(property) !== '')
    .flatMap((rule) =>
      rule.selectorText.split(',').flatMap((selector): Array<[string, string]> => {
        const [, className, condition] = /^\s*\.([\w-]+)(.*)$/.exec(selector) ?? [];
        if (className === undefined || !element.classList.contains(className)) return [];
        return [[condition ?? '', rule.style.getPropertyValue(property)]];
      }),
    );
}

function declares(element: Element, property: string): string[] {
  return declarations(element, property)
    .filter(([condition]) => condition === '')
    .map(([, value]) => value);
}

function declaresWhen(element: Element, property: string, guard: string): string[] {
  return declarations(element, property)
    .filter(([condition]) => condition.includes(guard))
    .map(([, value]) => value);
}
