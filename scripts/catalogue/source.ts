import ts from 'typescript';

export type Import = {
  specifier: string;
  /** `import type` or `export type … from`; the whole statement is erased. */
  typeOnly: boolean;
  /** The bindings a static import names, with their own `type` modifiers. */
  names: { imported: string; typeOnly: boolean }[];
  dynamic: boolean;
  line: number;
  /** Offsets of the specifier, or of the whole `import()` call when it is dynamic. */
  start: number;
  end: number;
};

export type Export = {
  name: string;
  /** The declaration the name resolves to, after `as` aliases. */
  local: string;
  typeOnly: boolean;
  kind: 'value' | 'type';
  declaration: 'function' | 'variable' | 'class' | 'type' | 'import' | 'none';
  /** Set on `export { … } from`. */
  from?: string;
  line: number;
};

export type SourceProblem = { line: number; message: string; start?: number; end?: number };

export function parse(path: string, text: string): ts.SourceFile {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
}

export function lineOf(file: ts.SourceFile, node: ts.Node): number {
  return file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
}

/** Static imports, `export … from`, and literal dynamic imports; a nonliteral `import()` is a problem. */
export function importsOf(file: ts.SourceFile): { imports: Import[]; problems: SourceProblem[] } {
  const imports: Import[] = [];
  const problems: SourceProblem[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const names: Import['names'] = [];
      if (clause?.name) names.push({ imported: 'default', typeOnly: clause.isTypeOnly });
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          names.push({
            imported: (element.propertyName ?? element.name).text,
            typeOnly: clause.isTypeOnly || element.isTypeOnly,
          });
        }
      }
      imports.push({
        specifier: node.moduleSpecifier.text,
        typeOnly: clause?.isTypeOnly ?? false,
        names,
        dynamic: false,
        line: lineOf(file, node),
        start: node.moduleSpecifier.getStart(file),
        end: node.moduleSpecifier.getEnd(),
      });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({
        specifier: node.moduleSpecifier.text,
        typeOnly: node.isTypeOnly,
        names: [],
        dynamic: false,
        line: lineOf(file, node),
        start: node.moduleSpecifier.getStart(file),
        end: node.moduleSpecifier.getEnd(),
      });
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      const inlineData = argument && ts.isTemplateExpression(argument) && argument.head.text.startsWith('data:');
      if (argument && ts.isStringLiteralLike(argument)) {
        imports.push({
          specifier: argument.text,
          typeOnly: false,
          names: [],
          dynamic: true,
          line: lineOf(file, node),
          start: node.getStart(file),
          end: node.getEnd(),
        });
      } else if (!inlineData) {
        problems.push({
          line: lineOf(file, node),
          message: 'a dynamic import with a computed specifier',
          start: node.getStart(file),
          end: node.getEnd(),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { imports, problems };
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function declarations(file: ts.SourceFile): Map<string, Export['declaration']> {
  const found = new Map<string, Export['declaration']>();
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) found.set(statement.name.text, 'function');
    else if (ts.isClassDeclaration(statement) && statement.name) found.set(statement.name.text, 'class');
    else if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      found.set(statement.name.text, 'type');
    } else if (ts.isEnumDeclaration(statement)) found.set(statement.name.text, 'variable');
    else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) found.set(declaration.name.text, 'variable');
      }
    } else if (ts.isImportDeclaration(statement) && statement.importClause) {
      const { name, namedBindings } = statement.importClause;
      if (name) found.set(name.text, 'import');
      if (namedBindings && ts.isNamespaceImport(namedBindings)) found.set(namedBindings.name.text, 'import');
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) found.set(element.name.text, 'import');
      }
    }
  }
  return found;
}

/** Every explicit export, in declaration order. `export *` is a problem: it names nothing. */
export function exportsOf(file: ts.SourceFile): { exports: Export[]; problems: SourceProblem[] } {
  const declared = declarations(file);
  const exports: Export[] = [];
  const problems: SourceProblem[] = [];
  for (const statement of file.statements) {
    const line = lineOf(file, statement);
    if (ts.isExportDeclaration(statement)) {
      const from =
        statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      const clause = statement.exportClause;
      if (!clause || !ts.isNamedExports(clause)) {
        problems.push({ line, message: '`export *` names no symbol' });
        continue;
      }
      for (const element of clause.elements) {
        const local = (element.propertyName ?? element.name).text;
        const declaration = from ? 'import' : (declared.get(local) ?? 'none');
        const typeOnly = statement.isTypeOnly || element.isTypeOnly;
        exports.push({
          name: element.name.text,
          local,
          typeOnly,
          kind: typeOnly || declaration === 'type' ? 'type' : 'value',
          declaration,
          ...(from !== undefined && { from }),
          line,
        });
      }
    } else if (hasExportModifier(statement)) {
      const names: string[] = [];
      let declaration: Export['declaration'] = 'variable';
      if (ts.isVariableStatement(statement)) {
        for (const item of statement.declarationList.declarations) {
          if (ts.isIdentifier(item.name)) names.push(item.name.text);
        }
      } else if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) &&
        statement.name
      ) {
        names.push(statement.name.text);
        declaration = declared.get(statement.name.text) ?? 'none';
      }
      const isDefault = (ts.canHaveModifiers(statement) ? (ts.getModifiers(statement) ?? []) : []).some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
      );
      if (isDefault) problems.push({ line, message: 'a default export has no public name' });
      for (const name of names) {
        exports.push({
          name,
          local: name,
          typeOnly: false,
          kind: declaration === 'type' ? 'type' : 'value',
          declaration,
          line,
        });
      }
    } else if (ts.isExportAssignment(statement)) {
      problems.push({ line, message: 'a default export has no public name' });
    }
  }
  return { exports, problems };
}

/**
 * The parts a component exports under `name`: the capitalised keys of a module-scope `const name = { … }`,
 * in source order, or `[name]` for a component declared as one function. Undefined for anything else.
 */
export function partsOf(file: ts.SourceFile, name: string): string[] | undefined {
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return [name];
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
      if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) return undefined;
      return declaration.initializer.properties.flatMap((property) =>
        (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
        ts.isIdentifier(property.name) &&
        /^[A-Z]/.test(property.name.text)
          ? [property.name.text]
          : [],
      );
    }
  }
  return undefined;
}

/** A module-scope `const NAME = ['a', 'b'] as const` read as its strings, or undefined. */
export function stringTable(file: ts.SourceFile, name: string): string[] | undefined {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (!(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
      let initializer = declaration.initializer;
      while (initializer && (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer))) {
        initializer = initializer.expression;
      }
      if (!initializer || !ts.isArrayLiteralExpression(initializer)) return undefined;
      const values = initializer.elements.map((element) => (ts.isStringLiteral(element) ? element.text : undefined));
      return values.every((value) => value !== undefined) ? (values as string[]) : undefined;
    }
  }
  return undefined;
}

/** Tags passed to `customElements.define`, in source order. */
export function registeredTags(file: ts.SourceFile): { tags: string[]; problems: SourceProblem[] } {
  const tags: string[] = [];
  const problems: SourceProblem[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'define' &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'customElements'
    ) {
      const [tag] = node.arguments;
      if (tag && ts.isStringLiteralLike(tag)) tags.push(tag.text);
      else problems.push({ line: lineOf(file, node), message: 'customElements.define with a computed tag' });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { tags, problems };
}

/** GitHub's heading anchors for a Markdown or MDX document, skipping fenced code. */
export function headingAnchors(text: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = !fenced && /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const slug = (heading[1] as string)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return anchors;
}

/** The ESM imports at the top of an MDX page, read through the same import analysis. */
export function mdxImports(path: string, text: string): Import[] {
  const statements: string[] = [];
  let current: string[] | undefined;
  let fence: string | undefined;
  for (const line of text.split('\n')) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (!current && marker && (!fence || (marker[0] === fence[0] && marker.length >= fence.length))) fence = fence ? undefined : marker;
    if (fence || marker) continue;
    if (!current && /^import\s/.test(line)) current = [];
    if (!current) continue;
    current.push(line);
    if (/from\s+['"][^'"]+['"];?\s*$/.test(line) || /^import\s+['"][^'"]+['"];?\s*$/.test(line)) {
      statements.push(current.join('\n'));
      current = undefined;
    }
  }
  return importsOf(parse(`${path}.ts`, statements.join('\n'))).imports;
}
