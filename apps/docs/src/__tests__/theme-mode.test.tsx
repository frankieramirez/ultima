import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { themeModeScript } from '@ultima/ui/theme-mode';
import Content from '../content/components/theme-mode.mdx';

test('the displayed Vite head script equals the copied source generator', async () => {
  const screen = await render(<Content />);
  await expect.element(screen.getByRole('heading', { name: 'Theme Mode', level: 1 })).toBeVisible();
  const snippets = [...document.querySelectorAll('pre code')].map((node) => node.textContent ?? '');
  const printed = snippets.find((text) => text.startsWith('<script>'))?.match(/<script>(.*?)<\/script>/s)?.[1];
  expect(printed).toBe(themeModeScript());
  expect(document.body.textContent).toContain('app/layout.tsx');
  expect(document.body.textContent).toContain('src/app/layout.tsx');
  expect(snippets.join('\n')).toContain('suppressHydrationWarning');
  expect(snippets.join('\n')).toContain('<head><ThemeModeScript /></head>');
});
