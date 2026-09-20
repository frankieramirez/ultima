import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme } from '@ultima/tokens';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Popover,
  Separator,
  ToggleGroup,
} from '@ultima/ui';
import { useRef, useState, type RefObject } from 'react';

import { BrandLogo } from '../brand-logo';
import { draftDark, draftLight } from '../theme-studio-draft';

const RAIL = '@media (min-width: 52.5rem)';

const GROUPS = ['Color', 'Typography', 'Density', 'Shape', 'Elevation', 'Motion'] as const;
const MODES = ['dark', 'light', 'compare'] as const;

type Group = (typeof GROUPS)[number];
type Mode = (typeof MODES)[number];

const styles = stylex.create({
  shell: {
    backgroundColor: color['--ult-color-surface'],
    blockSize: '100dvh',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    minBlockSize: 0,
  },
  header: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    inlineSize: '100%',
    paddingBlock: space['--ult-space-6'],
    paddingInline: space['--ult-space-8'],
  },
  brand: {
    display: 'inline-flex',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  brandLogo: { display: 'block', height: '0.8rem', width: 'auto' },
  title: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  meta: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-2'],
  },
  save: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-1'],
    marginInlineStart: 'auto',
  },
  actions: {
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  body: {
    display: 'flex',
    flexDirection: { default: 'column', [RAIL]: 'row' },
    flexGrow: 1,
    minBlockSize: 0,
    minInlineSize: 0,
  },
  editor: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: space['--ult-space-6'],
    inlineSize: { default: '100%', [RAIL]: '18.75rem' },
    minBlockSize: 0,
    order: { default: 1, [RAIL]: 0 },
    padding: space['--ult-space-8'],
  },
  groups: {
    flexDirection: { default: 'row', [RAIL]: 'column' },
    flexShrink: 0,
    overflow: 'auto',
  },
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
  previewLabel: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    margin: 0,
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
    flexGrow: 1,
    minBlockSize: 0,
    minInlineSize: 0,
    overflow: 'auto',
  },
  specimen: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-8'],
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  status: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    marginBlockStart: 'auto',
    paddingBlockStart: space['--ult-space-6'],
  },
  statusCopy: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-1'],
  },
});

export function ThemeStudio() {
  const [mode, setMode] = useState<Mode>('dark');
  const [group, setGroup] = useState<Group>('Color');
  const panes = mode === 'compare' ? (['dark', 'light'] as const) : [mode];

  return (
    <div {...stylex.props(darkTheme, colorScheme.dark, styles.shell)}>
      <header {...stylex.props(styles.header)}>
        <Link to="/" aria-label="Ultima home" {...stylex.props(styles.brand)}>
          <BrandLogo alt="" width={140} height={20} style={styles.brandLogo} />
        </Link>
        <h1 {...stylex.props(styles.title)}>Theme Studio</h1>
        <span {...stylex.props(styles.meta)}>Untitled theme</span>
        <span {...stylex.props(styles.save)}>Saved locally</span>
        <div {...stylex.props(styles.actions)}>
          <Button variant="outline" size="sm">
            Open
          </Button>
          <Button variant="outline" size="sm">
            Share
          </Button>
          <Button size="sm">
            Export theme
          </Button>
        </div>
      </header>
      <Separator />
      <div {...stylex.props(styles.body)}>
        <aside aria-label="Theme editor" {...stylex.props(styles.editor)}>
          <ToggleGroup.Root
            aria-label="Theme groups"
            onValueChange={(next, eventDetails) => {
              const [selected] = next;
              if (!selected) {
                eventDetails.cancel();
                return;
              }
              setGroup(selected);
            }}
            style={styles.groups}
            value={[group]}
          >
            {GROUPS.map((name) => (
              <ToggleGroup.Item key={name} value={name}>
                {name}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          <div {...stylex.props(styles.status)}>
            <Button
              nativeButton={false}
              render={<Link to="/tokens" />}
              size="sm"
              variant="ghost"
            >
              Token contrast · View report <ArrowUpRightIcon aria-hidden />
            </Button>
            <span {...stylex.props(styles.statusCopy)}>Editing both modes</span>
            <span {...stylex.props(styles.statusCopy)}>0 overrides · 0 locked groups</span>
            <Button size="sm" variant="ghost">
              Reset theme
            </Button>
          </div>
        </aside>
        <section aria-label="Live preview" {...stylex.props(styles.preview)}>
          <div {...stylex.props(styles.toolbar)}>
            <p {...stylex.props(styles.previewLabel)}>Preview</p>
            <ToggleGroup.Root
              aria-label="Preview color mode"
              onValueChange={(next, eventDetails) => {
                const [selected] = next;
                if (!selected) {
                  eventDetails.cancel();
                  return;
                }
                setMode(selected);
              }}
              value={[mode]}
            >
              <ToggleGroup.Item value="dark">Dark</ToggleGroup.Item>
              <ToggleGroup.Item value="light">Light</ToggleGroup.Item>
              <ToggleGroup.Item value="compare">Compare</ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
          <div {...stylex.props(styles.panes)}>
            {panes.map((pane) => (
              <PreviewPane key={pane} mode={pane} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PreviewPane({ mode }: { mode: 'dark' | 'light' }) {
  const portal = useRef<HTMLDivElement>(null);
  const theme = mode === 'dark' ? draftDark : draftLight;
  const scheme = mode === 'dark' ? colorScheme.dark : colorScheme.light;

  return (
    <div
      aria-label={mode === 'dark' ? 'Dark preview' : 'Light preview'}
      ref={portal}
      role="region"
      {...stylex.props(theme, scheme, styles.pane)}
    >
      <Card.Root>
        <Card.Body>
          <Specimen container={portal} />
        </Card.Body>
      </Card.Root>
    </div>
  );
}

function Specimen({ container }: { container: RefObject<HTMLDivElement | null> }) {
  return (
    <div data-preview-specimen {...stylex.props(styles.specimen)}>
      <div {...stylex.props(styles.row)}>
        <Button variant="solid">Solid</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <Field.Root name="preview-email">
        <Field.Label>Email</Field.Label>
        <Input placeholder="you@example.com" type="email" />
        <Field.Description>We never share this.</Field.Description>
      </Field.Root>
      <Card.Root>
        <Card.Header>
          <Card.Title render={<h2 />}>Draft specimen</Card.Title>
          <Card.Description>Live components under the stub theme.</Card.Description>
        </Card.Header>
        <Card.Footer>
          <Badge tone="accent">Badge</Badge>
          <Badge tone="success" variant="solid">
            success
          </Badge>
          <Badge tone="warning">warning</Badge>
        </Card.Footer>
      </Card.Root>
      <Popover.Root>
        <Popover.Trigger render={<Button variant="outline" />}>Notes</Popover.Trigger>
        <Popover.Portal container={container}>
          <Popover.Positioner sideOffset={8}>
            <Popover.Popup>
              <Popover.Title>Notes stay in this pane</Popover.Title>
              <Popover.Description>The overlay mounts inside the preview boundary.</Popover.Description>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
