// ULT-DOCS-002 must reject each native control and widget role below in docs chrome.
import { createElement } from 'react';

import { TextLink } from './text-link';

export function Chrome({ role }: { role: string }) {
  return (
    <div>
      <button type="button">Save</button>
      <input aria-label="Name" />
      <select aria-label="Mode">
        <option>Dark</option>
      </select>
      <textarea aria-label="Notes" />
      <details>
        <summary>More</summary>
      </details>
      <div role="button">Toggle</div>
      <span role="switch tab" aria-checked="false" />
      <TextLink href="/" render={<button type="button" />}>Home</TextLink>
      {createElement('button', { type: 'button' }, 'Built')}
      <div role={role} />
    </div>
  );
}
