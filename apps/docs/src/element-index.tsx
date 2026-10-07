import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge, Card, Separator } from '@ultima/ui';
import type { ReactNode } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { CataloguePreview } from './catalogue-preview';
import { components } from './components';
import { elements } from './elements';
import { TextLink } from './text-link';

const styles = stylex.create({
  uses: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  path: { marginBlock: space['--ult-space-6'] },
  pathHead: { alignItems: 'center', flexDirection: 'row', gap: space['--ult-space-5'], paddingBlockEnd: 0 },
  pathTitle: {
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  pathNumber: { fontFamily: font['--ult-font-mono'] },
  grid: {
    display: 'grid',
    gap: space['--ult-space-5'],
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      [breakpoints.WIDE]: 'repeat(2, minmax(0, 1fr))',
      [breakpoints.DESKTOP]: 'repeat(3, minmax(0, 1fr))',
    },
    listStyle: 'none',
    margin: 0,
    marginBlock: space['--ult-space-6'],
    padding: 0,
  },
  link: { color: color['--ult-color-text'], display: 'block', textDecoration: 'none' },
  card: { overflow: 'hidden' },
  body: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-5'],
  },
  name: { alignItems: 'baseline', display: 'flex', gap: space['--ult-space-4'], minInlineSize: 0 },
  number: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'] },
  tag: {
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    overflowWrap: 'anywhere',
  },
  arrow: { color: color['--ult-color-text-subtle'], flexShrink: 0 },
});

export function UseCases({ children }: { children: string[] }) {
  return (
    <ul {...stylex.props(styles.uses)}>
      {children.map((use) => (
        <li key={use}>
          <Badge>{use}</Badge>
        </li>
      ))}
    </ul>
  );
}

export function InstallPath({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <Card.Root style={styles.path}>
      <Card.Header style={styles.pathHead}>
        <Badge style={styles.pathNumber}>{number}</Badge>
        <Card.Title style={styles.pathTitle}>{title}</Card.Title>
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card.Root>
  );
}

export function ElementIndex() {
  return (
    <ul {...stylex.props(styles.grid)}>
      {elements.map((element) => {
        const entry = components.find((component) => component.item === element.item);
        return (
          <li key={element.item}>
            <TextLink
              variant="muted"
              render={<Link to="/components/$name" params={{ name: element.item }} hash="web-component" />}
              style={styles.link}
            >
              <Card.Root style={styles.card}>
                <CataloguePreview item={element.item} />
                <Separator />
                <span {...stylex.props(styles.body)}>
                  <span {...stylex.props(styles.name)}>
                    {entry && <span {...stylex.props(styles.number)}>{entry.number}</span>}
                    <span {...stylex.props(styles.tag)}>{`<${element.tag}>`}</span>
                  </span>
                  <ArrowUpRightIcon aria-hidden {...stylex.props(styles.arrow)} />
                </span>
              </Card.Root>
            </TextLink>
          </li>
        );
      })}
    </ul>
  );
}
