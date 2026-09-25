import { expect, test } from 'vitest';

import { components } from '../components';
import { router } from '../router';

test('the sitemap lists exactly the routes the router serves', async () => {
  const sitemap = await (await fetch('/sitemap.xml')).text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const served = Object.keys(router.routesByPath).flatMap((path) =>
    path === '/components/$name' ? components.map(({ item }) => `/components/${item}`) : [path],
  );
  expect(locations.slice().sort()).toEqual(served.map((path) => `https://ultima.systems${path}`).sort());
});

test('robots.txt allows the site and names the sitemap', async () => {
  const robots = await (await fetch('/robots.txt')).text();
  expect(robots).toMatch(/^user-agent:\s*\*$/im);
  expect(robots).toMatch(/^allow:\s*\/$/im);
  expect(robots).toContain('Sitemap: https://ultima.systems/sitemap.xml');
});
