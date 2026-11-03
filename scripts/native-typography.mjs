import fs from "node:fs";
import path from "node:path";
const root = path.resolve("src/app"),
  target = path.join(root, "components/ui/Typography");
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!file.endsWith(".tsx") || file === target + ".tsx") continue;
    let moved = [];
    const original = fs.readFileSync(file, "utf8");
    let value = original.replace(
      /import\s*\{([^}]+)\}\s*from\s*['"]react-native['"];?/g,
      (whole, names) => {
        const parts = names.split(",");
        const keep = parts.filter((part) => {
          const name = part.trim();
          if (name === "Text" || name === "TextInput") {
            moved.push(name);
            return false;
          }
          return true;
        });
        return keep.length
          ? `import {${keep.join(",")}} from 'react-native';`
          : "";
      },
    );
    if (moved.length) {
      const relative = path
        .relative(path.dirname(file), target)
        .replaceAll("\\", "/");
      value =
        `import {${[...new Set(moved)].join(",")}} from '${relative.startsWith(".") ? relative : "./" + relative}';\n` +
        value;
      fs.writeFileSync(file, value);
    }
  }
}
visit(root);
