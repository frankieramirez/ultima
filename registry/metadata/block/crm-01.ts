import type { BlockDescriptor } from '../schema.ts';

export default {
  id: 'crm-01',
  kind: 'block',
  title: 'CRM 01',
  description: "A contact manager: workspace navigation, a searchable and filterable contact list, and the selected contact's record with its activity, notes and details.",
  contract: 'docs/spec/ultima.md#crm-01',
  installDocs:
    "Render it from a route of your own: import { Crm01 } from '@/components/crm-01/crm-01'. Search, the filter, the selection, the note composer and Log activity are wired; Add contact and the navigation links have no handler of their own, and Email and Call are mailto: and tel: links.",
  primaryExport: 'Crm01',
  recipes: [],
} satisfies BlockDescriptor;
