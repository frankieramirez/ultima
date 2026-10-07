import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link, type LinkProps } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';

import { GROUPS, components } from './components';
import { blocks } from './generated/blocks';
import { TextLink } from './text-link';

const styles = stylex.create({
  cards: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 14rem), 1fr))',
    listStyle: 'none',
    marginBlock: space['--ult-space-7'],
    marginInline: 0,
    padding: 0,
  },
  card: { blockSize: '100%', position: 'relative' },
  body: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-4'], paddingBlockStart: space['--ult-space-6'] },
  title: {
    alignItems: 'center',
    display: 'flex',
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
    letterSpacing: font['--ult-font-tracking-tight'],
    margin: 0,
  },
  link: {
    color: { default: color['--ult-color-text'], ':hover': color['--ult-color-text'] },
    textDecoration: 'none',
    '::after': { content: '""', inset: 0, position: 'absolute' },
  },
  arrow: { color: color['--ult-color-text-subtle'], flexShrink: 0, fontSize: text['--ult-text-5'] },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
});

type Destination = { title: string; to: NonNullable<LinkProps['to']>; description: string };

const DESTINATIONS: Destination[] = [
  {
    title: 'Components',
    to: '/components',
    description: `${components.length} components in ${GROUPS.length} groups, each page with live demos and its install command.`,
  },
  {
    title: 'Tokens',
    to: '/tokens',
    description: 'Every semantic token by group, with live swatches in both modes and the contrast of each pairing.',
  },
  {
    title: 'Theme Studio',
    to: '/theme-studio',
    description: 'Generate a theme for your Ultima application, then install the registry file it gives you.',
  },
  {
    title: 'CLI',
    to: '/cli',
    description: 'Verify your setup, check edits against the consumer rules, and see how installed files drift.',
  },
  {
    title: 'Blocks',
    to: '/blocks',
    description: `${blocks.length} blocks built from the catalogue, each with a framed preview and one install command.`,
  },
];

export function WhereNext() {
  return (
    <ul {...stylex.props(styles.cards)}>
      {DESTINATIONS.map(({ title, to, description }) => (
        <li key={to}>
          <Card.Root style={styles.card}>
            <Card.Body style={styles.body}>
              <h3 {...stylex.props(styles.title)}>
                <TextLink render={<Link to={to} />} style={styles.link}>
                  {title}
                </TextLink>
                <ArrowRightIcon aria-hidden {...stylex.props(styles.arrow)} />
              </h3>
              <p {...stylex.props(styles.description)}>{description}</p>
            </Card.Body>
          </Card.Root>
        </li>
      ))}
    </ul>
  );
}
