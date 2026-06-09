const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const requestIdMiddleware = require("./middleware/requestId.middleware");
const errorHandler = require("./middleware/errorHandler.middleware");
const logger = require("./utils/logger");

const app = express();

/* ─── Security Layer ─────────────────────────────────────────────────────── */
app.use(helmet());

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again in 15 minutes",
  },
});

app.use(globalLimiter);

/* ─── Observability Layer ────────────────────────────────────────────────── */
app.use(requestIdMiddleware);
app.use(morgan("combined", { stream: { write: (msg) => logger.http(msg.trim()) } }));

/* ─── Body Parsing ───────────────────────────────────────────────────────── */
app.use(express.json({ limit: "10kb", type: "*/*" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

/* ─── Health Check (unversioned — infrastructure endpoint) ───────────────── */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* ─── API v1 Routes ──────────────────────────────────────────────────────── */
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/accounts.routes");
const transactionRoutes = require("./routes/transaction.routes");

app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/accounts", accountRouter);
app.use("/api/v1/transaction", transactionRoutes);

/* ─── 404 Handler ────────────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

/* ─── Global Error Handler (must be last) ────────────────────────────────── */
app.use(errorHandler);

module.exports = app;
