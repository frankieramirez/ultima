'use client';

import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';
import { Dialog } from '@ultima/ui/dialog';
import { Empty } from '@ultima/ui/empty';
import { Field } from '@ultima/ui/field';
import { Input } from '@ultima/ui/input';
import { Select } from '@ultima/ui/select';
import { Sidebar, useSidebar } from '@ultima/ui/sidebar';
import { Table } from '@ultima/ui/table';
import { type ComponentProps, type FormEvent, useId, useState } from 'react';

import { type Project, owners, sampleProjects } from './projects-data';
import { screen } from './screen.stylex';

/** Where Sidebar turns from a drawer into an inline panel. */
const DESKTOP = '@media (min-width: 48rem)';
const WIDE = '@media (min-width: 64rem)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    minBlockSize: '100dvh',
  },
  panel: {
    blockSize: { default: '100%', [DESKTOP]: '100dvh' },
    flexShrink: 0,
    insetBlockStart: 0,
    position: { default: 'static', [DESKTOP]: 'sticky' },
  },
  workspace: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    margin: 0,
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-4'],
  },
  main: {
    boxSizing: 'border-box',
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: { default: space['--ult-space-6'], [DESKTOP]: space['--ult-space-10'] },
    paddingInline: { default: space['--ult-space-6'], [DESKTOP]: space['--ult-space-11'] },
  },
  content: {
    display: 'grid',
    gap: space['--ult-space-8'],
    gridTemplateColumns: 'minmax(0, 1fr)',
    marginInline: 'auto',
    maxInlineSize: screen['--app-size-content-max'],
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  title: {
    fontSize: text['--ult-text-9'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  columns: {
    alignItems: 'start',
    display: 'grid',
    gap: space['--ult-space-8'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [WIDE]: 'minmax(0, 1fr) minmax(0, 2fr)' },
  },
  stack: {
    display: 'grid',
    gap: space['--ult-space-6'],
  },
  field: {
    display: 'grid',
    gap: space['--ult-space-3'],
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  announcement: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
  listHeader: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
  },
  table: {
    minInlineSize: screen['--app-size-table-min'],
  },
  status: {
    borderRadius: radius['--ult-radius-full'],
    display: 'inline-block',
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-normal'],
    paddingInline: space['--ult-space-4'],
  },
  active: {
    backgroundColor: color['--ult-color-success'],
    color: color['--ult-color-success-contrast'],
  },
  paused: {
    backgroundColor: color['--ult-color-warning'],
    color: color['--ult-color-warning-contrast'],
  },
  activity: {
    display: 'grid',
    gap: space['--ult-space-4'],
    margin: 0,
    paddingInlineStart: space['--ult-space-7'],
  },
});

const statusTones = { Active: styles.active, Paused: styles.paused };

type Container = ComponentProps<typeof Dialog.Portal>['container'];
type Route = 'projects' | 'activity';

/** `container` is where the popups portal, the document body by default; a subtree theme passes its own element. */
export default function Projects({ container }: { container?: Container }) {
  const [route, setRoute] = useState<Route>('projects');
  const [projects, setProjects] = useState(sampleProjects);
  const [created, setCreated] = useState(0);
  const [activity, setActivity] = useState<string[]>([]);
  const log = (entry: string) => setActivity((entries) => [entry, ...entries]);

  return (
    <Sidebar.Root style={styles.root}>
      <Sidebar.Panel aria-label="Workspace" container={container} style={styles.panel}>
        <p {...stylex.props(styles.workspace)}>Northwind</p>
        <Sidebar.List>
          <Sidebar.Item>
            <Sidebar.Link href="#projects" active={route === 'projects'} onClick={() => setRoute('projects')}>
              Projects
            </Sidebar.Link>
          </Sidebar.Item>
          <Sidebar.Item>
            <Sidebar.Link href="#activity" active={route === 'activity'} onClick={() => setRoute('activity')}>
              Activity
            </Sidebar.Link>
          </Sidebar.Item>
        </Sidebar.List>
      </Sidebar.Panel>
      <main {...stylex.props(styles.main)}>
        <div {...stylex.props(styles.content)}>
          <header {...stylex.props(styles.header)}>
            <NavigationTrigger />
            <h1 {...stylex.props(styles.title)}>{route === 'projects' ? 'Projects' : 'Activity'}</h1>
          </header>
          {route === 'projects' ? (
            <div {...stylex.props(styles.columns)}>
              <CreateProject
                container={container}
                onCreate={(name, owner) => {
                  setProjects([{ id: `created-${created}`, name, owner, status: 'Active' }, ...projects]);
                  setCreated(created + 1);
                  log(`Created ${name} for ${owner}.`);
                }}
              />
              <ProjectList
                container={container}
                projects={projects}
                onRename={(project, name) => {
                  setProjects(projects.map((entry) => (entry.id === project.id ? { ...entry, name } : entry)));
                  log(`Renamed ${project.name} to ${name}.`);
                }}
                onClear={() => {
                  setProjects([]);
                  log('Cleared the project list.');
                }}
                onRestore={() => {
                  setProjects(sampleProjects);
                  log('Restored the sample projects.');
                }}
              />
            </div>
          ) : (
            <Activity entries={activity} />
          )}
        </div>
      </main>
    </Sidebar.Root>
  );
}

function NavigationTrigger() {
  if (!useSidebar().isMobile) return null;
  return <Sidebar.Trigger render={<Button variant="outline" size="sm" />}>Menu</Sidebar.Trigger>;
}

function CreateProject({ container, onCreate }: { container?: Container; onCreate: (name: string, owner: string) => void }) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState(owners[0]!);
  const [invalid, setInvalid] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setInvalid(true);
      setAnnouncement('');
      return;
    }
    onCreate(trimmed, owner);
    setName('');
    setOwner(owners[0]!);
    setInvalid(false);
    setAnnouncement(`Created ${trimmed}.`);
  }

  function reset() {
    setName('');
    setOwner(owners[0]!);
    setInvalid(false);
    setAnnouncement('');
  }

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title render={<h2 />}>New project</Card.Title>
        <Card.Description>Name the project and choose who owns it.</Card.Description>
      </Card.Header>
      <Card.Body>
        <form aria-label="New project" noValidate onSubmit={submit} onReset={reset} {...stylex.props(styles.stack)}>
          <Field.Root name="name" invalid={invalid}>
            <Field.Label>Project name</Field.Label>
            <Input
              required
              value={name}
              onValueChange={(value) => {
                setName(value);
                if (value.trim()) setInvalid(false);
              }}
            />
            {invalid ? <Field.Error match>Enter a project name.</Field.Error> : null}
          </Field.Root>
          <Select.Root name="owner" value={owner} onValueChange={(value) => setOwner(value ?? owners[0]!)}>
            <div {...stylex.props(styles.field)}>
              <Select.Label>Owner</Select.Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
            </div>
            <Select.Portal container={container}>
              <Select.Positioner>
                <Select.Popup>
                  <Select.List>
                    {owners.map((entry) => (
                      <Select.Item key={entry} value={entry}>
                        <Select.ItemIndicator />
                        <Select.ItemText>{entry}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
          <div {...stylex.props(styles.actions)}>
            <Button type="submit">Create project</Button>
            <Button type="reset" variant="outline">
              Reset
            </Button>
          </div>
          <p role="status" {...stylex.props(styles.announcement)}>
            {announcement}
          </p>
        </form>
      </Card.Body>
    </Card.Root>
  );
}

function ProjectList({
  container,
  projects,
  onRename,
  onClear,
  onRestore,
}: {
  container?: Container;
  projects: Project[];
  onRename: (project: Project, name: string) => void;
  onClear: () => void;
  onRestore: () => void;
}) {
  const caption = useId();

  return (
    <Card.Root>
      <Card.Header style={styles.listHeader}>
        <Card.Title render={<h2 />}>Project list</Card.Title>
        {projects.length ? (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear projects
          </Button>
        ) : null}
      </Card.Header>
      <Card.Body>
        {projects.length ? (
          <Table.Scroll aria-labelledby={caption}>
            <Table.Root style={styles.table}>
              <Table.Caption id={caption}>Projects, newest first</Table.Caption>
              <Table.Head>
                <Table.Row>
                  <Table.HeadCell>Project</Table.HeadCell>
                  <Table.HeadCell>Owner</Table.HeadCell>
                  <Table.HeadCell>Status</Table.HeadCell>
                  <Table.HeadCell>Actions</Table.HeadCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {projects.map((project) => (
                  <Table.Row key={project.id}>
                    <Table.HeadCell scope="row">{project.name}</Table.HeadCell>
                    <Table.Cell>{project.owner}</Table.Cell>
                    <Table.Cell>
                      <span {...stylex.props(styles.status, statusTones[project.status])}>{project.status}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <EditProject container={container} project={project} onRename={onRename} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.Scroll>
        ) : (
          <Empty.Root>
            <Empty.Title>No projects</Empty.Title>
            <Empty.Description>Restore the sample projects to keep exploring.</Empty.Description>
            <Button onClick={onRestore}>Restore sample projects</Button>
          </Empty.Root>
        )}
      </Card.Body>
    </Card.Root>
  );
}

function EditProject({
  container,
  project,
  onRename,
}: {
  container?: Container;
  project: Project;
  onRename: (project: Project, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [invalid, setInvalid] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setInvalid(true);
      return;
    }
    if (trimmed !== project.name) onRename(project, trimmed);
    setOpen(false);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setName(project.name);
        setInvalid(false);
      }}
    >
      <Dialog.Trigger render={<Button variant="ghost" size="sm" aria-label={`Edit ${project.name}`} />}>Edit</Dialog.Trigger>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop />
        <Dialog.Viewport>
          <Dialog.Popup>
            <Dialog.Title>Edit {project.name}</Dialog.Title>
            <Dialog.Description>Rename the project. Its owner and status stay as they are.</Dialog.Description>
            <form aria-label={`Edit ${project.name}`} noValidate onSubmit={submit} {...stylex.props(styles.stack)}>
              <Field.Root name="name" invalid={invalid}>
                <Field.Label>Name</Field.Label>
                <Input
                  required
                  value={name}
                  onValueChange={(value) => {
                    setName(value);
                    if (value.trim()) setInvalid(false);
                  }}
                />
                {invalid ? <Field.Error match>Enter a project name.</Field.Error> : null}
              </Field.Root>
              <div {...stylex.props(styles.actions)}>
                <Button type="submit">Save changes</Button>
                <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Activity({ entries }: { entries: string[] }) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title render={<h2 />}>Recent changes</Card.Title>
      </Card.Header>
      <Card.Body>
        {entries.length ? (
          <ol {...stylex.props(styles.activity)}>
            {entries.map((entry, index) => (
              <li key={entries.length - index}>{entry}</li>
            ))}
          </ol>
        ) : (
          <Empty.Root>
            <Empty.Title>No activity yet</Empty.Title>
            <Empty.Description>Changes you make to projects appear here.</Empty.Description>
          </Empty.Root>
        )}
      </Card.Body>
    </Card.Root>
  );
}
