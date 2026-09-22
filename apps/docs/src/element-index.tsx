import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Code, Separator } from '@ultima/ui';

import { components } from './components';
import { elements } from './elements';

const styles = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    margin: 0,
    marginBlock: space['--ult-space-6'],
    padding: 0,
  },
  row: {
    alignItems: 'baseline',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    paddingBlock: space['--ult-space-5'],
  },
  link: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    minInlineSize: `calc(3 * ${space['--ult-space-12']})`,
    textDecoration: 'none',
    ':hover': { textDecoration: 'underline' },
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  parts: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-3'] },
});

export function ElementIndex() {
  return (
    <ul {...stylex.props(styles.list)}>
      {elements.map((element) => {
        const name = components.find((component) => component.item === element.item)?.name ?? element.item;
        const parts = element.tags.length - 1;
        return (
          <li key={element.item}>
            <div {...stylex.props(styles.row)}>
              <Link
                to="/components/$name"
                params={{ name: element.item }}
                hash="web-component"
                {...stylex.props(styles.link)}
              >
                {name}
              </Link>
              <Code>{`<${element.tag}>`}</Code>
              <span {...stylex.props(styles.parts)}>
                {parts === 0 ? 'One tag' : `${parts + 1} tags in the family`}
              </span>
            </div>
            <Separator />
          </li>
        );
      })}
    </ul>
  );
}
