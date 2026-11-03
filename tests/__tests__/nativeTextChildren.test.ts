import { test, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const files = (folder: string): string[] =>
  fs
    .readdirSync(folder, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? files(path.join(folder, item.name))
        : item.name.endsWith(".tsx")
          ? [path.join(folder, item.name)]
          : [],
    );
test("native container children do not contain raw text or literal spacing expressions", () => {
  const invalid: string[] = [];
  for (const file of files(path.resolve("src/app"))) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isJsxElement(node) &&
        /^(View|Pressable|ScrollView|SafeAreaView|KeyboardAvoidingView|Animated.View|MotionView)$/.test(
          node.openingElement.tagName.getText(source),
        )
      ) {
        for (const child of node.children) {
          if (
            (ts.isJsxText(child) && child.text.trim()) ||
            (ts.isJsxExpression(child) &&
              child.expression &&
              (ts.isStringLiteral(child.expression) ||
                ts.isNumericLiteral(child.expression)))
          )
            invalid.push(
              path.relative(process.cwd(), file) +
                ":" +
                (source.getLineAndCharacterOfPosition(child.pos).line + 1),
            );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(invalid).toEqual([]);
});
