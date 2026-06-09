/**
 * currency.js — Monetary precision utilities
 *
 * WHY THIS EXISTS:
 * JavaScript's Number type uses IEEE 754 double-precision floating point.
 * This means 0.1 + 0.2 = 0.30000000000000004, not 0.3.
 * In a banking system this causes real money discrepancies that compound
 * over time and are a compliance nightmare.
 *
 * THE FIX:
 * Store all monetary amounts as integers in the smallest denomination.
 * For INR: store paise (1 rupee = 100 paise).
 * Convert to/from rupees only at the API boundary (request in, response out).
 *
 * RULE: Internally, amounts are ALWAYS paise (integers). Never store floats.
 */

/**
 * Convert rupees (from client input) to paise for DB storage.
 * Math.round handles floating-point imprecision in the multiplication.
 *
 * @param {number} rupees  e.g. 100.50
 * @returns {number}       e.g. 10050 (integer, paise)
 */
function rupeesToPaise(rupees) {
  return Math.round(rupees * 100);
}

/**
 * Convert paise (from DB) to rupees for API responses.
 *
 * @param {number} paise  e.g. 10050
 * @returns {number}      e.g. 100.5
 */
function paiseToRupees(paise) {
  return paise / 100;
}

/**
 * Format paise as a human-readable INR string.
 * Useful for emails and audit log displays.
 *
 * @param {number} paise  e.g. 10050
 * @returns {string}      e.g. "₹100.50"
 */
function formatRupees(paise) {
  return `₹${paiseToRupees(paise).toFixed(2)}`;
}

module.exports = { rupeesToPaise, paiseToRupees, formatRupees };
