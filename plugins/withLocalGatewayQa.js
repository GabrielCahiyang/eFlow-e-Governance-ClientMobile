const {
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const resource = "@xml/eflow_local_gateway_qa";
const marker = "eFlow explicit local gateway QA only";
const networkSecurityXml = `<?xml version="1.0" encoding="utf-8"?>
<!-- ${marker} -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">127.0.0.1</domain>
  </domain-config>
</network-security-config>
`;

function localGatewayQaEnabled(env = process.env) {
  if (env.EFLOW_LOCAL_GATEWAY_QA !== "1") return false;
  const url = new URL(env.EXPO_PUBLIC_EFLOW_GATEWAY_URL || "");
  if (
    url.origin !== "http://127.0.0.1:8322" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Local gateway QA requires http://127.0.0.1:8322 through adb reverse.",
    );
  return true;
}

function configureApplication(application, enabled) {
  application.$ ||= {};
  const existing = application.$["android:networkSecurityConfig"];
  if (enabled) {
    if (existing && existing !== resource)
      throw new Error(
        "Local gateway QA cannot replace an existing network security policy.",
      );
    application.$["android:networkSecurityConfig"] = resource;
  } else if (existing === resource) {
    delete application.$["android:networkSecurityConfig"];
  }
  return application;
}

module.exports = (config) => {
  const enabled = localGatewayQaEnabled();
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application)
      throw new Error("Android application manifest is missing.");
    configureApplication(application, enabled);
    return mod;
  });
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const file = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/res/xml/eflow_local_gateway_qa.xml",
      );
      if (enabled) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, networkSecurityXml);
      } else if (
        fs.existsSync(file) &&
        fs.readFileSync(file, "utf8").includes(marker)
      ) {
        fs.unlinkSync(file);
      }
      return mod;
    },
  ]);
};
module.exports.localGatewayQaEnabled = localGatewayQaEnabled;
module.exports.configureApplication = configureApplication;
module.exports.networkSecurityXml = networkSecurityXml;
