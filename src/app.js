const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

// ─── Internal utilities ────────────────────────────────────────────────────
const requestIdMiddleware = require("./middleware/requestId.middleware");
const errorHandler = require("./middleware/errorHandler.middleware");
const logger = require("./utils/logger");

const app = express();

/* ─────────────────────────────────────────────────────────────────────────
   SECURITY LAYER
   In Fintech, security headers and rate limiting are non-negotiable.
   These must be the FIRST middleware registered.
   ───────────────────────────────────────────────────────────────────────── */

// Sets ~14 security-related HTTP headers (CSP, X-Frame-Options, etc.)
app.use(helmet());

// CORS — restrict to your own frontend origin in production
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true, // allow cookies cross-origin (if needed)
  })
);

/**
 * Global rate limiter — every endpoint is protected.
 * Auth endpoints get tighter limits via the authLimiter below.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests, please try again later",
  },
});

/**
 * Auth-specific rate limiter — tighter window to resist brute-force attacks.
 * At HSBC we applied per-user limits too, but per-IP is the baseline.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // only 20 login/register attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again in 15 minutes",
  },
});

app.use(globalLimiter);

/* ─────────────────────────────────────────────────────────────────────────
   OBSERVABILITY LAYER
   ───────────────────────────────────────────────────────────────────────── */

// Attach unique request ID to every request before any logging
app.use(requestIdMiddleware);

// HTTP request logger (morgan) — pipes into our winston logger
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

/* ─────────────────────────────────────────────────────────────────────────
   BODY PARSING
   ───────────────────────────────────────────────────────────────────────── */

// Limit body size to prevent payload-based DoS attacks
app.use(express.json({ limit: "10kb", type: "*/*" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

/* ─────────────────────────────────────────────────────────────────────────
   HEALTH CHECK — must be before auth/business routes
   ───────────────────────────────────────────────────────────────────────── */

/**
 * /health — Used by load balancers, Kubernetes liveness probes, uptime monitors.
 * Never put this behind auth middleware.
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   ROUTES
   ───────────────────────────────────────────────────────────────────────── */

const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/accounts.routes");
const transactionRoutes = require("./routes/transaction.routes");

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transaction", transactionRoutes);

/* ─────────────────────────────────────────────────────────────────────────
   404 HANDLER — catches routes that don't match anything above
   ───────────────────────────────────────────────────────────────────────── */

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   GLOBAL ERROR HANDLER — MUST be last
   Receives errors from next(err) calls and asyncHandler wrappers
   ───────────────────────────────────────────────────────────────────────── */

app.use(errorHandler);

module.exports = app;
