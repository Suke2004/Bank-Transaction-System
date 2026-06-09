const mongoose = require("mongoose");

/**
 * refreshToken.model.js — Persistent refresh token storage
 *
 * WHY STORE HASHED:
 * We store only the SHA-256 hash of the refresh token, never the raw value.
 * If the DB is compromised, the attacker cannot derive usable tokens from hashes.
 * The raw token lives only in the client's httpOnly cookie.
 *
 * ROTATION STRATEGY (to implement when needed):
 * On each /auth/refresh call, delete the old refresh token and issue a new one.
 * This limits the window of a stolen token and detects re-use (token theft indicator).
 *
 * TTL:
 * MongoDB's TTL index automatically deletes expired documents.
 * Matches the 7-day cookie maxAge — so stale tokens clean themselves up.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: [true, "Token hash is required"],
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Refresh token must be associated with a user"],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete documents when expiresAt passes
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshTokenModel = mongoose.model("refreshToken", refreshTokenSchema);

module.exports = RefreshTokenModel;
