const assert = require("node:assert/strict");
const path = require("node:path");
const config = require("../metro.config.js");
const ignored = (file) =>
  config.resolver.blockList.some((pattern) =>
    pattern.test(path.resolve(__dirname, "..", file)),
  );
const checks = [
  [".expo/web/cache", true],
  [".expo/types", true],
  ["android/app/build/generated/output.js", true],
  ["node_modules/react-native/ReactAndroid/build/generated/output.js", true],
  ["artifacts/app.apk", true],
  ["dist/android/output.hbc", true],
  ["node_modules/react-native-web/dist/exports/Platform/index.js", false],
  ["node_modules/lucide-react-native/dist/esm/icons/folder.mjs", false],
  ["src/app/features/projects/ProjectScreen.tsx", false],
];
assert.equal(new Set(config.resolver.blockList.map(pattern=>pattern.flags)).size,1,"Metro composes exclusions using identical RegExp flags");
for (const [file, expected] of checks)
  assert.equal(ignored(file), expected, file);
assert.ok(
  config.fileMapCacheDirectory.endsWith(
    path.join("eflow-mobile-metro", "serve"),
  ),
);
console.log(
  `${checks.length} Metro exclusion checks passed; native package dist files remain reachable.`,
);
