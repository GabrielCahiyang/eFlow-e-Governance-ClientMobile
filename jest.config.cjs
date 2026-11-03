module.exports = {
  preset: "jest-expo",
  resolver: "react-native-reanimated/jest/resolver",
  moduleNameMapper: {
    "^lucide-react-native/icons/(.*)$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js",
  },
  roots: ["<rootDir>/src/app", "<rootDir>/src/platform", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  clearMocks: true,
  testTimeout: 30000,
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
};
