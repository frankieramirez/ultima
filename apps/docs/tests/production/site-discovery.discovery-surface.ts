/**
 * The production binding for site-discovery.discovery-surface: every route's document.title, the
 * not-found title on both misses, and the robots.txt and sitemap.xml a crawler fetches, in the
 * built docs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseDraft } from '../../../../packages/tokens/src/theme/codec.ts';
import { resolveDraft } from '../../../../packages/tokens/src/theme/draft.ts';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { siteDiscovery } from '../fixtures/site-discovery.ts';

export default productionScenario('site-discovery.discovery-surface', 'production', async ({ page, open, axe }) => {
  for (const { pathname, title } of siteDiscovery.titles) {
    await open(pathname);
    assert.equal(await page.title(), title, `${pathname} serves its own document.title`);
  }
  await axe('the last titled route');

  await open('/install');
  const updateLink = page.locator('main').getByRole('link', { name: 'Update the base theme', exact: true });
  assert.equal(await updateLink.getAttribute('href'), '/install/update');
  await updateLink.click();
  await page.getByRole('heading', { name: 'Update the base theme', level: 1 }).waitFor();
  await page.waitForFunction(() => document.querySelector('main pre code')?.textContent?.startsWith('npx shadcn add'));
  const publicUrl = new URL((await page.locator('main pre code').first().textContent())!.match(/"([^"]+)"/)![1]!);
  assert.equal(publicUrl.origin, siteDiscovery.origin);
  const response = await page.request.get(`${new URL(page.url()).origin}${publicUrl.pathname}${publicUrl.search}`);
  assert.equal(response.status(), 200, 'the production theme endpoint resolves the documented command');
  const item = await response.json();
  const parsed = parseDraft(item.files.find(({ target }: { target: string }) => target === '~/ultima-theme.json').content);
  assert.ok(parsed.ok);
  const frozen = JSON.parse(readFileSync(new URL('../../../../packages/tokens/src/__tests__/fixtures/pre-base-theme-drafts.json', import.meta.url), 'utf8')).cases.find(({ name }: { name: string }) => name === 'preset-ultima-revision-2').resolved;
  assert.deepEqual(resolveDraft(parsed.draft), frozen, 'every documented preset value matches the pre-rollout defaults');
  assert.match(await page.locator('main').innerText(), /never rewrites/);
  await axe('the base-theme update guidance');

  for (const pathname of ['/not-in-the-grimoire', `/components/${siteDiscovery.notFound.component}`]) {
    await open(pathname);
    assert.equal(await page.title(), siteDiscovery.notFound.title, `${pathname} serves the not-found title`);
  }

  const origin = new URL(page.url()).origin;
  const request = page.context().request;

  const robots = await request.get(`${origin}/robots.txt`);
  assert.equal(robots.status(), 200, '/robots.txt is served');
  const robotsText = await robots.text();
  assert.match(robotsText, /user-agent:\s*\*/i, 'robots.txt addresses every agent');
  assert.match(robotsText, /^allow:\s*\/$/im, 'robots.txt allows the site');
  assert.ok(robotsText.includes(`Sitemap: ${siteDiscovery.origin}/sitemap.xml`), 'robots.txt names the sitemap');

  const sitemap = await request.get(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status(), 200, '/sitemap.xml is served');
  const locations = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? '');
  assert.ok(locations.length > 0, 'the sitemap lists URLs');
  for (const { pathname } of siteDiscovery.titles) {
    assert.ok(locations.includes(`${siteDiscovery.origin}${pathname}`), `the sitemap lists ${pathname}`);
  }
  assert.ok(locations.every((loc) => loc.startsWith(`${siteDiscovery.origin}/`)), 'every sitemap URL is on ultima.systems');
});
