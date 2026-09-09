import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';

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
  link: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    display: 'block',
    padding: space['--ult-space-6'],
    textDecoration: 'none',
  },
  name: {
    color: color['--ult-color-text'],
    display: 'block',
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-snug'],
  },
  description: {
    color: color['--ult-color-text-muted'],
    display: 'block',
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlockStart: space['--ult-space-2'],
  },
});

export function ComponentsPage() {
  return (
    <Page title="Components" lede="The fourteen components in Ultima's v0 foundation set.">
      <ul {...stylex.props(styles.list)}>
        {components.map((component) => (
          <li key={component.item}>
            <Link
              to="/components/$name"
              params={{ name: component.item }}
              {...stylex.props(styles.link)}
            >
              <span {...stylex.props(styles.name)}>{component.name}</span>
              <span {...stylex.props(styles.description)}>{component.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
