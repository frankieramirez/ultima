import { describe, expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Card } from '@ultima/ui/card';

import descriptor from '../../../../registry/metadata/block/crm-01.ts';
import { Crm01 } from '../crm-01/crm-01';
import { themeDocument, themes, viewports, violations } from './axe';

const cases = themes.flatMap((mode) => viewports.map((viewport) => ({ mode, viewport, name: `${mode.name}, ${viewport.name}` })));

const NAMES = ['Mara Lindqvist', 'Theo Okafor', 'Priya Raman', 'Jonas Weber', 'Sofia Alvarez', 'Kenji Nakamura', 'Elena Brooks'];

async function mount({ mode, viewport }: (typeof cases)[number]) {
  await page.viewport(viewport.width, viewport.height);
  themeDocument(mode);
  return render(<Crm01 />);
}

type Screen = Awaited<ReturnType<typeof render>>;

const rowNames = (screen: Screen) =>
  screen
    .getByRole('group', { name: 'Contacts' })
    .getByRole('button')
    .elements()
    .map((row) => row.getAttribute('aria-labelledby')?.split(' ').map((id) => document.getElementById(id)?.textContent).join(' '));

const count = (screen: Screen) => screen.getByRole('heading', { level: 1, name: 'Contacts' }).element().nextElementSibling?.textContent;

const activityTitles = (screen: Screen) =>
  screen
    .getByRole('list', { name: 'Activity' })
    .getByRole('listitem')
    .elements()
    .map((entry) => entry.textContent);

describe.each(cases)('$name', (scenario) => {
  test('1. it mounts with no props', async () => {
    const screen = await mount(scenario);
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible();
  });

  test('2. its structure resolves', async () => {
    const screen = await mount(scenario);
    const root = screen.container;
    const narrow = scenario.viewport.name === 'narrow';

    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelectorAll('main')).toHaveLength(1);
    expect(root.querySelector('main aside')).toBeNull();
    await expect.element(screen.getByRole('region', { name: 'Contacts' })).toBeVisible();
    expect(count(screen)).toBe('7');
    await expect.element(screen.getByRole('button', { name: 'Add contact' })).toBeVisible();
    await expect.element(screen.getByRole('searchbox', { name: 'Search contacts' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Filter contacts' }).getByRole('button').elements().map((chip) => chip.textContent)).toEqual([
      'All',
      'Leads',
      'Customers',
      'Churned',
    ]);
    expect(rowNames(screen)).toEqual(NAMES);
    await expect.element(screen.getByRole('button', { name: 'Mara Lindqvist' })).toHaveAccessibleDescription('Fjord Logistics Customer');
    await expect.element(screen.getByRole('button', { name: 'Jonas Weber' })).toHaveAccessibleDescription('Wexford & Co At risk');
    for (const avatar of root.querySelectorAll('[role="group"] button > span:first-child')) expect(avatar.getAttribute('aria-hidden')).toBe('true');

    if (narrow) {
      expect(root.querySelector('nav')).toBeNull();
      expect(screen.getByRole('region', { name: 'Mara Lindqvist' }).query()).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    } else {
      expect(screen.getByRole('button', { name: 'Open navigation' }).query()).toBeNull();
    }

    const nav = page.getByRole('navigation', { name: 'Workspace' });
    await expect.element(nav).toBeVisible();
    expect(document.querySelectorAll('nav')).toHaveLength(1);
    await expect.element(nav.getByRole('link', { name: 'Inbox, 8' })).toHaveAttribute('href', '#inbox');
    await expect.element(nav.getByRole('link', { name: 'Contacts' })).toHaveAttribute('aria-current', 'page');
    await expect.element(nav.getByRole('link', { name: 'Companies' })).toHaveAttribute('href', '#companies');
    await expect.element(nav.getByRole('link', { name: 'Deals, 24' })).toHaveAttribute('href', '#deals');
    await expect.element(nav.getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '#tasks');
    await expect.element(nav.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '#reports');
    if (narrow) {
      await userEvent.keyboard('{Escape}');
      await expect.element(nav).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Mara Lindqvist' }));
    }

    const record = screen.getByRole('region', { name: 'Mara Lindqvist' });
    await expect.element(record.getByRole('heading', { level: 2, name: 'Mara Lindqvist' })).toBeVisible();
    await expect.element(record.getByRole('heading', { level: 3, name: 'Details' })).toBeVisible();
    await expect.element(record.getByRole('button', { name: 'Email' })).toHaveAttribute('href', 'mailto:mara@fjord.io');
    await expect.element(record.getByRole('button', { name: 'Call' })).toHaveAttribute('href', 'tel:+4791244018');
    await expect.element(record.getByRole('link', { name: 'mara@fjord.io' })).toHaveAttribute('href', 'mailto:mara@fjord.io');
    await expect.element(record.getByRole('link', { name: '+47 912 44 018' })).toHaveAttribute('href', 'tel:+4791244018');
    await expect.element(record.getByRole('button', { name: 'Log activity' })).toBeVisible();
    expect(record.getByRole('tab').elements().map((tab) => tab.textContent)).toEqual(['Activity', 'Deals', 'Notes', 'Files']);
    await expect.element(record.getByRole('textbox', { name: 'Add a note about Mara' })).toBeVisible();
    await expect.element(record.getByRole('button', { name: 'Add note' })).toHaveAttribute('type', 'submit');
    expect(activityTitles(screen)).toHaveLength(4);
    expect(record.element().querySelectorAll('dt')).toHaveLength(5);

    const activity = record.getByRole('list', { name: 'Activity' }).element().getBoundingClientRect();
    const details = record.getByRole('heading', { level: 3, name: 'Details' }).element().getBoundingClientRect();
    if (narrow) {
      await expect.element(screen.getByRole('button', { name: 'Back to contacts' })).toBeVisible();
      expect(screen.getByRole('region', { name: 'Contacts' }).query()).toBeNull();
      expect(details.top).toBeGreaterThanOrEqual(activity.bottom);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(scenario.viewport.width);
    } else {
      expect(screen.getByRole('button', { name: 'Back to contacts' }).query()).toBeNull();
      const list = screen.getByRole('region', { name: 'Contacts' }).element().getBoundingClientRect();
      expect(list.right).toBeLessThanOrEqual(record.element().getBoundingClientRect().left);
      expect(details.left).toBeGreaterThanOrEqual(activity.right);
    }
  });

  test('3. axe passes', async () => {
    const screen = await mount(scenario);
    expect(await violations()).toEqual([]);
    if (scenario.viewport.name === 'narrow') {
      await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
      const nav = page.getByRole('navigation', { name: 'Workspace' });
      await expect.element(nav).toBeVisible();
      // The menu slides in from offscreen, where axe would read its links as skip links.
      await expect.poll(() => nav.element().getBoundingClientRect().left).toBe(0);
      expect(await violations()).toEqual([]);
      await userEvent.keyboard('{Escape}');
      await userEvent.click(screen.getByRole('button', { name: 'Mara Lindqvist' }));
      await expect.element(screen.getByRole('heading', { level: 2, name: 'Mara Lindqvist' })).toBeVisible();
      expect(await violations()).toEqual([]);
    }
  });
});

describe('4. the behavior the block wires', () => {
  test('search narrows by name or company, case-insensitive, and the count follows', async () => {
    const screen = await render(<Crm01 />);
    const search = screen.getByRole('searchbox', { name: 'Search contacts' });

    await userEvent.fill(search, 'fjord');
    expect(rowNames(screen)).toEqual(['Mara Lindqvist']);
    expect(count(screen)).toBe('1');

    await userEvent.fill(search, 'KENJI');
    expect(rowNames(screen)).toEqual(['Kenji Nakamura']);

    await userEvent.fill(search, '');
    expect(rowNames(screen)).toEqual(NAMES);
    expect(count(screen)).toBe('7');
  });

  test('the filter narrows by status, combines with search, and an empty result says so', async () => {
    const screen = await render(<Crm01 />);
    const chips = screen.getByRole('group', { name: 'Filter contacts' });

    await userEvent.click(chips.getByRole('button', { name: 'Leads' }));
    expect(rowNames(screen)).toEqual(['Theo Okafor', 'Sofia Alvarez']);
    expect(count(screen)).toBe('2');

    await userEvent.click(chips.getByRole('button', { name: 'Customers' }));
    expect(rowNames(screen)).toEqual(['Mara Lindqvist', 'Priya Raman', 'Jonas Weber', 'Elena Brooks']);

    await userEvent.click(chips.getByRole('button', { name: 'Churned' }));
    expect(rowNames(screen)).toEqual(['Kenji Nakamura']);

    await userEvent.click(chips.getByRole('button', { name: 'Leads' }));
    await userEvent.fill(screen.getByRole('searchbox', { name: 'Search contacts' }), 'lumen');
    expect(rowNames(screen)).toEqual(['Sofia Alvarez']);
    expect(count(screen)).toBe('1');

    await userEvent.fill(screen.getByRole('searchbox', { name: 'Search contacts' }), 'fjord');
    await expect.element(screen.getByText('No contacts match')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Contacts' }).query()).toBeNull();
    expect(count(screen)).toBe('0');
  });

  test('pressing the pressed chip or row again keeps it pressed', async () => {
    const screen = await render(<Crm01 />);
    const all = screen.getByRole('group', { name: 'Filter contacts' }).getByRole('button', { name: 'All' });
    const mara = screen.getByRole('button', { name: 'Mara Lindqvist' });

    await userEvent.click(all);
    await expect.element(all).toHaveAttribute('aria-pressed', 'true');
    expect(rowNames(screen)).toEqual(NAMES);

    await userEvent.click(mara);
    await expect.element(mara).toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByRole('heading', { level: 2, name: 'Mara Lindqvist' })).toBeVisible();
  });

  test('selecting a row shows its record, which stays when the filter hides it', async () => {
    const screen = await render(<Crm01 />);

    await userEvent.click(screen.getByRole('button', { name: 'Theo Okafor' }));
    await expect.element(screen.getByRole('button', { name: 'Theo Okafor' })).toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByRole('button', { name: 'Mara Lindqvist' })).toHaveAttribute('aria-pressed', 'false');
    const record = screen.getByRole('region', { name: 'Theo Okafor' });
    await expect.element(record.getByRole('heading', { level: 2, name: 'Theo Okafor' })).toBeVisible();
    await expect.element(record.getByRole('button', { name: 'Email' })).toHaveAttribute('href', 'mailto:theo@brightline.co');
    expect(activityTitles(screen)).toHaveLength(1);

    await userEvent.click(screen.getByRole('group', { name: 'Filter contacts' }).getByRole('button', { name: 'Churned' }));
    expect(rowNames(screen)).toEqual(['Kenji Nakamura']);
    await expect.element(record.getByRole('heading', { level: 2, name: 'Theo Okafor' })).toBeVisible();
  });

  test('the composer adds a note to the timeline and Notes, attributed to Ada Kim, and ignores an empty submit', async () => {
    const screen = await render(<Crm01 />);
    const composer = screen.getByRole('textbox', { name: 'Add a note about Mara' });

    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(activityTitles(screen)).toHaveLength(4);

    await userEvent.fill(composer, 'Sent the SSO checklist');
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(activityTitles(screen)).toHaveLength(5);
    expect(activityTitles(screen)[0]).toBe('NoteSent the SSO checklistJust now · Ada Kim');
    await expect.element(composer).toHaveValue('');

    await userEvent.fill(composer, 'Follow up on Friday');
    await userEvent.keyboard('{Enter}');
    expect(activityTitles(screen)[0]).toBe('NoteFollow up on FridayJust now · Ada Kim');

    await userEvent.click(screen.getByRole('tab', { name: 'Notes' }));
    const notes = screen.getByRole('list', { name: 'Notes' }).getByRole('listitem').elements();
    expect(notes.map((note) => note.textContent)).toEqual(['Follow up on FridayJust now · Ada Kim', 'Sent the SSO checklistJust now · Ada Kim']);
  });

  test('Log activity selects the Activity tab and moves focus to the composer', async () => {
    const screen = await render(<Crm01 />);

    await userEvent.click(screen.getByRole('tab', { name: 'Files' }));
    await expect.element(screen.getByText('No files yet')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Log activity' }));

    await expect.element(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
    await expect.element(screen.getByRole('textbox', { name: 'Add a note about Mara' })).toHaveFocus();
  });

  test('at the narrow width the list and the record swap, moving focus to the heading and back to the row', async () => {
    await page.viewport(390, 844);
    const screen = await render(<Crm01 />);

    await userEvent.click(screen.getByRole('button', { name: 'Priya Raman' }));
    const heading = screen.getByRole('heading', { level: 2, name: 'Priya Raman' });
    await expect.element(heading).toHaveFocus();
    expect(screen.getByRole('region', { name: 'Contacts' }).query()).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Back to contacts' }));
    await expect.element(screen.getByRole('button', { name: 'Priya Raman' })).toHaveFocus();
    expect(screen.getByRole('region', { name: 'Priya Raman' }).query()).toBeNull();
  });
});

test('5. the Item recipe holds in place: one Deals list inside a Card, with static rows', async () => {
  expect(descriptor.recipes).toEqual([{ id: 'item', root: { role: 'list', name: 'Deals' } }]);
  const screen = await render(<Crm01 />);
  await userEvent.click(screen.getByRole('tab', { name: 'Deals' }));

  for (const { root } of descriptor.recipes) {
    expect(await screen.getByRole(root.role as 'list', { name: root.name, exact: true }).all()).toHaveLength(1);
  }
  const list = screen.getByRole('list', { name: 'Deals', exact: true }).element();
  const card = (await render(<Card.Root />)).container.firstElementChild as HTMLElement;
  expect(list.parentElement?.className).toBe(card.className);
  const rows = list.querySelectorAll(':scope > li');
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) expect(row.querySelectorAll('a, button, input, select, textarea, [tabindex], [role]')).toHaveLength(0);
});

test('6. the root takes no props', () => {
  expectTypeOf(Crm01).parameters.toEqualTypeOf<[]>();
});
