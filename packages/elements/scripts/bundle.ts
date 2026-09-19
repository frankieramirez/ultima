// The artifact contract (docs/spec/ultima.md, Web components): one self-contained ESM
// file, no bare specifiers, so every runtime import — @zag-js/*, @floating-ui/dom — is
// inlined. Minified because the recorded bundle budget was measured that way (ADR 0008).
import { build } from 'esbuild';

export async function bundleArtifact(entryFile: string): Promise<string> {
  const result = await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    logLevel: 'silent',
    metafile: true,
  });
  const [output] = result.outputFiles ?? [];
  if (!output) throw new Error(`esbuild produced no output for ${entryFile}`);
  const meta = Object.values(result.metafile?.outputs ?? {})[0];
  const leftovers = [
    ...(meta?.imports ?? []).map((entry) => `import ${entry.path}`),
    ...(meta?.exports ?? []).map((name) => `export ${name}`),
  ];
  if (leftovers.length > 0) {
    throw new Error(`${entryFile} is not self-contained: ${leftovers.join(', ')}`);
  }
  try {
    new Function(output.text);
  } catch (error) {
    throw new Error(`${entryFile} does not parse as a classic script: ${error}`);
  }
  return output.text;
}
