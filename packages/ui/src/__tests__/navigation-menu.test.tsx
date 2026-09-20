/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so one tree holding all thirteen parts, and no props
 *    matches the declared default because the component declares none.
 * 2. The name resolves: role navigation twice — Root named by the consumer, Popup by Ultima's
 *    conditional default; each Trigger by its text; each Link by its text.
 * 3. The focus ring lands where the contract says: on Trigger and Link; Content and Popup render none.
 * 4. The primitive is still wired: arrows move between triggers, ArrowDown opens a horizontal menu,
 *    ArrowRight and ArrowLeft follow direction, Escape dismisses and returns focus to the trigger.
 * 5. Documented state drives its style: data-popup-open on Trigger, data-active and aria-current
 *    on Link, data-activation-direction on Content.
 * 6. Typecheck passes: className is rejected; there are no axis unions to pin.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's,
 *    which is item 4, or a style reacting to a data-* attribute, which is items 5 and 8. The one
 *    thing Ultima adds is the Popup's conditional name, and that is item 2.
 * 8. CSS the primitive reads: the four imperatively seeded size variables, the Positioner's
 *    --available-width clamp, the Viewport's clipping box, the List's display, and the transition
 *    longhands that make the morph run and let data-instant cancel it.
 */
import { expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  NavigationMenu,
  type NavigationMenuLinkProps,
  type NavigationMenuPopupProps,
  type NavigationMenuTriggerProps,
} from '@ultima/ui';
import source from '../navigation-menu?raw';

import { themeDocument, themes, violations } from './axe';

function Menu({
  orientation = 'horizontal',
  label = 'Main',
  popupLabel,
}: {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  popupLabel?: string;
}) {
  return (
    <NavigationMenu.Root aria-label={label} orientation={orientation}>
      <NavigationMenu.List data-testid="list">
        <NavigationMenu.Item>
          <NavigationMenu.Trigger data-testid="products">
            Products<NavigationMenu.Icon data-testid="icon" />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content data-testid="products-content">
            <NavigationMenu.Link href="#tokens" active data-testid="tokens">
              Tokens
            </NavigationMenu.Link>
            <NavigationMenu.Link href="#components">Components</NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger data-testid="company">
            Company<NavigationMenu.Icon />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Link href="#about">About</NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Backdrop data-testid="backdrop" />
        <NavigationMenu.Positioner data-testid="positioner">
          <NavigationMenu.Popup data-testid="popup" aria-label={popupLabel}>
            <NavigationMenu.Arrow data-testid="arrow" />
            <NavigationMenu.Viewport data-testid="viewport" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

const styleOf = (testId: string) => getComputedStyle(page.getByTestId(testId).element());

/**
 * Item 8 asks for the declaration the primitive depends on rather than the resolved box, so the
 * instrument is the emitted rule. StyleX writes into `@layer`, so the walk recurses through
 * grouping rules; `translateX(50%)` on a zero-width box resolves to an identity matrix, which is
 * the other reason a computed value cannot answer these.
 */
function styleRules(): CSSStyleRule[] {
  const walk = (rules: CSSRuleList): CSSStyleRule[] =>
    [...rules].flatMap((rule) =>
      rule instanceof CSSStyleRule ? [rule] : rule instanceof CSSGroupingRule ? walk(rule.cssRules) : [],
    );
  return [...document.styleSheets].flatMap((sheet) => walk(sheet.cssRules));
}

function declares(element: Element, property: string): string[] {
  return styleRules()
    .filter((rule) => element.matches(rule.selectorText) && rule.style.getPropertyValue(property) !== '')
    .map((rule) => rule.style.getPropertyValue(property));
}

function declaresWhen(element: Element, property: string, ...attributes: string[]): string[] {
  const guard = attributes.map((attribute) => `[${attribute}]`).join('');
  const withoutGuard = (selector: string) => selector.replace(guard, '').trim();
  const guardedSelectorMatches = (rule: CSSStyleRule) =>
    rule.selectorText.includes(guard) && rule.selectorText.split(',').some((part) => element.matches(withoutGuard(part)));
  return styleRules()
    .filter((rule) => guardedSelectorMatches(rule) && rule.style.getPropertyValue(property) !== '')
    .map((rule) => rule.style.getPropertyValue(property));
}

test('every part renders, and the two landmarks are named', async () => {
  const screen = await render(<Menu />);
  const root = screen.getByRole('navigation', { name: 'Main' }).element();
  expect(root.tagName).toBe('NAV');
  expect(root.hasAttribute('aria-label')).toBe(true);

  await screen.getByRole('button', { name: 'Products' }).click();
  const popup = page.getByRole('navigation', { name: 'Submenu' }).element();
  await expect.element(page.getByTestId('popup')).toBeVisible();
  expect(popup).toBe(page.getByTestId('popup').element());
  expect(popup.tagName).toBe('NAV');
  expect(popup.getAttribute('tabindex')).toBe('-1');
  await expect.element(page.getByRole('link', { name: 'Tokens' })).toBeVisible();
  for (const part of ['list', 'icon', 'positioner', 'viewport', 'arrow', 'products-content']) {
    expect(page.getByTestId(part).element()).toBeTruthy();
  }
});

test('the caller names the submenu instead of Ultima when they name it at all', async () => {
  const screen = await render(<Menu popupLabel="Products" />);
  await screen.getByRole('button', { name: 'Products' }).click();
  await expect.element(page.getByRole('navigation', { name: 'Products' })).toBeVisible();
  expect(page.getByTestId('popup').element().getAttribute('aria-label')).toBe('Products');
});

test('the Root landmark carries no Ultima default name', async () => {
  const screen = await render(
    <NavigationMenu.Root data-testid="unnamed">
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger>Products</NavigationMenu.Trigger>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>,
  );
  const root = screen.getByTestId('unnamed').element();
  expect(root.tagName).toBe('NAV');
  expect(root.hasAttribute('aria-label')).toBe(false);
  expect(root.hasAttribute('aria-labelledby')).toBe(false);
});

test('every trigger stays in the tab order, after the composite roving -1', async () => {
  const screen = await render(<Menu />);
  expect(screen.getByTestId('products').element().getAttribute('tabindex')).toBe('0');
  expect(screen.getByTestId('company').element().getAttribute('tabindex')).toBe('0');
  await userEvent.tab();
  await expect.element(screen.getByTestId('products')).toHaveFocus();
  await userEvent.tab();
  await expect.element(screen.getByTestId('company')).toHaveFocus();
});

test('the icon is the private chevron rather than Base UI default text, and takes children', async () => {
  const screen = await render(
    <NavigationMenu.Root aria-label="Main">
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger>
            Products<NavigationMenu.Icon data-testid="default-icon" />
          </NavigationMenu.Trigger>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger>
            Company<NavigationMenu.Icon data-testid="replaced-icon">+</NavigationMenu.Icon>
          </NavigationMenu.Trigger>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>,
  );
  const fitted = screen.getByTestId('default-icon').element();
  expect(fitted.textContent).not.toContain('▼');
  expect(fitted.querySelector('svg')).toBeTruthy();
  expect(screen.getByTestId('replaced-icon').element().textContent).toBe('+');
  expect(screen.getByTestId('replaced-icon').element().querySelector('svg')).toBeNull();

  // Against the maintainers' demo: the Trigger's own data-popup-open carries the open state,
  // so the Icon adds no fourth transition to keep in step with the popup's three.
  expect(declaresWhen(fitted, 'transform', 'data-popup-open')).toEqual([]);
  expect(declares(fitted, 'transform')).toEqual([]);
  expect(declares(fitted, 'transition-property')).toEqual([]);
});

test('the focus ring lands on the trigger and the link, and the popup renders none', async () => {
  const screen = await render(<Menu />);
  await userEvent.tab();
  const trigger = screen.getByTestId('products').element();
  expect(getComputedStyle(trigger).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(trigger).outlineWidth)).toBeGreaterThan(0);

  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByTestId('popup')).toBeVisible();
  expect(styleOf('popup').outlineStyle).toBe('none');

  const link = page.getByRole('link', { name: 'Tokens' });
  await link.element().focus();
  await userEvent.keyboard('{Tab}');
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  expect(getComputedStyle(link.element()).outlineStyle).toBe('solid');
});

test('the primitive still drives the keyboard: arrows move, ArrowDown opens, Escape returns focus', async () => {
  const screen = await render(<Menu />);
  await userEvent.tab();
  await expect.element(screen.getByTestId('products')).toHaveFocus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(screen.getByTestId('company')).toHaveFocus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.element(screen.getByTestId('products')).toHaveFocus();

  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByTestId('popup')).toBeVisible();
  expect(screen.getByTestId('products').element().getAttribute('aria-expanded')).toBe('true');

  await userEvent.keyboard('{Escape}');
  await expect.element(screen.getByTestId('products')).toHaveFocus();
  expect(screen.getByTestId('products').element().getAttribute('aria-expanded')).toBe('false');
});

test('a vertical menu opens on ArrowRight and closes on an outside press', async () => {
  const screen = await render(
    <div>
      <button type="button">Outside</button>
      <Menu orientation="vertical" />
    </div>,
  );
  await screen.getByTestId('products').element().focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(page.getByTestId('popup')).toBeVisible();

  await screen.getByRole('button', { name: 'Outside' }).click();
  await expect.element(page.getByTestId('popup')).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
});

test('documented state drives the style on the trigger, the link, and the content', async () => {
  const screen = await render(<Menu />);
  const trigger = screen.getByTestId('products').element();
  // Trigger :hover and [data-popup-open] both paint --ult-color-surface-hover.
  await userEvent.unhover(trigger);
  const resting = getComputedStyle(trigger).backgroundColor;
  await screen.getByTestId('products').click();
  await expect.element(page.getByTestId('popup')).toBeVisible();
  expect(trigger.getAttribute('data-popup-open')).toBe('');
  await expect.poll(() => getComputedStyle(trigger).backgroundColor).not.toBe(resting);

  const plain = page.getByRole('link', { name: 'Components' }).element();
  const current = page.getByTestId('tokens').element();
  expect(current.getAttribute('aria-current')).toBe('page');
  expect(current.getAttribute('data-active')).toBe('');
  expect(getComputedStyle(current).fontWeight).not.toBe(getComputedStyle(plain).fontWeight);
  expect(getComputedStyle(current).color).not.toBe(getComputedStyle(plain).color);

  const content = page.getByTestId('products-content').element();
  expect(getComputedStyle(content).transform).toBe('none');
  const slide = (...attributes: string[]) => declaresWhen(content, 'transform', ...attributes);
  const enterFromLeft = slide('data-starting-style', 'data-activation-direction="left"');
  const enterFromRight = slide('data-starting-style', 'data-activation-direction="right"');
  expect(enterFromLeft).toEqual(['translateX(-50%)']);
  expect(enterFromRight).toEqual(['translateX(50%)']);
  expect(slide('data-ending-style', 'data-activation-direction="left"')).toEqual(enterFromRight);
  expect(slide('data-ending-style', 'data-activation-direction="right"')).toEqual(enterFromLeft);
});

test('the parts carry the CSS the primitive reads for the size morph', async () => {
  const screen = await render(<Menu />);
  expect(styleOf('list').display).toBe('flex');

  await screen.getByTestId('products').click();
  await expect.element(page.getByTestId('popup')).toBeVisible();

  const positioner = page.getByTestId('positioner').element();
  const popup = page.getByTestId('popup').element();
  expect(declares(positioner, 'width')).toContain('var(--positioner-width)');
  expect(declares(positioner, 'height')).toContain('var(--positioner-height)');
  expect(declares(positioner, 'max-width')).toContain('var(--available-width)');
  expect(declares(popup, 'width')).toContain('var(--popup-width)');
  expect(declares(popup, 'height')).toContain('var(--popup-height)');
  expect(declares(popup, 'transform')).toEqual([]);
  expect(declares(popup, 'transform-origin')).toEqual([]);

  const viewport = styleOf('viewport');
  expect(viewport.overflow).toBe('hidden');
  expect(viewport.position).toBe('relative');
  const viewportBox = page.getByTestId('viewport').element().getBoundingClientRect();
  expect(viewportBox.width).toBeCloseTo(popup.clientWidth, 0);
  expect(viewportBox.height).toBeCloseTo(popup.clientHeight, 0);
});

test('the morph runs, and data-instant cancels it through the longhand', async () => {
  const screen = await render(<Menu />);
  await screen.getByTestId('products').click();
  await expect.element(page.getByTestId('popup')).toBeVisible();

  const popup = styleOf('popup');
  expect(popup.transitionDuration).not.toBe('0s');
  expect(popup.transitionProperty).toContain('width');
  expect(popup.transitionProperty).toContain('height');
  expect(popup.transitionProperty).toContain('opacity');
  expect(popup.transform).toBe('none');

  // Base UI owns when data-instant is present, so both states are driven here rather than
  // waited for: the shorthand form of this cancel lands in an earlier StyleX layer and loses.
  const positioner = page.getByTestId('positioner').element();
  expect(getComputedStyle(positioner).transitionProperty).toBe('top, left, right, bottom');
  positioner.setAttribute('data-instant', '');
  expect(getComputedStyle(positioner).transitionDuration).toBe('0s');
  positioner.removeAttribute('data-instant');
  expect(getComputedStyle(positioner).transitionDuration).not.toBe('0s');

  // One duration token across all three moving parts.
  const content = page.getByTestId('products-content').element();
  expect(getComputedStyle(positioner).transitionDuration).toBe(popup.transitionDuration);
  expect(getComputedStyle(content).transitionDuration).toBe(popup.transitionDuration);
});

test('every cancelling rule is a longhand, and the file sets no origin and never keeps the popup mounted', () => {
  expect(source).not.toMatch(/(^|[^-\w])transition\s*:/);
  expect(source).not.toContain('transformOrigin');
  expect(source).not.toContain('keepMounted');
});

test('the backdrop ships no styles', async () => {
  const screen = await render(<Menu />);
  await screen.getByTestId('products').click();
  await expect.element(page.getByTestId('popup')).toBeVisible();
  expect(page.getByTestId('backdrop').element().getAttribute('class')).toBeNull();
});

test('className is rejected and the style slot is the escape hatch', () => {
  expectTypeOf<NavigationMenuTriggerProps>().not.toHaveProperty('className');
  expectTypeOf<NavigationMenuPopupProps>().not.toHaveProperty('className');
  expectTypeOf<NavigationMenuLinkProps>().not.toHaveProperty('className');
  expectTypeOf<NavigationMenuTriggerProps>().toHaveProperty('style');
  expectTypeOf<NavigationMenuLinkProps>().toHaveProperty('active');
});

for (const mode of themes) {
  test(`the open popup has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <Menu />
      </main>,
    );
    await screen.getByTestId('products').click();
    await expect.element(page.getByTestId('popup')).toBeVisible();
    // Keep the pointer on the trigger so the menu does not close, and wait until
    // the popup has finished entering: axe samples contrast through a transparent
    // starting-style background as the page canvas.
    await screen.getByTestId('products').hover();
    const popup = page.getByTestId('popup').element();
    await expect.poll(() => getComputedStyle(popup).opacity).toBe('1');
    await expect.poll(() => getComputedStyle(popup).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(
      await violations({
        include: [popup],
        exclude: [['[data-base-ui-focus-guard]']],
      }),
    ).toEqual([]);
  });
}
