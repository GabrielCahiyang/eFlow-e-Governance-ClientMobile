const path = require("node:path");
const config = require("./metro.config");
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, name, platform) => {
  if (name === "@react-native-community/netinfo") return { type: "sourceFile", filePath: path.join(__dirname, "LoginNetInfo40.tmp.ts") };
  const resolved = resolve(context, name, platform);
  if (resolved.type === "sourceFile") {
    const target = path.relative(__dirname, resolved.filePath).split(path.sep).join("/");
    if (target === "src/platform/config.ts")
      return { type: "sourceFile", filePath: path.join(__dirname, "LoginConfig40.tmp.ts") };
    if (target === "src/platform/supabase.ts")
      return { type: "sourceFile", filePath: path.join(__dirname, "LoginSupabase40.tmp.ts") };
  }
  return resolved;
};
module.exports = config;

