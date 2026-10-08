import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import Content from '../content/components/theme-scope.mdx';
import datePickerSource from '../demos/theme-scope/date-picker?raw';
import selectSource from '../demos/theme-scope/select?raw';

test('the page names the omitted-container failure first, then the Base UI and Zag usages', async () => {
  const screen = await render(<Content />);
  await expect.element(screen.getByRole('heading', { name: 'Theme Scope', level: 1 })).toBeVisible();
  const sections = [...document.querySelectorAll('h2')].map((heading) => heading.textContent);
  expect(sections.slice(0, 2)).toEqual(['Install', 'The failure to avoid']);
  expect(sections).toEqual(expect.arrayContaining(['Base UI portals', 'Date Picker']));
  await expect.element(screen.getByRole('combobox', { name: 'Light material' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Release date' })).toBeVisible();
  expect(selectSource).toContain('<Select.Portal container={container}>');
  expect(datePickerSource).toContain('if (!element) return null;');
  expect(datePickerSource).toContain('<DatePicker.Portal container={{ current: element }}>');
});
