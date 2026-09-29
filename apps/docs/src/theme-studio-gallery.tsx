import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import {
  Alert, Avatar, Badge, Button, Calendar, Card, Checkbox, Command, Empty,
  Field, Input, Popover, Progress, Select, Separator, Spinner, Switch, Table, Textarea,
} from '@ultima/ui';
import { ArrowRightIcon, FilePlusIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { useState, type ReactNode, type RefObject } from 'react';

const styles = stylex.create({
  gallery: { columnWidth: '18rem', columnGap: space['--ult-space-6'], minInlineSize: 0 },
  tile: { breakInside: 'avoid-column', display: 'inline-flex', flexDirection: 'column', inlineSize: '100%', marginBlockEnd: space['--ult-space-6'], verticalAlign: 'top' },
  stack: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-5'] },
  row: { display: 'flex', alignItems: 'center', gap: space['--ult-space-4'], minInlineSize: 0 },
  between: { justifyContent: 'space-between' },
  fill: { inlineSize: '100%' },
  copy: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-1'], flexGrow: 1, minInlineSize: 0 },
  muted: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-3'], lineHeight: font['--ult-font-leading-normal'], margin: 0 },
  heading: { fontSize: text['--ult-text-8'], lineHeight: font['--ult-font-leading-tight'], fontWeight: font['--ult-font-weight-medium'], letterSpacing: font['--ult-font-tracking-tight'], margin: 0 },
  mono: { fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-3'], margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: space['--ult-space-4'] },
  inspect: { position: 'relative' },
  inspectButton: { position: 'absolute', insetBlockStart: 0, insetInlineEnd: 0 },
  calendar: { inlineSize: '100%' },
  message: { paddingBlock: space['--ult-space-3'] },
});

function Example({ title, description, children, inspect = false, tokens }: {
  title: string; description?: string; children: ReactNode; inspect?: boolean; tokens?: string;
}) {
  return (
    <Card.Root data-gallery-example={title} data-tokens={tokens ?? '--ult-color-surface-raised,--ult-color-border,--ult-radius-lg'} style={[styles.tile, styles.inspect]}>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        {description ? <Card.Description>{description}</Card.Description> : null}
      </Card.Header>
      <Card.Body style={styles.stack}>{children}</Card.Body>
      {inspect ? <Button aria-label={`Inspect ${title} tokens`} size="sm" variant="ghost" style={styles.inspectButton}>Inspect</Button> : null}
    </Card.Root>
  );
}

const projects = [
  ['Website refresh', 'In progress', 'accent'],
  ['Component library', 'In review', 'warning'],
  ['Brand guidelines', 'Published', 'success'],
  ['Mobile application', 'Planning', 'neutral'],
] as const;

const actions = ['Create a project', 'View team', 'Open settings'];

export function ThemeStudioGallery({ container, inspect, mode }: {
  container: RefObject<HTMLDivElement | null>; inspect: boolean; mode: 'dark' | 'light';
}) {
  const [created, setCreated] = useState(false);
  const [invited, setInvited] = useState(false);
  const [reply, setReply] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [file, setFile] = useState(false);
  const [action, setAction] = useState('');
  const [role, setRole] = useState<string | null>('Editor');

  return (
    <div data-component-collage {...stylex.props(styles.gallery)}>
      <Example title="Create your workspace" description="Bring your team and work into one place." inspect={inspect}>
        <Field.Root name={`${mode}-workspace`}>
          <Field.Label>Workspace name</Field.Label><Input defaultValue="Forma" />
        </Field.Root>
        <Field.Root name={`${mode}-email`}>
          <Field.Label>Work email</Field.Label><Input defaultValue="alex@example.com" type="email" />
        </Field.Root>
        <Field.Root name={`${mode}-updates`}>
          <Field.Item><Checkbox.Root defaultChecked><Checkbox.Indicator /></Checkbox.Root><Field.Label>Send me product updates</Field.Label></Field.Item>
        </Field.Root>
        <Button onClick={() => setCreated(true)} style={styles.fill}>{created ? 'Workspace created' : 'Create workspace'}</Button>
        <span role="status" {...stylex.props(styles.muted)}>{created ? 'Example workspace created in this preview.' : ''}</span>
      </Example>

      <Example title="Recent projects" description="Your team's work at a glance." inspect={inspect}>
        <Table.Root aria-label="Recent projects">
          <Table.Head><Table.Row><Table.HeadCell>Project</Table.HeadCell><Table.HeadCell>Status</Table.HeadCell></Table.Row></Table.Head>
          <Table.Body>{projects.map(([name, status, tone]) => <Table.Row key={name}><Table.Cell>{name}</Table.Cell><Table.Cell><Badge tone={tone}>{status}</Badge></Table.Cell></Table.Row>)}</Table.Body>
        </Table.Root>
        <Popover.Root>
          <Popover.Trigger render={<Button variant="outline" style={styles.fill} />}>View all projects <ArrowRightIcon aria-hidden /></Popover.Trigger>
          <Popover.Portal container={container}><Popover.Positioner><Popover.Popup><Popover.Title>All projects</Popover.Title><Popover.Description>Four example projects. This popup uses the same theme as the gallery.</Popover.Description></Popover.Popup></Popover.Positioner></Popover.Portal>
        </Popover.Root>
      </Example>

      <Example title="Your team" description="Manage access to your workspace." inspect={inspect}>
        {['Alex Morgan', 'Sam Chen', 'Taylor Lee'].map((name, index) => <div key={name} {...stylex.props(styles.row)}><Avatar.Root><Avatar.Fallback>{name.split(' ').map((part) => part[0]).join('')}</Avatar.Fallback></Avatar.Root><span {...stylex.props(styles.copy)}>{name}<span {...stylex.props(styles.muted)}>{index === 0 ? 'Owner' : 'Editor'}</span></span></div>)}
        <Select.Root items={['Editor', 'Viewer'].map((value) => ({ value, label: value }))} value={role} onValueChange={setRole}>
          <Select.Trigger aria-label="Invitation role"><Select.Value /><Select.Icon /></Select.Trigger>
          <Select.Portal container={container}><Select.Positioner><Select.Popup><Select.List>{['Editor', 'Viewer'].map((item) => <Select.Item key={item} value={item}><Select.ItemText>{item}</Select.ItemText><Select.ItemIndicator /></Select.Item>)}</Select.List></Select.Popup></Select.Positioner></Select.Portal>
        </Select.Root>
        <Button onClick={() => setInvited(true)} variant="outline">{invited ? 'Invitation ready' : 'Invite a member'}</Button>
        <span role="status" {...stylex.props(styles.muted)}>{invited ? `Example invitation prepared with ${role?.toLowerCase()} access.` : ''}</span>
      </Example>

      <Example title="Notifications" inspect={inspect}>
        {['Product announcements', 'Security alerts', 'Weekly summary'].map((label, index) => <Field.Root key={label} name={`${mode}-${label}`}><Field.Item style={[styles.row, styles.between]}><Field.Label>{label}</Field.Label><Switch.Root defaultChecked={index !== 2}><Switch.Thumb /></Switch.Root></Field.Item></Field.Root>)}
      </Example>

      <Example title="Plan your next release" inspect={inspect}>
        <Calendar.Root locale="en-US" style={styles.calendar}>
          <Calendar.Label>Release date</Calendar.Label>
          <Calendar.Content><Calendar.View view="day"><Calendar.ViewControl><Calendar.PrevTrigger /><Calendar.ViewTrigger><Calendar.RangeText /></Calendar.ViewTrigger><Calendar.NextTrigger /></Calendar.ViewControl><Calendar.Table /></Calendar.View></Calendar.Content>
        </Calendar.Root>
      </Example>

      <Example title="Project conversation" description="A place for feedback and decisions." inspect={inspect}>
        <p {...stylex.props(styles.muted)}>Taylor · The updated components are ready for review.</p>
        {messages.map((message, index) => <p key={index} {...stylex.props(styles.message)}>{message}</p>)}
        <Field.Root name={`${mode}-reply`}><Field.Label>Reply to the team</Field.Label><Textarea value={reply} onValueChange={setReply} placeholder="Write a message…" /></Field.Root>
        <Button disabled={!reply.trim()} onClick={() => { setMessages((current) => [...current, reply.trim()]); setReply(''); }}><PaperPlaneTiltIcon aria-hidden /> Send message</Button>
        <span role="status" {...stylex.props(styles.muted)}>{messages.length ? 'Message added to this preview.' : ''}</span>
      </Example>

      <Example title="A little space to think." inspect={inspect} tokens="--ult-font-sans,--ult-font-mono,--ult-text-8,--ult-font-leading-normal">
        <p {...stylex.props(styles.heading)}>Designed for everyday ideas.</p>
        <p {...stylex.props(styles.muted)}>Good type gives your work room to breathe. A clear rhythm makes the smallest details easier to read.</p>
        <Separator /><p {...stylex.props(styles.mono)}>const theme = makeItYours();</p>
      </Example>

      <Example title="Interaction states" inspect={inspect} tokens="--ult-color-accent,--ult-color-border-focus,--ult-motion-fast">
        <div {...stylex.props(styles.grid)}><Button>Continue</Button><Button autoFocus={false} variant="outline">Focus me</Button><Button disabled><Spinner /> Saving</Button><Button disabled variant="outline">Disabled</Button></div>
        <Field.Root name={`${mode}-invalid`} invalid><Field.Label>Work email</Field.Label><Input aria-invalid defaultValue="not-an-email" /><Field.Error match>Enter a valid email address.</Field.Error></Field.Root>
        <p {...stylex.props(styles.muted)}>Tab through these examples to check the focus ring.</p>
      </Example>

      <Empty.Root style={styles.tile}>
        <Empty.Icon><FilePlusIcon /></Empty.Icon><Empty.Title>{file ? 'First file added' : 'Add your first file'}</Empty.Title><Empty.Description>{file ? 'The empty state now has example content.' : 'Keep the things you need in one place.'}</Empty.Description><Button onClick={() => setFile(!file)} variant="outline">{file ? 'Reset example' : 'Choose a file'}</Button>
      </Empty.Root>

      <Example title="Quick actions" inspect={inspect}>
        <Command.Root open inline items={actions}>
          <Command.InputGroup><Command.Input aria-label="Search quick actions" placeholder="Search actions…" /><Command.Clear aria-label="Clear quick actions" /></Command.InputGroup>
          <Command.Empty>No matching actions.</Command.Empty>
          <Command.List>{(item: string) => <Command.Item key={item} value={item} onClick={() => setAction(item)}>{item}</Command.Item>}</Command.List>
        </Command.Root>
        <span role="status" {...stylex.props(styles.muted)}>{action ? `${action} selected in this preview.` : ''}</span>
      </Example>

      <Alert.Root tone="success" style={styles.tile}><Alert.Title>Your changes are saved</Alert.Title><Alert.Description>Example success message.</Alert.Description></Alert.Root>
      <Alert.Root tone="warning" style={styles.tile}><Alert.Title>Two tasks need attention</Alert.Title><Alert.Description>Example warning message.</Alert.Description></Alert.Root>
      <Example title="Storage used" inspect={inspect}><Progress.Root value={64}><div {...stylex.props(styles.row, styles.between)}><Progress.Label>Workspace storage</Progress.Label><Progress.Value /></div><Progress.Track><Progress.Indicator /></Progress.Track></Progress.Root></Example>
    </div>
  );
}
