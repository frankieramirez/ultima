/**
 * The one shadcn version Ultima prints and tests. `init` pins it for its own installs, and every
 * install command the docs, Theme Studio, the agent guide and the CLI print names it, so a project
 * set up by `init` keeps adding items with the version it was set up with.
 */
export const SHADCN_VERSION = '4.21.4';
export const SHADCN = `shadcn@${SHADCN_VERSION}`;
export const SHADCN_ADD = `npx ${SHADCN} add`;
