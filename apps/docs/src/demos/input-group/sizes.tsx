import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { InputGroup } from '@ultima/ui';

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
            <MagnifyingGlassIcon />
          </InputGroup.Addon>
          <InputGroup.Input aria-label={`${size} search`} placeholder={size} />
        </InputGroup.Root>
      ))}
    </div>
  );
}
