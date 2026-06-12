/**
 * Formats a rupee amount with Indian locale formatting (₹X,XX,XXX.XX)
 *
 * @param amount Rupee amount (float/number)
 */
export const formatRupees = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Converts a rupee amount (decimal) into paise (integer)
 */
export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};

/**
 * Converts paise (integer) into rupees (decimal)
 */
export const paiseToRupees = (paise: number): number => {
  return paise / 100;
};
