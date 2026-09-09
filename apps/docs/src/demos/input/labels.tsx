import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { Input } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-6'],
  },
  field: {
    display: 'grid',
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-3'],
  },
});

export default function Labels() {
  return (
    <div {...stylex.props(styles.stack)}>
      <label htmlFor="project-name" {...stylex.props(styles.field)}>
        Project name
      </label>
      <Input id="project-name" placeholder="Ultima" />
      <Input aria-label="Search components" placeholder="Search components" />
    </div>
  );
}
