import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ConsumerLayout } from './consumer-report.ts';

export const SCENE_FAULTS = ['portal-theme', 'required-error-name', 'focus-return'] as const;
export type SceneFault = typeof SCENE_FAULTS[number];
export const isSceneFault = (value: unknown): value is SceneFault => SCENE_FAULTS.includes(value as SceneFault);
export const SCENE_ITEMS = ['button', 'badge', 'dialog', 'field', 'input', 'radio-group', 'table', 'empty'];

export function sceneSource(subtree: boolean, partial = false, fault?: SceneFault): string {
  return `'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import { Table } from '@/components/ui/table';
import { Empty } from '@/components/ui/empty';
import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@/lib/tokens.stylex';
${subtree ? "import { ultimaTheme, colorScheme } from '@/lib/ultima-theme';" : ''}
const styles = stylex.create({
  surface: { backgroundColor: color['--ult-color-surface'], color: color['--ult-color-text'], fontFamily: font['--ult-font-sans'], padding: space['--ult-space-6'], display: 'grid', gap: space['--ult-space-4'] },
  group: { display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  link: { color: color['--ult-color-accent-text'] },
});
export default function ThemeConsumer({ initialMode = 'dark' }: { initialMode?: 'dark' | 'light' }) {
  const container = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState(initialMode);
  const [project, setProject] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [error, setError] = useState(false);
  const [result, setResult] = useState('No submission');
  const [route, setRoute] = useState('projects');
  const [hasRows, setHasRows] = useState(true);
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
  return <main data-proof-root data-testid="proof-root" data-mode={mode} {...stylex.props(styles.surface${subtree ? `, ${partial ? 'ultimaTheme[mode][0]' : '...ultimaTheme[mode]'}, colorScheme[mode]` : ''})}>
    <h1>Installed consumer proof</h1>
    <div><Button tone="accent" data-testid="proof-control">Theme control</Button>
    <Badge tone="success" variant="solid" role="status" aria-label="Theme status" data-testid="proof-status">Ready</Badge></div>
    <nav aria-label="Consumer navigation" {...stylex.props(styles.group)}>
      <a href="#projects" aria-current={route === 'projects' ? 'page' : undefined} onClick={() => setRoute('projects')} {...stylex.props(styles.link)}>Projects</a>
      <a href="#activity" aria-current={route === 'activity' ? 'page' : undefined} onClick={() => setRoute('activity')} {...stylex.props(styles.link)}>Activity</a>
    </nav>
    <h2 id={route}>Current route: {route}</h2>
    <form aria-label="Project form" noValidate onSubmit={(event) => {
      event.preventDefault();
      if (!project.trim()) { setError(true); setResult('No submission'); return; }
      setError(false);
      setResult(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
    }} onReset={() => { setProject(''); setVisibility('private'); setError(false); setResult('No submission'); }}>
      <Field.Root name="project" invalid={error}>
        <Field.Label htmlFor="project-name">Project name</Field.Label>
        <Input id="project-name" name="project" required value={project} onValueChange={setProject} aria-invalid={error} aria-describedby={error ? 'project-error' : undefined} />
        {error && <Field.Error match id="project-error" role="alert"${fault === 'required-error-name' ? '' : ' aria-label="Project name error"'}>${fault === 'required-error-name' ? '' : 'Project name is required'}</Field.Error>}
      </Field.Root>
      <RadioGroup.Root name="visibility" aria-label="Visibility" value={visibility} onValueChange={setVisibility}>
        <label><RadioGroup.Item value="private"><RadioGroup.Indicator /></RadioGroup.Item>Private</label>
        <label><RadioGroup.Item value="public"><RadioGroup.Indicator /></RadioGroup.Item>Public</label>
      </RadioGroup.Root>
      <div {...stylex.props(styles.group)}><Button type="submit">Save project</Button><Button type="reset">Reset form</Button></div>
      <output aria-label="Submission result">{result}</output>
    </form>
    <h2>Project data</h2>
    {hasRows ? <Table.Root aria-label="Projects data"><Table.Head><Table.Row><Table.HeadCell>Project</Table.HeadCell><Table.HeadCell>Status</Table.HeadCell></Table.Row></Table.Head><Table.Body><Table.Row><Table.Cell>Aster</Table.Cell><Table.Cell>Active</Table.Cell></Table.Row></Table.Body></Table.Root> : <Empty.Root><Empty.Title>No projects</Empty.Title><Empty.Description>Add a project to begin.</Empty.Description></Empty.Root>}
    <Button onClick={() => setHasRows(!hasRows)}>{hasRows ? 'Clear projects' : 'Restore projects'}</Button>
    <Dialog.Root><Dialog.Trigger render={<Button />}>Theme popup</Dialog.Trigger>
      <Dialog.Portal${(subtree && fault !== 'portal-theme') || (!subtree && fault === 'portal-theme') ? ' container={container}' : ''}><Dialog.Backdrop /><Dialog.Viewport><Dialog.Popup data-testid="proof-portal"${fault === 'focus-return' ? ' finalFocus={false}' : ''}>
        <Dialog.Title>Installed theme</Dialog.Title><Dialog.Description>Installed consumer portal.</Dialog.Description>
        <Dialog.Close render={<Button />}>Confirm theme</Dialog.Close>
      </Dialog.Popup></Dialog.Viewport></Dialog.Portal>
    </Dialog.Root><Button disabled>Disabled</Button><div ref={container} data-proof-portal-container${fault === 'portal-theme' && !subtree ? ' data-theme={mode === \'dark\' ? \'light\' : \'dark\'}' : ''} />
    <span>Hydration probe</span>
  </main>;
}
`;
}

export async function installScene(app: string, layout: ConsumerLayout, subtree: boolean, partial = false, fault?: SceneFault): Promise<void> {
  const source = layout === 'next-app' ? app : join(app, 'src');
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
