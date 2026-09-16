import { Breadcrumb } from '@ultima/ui';

export default function CustomSeparator() {
  return (
    <Breadcrumb.Root aria-label="Repository trail">
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">ultima</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator>/</Breadcrumb.Separator>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/packages">packages</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator>/</Breadcrumb.Separator>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/packages/ui" active>
            ui
          </Breadcrumb.Link>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}
