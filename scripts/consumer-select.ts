import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repository } from './consumer-helpers.ts';
import type { Plan } from './verification/plan.ts';
import { run } from './verify.ts';

export function consumerMatrix(plan: Pick<Plan, 'checks'>) {
  const proof: { layout: string; 'delivery-path': string }[] = [];
  const mode: { layout: string }[] = [];
  for (const { argv } of plan.checks) {
    if (argv[2] !== 'scripts/consumer-proof.ts') continue;
    const value = (flag: string) => argv[argv.indexOf(flag) + 1] as string;
    if (argv.includes('--exercise')) mode.push({ layout: value('--layout') });
    else proof.push({ layout: value('--layout'), 'delivery-path': value('--delivery-path') });
  }
  return { proof, mode };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.argv[2];
  const output = run(base ? ['changed', '--base', base, '--plan', '--json'] : ['release', '--plan', '--json'], repository);
  if (output.exit !== 0) throw new Error(`verification plan exited ${output.exit}\n${output.stdout}`);
  const plan = JSON.parse(output.stdout) as Plan;
  const { proof, mode } = consumerMatrix(plan);
  process.stderr.write(`${plan.command} plan, ${plan.scope} scope: ${proof.length} rendered and ${mode.length} theme-mode consumer cells\n`);
  for (const fallback of plan.fallbacks) process.stderr.write(`  ${fallback.reason}${fallback.paths.length ? `: ${fallback.paths.join(', ')}` : ''}\n`);
  console.log(`proof=${JSON.stringify(proof)}\nmode=${JSON.stringify(mode)}`);
}
