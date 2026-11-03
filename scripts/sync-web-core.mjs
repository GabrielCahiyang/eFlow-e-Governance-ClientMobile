import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const root = path.resolve(import.meta.dirname, "..");
const web = path.resolve(
  process.env.EFLOW_WEB_SOURCE || path.join(root, "../EflowWeb"),
);
const require = createRequire(path.join(web, "package.json"));
const ts = require("typescript");
const source = path.join(web, "src"),
  target = path.join(root, "src/core/web");
const manifest = [];
const services = [];
const external = new Set();
const browser = [];
const walk = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)],
    );
const files = walk(source).filter(
  (p) => p.endsWith(".ts") && !p.endsWith(".d.ts"),
);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
function resolve(file, spec) {
  const p = path.resolve(path.dirname(file), spec);
  return [
    p + ".ts",
    p + ".tsx",
    path.join(p, "index.ts"),
    path.join(p, "index.tsx"),
  ].find((p) => fs.existsSync(p));
}
for (const file of files) {
  const rel = path.relative(source, file).replaceAll("\\", "/");
  if (rel === "lib/supabase.ts") continue;
  const original = fs.readFileSync(file, "utf8");
  let text = original;
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  // Web public barrels often re-export both UI and services. Native barrels
  // retain the same public service/type API without importing DOM components.
  if (path.basename(file) === "index.ts") {
    const removed = new Set(
      ast.statements
        .filter(ts.isVariableStatement)
        .flatMap((s) =>
          s.declarationList.declarations
            .filter(
              (d) =>
                d.initializer &&
                /lazyFeature\(|createContext\(/.test(
                  d.initializer.getText(ast),
                ),
            )
            .map((d) => d.name.getText(ast)),
        ),
    );
    text = ast.statements
      .filter((s) => {
        if (ts.isImportDeclaration(s)) {
          const spec = s.moduleSpecifier.text;
          const p = spec.startsWith(".") ? resolve(file, spec) : undefined;
          return (
            s.importClause?.isTypeOnly ||
            ((!p || p.endsWith(".ts")) && !spec.includes("lazyFeature"))
          );
        }
        if (ts.isExportDeclaration(s) && s.moduleSpecifier) {
          const spec = s.moduleSpecifier.text;
          if (spec.includes("/hooks/") || spec.startsWith("./hooks/"))
            return false;
          const p = spec.startsWith(".") ? resolve(file, spec) : undefined;
          return !p || p.endsWith(".ts");
        }
        if (
          ts.isVariableStatement(s) &&
          s.declarationList.declarations.some(
            (d) =>
              d.initializer &&
              /lazyFeature\(|createContext\(/.test(d.initializer.getText(ast)),
          )
        )
          return false;
        if (
          ts.isExportDeclaration(s) &&
          !s.moduleSpecifier &&
          s.exportClause &&
          ts.isNamedExports(s.exportClause) &&
          s.exportClause.elements.some((e) =>
            removed.has((e.propertyName || e.name).text),
          )
        )
          return false;
        return !ts.isExpressionStatement(s);
      })
      .map((s) => s.getFullText(ast))
      .join("\n");
  }
  text = text
    .replace(
      /import\.meta\.env\.VITE_([A-Z0-9_]+)/g,
      "process.env.EXPO_PUBLIC_$1",
    )
    .replace(/import\.meta\.env\.DEV\b/g, "__DEV__");
  const dest = path.join(target, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
  manifest.push({
    source: "src/" + rel,
    sha256: crypto.createHash("sha256").update(original).digest("hex"),
    native: rel,
    adapted: text !== original,
  });
  if (
    /\b(window|document|localStorage|sessionStorage|FileReader|MediaRecorder|navigator)\b/.test(
      original,
    )
  )
    browser.push(rel);
  for (const s of ast.statements) {
    if (
      ts.isImportDeclaration(s) &&
      s.moduleSpecifier &&
      !s.moduleSpecifier.text.startsWith(".")
    )
      external.add(s.moduleSpecifier.text);
    if (
      (ts.isFunctionDeclaration(s) || ts.isVariableStatement(s)) &&
      s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      /\/services\//.test("/" + rel)
    ) {
      const names = ts.isFunctionDeclaration(s)
        ? [s.name?.text]
        : s.declarationList.declarations.map((d) => d.name.getText(ast));
      names
        .filter(Boolean)
        .forEach((name) => services.push({ module: rel, name }));
    }
  }
}
// Type-only dependencies on presentation models are extracted without their UI.
const copied = new Set(manifest.map((m) => m.native));
for (const file of files) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const s of ast.statements) {
    if (
      !(ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) ||
      !s.moduleSpecifier ||
      !s.moduleSpecifier.text.startsWith(".")
    )
      continue;
    const resolved = resolve(file, s.moduleSpecifier.text);
    if (!resolved?.endsWith(".tsx")) continue;
    const rel = path
      .relative(source, resolved)
      .replaceAll("\\", "/")
      .replace(/\.tsx$/, ".ts");
    if (copied.has(rel)) continue;
    const text = fs.readFileSync(resolved, "utf8");
    const a = ts.createSourceFile(
      resolved,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const declarations = a.statements.filter(
      (n) =>
        ts.isInterfaceDeclaration(n) ||
        ts.isTypeAliasDeclaration(n) ||
        ts.isEnumDeclaration(n) ||
        (ts.isImportDeclaration(n) && n.importClause?.isTypeOnly),
    );
    const mixedTypes = a.statements
      .filter(ts.isImportDeclaration)
      .flatMap((n) =>
        n.importClause?.namedBindings &&
        ts.isNamedImports(n.importClause.namedBindings)
          ? n.importClause.namedBindings.elements
              .filter((e) => e.isTypeOnly)
              .map(
                (e) =>
                  `import type {${e.propertyName ? e.propertyName.text + " as " : ""}${e.name.text}} from ${n.moduleSpecifier.getText(a)};`,
              )
          : [],
      );
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(
      dest,
      "// Type declarations extracted from the web presentation module.\n" +
        mixedTypes.join("\n") +
        "\n" +
        declarations
          .map((n) => printer.printNode(ts.EmitHint.Unspecified, n, a))
          .join("\n"),
    );
    copied.add(rel);
  }
}
fs.mkdirSync(path.join(root, "docs"), { recursive: true });
fs.writeFileSync(
  path.join(root, "docs/WEB_CORE_MANIFEST.json"),
  JSON.stringify(
    {
      source: web,
      generatedAt: new Date().toISOString(),
      files: manifest,
      serviceExports: services,
      browserAdapterReview: browser,
      externalPackages: [...external].sort(),
    },
    null,
    2,
  ),
);
console.log(
  `Copied ${manifest.length} TypeScript modules; ${services.length} named service exports. ${browser.length} modules require platform-adapter review.`,
);
