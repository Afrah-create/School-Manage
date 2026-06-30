/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/setup.ts"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "notifications/notificationService.test.ts",
    "notifications/examNotificationLinks.test.ts",
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.jest.json",
        isolatedModules: true,
      },
    ],
  },
  testMatch: ["**/*.test.ts"],
};
