import type { BlockDescriptor } from '../schema.ts';

export default {
  id: 'sign-in-01',
  kind: 'block',
  title: 'Sign-in 01',
  description: 'A split sign-in screen: a brand panel with a customer story beside an email and password form.',
  contract: 'docs/spec/ultima.md#sign-in-01',
  installDocs:
    "Render it from a route of your own: import { SignIn01 } from '@/components/sign-in-01/sign-in-01'. Replace the signIn stub in sign-in-form.tsx with your authentication call; the GitHub and SSO buttons and the links have no handler of their own.",
  primaryExport: 'SignIn01',
  recipes: [],
} satisfies BlockDescriptor;
