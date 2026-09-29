import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Accordion, Badge, Button, Card, Separator, Tabs } from '@ultima/ui';

import { breakpoints } from './breakpoints.stylex';
import { TextLink } from './text-link';
import { useResolvedScheme } from './theme';
import { headings } from './typography';

const styles = stylex.create({
  panel: {
    borderRadius: 0,
    padding: {
      default: space['--ult-space-6'],
      [breakpoints.WIDE]: space['--ult-space-9'],
    },
  },
  row: {
    alignItems: 'center',
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      [breakpoints.WIDE]: '16.25rem minmax(0, 1fr)',
    },
    gap: space['--ult-space-9'],
    paddingBlock: space['--ult-space-7'],
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
  },
  title: {
    fontFamily: 'Space Grotesk, Figtree, sans-serif',
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  preview: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
    minInlineSize: 0,
  },
  full: { inlineSize: '100%', minInlineSize: 0 },
  invitation: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-8'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-9'],
  },
  notes: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      [breakpoints.WIDE]: 'repeat(2, minmax(0, 1fr))',
    },
    gap: space['--ult-space-9'],
    paddingBlockStart: space['--ult-space-8'],
  },
  note: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
  },
  noteHeading: {
    fontWeight: font['--ult-font-weight-medium'],
    fontSize: text['--ult-text-7'],
    margin: 0,
  },
  body: {
    paddingBlock: space['--ult-space-5'],
    fontSize: text['--ult-text-4'],
  },
});

export default function Specimen() {
  const dark = useResolvedScheme() === 'dark';
  const rows = [
    {
      item: 'button',
      title: 'Buttons',
      description: 'Solid, outline, and ghost variants',
      preview: (
        <>
          <Button>Solid</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </>
      ),
    },
    {
      item: 'badge',
      title: 'Badges',
      description: 'Labels for status and category',
      preview: (
        <>
          <Badge>Neutral</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
        </>
      ),
    },
    {
      item: 'tabs',
      title: 'Tabs',
      description: 'Organize related content',
      preview: (
        <div {...stylex.props(styles.full)}>
          <Tabs.Root defaultValue="preview">
            <Tabs.List aria-label="Component example">
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
              <Tabs.Tab value="code">Code</Tabs.Tab>
              <Tabs.Tab value="usage">Usage</Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
            <Tabs.Panel value="preview">Explore live components.</Tabs.Panel>
            <Tabs.Panel value="code">
              Install the source into your project.
            </Tabs.Panel>
            <Tabs.Panel value="usage">
              Adapt the parts to your interface.
            </Tabs.Panel>
          </Tabs.Root>
        </div>
      ),
    },
    {
      item: 'accordion',
      title: 'Accordion',
      description: 'Reveal details when they are useful',
      preview: (
        <div {...stylex.props(styles.full)}>
          <Accordion.Root defaultValue={['registry']}>
            <Accordion.Item value="registry">
              <Accordion.Header>
                <Accordion.Trigger>
                  What does the registry install?
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>
                <div {...stylex.props(styles.body)}>
                  Component source that you can edit in your own project.
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      ),
    },
  ];
  return (
    <>
      <div
        {...stylex.props(
          dark ? lightTheme : darkTheme,
          dark ? colorScheme.light : colorScheme.dark,
        )}
      >
        <Card.Root
          role="region"
          aria-label="Component specimen"
          style={styles.panel}
        >
          {rows.map(({ item, title, description, preview }, index) => (
            <div key={item}>
              {index > 0 && <Separator />}
              <div {...stylex.props(styles.row)}>
                <div {...stylex.props(styles.copy)}>
                  <TextLink
                    variant="muted"
                    render={
                      <Link to="/components/$name" params={{ name: item }} />
                    }
                    style={styles.title}
                  >
                    {title}
                    <ArrowUpRightIcon aria-hidden />
                  </TextLink>
                  <p {...stylex.props(styles.description)}>{description}</p>
                </div>
                <div data-component-preview {...stylex.props(styles.preview)}>
                  {preview}
                </div>
              </div>
            </div>
          ))}
        </Card.Root>
      </div>
      <div {...stylex.props(styles.invitation)}>
        <div {...stylex.props(styles.note)}>
          <h3 {...stylex.props(headings.h3, styles.noteHeading)}>
            See the components in your theme.
          </h3>
          <p {...stylex.props(styles.description)}>
            Explore how your theme looks across the component library.
          </p>
        </div>
        <TextLink variant="muted" render={<Link to="/theme-studio" />}>
          Try the theme studio
          <ArrowUpRightIcon aria-hidden />
        </TextLink>
      </div>
      <Separator />
      <div {...stylex.props(styles.notes)}>
        <div {...stylex.props(styles.note)}>
          <h3 {...stylex.props(headings.h3, styles.noteHeading)}>
            A shared token system
          </h3>
          <p {...stylex.props(styles.description)}>
            Change color, spacing, typography, and motion through semantic
            tokens.
          </p>
        </div>
        <div {...stylex.props(styles.note)}>
          <h3 {...stylex.props(headings.h3, styles.noteHeading)}>
            Source you own
          </h3>
          <p {...stylex.props(styles.description)}>
            Install from the registry and edit the components in your codebase.
          </p>
        </div>
      </div>
    </>
  );
}
