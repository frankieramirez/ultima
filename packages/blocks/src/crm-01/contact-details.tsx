import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Avatar } from '@ultima/ui/avatar';
import { Badge } from '@ultima/ui/badge';
import { Card } from '@ultima/ui/card';
import { Separator } from '@ultima/ui/separator';
import { Fragment, type ReactNode } from 'react';

import type { Contact } from './crm-01';

const styles = stylex.create({
  card: {
    alignSelf: 'flex-start',
    flexBasis: `calc(3.5 * ${space['--ult-space-12']})`,
    flexGrow: 1,
  },
  head: {
    paddingBlockEnd: space['--ult-space-4'],
  },
  title: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-none'],
    textTransform: 'uppercase',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    margin: 0,
    paddingBlockEnd: space['--ult-space-6'],
    paddingInline: space['--ult-space-6'],
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
  },
  term: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
  },
  value: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-3'],
    margin: 0,
  },
  link: {
    color: color['--ult-color-text'],
    textDecorationLine: { default: 'none', ':hover': 'underline' },
  },
  owner: {
    blockSize: space['--ult-space-7'],
    inlineSize: space['--ult-space-7'],
  },
});

export function ContactDetails({ contact }: { contact: Contact }) {
  const rows: [string, ReactNode][] = [
    [
      'Email',
      <a href={`mailto:${contact.email}`} {...stylex.props(styles.link)}>
        {contact.email}
      </a>,
    ],
    [
      'Phone',
      <a href={`tel:${contact.phone.replaceAll(' ', '')}`} {...stylex.props(styles.link)}>
        {contact.phone}
      </a>,
    ],
    [
      'Owner',
      <>
        <Avatar.Root aria-hidden="true" style={styles.owner}>
          <Avatar.Fallback>{contact.owner.initials}</Avatar.Fallback>
        </Avatar.Root>
        {contact.owner.name}
      </>,
    ],
    ['Deal value', contact.deal ? `${contact.deal.value} · ${contact.deal.stage}` : 'No open deal'],
    [
      'Tags',
      contact.tags.map((tag) => (
        <Badge key={tag} tone="neutral">
          {tag}
        </Badge>
      )),
    ],
  ];

  return (
    <Card.Root style={styles.card}>
      <Card.Header style={styles.head}>
        <Card.Title style={styles.title}>Details</Card.Title>
      </Card.Header>
      <dl {...stylex.props(styles.list)}>
        {rows.map(([term, value], index) => (
          <Fragment key={term}>
            {/* axe-core's definition-list rule rejects a role="separator" child of a dl that screen readers can reach. */}
            {index > 0 && <Separator aria-hidden="true" />}
            <div {...stylex.props(styles.row)}>
              <dt {...stylex.props(styles.term)}>{term}</dt>
              <dd {...stylex.props(styles.value)}>{value}</dd>
            </div>
          </Fragment>
        ))}
      </dl>
    </Card.Root>
  );
}
