jest.mock("expo/config-plugins", () => ({
  withAndroidManifest: jest.fn(),
  withDangerousMod: jest.fn(),
}));
const {
  localGatewayQaEnabled,
  configureApplication,
  networkSecurityXml,
} = require("../../plugins/withLocalGatewayQa");

test("local cleartext policy requires an explicit QA opt-in and exact loopback gateway", () => {
  expect(localGatewayQaEnabled({})).toBe(false);
  expect(
    localGatewayQaEnabled({
      EXPO_PUBLIC_EFLOW_GATEWAY_URL: "http://127.0.0.1:8322",
    }),
  ).toBe(false);
  expect(
    localGatewayQaEnabled({
      EFLOW_LOCAL_GATEWAY_QA: "1",
      EXPO_PUBLIC_EFLOW_GATEWAY_URL: "http://127.0.0.1:8322",
    }),
  ).toBe(true);
  for (const gateway of [
    "http://example.com:8322",
    "http://127.0.0.1:8323",
    "http://user:password@127.0.0.1:8322",
    "http://127.0.0.1:8322?token=x",
  ])
    expect(() =>
      localGatewayQaEnabled({
        EFLOW_LOCAL_GATEWAY_QA: "1",
        EXPO_PUBLIC_EFLOW_GATEWAY_URL: gateway,
      }),
    ).toThrow();
});

test("QA policy permits only loopback HTTP and normal prebuild removes its manifest reference", () => {
  expect(networkSecurityXml).toContain(
    '<base-config cleartextTrafficPermitted="false" />',
  );
  expect(networkSecurityXml).toContain(
    '<domain includeSubdomains="false">127.0.0.1</domain>',
  );
  const application = { $: {} };
  configureApplication(application, true);
  expect(application.$["android:networkSecurityConfig"]).toBe(
    "@xml/eflow_local_gateway_qa",
  );
  configureApplication(application, false);
  expect(application.$["android:networkSecurityConfig"]).toBeUndefined();
});

test("QA does not overwrite or remove another network security policy", () => {
  const application = {
    $: { "android:networkSecurityConfig": "@xml/owned_elsewhere" },
  };
  expect(() => configureApplication(application, true)).toThrow();
  configureApplication(application, false);
  expect(application.$["android:networkSecurityConfig"]).toBe(
    "@xml/owned_elsewhere",
  );
});
