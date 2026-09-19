import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Accordion } from '@ultima/ui';
import { useState } from 'react';

const styles = stylex.create({
  body: {
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-4'],
  },
});

export default function ControlledAccordion() {
  const [value, setValue] = useState<string[]>(['b']);

  return (
    <Accordion.Root value={value} onValueChange={(next) => setValue(next)} multiple>
      <Accordion.Item value="a">
        <Accordion.Header>
          <Accordion.Trigger>Release notes</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <div {...stylex.props(styles.body)}>Accordion landed as the first of the set.</div>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Header>
          <Accordion.Trigger>Known issues</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <div {...stylex.props(styles.body)}>None filed. The axe sweep covers this page.</div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}
