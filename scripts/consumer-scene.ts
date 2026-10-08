import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ConsumerLayout } from './consumer-report.ts';

export function sceneSource(subtree: boolean, partial = false): string {
  return `'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover } from '@/components/ui/popover';
${subtree ? `import * as stylex from '@stylexjs/stylex';
import { ultimaTheme, colorScheme } from '@/lib/ultima-theme';
import { color, font } from '@/lib/tokens.stylex';
const styles = stylex.create({ surface: { backgroundColor: color['--ult-color-surface'], color: color['--ult-color-text'], fontFamily: font['--ult-font-sans'] } });` : ''}
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
  return <main data-proof-root data-mode={mode}${subtree ? ` {...stylex.props(styles.surface, ${partial ? 'ultimaTheme[mode][0]' : '...ultimaTheme[mode]'}, colorScheme[mode])}` : ''}>
    <h1>Installed consumer proof</h1>
    <Button tone="accent">Theme control</Button>
    <Badge tone="success" variant="solid" role="status">Ready</Badge>
    <Popover.Root><Popover.Trigger render={<Button />}>Theme popup</Popover.Trigger>
      <Popover.Portal${subtree ? ' container={container}' : ''}><Popover.Positioner><Popover.Popup>
        <Popover.Title>Installed theme</Popover.Title><Popover.Description>Installed consumer portal.</Popover.Description>
      </Popover.Popup></Popover.Positioner></Popover.Portal>
    </Popover.Root><Button disabled>Disabled</Button><div ref={container} data-proof-portal-container />
    <span>Hydration probe</span>
  </main>;
}
`;
}

export async function installScene(app: string, layout: ConsumerLayout, subtree: boolean, partial = false): Promise<void> {
  const source = layout === 'next-app' ? app : join(app, 'src');
  await writeFile(join(source, 'ThemeConsumer.tsx'), sceneSource(subtree, partial));
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
