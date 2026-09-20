/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so one tree holding all eleven parts, and no props
 *    matches the declared default because the component declares none.
 * 2. The name resolves: role dialog named by a rendered Title, and in a second case by aria-label
 *    on Popup. The trigger never names the popup.
 * 3. The focus ring lands where the contract says: on the element rendered into Trigger; Popup
 *    renders none, the way Dialog's does not.
 * 4. The primitive is still wired: Escape closes and returns focus to the trigger, Tab leaves the
 *    popup because modal keeps Base UI's false default, and the hover props on Trigger open it.
 * 5. Documented state drives its style: data-starting-style and data-ending-style carry the
 *    opacity and the scale, and the resting popup is neither.
 * 6. Typecheck passes: className is rejected; the hover props are Trigger's and not Root's.
 * 7. Not this component. Every interaction is the primitive's, which is item 4, or a style
 *    reacting to a data-* attribute, which is items 5 and 8.
 * 8. CSS the primitive reads: Viewport's position: relative, the one declaration that contains the
 *    absolutely positioned snapshot of a trigger change, and the transform-origin the positioner
 *    seeds along with the transition longhands that make the enter and exit run.
 */
import { expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Button,
  Popover,
  type PopoverArrowProps,
  type PopoverPopupProps,
  type PopoverRootProps,
  type PopoverTitleProps,
  type PopoverTriggerProps,
  type PopoverViewportProps,
} from '@ultima/ui';
import source from '../popover?raw';

import { themeDocument, themes, violations } from './axe';

test('every part renders, and the Title names the popup', async () => {
  const screen = await render(
    <Popover.Root>
      <Popover.Trigger render={<Button />}>Share</Popover.Trigger>
      <Popover.Portal>
        <Popover.Backdrop data-testid="backdrop" />
        <Popover.Positioner data-testid="positioner">
          <Popover.Popup data-testid="popup">
            <Popover.Arrow data-testid="arrow" />
            <Popover.Viewport data-testid="viewport">
              <Popover.Title>Share this report</Popover.Title>
              <Popover.Description data-testid="description">Anyone with the link can read it.</Popover.Description>
              <Popover.Close render={<Button variant="ghost" />}>Done</Popover.Close>
            </Popover.Viewport>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  );

  await screen.getByRole('button', { name: 'Share' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Share this report' })).toBeVisible();
  for (const part of ['backdrop', 'positioner', 'popup', 'arrow', 'viewport', 'description']) {
    expect(page.getByTestId(part).element()).toBeTruthy();
  }
});

test('a popover with no Title is named by aria-label on the Popup instead', async () => {
  const screen = await render(
    <Popover.Root>
      <Popover.Trigger render={<Button />}>Filters</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup aria-label="Filters">
            <p>Two filters are active.</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  );

  await screen.getByRole('button', { name: 'Filters' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
});

test('the trigger never names the popup', async () => {
  const screen = await render(
    <Popover.Root>
      <Popover.Trigger render={<Button />}>Share</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup data-testid="popup" aria-label="Share this report" />
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  );

  const trigger = screen.getByRole('button', { name: 'Share' }).element();
  expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
  await screen.getByRole('button', { name: 'Share' }).click();
  const popup = page.getByTestId('popup').element();
  expect(trigger.getAttribute('aria-controls')).toBe(popup.id);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(popup.getAttribute('aria-labelledby')).toBeNull();
});

test('the ring is on the element rendered into the trigger, and the popup shows none', async () => {
  const screen = await render(
    <Popover.Root>
      <Popover.Trigger render={<Button />}>Share</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup data-testid="popup">
            <Popover.Title>Share this report</Popover.Title>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  );

  await userEvent.tab();
  const trigger = screen.getByRole('button', { name: 'Share' }).element();
  await expect.element(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
  expect(getComputedStyle(trigger).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(trigger).outlineWidth)).toBeGreaterThan(0);

  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByTestId('popup')).toBeVisible();
  const popup = page.getByTestId('popup').element();
  popup.focus();
  expect(getComputedStyle(popup).outlineStyle).toBe('none');
  expect(parseFloat(getComputedStyle(popup).outlineWidth)).toBe(0);
});

test('the wrapper triggers ship no Ultima class of their own', async () => {
  const screen = await render(
    <Popover.Root>
      <Popover.Trigger data-testid="trigger">Share</Popover.Trigger>
      <Popover.Portal>
        <Popover.Backdrop data-testid="backdrop" />
        <Popover.Positioner>
          <Popover.Popup data-testid="popup" aria-label="Share">
            <Popover.Close data-testid="close">Done</Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  );

  expect(screen.getByTestId('trigger').element().getAttribute('class')).toBeNull();
  await screen.getByTestId('trigger').click();
  await expect.element(page.getByTestId('popup')).toBeVisible();
  expect(page.getByTestId('close').element().getAttribute('class')).toBeNull();
  expect(page.getByTestId('backdrop').element().getAttribute('class')).toBeNull();
});

test('the primitive still drives the keyboard: Tab leaves, Escape closes, focus returns', async () => {
  const screen = await render(
    <div>
      <Popover.Root>
        <Popover.Trigger render={<Button />}>Share</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">
              <Popover.Title>Share this report</Popover.Title>
              <Popover.Close render={<Button variant="ghost" />}>Done</Popover.Close>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <button type="button">After</button>
    </div>,
  );

  await screen.getByRole('button', { name: 'Share' }).click();
  await expect.element(page.getByTestId('popup')).toBeVisible();

  await page.getByRole('button', { name: 'Done' }).element().focus();
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByTestId('popup')).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Share' }).element().getAttribute('aria-expanded')).toBe('false');
});

test('Tab leaves the popup, because modal keeps Base UI false default and traps nothing', async () => {
  const screen = await render(
    <div>
      <Popover.Root>
        <Popover.Trigger render={<Button />}>Share</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">
              <Popover.Title>Share this report</Popover.Title>
              <Popover.Close render={<Button variant="ghost" />}>Done</Popover.Close>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <button type="button">After</button>
    </div>,
  );

  await screen.getByRole('button', { name: 'Share' }).click();
  await expect.element(page.getByTestId('popup')).toBeVisible();

  await page.getByRole('button', { name: 'Done' }).element().focus();
  await userEvent.keyboard('{Tab}');
  await expect.element(screen.getByRole('button', { name: 'After' })).toHaveFocus();
});

/**
 * Item 8 asks for the declaration the primitive reads rather than the resolved box, so the
 * instrument is the emitted rule. StyleX writes into `@layer`, so the walk recurses through
 * grouping rules, and a `[data-starting-style]` rule never appears in a computed value at rest.
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

function declaresWhen(element: Element, property: string, attribute: string): string[] {
  const guard = `[${attribute}]`;
  return styleRules()
    .filter(
      (rule) =>
        rule.selectorText.includes(guard) &&
        rule.style.getPropertyValue(property) !== '' &&
        matches(element, rule.selectorText.replaceAll(guard, '')),
    )
    .map((rule) => rule.style.getPropertyValue(property));
}

async function openPopup() {
  const screen = await render(
    <Popover.Root>
      <Popover.Trigger render={<Button />}>Share</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner data-testid="positioner">
          <Popover.Popup data-testid="popup">
            <Popover.Arrow data-testid="arrow" />
            <Popover.Viewport data-testid="viewport">
              <Popover.Title data-testid="title">Share this report</Popover.Title>
              <Popover.Description data-testid="description">Anyone with the link can read it.</Popover.Description>
            </Popover.Viewport>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  );
  await screen.getByRole('button', { name: 'Share' }).click();
  await expect.element(page.getByTestId('popup')).toBeVisible();
  await expect.poll(() => getComputedStyle(page.getByTestId('popup').element()).opacity).toBe('1');
  return screen;
}

test('the enter and exit states drive the popup style, and the resting state is neither', async () => {
  await openPopup();
  const popup = page.getByTestId('popup').element();

  expect(getComputedStyle(popup).opacity).toBe('1');
  expect(getComputedStyle(popup).transform).toBe('none');
  expect(declaresWhen(popup, 'opacity', 'data-starting-style')).toEqual(['0']);
  expect(declaresWhen(popup, 'opacity', 'data-ending-style')).toEqual(['0']);
  expect(declaresWhen(popup, 'transform', 'data-starting-style')).toEqual(['scale(0.98)']);
  expect(declaresWhen(popup, 'transform', 'data-ending-style')).toEqual(['scale(0.98)']);
  expect(declaresWhen(popup, 'transition-timing-function', 'data-ending-style')).toHaveLength(1);
  expect(popup.getAttribute('data-open')).toBe('');
});

test('the popup wears the overlay surface and the recipe transition', async () => {
  await openPopup();
  const popup = getComputedStyle(page.getByTestId('popup').element());

  expect(parseFloat(popup.borderTopWidth)).toBeGreaterThan(0);
  expect(popup.borderTopStyle).toBe('solid');
  expect(popup.boxShadow).not.toBe('none');
  expect(parseFloat(popup.borderRadius)).toBeGreaterThan(0);
  expect(popup.zIndex).not.toBe('auto');
  expect(popup.transitionProperty).toBe('opacity, transform');
  expect(popup.transitionDuration).not.toBe('0s');
  expect(declares(page.getByTestId('popup').element(), 'transform-origin')).toEqual(['var(--transform-origin)']);
  expect(getComputedStyle(page.getByTestId('positioner').element()).outlineStyle).toBe('none');
});

test('the viewport carries position relative and nothing else', async () => {
  await openPopup();
  const viewport = page.getByTestId('viewport').element();
  expect(getComputedStyle(viewport).position).toBe('relative');

  const own = styleRules()
    .filter((rule) => matches(viewport, rule.selectorText))
    .flatMap((rule) => [...rule.style]);
  expect([...new Set(own)]).toEqual(['position']);
});

test('the title and the description paint type, and the arrow reuses the tooltip geometry', async () => {
  await openPopup();
  const title = getComputedStyle(page.getByTestId('title').element());
  const description = getComputedStyle(page.getByTestId('description').element());

  expect(parseFloat(title.fontSize)).toBeGreaterThan(parseFloat(description.fontSize));
  expect(parseInt(title.fontWeight, 10)).toBeGreaterThan(400);
  expect(title.color).not.toBe(description.color);

  const arrow = page.getByTestId('arrow').element();
  expect(parseFloat(getComputedStyle(arrow).width)).toBeGreaterThan(0);
  expect(getComputedStyle(arrow, '::before').transform).not.toBe('none');
});

test('the hover props sit on the Trigger and pass through untouched', async () => {
  const screen = await render(
    <Popover.Root>
      <Popover.Trigger render={<Button />} openOnHover delay={0} closeDelay={0}>
        Preview
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup data-testid="popup" aria-label="Preview" />
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  );

  await screen.getByRole('button', { name: 'Preview' }).hover();
  await expect.element(page.getByTestId('popup')).toBeVisible();
});

test('the file declares no modality, no keepMounted, and imports no sibling component', () => {
  const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, specifier]) => specifier);
  expect([...new Set(imports)].sort()).toEqual([
    '@base-ui/react/popover',
    '@stylexjs/stylex',
    '@ultima/tokens/tokens.stylex',
    '@ultima/ui/lib/component',
    'react',
  ]);
  expect(source).not.toContain('keepMounted');
  expect(source).not.toMatch(/\bmodal\b/);
  expect(source).not.toMatch(/\bopenOnHover\b/);
});

test('className is rejected and the style slot is the escape hatch', () => {
  expectTypeOf<PopoverPopupProps>().not.toHaveProperty('className');
  expectTypeOf<PopoverTitleProps>().not.toHaveProperty('className');
  expectTypeOf<PopoverViewportProps>().not.toHaveProperty('className');
  expectTypeOf<PopoverPopupProps>().toHaveProperty('style');
  expectTypeOf<PopoverArrowProps>().toHaveProperty('style');
  expectTypeOf<PopoverTriggerProps>().toHaveProperty('openOnHover');
  expectTypeOf<PopoverRootProps>().not.toHaveProperty('openOnHover');
});

for (const mode of themes) {
  test(`the open popover has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <Popover.Root>
          <Popover.Trigger render={<Button />}>Share</Popover.Trigger>
          <Popover.Portal>
            <Popover.Backdrop />
            <Popover.Positioner>
              <Popover.Popup data-testid="popup">
                <Popover.Arrow />
                <Popover.Viewport>
                  <Popover.Title>Share this report</Popover.Title>
                  <Popover.Description>Anyone with the link can read it.</Popover.Description>
                  <Popover.Close render={<Button variant="ghost" />}>Done</Popover.Close>
                </Popover.Viewport>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </main>,
    );
    await screen.getByRole('button', { name: 'Share' }).click();
    await expect.element(page.getByTestId('popup')).toBeVisible();
    /**
     * Resting, not just visible: mid-fade axe multiplies the text alpha by the popup's
     * opacity and reports a real contrast failure against the half-painted surface.
     */
    await expect.poll(() => getComputedStyle(page.getByTestId('popup').element()).opacity).toBe('1');
    expect(
      await violations({
        include: [page.getByTestId('popup').element()],
        exclude: [['[data-base-ui-focus-guard]']],
      }),
    ).toEqual([]);
  });
}
