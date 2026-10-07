'use client';

import * as stylex from '@stylexjs/stylex';
import { color, font } from '@ultima/tokens/tokens.stylex';
import { Separator } from '@ultima/ui/separator';
import { Sidebar, useSidebar } from '@ultima/ui/sidebar';
import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { AppSidebar } from './app-sidebar';
import { ContactActivity } from './contact-activity';
import { ContactDetails } from './contact-details';
import { ContactHeader } from './contact-header';
import { ContactList } from './contact-list';

export type Status = 'customer' | 'lead' | 'at-risk' | 'churned';
export type Filter = 'all' | 'leads' | 'customers' | 'churned';
export type Entry = { id: string; kind: 'email' | 'call' | 'deal' | 'meeting' | 'note'; title: string; body: string; meta: string };
export type Deal = { name: string; value: string; stage: string };

export type Contact = {
  id: string;
  name: string;
  initials: string;
  title: string;
  company: string;
  status: Status;
  lastTouch: string;
  email: string;
  phone: string;
  owner: { name: string; initials: string };
  deal?: Deal;
  tags: string[];
  /** Newest first. */
  activity: Entry[];
};

const OWNER = { name: 'Ada Kim', initials: 'AK' };

const CONTACTS: Contact[] = [
  {
    id: 'mara-lindqvist',
    name: 'Mara Lindqvist',
    initials: 'ML',
    title: 'Head of Operations',
    company: 'Fjord Logistics',
    status: 'customer',
    lastTouch: '2m',
    email: 'mara@fjord.io',
    phone: '+47 912 44 018',
    owner: OWNER,
    deal: { name: 'Fjord renewal', value: '$48,000', stage: 'Negotiation' },
    tags: ['enterprise', 'logistics', 'SSO'],
    activity: [
      { id: 'mara-1', kind: 'email', title: 'Email sent', body: 'Renewal proposal for 2027, 3 attachments', meta: '2 min ago · Ada Kim' },
      { id: 'mara-2', kind: 'call', title: 'Call logged · 18 min', body: 'Walked through the warehouse rollout. Wants SSO before signing.', meta: 'Yesterday · Ada Kim' },
      { id: 'mara-3', kind: 'deal', title: 'Deal moved to Negotiation', body: 'Fjord renewal · $48,000', meta: 'Oct 4 · System' },
      { id: 'mara-4', kind: 'meeting', title: 'Meeting booked', body: 'Quarterly review with ops and finance', meta: 'Oct 2 · Theo Okafor' },
    ],
  },
  {
    id: 'theo-okafor',
    name: 'Theo Okafor',
    initials: 'TO',
    title: 'Product Lead',
    company: 'Brightline',
    status: 'lead',
    lastTouch: '1h',
    email: 'theo@brightline.co',
    phone: '+44 20 7946 0321',
    owner: OWNER,
    deal: { name: 'Brightline pilot', value: '$12,000', stage: 'Qualification' },
    tags: ['inbound'],
    activity: [{ id: 'theo-1', kind: 'email', title: 'Email received', body: 'Asked for a pilot for the product team', meta: '1 hr ago · Ada Kim' }],
  },
  {
    id: 'priya-raman',
    name: 'Priya Raman',
    initials: 'PR',
    title: 'COO',
    company: 'Kestrel Health',
    status: 'customer',
    lastTouch: '3h',
    email: 'priya@kestrel.health',
    phone: '+1 415 555 0142',
    owner: OWNER,
    deal: { name: 'Kestrel expansion', value: '$36,000', stage: 'Proposal' },
    tags: ['healthcare'],
    activity: [{ id: 'priya-1', kind: 'meeting', title: 'Meeting booked', body: 'Expansion review with the clinical ops team', meta: '3 hr ago · Ada Kim' }],
  },
  {
    id: 'jonas-weber',
    name: 'Jonas Weber',
    initials: 'JW',
    title: 'Finance Director',
    company: 'Wexford & Co',
    status: 'at-risk',
    lastTouch: 'Yesterday',
    email: 'jonas@wexford.co',
    phone: '+49 30 9018 2044',
    owner: OWNER,
    deal: { name: 'Wexford renewal', value: '$22,000', stage: 'Renewal' },
    tags: ['finance'],
    activity: [{ id: 'jonas-1', kind: 'call', title: 'Call logged · 9 min', body: 'Usage is down since spring. Asked for a pricing review.', meta: 'Yesterday · Ada Kim' }],
  },
  {
    id: 'sofia-alvarez',
    name: 'Sofia Alvarez',
    initials: 'SA',
    title: 'Founder',
    company: 'Lumen Studio',
    status: 'lead',
    lastTouch: 'Oct 4',
    email: 'sofia@lumen.studio',
    phone: '+34 612 345 678',
    owner: OWNER,
    deal: { name: 'Lumen starter', value: '$6,000', stage: 'Discovery' },
    tags: ['design'],
    activity: [{ id: 'sofia-1', kind: 'note', title: 'Note', body: 'Met at the design meetup. Wants a plan for a team of eight.', meta: 'Oct 4 · Ada Kim' }],
  },
  {
    id: 'kenji-nakamura',
    name: 'Kenji Nakamura',
    initials: 'KN',
    title: 'Head of IT',
    company: 'Orbital',
    status: 'churned',
    lastTouch: 'Oct 2',
    email: 'kenji@orbital.dev',
    phone: '+81 3 1234 5678',
    owner: OWNER,
    tags: ['aerospace'],
    activity: [{ id: 'kenji-1', kind: 'email', title: 'Email sent', body: 'Exit survey and data export link', meta: 'Oct 2 · Ada Kim' }],
  },
  {
    id: 'elena-brooks',
    name: 'Elena Brooks',
    initials: 'EB',
    title: 'VP Operations',
    company: 'Northwind',
    status: 'customer',
    lastTouch: 'Sep 30',
    email: 'elena@northwind.co',
    phone: '+1 206 555 0187',
    owner: OWNER,
    deal: { name: 'Northwind seats', value: '$18,000', stage: 'Closed won' },
    tags: ['retail'],
    activity: [{ id: 'elena-1', kind: 'deal', title: 'Deal moved to Closed won', body: 'Northwind seats · $18,000', meta: 'Sep 30 · System' }],
  },
];

const FILTERS: Record<Filter, readonly Status[]> = {
  all: ['customer', 'lead', 'at-risk', 'churned'],
  leads: ['lead'],
  customers: ['customer', 'at-risk'],
  churned: ['churned'],
};

const styles = stylex.create({
  root: {
    color: color['--ult-color-text'],
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    minBlockSize: '100dvh',
  },
  main: {
    display: 'flex',
    flexGrow: 1,
    minInlineSize: 0,
  },
  record: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});

export function Crm01() {
  return (
    <Sidebar.Root style={styles.root}>
      <AppSidebar />
      <Workspace />
    </Sidebar.Root>
  );
}

function Workspace() {
  const { isMobile } = useSidebar();
  const [contacts, setContacts] = useState(CONTACTS);
  const [selectedId, setSelectedId] = useState(CONTACTS[0]!.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('activity');
  const [view, setView] = useState<'list' | 'record'>('list');
  const listRef = useRef<HTMLElement>(null);
  const recordHeadingRef = useRef<HTMLHeadingElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  const query = search.trim().toLowerCase();
  const rows = contacts.filter(
    (contact) =>
      FILTERS[filter].includes(contact.status) &&
      (contact.name.toLowerCase().includes(query) || contact.company.toLowerCase().includes(query)),
  );
  const selected = contacts.find((contact) => contact.id === selectedId)!;

  const select = (id: string) => {
    if (!isMobile) return setSelectedId(id);
    flushSync(() => {
      setSelectedId(id);
      setView('record');
    });
    recordHeadingRef.current?.focus();
  };

  const back = () => {
    flushSync(() => setView('list'));
    const row = listRef.current?.querySelector<HTMLElement>('[aria-label="Contacts"] [aria-pressed="true"]');
    (row ?? listRef.current?.querySelector<HTMLElement>('h1'))?.focus();
  };

  const logActivity = () => {
    flushSync(() => setTab('activity'));
    composerRef.current?.focus();
  };

  const addNote = (body: string) => {
    const note: Entry = { id: `${selected.id}-note-${selected.activity.length + 1}`, kind: 'note', title: 'Note', body, meta: 'Just now · Ada Kim' };
    setContacts((all) => all.map((contact) => (contact.id === selected.id ? { ...contact, activity: [note, ...contact.activity] } : contact)));
  };

  return (
    <main {...stylex.props(styles.main)}>
      {(!isMobile || view === 'list') && (
        <ContactList
          ref={listRef}
          rows={rows}
          selectedId={selectedId}
          onSelect={select}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
        />
      )}
      {!isMobile && <Separator orientation="vertical" />}
      {(!isMobile || view === 'record') && (
        <section aria-labelledby={headingId} {...stylex.props(styles.record)}>
          <ContactHeader contact={selected} headingId={headingId} headingRef={recordHeadingRef} onBack={isMobile ? back : undefined} onLogActivity={logActivity} />
          <ContactActivity
            key={selected.id}
            contact={selected}
            tab={tab}
            onTabChange={setTab}
            composerRef={composerRef}
            onAddNote={addNote}
            details={<ContactDetails contact={selected} />}
          />
        </section>
      )}
    </main>
  );
}
