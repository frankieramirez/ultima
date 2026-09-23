import { run } from './run.ts';

const { code, stdout, stderr } = run(process.argv.slice(2));
process.stdout.write(stdout);
process.stderr.write(stderr);
process.exitCode = code;
