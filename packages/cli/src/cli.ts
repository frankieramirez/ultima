import { run } from './run.ts';

const argv = process.argv.slice(2);
// Only the hidden `hook` reads stdin: the harness writes its post-edit payload there.
const stdin = argv[0] === 'hook' ? await readStdin() : '';
const { code, stdout, stderr } = await run(argv, stdin);
process.stdout.write(stdout);
process.stderr.write(stderr);
process.exitCode = code;

async function readStdin(): Promise<string> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  } catch {
    return '';
  }
}
