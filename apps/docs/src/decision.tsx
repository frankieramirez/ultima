import { ArrowDownIcon, ArrowUpRightIcon, CheckIcon, FileTextIcon, XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge, Card, Separator, Table } from '@ultima/ui';
import type { ReactNode } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { records, type DecisionRecord } from './decision-records';
import { foundationStyles, P } from './foundation';
import { TextLink } from './text-link';
import { headings } from './typography';

const styles = stylex.create({
  head: {
    alignItems: 'flex-end',
    display: 'flex',
    gap: space['--ult-space-7'],
    marginBlockStart: '5.5rem',
    paddingBlockEnd: space['--ult-space-8'],
  },
  number: {
    color: color['--ult-color-text-subtle'],
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: { default: text['--ult-text-11'], [breakpoints.WIDE]: '5.5rem' },
    letterSpacing: font['--ult-font-tracking-tightest'],
    lineHeight: 0.85,
  },
  titles: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    minInlineSize: 0,
    paddingBlockEnd: space['--ult-space-2'],
  },
  title: {
    fontSize: { default: text['--ult-text-9'], [breakpoints.WIDE]: '2.5rem' },
    letterSpacing: font['--ult-font-tracking-tighter'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  record: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    textDecoration: 'none',
  },
  recordIcon: { verticalAlign: '-0.125em' },
  recordLead: { marginInlineEnd: space['--ult-space-3'] },
  recordTrail: { marginInlineStart: space['--ult-space-3'] },
  source: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-4'], margin: 0 },
  tradeoff: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
    marginBlock: space['--ult-space-8'],
  },
  narrowOnly: { display: { default: 'block', [breakpoints.WIDE]: 'none' } },
  wideOnly: { display: { default: 'none', [breakpoints.WIDE]: 'block' } },
  side: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    padding: space['--ult-space-7'],
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  option: {
    display: 'flex',
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-5'],
    lineHeight: font['--ult-font-leading-snug'],
  },
  chosen: { color: color['--ult-color-text'], fontWeight: font['--ult-font-weight-medium'] },
  passed: { color: color['--ult-color-text-muted'] },
  mark: { flexShrink: 0, fontSize: text['--ult-text-5'], marginBlockStart: space['--ult-space-1'] },
  index: { marginBlock: space['--ult-space-9'] },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  entry: {
    alignItems: 'center',
    columnGap: space['--ult-space-7'],
    display: 'grid',
    gridTemplateColumns: {
      default: 'auto minmax(0, 1fr) auto',
      [breakpoints.WIDE]: 'auto 12.5rem minmax(0, 1fr) auto auto',
    },
    paddingBlock: space['--ult-space-5'],
    position: 'relative',
  },
  entryNumber: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'] },
  entryTitle: {
    color: { default: color['--ult-color-text'], ':hover': color['--ult-color-text'] },
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    textDecoration: 'none',
    '::after': { content: '""', inset: 0, position: 'absolute' },
  },
  entrySummary: {
    color: color['--ult-color-text-muted'],
    display: { default: 'none', [breakpoints.WIDE]: 'block' },
    fontSize: text['--ult-text-4'],
    minInlineSize: 0,
  },
  entryRecord: { fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'], textTransform: 'uppercase' },
  entryArrow: {
    color: color['--ult-color-text-subtle'],
    display: { default: 'none', [breakpoints.WIDE]: 'block' },
    fontSize: text['--ult-text-4'],
  },
  recordsTitle: {
    fontSize: { default: text['--ult-text-9'], [breakpoints.WIDE]: text['--ult-text-10'] },
    letterSpacing: font['--ult-font-tracking-tighter'],
    lineHeight: font['--ult-font-leading-none'],
    marginBlockStart: '5.5rem',
    marginBlockEnd: space['--ult-space-7'],
  },
  recordNumber: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-mono'], whiteSpace: 'nowrap' },
  recordLink: {
    color: color['--ult-color-text'],
    textDecoration: { default: 'none', ':hover': 'underline' },
  },
});

type DecisionEntry = { id: string; title: string; record?: string };

export const decisions: DecisionEntry[] = [
  { id: 'stylex', title: 'StyleX', record: '0001' },
  { id: 'base-ui', title: 'Base UI', record: '0002' },
  { id: 'registry-first', title: 'Registry-first', record: '0003' },
  { id: 'dark-first', title: 'Dark-first' },
];

const numberOf = (index: number) => String(index + 1).padStart(2, '0');

function recordOf({ record }: DecisionEntry): DecisionRecord | undefined {
  if (record === undefined) return undefined;
  const found = records.find(({ number }) => number === record);
  if (!found) throw new Error(`No ADR ${record} in docs/adr/`);
  return found;
}

function decisionOf(title: string) {
  const index = decisions.findIndex((decision) => decision.title === title);
  const decision = decisions[index];
  if (!decision) throw new Error(`${title} is not in the decisions list`);
  return { ...decision, number: numberOf(index), record: recordOf(decision) };
}

export function Decision({ title }: { title: string }) {
  const { id, number, record } = decisionOf(title);
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span aria-hidden {...stylex.props(styles.number)}>
          {number}
        </span>
        <div {...stylex.props(styles.titles)}>
          <h2 id={id} data-index-number={number} {...stylex.props(headings.h2, styles.title)}>
            {title}
          </h2>
          {record ? (
            <TextLink href={record.href} style={styles.record}>
              <FileTextIcon aria-hidden {...stylex.props(styles.recordIcon, styles.recordLead)} />
              ADR {record.number} · {record.title}
              <ArrowUpRightIcon aria-hidden {...stylex.props(styles.recordIcon, styles.recordTrail)} />
            </TextLink>
          ) : (
            <p {...stylex.props(styles.source)}>A principle in the spec</p>
          )}
        </div>
      </div>
      <Separator />
    </>
  );
}

export function Tradeoff({ chose, over }: { chose: ReactNode[]; over: ReactNode[] }) {
  return (
    <Card.Root style={styles.tradeoff}>
      <div {...stylex.props(styles.side)}>
        <p {...stylex.props(foundationStyles.label)}>Chose</p>
        <ul {...stylex.props(styles.options)}>
          {chose.map((option, index) => (
            <li key={index} {...stylex.props(styles.option, styles.chosen)}>
              <CheckIcon aria-hidden {...stylex.props(styles.mark)} />
              <span>{option}</span>
            </li>
          ))}
        </ul>
      </div>
      <Separator style={styles.narrowOnly} />
      <Separator orientation="vertical" style={styles.wideOnly} />
      <div {...stylex.props(styles.side)}>
        <p {...stylex.props(foundationStyles.label)}>Over</p>
        <ul {...stylex.props(styles.options)}>
          {over.map((option, index) => (
            <li key={index} {...stylex.props(styles.option, styles.passed)}>
              <XIcon aria-hidden {...stylex.props(styles.mark)} />
              <span>{option}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card.Root>
  );
}

export function DecisionIndex() {
  return (
    <div {...stylex.props(styles.index)}>
      <Separator />
      <ol {...stylex.props(styles.list)}>
        {decisions.map((decision, index) => {
          const record = recordOf(decision);
          return (
            <li key={decision.id}>
              <div {...stylex.props(styles.entry)}>
                <span aria-hidden {...stylex.props(styles.entryNumber)}>
                  {numberOf(index)}
                </span>
                <TextLink href={`#${decision.id}`} style={styles.entryTitle}>
                  {decision.title}
                </TextLink>
                <span {...stylex.props(styles.entrySummary)}>{record ? record.title : 'A principle in the spec'}</span>
                <Badge style={styles.entryRecord}>{record ? `ADR ${record.number}` : 'Principle'}</Badge>
                <ArrowDownIcon aria-hidden {...stylex.props(styles.entryArrow)} />
              </div>
              <Separator />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Records() {
  const argued = decisions.filter(({ record }) => record !== undefined).length;
  return (
    <>
      <h2 id="every-decision-record" {...stylex.props(headings.h2, styles.recordsTitle)}>
        Every decision record
      </h2>
      <P>
        The site reads these from the repository when it builds. {argued} of the {records.length} hold the decisions above,
        and a record amended since it was written says so.
      </P>
      <RecordTable />
    </>
  );
}

function RecordTable() {
  return (
    <Table.Scroll aria-labelledby="records-caption">
      <Table.Root>
        <Table.Caption id="records-caption">The architecture decision records in docs/adr/.</Table.Caption>
        <Table.Head>
          <Table.Row>
            <Table.HeadCell>Record</Table.HeadCell>
            <Table.HeadCell>Title</Table.HeadCell>
            <Table.HeadCell>Status</Table.HeadCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {records.map((record) => (
            <Table.Row key={record.number}>
              <Table.Cell style={styles.recordNumber}>ADR {record.number}</Table.Cell>
              <Table.Cell>
                <TextLink href={record.href} style={styles.recordLink}>
                  {record.title}
                  <ArrowUpRightIcon aria-hidden {...stylex.props(styles.recordIcon, styles.recordTrail)} />
                </TextLink>
              </Table.Cell>
              <Table.Cell>{record.status}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Scroll>
  );
}
