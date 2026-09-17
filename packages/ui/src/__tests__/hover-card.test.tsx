/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so one tree holding all eight parts, and no props matches
 *    the declared default because the component declares none.
 * 2. The name resolves, and here it resolves to nothing on purpose. The trigger is queryable as a
 *    link by its own text, and the popup carries no role, because Base UI emits no association at
 *    all and naming the popup would mean Ultima giving it a role.
 * 3. The focus ring lands where the contract says: on Trigger, and it is Ultima's own rather than
 *    a caller's element. No other part shows one.
 * 4. The primitive is still wired: focus opens the card after the delay, Escape closes it, and the
 *    pointer travels from trigger into popup without it closing.
 * 5. Documented state drives its style: data-starting-style and data-ending-style carry the opacity
 *    and the scale, and the resting popup is neither.
 * 6. Typecheck passes: className is rejected; delay and closeDelay are Trigger's and not Root's.
 * 7. Not this component. Every interaction is the primitive's, which is item 4, or a style reacting
 *    to a data-* attribute, which is items 5 and 8.
 * 8. CSS the primitive reads: Viewport's position: relative, the one declaration that contains the
 *    absolutely positioned snapshot of a trigger change.
 */
import { expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  HoverCard,
  type HoverCardArrowProps,
  type HoverCardPopupProps,
  type HoverCardRootProps,
  type HoverCardTriggerProps,
  type HoverCardViewportProps,
} from '@ultima/ui';
import source from '../hover-card?raw';

import { themeDocument, themes, violations } from './axe';

const DESTINATION = '/tokens/color';
/** Any non-palette value: the assertion compares the two computed colours, never this literal. */
const RECOLOURED_PROSE = 'rgb(12, 34, 56)';

function Card({ delay = 0, closeDelay = 0 }: { delay?: number; closeDelay?: number }) {
  return (
    <p>
      The ramp is described under{' '}
      <HoverCard.Root>
        <HoverCard.Trigger href={DESTINATION} delay={delay} closeDelay={closeDelay} data-testid="trigger">
          semantic color
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Backdrop data-testid="backdrop" />
          <HoverCard.Positioner data-testid="positioner" sideOffset={8}>
            <HoverCard.Popup data-testid="popup">
              <HoverCard.Arrow data-testid="arrow" />
              <HoverCard.Viewport data-testid="viewport">
                Twelve steps, each resolving to the same number in dark and in light.
              </HoverCard.Viewport>
            </HoverCard.Popup>
          </HoverCard.Positioner>
        </HoverCard.Portal>
      </HoverCard.Root>, which lists every pairing.
    </p>
  );
}

async function openCard() {
  const screen = await render(<Card />);
  await screen.getByTestId('trigger').hover();
  await expect.element(page.getByTestId('popup')).toBeVisible();
  await expect.poll(() => getComputedStyle(page.getByTestId('popup').element()).opacity).toBe('1');
  return screen;
}

test('every part renders, and no prop is needed to reach the declared default', async () => {
  const screen = await openCard();

  expect(screen.getByTestId('trigger').element().tagName).toBe('A');
  for (const part of ['backdrop', 'positioner', 'popup', 'arrow', 'viewport']) {
    expect(page.getByTestId(part).element()).toBeTruthy();
  }
  expect(source).not.toMatch(/\bdelay\b/);
  expect(source).not.toMatch(/\bcloseDelay\b/);
});

test('the trigger is a link named by its own text, and the popup has no role and no association', async () => {
  const screen = await render(<Card />);

  const trigger = screen.getByRole('link', { name: 'semantic color' }).element();
  expect(trigger.getAttribute('href')).toBe(DESTINATION);
  for (const attribute of ['aria-expanded', 'aria-haspopup', 'aria-controls', 'aria-describedby']) {
    expect(trigger.getAttribute(attribute)).toBeNull();
  }

  await screen.getByTestId('trigger').hover();
  const popup = page.getByTestId('popup').element();
  expect(popup.getAttribute('role')).toBeNull();
  expect(popup.getAttribute('aria-labelledby')).toBeNull();
  expect(popup.getAttribute('aria-label')).toBeNull();
});

test('the trigger underlines and inherits its colour, being the one Ultima link inside prose', async () => {
  const screen = await render(<Card />);
  const trigger = screen.getByTestId('trigger').element();
  const paragraph = trigger.parentElement as HTMLElement;
  paragraph.style.color = RECOLOURED_PROSE;

  expect(getComputedStyle(trigger).textDecorationLine).toBe('underline');
  expect(parseFloat(getComputedStyle(trigger).textUnderlineOffset)).toBeGreaterThan(0);
  expect(declares(trigger, 'color')).toEqual(['inherit']);
  expect(getComputedStyle(trigger).color).toBe(getComputedStyle(paragraph).color);
});

test('the ring is the trigger’s own, and no other part declares one', async () => {
  const screen = await render(
    <div>
      <Card />
      <button type="button">After</button>
    </div>,
  );

  await userEvent.tab();
  const trigger = screen.getByTestId('trigger').element();
  await expect.element(screen.getByTestId('trigger')).toHaveFocus();
  expect(getComputedStyle(trigger).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(trigger).outlineWidth)).toBeGreaterThan(0);

  await expect.element(page.getByTestId('popup')).toBeVisible();
  expect(declaresWhen(trigger, 'outline', ':focus-visible')).toHaveLength(1);
  for (const part of ['popup', 'positioner', 'viewport', 'arrow']) {
    expect(declaresWhen(page.getByTestId(part).element(), 'outline', ':focus-visible')).toEqual([]);
  }

  await userEvent.tab();
  await expect.element(screen.getByRole('button', { name: 'After' })).toHaveFocus();
});

/**
 * The popup departs from Popover's and Dialog's here: PreviewCard mounts no focus manager, so
 * nothing ever focuses the popup and an `outline: none` would be a dead declaration.
 */
test('the popup declares no outline of its own', async () => {
  await openCard();
  const popup = page.getByTestId('popup').element();
  expect(declares(popup, 'outline')).toEqual([]);
  expect(declares(popup, 'outline-style')).toEqual([]);
  expect(declares(popup, 'outline-width')).toEqual([]);
});

test('the backdrop is an inert styling hook carrying no Ultima class', async () => {
  const screen = await render(<Card />);
  await screen.getByTestId('trigger').hover();
  await expect.element(page.getByTestId('backdrop')).toBeInTheDocument();
  expect(page.getByTestId('backdrop').element().getAttribute('class')).toBeNull();
});

test('focus opens the card after the delay, and Escape closes it', async () => {
  const delay = 80;
  const screen = await render(<Card delay={delay} />);

  expect(page.getByTestId('popup').query()).toBeNull();
  const start = performance.now();
  await userEvent.tab();
  await expect.element(screen.getByTestId('trigger')).toHaveFocus();
  await expect.element(page.getByTestId('popup')).toBeVisible();
  expect(performance.now() - start).toBeGreaterThanOrEqual(delay);

  await userEvent.keyboard('{Escape}');
  await expect.poll(() => page.getByTestId('popup').query()).toBeNull();
});

test('the pointer travels from the trigger into the popup without the card closing', async () => {
  const screen = await render(
    <div>
      <Card />
      <button type="button">Elsewhere</button>
    </div>,
  );
  await screen.getByTestId('trigger').hover();
  await expect.element(page.getByTestId('popup')).toBeVisible();

  await page.getByTestId('viewport').hover();
  await expect.element(page.getByTestId('popup')).toBeVisible();

  await screen.getByRole('button', { name: 'Elsewhere' }).hover();
  await expect.poll(() => page.getByTestId('popup').query()).toBeNull();
});

test('the enter and exit states drive the popup style, and the resting state is neither', async () => {
  await openCard();
  const popup = page.getByTestId('popup').element();

  expect(getComputedStyle(popup).opacity).toBe('1');
  expect(getComputedStyle(popup).transform).toBe('none');
  expect(declaresWhen(popup, 'opacity', '[data-starting-style]')).toEqual(['0']);
  expect(declaresWhen(popup, 'opacity', '[data-ending-style]')).toEqual(['0']);
  expect(declaresWhen(popup, 'transform', '[data-starting-style]')).toEqual(['scale(0.98)']);
  expect(declaresWhen(popup, 'transform', '[data-ending-style]')).toEqual(['scale(0.98)']);
  expect(popup.getAttribute('data-open')).toBe('');
});

test('the popup wears the full overlay surface and the recipe transition', async () => {
  await openCard();
  const popup = getComputedStyle(page.getByTestId('popup').element());

  expect(parseFloat(popup.borderTopWidth)).toBeGreaterThan(0);
  expect(popup.borderTopStyle).toBe('solid');
  expect(popup.boxShadow).not.toBe('none');
  expect(parseFloat(popup.borderRadius)).toBeGreaterThan(0);
  expect(parseFloat(popup.paddingTop)).toBeGreaterThan(0);
  expect(popup.zIndex).not.toBe('auto');
  expect(popup.transitionProperty).toBe('opacity, transform');
  expect(popup.transitionDuration).not.toBe('0s');
  expect(declares(page.getByTestId('popup').element(), 'transform-origin')).toEqual(['var(--transform-origin)']);
  expect(getComputedStyle(page.getByTestId('positioner').element()).outlineStyle).toBe('none');

  const arrow = page.getByTestId('arrow').element();
  expect(parseFloat(getComputedStyle(arrow).width)).toBeGreaterThan(0);
  expect(getComputedStyle(arrow, '::before').transform).not.toBe('none');
});

test('the viewport carries position relative and nothing else', async () => {
  await openCard();
  const viewport = page.getByTestId('viewport').element();
  expect(getComputedStyle(viewport).position).toBe('relative');

  const own = styleRules()
    .filter((rule) => matches(viewport, rule.selectorText))
    .flatMap((rule) => [...rule.style]);
  expect([...new Set(own)]).toEqual(['position']);
});

test('the file exposes eight parts plus the handle pair, and imports no sibling component', () => {
  expect(Object.keys(HoverCard)).toEqual([
    'Root',
    'Trigger',
    'Portal',
    'Positioner',
    'Popup',
    'Arrow',
    'Backdrop',
    'Viewport',
    'Handle',
    'createHandle',
  ]);
  expect(HoverCard).not.toHaveProperty('Title');
  expect(HoverCard).not.toHaveProperty('Description');
  expect(HoverCard).not.toHaveProperty('Close');

  const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, specifier]) => specifier);
  expect([...new Set(imports)].sort()).toEqual([
    '@base-ui/react/preview-card',
    '@stylexjs/stylex',
    '@ultima/tokens/tokens.stylex',
    '@ultima/ui/lib/component',
    'react',
  ]);
});

test('className is rejected, and the delay props sit on the Trigger rather than the Root', () => {
  expectTypeOf<HoverCardTriggerProps>().not.toHaveProperty('className');
  expectTypeOf<HoverCardPopupProps>().not.toHaveProperty('className');
  expectTypeOf<HoverCardArrowProps>().not.toHaveProperty('className');
  expectTypeOf<HoverCardViewportProps>().not.toHaveProperty('className');
  expectTypeOf<HoverCardTriggerProps>().toHaveProperty('style');
  expectTypeOf<HoverCardTriggerProps>().toHaveProperty('href');
  expectTypeOf<HoverCardTriggerProps>().toHaveProperty('delay');
  expectTypeOf<HoverCardTriggerProps>().toHaveProperty('closeDelay');
  expectTypeOf<HoverCardRootProps>().not.toHaveProperty('delay');
  expectTypeOf<HoverCardRootProps>().not.toHaveProperty('closeDelay');
});

for (const mode of themes) {
  test(`the open hover card has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <Card />
      </main>,
    );
    await screen.getByTestId('trigger').hover();
    await expect.element(page.getByTestId('popup')).toBeVisible();
    await expect.poll(() => getComputedStyle(page.getByTestId('popup').element()).opacity).toBe('1');
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

function declares(element: Element, property: string): string[] {
  return styleRules()
    .filter((rule) => matches(element, rule.selectorText) && rule.style.getPropertyValue(property) !== '')
    .map((rule) => rule.style.getPropertyValue(property));
}

function matches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

function declaresWhen(element: Element, property: string, guard: string): string[] {
  return styleRules()
    .filter(
      (rule) =>
        rule.selectorText.includes(guard) &&
        rule.style.getPropertyValue(property) !== '' &&
        matches(element, rule.selectorText.replaceAll(guard, '')),
    )
    .map((rule) => rule.style.getPropertyValue(property));
}
