import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, motion, space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';

import { components } from '../components';
import { Page } from '../page';

const styles = stylex.create({
  list: {
    display: 'grid',
    gap: space['--ult-space-4'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
    listStyle: 'none',
    margin: 0,
    padding: 0,
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
    <Page title="Components" lede="The fourteen components in Ultima's v0 foundation set.">
      <ul {...stylex.props(styles.list)}>
        {components.map((component) => (
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
    </Page>
  );
}
