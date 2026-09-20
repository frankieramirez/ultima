import * as stylex from '@stylexjs/stylex';
import { colorScheme } from '@ultima/tokens';
import { border, color, font, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Dialog,
  Field,
  Input,
  Popover,
  Progress,
  Spinner,
  Switch,
  Table,
  Tabs,
  Toggle,
  ToggleGroup,
} from '@ultima/ui';
import { useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';

import { draftDark, draftLight } from './theme-studio-draft';

const RAIL = '@media (min-width: 52.5rem)';

const SCENES = [
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
    gap: space['--ult-space-6'],
    minBlockSize: 0,
    minInlineSize: 0,
    order: { default: 0, [RAIL]: 1 },
    padding: space['--ult-space-8'],
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
  },
  tools: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  scenes: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  panes: {
    display: 'flex',
    flexDirection: { default: 'column', [RAIL]: 'row' },
    flexGrow: 1,
    gap: space['--ult-space-6'],
    minBlockSize: 0,
    minInlineSize: 0,
  },
  pane: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-6'],
    minBlockSize: 0,
    minInlineSize: 0,
    overflow: 'auto',
    position: 'relative',
  },
  scene: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-8'],
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  display: {
    fontSize: text['--ult-text-9'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  subtitle: {
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    margin: 0,
  },
  body: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  note: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
  spinner: {
    fontSize: text['--ult-text-9'],
  },
  raised: {
    boxShadow: shadow['--ult-shadow-md'],
  },
  inspectable: {
    borderRadius: radius['--ult-radius-md'],
    ':hover': {
      outlineColor: color['--ult-color-border-focus'],
      outlineOffset: border.focusOffset,
      outlineStyle: 'dashed',
      outlineWidth: border.focus,
    },
  },
  inspectBlock: {
    display: 'block',
  },
  inspectInline: {
    display: 'inline-flex',
  },
  specimen: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-8'],
    marginBlockStart: 'auto',
    paddingBlockStart: space['--ult-space-6'],
  },
  specimenGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    minInlineSize: 0,
  },
  specimenLabel: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
  },
  typeMark: {
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-medium'],
    margin: 0,
  },
  readout: {
    alignSelf: 'flex-start',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    gap: space['--ult-space-2'],
    minInlineSize: 0,
  },
  tokenRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  tokenValue: {
    color: color['--ult-color-text'],
  },
  hover: {
    backgroundColor: color['--ult-color-accent-hover'],
  },
  active: {
    backgroundColor: color['--ult-color-accent-active'],
  },
});

export function ThemeStudioPreview({
  mode,
  onModeChange,
}: {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
}) {
  const [scene, setScene] = useState<Scene>('workspace');
  const [inspect, setInspect] = useState(false);
  const [readout, setReadout] = useState<TokenReadout | null>(null);
  const panes = mode === 'compare' ? (['dark', 'light'] as const) : [mode];

  return (
    <section aria-label="Live preview" {...stylex.props(styles.preview)}>
      <div {...stylex.props(styles.toolbar)}>
        <Tabs.Root
          onValueChange={(next) => {
            if (next) setScene(next as Scene);
          }}
          style={styles.scenes}
          value={scene}
        >
          <Tabs.List aria-label="Preview scenes">
            {SCENES.map((item) => (
              <Tabs.Tab key={item.id} value={item.id}>
                {item.label}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator />
          </Tabs.List>
        </Tabs.Root>
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
      <div {...stylex.props(styles.panes)}>
        {panes.map((pane) => (
          <PreviewPane
            inspect={inspect}
            key={pane}
            mode={pane}
            onReadout={setReadout}
            scene={scene}
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
}: {
  inspect: boolean;
  mode: PaneMode;
  onReadout: (tokens: TokenReadout | null) => void;
  scene: Scene;
}) {
  const portal = useRef<HTMLDivElement>(null);
  const theme = mode === 'dark' ? draftDark : draftLight;
  const scheme = mode === 'dark' ? colorScheme.dark : colorScheme.light;

  function readTokens(event: MouseEvent<HTMLDivElement>) {
    if (!inspect) return;
    const target = (event.target as HTMLElement | null)?.closest('[data-tokens]');
    if (!(target instanceof HTMLElement) || !event.currentTarget.contains(target)) return;
    const names = target.dataset.tokens?.split(',').map((name) => name.trim()).filter(Boolean) ?? [];
    onReadout(
      names.map((name) => ({
        name,
        value: getComputedStyle(target).getPropertyValue(name).trim() || '—',
      })),
    );
  }

  return (
    <div
      aria-label={mode === 'dark' ? 'Dark preview' : 'Light preview'}
      onMouseLeave={() => {
        if (inspect) onReadout(null);
      }}
      onMouseOver={readTokens}
      ref={portal}
      role="region"
      {...stylex.props(theme, scheme, styles.pane)}
    >
      <div data-preview-scene={scene} {...stylex.props(styles.scene)}>
        <SceneBody container={portal} inspect={inspect} mode={mode} scene={scene} />
      </div>
      <SpecimenStrip inspect={inspect} />
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

function WorkspaceScene({ inspect, mode }: { inspect: boolean; mode: PaneMode }) {
  return (
    <Inspectable inspect={inspect} tokens={CARD_TOKENS}>
      <Card.Root style={styles.raised}>
        <Card.Header>
          <Card.Title render={<h2 />}>Forma</Card.Title>
          <Card.Description>A live application mock under the draft theme.</Card.Description>
        </Card.Header>
        <Card.Body {...stylex.props(styles.stack)}>
          <Tabs.Root defaultValue="general">
            <Tabs.List aria-label="Workspace sections">
              <Tabs.Tab value="general">General</Tabs.Tab>
              <Tabs.Tab value="members">Members</Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
          </Tabs.Root>
          <Field.Root name={`${mode}-project-name`}>
            <Field.Label>Project name</Field.Label>
            <Input defaultValue="Untitled theme" />
          </Field.Root>
          <Table.Root>
            <Table.Caption>Recent drafts</Table.Caption>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              <Table.Row>
                <Table.Cell>Stock verdant</Table.Cell>
                <Table.Cell>
                  <Badge tone="success">Passing</Badge>
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Ember study</Table.Cell>
                <Table.Cell>
                  <Badge tone="warning">Review</Badge>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Card.Body>
        <Card.Footer>
          <Button>Save draft</Button>
          <Button variant="outline">Discard</Button>
        </Card.Footer>
      </Card.Root>
    </Inspectable>
  );
}

function TypographyScene({ inspect }: { inspect: boolean }) {
  return (
    <div {...stylex.props(styles.stack)}>
      <Inspectable inspect={inspect} tokens={['--ult-text-9', '--ult-font-sans', '--ult-font-tracking-tight']}>
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
          Body copy rides on <Code>--ult-text-5</Code> with muted color. Density never moves these; only
          the typography group does.
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
        <Inspectable inspect={inspect} tokens={['--ult-color-surface-sunken', '--ult-color-border', '--ult-color-border-focus']}>
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
        <p {...stylex.props(styles.note)}>loop uses --ult-motion-loop. Transitions use fast, base, and slow.</p>
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

function SpecimenStrip({ inspect }: { inspect: boolean }) {
  return (
    <div data-preview-specimen {...stylex.props(styles.specimen)}>
      <div {...stylex.props(styles.specimenGroup)}>
        <p {...stylex.props(styles.specimenLabel)}>01 / TYPE</p>
        <p {...stylex.props(styles.typeMark)}>Aa</p>
      </div>
      <div {...stylex.props(styles.specimenGroup)}>
        <p {...stylex.props(styles.specimenLabel)}>02 / INTERACTION</p>
        <div {...stylex.props(styles.row)}>
          <Button size="sm">Rest</Button>
          <Button size="sm" style={styles.hover}>
            Hover
          </Button>
          <Button size="sm" style={styles.active}>
            Active
          </Button>
        </div>
      </div>
      <div {...stylex.props(styles.specimenGroup)}>
        <p {...stylex.props(styles.specimenLabel)}>03 / INSPECT</p>
        <Inspectable inspect={inspect} tokens={['--ult-color-accent']}>
          <Code>--ult-color-accent</Code>
        </Inspectable>
      </div>
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
    </div>
  );
}
