import { SearchIcon } from 'lucide-react';
import { Empty, Icon } from '@ultima/ui';

export default function WithIcon() {
  return (
    <Empty.Root>
      <Empty.Icon>
        <Icon><SearchIcon /></Icon>
      </Empty.Icon>
      <Empty.Title>No components match "drawer"</Empty.Title>
      <Empty.Description>Try a shorter search, or browse the whole catalogue.</Empty.Description>
    </Empty.Root>
  );
}
