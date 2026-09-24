/**
 * Registers a production scenario callback under `apps/docs/tests/production/`, per Executable
 * bindings and discovery in docs/spec/agent-infrastructure.md:
 *
 *   export default productionScenario('dialog.keyboard-dismissal', 'production', async ({ page, open, axe }) => { … });
 *
 * The production runner (`apps/docs/scripts/production-runner.ts`) owns the browser, the served build,
 * the fresh context per case, and the mode, viewport and motion each variant names; it loads only the
 * selected files after planning and calls `run` once per case. Registration alone executes nothing.
 */
import type { Page } from 'playwright';

export type ProductionVariant = {
  mode: 'dark' | 'light';
  viewport: 'desktop' | 'narrow';
  motion: 'normal' | 'reduced';
};

export type ProductionContext = {
  /** A fresh page in a fresh context, already sized and color-schemed for `variant`. */
  page: Page;
  variant: ProductionVariant;
  /** Navigates to a pathname on the run's own served build and waits for the app to be ready. */
  open(pathname: string): Promise<void>;
  /** Reloads the current page, keeping the context's storage, and waits for the same readiness as `open`. */
  reload(): Promise<void>;
  /**
   * Runs the installed axe with the WCAG A/AA rules and colour contrast on the whole document, and fails
   * the case on any violation. Call it at the scenario's principal ready state, and again for an open
   * overlay; a case that never calls it cannot pass.
   */
  axe(state: string): Promise<void>;
};

export type ProductionScenario = {
  id: string;
  target: 'production';
  run(context: ProductionContext): Promise<void>;
};

export function productionScenario(
  id: string,
  target: 'production',
  run: (context: ProductionContext) => Promise<void>,
): ProductionScenario {
  return { id, target, run };
}
