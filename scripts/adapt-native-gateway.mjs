import fs from "node:fs";
import ts from "typescript";
const file = "src/core/web/app/shared/controlPanelClient.ts";
let text = fs.readFileSync(file, "utf8");
const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true),
  edits = [];
for (const node of source.statements) {
  if (ts.isFunctionDeclaration(node) && node.body) {
    const target = node.name?.text;
    if (target === "resolveControlPanelBase")
      edits.push({
        start: node.body.pos,
        end: node.body.end,
        text: " { return resolveNativeControlBase(); }",
      });
    if (target === "getAiEndpointStatus")
      edits.push({
        start: node.body.pos,
        end: node.body.end,
        text: " { return nativeAiRuntimeState(); }",
      });
  }
}
if (edits.length !== 2)
  throw new Error(
    "Native routing adaptation requires the two known source functions. Review the source change.",
  );
for (const edit of edits.sort((a, b) => b.start - a.start))
  text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
if (!text.includes("import {resolveNativeControlBase, nativeAiRuntimeState}"))
  text =
    "import {resolveNativeControlBase, nativeAiRuntimeState} from '../../../../platform/gateway';\n" +
    text;
fs.writeFileSync(file, text);
