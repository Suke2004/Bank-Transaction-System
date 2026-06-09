/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/config/db.js",       // DB connection — tested via integration
  ],
  coverageReporters: ["text", "lcov"],
  // Give each test file a fresh module registry
  clearMocks: true,
  resetMocks: true,
};
