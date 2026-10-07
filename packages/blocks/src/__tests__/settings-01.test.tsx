import { describe, expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import descriptor from '../../../../registry/metadata/block/settings-01.ts';
import { Settings01 } from '../settings-01/settings-01';
import { themeDocument, themes, viewports, violations } from './axe';

const cases = themes.flatMap((mode) => viewports.map((viewport) => ({ mode, viewport, name: `${mode.name}, ${viewport.name}` })));

async function mount({ mode, viewport }: (typeof cases)[number]) {
  await page.viewport(viewport.width, viewport.height);
  themeDocument(mode);
  return render(<Settings01 />);
}

const describedBy = (element: Element) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .filter(Boolean);

const status = () => document.querySelector('main [role="status"]') as HTMLElement;

describe.each(cases)('$name', (scenario) => {
  const narrow = scenario.viewport.name === 'narrow';

  test('1. it mounts with no props', async () => {
    const screen = await mount(scenario);
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
  });

  test('2. its structure resolves', async () => {
    const screen = await mount(scenario);
    const root = screen.container;

    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelectorAll('main')).toHaveLength(1);
    expect(root.querySelectorAll('main aside')).toHaveLength(0);

    const trigger = screen.getByRole('button', { name: 'Open settings navigation' });
    if (narrow) {
      await expect.element(trigger).toBeVisible();
      expect(trigger.element().closest('main')?.firstElementChild?.textContent).toBe('Settings');
      await userEvent.click(trigger);
    } else {
      expect(trigger.query()).toBeNull();
    }
    const nav = page.getByRole('navigation', { name: 'Settings' });
    await expect.element(nav).toBeVisible();
    expect(document.querySelectorAll('nav')).toHaveLength(1);
    await expect.element(nav.getByRole('link', { name: 'Back to app' })).toHaveAttribute('href', '#app');
    await expect.element(nav.getByRole('link', { name: 'Notifications' })).toHaveAttribute('aria-current', 'page');
    for (const [name, href] of [
      ['Profile', '#profile'],
      ['Account', '#account'],
      ['Billing', '#billing'],
      ['Team', '#team'],
      ['Security', '#security'],
      ['API keys', '#api-keys'],
    ]) {
      await expect.element(nav.getByRole('link', { name })).toHaveAttribute('href', href);
      await expect.element(nav.getByRole('link', { name })).not.toHaveAttribute('aria-current');
    }
    if (narrow) await userEvent.keyboard('{Escape}');

    for (const [legend, description] of [
      ['Email', 'Sent to ada@northwind.co'],
      ['Push', 'On your phone and desktop'],
      ['Quiet hours', 'Hold everything but urgent alerts'],
    ]) {
      const group = screen.getByRole('group', { name: legend }).element();
      expect(group.tagName).toBe('FIELDSET');
      expect(describedBy(group)).toEqual([description]);
      const head = group.firstElementChild as HTMLElement;
      const controls = group.lastElementChild as HTMLElement;
      if (narrow) expect(head.getBoundingClientRect().bottom).toBeLessThanOrEqual(controls.getBoundingClientRect().top);
      else expect(head.getBoundingClientRect().right).toBeLessThanOrEqual(controls.getBoundingClientRect().left);
    }

    for (const [name, description, checked] of [
      ['Product updates', 'New features and improvements, once a month.', true],
      ['Weekly digest', 'Orders, revenue and stock in one summary.', true],
      ['Mentions', 'When someone mentions you in a note.', true],
      ['Marketing', 'Offers and events from Northwind.', false],
    ] as const) {
      const control = screen.getByRole('switch', { name, exact: true });
      if (checked) await expect.element(control).toBeChecked();
      else await expect.element(control).not.toBeChecked();
      expect(describedBy(control.element())).toEqual([description]);
    }

    await expect.element(screen.getByRole('radiogroup', { name: 'Push' })).toBeVisible();
    for (const [name, description, checked] of [
      ['Everything', 'All activity in your workspace', false],
      ['Mentions and replies', 'Only what involves you', true],
      ['Nothing', 'Turn push notifications off', false],
    ] as const) {
      const control = screen.getByRole('radio', { name });
      if (checked) await expect.element(control).toBeChecked();
      else await expect.element(control).not.toBeChecked();
      expect(describedBy(control.element())).toEqual([description]);
    }

    const from = screen.getByRole('combobox', { name: 'From' });
    const to = screen.getByRole('combobox', { name: 'To' });
    await expect.element(from).toHaveValue('22:00');
    await expect.element(to).toHaveValue('07:30');
    await expect.element(screen.getByRole('combobox', { name: 'Time zone' })).toHaveValue('Europe/Oslo');
    for (const select of [from, to]) {
      const options = [...(select.element() as HTMLSelectElement).options].map((option) => option.value);
      expect(options).toHaveLength(48);
      expect([options[0], options[1], options[47]]).toEqual(['00:00', '00:30', '23:30']);
    }

    const region = status();
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(region.textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Discard' }).query()).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' }).query()).toBeNull();

    if (narrow) expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(scenario.viewport.width);
  });

  test('3. axe passes', async () => {
    const screen = await mount(scenario);
    expect(await violations()).toEqual([]);

    await userEvent.click(screen.getByRole('switch', { name: 'Marketing' }));
    await expect.element(screen.getByRole('button', { name: 'Save changes' })).toBeVisible();
    expect(await violations()).toEqual([]);

    if (narrow) {
      await userEvent.click(screen.getByRole('button', { name: 'Open settings navigation' }));
      await expect.element(page.getByRole('navigation', { name: 'Settings' })).toBeVisible();
      // Mid-slide the hash links sit offscreen, and axe reads an offscreen fragment link as a skip link.
      await Promise.all(document.getAnimations().map((animation) => animation.finished));
      expect(await violations()).toEqual([]);
    }
  });
});

describe('4. the behavior the block wires', () => {
  test('a changed control makes the form dirty, and changing it back makes it clean', async () => {
    const screen = await render(<Settings01 />);
    const marketing = screen.getByRole('switch', { name: 'Marketing' });

    await userEvent.click(marketing);
    await expect.element(marketing).toBeChecked();
    await expect.poll(() => status().textContent).toBe('You have unsaved changes');
    await expect.element(screen.getByRole('button', { name: 'Discard' })).toHaveAttribute('type', 'button');
    await expect.element(screen.getByRole('button', { name: 'Save changes' })).toHaveAttribute('type', 'submit');

    await userEvent.click(marketing);
    await expect.poll(() => status().textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Discard' }).query()).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' }).query()).toBeNull();
  });

  test('the radio group and the selects make the form dirty too', async () => {
    const screen = await render(<Settings01 />);

    await userEvent.click(screen.getByRole('radio', { name: 'Nothing' }));
    await expect.poll(() => status().textContent).toBe('You have unsaved changes');
    await userEvent.click(screen.getByRole('radio', { name: 'Mentions and replies' }));
    await expect.poll(() => status().textContent).toBe('');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'To' }), '08:00');
    await expect.poll(() => status().textContent).toBe('You have unsaved changes');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'To' }), '07:30');
    await expect.poll(() => status().textContent).toBe('');
  });

  test('Discard puts back the saved values', async () => {
    const screen = await render(<Settings01 />);
    await userEvent.click(screen.getByRole('switch', { name: 'Product updates' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Everything' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Time zone' }), 'Asia/Tokyo');
    await expect.poll(() => status().textContent).toBe('You have unsaved changes');

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

    await expect.element(screen.getByRole('switch', { name: 'Product updates' })).toBeChecked();
    await expect.element(screen.getByRole('radio', { name: 'Mentions and replies' })).toBeChecked();
    await expect.element(screen.getByRole('combobox', { name: 'Time zone' })).toHaveValue('Europe/Oslo');
    await expect.poll(() => status().textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Discard' }).query()).toBeNull();
  });

  test('Save makes the current values the saved ones, empties the region and shows the Toast', async () => {
    const screen = await render(<Settings01 />);
    const marketing = screen.getByRole('switch', { name: 'Marketing' });
    await userEvent.click(marketing);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'From' }), '23:00');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await expect.element(page.getByText('Notification settings saved')).toBeVisible();
    await expect.poll(() => status().textContent).toBe('');
    await expect.element(marketing).toBeChecked();
    await expect.element(screen.getByRole('combobox', { name: 'From' })).toHaveValue('23:00');

    await userEvent.click(marketing);
    await expect.poll(() => status().textContent).toBe('You have unsaved changes');
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await expect.element(marketing).toBeChecked();
    await expect.poll(() => status().textContent).toBe('');
  });
});

test('5. it follows no recipe, so no recipe contract applies in place', () => {
  expect(descriptor.recipes).toEqual([]);
});

test('6. the root takes no props', () => {
  expectTypeOf(Settings01).parameters.toEqualTypeOf<[]>();
});
