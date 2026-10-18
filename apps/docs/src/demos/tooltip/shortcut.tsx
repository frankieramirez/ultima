import { SaveIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Tooltip } from '@ultima/ui';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

export default function TooltipShortcut() {
  const trigger = useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = useState(false);

  // The keys the tooltip names are bound, so aria-keyshortcuts states a fact.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 's' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        trigger.current?.click();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Tooltip.Provider delay={0}>
      <Tooltip.Root>
        <Tooltip.Trigger
          ref={trigger}
          aria-label={saved ? 'Saved' : 'Save'}
          aria-keyshortcuts={isMac ? 'Meta+S' : 'Control+S'}
          onClick={() => setSaved(true)}
          render={<Button variant="outline" />}
        >
          <Icon><SaveIcon /></Icon>
          {saved ? 'Saved' : 'Save'}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>
              <Tooltip.Arrow />
              <Tooltip.Viewport>
                Save
                <Tooltip.Shortcut>{isMac ? '⌘S' : 'Ctrl S'}</Tooltip.Shortcut>
              </Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
