import { expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import Projects from '../examples/complete-screen/projects';
import '../styles.css';

const description = (element: Element) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent)
    .filter(Boolean);

test('an empty required name shows an associated error', async () => {
  const screen = await render(<Projects />);
  const name = screen.getByRole('textbox', { name: 'Project name', exact: true });

  await userEvent.click(screen.getByRole('button', { name: 'Create project', exact: true }));

  await expect.element(name).toHaveAttribute('aria-invalid', 'true');
  expect(description(name.element())).toEqual(['Enter a project name.']);
  await expect.element(screen.getByRole('status')).toHaveTextContent('');
});

test('a valid submission adds a row with the chosen owner and announces success', async () => {
  const screen = await render(<Projects />);

  await userEvent.fill(screen.getByRole('textbox', { name: 'Project name', exact: true }), 'Nimbus');
  await userEvent.click(screen.getByRole('combobox', { name: 'Owner', exact: true }));
  await userEvent.click(screen.getByRole('option', { name: 'Priya Shah', exact: true }));
  await userEvent.click(screen.getByRole('button', { name: 'Create project', exact: true }));

  await expect.element(screen.getByRole('status')).toHaveTextContent('Created Nimbus.');
  const row = screen.getByRole('row', { name: /^Nimbus Priya Shah Active/ });
  await expect.element(row).toBeVisible();
  expect(screen.getByRole('table').element().querySelectorAll('tbody tr')).toHaveLength(4);
});

test('the owner Select works from the keyboard', async () => {
  const screen = await render(<Projects />);
  const owner = screen.getByRole('combobox', { name: 'Owner', exact: true });

  owner.element().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await userEvent.keyboard('{ArrowDown}{Enter}');

  await expect.element(screen.getByRole('listbox')).not.toBeInTheDocument();
  await expect.element(owner).toHaveTextContent('Priya Shah');
  await expect.element(owner).toHaveFocus();
});

test('Reset restores the initial form', async () => {
  const screen = await render(<Projects />);
  const name = screen.getByRole('textbox', { name: 'Project name', exact: true });
  const owner = screen.getByRole('combobox', { name: 'Owner', exact: true });

  await userEvent.click(screen.getByRole('button', { name: 'Create project', exact: true }));
  await userEvent.fill(name, 'Draft');
  await userEvent.click(owner);
  await userEvent.click(screen.getByRole('option', { name: 'Tomás Ruiz', exact: true }));
  await userEvent.click(screen.getByRole('button', { name: 'Reset', exact: true }));

  await expect.element(name).toHaveValue('');
  await expect.element(name).not.toHaveAttribute('aria-invalid');
  await expect.element(owner).toHaveTextContent('Ada Park');
});

test('the Dialog edits a project and returns focus to its trigger', async () => {
  const screen = await render(<Projects />);

  screen.getByRole('button', { name: 'Edit Aster', exact: true }).element().focus();
  await userEvent.keyboard('{Enter}');
  const dialog = screen.getByRole('dialog', { name: 'Edit Aster', exact: true });
  await expect.element(dialog).toBeVisible();
  await userEvent.fill(dialog.getByRole('textbox', { name: 'Name', exact: true }), 'Aster Prime');
  await userEvent.click(dialog.getByRole('button', { name: 'Save changes', exact: true }));

  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(screen.getByRole('row', { name: /^Aster Prime Ada Park/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Edit Aster Prime', exact: true })).toHaveFocus();
});

test('clearing the list offers a restore action, and navigation marks the current route', async () => {
  const screen = await render(<Projects />);

  await userEvent.click(screen.getByRole('button', { name: 'Clear projects', exact: true }));
  await expect.element(screen.getByRole('heading', { name: 'No projects', exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Restore sample projects', exact: true }));
  await expect.element(screen.getByRole('row', { name: /^Aster / })).toBeVisible();

  const activity = screen.getByRole('link', { name: 'Activity', exact: true });
  await userEvent.click(activity);
  await expect.element(activity).toHaveAttribute('aria-current', 'page');
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
  await expect.element(screen.getByText('Restored the sample projects.')).toBeVisible();
});

test('one column at 390px with a keyboard-reachable table scroll, two columns at 1280px', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await render(<Projects />);
  const form = screen.getByRole('form', { name: 'New project' }).element().getBoundingClientRect();
  const region = screen.getByRole('region', { name: 'Projects, newest first' }).element() as HTMLElement;

  expect(form.bottom).toBeLessThanOrEqual(region.getBoundingClientRect().top);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
  expect(region.tabIndex).toBe(0);
  region.focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => region.scrollLeft).toBeGreaterThan(0);

  await page.viewport(1280, 720);
  await expect.poll(() => screen.getByRole('form', { name: 'New project' }).element().getBoundingClientRect().right)
    .toBeLessThanOrEqual(region.getBoundingClientRect().left);
  expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
});
