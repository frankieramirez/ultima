/**
 * Plain values the draft-history scenario shares between its docs Vitest binding and its production
 * binding. Data only: each binding drives the studio through its own supported controls.
 */
export const draftHistory = {
  densityGroup: 'Density',
  stockDensity: 'Cosy',
  editedDensity: 'Roomy',
  stockSpace1: '0.125rem',
  overrideToken: '--ult-color-accent',
  overrideValue: '#ff0000',
} as const;
