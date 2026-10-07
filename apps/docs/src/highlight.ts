import { createHighlighter } from '@tanstack/highlight/core';
import { css } from '@tanstack/highlight/languages/css';
import { js } from '@tanstack/highlight/languages/js';
import { jsx } from '@tanstack/highlight/languages/jsx';
import { plaintext } from '@tanstack/highlight/languages/plaintext';
import { shell } from '@tanstack/highlight/languages/shell';
import { ts } from '@tanstack/highlight/languages/ts';
import { tsx } from '@tanstack/highlight/languages/tsx';
import { yaml } from '@tanstack/highlight/languages/yaml';

export const highlighter = createHighlighter({
  languages: [css, js, jsx, plaintext, shell, ts, tsx, yaml],
});
