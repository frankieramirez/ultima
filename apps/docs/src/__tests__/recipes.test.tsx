import { expect, test } from 'vitest';

import { recipes } from '../generated/recipes';
import { RecipesPage } from '../routes/recipes';
import { renderWithRouter } from './render-with-router';

test('every recipe appears once with its canonical anchor and derived install commands', async () => {
  const screen = await renderWithRouter(<RecipesPage />);
  const list = screen.container.querySelector('ul[aria-label="Recipes"]')!;
  expect(list.children.length).toBe(recipes.length);
  for (const recipe of recipes) {
    const card = [...list.children].find((node) => node.querySelector('h2')?.textContent === recipe.title)!;
    expect(card).toBeDefined();
    expect(card.textContent).toContain(recipe.description);
    expect(card.querySelector('h2 a')?.getAttribute('href')).toBe(recipe.url);
    expect(card.querySelector('pre')?.textContent).toBe([recipe.install, recipe.engines].filter(Boolean).join('\n'));
    expect(recipe.install).not.toContain(`@ultima/${recipe.id}`);
  }
});

test('llms.txt lists every recipe once and includes the Chart, Data Table and React Hook Form engines', async () => {
  const guide = await (await fetch('/llms.txt')).text();
  const section = guide.split('\n## Recipes\n')[1]!.split('\n## ')[0]!;
  for (const recipe of recipes) {
    expect(section.split(`### ${recipe.title}\n`).length - 1).toBe(1);
    expect(section).toContain(`https://ultima.systems${recipe.url}`);
    expect(section).toContain(recipe.install);
    if (recipe.engines) expect(section).toContain(recipe.engines);
  }
  for (const id of ['chart', 'data-table', 'react-hook-form']) expect(recipes.find((recipe) => recipe.id === id)?.engines).toMatch(/^npm install /);
});
