// A TypeScript program over a scope's files, for the rules that read resolved types. Repository files
// are read through the scope, so an overlay or a consumer checkout is typed exactly as a rule sees it;
// the compiler's own libraries come from the installed TypeScript. docs/spec/agent-infrastructure.md,
// Engine and command.
import ts from 'typescript';

import type { Files } from '../../../scripts/catalogue/files.ts';
import type { Resolution } from './scope.ts';

export type TypeProgram = {
  checker: ts.TypeChecker;
  /** The program's copy of a scope file, whose offsets match the text the scope reads. */
  sourceFile(path: string): ts.SourceFile | undefined;
  /** The scope path a program file was read from; undefined for the compiler's own libraries. */
  pathOf(file: ts.SourceFile): string | undefined;
  /** The compiler's own syntactic and semantic diagnostics for one scope file. */
  diagnostics(path: string): readonly ts.Diagnostic[];
  /** Problems that kept the program from typing its roots, such as an unresolved module. */
  problems: { path: string; start: number; end: number; message: string }[];
};

const ROOT = '/@scope';

const cache = new Map<string, ts.SourceFile>();

export function createTypeProgram(
  files: Files,
  resolve: (specifier: string, from: string) => Resolution,
  options: ts.CompilerOptions,
  roots: string[],
  /** Authored files the program may load beyond its roots; anything else stays unresolved and untyped. */
  follow: (path: string) => boolean = () => true,
): TypeProgram {
  const toAbsolute = (path: string) => `${ROOT}/${path}`;
  const toScope = (absolute: string) => (absolute.startsWith(`${ROOT}/`) ? absolute.slice(ROOT.length + 1) : undefined);
  const realpath = (path: string) => files.realpath?.(path) ?? path;

  const readFile = (absolute: string) => {
    const path = toScope(absolute);
    return path === undefined ? ts.sys.readFile(absolute) : files.read(path);
  };
  const moduleHost = {
    fileExists: (absolute) => readFile(absolute) !== undefined,
    readFile,
    directoryExists(absolute) {
      const path = toScope(absolute);
      if (path === undefined) return ts.sys.directoryExists(absolute);
      return path === '' || files.list(path) !== undefined;
    },
    realpath(absolute) {
      const path = toScope(absolute);
      return path === undefined ? (ts.sys.realpath?.(absolute) ?? absolute) : toAbsolute(realpath(path));
    },
    getCurrentDirectory: () => ROOT,
  } satisfies ts.ModuleResolutionHost;

  const problems: TypeProgram['problems'] = [];
  const host: ts.CompilerHost = {
    ...moduleHost,
    getSourceFile(absolute, languageVersion) {
      const text = readFile(absolute);
      if (text === undefined) return undefined;
      const key = `${absolute}\u0000${text}`;
      let file = cache.get(key);
      if (!file) {
        file = ts.createSourceFile(absolute, text, languageVersion, true);
        cache.set(key, file);
      }
      return file;
    },
    getDefaultLibFileName: (compilerOptions) => ts.getDefaultLibFilePath(compilerOptions),
    writeFile: () => undefined,
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    resolveModuleNameLiterals(literals, containingFile, _redirect, compilerOptions) {
      // Installed packages resolve as the compiler resolves them; only authored files use the scope's resolution.
      const scoped = toScope(containingFile);
      const from = scoped?.includes('node_modules/') ? undefined : scoped;
      return literals.map((literal) => {
        const specifier = literal.text;
        if (from !== undefined) {
          const resolution = resolve(specifier, from);
          if (resolution.kind === 'file' && !follow(resolution.path)) return { resolvedModule: undefined };
          if (resolution.kind === 'file' && /\.(ts|tsx)$/.test(resolution.path)) {
            const resolvedFileName = toAbsolute(realpath(resolution.path));
            const extension = resolvedFileName.endsWith('.tsx') ? ts.Extension.Tsx : resolvedFileName.endsWith('.d.ts') ? ts.Extension.Dts : ts.Extension.Ts;
            return { resolvedModule: { resolvedFileName, extension, isExternalLibraryImport: false } };
          }
        }
        const { resolvedModule } = ts.resolveModuleName(specifier, containingFile, compilerOptions, moduleHost);
        if (!resolvedModule && from !== undefined && roots.includes(from)) {
          problems.push({ path: from, start: literal.getStart(), end: literal.getEnd(), message: `"${specifier}" resolves to no module the compiler can read` });
        }
        return { resolvedModule };
      });
    },
  };

  const program = ts.createProgram({ rootNames: roots.map(toAbsolute), options: { ...options, noEmit: true }, host });
  return {
    checker: program.getTypeChecker(),
    diagnostics(path) {
      const file = program.getSourceFile(toAbsolute(path));
      return file ? [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file)] : [];
    },
    sourceFile: (path) => program.getSourceFile(toAbsolute(path)),
    pathOf: (file) => toScope(file.fileName),
    problems,
  };
}
