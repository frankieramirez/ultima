import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, type AddressInfo } from 'node:net';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { chromium, type Browser } from 'playwright';

const app = process.argv[2];
if (!app) throw new Error('Expected a Next consumer directory');
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = (reservation.address() as AddressInfo).port;
await new Promise<void>((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
const server = spawn(process.execPath, [join(app, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: app, stdio: 'inherit' });
let browser: Browser | undefined;
try {
  const url = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next exited with ${server.exitCode}`);
    try { ready = (await fetch(url)).ok; } catch {}
    if (ready) break;
    await setTimeout(500);
  }
  assert.ok(ready, 'production server started');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);
  const button = page.getByRole('button', { name: 'StyleX smoke', exact: true });
  await button.waitFor();
  const styles = await button.evaluate((element) => {
    const css = getComputedStyle(element);
    return { height: css.height, display: css.display, radius: css.borderRadius, background: css.backgroundColor };
  });
  assert.equal(styles.height, '40px');
  assert.equal(styles.display, 'inline-flex');
  assert.equal(styles.radius, '10px');
  assert.notEqual(styles.background, 'rgba(0, 0, 0, 0)');
  console.log(`Production Button styles: ${JSON.stringify(styles)}`);
  await page.screenshot({ path: join(app, 'production-styles.png') });
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'exit');
}
