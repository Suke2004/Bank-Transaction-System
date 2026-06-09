/**
 * logger.js — Structured application logger using Winston.
 *
 * In Fintech systems every action must be traceable. Raw console.log:
 *  - loses log level metadata
 *  - can't be aggregated by log shippers (Datadog, CloudWatch, ELK)
 *  - has no timestamps in a standard parseable format
 *
 * This logger outputs:
 *  - JSON in production (for log aggregators)
 *  - Colourised human-readable text in development
 */
const { createLogger, format, transports } = require("winston");

const isDev = process.env.NODE_ENV !== "production";

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: isDev
    ? format.combine(
        format.colorize(),
        format.timestamp({ format: "HH:mm:ss" }),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : "";
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      )
    : format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [new transports.Console()],
});

module.exports = logger;
