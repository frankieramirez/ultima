import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { compositionExamples, recipeSources } from '../apps/docs/src/generated/recipes.ts';
import type { ConsumerLayout } from './consumer-report.ts';

export const SCENE_FAULTS = ['portal-theme', 'required-error-name', 'focus-return'] as const;
export type SceneFault = typeof SCENE_FAULTS[number];
export const isSceneFault = (value: unknown): value is SceneFault => SCENE_FAULTS.includes(value as SceneFault);

const projects = compositionExamples.find((example) => example.id === 'projects')!;
export const SCENE_BUNDLE = recipeSources[projects.files[0]!.source]!;
export const SCENE_INSTALL = projects.install;
assert.match(SCENE_INSTALL, /^npx shadcn add (@ultima\/[a-z0-9-]+ ?)+$/, 'the Projects scene must derive its install command');
export const SCENE_ITEMS = SCENE_INSTALL.split(' ').slice(3).map((name) => name.slice('@ultima/'.length));
const entry = SCENE_BUNDLE.files.find((file) => file.source === SCENE_BUNDLE.entry)!;

const replaceOnce = (content: string, from: string, to: string) => {
  assert.ok(content.includes(from), `scene fault no longer finds ${JSON.stringify(from)}`);
  return content.replace(from, to);
};

/** The copied files, with a scene fault applied to the screen itself. */
export function sceneFiles(fault?: SceneFault): { path: string; content: string }[] {
  return SCENE_BUNDLE.files.map(({ path, content }) => {
    if (path !== entry.path) return { path, content };
    if (fault === 'required-error-name') return { path, content: replaceOnce(content, '<Field.Error match>Enter a project name.</Field.Error>', '<Field.Error match></Field.Error>') };
    if (fault === 'focus-return') return { path, content: replaceOnce(content, '<Dialog.Popup>', '<Dialog.Popup finalFocus={false}>') };
    return { path, content };
  });
}

/** The proof's own wrapper: mode tracking, the subtree theme and its portal container around the copied screen. */
export function sceneSource(subtree: boolean, partial = false, fault?: SceneFault): string {
  const container = (subtree && fault !== 'portal-theme') || (!subtree && fault === 'portal-theme');
  return `'use client';
import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font } from '@/lib/tokens.stylex';
${subtree ? "import { ultimaTheme, colorScheme } from '@/lib/ultima-theme';\n" : ''}import Projects from './${entry.path.replace(/\.tsx$/, '')}';
const styles = stylex.create({
  surface: { backgroundColor: color['--ult-color-surface'], color: color['--ult-color-text'], fontFamily: font['--ult-font-sans'] },
});
export default function ThemeConsumer({ initialMode = 'dark' }: { initialMode?: 'dark' | 'light' }) {
  const container = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState(initialMode);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: light)');
    const update = () => setMode(document.documentElement.dataset.theme === 'dark' ? 'dark' : document.documentElement.dataset.theme === 'light' ? 'light' : media.matches ? 'light' : 'dark');
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    media.addEventListener('change', update);
    update();
    document.body.dataset.hydrated = 'true';
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, []);
  return <div data-testid="proof-root" data-mode={mode} {...stylex.props(styles.surface${subtree ? `, ${partial ? 'ultimaTheme[mode][0]' : '...ultimaTheme[mode]'}, colorScheme[mode]` : ''})}>
    <Projects${container ? ' container={container}' : ''} />
    <div ref={container} data-proof-portal-container${fault === 'portal-theme' && !subtree ? ' data-theme={mode === \'dark\' ? \'light\' : \'dark\'}' : ''} />
    <footer><span>Hydration probe</span></footer>
  </div>;
}
`;
}

export async function installScene(app: string, layout: ConsumerLayout, subtree: boolean, partial = false, fault?: SceneFault): Promise<void> {
  const source = layout === 'next-app' ? app : join(app, 'src');
  for (const file of sceneFiles(fault)) {
    await mkdir(dirname(join(source, file.path)), { recursive: true });
    await writeFile(join(source, file.path), file.content);
  }
  await writeFile(join(source, 'ThemeConsumer.tsx'), sceneSource(subtree, partial, fault));
  if (layout === 'vite') {
    await writeFile(join(source, 'App.tsx'), "import ThemeConsumer from './ThemeConsumer';\nexport default function App() { return <ThemeConsumer />; }\n");
  } else {
    await writeFile(join(source, 'app/page.tsx'), `import { cookies } from 'next/headers';
import ThemeConsumer from '../ThemeConsumer';
export default async function Page() {
  const value = (await cookies()).get('proof-mode')?.value;
  return <ThemeConsumer initialMode={value === 'light' ? 'light' : 'dark'} />;
}
`);
  }
}
