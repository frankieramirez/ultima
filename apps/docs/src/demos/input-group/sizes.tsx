import { SearchIcon } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Icon, InputGroup } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
  },
});

export default function Sizes() {
  return (
    <div {...stylex.props(styles.stack)}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <InputGroup.Root key={size} size={size}>
          <InputGroup.Addon>
            <Icon><SearchIcon /></Icon>
          </InputGroup.Addon>
          <InputGroup.Input aria-label={`${size} search`} placeholder={size} />
        </InputGroup.Root>
      ))}
    </div>
  );
}
