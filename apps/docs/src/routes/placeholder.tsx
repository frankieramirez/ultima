import { Page } from '../page';

export function Placeholder({ title, ticket }: { title: string; ticket: string }) {
  return (
    <Page
      breadcrumb={`COMPONENTS / ${title.toUpperCase()}`}
      index={false}
      lede={`This page is filled by ${ticket}.`}
      title={title}
    />
  );
}
