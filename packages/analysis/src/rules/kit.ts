// The consumer rules that point at the kit: docs/spec/ultima.md, Consumer CLI, Check.
// ULT-APP-PRIMITIVE-001: no import of `@base-ui/react/<x>` when an installed item wraps `<x>`.
// ULT-APP-CONTROL-001: no native control or explicit interactive-role substitute where an installed item
// provides that control. Both advise, and both read only the installed items' bundled metadata, never a
// list of their own. An installed item's own files are exempt: the consumer did not write them.
import ts from 'typescript';

import { importsOf } from '../../../../scripts/catalogue/source.ts';
import { CHECK_SPEC, componentPage } from '../rules.ts';
import type { InstalledItem } from '../scope.ts';
import type { Parsed } from '../sources.ts';
import { topLevelName, unwrap } from '../stylex.ts';
import type { Context } from './context.ts';
import { type Imported, attributeNamed, attributeValue, firstRole, importMap, intrinsic, renderOwner, tagText } from './docs.ts';

const BASE_UI = '@base-ui/react';

/** `AlertDialog` to `alert-dialog` and `OTPField` to `otp-field`: a barrel binding's subpath. */
function subpathOf(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/** The installed items named in a message, and where the repair imports each from. */
const names = (items: InstalledItem[]) => items.map(({ primaryExport }) => primaryExport).join(' or ');
const sources = (items: InstalledItem[]) => items.map(({ primaryExport, specifier }) => `\`${primaryExport}\` from '${specifier}'`).join(', or ');

export function checkKit(context: Context, parsed: Parsed, file: ts.SourceFile): void {
  const { scope } = context;
  const enabled = new Set(scope.rules ?? []);
  const installed = scope.kit?.installed() ?? [];
  if (installed.length === 0 || scope.itemOf(parsed.path) !== undefined) return;
  if (enabled.has('ULT-APP-PRIMITIVE-001')) primitiveImports(context, parsed, file, installed);
  if (enabled.has('ULT-APP-CONTROL-001')) nativeControls(context, parsed, file, installed);
}

// ---------------------------------------------------------------------------------------------
// ULT-APP-PRIMITIVE-001
// ---------------------------------------------------------------------------------------------

function primitiveImports(context: Context, parsed: Parsed, file: ts.SourceFile, installed: readonly InstalledItem[]): void {
  for (const entry of importsOf(file).imports) {
    if (entry.typeOnly) continue;
    // `@base-ui/react/select`, or `Select` named from the `@base-ui/react` barrel.
    const primitives =
      entry.specifier === BASE_UI
        ? entry.names.filter(({ typeOnly, imported }) => !typeOnly && /^[A-Z]/.test(imported)).map(({ imported }) => subpathOf(imported))
        : entry.specifier.startsWith(`${BASE_UI}/`)
          ? [entry.specifier.slice(BASE_UI.length + 1).split('/')[0] as string]
          : [];
    for (const primitive of new Set(primitives)) {
      const wrappers = installed.filter((item) => item.primitives.includes(primitive));
      const [first] = wrappers;
      if (!first) continue;
      context.report({
        ruleId: 'ULT-APP-PRIMITIVE-001',
        parsed,
        start: entry.start,
        end: entry.end,
        target: `${BASE_UI}/${primitive}`,
        message: `The file imports Base UI's ${primitive} primitive, which the installed ${names(wrappers)} wraps with Ultima's styles, tokens and accessibility contract.`,
        repair: `Import ${sources(wrappers)} instead, and compose its parts.`,
        link: componentPage(first.item),
      });
    }
  }
}

// ---------------------------------------------------------------------------------------------
// ULT-APP-CONTROL-001
// ---------------------------------------------------------------------------------------------

/** Whether a JSX tag, written `Name` or `Name.Part`, resolves to an installed Ultima item. */
function isInstalledComponent(context: Context, parsed: Parsed, tag: string, imports: Map<string, Imported>): boolean {
  const binding = imports.get(tag.split('.')[0] as string);
  if (!binding) return false;
  const resolved = context.scope.resolve(binding.specifier, parsed.path);
  return resolved.kind === 'file' && context.scope.itemOf(resolved.path) !== undefined;
}

function nativeControls(context: Context, parsed: Parsed, file: ts.SourceFile, installed: readonly InstalledItem[]): void {
  const imports = importMap(parsed);
  const typed = installed.some(({ elements }) => elements.some((element) => element.startsWith('input[')));
  const roled = installed.some(({ roles }) => roles.length > 0);

  const report = (node: ts.Node, at: ts.Node, what: string, providers: InstalledItem[]) => {
    const [first] = providers as [InstalledItem];
    const symbol = topLevelName(node);
    const owner = renderOwner(node, undefined);
    context.report({
      ruleId: 'ULT-APP-CONTROL-001',
      parsed,
      start: at.getStart(file),
      end: at.getEnd(),
      ...(symbol !== undefined && { symbol }),
      target: what,
      message: owner
        ? `${what} is handed to ${owner} through render, and ${owner} is not an installed Ultima component, so it stands in for the installed ${names(providers)}.`
        : `${what} stands in for a control the installed ${names(providers)} provides.`,
      repair: `Render ${sources(providers)}. To keep this element's semantics, pass it through the component's render prop.`,
      link: componentPage(first.item),
    });
  };

  const unresolved = (node: ts.Node, at: ts.Node, attribute: string, tag: string) => {
    const symbol = topLevelName(node);
    context.report({
      ruleId: 'ULT-ANALYSIS-001',
      severity: 'advisory',
      parsed,
      start: at.getStart(file),
      end: at.getEnd(),
      ...(symbol !== undefined && { symbol }),
      target: attribute,
      message: `The ${attribute} of a native <${tag}> is computed, so ULT-APP-CONTROL-001 cannot establish whether it stands in for an installed control.`,
      repair: `Write the ${attribute} as a literal, or render the installed Ultima component.`,
      link: CHECK_SPEC,
    });
  };

  /** One finding per element: the element itself, else the role it carries. */
  const element = (node: ts.Node, tagNode: ts.Node, tag: string, attributes: ts.JsxAttributes | undefined) => {
    const owner = renderOwner(node, undefined);
    if (owner && isInstalledComponent(context, parsed, owner, imports)) return;
    let key = tag;
    if (tag === 'input') {
      // `createElement('input', props)` sets its type in an object this rule does not read.
      if (!attributes) return;
      const type = attributeNamed(attributes, 'type');
      const value = type ? attributeValue(type) : 'text';
      if (value === undefined) {
        if (typed) unresolved(node, type as ts.Node, 'type', tag);
        key = '';
      } else key = `input[type=${(value ?? 'text').toLowerCase()}]`;
    }
    const byElement = key === '' ? [] : installed.filter(({ elements }) => elements.includes(key));
    if (byElement.length > 0) {
      report(node, tagNode, key === tag ? `A native <${tag}>` : `A native <input type="${key.slice('input[type='.length, -1)}">`, byElement);
      return;
    }
    const role = attributes && attributeNamed(attributes, 'role');
    if (!role) return;
    const value = attributeValue(role);
    if (value === undefined) {
      if (roled) unresolved(node, role, 'role', tag);
      return;
    }
    if (value === null) return;
    const name = firstRole(value);
    const byRole = installed.filter(({ roles }) => roles.includes(name));
    if (byRole.length > 0) report(node, role, `A <${tag}> with role="${name}"`, byRole);
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = tagText(node.tagName);
      if (tag !== undefined && intrinsic(tag)) element(ts.isJsxOpeningElement(node) ? node.parent : node, node.tagName, tag, node.attributes);
    } else if (ts.isCallExpression(node)) {
      // `createElement('button')`, from React or the DOM, is the same element without JSX.
      const callee = unwrap(node.expression);
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
      const [first] = node.arguments;
      if (name === 'createElement' && first && ts.isStringLiteralLike(first)) element(node, first, first.text, undefined);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
