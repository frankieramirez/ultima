// Typed architecture exceptions: docs/spec/agent-infrastructure.md, Exceptions. Only the workspace scope
// reads this file. Each entry names one exact site, its expected count and the owning decision that
// authorizes it; a reusable allowance belongs in the tested policy instead. The repository needs none.
import type { ArchitectureException } from './src/exceptions.ts';

export default [] satisfies ArchitectureException[];
