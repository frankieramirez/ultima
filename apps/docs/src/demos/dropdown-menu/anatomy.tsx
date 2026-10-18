import { ArchiveIcon, LinkIcon, PencilIcon } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { Button, DropdownMenu, Icon } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '26rem',
    inlineSize: 'min(28rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
  },
});

const ignoreViewportCollisions = { side: 'none', fallbackAxisSide: 'none' } as const;

export default function DropdownMenuAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <DropdownMenu.Root open modal={false}>
        <DropdownMenu.Trigger render={<Button />}>Actions</DropdownMenu.Trigger>
        <DropdownMenu.Portal container={stage}>
          <DropdownMenu.Positioner collisionAvoidance={ignoreViewportCollisions} sideOffset={8} align="start">
            <DropdownMenu.Popup finalFocus={false}>
              <DropdownMenu.Arrow />
              <DropdownMenu.Viewport>
                <DropdownMenu.Group>
                  <DropdownMenu.GroupLabel>Document</DropdownMenu.GroupLabel>
                  <DropdownMenu.Item>
                    <Icon><PencilIcon /></Icon>
                    Rename
                  </DropdownMenu.Item>
                  <DropdownMenu.LinkItem href="https://base-ui.com/react/components/menu">
                    <Icon><LinkIcon /></Icon>
                    Base UI docs
                  </DropdownMenu.LinkItem>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.CheckboxItem defaultChecked>
                  Show archived
                  <DropdownMenu.CheckboxItemIndicator />
                </DropdownMenu.CheckboxItem>
                <DropdownMenu.RadioGroup defaultValue="comfortable">
                  <DropdownMenu.RadioItem value="comfortable">
                    Comfortable
                    <DropdownMenu.RadioItemIndicator />
                  </DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="compact">
                    Compact
                    <DropdownMenu.RadioItemIndicator />
                  </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
                <DropdownMenu.Separator />
                <DropdownMenu.SubmenuRoot>
                  <DropdownMenu.SubmenuTrigger>
                    <Icon><ArchiveIcon /></Icon>
                    Move to
                  </DropdownMenu.SubmenuTrigger>
                </DropdownMenu.SubmenuRoot>
              </DropdownMenu.Viewport>
            </DropdownMenu.Popup>
          </DropdownMenu.Positioner>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
