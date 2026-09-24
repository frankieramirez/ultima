// ULT-API-001 and ULT-API-002: the public React surface keeps the StyleX `style` slot as its only
// styling escape hatch, and every part merges that slot last. docs/spec/agent-infrastructure.md, Target
// and API distinctions; docs/spec/ultima.md, Props every component accepts.
import ts from 'typescript';

import { importsOf } from '../../../../scripts/catalogue/source.ts';
import type { Diagnostic } from '../diagnostic.ts';
import type { Scope } from '../scope.ts';
import type { Parsed } from '../sources.ts';
import type { TypeProgram } from '../program.ts';
import type { Context } from './context.ts';
import { styleXBindings, styleXCall } from '../stylex.ts';

const INFRA = 'docs/spec/agent-infrastructure.md';
const TARGETS = `${INFRA}#target-and-api-distinctions`;
const PROPS = 'docs/spec/ultima.md#props-every-component-accepts';

/** How a part renders, read from the element that receives its caller slot. */
export type PartCategory =
  /** A Base UI part, restyled: keeps the primitive's `render` and `ref`. */
  | 'styled-wrapper'
  /** A plain root through `useRender`: takes `render` and `ref`. */
  | 'plain-root'
  /** A fixed native element: `ref` and no `render`. */
  | 'plain-slot'
  /** A fixed native element under a Zag prop getter: `ref` and no `render`. */
  | 'zag-part'
  /** Another Ultima component, which owns the checks for what it renders. */
  | 'composed';

/** A function that destructures the caller slot from its props, and what became of it. */
type Slot = {
  fn: ts.FunctionLikeDeclaration;
  name: string;
  binding: ts.BindingElement;
  /** The elements or calls the slot's merged result reaches. */
  consumers: ts.Node[];
  usesRender: boolean;
  /** Local names holding the `style` a stylex.props result produced, re-merged by hand with a runtime value. */
  runtime: Set<string>;
};

type Api002 = { slots: Map<ts.FunctionLikeDeclaration, Slot> };

function unwrap(node: ts.Node): ts.Node {
  let current = node;
  while (current.parent && (ts.isParenthesizedExpression(current.parent) || ts.isAsExpression(current.parent) || ts.isSatisfiesExpression(current.parent) || ts.isNonNullExpression(current.parent))) {
    current = current.parent;
  }
  return current;
}

function nameOf(node: ts.Node | undefined): string | undefined {
  if (!node) return undefined;
  if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name) return node.name.text;
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = unwrap(node).parent;
    if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    if (parent && ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  }
  return undefined;
}

/** References to a local binding inside `scope`, skipping names in declaration, property and attribute positions. */
function references(scope: ts.Node, name: string, declaration: ts.Node): ts.Identifier[] {
  const found: ts.Identifier[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === name && node !== declaration) {
      const parent = node.parent;
      const excluded =
        (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
        (ts.isPropertyAssignment(parent) && parent.name === node) ||
        (ts.isBindingElement(parent) && (parent.name === node || parent.propertyName === node)) ||
        (ts.isVariableDeclaration(parent) && parent.name === node) ||
        ts.isJsxAttribute(parent) ||
        ((ts.isJsxOpeningElement(parent) || ts.isJsxClosingElement(parent) || ts.isJsxSelfClosingElement(parent)) && parent.tagName === node) ||
        ts.isParameter(parent) ||
        ts.isQualifiedName(parent) ||
        ts.isTypeReferenceNode(parent);
      if (!excluded) found.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return found;
}

function propName(node: ts.ObjectLiteralElementLike | ts.JsxAttributeLike): string | undefined {
  if (ts.isJsxAttribute(node)) return ts.isIdentifier(node.name) ? node.name.text : undefined;
  if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) return node.name.text;
  return undefined;
}

/** `useRender` from Base UI, under any local name. */
function useRenderNames(file: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!statement.moduleSpecifier.text.startsWith('@base-ui/react')) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) if ((element.propertyName ?? element.name).text === 'useRender') names.add(element.name.text);
    }
  }
  return names;
}

/** `mergeProps` from a primitive library: Zag's or Base UI's prop-getter merge. */
function mergeNames(file: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const from = statement.moduleSpecifier.text;
    if (!from.startsWith('@zag-js/') && !from.startsWith('@base-ui/react')) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) if ((element.propertyName ?? element.name).text === 'mergeProps') names.add(element.name.text);
    }
  }
  return names;
}

/** ULT-API-002 over one component file. Returns each part's slot for the type rule to categorize. */
export function checkSlots(context: Context, parsed: Parsed, file: ts.SourceFile): Api002 {
  const slots = new Map<ts.FunctionLikeDeclaration, Slot>();
  const bindings = styleXBindings(file);
  const renders = useRenderNames(file);
  const merges = mergeNames(file);

  const isStylexProps = (node: ts.Node): node is ts.CallExpression => ts.isCallExpression(node) && styleXCall(node, bindings) === 'props';

  const report = (ruleId: 'ULT-API-002' | 'ULT-ANALYSIS-001', node: ts.Node, fn: ts.FunctionLikeDeclaration, message: string, repair: string) =>
    context.report({
      ruleId,
      parsed,
      start: node.getStart(file),
      end: node.getEnd(),
      ...(nameOf(fn) && { symbol: nameOf(fn) }),
      target: 'style',
      message,
      repair,
      link: ruleId === 'ULT-API-002' ? PROPS : TARGETS,
    });

  /** A later `style` that spreads the result's own style first, then adds a documented runtime value. */
  const remerges = (property: ts.JsxAttributeLike | ts.ObjectLiteralElementLike, slot: Slot) => {
    let value: ts.Node | undefined = ts.isPropertyAssignment(property) ? property.initializer : ts.isJsxAttribute(property) ? property.initializer : undefined;
    if (value && ts.isJsxExpression(value)) value = value.expression;
    if (!value || !ts.isObjectLiteralExpression(value)) return false;
    const [first] = value.properties;
    return !!first && ts.isSpreadAssignment(first) && ts.isIdentifier(first.expression) && slot.runtime.has(first.expression.text);
  };

  /** A merged result spread into an element or object: nothing after it may replace className or style. */
  const checkLater = (spread: ts.JsxSpreadAttribute | ts.SpreadAssignment, slot: Slot) => {
    const siblings: readonly (ts.JsxAttributeLike | ts.ObjectLiteralElementLike)[] = ts.isJsxSpreadAttribute(spread)
      ? (spread.parent as ts.JsxAttributes).properties
      : (spread.parent as ts.ObjectLiteralExpression).properties;
    const later = siblings.slice(siblings.indexOf(spread) + 1);
    for (const sibling of later) {
      const name = propName(sibling);
      if (name === 'style' && remerges(sibling, slot)) continue;
      if (name === 'className' || name === 'style') {
        report('ULT-API-002', sibling, slot.fn, `A later ${name} replaces the merged StyleX result, discarding the caller's style slot.`, `Remove the later ${name}; add its styles to the stylex.props call before the caller's slot.`);
      } else if (ts.isJsxSpreadAttribute(sibling) || ts.isSpreadAssignment(sibling)) {
        report('ULT-API-002', sibling, slot.fn, "A spread after the merged StyleX result can carry className or style and discard the caller's style slot.", 'Spread the other props before the stylex.props result.');
      }
    }
    slot.consumers.push(ts.isJsxSpreadAttribute(spread) ? spread.parent.parent : spread.parent);
  };

  /** Where a stylex.props result that holds the caller slot goes. */
  const place = (call: ts.Node, slot: Slot) => {
    const node = unwrap(call);
    const parent = node.parent;
    if (ts.isJsxSpreadAttribute(parent) || ts.isSpreadAssignment(parent)) return checkLater(parent, slot);
    if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && merges.has(parent.expression.text)) {
      // A primitive prop-getter merge concatenates class names, so its argument order discards nothing.
      slot.consumers.push(parent);
      return;
    }
    if (ts.isVariableDeclaration(parent) && parent.initializer === node) {
      const bound: ts.Identifier[] = [];
      if (ts.isIdentifier(parent.name)) bound.push(parent.name);
      else if (ts.isObjectBindingPattern(parent.name)) {
        // A documented runtime-style merge: the result is taken apart and its style re-merged by hand.
        for (const element of parent.name.elements) {
          if (element.dotDotDotToken && ts.isIdentifier(element.name)) bound.push(element.name);
          else if ((element.propertyName ?? element.name).getText(file) === 'style' && ts.isIdentifier(element.name)) slot.runtime.add(element.name.text);
        }
        slot.consumers.push(parent);
      }
      for (const identifier of bound) {
        for (const reference of references(slot.fn, identifier.text, identifier)) {
          const use = unwrap(reference).parent;
          if (ts.isJsxSpreadAttribute(use) || ts.isSpreadAssignment(use)) checkLater(use, slot);
          else if (ts.isPropertyAccessExpression(use) && (use.name.text === 'className' || use.name.text === 'style')) slot.consumers.push(use);
          else report('ULT-ANALYSIS-001', reference, slot.fn, `The merged StyleX result ${identifier.text} is used in a form the checker cannot follow, so the caller slot's placement is unestablished.`, 'Spread the stylex.props result onto the element, or read its className and style directly.');
        }
      }
      return;
    }
    report('ULT-ANALYSIS-001', node, slot.fn, 'The stylex.props result holding the caller slot is used in a form the checker cannot follow.', 'Spread the stylex.props result onto the element or into the props object, as a Base UI part or useRender root does.');
  };

  const visitFunction = (fn: ts.FunctionLikeDeclaration) => {
    const param = fn.parameters[0];
    if (!param || !ts.isObjectBindingPattern(param.name) || !fn.body) return;
    const binding = param.name.elements.find((element) => (element.propertyName ?? element.name).getText(file) === 'style');
    if (!binding || !ts.isIdentifier(binding.name)) return;
    const slot: Slot = { fn, name: binding.name.text, binding, consumers: [], usesRender: false, runtime: new Set() };
    slots.set(fn, slot);

    const walk = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && renders.has(node.expression.text)) slot.usesRender = true;
      ts.forEachChild(node, walk);
    };
    walk(fn.body);

    const uses = references(fn.body, slot.name, binding.name);
    if (uses.length === 0) {
      report('ULT-API-002', binding, fn, "The caller's style slot is destructured and never merged, so a caller's override is silently dropped.", "Pass the slot as the last argument of the part's stylex.props call.");
    }
    for (const reference of uses) {
      const node = unwrap(reference);
      const parent = node.parent;
      if (isStylexProps(parent) && parent.arguments.includes(node as ts.Expression)) {
        if (parent.arguments[parent.arguments.length - 1] !== node) {
          report('ULT-API-002', node, fn, "The caller's style slot is not the last argument to stylex.props, so the part's defaults win over the caller.", 'Move the slot to the end of the stylex.props call.');
        } else place(parent, slot);
        continue;
      }
      if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent) && propName(parent.parent) === 'style') {
        // Forwarded to another Ultima component, whose own part merges it last.
        slot.consumers.push(parent.parent.parent.parent);
        continue;
      }
      if (ts.isArrayLiteralExpression(parent) && ts.isJsxExpression(unwrap(parent).parent) && propName(unwrap(parent).parent.parent as ts.JsxAttribute) === 'style') {
        if (parent.elements[parent.elements.length - 1] !== node) {
          report('ULT-API-002', node, fn, "The caller's style slot is not last in the forwarded style array, so the part's defaults win over the caller.", 'Move the slot to the end of the array.');
        }
        slot.consumers.push((unwrap(parent).parent.parent as ts.JsxAttribute).parent.parent);
        continue;
      }
      report('ULT-ANALYSIS-001', node, fn, "The caller's style slot is used in a form the checker cannot follow, so its placement is unestablished.", 'Pass the slot as the last argument of stylex.props, or forward it as the style prop of another Ultima component.');
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) visitFunction(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { slots };
}

/** The part category of a slot, from the element its merged result reaches. */
function categorize(slot: Slot, program: TypeProgram, merges: Set<string>): PartCategory | undefined {
  if (slot.usesRender) return 'plain-root';
  for (const consumer of slot.consumers) {
    if (ts.isCallExpression(consumer) && ts.isIdentifier(consumer.expression) && merges.has(consumer.expression.text)) return 'zag-part';
    let element: ts.Node | undefined = consumer;
    while (element && !ts.isJsxOpeningElement(element) && !ts.isJsxSelfClosingElement(element)) {
      if (ts.isFunctionLike(element)) {
        element = undefined;
        break;
      }
      element = element.parent;
    }
    if (!element) continue;
    const tag = (element as ts.JsxOpeningElement | ts.JsxSelfClosingElement).tagName;
    if (ts.isIdentifier(tag) && /^[a-z]/.test(tag.text)) return 'plain-slot';
    const symbol = program.checker.getSymbolAtLocation(tag);
    const target = symbol && symbol.flags & ts.SymbolFlags.Alias ? program.checker.getAliasedSymbol(symbol) : symbol;
    const declaration = target?.valueDeclaration ?? target?.declarations?.[0];
    const path = declaration ? program.pathOf(declaration.getSourceFile()) : undefined;
    if (path?.includes('node_modules/') && path.includes('@base-ui')) return 'styled-wrapper';
    return 'composed';
  }
  return undefined;
}

type Part = { name: string; fn: ts.FunctionLikeDeclaration; at: ts.Node };

/** The public values a component file exports, by category, with every exported part function. */
function exportedParts(program: TypeProgram, file: ts.SourceFile): {
  parts: Part[];
  hooks: { name: string; node: ts.Node; type: ts.Type }[];
  unresolved: { name: string; node: ts.Node }[];
  passThrough: string[];
  composed: string[];
  values: string[];
} {
  const { checker } = program;
  const parts: Part[] = [];
  const passThrough: string[] = [];
  const composed: string[] = [];
  const values: string[] = [];
  /** Hooks and plain functions: public, but not parts, so they carry no style slot. */
  const hooks: { name: string; node: ts.Node; type: ts.Type }[] = [];
  const unresolved: { name: string; node: ts.Node }[] = [];
  const moduleSymbol = checker.getSymbolAtLocation(file);
  if (!moduleSymbol) return { parts, hooks, unresolved, passThrough, composed, values };
  const external = (declaration: ts.Declaration) => {
    const path = program.pathOf(declaration.getSourceFile());
    return path === undefined || path.includes('node_modules/');
  };

  const inspect = (name: string, symbol: ts.Symbol | undefined, at: ts.Node) => {
    const target = symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const declaration = target?.valueDeclaration ?? target?.declarations?.[0];
    if (!target || !declaration) {
      unresolved.push({ name, node: at });
      return;
    }
    // An unchanged primitive export keeps the primitive's contract; the checker never rewrites it.
    if (external(declaration)) {
      passThrough.push(name);
      return;
    }
    // Another item's part, composed here: that item's own file is where its props are checked.
    if (declaration.getSourceFile() !== file) {
      composed.push(name);
      return;
    }
    if (ts.isPropertyAssignment(declaration)) {
      inspect(name, checker.getSymbolAtLocation(declaration.initializer), at);
      return;
    }
    if (ts.isShorthandPropertyAssignment(declaration)) {
      inspect(name, checker.getShorthandAssignmentValueSymbol(declaration), at);
      return;
    }
    const leaf = name.slice(name.lastIndexOf('.') + 1);
    if (/^use[A-Z]/.test(leaf) || /^[a-z]/.test(leaf)) {
      const type = checker.getTypeOfSymbolAtLocation(target, declaration);
      // A lowercase value that is not callable, such as an exported style table, is neither part nor hook.
      if (type.getCallSignatures().length === 0 && !(type.flags & ts.TypeFlags.Any)) {
        values.push(name);
        return;
      }
      hooks.push({ name, node: at, type: checker.getTypeOfSymbolAtLocation(target, declaration) });
      return;
    }
    if (ts.isFunctionDeclaration(declaration)) {
      parts.push({ name, fn: declaration, at });
      return;
    }
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      let value: ts.Expression = declaration.initializer;
      while (ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) value = value.expression;
      if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
        parts.push({ name, fn: value, at });
        return;
      }
      if (ts.isObjectLiteralExpression(value)) {
        for (const property of value.properties) {
          if (ts.isShorthandPropertyAssignment(property)) inspect(`${name}.${property.name.text}`, checker.getShorthandAssignmentValueSymbol(property), property);
          else if (ts.isPropertyAssignment(property)) {
            const key = property.name.getText(file);
            const initializer = property.initializer;
            if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) parts.push({ name: `${name}.${key}`, fn: initializer, at: property });
            else inspect(`${name}.${key}`, checker.getSymbolAtLocation(initializer), property);
          } else unresolved.push({ name: property.name ? `${name}.${property.name.getText(file)}` : name, node: property });
        }
        return;
      }
      if (ts.isIdentifier(value) || ts.isPropertyAccessExpression(value)) {
        inspect(name, checker.getSymbolAtLocation(value), at);
        return;
      }
    }
    unresolved.push({ name, node: at });
  };

  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    if (!(target.flags & ts.SymbolFlags.Value)) continue;
    const at = exported.declarations?.[0] ?? file;
    inspect(exported.name, exported, at);
  }
  return { parts, hooks, unresolved, passThrough, composed, values };
}

/** One public export and the category the rules checked it under. */
export type PartRecord = { file: string; name: string; category: PartCategory | 'pass-through' | 'hook-or-function' | 'value' | 'unresolved' | 'undetermined' };

/**
 * A component's findings depend only on its text and the authored modules it reaches, so a run reuses
 * them while those are unchanged and types only the files that changed. Installed packages are fixed
 * for a checkout.
 */
const results = new Map<string, { diagnostics: Diagnostic[]; inventory: PartRecord[] }>();

/** The file's text and every authored module it reaches, as one cache key. */
function inputsKey(scope: Scope, path: string, slot: string): string {
  const seen = new Set<string>();
  const queue = [path, slot];
  const parts: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    const text = scope.files.read(current);
    parts.push(`${current}\u0000${text ?? '\u0001'}`);
    if (text === undefined || !/\.(ts|tsx)$/.test(current)) continue;
    const { imports } = importsOf(ts.createSourceFile(current, text, ts.ScriptTarget.Latest, false, current.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
    for (const { specifier } of imports) {
      const resolution = scope.resolve(specifier, current);
      const kind = resolution.kind === 'file' ? scope.kindOf(resolution.path) : undefined;
      if (kind === 'react-component' || kind === 'react-helper' || kind === 'token-source') queue.push((resolution as { path: string }).path);
    }
  }
  return parts.sort().join('\u0002');
}

/** ULT-API-001 and the typed half of ULT-API-002 over every React component file; returns what it classified. */
export function checkApi(context: Context, components: string[]): PartRecord[] {
  const { types } = context.scope;
  const inventory: PartRecord[] = [];
  const parsedFiles = components.map((path) => ({ path, parsed: context.source(path) }));
  if (!types) {
    for (const { parsed } of parsedFiles) if (parsed) checkSlots(context, parsed, (parsed.segments[0] as Parsed['segments'][number]).file);
    return inventory;
  }
  const keys = new Map(parsedFiles.filter(({ parsed }) => parsed).map(({ path }) => [path, inputsKey(context.scope, path, types.styleSlot.path)]));
  const pending = [...keys].filter(([, key]) => !results.has(key)).map(([path]) => path);
  if (pending.length > 0) typeFiles(context, pending, keys);
  for (const [path, key] of keys) {
    const cached = results.get(key);
    if (!cached) continue;
    context.diagnostics.push(...cached.diagnostics);
    inventory.push(...cached.inventory.filter((entry) => entry.file === path));
  }
  return inventory;
}

function typeFiles(context: Context, components: string[], keys: Map<string, string>): void {
  const types = context.scope.types as NonNullable<Scope['types']>;
  const parsedFiles = components.map((path) => ({ path, parsed: context.source(path) }));
  const program = types.program([...components, types.styleSlot.path]);
  const { checker } = program;
  const own = new Map<string, { diagnostics: Diagnostic[]; inventory: PartRecord[] }>(components.map((path) => [path, { diagnostics: [], inventory: [] }]));
  const capture = (path: string, work: () => void) => {
    const before = context.diagnostics.length;
    work();
    const owned = own.get(path);
    if (owned) owned.diagnostics.push(...context.diagnostics.splice(before));
  };
  const record = (entry: PartRecord) => own.get(entry.file)?.inventory.push(entry);

  for (const problem of program.problems) {
    const parsed = context.source(problem.path);
    if (!parsed || context.reportedAt(problem.path, parsed.text.slice(0, problem.start).split('\n').length)) continue;
    capture(problem.path, () =>
      context.report({
        ruleId: 'ULT-ANALYSIS-001',
        parsed,
        start: problem.start,
        end: problem.end,
        message: `The public types cannot be resolved: ${problem.message}.`,
        repair: 'Install the workspace dependencies, or point the import at a module that exists.',
        link: TARGETS,
      }),
    );
  }

  const slotFile = program.sourceFile(types.styleSlot.path);
  const slotSymbol = slotFile && checker.getSymbolAtLocation(slotFile);
  const slotExport = slotSymbol && checker.getExportsOfModule(slotSymbol).find((symbol) => symbol.name === types.styleSlot.name);
  const styleProp = slotExport && checker.getNonNullableType(checker.getDeclaredTypeOfSymbol(slotExport));

  for (const { path, parsed } of parsedFiles) capture(path, () => {
    if (!parsed) return;
    const file = program.sourceFile(path);
    if (!file) return;
    const { slots } = checkSlots(context, parsed, file);
    const merges = mergeNames(file);
    const { parts, hooks, unresolved, passThrough, composed, values } = exportedParts(program, file);
    for (const name of values) record({ file: path, name, category: 'value' });
    for (const name of passThrough) record({ file: path, name, category: 'pass-through' });
    for (const name of composed) record({ file: path, name, category: 'composed' });

    const report = (ruleId: 'ULT-API-001' | 'ULT-API-002' | 'ULT-ANALYSIS-001', node: ts.Node, symbol: string, target: string, message: string, repair: string) =>
      context.report({ ruleId, parsed, start: node.getStart(file), end: node.getEnd(), symbol, target, message, repair, link: ruleId === 'ULT-API-002' ? PROPS : TARGETS });

    for (const { name } of hooks) record({ file: path, name, category: 'hook-or-function' });
    for (const { name } of unresolved) record({ file: path, name, category: 'unresolved' });
    for (const { name, node } of unresolved) {
      report('ULT-ANALYSIS-001', node, name, 'export', `The public export ${name} cannot be resolved to a part, hook or primitive, so its props are unchecked.`, 'Export a function part, a namespace object literal of parts, or an unchanged primitive.');
    }

    for (const hook of hooks) {
      const signature = hook.type.getCallSignatures()[0];
      const returned = signature && checker.getReturnTypeOfSignature(signature);
      const anyParameter = signature?.parameters.find((parameter) => checker.getTypeOfSymbol(parameter).flags & ts.TypeFlags.Any);
      if (!signature || (returned && returned.flags & ts.TypeFlags.Any) || anyParameter) {
        const what = anyParameter ? `takes ${anyParameter.name} as any` : 'returns any';
        report('ULT-API-001', hook.node, hook.name, anyParameter ? anyParameter.name : 'return', `The public function ${hook.name} ${what}, which hides its public types.`, 'Type its parameters and return value; they are public surface documented beside the parts.');
      }
    }

    for (const part of parts) {
      const programFn = part.fn;
      const param = programFn.parameters[0];
      const at = param ?? part.at;
      if (!param) {
        report('ULT-API-001', part.at, part.name, 'style', `The part ${part.name} takes no props, so it has no style slot.`, 'Accept the part props with `style?: StyleProp`, through PartProps or PlainProps.');
        continue;
      }
      const propsType = checker.getTypeAtLocation(param);
      if (propsType.flags & ts.TypeFlags.Any) {
        report('ULT-API-001', at, part.name, 'props', `The part ${part.name} types its props as any, which defeats every public prop check.`, 'Type the props through PartProps or PlainProps.');
        continue;
      }
      const constituents = propsType.isUnion() ? propsType.types : [propsType];
      if (constituents.some((type) => checker.getIndexInfosOfType(type).length > 0)) {
        report('ULT-API-001', at, part.name, 'props', `The props of ${part.name} carry an index signature, which admits className, a native style or any other escape.`, 'Name every prop; replace the index signature with the props the part forwards.');
      }
      const property = (name: string) => constituents.map((type) => checker.getPropertyOfType(type, name)).find(Boolean);
      const className = property('className');
      if (className) {
        report('ULT-API-001', at, part.name, 'className', `The part ${part.name} accepts className, a second styling escape hatch beside the style slot.`, "Omit className from the props; PartProps and PlainProps remove it.");
      }
      const style = property('style');
      if (!style) {
        report('ULT-API-001', at, part.name, 'style', `The part ${part.name} has no style prop, so a caller cannot override it.`, 'Accept `style?: StyleProp` and pass it last to stylex.props.');
      } else if (styleProp) {
        const declared = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(style, param));
        const same = !(declared.flags & ts.TypeFlags.Any) && checker.isTypeAssignableTo(declared, styleProp) && checker.isTypeAssignableTo(styleProp, declared);
        if (!same) {
          report('ULT-API-001', at, part.name, 'style', `The style prop of ${part.name} is ${checker.typeToString(declared)}, not the StyleX slot, so it admits native CSSProperties or another escape.`, 'Type style as StyleProp, through PartProps or PlainProps.');
        }
      }

      const slot = slots.get(programFn) ?? delegated(programFn, param, slots, checker);
      if (!slot) {
        if (style) report('ULT-API-002', at, part.name, 'style', `The part ${part.name} never destructures its style slot, so the whole props object reaches the element and the slot is never merged.`, 'Destructure style and pass it last to stylex.props.');
        continue;
      }
      const category = categorize(slot, program, merges);
      record({ file: path, name: part.name, category: category ?? 'undetermined' });
      const render = property('render');
      // A Zag root takes machine props and a composed part inherits what it renders, so neither is held to ref here.
      const needsRef = category === 'plain-root' || category === 'plain-slot' || (category === 'styled-wrapper' && baseHas(checker, slot, 'ref'));
      if (needsRef && !property('ref')) {
        report('ULT-API-001', at, part.name, 'ref', `The part ${part.name} does not accept ref, which every rendered part takes as a plain prop under React 19.`, 'Keep ref in the props type; PartProps and PlainProps carry it.');
      }
      if (category === 'plain-root' && !render) {
        report('ULT-API-001', at, part.name, 'render', `The plain root ${part.name} renders through useRender but does not accept render.`, 'Type the props as PartProps<useRender.ComponentProps<...>> and pass render to useRender.');
      }
      if (category === 'styled-wrapper' && !render && baseHas(checker, slot, 'render')) {
        report('ULT-API-001', at, part.name, 'render', `The styled wrapper ${part.name} drops the Base UI part's render prop.`, 'Keep the primitive props, through PartProps<ComponentProps<typeof BasePart>>.');
      }
      if ((category === 'plain-slot' || category === 'zag-part') && render) {
        report('ULT-API-001', at, part.name, 'render', `${part.name} accepts render but renders a fixed element, so the prop reaches the DOM and does nothing.`, 'Remove render from the props, or render the part through useRender.');
      }
    }
  });
  for (const [path, record] of own) results.set(keys.get(path) as string, record);
}

/** A part that hands its whole props object to a local function holding the slot, as Pagination's ends share one. */
function delegated(fn: ts.FunctionLikeDeclaration, param: ts.ParameterDeclaration, slots: Map<ts.FunctionLikeDeclaration, Slot>, checker: ts.TypeChecker): Slot | undefined {
  if (!ts.isIdentifier(param.name) || !fn.body) return undefined;
  const name = param.name.text;
  let found: Slot | undefined;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isCallExpression(node) && node.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === name)) {
      const symbol = checker.getSymbolAtLocation(node.expression);
      const declaration = symbol?.valueDeclaration;
      if (declaration && ts.isFunctionDeclaration(declaration)) found = slots.get(declaration);
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  return found;
}

function baseHas(checker: ts.TypeChecker, slot: Slot, name: string): boolean {
  for (const consumer of slot.consumers) {
    let element: ts.Node | undefined = consumer;
    while (element && !ts.isJsxOpeningElement(element) && !ts.isJsxSelfClosingElement(element)) element = ts.isFunctionLike(element) ? undefined : element.parent;
    if (!element) continue;
    const signature = checker.getTypeAtLocation((element as ts.JsxOpeningElement).tagName).getCallSignatures()[0];
    const props = signature?.parameters[0];
    if (!props) continue;
    return checker.getTypeOfSymbol(props).getProperty(name) !== undefined;
  }
  return false;
}
