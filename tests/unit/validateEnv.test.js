/**
 * validateEnv.test.js
 *
 * Unit tests for the fail-fast environment validator.
 * We mock process.exit so it doesn't actually kill the test process.
 */

describe("validateEnv", () => {
  let originalEnv;
  let mockExit;
  let mockLogger;

  beforeEach(() => {
    // Snapshot the real environment
    originalEnv = { ...process.env };

    // Mock process.exit so tests don't actually terminate
    mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});

    // Mock the logger so we don't see noise in test output
    jest.mock("../../src/utils/logger", () => ({
      info: jest.fn(),
      error: jest.fn(),
    }));

    // Set a valid baseline environment
    process.env.MONGO_URI = "mongodb://localhost:27017/test";
    process.env.JWT_SECRET = "a".repeat(32);
    process.env.REFRESH_TOKEN_SECRET = "b".repeat(32);
    process.env.PORT = "3000";
  });

  afterEach(() => {
    // Restore environment and mocks
    process.env = originalEnv;
    jest.resetModules();
    mockExit.mockRestore();
  });

  it("passes validation when all required vars are present and strong enough", () => {
    const validateEnv = require("../../src/config/validateEnv");
    validateEnv();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("calls process.exit(1) when MONGO_URI is missing", () => {
    delete process.env.MONGO_URI;
    const validateEnv = require("../../src/config/validateEnv");
    validateEnv();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("calls process.exit(1) when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    const validateEnv = require("../../src/config/validateEnv");
    validateEnv();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("calls process.exit(1) when REFRESH_TOKEN_SECRET is missing", () => {
    delete process.env.REFRESH_TOKEN_SECRET;
    const validateEnv = require("../../src/config/validateEnv");
    validateEnv();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("calls process.exit(1) when JWT_SECRET is shorter than 32 chars", () => {
    process.env.JWT_SECRET = "tooshort";
    const validateEnv = require("../../src/config/validateEnv");
    validateEnv();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("accepts a JWT_SECRET that is exactly 32 characters", () => {
    process.env.JWT_SECRET = "a".repeat(32); // exactly 32
    const validateEnv = require("../../src/config/validateEnv");
    validateEnv();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("calls process.exit(1) when PORT is missing", () => {
    delete process.env.PORT;
    const validateEnv = require("../../src/config/validateEnv");
    validateEnv();
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
