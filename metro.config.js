const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
// A preview server and a production export may coexist. Give their serialized
// file maps separate locations so one cannot read another process's partial write.
const cacheScope = process.argv.some(
  (arg) => arg === "export" || arg === "export:embed",
)
  ? "export"
  : "serve";
config.fileMapCacheDirectory = path.join(
  os.tmpdir(),
  "eflow-mobile-metro",
  cacheScope,
);
fs.mkdirSync(config.fileMapCacheDirectory, { recursive: true });
config.cacheVersion = "eflow-native-v2-" + cacheScope;
const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : [config.resolver.blockList].filter(Boolean);
const previousResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, name, platform) => {
  if (
    process.env.NODE_ENV === "production" &&
    /(?:^|\/)quickLoginAccounts(?:\.tsx?)?$/.test(name)
  )
    return {
      type: "sourceFile",
      filePath: path.join(__dirname, "src/platform/productionAccounts.ts"),
    };
  return previousResolver
    ? previousResolver(context, name, platform)
    : context.resolveRequest(context, name, platform);
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.maxWorkers = 2;
// Native compiler output contains thousands of files that are never JS input.
// Keep it outside Metro's Windows file crawl and file watching.
config.resolver.blockList = [
  ...defaultBlockList,
  /[/\\]android[/\\](?:build|\.gradle|\.cxx)[/\\]/,
  /[/\\]android[/\\]app[/\\](?:build|\.cxx)[/\\]/,
  /[/\\]node_modules[/\\].+[/\\]android[/\\](?:build|\.cxx)[/\\]/,
  new RegExp("^" + escapeRegex(__dirname) + "[/\\\\]dist[/\\\\]"),
  new RegExp(
    "^" +
      escapeRegex(__dirname) +
      "[/\\\\](?:artifacts|web-build)(?:[/\\\\]|$)",
  ),
  /[/\\]node_modules[/\\].+[/\\](?:ReactAndroid|android|ios)[/\\](?:build|\.cxx)(?:[/\\]|$)/,
];
module.exports = config;
const previousEnhancer = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = previousEnhancer
    ? previousEnhancer(middleware, server)
    : middleware;
  return (req, res, nextMiddleware) => {
    if (!req.url?.startsWith("/controlpanelEflow/api/"))
      return next(req, res, nextMiddleware);
    const proxy = http.request(
      {
        host: "127.0.0.1",
        port: 8322,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: "127.0.0.1:8322" },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxy.on("error", () => {
      if (!res.headersSent)
        res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          detail:
            "The secure eFlow control service is unavailable. Start the existing gateway on port 8322.",
        }),
      );
    });
    req.on("aborted", () => proxy.destroy());
    req.pipe(proxy);
  };
};
