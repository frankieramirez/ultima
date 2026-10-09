import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { appendFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export type Run = (cwd: string, command: string, args: string[]) => Promise<string>;

export const run: Run = (cwd, command, args) => new Promise((done, reject) => {
  const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (data: Buffer) => { output += data.toString(); process.stdout.write(data); });
  child.stderr.on('data', (data: Buffer) => { output += data.toString(); process.stderr.write(data); });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? done(output) : reject(new Error(`${command} ${args.join(' ')} exited ${code}\n${output}`)));
});

/** `eslint` keeps create-next-app's ESLint config, which the lint exercise composes with; every other run scaffolds without it. */
export async function scaffold(layout: 'vite' | 'next-root' | 'next-src' | 'vanilla', app: string, execute: Run = run, options: { eslint?: boolean } = {}): Promise<void> {
  const work = dirname(app);
  const name = relative(work, app);
  if (layout === 'vite' || layout === 'vanilla') {
    await execute(work, 'npm', ['create', 'vite@latest', name, '--', '--template', layout === 'vite' ? 'react-ts' : 'vanilla-ts']);
    if (layout === 'vite') await execute(app, 'npm', ['install']);
  } else {
    await execute(work, 'npx', ['-y', 'create-next-app@latest', name, '--ts', '--app', '--no-tailwind', layout === 'next-src' ? '--src-dir' : '--no-src-dir', options.eslint ? '--eslint' : '--no-eslint', '--turbopack', '--import-alias', '@/*', '--use-npm', '--yes']);
  }
}

export async function packCli(work: string, execute: Run = run): Promise<string> {
  const pack = join(work, 'pack');
  await mkdir(pack, { recursive: true });
  await execute(join(repository, 'packages/cli'), 'pnpm', ['pack', '--pack-destination', pack]);
  const names = (await readdir(pack)).filter((name) => /^ultima-design-.*\.tgz$/.test(name));
  if (names.length !== 1) throw new Error(`expected one CLI tarball in ${pack}, found ${names.length}`);
  return join(pack, names[0]!);
}

export async function serveRegistry(folder: string, fallback = false, log?: string) {
  folder = resolve(folder);
  let logs = Promise.resolve();
  const server = createServer(async (request, response) => {
    if (log) response.on('finish', () => { logs = logs.then(() => appendFile(log, `${request.method} ${request.url} ${response.statusCode}\n`)); });
    try {
      const path = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      let file = resolve(folder, `.${path}`);
      if (file !== folder && !file.startsWith(`${folder}/`)) throw new Error('invalid path');
      try { if (!(await stat(file)).isFile()) throw new Error('not a file'); }
      catch {
        if (!fallback || /^\/r\/|^\/tokens\.(css|json)$|^\/llms\.txt$/.test(path)) throw new Error('missing file');
        file = join(folder, 'index.html');
      }
      const types: Record<string, string> = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      response.end(await readFile(file));
    } catch { response.writeHead(404).end('not found'); }
  });
  await new Promise<void>((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no loopback address');
  if (log) await appendFile(log, `Serving ${folder} at http://127.0.0.1:${address.port}\n`);
  return { url: `http://127.0.0.1:${address.port}`, close: async () => { await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done())); await logs; } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, argument, app] = process.argv.slice(2);
  if (command === 'serve' && argument) {
    const server = await serveRegistry(argument, true);
    console.log(new URL(server.url).port);
  } else if (command === 'pack' && argument) {
    // stdout is the shell bridge's tarball path; pack progress belongs on stderr.
    const execute: Run = async (cwd, cmd, args) => {
      const output = await new Promise<string>((done, reject) => {
        const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] });
        let text = '';
        child.stdout.on('data', (data: Buffer) => { text += data.toString(); });
        child.on('error', reject);
        child.on('close', (code) => code === 0 ? done(text) : reject(new Error(`pack exited ${code}`)));
      });
      process.stderr.write(output);
      return output;
    };
    console.log(await packCli(argument, execute));
  } else if (command === 'scaffold' && app && ['vite', 'next-root', 'next-src', 'vanilla'].includes(argument ?? '')) {
    await scaffold(argument as Parameters<typeof scaffold>[0], resolve(app));
  } else throw new Error('usage: consumer-helpers.ts scaffold <layout> <app> | serve <folder> | pack <work>');
}
