import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const source =
  process.env.EFLOW_WEB_SOURCE || path.resolve(root, "../EflowWeb");
const files = [
  "src/pages/Login/components/EFlowMark.tsx",
  "src/pages/Login/motion.ts",
  "src/app/shared/motion/motionTokens.ts",
  "src/app/components/ui/ViewLoadingState.tsx",
  "src/app/components/ui/viewLoadingState.css",
  "src/app/components/workflow/WorkspaceLoadingSkeleton.tsx",
  "src/app/components/ui/workspace/WorkspaceSkeleton.tsx",
  "src/app/features/app-shell/LoadingScreen.tsx",
  "src/pages/Login/components/LivingBoard.tsx",
  "index.html",
];
const inputs = Object.fromEntries(
  files.map((file) => [file, fs.readFileSync(path.join(source, file), "utf8")]),
);
const mark = inputs[files[0]];
const paths = [...mark.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]);
if (paths.length !== 6)
  throw new Error(
    "eFlow mark changed. Review the native geometry before updating.",
  );
const out = path.join(root, "src/app/components/brand");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "markPaths.ts"),
  "// Exact SVG paths from EflowWeb. Regenerate with npm run sync:presentation.\nexport const markPaths = " +
    JSON.stringify(paths, null, 2) +
    " as const;\n",
);
const board = inputs[files[8]].match(
  /const INITIAL_CARDS: KanbanCard\[\] = (\[[\s\S]*?\n\]);/,
);
if (!board) throw new Error("The login preview card contract changed.");
const boardOut = path.join(
  root,
  "src/app/features/authentication/loginPreviewCards.ts",
);
fs.writeFileSync(
  boardOut,
  "// Existing web login demonstration cards, never written to the database.\nexport const loginPreviewCards = " +
    board[1] +
    " as const;\n",
);
const manifest = {
  source: "EflowWeb",
  generatedAt: new Date().toISOString(),
  files: files.map((file) => ({
    file,
    sha256: crypto.createHash("sha256").update(inputs[file]).digest("hex"),
  })),
};
fs.writeFileSync(
  path.join(root, "docs/PRESENTATION_SOURCE_MANIFEST.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Reused 6 original SVG paths and the existing login preview cards. Recorded 10 source hashes.",
);
