import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, mkdir, rename, rmdir, stat, cp } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { presetDraft, resolveDraft, THEME_PRESETS } from '../packages/tokens/src/theme/draft.ts';
import { parseDraft, serializeDraft } from '../packages/tokens/src/theme/codec.ts';
import { toRegistryItem } from '../packages/tokens/src/theme/export.ts';

const root = process.cwd();
await mkdir(join(root, '.scratch'), { recursive: true });
const output = await mkdtemp(join(root, '.scratch/theme-consumer-'));
const log = join(output, 'commands.log');
const results: { target: string; preset: string; modes: number; tokens: number }[] = [];
async function run(cwd: string, command: string, args: string[]) {
  const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let result = '';
  child.stdout.on('data', (data: Buffer) => { result += data.toString(); });
  child.stderr.on('data', (data: Buffer) => { result += data.toString(); });
  const [status] = await once(child, 'exit');
  const { appendFile } = await import('node:fs/promises');
  await appendFile(log, `$ ${command} ${args.join(' ')}\n${result}\n`);
  assert.equal(status, 0, `${command} ${args.join(' ')} failed: ${result}`);
}
async function serve(folder: string, fallback = false) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      let file = resolve(folder, `.${pathname}`);
      if (!file.startsWith(`${folder}/`) && file !== folder) throw new Error('Invalid path');
      try { if (!(await stat(file)).isFile()) throw new Error('Not a file'); }
      catch { if (!fallback) throw new Error('Missing file'); file = join(folder, 'index.html'); }
      const types: Record<string, string> = { '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
      response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
      response.end(await readFile(file));
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { server, url: `http://127.0.0.1:${address.port}` };
}
const component = `'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/popover';
export default function ThemeConsumer() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return <main data-hydrated={hydrated}><Button>Theme control</Button><Popover.Root><Popover.Trigger render={<Button />}>Theme popup</Popover.Trigger><Popover.Portal><Popover.Positioner><Popover.Popup><Popover.Title>Installed theme</Popover.Title><Popover.Description>Inherited from the document root after hydration.</Popover.Description></Popover.Popup></Popover.Positioner></Popover.Portal></Popover.Root><Button disabled>Disabled</Button></main>;
}
`;
await cp(join(root, 'apps/docs/public/r'), join(output, 'registry/r'), { recursive: true });
const registry = await serve(join(output, 'registry'));
const nodeBin = process.execPath;
let browser: Browser | undefined;
try {
  browser = await chromium.launch({ headless: true });
  for (const target of ['vite', 'next-app', 'next-src-app']) {
    const app = join(output, target);
    const source = join(app, target === 'next-app' ? '' : 'src');
    const next = target !== 'vite';
    await mkdir(source, { recursive: true });
    await writeFile(join(app, 'package.json'), JSON.stringify({ name: `theme-${target}`, private: true, ...(next ? {} : { type: 'module' }), dependencies: { react: '^19.2.8', 'react-dom': '^19.2.8', ...(next ? { next: '^16.2.0' } : { vite: '^8.2.2', '@vitejs/plugin-react': '^6.1.1' }) }, devDependencies: { typescript: '^5.9.3', '@types/node': '^26.5.0', '@types/react': '^19.2.0', '@types/react-dom': '^19.2.0' } }, null, 2));
    await writeFile(join(app, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['dom', 'dom.iterable', 'esnext'], skipLibCheck: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', jsx: 'react-jsx', noEmit: true, resolveJsonModule: true, paths: { '@/*': [target === 'next-app' ? './*' : './src/*'] } } }, null, 2));
    if (!next) {
      await writeFile(join(app, 'index.html'), '<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
      await writeFile(join(app, 'vite.config.ts'), "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport { ultimaStylex } from './ultima.vite';\nexport default defineConfig({ plugins: [ultimaStylex(), react()] });\n");
      await writeFile(join(source, 'main.tsx'), "import { createRoot } from 'react-dom/client';\nimport './index.css';\nimport '../ultima-theme.css';\nimport ThemeConsumer from './ThemeConsumer';\ncreateRoot(document.getElementById('root')!).render(<ThemeConsumer />);\n");
      await writeFile(join(source, 'index.css'), '@layer reset { body { margin: 0 } } body { background: var(--ult-color-surface); color: var(--ult-color-text); font-family: var(--ult-font-sans) }');
    } else {
      await mkdir(join(source, 'app'), { recursive: true });
      await writeFile(join(source, 'app/layout.tsx'), `import './ultima.css';\nimport '${target === 'next-app' ? '../' : '../../'}ultima-theme.css';\nexport default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n`);
      await writeFile(join(source, 'app/page.tsx'), "import ThemeConsumer from '../ThemeConsumer';\nexport default function Page() { return <ThemeConsumer />; }\n");
    }
    console.log(`${target}: installing source into ${app}`);
    await run(app, 'npm', ['install', '--no-audit', '--no-fund']);
    await run(app, 'npx', ['--yes', 'shadcn@latest', 'add', `${registry.url}/r/setup-${next ? 'next' : 'vite'}.json`, '--yes']);
    if (target === 'next-src-app') {
      await rename(join(app, 'app/ultima.css'), join(source, 'app/ultima.css'));
      await rmdir(join(app, 'app'));
    }
    const config = JSON.parse(await readFile(join(app, 'components.json'), 'utf8'));
    config.registries['@ultima'] = `${registry.url}/r/{name}.json`;
    await writeFile(join(app, 'components.json'), JSON.stringify(config, null, 2));
    await run(app, 'npx', ['--yes', 'shadcn@latest', 'add', '@ultima/button', '@ultima/popover', '--yes']);
    await writeFile(join(source, 'ThemeConsumer.tsx'), component);
    for (const preset of THEME_PRESETS) {
      const draft = presetDraft(preset.id);
      const item = join(output, `${preset.id}.registry.json`);
      await writeFile(item, toRegistryItem(draft));
      await run(app, 'npx', ['--yes', 'shadcn@latest', 'add', item, '--yes', '--overwrite']);
      const installed = parseDraft(await readFile(join(app, 'ultima-theme.json'), 'utf8'));
      assert.ok(installed.ok);
      assert.equal(serializeDraft(installed.draft), serializeDraft(draft));
      await run(app, 'npx', ['--no-install', next ? 'next' : 'vite', 'build']);
      const built = !next ? await serve(join(app, 'dist'), true) : null;
      const serverProcess = next ? spawn(nodeBin, [join(app, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '0'], { cwd: app, stdio: ['ignore', 'pipe', 'pipe'] }) : null;
      let url = built?.url ?? '';
      try {
        if (serverProcess) {
          url = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Next did not start')), 30000);
            serverProcess.stdout!.on('data', (data: Buffer) => { const match = data.toString().match(/http:\/\/127\.0\.0\.1:(\d+)/); if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); } });
            serverProcess.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}`)); });
          });
        }
        const page = await browser.newPage();
        await page.goto(url);
        await page.locator('[data-hydrated="true"]').waitFor();
        const tables = resolveDraft(draft);
        for (const variant of [{ mode: 'dark', system: false }, { mode: 'light', system: false }, { mode: 'dark', system: true }, { mode: 'light', system: true }] as const) {
          await page.emulateMedia({ colorScheme: variant.mode, reducedMotion: 'no-preference' });
          await page.evaluate(({ mode, system }) => { if (system) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', mode); }, variant);
          const control = page.getByRole('button', { name: 'Theme control', exact: true });
          await control.focus();
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          assert.notEqual(await control.evaluate((el) => getComputedStyle(el).outlineStyle), 'none');
          await page.getByRole('button', { name: 'Theme popup', exact: true }).click();
          const popup = page.getByRole('dialog', { name: 'Installed theme' });
          await popup.waitFor();
          for (const element of [page.locator('html'), control, popup]) {
            const pairs = await element.evaluate((el, expected) => {
              const a = document.createElement('div');
              const b = document.createElement('div');
              a.style.fontSize = b.style.fontSize = '16px';
              document.body.append(a, b);
              const values = Object.entries(expected).map(([token, value]) => {
                const property = token.startsWith('--ult-color-') ? 'color' : token.startsWith('--ult-space-') ? 'margin-left' : token.startsWith('--ult-text-') ? 'font-size' : token.startsWith('--ult-radius-') ? 'border-radius' : token.startsWith('--ult-shadow-') ? 'box-shadow' : token.startsWith('--ult-filter-') ? 'filter' : token.startsWith('--ult-motion-') ? 'transition-duration' : token.includes('tracking') ? 'letter-spacing' : token.includes('leading') ? 'line-height' : token.includes('weight') ? 'font-weight' : 'font-family';
                a.style.cssText = b.style.cssText = 'font-size:16px';
                a.style.setProperty(property, getComputedStyle(el).getPropertyValue(token).trim());
                b.style.setProperty(property, value);
                return [token, getComputedStyle(a).getPropertyValue(property), getComputedStyle(b).getPropertyValue(property)];
              });
              a.remove(); b.remove();
              return values;
            }, tables[variant.mode]);
            for (const [token, actual, expected] of pairs) {
              const canonical = (value: string) => value.replace(/rgba\(([^,]+), ([^,]+), ([^,]+), ([\d.]+)\)/g, (_, r, g, b, alpha) => `rgba(${r}, ${g}, ${b}, ${Math.round(Number(alpha) * 255) / 255})`).replace(/-?\d*\.?\d+/g, (number) => String(Math.round(Number(number) * 1000) / 1000));
              assert.equal(canonical(actual!), canonical(expected!), `${target}/${preset.id}/${variant.mode}/${variant.system ? 'system' : 'explicit'} ${token} paints the preview value`);
            }
            assert.equal(await element.evaluate((el) => getComputedStyle(el).colorScheme), variant.mode);
          }
          await page.keyboard.press('Escape');
          await popup.waitFor({ state: 'hidden' });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          assert.equal(await control.evaluate((el) => getComputedStyle(el).getPropertyValue('--ult-motion-loop').trim()), '0s');
          assert.equal(await control.evaluate((el) => getComputedStyle(el).getPropertyValue('--ult-motion-fast').trim()), '1ms');
        }
        results.push({ target, preset: preset.id, modes: 4, tokens: Object.keys(tables.dark).length });
        await page.close();
        console.log(`${target}/${preset.id}: installed registry output, hydrated control, popup, explicit/system modes and reduced motion passed`);
      } finally {
        await new Promise<void>((resolve) => built ? built.server.close(() => resolve()) : resolve());
        if (serverProcess && serverProcess.exitCode === null) {
          const stop = setTimeout(() => serverProcess.kill('SIGKILL'), 5000);
          serverProcess.kill('SIGTERM');
          await once(serverProcess, 'exit');
          clearTimeout(stop);
        }
      }
    }
  }
  await writeFile(join(output, 'report.json'), JSON.stringify({ status: 'passed', results }, null, 2));
  console.log(`Theme consumer proof: ${output}/report.json`);
} finally {
  await browser?.close();
  await new Promise<void>((resolve) => registry.server.close(() => resolve()));
}
