import * as stylex from '@stylexjs/stylex';
import { colorScheme, presetDraft, resolveDraft, type ThemePresetId, type ResolvedDraft, type TokenTable } from '@ultima/tokens';
import { border, color, font, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Code,
  Dialog,
  Field,
  Input,
  Meter,
  Popover,
  Progress,
  Separator,
  Spinner,
  Stat,
  Switch,
  Table,
  Tabs,
  Toggle,
  ToggleGroup,
} from '@ultima/ui';
import { StackIcon, UsersIcon } from '@phosphor-icons/react';
import {
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import { breakpoints } from './breakpoints.stylex';
import { previewVars } from './theme-studio-draft';
import { ThemeStudioGallery } from './theme-studio-gallery';
import { SwatchChip } from './swatch';

const SCENES = [
  { id: 'gallery', label: 'All examples' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'typography', label: 'Typography' },
  { id: 'controls', label: 'Controls' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'states', label: 'States' },
  { id: 'motion', label: 'Motion' },
] as const;

type Scene = (typeof SCENES)[number]['id'];
type PreviewMode = 'dark' | 'light' | 'compare';
type PaneMode = 'dark' | 'light';

type TokenReadout = { name: string; value: string }[];

const CARD_TOKENS = [
  '--ult-color-surface-raised',
  '--ult-color-border',
  '--ult-shadow-md',
  '--ult-radius-lg',
] as const;

const styles = stylex.create({
  preview: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    gap: space['--ult-space-6'],
    minBlockSize: 0,
    minInlineSize: 0,
    order: { default: 0, [breakpoints.RAIL]: 1 },
    paddingBlock: space['--ult-space-8'],
    paddingInline: { default: space['--ult-space-6'], [breakpoints.RAIL]: space['--ult-space-9'] },
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
  },
  heading: { alignItems: 'baseline', display: 'flex', gap: space['--ult-space-5'], minInlineSize: 0 },
  title: {
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  caption: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-3'] },
  tools: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  scenes: { flexShrink: 0, minInlineSize: 0 },
  sceneList: { overflowX: 'auto' },
  panes: {
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.RAIL]: 'row' },
    flexGrow: 1,
    gap: space['--ult-space-6'],
    minBlockSize: 0,
    minInlineSize: 0,
  },
  pane: {
    display: 'flex',
    flexBasis: 0,
    flexDirection: 'column',
    flexGrow: 1,
    minBlockSize: 0,
    minInlineSize: 0,
    position: 'relative',
  },
  // The preview canvas: one framed surface per pane, drawn from the draft theme.
  canvas: {
    backgroundColor: color['--ult-color-surface'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    fontFamily: font['--ult-font-sans'],
    minBlockSize: 0,
    overflow: 'hidden',
  },

  sheet: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minBlockSize: 0,
    overflow: 'auto',
  },
  // Auto margins centre a short scene and fall to zero once it overflows, so nothing clips.
  centred: { flexShrink: 0, marginBlock: 'auto' },
  scene: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-8'],
    padding: { default: space['--ult-space-6'], [breakpoints.RAIL]: space['--ult-space-9'] },
  },
  stack: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-6'] },
  app: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-8'],
    padding: { default: space['--ult-space-6'], [breakpoints.RAIL]: space['--ult-space-9'] },
  },
  appBar: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  quick: { alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-6'] },
  quickField: { flexBasis: '16rem', flexGrow: 1, minInlineSize: 0 },
  crumb: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
  },
  headline: {
    fontSize: text['--ult-text-10'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  lede: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  stats: {
    display: 'grid',
    gap: space['--ult-space-8'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.RAIL]: 'repeat(3, minmax(0, 1fr))' },
  },
  stat: {
    borderBlockColor: color['--ult-color-border'],
    borderBlockStyle: 'solid',
    borderBlockWidth: border.hairline,
    gap: space['--ult-space-4'],
    paddingBlock: space['--ult-space-6'],
  },
  statValue: {
    fontSize: text['--ult-text-10'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
  },
  statNote: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-3'] },
  columns: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.RAIL]: 'row' },
    gap: space['--ult-space-9'],
  },
  projects: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-6'],
    minInlineSize: 0,
  },
  sectionTitle: {
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    margin: 0,
  },
  projectCell: { alignItems: 'center', display: 'flex', gap: space['--ult-space-5'] },
  projectIcon: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-accent-subtle'],
    borderRadius: radius['--ult-radius-sm'],
    color: color['--ult-color-accent-text'],
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: text['--ult-text-6'],
    justifyContent: 'center',
    padding: space['--ult-space-4'],
  },
  projectCopy: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-1'] },
  projectMeta: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-2'] },
  statusCell: { textAlign: 'end' },
  invite: {
    backgroundColor: color['--ult-color-accent-subtle'],
    borderColor: color['--ult-color-accent-border'],
    flexShrink: 0,
    inlineSize: { default: '100%', [breakpoints.RAIL]: '17rem' },
  },
  inviteIcon: { color: color['--ult-color-accent-text'], fontSize: text['--ult-text-9'] },
  fill: { inlineSize: '100%' },
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  miniChip: { inlineSize: space['--ult-space-7'], blockSize: space['--ult-space-7'] },
  mini: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-1'], inlineSize: space['--ult-space-11'], flexShrink: 0 },
  display: {
    fontSize: text['--ult-text-9'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  subtitle: { fontSize: text['--ult-text-7'], fontWeight: font['--ult-font-weight-medium'], margin: 0 },
  body: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  note: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-3'], margin: 0 },
  spinner: { fontSize: text['--ult-text-9'] },
  raised: { boxShadow: shadow['--ult-shadow-md'] },
  inspectable: {
    position: 'relative',
  },
  inspectTarget: {
    backgroundColor: {
      default: 'transparent',
      ':active': 'transparent',
      ':hover': 'transparent',
    },
    height: 'auto',
    inset: 0,
    position: 'absolute',
    ':focus-visible': {
      outlineColor: color['--ult-color-border-focus'],
      outlineOffset: border.focusOffset,
      outlineStyle: 'dashed',
      outlineWidth: border.focus,
    },
    ':hover': {
      outlineColor: color['--ult-color-border-focus'],
      outlineOffset: border.focusOffset,
      outlineStyle: 'dashed',
      outlineWidth: border.focus,
    },
  },
  inspectBlock: { display: 'block' },
  inspectInline: { display: 'inline-flex' },
  readout: {
    alignSelf: 'flex-start',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    gap: space['--ult-space-2'],
    minInlineSize: 0,
  },
  tokenRow: { display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  tokenValue: { color: color['--ult-color-text'] },
  hover: { backgroundColor: color['--ult-color-accent-hover'] },
  active: { backgroundColor: color['--ult-color-accent-active'] },
});

export function ThemeStudioPreview({
  mode,
  onModeChange,
  tables,
}: {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  tables: ResolvedDraft;
}) {
  const [scene, setScene] = useState<Scene>('gallery');
  const [inspect, setInspect] = useState(false);
  const [readout, setReadout] = useState<TokenReadout | null>(null);
  const panes = mode === 'compare' ? (['dark', 'light'] as const) : [mode];

  return (
    <section aria-label="Live preview" {...stylex.props(styles.preview)}>
      <div {...stylex.props(styles.toolbar)}>
        <div {...stylex.props(styles.heading)}>
          <p {...stylex.props(styles.title)}>Preview</p>
          <span {...stylex.props(styles.caption)}>Live components</span>
        </div>
        <div {...stylex.props(styles.tools)}>
          <Toggle
            aria-label="Inspect tokens"
            onPressedChange={(pressed) => {
              setInspect(pressed);
              if (!pressed) setReadout(null);
            }}
            pressed={inspect}
            size="sm"
          >
            Inspect tokens
          </Toggle>
          <ToggleGroup.Root
            aria-label="Preview color mode"
            onValueChange={(next, eventDetails) => {
              const [selected] = next;
              if (!selected) {
                eventDetails.cancel();
                return;
              }
              onModeChange(selected as PreviewMode);
            }}
            value={[mode]}
          >
            <ToggleGroup.Item value="dark">Dark</ToggleGroup.Item>
            <ToggleGroup.Item value="light">Light</ToggleGroup.Item>
            <ToggleGroup.Item value="compare">Compare</ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
      </div>
      <Tabs.Root
        onValueChange={(next) => {
          if (next) setScene(next as Scene);
        }}
        style={styles.scenes}
        value={scene}
      >
        <Tabs.List aria-label="Preview scenes" style={styles.sceneList}>
          {SCENES.map((item) => (
            <Tabs.Tab key={item.id} value={item.id}>
              {item.label}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator />
        </Tabs.List>
      </Tabs.Root>
      <div {...stylex.props(styles.panes)}>
        {panes.map((pane) => (
          <PreviewPane
            inspect={inspect}
            key={pane}
            mode={pane}
            onReadout={setReadout}
            scene={scene}
            table={tables[pane]}
          />
        ))}
      </div>
      <div aria-label="Token readout" aria-live="polite" role="status" {...stylex.props(styles.readout)}>
        {readout?.map((token) => (
          <div key={token.name} {...stylex.props(styles.tokenRow)}>
            <span>{token.name}</span>
            <span {...stylex.props(styles.tokenValue)}>{token.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewPane({
  inspect,
  mode,
  onReadout,
  scene,
  table,
}: {
  inspect: boolean;
  mode: PaneMode;
  onReadout: (tokens: TokenReadout | null) => void;
  scene: Scene;
  table: TokenTable;
}) {
  const portal = useRef<HTMLDivElement>(null);
  const scheme = mode === 'dark' ? colorScheme.dark : colorScheme.light;
  const pane = stylex.props(scheme, styles.pane);

  function readTokens(event: FocusEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) {
    if (!inspect) return;
    const target = (event.target as HTMLElement | null)?.closest('[data-tokens]');
    if (!(target instanceof HTMLElement) || !event.currentTarget.contains(target)) return;
    const names =
      target.dataset.tokens
        ?.split(',')
        .map((name) => name.trim())
        .filter(Boolean) ?? [];
    onReadout(
      names.map((name) => ({ name, value: getComputedStyle(target).getPropertyValue(name).trim() || '—' })),
    );
  }

  function clearTokens(event: FocusEvent<HTMLDivElement>) {
    if (!inspect) return;
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    onReadout(null);
  }

  return (
    <div
      aria-label={mode === 'dark' ? 'Dark preview' : 'Light preview'}
      className={pane.className}
      onBlur={clearTokens}
      onFocus={readTokens}
      onMouseLeave={() => {
        if (inspect) onReadout(null);
      }}
      onMouseOver={readTokens}
      ref={portal}
      role="region"
      style={{ ...pane.style, ...previewVars(table) } as CSSProperties}
    >
      <div data-preview-canvas {...stylex.props(styles.canvas)}>
        <div data-preview-scene={scene} {...stylex.props(styles.sheet)}>
          <div {...stylex.props(scene === 'workspace' ? styles.app : styles.scene, scene !== 'gallery' && styles.centred)}>
            <SceneBody container={portal} inspect={inspect} mode={mode} scene={scene} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneBody({
  container,
  inspect,
  mode,
  scene,
}: {
  container: RefObject<HTMLDivElement | null>;
  inspect: boolean;
  mode: PaneMode;
  scene: Scene;
}) {
  switch (scene) {
    case 'gallery':
      return <ThemeStudioGallery container={container} inspect={inspect} mode={mode} />;
    case 'workspace':
      return <WorkspaceScene inspect={inspect} mode={mode} />;
    case 'typography':
      return <TypographyScene inspect={inspect} />;
    case 'controls':
      return <ControlsScene inspect={inspect} mode={mode} />;
    case 'surfaces':
      return <SurfacesScene inspect={inspect} />;
    case 'overlays':
      return <OverlaysScene container={container} inspect={inspect} />;
    case 'states':
      return <StatesScene inspect={inspect} />;
    case 'motion':
      return <MotionScene inspect={inspect} />;
  }
}

export function PresetPreview({ id }: { id: ThemePresetId }) {
  const table = resolveDraft(presetDraft(id)).dark;
  return (
    <span aria-hidden="true" {...stylex.props(styles.mini)}>
      <SwatchChip style={styles.miniChip} value={table['--ult-color-text']!} />
      <SwatchChip style={styles.miniChip} value={table['--ult-color-action']!} />
      <SwatchChip style={styles.miniChip} value={table['--ult-color-accent']!} />
    </span>
  );
}

const PROJECTS = [
  { name: 'Website refresh', meta: 'Design · Updated just now', status: 'In progress', tone: 'accent' },
  { name: 'Component library', meta: 'Engineering · 2 hours ago', status: 'In review', tone: 'warning' },
  { name: 'Brand guidelines', meta: 'Design · Yesterday', status: 'Published', tone: 'success' },
] as const;

function WorkspaceScene({ inspect, mode }: { inspect: boolean; mode: PaneMode }) {
  return (
    <>
      <div {...stylex.props(styles.appBar)}>
        <h2 {...stylex.props(styles.appName)}>Forma</h2>
        <Avatar.Root>
          <Avatar.Fallback>AM</Avatar.Fallback>
        </Avatar.Root>
      </div>
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-label="Workspace sections">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="members">Members</Tabs.Tab>
          <Tabs.Tab value="projects">Projects</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
      </Tabs.Root>
      <div {...stylex.props(styles.quick)}>
        <Field.Root name={`${mode}-project-name`} style={styles.quickField}>
          <Field.Label>Project name</Field.Label>
          <Input defaultValue="Untitled theme" />
        </Field.Root>
        <Button>New project</Button>
      </div>
      <div {...stylex.props(styles.stack)}>
        <p {...stylex.props(styles.crumb)}>WORKSPACE / OVERVIEW</p>
        <p {...stylex.props(styles.headline)}>Make room for the next idea.</p>
        <p {...stylex.props(styles.lede)}>Your projects, people, and progress in one place.</p>
      </div>
      <div {...stylex.props(styles.stats)}>
        {[
          ['Active projects', '12', '+2 this month'],
          ['Tasks completed', '84', 'Across 4 teams'],
          ['Time saved', '32h', 'This month'],
        ].map(([label, value, note]) => (
          <Stat.Root key={label} style={styles.stat}>
            <Stat.Label>{label}</Stat.Label>
            <Stat.Value style={styles.statValue}>{value}</Stat.Value>
            <span {...stylex.props(styles.statNote)}>{note}</span>
          </Stat.Root>
        ))}
      </div>
      <div {...stylex.props(styles.columns)}>
        <div {...stylex.props(styles.projects)}>
          <p {...stylex.props(styles.sectionTitle)}>Recent projects</p>
          <Table.Root>
            <Table.Caption>Recent projects</Table.Caption>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Project</Table.HeadCell>
                <Table.HeadCell style={styles.statusCell}>Status</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {PROJECTS.map((project) => (
                <Table.Row key={project.name}>
                  <Table.Cell>
                    <span {...stylex.props(styles.projectCell)}>
                      <span aria-hidden {...stylex.props(styles.projectIcon)}>
                        <StackIcon />
                      </span>
                      <span {...stylex.props(styles.projectCopy)}>
                        <span>{project.name}</span>
                        <span {...stylex.props(styles.projectMeta)}>{project.meta}</span>
                      </span>
                    </span>
                  </Table.Cell>
                  <Table.Cell style={styles.statusCell}>
                    <Badge tone={project.tone}>{project.status}</Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
        <Inspectable inspect={inspect} tokens={CARD_TOKENS}>
          <Card.Root style={[styles.raised, styles.invite]}>
            <Card.Header>
              <span aria-hidden {...stylex.props(styles.inviteIcon)}>
                <UsersIcon />
              </span>
              <Card.Title>Better together.</Card.Title>
              <Card.Description>Invite your team and give every idea a place to grow.</Card.Description>
            </Card.Header>
            <Card.Body>
              <Input aria-label="Invite by email" placeholder="name@company.com" />
            </Card.Body>
            <Card.Footer>
              <Button style={styles.fill}>Send invitation</Button>
            </Card.Footer>
          </Card.Root>
        </Inspectable>
      </div>
      <Meter.Root aria-label="Storage used" max={100} value={64}>
        <Meter.Label>Storage used · 64 of 100 GB</Meter.Label>
        <Meter.Track>
          <Meter.Indicator />
        </Meter.Track>
      </Meter.Root>
    </>
  );
}

function TypographyScene({ inspect }: { inspect: boolean }) {
  return (
    <div {...stylex.props(styles.stack)}>
      <Inspectable
        inspect={inspect}
        tokens={['--ult-text-9', '--ult-font-sans', '--ult-font-tracking-tight']}
      >
        <p {...stylex.props(styles.display)}>Mireval at dusk</p>
      </Inspectable>
      <Inspectable inspect={inspect} tokens={['--ult-text-7']}>
        <p {...stylex.props(styles.subtitle)}>The archive opens after the third bell</p>
      </Inspectable>
      <Inspectable
        inspect={inspect}
        tokens={['--ult-text-5', '--ult-font-leading-normal', '--ult-color-text-muted']}
      >
        <p {...stylex.props(styles.body)}>
          Body copy rides on <Code>--ult-text-5</Code> with muted color. Density never moves these; only the
          typography group does.
        </p>
      </Inspectable>
    </div>
  );
}

function ControlsScene({ inspect, mode }: { inspect: boolean; mode: PaneMode }) {
  return (
    <div {...stylex.props(styles.stack)}>
      <div {...stylex.props(styles.row)}>
        <Inspectable
          inspect={inspect}
          inline
          tokens={['--ult-color-accent', '--ult-color-accent-contrast', '--ult-radius-md', '--ult-space-10']}
        >
          <Button>Continue</Button>
        </Inspectable>
        <Button variant="outline">Cancel</Button>
        <Button tone="danger">Delete</Button>
        <Field.Root name={`${mode}-live-updates`}>
          <Field.Item>
            <Switch.Root>
              <Switch.Thumb />
            </Switch.Root>
            <Field.Label>Live updates</Field.Label>
          </Field.Item>
        </Field.Root>
      </div>
      <Field.Root name={`${mode}-character`}>
        <Field.Label>Character name</Field.Label>
        <Inspectable
          inspect={inspect}
          tokens={['--ult-color-surface-sunken', '--ult-color-border', '--ult-color-border-focus']}
        >
          <Input placeholder="e.g. Sable of the Ninth House" />
        </Inspectable>
        <Field.Description>Shown on your license.</Field.Description>
      </Field.Root>
      <div {...stylex.props(styles.row)}>
        <Badge tone="success">Verified</Badge>
        <Badge tone="warning">Pending</Badge>
        <Badge tone="danger">Revoked</Badge>
        <Badge tone="highlight">Mana</Badge>
      </div>
    </div>
  );
}

function SurfacesScene({ inspect }: { inspect: boolean }) {
  return (
    <div {...stylex.props(styles.stack)}>
      <Inspectable inspect={inspect} tokens={CARD_TOKENS}>
        <Card.Root style={styles.raised}>
          <Card.Header>
            <Card.Title>Cartographer's ledger</Card.Title>
            <Card.Description>
              Cards sit on surface-raised with a hairline border and shadow-md.
            </Card.Description>
          </Card.Header>
        </Card.Root>
      </Inspectable>
      <Table.Root>
        <Table.Caption>Surface rows</Table.Caption>
        <Table.Head>
          <Table.Row>
            <Table.HeadCell>Archive</Table.HeadCell>
            <Table.HeadCell>Note</Table.HeadCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Ember archive</Table.Cell>
            <Table.Cell>hover uses surface-hover</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Mithril vault</Table.Cell>
            <Table.Cell>border uses color-border</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
      <Alert.Root tone="accent">
        <Alert.Title>New tokens available</Alert.Title>
        <Alert.Description>Pull the latest palette before editing a component.</Alert.Description>
      </Alert.Root>
    </div>
  );
}

function OverlaysScene({
  container,
  inspect,
}: {
  container: RefObject<HTMLDivElement | null>;
  inspect: boolean;
}) {
  return (
    <div {...stylex.props(styles.row)}>
      <Popover.Root>
        <Popover.Trigger render={<Button variant="outline" />}>Open overlay</Popover.Trigger>
        <Popover.Portal container={container}>
          <Popover.Positioner sideOffset={8}>
            <Popover.Popup>
              <Popover.Title>Notes stay in this pane</Popover.Title>
              <Popover.Description>The overlay mounts inside the preview boundary.</Popover.Description>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Dialog.Root>
        <Dialog.Trigger render={<Button />}>Open dialog</Dialog.Trigger>
        <Dialog.Portal container={container}>
          <Dialog.Backdrop />
          <Dialog.Viewport>
            <Dialog.Popup>
              <Dialog.Title>Seal the bargain?</Dialog.Title>
              <Dialog.Description>Popups render inside the pane's theme boundary.</Dialog.Description>
              <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
      <Inspectable inspect={inspect} inline tokens={['--ult-color-surface-overlay']}>
        <Badge>Overlay tokens</Badge>
      </Inspectable>
    </div>
  );
}

function StatesScene({ inspect }: { inspect: boolean }) {
  return (
    <div {...stylex.props(styles.stack)}>
      <p {...stylex.props(styles.note)}>Forced rest, hover, and active sit beside live controls.</p>
      <div {...stylex.props(styles.row)}>
        <Inspectable inspect={inspect} inline tokens={['--ult-color-accent', '--ult-color-accent-contrast']}>
          <Button>Forced rest</Button>
        </Inspectable>
        <Button style={styles.hover}>Forced hover</Button>
        <Button style={styles.active}>Forced active</Button>
        <Button>Live solid</Button>
      </div>
    </div>
  );
}

function MotionScene({ inspect }: { inspect: boolean }) {
  return (
    <div {...stylex.props(styles.stack)}>
      <div {...stylex.props(styles.row)}>
        <Inspectable inspect={inspect} inline tokens={['--ult-motion-loop']}>
          <span {...stylex.props(styles.spinner)}>
            <Spinner />
          </span>
        </Inspectable>
        <p {...stylex.props(styles.note)}>
          loop uses --ult-motion-loop. Transitions use fast, base, and slow.
        </p>
      </div>
      <Progress.Root value={null}>
        <Progress.Label>Restoring backup</Progress.Label>
        <Progress.Track>
          <Progress.Indicator />
        </Progress.Track>
      </Progress.Root>
    </div>
  );
}

function Inspectable({
  children,
  inline = false,
  inspect,
  tokens,
}: {
  children: ReactNode;
  inline?: boolean;
  inspect: boolean;
  tokens: readonly string[];
}) {
  return (
    <div
      data-tokens={tokens.join(',')}
      {...stylex.props(inline ? styles.inspectInline : styles.inspectBlock, inspect && styles.inspectable)}
    >
      {children}
      {inspect ? (
        <Button aria-label={`Inspect ${tokens.join(', ')}`} style={styles.inspectTarget} variant="ghost" />
      ) : null}
    </div>
  );
}
