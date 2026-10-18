import { SearchIcon } from 'lucide-react';
import { Button, Icon, Tooltip } from '@ultima/ui';

export default function TooltipShortcut() {
  return (
    <Tooltip.Provider delay={0}>
      <Tooltip.Root>
        <Tooltip.Trigger aria-label="Search" aria-keyshortcuts="Meta+K" render={<Button variant="outline" />}>
          <Icon><SearchIcon /></Icon>
          Search
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>
              <Tooltip.Arrow />
              <Tooltip.Viewport>
                Search
                <Tooltip.Shortcut>⌘K</Tooltip.Shortcut>
              </Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
