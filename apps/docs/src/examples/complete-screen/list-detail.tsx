'use client';

import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge, type BadgeTone } from '@ultima/ui/badge';
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';
import { ToggleGroup } from '@ultima/ui/toggle-group';
import { useId, useState } from 'react';

/** Where the list and the detail sit side by side instead of stacked. */
const DESKTOP = '@media (min-width: 48rem)';

type Status = 'open' | 'waiting' | 'resolved';

type Request = {
  id: string;
  subject: string;
  requester: string;
  received: string;
  status: Status;
  body: string;
};

const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  open: { label: 'Open', tone: 'warning' },
  waiting: { label: 'Waiting', tone: 'neutral' },
  resolved: { label: 'Resolved', tone: 'success' },
};

const sampleRequests: Request[] = [
  { id: 'r-104', subject: 'Invoice shows the wrong tax rate', requester: 'Ada Park', received: '9:42', status: 'open', body: 'The March invoice charges 21% tax, but our account is registered for the reduced rate.' },
  { id: 'r-103', subject: 'Add a second billing contact', requester: 'Priya Shah', received: 'Yesterday', status: 'waiting', body: 'Please send copies of every invoice to finance@northwind.co as well as to me.' },
  { id: 'r-102', subject: 'Export stops at 10,000 rows', requester: 'Tomás Ruiz', received: 'Mon', status: 'open', body: 'The CSV export of the orders table ends at row 10,000 without an error.' },
  { id: 'r-101', subject: 'Reset two-factor for a new phone', requester: 'Mei Lin', received: 'Mon', status: 'resolved', body: 'I replaced my phone and can no longer read the sign-in codes.' },
];

const styles = stylex.create({
  root: {
    alignItems: 'start',
    color: color['--ult-color-text'],
    display: 'grid',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-6'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [DESKTOP]: 'minmax(0, 2fr) minmax(0, 3fr)' },
  },
  list: {
    alignItems: 'stretch',
    display: 'flex',
  },
  row: {
    fontWeight: font['--ult-font-weight-regular'],
    justifyContent: 'flex-start',
    lineHeight: font['--ult-font-leading-snug'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'start',
  },
  rowText: {
    display: 'grid',
    flexGrow: 1,
    gap: space['--ult-space-2'],
    minInlineSize: 0,
  },
  line: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
  },
  subject: {
    color: color['--ult-color-text'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  meta: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-2'],
  },
  detailMeta: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  body: {
    margin: 0,
  },
});

/**
 * A selectable list driving a detail pane. The parent owns the rows and the selected ID; the list is a
 * single-select vertical ToggleGroup, so arrow keys move between rows and `aria-pressed` marks the selection.
 */
export default function ListDetail() {
  const id = useId();
  const [requests, setRequests] = useState(sampleRequests);
  const [selectedId, setSelectedId] = useState(sampleRequests[0]!.id);
  const selected = requests.find((request) => request.id === selectedId)!;

  function resolve(requestId: string) {
    setRequests((current) => current.map((request) => (request.id === requestId ? { ...request, status: 'resolved' } : request)));
  }

  return (
    <div {...stylex.props(styles.root)}>
      <ToggleGroup.Root
        aria-label="Requests"
        orientation="vertical"
        style={styles.list}
        value={[selectedId]}
        onValueChange={(next, details) => {
          // Pressing the selected row would empty the group; keep one row selected.
          if (next[0] === undefined) return details.cancel();
          setSelectedId(next[0]);
        }}
      >
        {requests.map((request) => (
          <ToggleGroup.Item
            key={request.id}
            value={request.id}
            aria-labelledby={`${id}-${request.id}-subject`}
            aria-describedby={`${id}-${request.id}-meta ${id}-${request.id}-status`}
            style={styles.row}
          >
            <span {...stylex.props(styles.rowText)}>
              <span id={`${id}-${request.id}-subject`} {...stylex.props(styles.subject)}>
                {request.subject}
              </span>
              <span {...stylex.props(styles.line)}>
                <span id={`${id}-${request.id}-meta`} {...stylex.props(styles.meta)}>
                  {request.requester}, {request.received}
                </span>
                <Badge id={`${id}-${request.id}-status`} tone={STATUS[request.status].tone}>
                  {STATUS[request.status].label}
                </Badge>
              </span>
            </span>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <Card.Root render={<section aria-labelledby={`${id}-detail`} />}>
        <Card.Header>
          <Card.Title id={`${id}-detail`}>{selected.subject}</Card.Title>
          <Card.Description>
            <span {...stylex.props(styles.detailMeta)}>
              {selected.requester}, received {selected.received}
              <Badge tone={STATUS[selected.status].tone}>{STATUS[selected.status].label}</Badge>
            </span>
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <p {...stylex.props(styles.body)}>{selected.body}</p>
        </Card.Body>
        <Card.Footer>
          <Button disabled={selected.status === 'resolved'} onClick={() => resolve(selected.id)}>
            Mark resolved
          </Button>
        </Card.Footer>
      </Card.Root>
    </div>
  );
}
