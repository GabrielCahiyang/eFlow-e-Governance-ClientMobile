import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const root = path.resolve(import.meta.dirname, "..");
const core = path.join(root, "src/core/web");
const require = createRequire(path.join(root, "package.json"));
const ts = require("typescript");
// Keep navigation presentation functions out of the workspace service graph.
// Extract the actual source declarations, rather than maintaining a second shape.
const navFile = path.join(
  core,
  "app/features/navigation/presentationNavigation.ts",
);
const navSource = ts.createSourceFile(
  navFile,
  fs.readFileSync(navFile, "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const navTypes = navSource.statements.filter(
  (node) =>
    (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
    ["ShellNavigationItem", "NavigationGroupId"].includes(node.name.text),
);
if (navTypes.length !== 2)
  throw new Error("Navigation adapter type declarations changed.");
fs.writeFileSync(
  path.join(core, "app/features/navigation/presentationTypes.native.ts"),
  `import type {RoleNavItem} from './roleNavigation';\n` +
    navTypes.map((node) => node.getText(navSource)).join("\n") +
    "\n",
);
edit("app/features/workspaces/navigation.ts", (s) =>
  s.replace(
    "from '../navigation'",
    "from '../navigation/presentationTypes.native'",
  ),
);
// A headless service must not pull the web organization editor into Metro.
// Resolve the exact same operation directly; its API and implementation stay intact.
edit(
  "app/features/administration/services/managedUserLeadershipService.ts",
  (s) =>
    s.replace(
      'from "../../organization"',
      'from "../../organization/services/leadershipService"',
    ),
);
function edit(rel, change) {
  const file = path.join(core, rel);
  fs.writeFileSync(file, change(fs.readFileSync(file, "utf8")));
}
fs.writeFileSync(
  path.join(core, "lib/supabase.ts"),
  "export {supabase} from '../../../platform/supabase';\n",
);
edit("app/shared/controlPanelClient.ts", (s) =>
  s
    .replace(
      'if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {\n    return "/controlpanelEflow/api";\n  }',
      "if (process.env.EXPO_PUBLIC_EFLOW_GATEWAY_URL) return normalizeControlPanelBase(process.env.EXPO_PUBLIC_EFLOW_GATEWAY_URL);",
    )
    .replace(
      'fetch("/controlpanelEflow/api/ai/status")',
      "fetch(`${await resolveControlPanelBase()}/ai/status`)",
    ),
);
edit("app/features/project-access/services/accessService.ts", (s) =>
  s.replace(
    "window.location.origin",
    "(process.env.EXPO_PUBLIC_WEB_ORIGIN || '')",
  ),
);
const walk = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)],
    );
for (const file of walk(core).filter((p) => p.endsWith(".ts"))) {
  const text = fs.readFileSync(file, "utf8");
  if (
    !/\b(window|document|localStorage|sessionStorage)\b/.test(text) ||
    text.includes("__nativeWindow")
  )
    continue;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  let usedWindow = false,
    usedDocument = false;
  const result = ts.transform(source, [
    (context) => (rootNode) => {
      const visit = (node) => {
        if (
          ts.isIdentifier(node) &&
          ["window", "document", "localStorage", "sessionStorage"].includes(
            node.text,
          ) &&
          !(
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.name === node
          ) &&
          !((ts.isPropertyAssignment(node.parent) || ts.isPropertySignature(node.parent)) && node.parent.name === node)
        ) {
          if (node.text === "localStorage" || node.text === "sessionStorage") {
            usedWindow = true;
            return ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier("__nativeWindow"),
              node.text,
            );
          }
          if (node.text === "window") {
            usedWindow = true;
            return ts.factory.createIdentifier("__nativeWindow");
          }
          usedDocument = true;
          return ts.factory.createIdentifier("__nativeDocument");
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(rootNode, visit);
    },
  ]);
  if (usedWindow || usedDocument) {
    let relative = path
      .relative(path.dirname(file), path.join(root, "src/platform/webRuntime"))
      .replaceAll("\\", "/");
    if (!relative.startsWith(".")) relative = "./" + relative;
    const names = [
      usedWindow ? "nativeWindow as __nativeWindow" : null,
      usedDocument ? "nativeDocument as __nativeDocument" : null,
    ]
      .filter(Boolean)
      .join(",");
    fs.writeFileSync(
      file,
      `import {${names}} from '${relative}';\n` +
        ts.createPrinter().printFile(result.transformed[0]),
    );
  }
  result.dispose();
}
// A native caller supplies its own print/share implementation. Browser export
execFileSync(
  process.execPath,
  [path.join(root, "scripts/adapt-native-gateway.mjs")],
  { cwd: root, stdio: "inherit" },
);
// helpers are intentionally not imported by the native feature entry points.
console.log(
  "Applied native connection, session and link adapters. Backend contracts unchanged.",
);

// Native PDF replaces the browser-only PDF.js export pulled through the public barrel.
fs.writeFileSync(path.join(root,'src/core/web/app/features/proposal-import/services/pdfTextExtractor.ts'),`import {readProjectDocument,type NativePdf} from '../../../../../../platform/pdf';\nexport async function extractTextFromPdf(file:File):Promise<string>{return readProjectDocument(file as unknown as NativePdf); }\n`);
