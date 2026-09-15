import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Empty } from '@ultima/ui';

export default function WithIcon() {
  return (
    <Empty.Root>
      <Empty.Icon>
        <MagnifyingGlassIcon />
      </Empty.Icon>
      <Empty.Title>No components match "drawer"</Empty.Title>
      <Empty.Description>Try a shorter search, or browse the whole catalogue.</Empty.Description>
    </Empty.Root>
  );
}
