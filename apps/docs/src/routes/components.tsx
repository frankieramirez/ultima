import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, motion, space, text } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';

import { RELEASE_LABELS, RELEASES, componentsInRelease } from '../components';
import { Page, Section } from '../page';

const styles = stylex.create({
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
  return (
    <Page title="Components" lede="The catalogue, sectioned by release, oldest set first.">
      {RELEASES.map((release) => {
        const entries = componentsInRelease(release);
        return (
          <Section key={release} title={RELEASE_LABELS[release]}>
            {entries.length === 0 ? (
              <p {...stylex.props(styles.empty)}>No components in this set yet.</p>
            ) : (
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
            )}
          </Section>
        );
      })}
    </Page>
  );
}
