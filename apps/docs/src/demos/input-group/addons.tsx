import { SearchIcon } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Icon, InputGroup } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
});

export default function Addons() {
  return (
    <div {...stylex.props(styles.stack)}>
      <InputGroup.Root>
        <InputGroup.Addon>
          <Icon><SearchIcon /></Icon>
        </InputGroup.Addon>
        <InputGroup.Input aria-label="Search components" placeholder="Search components" />
        <InputGroup.Addon align="end">⌘K</InputGroup.Addon>
      </InputGroup.Root>
      <InputGroup.Root>
        <InputGroup.Addon>https://</InputGroup.Addon>
        <InputGroup.Input aria-label="Domain" placeholder="example" />
        <InputGroup.Addon align="end">
          <Button variant="ghost" size="sm">Check</Button>
        </InputGroup.Addon>
      </InputGroup.Root>
    </div>
  );
}
