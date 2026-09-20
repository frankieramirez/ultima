import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, motion, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Card, Input, Select } from '@ultima/ui';
import { useId, useRef, useState } from 'react';

import { RELEASE_LABELS, RELEASES, components } from '../components';
import { Page, Section } from '../page';

const styles = stylex.create({
  filters: {
    display: 'flex',
    alignItems: 'end',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
    marginBlockStart: space['--ult-space-7'],
  },
  field: {
    display: 'grid',
    gap: space['--ult-space-3'],
    flexGrow: 1,
    minInlineSize: 0,
  },
  input: { inlineSize: '100%' },
  list: {
    display: 'grid',
    gap: space['--ult-space-4'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  empty: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    marginBlock: space['--ult-space-4'],
  },
  // Card ships no interaction states and the spec asks these entries to gain both, so the ring and
  // the hover are written here. The anchor's element, role, and keyboard reach are still the browser's.
  link: {
    blockSize: '100%',
    color: { default: color['--ult-color-text'], ':hover': color['--ult-color-highlight-text'] },
    display: 'block',
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

export function ComponentsPage() {
  const [query, setQuery] = useState('');
  const [release, setRelease] = useState('all');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const releases = [{ label: 'All releases', value: 'all' }, ...RELEASES.map((value) => ({ label: value, value }))];
  const term = query.trim().toLowerCase();
  const matches = components.filter((component) =>
    (release === 'all' || component.release === release) &&
    `${component.name} ${component.description}`.toLowerCase().includes(term),
  );

  return (
    <Page title="Components" lede="The catalogue, sectioned by release, oldest set first." breadcrumb="COMPONENTS">
      <div {...stylex.props(styles.filters)}>
        <div {...stylex.props(styles.field)}>
          <label htmlFor={inputId}>Filter components</label>
          <Input
            id={inputId}
            onChange={(event) => setQuery(event.currentTarget.value)}
            ref={inputRef}
            style={styles.input}
            value={query}
          />
        </div>
        <Select.Root
          items={releases}
          onValueChange={(value) => {
            if (value !== null) setRelease(value);
          }}
          value={release}
        >
          <div {...stylex.props(styles.field)}>
            <Select.Label>Release</Select.Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
          </div>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {releases.map((item) => (
                    <Select.Item key={item.value} value={item.value}>
                      <Select.ItemIndicator />
                      <Select.ItemText>{item.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        <Button
          disabled={query === '' && release === 'all'}
          onClick={() => {
            setQuery('');
            setRelease('all');
            inputRef.current?.focus();
          }}
          variant="outline"
        >
          Clear filters
        </Button>
      </div>
      <p role="status" {...stylex.props(styles.empty)}>
        {matches.length} {matches.length === 1 ? 'component' : 'components'}
      </p>
      {matches.length === 0 ? <p {...stylex.props(styles.empty)}>No components match these filters.</p> : null}
      {RELEASES.map((release) => {
        const entries = matches.filter((component) => component.release === release);
        if (entries.length === 0) return null;
        return (
          <Section key={release} title={RELEASE_LABELS[release]}>
            <ul {...stylex.props(styles.list)}>
              {entries.map((component) => (
                <li key={component.item}>
                  <Card.Root
                    render={<Link to="/components/$name" params={{ name: component.item }} />}
                    style={styles.link}
                  >
                    <Card.Header>
                      <Card.Title render={<span />}>{component.name}</Card.Title>
                      <Card.Description>{component.description}</Card.Description>
                    </Card.Header>
                  </Card.Root>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </Page>
  );
}
