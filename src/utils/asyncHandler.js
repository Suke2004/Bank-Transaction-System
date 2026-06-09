/**
 * asyncHandler — wraps async route controllers so any unhandled promise
 * rejection is forwarded to Express's central error handler via next(err).
 *
 * Without this, an async throw causes an unhandled rejection and the server
 * returns no response, eventually timing out the client.
 *
 * @param {Function} fn  An async Express route handler (req, res, next)
 * @returns {Function}   A synchronous wrapper Express can bind safely
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
