import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Avatar } from '@ultima/ui/avatar';
import { Badge, type BadgeTone } from '@ultima/ui/badge';
import { Button } from '@ultima/ui/button';
import { Empty } from '@ultima/ui/empty';
import { InputGroup } from '@ultima/ui/input-group';
import { Sidebar, useSidebar } from '@ultima/ui/sidebar';
import { ToggleGroup } from '@ultima/ui/toggle-group';
import { type Ref, useId } from 'react';

import type { Contact, Filter, Status } from './crm-01';
import { MenuGlyph, PlusGlyph, SearchGlyph } from './icons';

const DESKTOP = '@media (min-width: 48rem)';

const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  customer: { label: 'Customer', tone: 'success' },
  lead: { label: 'Lead', tone: 'neutral' },
  'at-risk': { label: 'At risk', tone: 'warning' },
  churned: { label: 'Churned', tone: 'danger' },
};

const CHIPS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'leads', label: 'Leads' },
  { value: 'customers', label: 'Customers' },
  { value: 'churned', label: 'Churned' },
];

const styles = stylex.create({
  pane: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: space['--ult-space-6'],
    inlineSize: { default: '100%', [DESKTOP]: `calc(5.5 * ${space['--ult-space-12']})` },
    paddingBlock: space['--ult-space-6'],
    paddingInline: space['--ult-space-4'],
  },
  head: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    paddingInline: space['--ult-space-2'],
  },
  titleRow: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  title: {
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  count: {
    color: color['--ult-color-text-subtle'],
    flexGrow: 1,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
  },
  iconButton: {
    inlineSize: space['--ult-space-9'],
    paddingInline: 0,
  },
  chips: {
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
  },
  rows: {
    alignItems: 'stretch',
    backgroundColor: 'transparent',
    display: 'flex',
    padding: 0,
  },
  row: {
    fontWeight: font['--ult-font-weight-regular'],
    gap: space['--ult-space-5'],
    justifyContent: 'flex-start',
    lineHeight: font['--ult-font-leading-snug'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'start',
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
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
  name: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  subtle: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
  },
  company: {
    color: color['--ult-color-text-muted'],
  },
  empty: {
    margin: 0,
  },
});

export function StatusBadge({ status, id }: { status: Status; id?: string }) {
  return (
    <Badge id={id} tone={STATUS[status].tone}>
      {STATUS[status].label}
    </Badge>
  );
}

type ContactListProps = {
  ref: Ref<HTMLElement>;
  rows: Contact[];
  selectedId: string;
  onSelect: (id: string) => void;
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  search: string;
  onSearchChange: (search: string) => void;
};

export function ContactList({ ref, rows, selectedId, onSelect, filter, onFilterChange, search, onSearchChange }: ContactListProps) {
  const { isMobile } = useSidebar();
  const id = useId();

  return (
    <section ref={ref} aria-labelledby={`${id}-heading`} {...stylex.props(styles.pane)}>
      <div {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.titleRow)}>
          {isMobile && (
            <Sidebar.Trigger render={<Button variant="ghost" size="sm" aria-label="Open navigation" style={styles.iconButton} />}>
              <MenuGlyph />
            </Sidebar.Trigger>
          )}
          <h1 id={`${id}-heading`} tabIndex={-1} {...stylex.props(styles.title)}>
            Contacts
          </h1>
          <span {...stylex.props(styles.count)}>{rows.length}</span>
          <Button size="sm" aria-label="Add contact" style={styles.iconButton}>
            <PlusGlyph />
          </Button>
        </div>
        <InputGroup.Root>
          <InputGroup.Addon>
            <SearchGlyph />
          </InputGroup.Addon>
          <InputGroup.Input type="search" aria-label="Search contacts" placeholder="Search contacts…" value={search} onValueChange={onSearchChange} />
        </InputGroup.Root>
        <ToggleGroup.Root
          aria-label="Filter contacts"
          style={styles.chips}
          value={[filter]}
          onValueChange={(next, details) => {
            if (next[0] === undefined) return details.cancel();
            onFilterChange(next[0]);
          }}
        >
          {CHIPS.map((chip) => (
            <ToggleGroup.Item key={chip.value} value={chip.value}>
              {chip.label}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>
      {rows.length === 0 ? (
        <Empty.Root>
          <Empty.Title render={<p />} style={styles.empty}>
            No contacts match
          </Empty.Title>
        </Empty.Root>
      ) : (
        <ToggleGroup.Root
          aria-label="Contacts"
          orientation="vertical"
          style={styles.rows}
          value={[selectedId]}
          onValueChange={(next, details) => {
            if (next[0] === undefined) details.cancel();
            onSelect(next[0] ?? selectedId);
          }}
        >
          {rows.map((contact) => (
            <ToggleGroup.Item
              key={contact.id}
              value={contact.id}
              aria-labelledby={`${id}-${contact.id}-name`}
              aria-describedby={`${id}-${contact.id}-company ${id}-${contact.id}-status`}
              style={styles.row}
            >
              <Avatar.Root aria-hidden="true">
                <Avatar.Fallback>{contact.initials}</Avatar.Fallback>
              </Avatar.Root>
              <span {...stylex.props(styles.text)}>
                <span {...stylex.props(styles.line)}>
                  <span id={`${id}-${contact.id}-name`} {...stylex.props(styles.name)}>
                    {contact.name}
                  </span>
                  <span {...stylex.props(styles.subtle)}>{contact.lastTouch}</span>
                </span>
                <span {...stylex.props(styles.line)}>
                  <span id={`${id}-${contact.id}-company`} {...stylex.props(styles.company)}>
                    {contact.company}
                  </span>
                  <StatusBadge id={`${id}-${contact.id}-status`} status={contact.status} />
                </span>
              </span>
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      )}
    </section>
  );
}
