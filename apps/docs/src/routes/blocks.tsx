import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, Separator } from '@ultima/ui';
import { Fragment } from 'react';

import { BlockFrame } from '../block-frame';
import { breakpoints } from '../breakpoints.stylex';
import { DocumentLayout } from '../document-layout';
import { blocks, type BlockEntry } from '../generated/blocks';
import { TextLink } from '../text-link';

const HEADING_FONT = 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif';

const FACTS = [
  { label: 'Install', value: 'one command per block' },
  { label: 'Theme', value: 'Neutral, or yours' },
  { label: 'Frameworks', value: 'Next.js and Vite' },
];

const styles = stylex.create({
  runningHead: {
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: { default: '0.625rem', [breakpoints.WIDE]: text['--ult-text-1'] },
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
    paddingBlockEnd: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-5'] },
    textTransform: 'uppercase',
  },
  frameworks: { display: { default: 'none', [breakpoints.WIDE]: 'inline' } },
  titleBlock: {
    alignItems: 'flex-end',
    columnGap: space['--ult-space-11'],
    display: 'flex',
    flexWrap: 'wrap',
    marginBlockStart: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-11'] },
    rowGap: space['--ult-space-7'],
  },
  titleCopy: {
    display: 'flex',
    flexBasis: 0,
    flexDirection: 'column',
    flexGrow: 1,
    gap: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-6'] },
  },
  title: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '3.75rem', [breakpoints.INDEX]: '6rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tightest'],
    lineHeight: 0.95,
    margin: 0,
  },
  lede: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    maxInlineSize: '35rem',
  },
  facts: {
    flexBasis: { default: '100%', [breakpoints.WIDE]: '18.75rem' },
    flexGrow: 0,
    flexShrink: 0,
  },
  fact: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    margin: 0,
    minBlockSize: space['--ult-space-11'],
  },
  factLabel: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: '0.65625rem',
    letterSpacing: font['--ult-font-tracking-wide'],
    textTransform: 'uppercase',
  },
  factValue: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    margin: 0,
  },
  cards: {
    display: 'grid',
    gap: { default: space['--ult-space-7'], [breakpoints.DESKTOP]: space['--ult-space-7'] },
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.DESKTOP]: 'repeat(2, minmax(0, 1fr))' },
    listStyle: 'none',
    marginBlock: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-11'] },
    marginInline: 0,
    padding: 0,
  },
  card: { blockSize: '100%', overflow: 'hidden', position: 'relative' },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    paddingBlockEnd: space['--ult-space-6'],
    paddingBlockStart: space['--ult-space-6'],
    paddingInline: space['--ult-space-6'],
  },
  titleRow: { alignItems: 'center', display: 'flex', gap: space['--ult-space-5'], justifyContent: 'space-between' },
  name: { alignItems: 'baseline', display: 'flex', gap: space['--ult-space-4'], margin: 0, minInlineSize: 0 },
  number: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'] },
  stretchedLink: {
    color: { default: color['--ult-color-text'], ':hover': color['--ult-color-text'] },
    fontFamily: HEADING_FONT,
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    textDecoration: 'none',
    '::after': { content: '""', inset: 0, position: 'absolute' },
  },
  open: {
    alignItems: 'center',
    color: color['--ult-color-text'],
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-3'],
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  install: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    gap: space['--ult-space-4'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-5'],
  },
  prompt: { color: color['--ult-color-text-subtle'], userSelect: 'none' },
  command: { color: color['--ult-color-text'], flexGrow: 1, minInlineSize: 0, overflowWrap: 'anywhere' },
  count: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-1'], marginInlineStart: 'auto' },
});

export function componentCount(block: BlockEntry) {
  return block.builtFrom.filter(({ kind }) => kind === 'component').length;
}

function BlockCard({ block }: { block: BlockEntry }) {
  const components = componentCount(block);
  return (
    <li>
      <Card.Root style={styles.card}>
        <BlockFrame block={block} thumbnail />
        <Separator />
        <div {...stylex.props(styles.body)}>
          <div {...stylex.props(styles.titleRow)}>
            <h2 {...stylex.props(styles.name)}>
              <span aria-hidden {...stylex.props(styles.number)}>
                {block.number}
              </span>
              <TextLink render={<Link to="/blocks/$id" params={{ id: block.id }} />} style={styles.stretchedLink}>
                {block.title}
              </TextLink>
            </h2>
            <span aria-hidden {...stylex.props(styles.open)}>
              Open
              <ArrowRightIcon />
            </span>
          </div>
          <p {...stylex.props(styles.description)}>{block.description}</p>
          <Card.Root style={styles.install}>
            <span aria-hidden {...stylex.props(styles.prompt)}>
              $
            </span>
            <code {...stylex.props(styles.command)}>{block.install}</code>
            <span {...stylex.props(styles.count)}>
              {components} {components === 1 ? 'component' : 'components'}
            </span>
          </Card.Root>
        </div>
      </Card.Root>
    </li>
  );
}

export function BlocksPage() {
  return (
    <DocumentLayout breadcrumb={[]} index={false}>
      <p {...stylex.props(styles.runningHead)}>
        <span>Blocks</span>
        <span>
          {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'} · registry items
        </span>
        <span {...stylex.props(styles.frameworks)}>Next.js · Vite</span>
      </p>
      <Separator />
      <div {...stylex.props(styles.titleBlock)}>
        <div {...stylex.props(styles.titleCopy)}>
          <h1 {...stylex.props(styles.title)}>Blocks</h1>
          <p {...stylex.props(styles.lede)}>
            Whole pages built from Ultima components. Install one with a single command, then it’s your code to change.
          </p>
        </div>
        <div {...stylex.props(styles.facts)}>
          <Separator />
          {FACTS.map((fact) => (
            <Fragment key={fact.label}>
              <dl {...stylex.props(styles.fact)}>
                <dt {...stylex.props(styles.factLabel)}>{fact.label}</dt>
                <dd {...stylex.props(styles.factValue)}>{fact.value}</dd>
              </dl>
              <Separator />
            </Fragment>
          ))}
        </div>
      </div>
      <ul aria-label="Blocks" {...stylex.props(styles.cards)}>
        {blocks.map((block) => (
          <BlockCard key={block.id} block={block} />
        ))}
      </ul>
    </DocumentLayout>
  );
}
