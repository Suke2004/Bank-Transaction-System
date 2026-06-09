require("dotenv").config();

const validateEnv = require("./src/config/validateEnv");
const logger = require("./src/utils/logger");

// ─── Fail fast: validate environment before touching anything else ─────────
validateEnv();

const app = require("./src/app");
const connectToDB = require("./src/config/db");

const PORT = process.env.PORT || 3000;

/* ─────────────────────────────────────────────────────────────────────────
   PROCESS-LEVEL ERROR GUARDS
   
   Without these, any uncaught exception or unhandled rejection silently
   crashes the process in production — no error logged, no graceful shutdown.
   
   In Fintech this is critical: an in-flight transaction could be left PENDING
   with no compensating action if the process dies without cleanup.
   ───────────────────────────────────────────────────────────────────────── */

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION — shutting down", {
    error: err.message,
    stack: err.stack,
  });
  // Give the logger a moment to flush, then exit non-zero
  setTimeout(() => process.exit(1), 500);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("UNHANDLED REJECTION — shutting down", {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  setTimeout(() => process.exit(1), 500);
});

/* ─────────────────────────────────────────────────────────────────────────
   GRACEFUL SHUTDOWN
   
   On SIGTERM (sent by Docker/Kubernetes during a rolling deploy), stop
   accepting new connections and let in-flight requests finish.
   ───────────────────────────────────────────────────────────────────────── */

let server;

connectToDB()
  .then(() => {
    logger.info("Connected to MongoDB");
    server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`, {
        env: process.env.NODE_ENV || "development",
        port: PORT,
      });
    });
  })
  .catch((err) => {
    logger.error("Error connecting to MongoDB", {
      error: err.message,
      hint: "Verify MONGO_URI and network/DNS access for MongoDB Atlas.",
    });
    process.exit(1);
  });

function gracefulShutdown(signal) {
  logger.info(`${signal} received — starting graceful shutdown`);
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error("Graceful shutdown timeout — forcing exit");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
