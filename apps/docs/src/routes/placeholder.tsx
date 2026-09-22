import { Page } from '../page';

export function Placeholder({ title, ticket }: { title: string; ticket: string }) {
  return (
    <Page
      breadcrumb={[{ label: 'Components', to: '/components' }, { label: title }]}
      index={false}
      lede={`This page is filled by ${ticket}.`}
      title={title}
    />
  );
}
