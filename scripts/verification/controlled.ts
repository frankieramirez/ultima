/**
 * A controlled subprocess for run.test.ts: each mode behaves like one way a real check can end. It is
 * test tooling, never a check adapter.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';

const [mode, ...args] = process.argv.slice(2);
const evidence = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value));
const forever = () => setInterval(() => {}, 1 << 30);

function serve(port: number, nonce: string | undefined) {
  const server = createServer((request, response) => {
    if (request.url === '/__ultima-verify/identity') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ nonce }));
    } else response.end('ok');
  });
  server.on('error', (error) => {
    console.error(error.message);
    process.exit(98);
  });
  server.listen(port, '127.0.0.1');
  return server;
}

switch (mode) {
  case 'pass': {
    const [path, ...ids] = args as [string, ...string[]];
    evidence(path, { executed: ids, failures: [], skipped: [] });
    break;
  }
  case 'skip': {
    const [path, ...ids] = args as [string, ...string[]];
    evidence(path, { executed: ids.slice(1), failures: [], skipped: ids.slice(0, 1) });
    break;
  }
  case 'fail': {
    evidence(args[0] as string, { executed: ['suite.test.ts'], failures: ['suite.test.ts > renders: expected 1, got 2'], skipped: [] });
    process.exitCode = 1;
    break;
  }
  case 'zero':
    evidence(args[0] as string, { executed: [], failures: [], skipped: [] });
    break;
  case 'timed': {
    // Records when it ran, for the lock test, then passes.
    const [path, log, id, ms] = args as [string, string, string, string];
    appendFileSync(log, `${id} start ${Date.now()}\n`);
    setTimeout(() => {
      appendFileSync(log, `${id} end ${Date.now()}\n`);
      evidence(path, { executed: [id], failures: [], skipped: [] });
    }, Number(ms));
    break;
  }
  case 'hang': {
    // A grandchild in its own session leaves the process group; only the ownership token finds it.
    const escaped = spawn(process.execPath, [...process.execArgv, process.argv[1] as string, 'sleep'], { detached: true, stdio: 'ignore' });
    escaped.unref();
    const grouped = spawn(process.execPath, [...process.execArgv, process.argv[1] as string, 'sleep'], { stdio: 'ignore' });
    writeFileSync(args[0] as string, JSON.stringify([process.pid, escaped.pid, grouped.pid]));
    process.on('SIGTERM', () => {});
    forever();
    break;
  }
  case 'sleep':
    forever();
    break;
  case 'orphan': {
    // Exits at once and leaves a detached descendant behind, as a careless script might.
    const left = spawn(process.execPath, [...process.execArgv, process.argv[1] as string, 'sleep'], { detached: true, stdio: 'ignore' });
    left.unref();
    writeFileSync(args[0] as string, JSON.stringify([left.pid]));
    evidence(args[1] as string, { executed: ['orphan'], failures: [], skipped: [] });
    break;
  }
  case 'crash':
    process.kill(process.pid, 'SIGSEGV');
    forever();
    break;
  case 'mutate':
    appendFileSync(args[0] as string, 'changed during the run\n');
    evidence(args[1] as string, { executed: ['mutate'], failures: [], skipped: [] });
    break;
  case 'server':
    serve(Number(process.env.ULTIMA_VERIFY_PORT), process.env.ULTIMA_VERIFY_NONCE);
    break;
  case 'stale-server':
    serve(Number(process.env.ULTIMA_VERIFY_PORT), 'nonce-from-an-earlier-run');
    break;
  case 'busy-server':
    // Ignores the port it was given and collides with one the test already holds.
    serve(Number(args[0]), process.env.ULTIMA_VERIFY_NONCE);
    break;
  case 'report':
    evidence(args[1] as string, { executed: ['report'], failures: [], skipped: [], seen: JSON.parse(readFileSync(args[0] as string, 'utf8')) });
    break;
  default:
    console.error(`unknown mode ${mode}`);
    process.exit(2);
}
