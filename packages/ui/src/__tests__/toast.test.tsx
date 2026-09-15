import type { ComponentProps, ReactNode } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Button,
  Toast,
  type ToastArrowProps,
  type ToastContentProps,
  type ToastDescriptionProps,
  type ToastPositionerProps,
  type ToastRootProps,
  type ToastTitleProps,
  type ToastViewportProps,
} from '@ultima/ui';

import { themeDocument, themes, violations } from './axe';

const tones = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const;

type Added = Parameters<ReturnType<typeof Toast.createToastManager>['add']>[0];

function List() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast} data-testid={`toast-${toast.type ?? 'default'}`}>
      <Toast.Content data-testid="content">
        <Toast.Title />
        <Toast.Description />
        <Toast.Close data-testid="close">Dismiss</Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

function ButtonList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast} data-testid={`toast-${toast.type ?? 'default'}`}>
      <Toast.Content data-testid="content">
        <Toast.Title />
        <Toast.Description />
        <Toast.Action data-testid="action" render={<Button variant="ghost" size="sm" />}>
          Undo
        </Toast.Action>
        <Toast.Close data-testid="close" render={<Button variant="ghost" size="sm" />}>
          Dismiss
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

function AnchoredList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Positioner key={toast.id} toast={toast} data-testid="positioner">
      <Toast.Root toast={toast} data-testid={`toast-${toast.type ?? 'default'}`}>
        <Toast.Arrow data-testid="arrow" />
        <Toast.Content data-testid="content">
          <Toast.Title />
        </Toast.Content>
      </Toast.Root>
    </Toast.Positioner>
  ));
}

async function mount(list: ReactNode = <List />, limit = tones.length + 2) {
  const manager = Toast.createToastManager();
  const screen = await render(
    <main>
      <Toast.Provider toastManager={manager} timeout={0} limit={limit}>
        <Toast.Portal>
          <Toast.Viewport data-testid="viewport">{list}</Toast.Viewport>
        </Toast.Portal>
      </Toast.Provider>
    </main>,
  );
  return { screen, manager };
}

/** Base UI marks Close `aria-hidden` until the stack is expanded, so mounting is polled by test id. */
async function one(added: Added, list?: ReactNode) {
  const { screen, manager } = await mount(list);
  manager.add(added);
  await expect.element(screen.getByTestId('content')).toBeInTheDocument();
  return screen;
}

type Screen = Awaited<ReturnType<typeof one>>;

function stacked(screen: Screen) {
  return Array.from(
    screen.getByTestId('viewport').element().querySelectorAll<HTMLElement>('[data-testid^="toast-"]'),
  );
}

function nth(screen: Screen, index: number) {
  const root = stacked(screen)[index];
  if (!root) throw new Error(`expected at least ${index + 1} toasts in the stack`);
  return root;
}

function paint(element: Element) {
  const computed = getComputedStyle(element);
  return [computed.backgroundColor, computed.borderTopColor, computed.color].join(' ');
}

/** Cancels any running transition, so every computed read below is of a settled value. */
function settled<T extends HTMLElement>(element: T) {
  element.style.transitionProperty = 'none';
  return element;
}

/**
 * A swipe needs pointer capture, which a synthetic PointerEvent has no active pointer for, and two
 * moves: Base UI rebases the drag origin on the first one it sees.
 */
function swipe(element: HTMLElement, dx: number, dy: number) {
  element.setPointerCapture = () => {};
  const box = element.getBoundingClientRect();
  const from = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
  const shared = { bubbles: true, pointerId: 1, isPrimary: true };

  element.dispatchEvent(new PointerEvent('pointerdown', { ...shared, ...from, button: 0, buttons: 1 }));
  element.dispatchEvent(new PointerEvent('pointermove', { ...shared, ...from, buttons: 1 }));
  element.dispatchEvent(
    new PointerEvent('pointermove', {
      ...shared,
      buttons: 1,
      clientX: from.clientX + dx,
      clientY: from.clientY + dy,
      movementX: dx,
      movementY: dy,
    }),
  );
  element.ownerDocument.dispatchEvent(
    new PointerEvent('pointerup', { ...shared, clientX: from.clientX + dx, clientY: from.clientY + dy }),
  );
}

async function tabTo(target: Element) {
  await userEvent.keyboard('{F6}');
  for (let step = 0; step < 6 && document.activeElement !== target; step += 1) await userEvent.tab();
  expect(document.activeElement).toBe(target);
}

test('Portal and Viewport stay mounted with an empty stack, as the polite Notifications region', async () => {
  const { screen } = await mount();
  const viewport = screen.getByTestId('viewport').element();
  expect(viewport).toHaveAttribute('role', 'region');
  expect(viewport).toHaveAccessibleName('Notifications');
  expect(viewport).toHaveAttribute('aria-live', 'polite');
  expect(viewport).toHaveAttribute('aria-atomic', 'false');
  expect(screen.getByTestId('content').query()).toBeNull();
});

test('every tone paints through data-type, with no type matching neutral', async () => {
  const { screen, manager } = await mount();

  manager.add({ title: 'Untyped' });
  for (const tone of tones) manager.add({ title: tone, type: tone });
  await expect.element(screen.getByTestId('toast-danger')).toBeInTheDocument();

  const painted = new Map(
    [...tones, 'default'].map((key) => [key, paint(screen.getByTestId(`toast-${key}`).element())]),
  );

  expect(painted.get('default')).toBe(painted.get('neutral'));
  expect(new Set(tones.map((tone) => painted.get(tone))).size).toBe(tones.length);
});

test('error paints as danger and loading paints as neutral', async () => {
  const { screen, manager } = await mount();

  for (const type of ['neutral', 'danger', 'error', 'loading'] as const) manager.add({ title: type, type });
  await expect.element(screen.getByTestId('toast-loading')).toBeInTheDocument();

  expect(paint(screen.getByTestId('toast-error').element())).toBe(
    paint(screen.getByTestId('toast-danger').element()),
  );
  expect(paint(screen.getByTestId('toast-loading').element())).toBe(
    paint(screen.getByTestId('toast-neutral').element()),
  );
});

test('each Root carries an intra-stack z-index that falls with its index', async () => {
  const { screen, manager } = await mount();
  for (const n of [0, 1, 2]) manager.add({ title: `Toast ${n}` });
  await expect.poll(() => stacked(screen).length).toBe(3);

  const order = stacked(screen).map((root) => getComputedStyle(root).zIndex);
  for (const value of order) expect(value).not.toBe('auto');
  expect(Number(order[0])).toBeGreaterThan(Number(order[1]));
  expect(Number(order[1])).toBeGreaterThan(Number(order[2]));
});

test('the collapsed height clamps to the frontmost toast and expanding restores its own', async () => {
  const { screen, manager } = await mount();
  for (const n of [0, 1]) manager.add({ title: `Toast ${n}` });
  await expect.poll(() => stacked(screen).length).toBe(2);

  const viewport = screen.getByTestId('viewport').element() as HTMLElement;
  const front = settled(nth(screen, 0));

  viewport.style.setProperty('--toast-frontmost-height', '120px');
  expect(getComputedStyle(front).height).toBe('120px');
  viewport.style.setProperty('--toast-frontmost-height', '96px');
  expect(getComputedStyle(front).height).toBe('96px');

  front.style.setProperty('--toast-height', '48px');
  await userEvent.keyboard('{F6}');
  await expect.poll(() => front.getAttribute('data-expanded')).not.toBeNull();
  expect(getComputedStyle(front).height).toBe('48px');
});

test('the swipe movement variables reach the transform', async () => {
  const screen = await one({ title: 'Report exported' });
  const front = nth(screen, 0);
  await expect.poll(() => front.getAttribute('data-starting-style')).toBeNull();
  settled(front);

  const resting = new DOMMatrix(getComputedStyle(front).transform);
  front.style.setProperty('--toast-swipe-movement-x', '40px');
  front.style.setProperty('--toast-swipe-movement-y', '25px');
  const swiped = new DOMMatrix(getComputedStyle(front).transform);

  expect(swiped.e - resting.e).toBeCloseTo(40);
  expect(swiped.f - resting.f).toBeCloseTo(25);
});

test('each swipe direction drives its own dismissal transform', async () => {
  const screen = await one({ title: 'Report exported' });
  const front = nth(screen, 0);
  await expect.poll(() => front.getAttribute('data-starting-style')).toBeNull();
  settled(front);
  front.setAttribute('data-ending-style', '');

  const directions = [
    ['up', 'f', -1],
    ['down', 'f', 1],
    ['left', 'e', -1],
    ['right', 'e', 1],
  ] as const;

  for (const [direction, axis, sign] of directions) {
    front.setAttribute('data-swipe-direction', direction);
    const matrix = new DOMMatrix(getComputedStyle(front).transform);
    expect(Math.sign(matrix[axis]), `swiped ${direction}`).toBe(sign);
  }
});

test('Content fades behind the frontmost toast and returns when the viewport expands', async () => {
  const { screen, manager } = await mount();
  for (const n of [0, 1]) manager.add({ title: `Toast ${n}` });
  await expect.poll(() => stacked(screen).length).toBe(2);

  const behind = settled(nth(screen, 1).querySelector<HTMLElement>('[data-testid="content"]')!);
  expect(behind).toHaveAttribute('data-behind');
  expect(getComputedStyle(behind).opacity).toBe('0');

  await userEvent.keyboard('{F6}');
  await expect.poll(() => behind.getAttribute('data-expanded')).not.toBeNull();
  expect(getComputedStyle(behind).opacity).toBe('1');
});

test('each toast is a dialog named by Title and described by Description', async () => {
  const screen = await one({ title: 'Report exported', description: 'Ready to download.' });
  const toast = screen.getByRole('dialog', { name: 'Report exported' }).element();
  expect(toast).toHaveAccessibleDescription('Ready to download.');
  expect(toast).toHaveAttribute('aria-modal', 'false');
});

test('a high-priority toast is an alertdialog and announces through the primitive alert clone', async () => {
  const screen = await one({ title: 'Upload failed', description: 'Try again.', priority: 'high', type: 'error' });
  const toast = screen.getByTestId('toast-error').element();
  expect(toast).toHaveAttribute('role', 'alertdialog');
  expect(toast).toHaveAttribute('aria-hidden', 'true');

  const clone = document.body.querySelector('[role="alert"]');
  expect(clone).not.toBeNull();
  expect(clone).toHaveAttribute('aria-atomic', 'true');
  expect(clone?.textContent).toContain('Upload failed');
  expect(clone?.textContent).toContain('Try again.');
  expect(clone).not.toBe(toast);
});

test('the rings come from the elements rendered into Action and Close', async () => {
  const screen = await one({ title: 'Report deleted' }, <ButtonList />);
  const undo = screen.getByTestId('action').element();
  const dismiss = screen.getByTestId('close').element();

  await tabTo(undo);
  expect(getComputedStyle(undo).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(undo).outlineWidth)).toBeGreaterThan(0);

  await userEvent.tab();
  expect(document.activeElement).toBe(dismiss);
  expect(getComputedStyle(dismiss).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(dismiss).outlineWidth)).toBeGreaterThan(0);
});

test('a bare Close ships no ring of its own', async () => {
  const screen = await one({ title: 'Report deleted' });
  const dismiss = screen.getByTestId('close').element();
  await tabTo(dismiss);
  expect(getComputedStyle(dismiss).outlineStyle).not.toBe('solid');
});

test('F6 focuses the viewport and a swipe past the threshold dismisses', async () => {
  const screen = await one({ title: 'Report exported' });
  await userEvent.keyboard('{F6}');
  expect(document.activeElement).toBe(screen.getByTestId('viewport').element());

  swipe(screen.getByTestId('toast-default').element() as HTMLElement, 120, 0);
  await expect.poll(() => screen.getByTestId('content').query()).toBeNull();
});

test('Close dismisses the toast it sits in', async () => {
  const screen = await one({ title: 'Report exported' });
  await userEvent.click(screen.getByTestId('close').element());
  await expect.poll(() => screen.getByTestId('content').query()).toBeNull();
});

test('the anchored Positioner renders no ring and the Arrow carries the surface hairline', async () => {
  const screen = await one({ title: 'Anchored', positionerProps: { anchor: document.body } }, <AnchoredList />);
  expect(getComputedStyle(screen.getByTestId('positioner').element()).outlineWidth).toBe('0px');

  const arrow = getComputedStyle(screen.getByTestId('arrow').element(), '::before');
  expect(arrow.borderTopStyle).toBe('solid');
  expect(parseFloat(arrow.borderTopWidth)).toBeGreaterThan(0);
  expect(arrow.content).not.toBe('none');
});

test('the manager sits on the namespace as a hook and a value, and Ultima adds no useToast', () => {
  expect(typeof Toast.useToastManager).toBe('function');
  expect(typeof Toast.createToastManager).toBe('function');
  expect(typeof Toast.createToastManager().add).toBe('function');
  expect('useToast' in Toast).toBe(false);
});

test('public prop types drop className on the styled parts and keep the style slot', () => {
  expectTypeOf<ToastViewportProps>().not.toHaveProperty('className');
  expectTypeOf<ToastRootProps>().not.toHaveProperty('className');
  expectTypeOf<ToastContentProps>().not.toHaveProperty('className');
  expectTypeOf<ToastTitleProps>().not.toHaveProperty('className');
  expectTypeOf<ToastDescriptionProps>().not.toHaveProperty('className');
  expectTypeOf<ToastPositionerProps>().not.toHaveProperty('className');
  expectTypeOf<ToastArrowProps>().not.toHaveProperty('className');
  expectTypeOf<ToastRootProps>().toHaveProperty('style');
  expectTypeOf<ComponentProps<typeof Toast.Provider>>().toHaveProperty('limit');
  expectTypeOf<ToastRootProps>().toHaveProperty('swipeDirection');
});

for (const mode of themes) {
  test(`an open toast and a high-priority toast have no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const { screen, manager } = await mount(<ButtonList />);
    const viewport = screen.getByTestId('viewport').element() as HTMLElement;

    manager.add({ title: 'Report exported', description: 'Ready to download.', type: 'success' });
    await expect.element(screen.getByTestId('content')).toBeInTheDocument();

    // Scanned expanded, because that is the state the contract exposes the toast's controls in:
    // collapsed and untouched, Base UI keeps Close and a high-priority Root `aria-hidden` while
    // tabbable, and Ultima removes nothing the primitive sets. Hover rather than F6, which also
    // mounts Base UI's own focus guards.
    await userEvent.hover(screen.getByTestId('toast-success').element());
    await expect.poll(() => screen.getByTestId('content').element().getAttribute('data-expanded')).not.toBeNull();
    await expect.element(screen.getByRole('dialog', { name: 'Report exported' })).toBeVisible();
    expect(await violations(viewport)).toEqual([]);

    manager.add({ title: 'Upload failed', description: 'Try again.', priority: 'high', type: 'error' });
    await expect.element(screen.getByTestId('toast-error')).toBeInTheDocument();
    expect(await violations(viewport)).toEqual([]);
  });
}
