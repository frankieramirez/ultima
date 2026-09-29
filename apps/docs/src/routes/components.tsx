import { ArrowUpRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Empty, Field, InputGroup, Separator } from '@ultima/ui';
import { useRef, useState } from 'react';

import { breakpoints } from '../breakpoints.stylex';
import { CataloguePreview } from '../catalogue-preview';
import { components } from '../components';
import { docsStyles } from '../docs-style';
import { DocumentLayout } from '../document-layout';
import { TextLink } from '../text-link';
import { headings } from '../typography';

const summaries: Record<string, string> = {
  accordion: 'Reveal supporting content, one section at a time.',
  alert: 'Bring an in-page message to someone’s attention.',
  'alert-dialog': 'Ask for confirmation before an action continues.',
  'aspect-ratio': 'Keep media at a consistent width-to-height ratio.',
  avatar: 'Represent a person with an image or fallback.',
  badge: 'Give a status or category a compact label.',
  breadcrumb: 'Show where a page sits in the navigation.',
  button: 'Trigger an action with solid, outline, or ghost styling.',
};

const styles = stylex.create({
  introduction: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    marginBlockEnd: space['--ult-space-9'],
  },
  lede: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-6'],
    margin: 0,
    lineHeight: font['--ult-font-leading-normal'],
  },
  search: {
    borderRadius: 0,
    borderWidth: 0,
    paddingBlock: space['--ult-space-5'],
    blockSize: 'auto',
    backgroundColor: 'transparent',
  },
  input: { fontSize: text['--ult-text-6'], paddingInline: 0 },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
    marginBlock: space['--ult-space-8'],
  },
  count: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  row: {
    display: 'grid',
    alignItems: 'center',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      [breakpoints.WIDE]: '15rem minmax(0, 1fr)',
    },
    gap: space['--ult-space-9'],
    paddingBlock: space['--ult-space-8'],
  },
  link: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space['--ult-space-5'],
    textDecoration: 'none',
    minInlineSize: 0,
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    flexGrow: 1,
    minInlineSize: 0,
  },
  title: {
    color: color['--ult-color-text'],
    fontFamily: 'Space Grotesk, Figtree, sans-serif',
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
  },
  arrow: { flexShrink: 0 },
  resource: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    marginBlockStart: space['--ult-space-8'],
    fontSize: text['--ult-text-4'],
  },
});

export function ComponentsPage() {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();
  const matches = components.filter((entry) =>
    `${entry.name} ${entry.description} ${summaries[entry.item] ?? ''}`
      .toLowerCase()
      .includes(term),
  );
  matches.sort((a, b) => a.name.localeCompare(b.name));
  const filtered = query !== '';
  const clear = () => {
    setQuery('');
    input.current?.focus();
  };
  const resources = (
    <>
      <h2 {...stylex.props(headings.h3)}>Start building</h2>
      {[
        {
          title: 'Installation',
          to: '/install',
          description: 'Add your first component.',
        },
        {
          title: 'Theme Studio',
          to: '/theme-studio',
          description: 'Make the components your own.',
        },
        {
          title: 'Tokens',
          to: '/tokens',
          description: 'Explore the values behind the UI.',
        },
      ].map((resource) => (
        <div key={resource.to} {...stylex.props(styles.resource)}>
          <TextLink variant="muted" render={<Link to={resource.to} />}>
            {resource.title}
            <ArrowUpRightIcon aria-hidden />
          </TextLink>
          <span {...stylex.props(styles.description)}>
            {resource.description}
          </span>
        </div>
      ))}
    </>
  );
  return (
    <DocumentLayout breadcrumb={[]} rail={resources}>
      <div {...stylex.props(styles.introduction)}>
        <h1 {...stylex.props(headings.h1)}>Components</h1>
        <p {...stylex.props(styles.lede)}>
          Find a part. See how it works. Make it yours.
        </p>
      </div>
      <Field.Root name="filter">
        <InputGroup.Root style={styles.search}>
          <InputGroup.Addon>
            <MagnifyingGlassIcon aria-hidden />
          </InputGroup.Addon>
          <InputGroup.Input
            aria-label="Filter components"
            type="search"
            ref={input}
            value={query}
            placeholder="Search components by name or description"
            style={styles.input}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
            }}
          />
        </InputGroup.Root>
      </Field.Root>
      <Separator />
      <div {...stylex.props(styles.toolbar)}>
        <p role="status" {...stylex.props(styles.count)}>
          {matches.length} {matches.length === 1 ? 'component' : 'components'} ·
          A–Z
        </p>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            style={docsStyles.square}
          >
            Clear filters
          </Button>
        )}
      </div>
      {matches.length === 0 && (
        <Empty.Root>
          <Empty.Title render={<h2 />}>
            No components match these filters
          </Empty.Title>
          <Empty.Description>
            Try a different search, or clear the filters to browse the
            catalogue.
          </Empty.Description>
          <Button onClick={clear} style={docsStyles.square}>
            Clear filters
          </Button>
        </Empty.Root>
      )}
      <ul {...stylex.props(styles.list)}>
        {matches.map((entry) => (
          <li key={entry.item}>
            <Separator />
            <div {...stylex.props(styles.row)}>
              <CataloguePreview item={entry.item} />
              <TextLink
                variant="muted"
                render={
                  <Link to="/components/$name" params={{ name: entry.item }} />
                }
                style={styles.link}
              >
                <div {...stylex.props(styles.copy)}>
                  <span {...stylex.props(styles.title)}>{entry.name}</span>
                  <span {...stylex.props(styles.description)}>
                    {summaries[entry.item] ?? entry.description}
                  </span>
                </div>
                <ArrowUpRightIcon aria-hidden {...stylex.props(styles.arrow)} />
              </TextLink>
            </div>
          </li>
        ))}
      </ul>
    </DocumentLayout>
  );
}
