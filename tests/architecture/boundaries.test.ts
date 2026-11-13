import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const listFiles = (folder: string): string[] => fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(folder, entry.name);
  return entry.isDirectory() ? listFiles(absolute) : /\.tsx?$/.test(entry.name) ? [absolute] : [];
});
const imports = (file: string, runtimeOnly = false) => {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const result: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const typeOnly = clause?.isTypeOnly || (!clause?.name && bindings && ts.isNamedImports(bindings) && bindings.elements.every((item) => item.isTypeOnly));
      if (!runtimeOnly || !typeOnly) result.push(node.moduleSpecifier.text);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const typeOnly = node.isTypeOnly || (node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.every((item) => item.isTypeOnly));
      if (!runtimeOnly || !typeOnly) result.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === "require") && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) result.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
};
const resolve = (file: string, specifier: string) => {
  const base = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : specifier.startsWith(".") ? path.resolve(path.dirname(file), specifier) : null;
  return base && [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
};
const relative = (file: string) => path.relative(root, file).replaceAll("\\", "/");

describe("module dependency boundaries", () => {
  it("keeps domain and application independent of framework and integrations", () => {
    const failures: string[] = [];
    for (const file of listFiles(path.join(root, "modules"))) {
      const name = relative(file);
      if (!/\/(domain|application)\//.test(name)) continue;
      for (const specifier of imports(file)) {
        const dependency = resolve(file, specifier);
        const target = dependency ? relative(dependency) : specifier;
        if (/^(next|react|@supabase\/|googleapis|node:)/.test(target) || /\/(adapters|server)(\/|\.)/.test(target) || target.endsWith("-server.ts") || /^(app|components)\//.test(target) || target.startsWith("lib/") || target === "server-only") failures.push(`${name} -> ${target}`);
        if (name.includes("/domain/") && target.includes("/application/")) failures.push(`${name} -> ${target}`);
      }
    }
    expect(failures).toEqual([]);
  });
  it("keeps persistence out of HTTP planner adapters and action use cases", () => {
    const files = [...listFiles(path.join(root, "app/api/planner")), ...listFiles(path.join(root, "app/api/ai")), ...listFiles(path.join(root, "modules/chat/application"))];
    expect(files.filter((file) => /supabaseAdmin|\.from\("(?:terms|subjects|enrollments|events|planner_)/.test(fs.readFileSync(file, "utf8"))).map(relative)).toEqual([]);
  });
  it("does not allow a client dependency graph to reach server composition or credentials", () => {
    const failures: string[] = [];
    const entries = [...listFiles(path.join(root, "components")), ...listFiles(path.join(root, "app"))].filter((file) => /^\s*["']use client["']/.test(fs.readFileSync(file, "utf8")));
    for (const entry of entries) {
      const visited = new Set<string>();
      const walk = (file: string, chain: string[]) => {
        if (visited.has(file)) return;
        visited.add(file);
        for (const specifier of imports(file, true)) {
          const dependency = resolve(file, specifier);
          const target = dependency ? relative(dependency) : specifier;
          if (target === "server-only" || target === "lib/supabase-admin.ts" || /^modules\/[^/]+\/server\.ts$/.test(target)) failures.push([...chain, target].join(" -> "));
          else if (dependency) walk(dependency, [...chain, target]);
        }
      };
      walk(entry, [relative(entry)]);
    }
    expect(failures).toEqual([]);
  });
});
