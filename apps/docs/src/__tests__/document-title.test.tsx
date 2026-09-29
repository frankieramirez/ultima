import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { scenario } from '../../../../scripts/verification/register.ts';
import { siteDiscovery } from '../../tests/fixtures/site-discovery';
import { routeTree, router } from '../router';

async function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

test('every leaf route declares the title documentTitle serves', () => {
  const untitled = Object.values(router.routesById)
    .filter((route) => route.id !== '__root__' && route.options.staticData?.title === undefined)
    .map((route) => route.id);
  expect(untitled).toEqual([]);
});

for (const { pathname, title } of siteDiscovery.titles) {
  test(`a direct load of ${pathname} titles the document ${title}`, async () => {
    const view = await mount(pathname);
    await expect.poll(() => document.title).toBe(title);
    view.unmount();
  });
}

test('an unknown path takes the not-found title', async () => {
  const view = await mount('/not-in-the-grimoire');
  await expect.poll(() => document.title).toBe(siteDiscovery.notFound.title);
  view.unmount();
});

test(
  'the title follows a navigation, both not-found shapes included, and the crawler files serve',
  scenario('site-discovery.discovery-surface', 'docs-vitest', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const testRouter = createRouter({ routeTree, history });
    const view = await render(<RouterProvider router={testRouter} />);
    await expect.poll(() => document.title).toBe('React components. Built with StyleX. Yours to change. — Ultima');

    await testRouter.navigate({ to: '/rationale' });
    await expect.poll(() => document.title).toBe('Rationale — Ultima');

    await testRouter.navigate({ to: '/components/$name', params: { name: 'button' } });
    await expect.poll(() => document.title).toBe('Button — Ultima');

    await testRouter.navigate({ to: '/components/$name', params: { name: siteDiscovery.notFound.component } });
    await expect.poll(() => document.title).toBe(siteDiscovery.notFound.title);

    const robots = await (await fetch('/robots.txt')).text();
    expect(robots).toMatch(/^user-agent:\s*\*$/im);
    expect(robots).toMatch(/^allow:\s*\/$/im);
    expect(robots).toContain(`Sitemap: ${siteDiscovery.origin}/sitemap.xml`);

    const sitemap = await (await fetch('/sitemap.xml')).text();
    expect(sitemap).toContain(`<loc>${siteDiscovery.origin}/rationale</loc>`);

    view.unmount();
  }),
);
