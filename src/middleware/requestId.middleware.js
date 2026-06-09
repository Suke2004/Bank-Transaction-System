/**
 * requestId.middleware.js — Attaches a unique ID to every incoming request.
 *
 * In distributed Fintech systems, every log line for a request must share the
 * same correlation ID so operators can trace a full transaction flow across
 * logs, services, and error trackers (Datadog, Sentry, Jaeger).
 *
 * The ID is:
 *  - Read from `X-Request-ID` header if the caller provides one (API gateway)
 *  - Auto-generated otherwise using a simple timestamp+random approach
 *  - Echoed back in the response as `X-Request-ID`
 */
function requestIdMiddleware(req, res, next) {
  const existingId = req.headers["x-request-id"];
  const requestId =
    existingId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}

module.exports = requestIdMiddleware;
