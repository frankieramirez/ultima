import { expect, test } from 'vitest';

import { scenario } from '../../../../scripts/verification/register.ts';
import { recipes } from '../generated/recipes';
import { RecipesPage } from '../routes/recipes';
import { renderWithRouter } from './render-with-router';

test('every recipe appears once with its canonical anchor and derived install commands', scenario('screen-composition.recipe-index', 'docs-vitest', async () => {
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
  expect(recipes.find((recipe) => recipe.id === 'chart')?.engines).toContain('npm install -D @types/d3-array @types/d3-format @types/d3-scale');
}));

test('llms.txt indexes every recipe and its Markdown export includes install and engine commands', async () => {
  const guide = await (await fetch('/llms.txt')).text();
  const section = guide.split('\n## Recipes\n')[1]!.split('\n## ')[0]!;
  for (const recipe of recipes) {
    expect(section.split(`### ${recipe.title}\n`).length - 1).toBe(1);
    expect(section).toContain(`https://ultima.systems${recipe.url}`);
    const path = `/guides/recipes/${recipe.id}.md`;
    expect(section).toContain(`https://ultima.systems${path}`);
    const response = await fetch(path);
    expect(response.status).toBe(200);
    const bundle = await response.text();
    expect(bundle).toContain(recipe.install);
    if (recipe.engines) expect(bundle).toContain(recipe.engines);
  }
  for (const id of ['chart', 'data-table', 'react-hook-form']) expect(recipes.find((recipe) => recipe.id === id)?.engines).toMatch(/^npm install /);
});
