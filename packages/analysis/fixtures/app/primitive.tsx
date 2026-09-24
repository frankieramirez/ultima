// A Base UI primitive an installed item wraps is advisory; one no item wraps passes.
import { Select } from '@base-ui/react/select';
import { Dialog as BaseDialog } from '@base-ui/react';
import type { Menu } from '@base-ui/react/menu';
import { useRender } from '@base-ui/react/use-render';

export type MenuRoot = typeof Menu.Root;

export function Picker() {
  const rendered = useRender({ render: <span /> });
  return (
    <Select.Root>
      <BaseDialog.Root>{rendered}</BaseDialog.Root>
    </Select.Root>
  );
}
