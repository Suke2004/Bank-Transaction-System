/**
 * asyncHandler.test.js
 *
 * Unit tests for the asyncHandler utility.
 * No DB, no HTTP — pure function testing.
 */

const asyncHandler = require("../../src/utils/asyncHandler");

describe("asyncHandler", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it("should call the wrapped function with (req, res, next)", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should forward thrown errors to next()", async () => {
    const error = new Error("Something went wrong");
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should NOT call next() when the handler resolves successfully", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);

    await wrapped(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it("should handle synchronous errors thrown inside async function", async () => {
    const error = new TypeError("sync error inside async");
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should forward the correct error object (not a wrapped one)", async () => {
    const original = new Error("original");
    original.statusCode = 404;

    const handler = asyncHandler(async () => {
      throw original;
    });

    await handler(req, res, next);

    const forwardedErr = next.mock.calls[0][0];
    expect(forwardedErr).toBe(original);
    expect(forwardedErr.statusCode).toBe(404);
  });
});
