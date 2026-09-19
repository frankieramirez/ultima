import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Accordion } from '@ultima/ui';

const styles = stylex.create({
  body: {
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-4'],
  },
});

export default function BasicAccordion() {
  return (
    <Accordion.Root defaultValue={['a']}>
      <Accordion.Item value="a">
        <Accordion.Header>
          <Accordion.Trigger>Recent changes</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <div {...stylex.props(styles.body)}>
            Meter moved its tone onto Root. Table gained a scroll region. Sidebar landed.
          </div>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Header>
          <Accordion.Trigger>Up next</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <div {...stylex.props(styles.body)}>
            Accordion, Avatar, and Scroll Area round out the v0.2 set.
          </div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}
