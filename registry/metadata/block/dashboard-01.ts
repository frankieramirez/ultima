import type { BlockDescriptor } from '../schema.ts';

export default {
  id: 'dashboard-01',
  kind: 'block',
  title: 'Dashboard 01',
  description: 'A store overview: workspace navigation, four key metrics, a revenue chart with its data table, top products and recent orders.',
  contract: 'docs/spec/ultima.md#dashboard-01',
  installDocs:
    "Render it from a route of your own: import { Dashboard01 } from '@/components/dashboard-01/dashboard-01'. The revenue chart draws through the Chart item, so it installs @tanstack/charts. Replace the sample data in each region file with your own; Export, the workspace menu items and the navigation links have no handler of their own.",
  primaryExport: 'Dashboard01',
  recipes: [],
} satisfies BlockDescriptor;
