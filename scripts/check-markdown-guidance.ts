import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from '../apps/docs/scripts/static-server.ts';
import { docsRoutes, routeShadows } from '../apps/docs/scripts/route-shadows.ts';
import { compositionProjection } from './catalogue/compositions.ts';
import { diskFiles } from './catalogue/files.ts';
import { loadCatalogue } from './catalogue/model.ts';
import { headingAnchors } from './catalogue/source.ts';
import { checkGuidance, markdownGuidance } from './markdown-guidance.ts';

export async function checkMarkdownGuidance(root: string): Promise<{ fetched: number; failures: string[]; indexBytes: number; indexRemainingBytes: number }> {
  const files = diskFiles(fileURLToPath(new URL('..', import.meta.url)));
  const { catalogue, diagnostics } = loadCatalogue(files);
  const composition = compositionProjection(files, catalogue);
  if (diagnostics.length || composition.diagnostics.length) throw new Error('invalid guidance catalogue');
  const expected = await markdownGuidance(files, catalogue, composition);
  const indexBytes = readFileSync(join(root, 'llms.txt')).byteLength;
  const indexRemainingBytes = 64 * 1024 - indexBytes;
  const failures = checkGuidance(join(root, 'guides'), expected).map((path) => `stale Markdown output: ${path}`);
  failures.push(...routeShadows(root, docsRoutes()).map((shadow) => `route shadow: ${shadow.source}`));
  const server = await startStaticServer({ root, nonce: 'markdown-guidance-check', manifestDigest: 'source-parity-check' });
  const fetched = new Map<string, string>();
  const queue = ['/llms.txt'];
  try {
    while (queue.length) {
      const path = queue.shift()!;
      if (fetched.has(path)) continue;
      const response = await fetch(new URL(path, server.url), { headers: { Accept: 'text/markdown, text/plain' }, signal: AbortSignal.timeout(10_000) });
      const text = await response.text();
      fetched.set(path, text);
      if (response.status !== 200 || !/^text\/(markdown|plain)/.test(response.headers.get('content-type') ?? '') || /<!doctype html|<div id="root"/i.test(text)) failures.push(`not Markdown/text over HTTP: ${path}`);
      if (path !== '/llms.txt' && text !== expected.get(path.slice('/guides/'.length))) failures.push(`HTTP source mismatch: ${path}`);
      const prose = text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
      for (const match of prose.matchAll(/https:\/\/ultima\.systems(\/guides\/[^\s)]+\.md(?:#[\w.-]+)?)/g)) {
        const [target, anchor] = match[1]!.split('#');
        if (!expected.has(target!.slice('/guides/'.length))) failures.push(`broken guidance link: ${match[1]}`);
        else if (anchor && !headingAnchors(expected.get(target!.slice('/guides/'.length))!).has(anchor)) failures.push(`missing guidance anchor: ${match[1]}`);
        queue.push(target!);
      }
    }
    for (const path of expected.keys()) if (!fetched.has(`/guides/${path}`)) failures.push(`not discoverable from llms.txt: ${path}`);
    if (indexRemainingBytes < 0) failures.push('llms.txt exceeds 64 KiB');
  } finally {
    await server.close();
  }
  return { fetched: fetched.size, failures, indexBytes, indexRemainingBytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2];
  if (!root) throw new Error('usage: check-markdown-guidance.ts <production-build>');
  const result = await checkMarkdownGuidance(resolve(root));
  console.log(`Markdown HTTP check: ${result.fetched} documents fetched; ${result.failures.length} failures.`);
  console.log(`llms.txt: ${result.indexBytes} bytes; ${result.indexRemainingBytes} bytes remaining before the 64 KiB limit.`);
  for (const failure of result.failures) console.error(failure);
  process.exitCode = result.failures.length ? 1 : 0;
}
