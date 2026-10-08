import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { chromium, type Browser } from 'playwright';

const app = process.argv[2];
if (!app) throw new Error('Expected a consumer directory');
const vite = process.argv.includes('--vite');
const tokenSource = readFileSync(new URL('../packages/tokens/src/tokens.stylex.ts', import.meta.url), 'utf8');
function token(name: string, mode: 'dark' | 'light'): string {
  const entry = tokenSource.match(new RegExp(`'${name}': (.+),`))?.[1];
  assert.ok(entry, `${name} is declared in the token source`);
  const literal = entry.match(/^'([^']+)'$/)?.[1];
  if (literal) return literal;
  const expression = entry.match(mode === 'dark' ? /default: ([^,}]+)/ : /\[LIGHT\]: ([^,}]+)/)?.[1]?.trim();
  const reference = expression?.match(/^(\w+)\.(\w+)$/);
  const palette = reference && tokenSource.match(new RegExp(`export const ${reference[1]} = stylex\\.defineConsts\\(\\{([\\s\\S]*?)\\n\\}\\);`))?.[1];
  const value = reference && palette
    ? palette.match(new RegExp(`${reference[2]}: '([^']+)'`))?.[1]
    : expression?.match(/^'([^']+)'$/)?.[1];
  assert.ok(value, `${name} has a ${mode} value in the token source`);
  return value;
}
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = (reservation.address() as AddressInfo).port;
await new Promise<void>((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
const command = vite
  ? [join(app, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort']
  : [join(app, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)];
const server = spawn(process.execPath, command, { cwd: app, stdio: 'inherit' });
let browser: Browser | undefined;
try {
  const url = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Consumer exited with ${server.exitCode}`);
    try { ready = (await fetch(url)).ok; } catch {}
    if (ready) break;
    await setTimeout(500);
  }
  assert.ok(ready, 'production server started');
  browser = await chromium.launch({ headless: true });
  for (const mode of ['dark', 'light'] as const) {
    const page = await browser.newPage({ colorScheme: mode });
    await page.goto(url);
    const button = page.getByRole('button', { name: 'StyleX smoke', exact: true });
    const danger = page.getByRole('button', { name: 'StyleX danger smoke', exact: true });
    await button.waitFor();
    const expected = {
      radius: token('--ult-radius-md', mode),
      accent: token('--ult-color-accent', mode),
      focus: token('--ult-color-border-focus', mode),
      danger: token('--ult-color-danger', mode),
    };
    const normalized = await page.evaluate((values) => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const result = Object.fromEntries(Object.entries(values).map(([name, value]) => {
        probe.style.color = value;
        return [name, getComputedStyle(probe).color];
      }));
      probe.remove();
      return result;
    }, { accent: expected.accent, focus: expected.focus, danger: expected.danger });
    const styles = await button.evaluate((element) => {
      const css = getComputedStyle(element);
      return { height: css.height, display: css.display, radius: css.borderRadius, background: css.backgroundColor };
    });
    const rootSize = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
    assert.equal(styles.height, `${Number.parseFloat(token('--ult-space-10', mode)) * rootSize}px`);
    assert.equal(styles.display, 'inline-flex');
    assert.equal(styles.radius, expected.radius);
    assert.equal(styles.background, normalized.accent);
    for (const key of ['accent', 'focus'] as const) {
      const channels = normalized[key]?.match(/\d+/g);
      assert.ok(channels && channels[0] === channels[1] && channels[1] === channels[2], `${key} is neutral`);
    }
    await page.keyboard.press('Tab');
    assert.equal(await button.evaluate((element) => element.matches(':focus-visible')), true);
    const focus = await button.evaluate((element) => ({ color: getComputedStyle(element).outlineColor, style: getComputedStyle(element).outlineStyle }));
    assert.equal(focus.color, normalized.focus);
    assert.equal(focus.style, 'solid');
    assert.equal(await danger.evaluate((element) => getComputedStyle(element).backgroundColor), normalized.danger);
    console.log(`Production ${vite ? 'Vite' : 'Next'} ${mode} Button styles: ${JSON.stringify({ ...styles, focus, danger: normalized.danger })}`);
    await page.screenshot({ path: join(app, `production-styles-${mode}.png`) });
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'exit');
}
