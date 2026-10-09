import { expect, test } from 'vitest';

import { components } from '../components';
import { blocks } from '../generated/blocks';
import { router } from '../router';

/** A route's pages: a param route lists every item it serves, and a block or screen preview exists only to be framed. */
function pagesOf(path: string): string[] {
  if (path === '/components/$name') return components.map(({ item }) => `/components/${item}`);
  if (path === '/blocks/$id') return blocks.map(({ id }) => `/blocks/${id}`);
  if (path === '/blocks/$id/preview' || path === '/build-a-screen/$lesson/preview') return [];
  return [path];
}

test('the sitemap lists exactly the routes the router serves', async () => {
  const sitemap = await (await fetch('/sitemap.xml')).text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const served = Object.keys(router.routesByPath).flatMap(pagesOf);
  expect(locations.slice().sort()).toEqual(served.map((path) => `https://ultima.systems${path}`).sort());
});

test('robots.txt allows the site and names the sitemap', async () => {
  const robots = await (await fetch('/robots.txt')).text();
  expect(robots).toMatch(/^user-agent:\s*\*$/im);
  expect(robots).toMatch(/^allow:\s*\/$/im);
  expect(robots).toContain('Sitemap: https://ultima.systems/sitemap.xml');
});
